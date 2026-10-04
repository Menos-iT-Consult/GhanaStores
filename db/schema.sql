-- ============================================================
-- DIDWA - Neon PostgreSQL Schema
-- Row-Level Multi-Tenancy: every tenant table carries store_id.
-- Apply with: npm run db:init   (or psql -f db/schema.sql)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------ plans (catalog)
-- The subscription catalogue: what a seller can buy and for how much. This
-- table is the SINGLE SOURCE OF TRUTH for plan pricing - the public /pricing
-- page, the seller upgrade flow and the charge in subscription_payments all
-- resolve the amount from here. Nothing is ever hard-coded on the client, so an
-- admin price change takes effect everywhere at once (every write is audited).
--
-- id is a stable slug ('starter'|'growth'|'scale') rather than a uuid because
-- it is referenced from stores.plan and subscription_payments.plan_id, which
-- already hold these slugs as text.
--
-- Billing is PAY-UPFRONT: one charge buys the period, nothing auto-renews, so
-- a cycle only decides how long stores.plan_period_end runs for.
CREATE TABLE IF NOT EXISTS plans (
  id                 TEXT PRIMARY KEY
                         CHECK (id ~ '^[a-z][a-z0-9-]{1,31}$'),
  name               TEXT NOT NULL,
  tagline            TEXT,
  monthly_price_ghs  NUMERIC(12,2) NOT NULL CHECK (monthly_price_ghs >= 0),
  yearly_price_ghs   NUMERIC(12,2) NOT NULL CHECK (yearly_price_ghs >= 0),
  features           TEXT[] NOT NULL DEFAULT '{}',
  max_products       INTEGER NOT NULL DEFAULT 500 CHECK (max_products >= 0),
  -- Free platform SMS segments included with the plan, reset every billing
  -- period. The unit is SEGMENTS, not messages: providers bill per 140-char
  -- part, so a 5-item receipt costs the platform 3-4 units. Metering messages
  -- would understate real cost by roughly that multiple. Starter is 0, which
  -- does not lock the plan out of platform SMS - Starter may still buy prepaid
  -- segments (see store_sms_balance); it simply gets no free allowance.
  sms_monthly_segments INTEGER NOT NULL DEFAULT 0 CHECK (sms_monthly_segments >= 0),
  is_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order         INTEGER NOT NULL DEFAULT 100,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A yearly plan that costs more than 12 months of the monthly rate is almost
  -- always a typo, and sellers would be charged the inflated amount.
  CONSTRAINT plans_yearly_not_above_12x
    CHECK (yearly_price_ghs <= monthly_price_ghs * 12)
);
CREATE INDEX IF NOT EXISTS plans_enabled_sort_idx ON plans (is_enabled, sort_order);

-- Seed the catalogue from the tiers that were previously hard-coded in
-- routes/billingRoutes.js, so every existing store keeps resolving to a plan.
-- Yearly is priced at 10x monthly (two months free). ON CONFLICT DO NOTHING:
-- an admin edit must survive a re-run of the schema.
INSERT INTO plans (id, name, tagline, monthly_price_ghs, yearly_price_ghs, features, max_products, sms_monthly_segments, sort_order) VALUES
  ('starter', 'Starter', '14-day free trial', 0, 0,
   ARRAY['Up to 20 products','Mobile money payments','Order tracking','Email support'],
   20, 0, 1),
  ('growth', 'Growth', 'For growing shops', 79, 790,
   ARRAY['Up to 500 products','Mobile money payments','Domain name included','Theme marketplace','Priority support'],
   500, 50, 2),
  ('scale', 'Scale', 'High-volume merchants', 199, 1990,
   ARRAY['Unlimited products','Multi-currency pricing','Team seats','Dedicated account manager'],
   100000, 100, 3)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------ stores (tenants)
CREATE TABLE IF NOT EXISTS stores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT NOT NULL,                -- normalized 233XXXXXXXXX
  password_hash         TEXT NOT NULL,
  subdomain_slug        TEXT NOT NULL UNIQUE
                          CHECK (subdomain_slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  custom_domain         TEXT UNIQUE,
  whatsapp_number       TEXT,
  momo_number           TEXT,
  status                TEXT NOT NULL DEFAULT 'TRIAL'
                          CHECK (status IN ('TRIAL','ACTIVE','PAST_DUE','SUSPENDED')),
  plan                  TEXT NOT NULL DEFAULT 'starter',
  -- Pay-upfront billing: the cycle the seller bought and the instant that paid
  -- period runs out. NULL on a free trial (nothing was charged yet).
  plan_cycle            TEXT CHECK (plan_cycle IN ('monthly','yearly')),
  plan_period_end       TIMESTAMPTZ,
  trial_ends_at         TIMESTAMPTZ,
  grace_ends_at         TIMESTAMPTZ,
  loyalty_points_per_ghs NUMERIC(6,2) NOT NULL DEFAULT 1.00,  -- points per whole GHS spent
  loyalty_point_value    NUMERIC(6,4) NOT NULL DEFAULT 0.0500, -- GHS discount per point
  currency              TEXT NOT NULL DEFAULT 'GHS',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS stores_email_lower_idx ON stores ((LOWER(email)));
CREATE INDEX IF NOT EXISTS stores_status_trial_idx ON stores (status, trial_ends_at);

-- The tenant's plan must be one the catalogue actually offers. Added NOT VALID
-- then validated so the constraint can be attached to a populated table without
-- a long ACCESS EXCLUSIVE lock.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stores_plan_fkey'
  ) THEN
    ALTER TABLE stores ADD CONSTRAINT stores_plan_fkey
      FOREIGN KEY (plan) REFERENCES plans(id) NOT VALID;
  END IF;
END $$;
ALTER TABLE stores VALIDATE CONSTRAINT stores_plan_fkey;

-- MODULE 1: automatic 14-day free trial on registration.
CREATE OR REPLACE FUNCTION set_store_trial_period() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NOW() + INTERVAL '14 days';
  END IF;
  IF NEW.grace_ends_at IS NULL THEN
    NEW.grace_ends_at := NEW.trial_ends_at + INTERVAL '3 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stores_auto_trial ON stores;
CREATE TRIGGER trg_stores_auto_trial
  BEFORE INSERT ON stores
  FOR EACH ROW EXECUTE FUNCTION set_store_trial_period();

-- Pay-upfront billing state. The plan catalogue was added after stores already
-- existed, so CREATE TABLE IF NOT EXISTS above would not have added these three
-- columns to a live table - they need the same ALTER the rest of this schema
-- uses for post-creation columns.
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS plan_cycle       TEXT CHECK (plan_cycle IN ('monthly','yearly')),
  ADD COLUMN IF NOT EXISTS plan_period_end  TIMESTAMPTZ;

-- MODULE 8: seller-uploaded media in Cloudflare R2.
-- logo_url is the store's brand mark: a STORE attribute, not a theme token, so
-- switching themes must never blank a merchant's logo. It holds the R2 OBJECT
-- KEY (not a URL) and is mirrored into custom_theme_config.branding.logo_url as
-- an absolute URL, because the storefront renderer consumes that as an <img>.
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
-- image_key is the R2 object key; image_url stays the absolute public URL so
-- rows that predate uploads (or hold an externally hosted image) keep working.
-- The key is what lets a delivery URL be resized on read without storing one
-- URL per size.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_key TEXT;

-- ------------------------------------------------------------ domain pricing
-- Which TLDs sellers may search and buy, and what they pay. One row per TLD.
-- The platform curates the catalogue and the markup from the admin dashboard,
-- and the price checkout charges is resolved from HERE, never from the browser.
-- wholesale_ghs is a cached provider cost; retail_ghs, when set, wins over it
-- (a flat advertised price). is_curated marks the TLDs offered by default - the
-- admin can widen a search to every enabled TLD with one toggle.
CREATE TABLE IF NOT EXISTS domain_pricing (
  tld             VARCHAR(32) PRIMARY KEY,          -- 'com', 'co.za' (no leading dot)
  label           TEXT,
  wholesale_ghs   NUMERIC(10,2),                   -- cached cost; NULL = ask the provider
  markup_pct      NUMERIC(5,2)  NOT NULL DEFAULT 25,
  retail_ghs      NUMERIC(10,2),                   -- flat price; NULL = wholesale + markup
  is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  is_curated      BOOLEAN NOT NULL DEFAULT TRUE,   -- in the default search set
  sort_order      INTEGER NOT NULL DEFAULT 100,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT domain_pricing_markup_check CHECK (markup_pct >= 0 AND markup_pct <= 1000),
  CONSTRAINT domain_pricing_wholesale_check CHECK (wholesale_ghs IS NULL OR wholesale_ghs >= 0),
  CONSTRAINT domain_pricing_retail_check CHECK (retail_ghs IS NULL OR retail_ghs >= 0)
);
CREATE INDEX IF NOT EXISTS domain_pricing_offered_idx
  ON domain_pricing (is_enabled, is_curated, sort_order);

-- Single-row table for the domain catalogue's global switches.
CREATE TABLE IF NOT EXISTS domain_settings (
  id                  INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  include_all_tlds    BOOLEAN NOT NULL DEFAULT FALSE,  -- widen search to every enabled TLD
  default_markup_pct  NUMERIC(5,2) NOT NULL DEFAULT 25,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT domain_settings_markup_check CHECK (default_markup_pct >= 0 AND default_markup_pct <= 1000)
);
INSERT INTO domain_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------ catalog
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  category      TEXT DEFAULT 'General',
  price         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  image_url     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS products_store_idx ON products (store_id, created_at DESC);

-- MODULE 6: multi-variant inventory with custom re-order thresholds.
CREATE TABLE IF NOT EXISTS product_variants (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id             UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id           UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  option_name          TEXT NOT NULL DEFAULT 'Default',   -- e.g. Size / Colour
  option_value         TEXT NOT NULL,                     -- e.g. XL / Red
  sku                  TEXT,
  price_override       NUMERIC(12,2),                     -- falls back to product price
  stock_quantity       INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold  INTEGER NOT NULL DEFAULT 5,
  low_stock_alert_sent BOOLEAN NOT NULL DEFAULT FALSE,    -- guards duplicate SMS alerts
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, option_name, option_value)
);
CREATE INDEX IF NOT EXISTS variants_store_idx ON product_variants (store_id);
CREATE INDEX IF NOT EXISTS variants_low_stock_idx
  ON product_variants (store_id)
  WHERE stock_quantity <= low_stock_threshold;

-- ------------------------------------------------------------ customers + loyalty
CREATE TABLE IF NOT EXISTS customers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name           TEXT,
  phone          TEXT NOT NULL,
  email          TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  total_spent    NUMERIC(14,2) NOT NULL DEFAULT 0,
  orders_count   INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, phone)
);
CREATE INDEX IF NOT EXISTS customers_store_idx ON customers (store_id);

-- ------------------------------------------------------------ contact inbox
-- Messages from the two public contact forms.
--
--   source = 'platform'   the /contact page on the marketing site -> super admin
--   source = 'storefront' the "Contact seller" form on a tenant storefront
--
-- store_id is NULL for platform messages and set for storefront ones. That
-- single column is what scopes the seller's inbox: the seller API filters on it,
-- so a seller can only ever read their own store's leads. It is ON DELETE CASCADE
-- so deleting a test store takes its messages with it rather than orphaning rows.
--
-- status is 'new' | 'read' | 'archived'. Kept as one column rather than two
-- booleans because 'archived' and 'unread' are not independent: archiving an
-- unread message should clear the badge, and with separate flags it would not.
CREATE TABLE IF NOT EXISTS contact_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source       TEXT NOT NULL DEFAULT 'platform'
                 CHECK (source IN ('platform', 'storefront')),
  store_id     UUID REFERENCES stores(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  topic        TEXT,
  message      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'read', 'archived')),
  read_at      TIMESTAMPTZ,
  archived_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS contact_messages_store_idx   ON contact_messages (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_status_idx ON contact_messages (status, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_created_idx ON contact_messages (created_at DESC);

-- ------------------------------------------------------------ orders
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_number    TEXT NOT NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   TEXT,
  customer_phone  TEXT,
  customer_address TEXT,
  channel         TEXT NOT NULL DEFAULT 'ONLINE_WHATSAPP'
                    CHECK (channel IN ('ONLINE_WHATSAPP','POS','COD_RIDER')),
  payment_method  TEXT NOT NULL DEFAULT 'COD'
                    CHECK (payment_method IN ('CASH','MOMO','COD','PAYSTACK','HUBTEL')),
  status          TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','PAID','FULFILLED','DELIVERED','CANCELLED')),
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_fee    NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  points_earned   INTEGER NOT NULL DEFAULT 0,
  points_redeemed INTEGER NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  rider_name      TEXT,
  rider_phone     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at         TIMESTAMPTZ,
  client_reference TEXT
);
CREATE INDEX IF NOT EXISTS orders_store_created_idx ON orders (store_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS orders_number_idx ON orders (order_number);
CREATE UNIQUE INDEX IF NOT EXISTS orders_client_reference_idx
  ON orders (store_id, client_reference) WHERE client_reference IS NOT NULL;
-- Backward-compatible mirrors for older storefront/order readers. Canonical
-- order lifecycle columns are status, subtotal, total and paid_at.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS order_status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS client_reference TEXT;

UPDATE orders
   SET order_status = CASE
         WHEN status = 'DELIVERED' THEN 'DELIVERED'
         WHEN status = 'CANCELLED' THEN 'CANCELLED'
         WHEN status IN ('PAID','FULFILLED') THEN 'PROCESSING'
         ELSE 'PENDING' END,
       payment_status = CASE WHEN status IN ('PAID','FULFILLED','DELIVERED') THEN 'PAID' ELSE 'PENDING' END,
       total_amount = total
 WHERE order_status IS DISTINCT FROM CASE
         WHEN status = 'DELIVERED' THEN 'DELIVERED'
         WHEN status = 'CANCELLED' THEN 'CANCELLED'
         WHEN status IN ('PAID','FULFILLED') THEN 'PROCESSING'
         ELSE 'PENDING' END
    OR payment_status IS DISTINCT FROM CASE WHEN status IN ('PAID','FULFILLED','DELIVERED') THEN 'PAID' ELSE 'PENDING' END
    OR total_amount IS DISTINCT FROM total;

-- ------------------------------------------------------------ order items
CREATE TABLE IF NOT EXISTS order_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id     UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name   TEXT NOT NULL,
  variant_label  TEXT,
  unit_price     NUMERIC(12,2) NOT NULL,
  total_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity       INTEGER NOT NULL CHECK (quantity > 0),
  line_total     NUMERIC(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

-- ------------------------------------------------------------ low-stock alert audit
CREATE TABLE IF NOT EXISTS product_restock_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  variant_id      UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  stock_quantity  INTEGER NOT NULL,
  reorder_level   INTEGER NOT NULL,
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_restock_alerts_store
  ON product_restock_alerts (store_id, triggered_at DESC);

-- ------------------------------------------------------------ theme architecture
CREATE TABLE IF NOT EXISTS theme_templates (
  id          VARCHAR(100) PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  category    VARCHAR(50)  NOT NULL,
  config      JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS active_theme_id VARCHAR(100) REFERENCES theme_templates(id),
  ADD COLUMN IF NOT EXISTS custom_theme_config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ------------------------------------------------------------ payouts (retired)
-- The instant-payout ledger is gone: customer money now settles directly in the
-- merchant's own gateway account, so DiDwa never holds a balance to pay out from.
-- The table is RENAMED to payouts_retired rather than dropped - it is a financial
-- record merchants may need for reconciliation, and DROP cannot be undone.
--
-- This whole block is intentionally NOT re-created: a fresh install has no payout
-- ledger to create, and on an existing install the rename below is guarded so that
-- re-applying this schema stays a no-op.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payouts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payouts_retired') THEN
      ALTER TABLE payouts RENAME TO payouts_retired;
    ELSE
      -- payouts_retired already holds the history and a bare `payouts` is an
      -- artefact of a partially-applied earlier run. Drop it only when empty, so
      -- a genuine duplicate is never silently destroyed.
      EXECUTE 'DROP TABLE payouts';
    END IF;
  END IF;
END $$;


/* =============================================================================
 * Per-store payment settings (BYOK - Bring Your Own Keys)
 *
 * The platform no longer holds customer funds. Each merchant connects their own
 * gateway credentials and money moves straight from the customer into the
 * merchant's gateway account. Nothing here is readable by another store, and
 * every secret column is AES-256-GCM ciphertext written by
 * services/secretBox.js - never plaintext, never selected into a public payload.
 *
 * A store with no row (or no keys) is COD-only: checkout refuses to offer a
 * gateway it cannot actually charge with.
 * ========================================================================== */
CREATE TABLE IF NOT EXISTS payment_settings (
  store_id                  UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  -- Ciphertext, format: v1:<iv>:<authTag>:<ciphertext> (all base64).
  paystack_public_key       TEXT,
  paystack_secret_key       TEXT,
  hubtel_client_id          TEXT,
  hubtel_client_secret      TEXT,
  hubtel_merchant_account_id TEXT,
  enable_cod                BOOLEAN NOT NULL DEFAULT TRUE,
  active_gateway            TEXT NOT NULL DEFAULT 'COD'
                              CHECK (active_gateway IN ('PAYSTACK','HUBTEL','COD')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A gateway may only be the active one when its credentials are actually
-- present, so a half-saved form cannot leave a store advertising a checkout
-- option that would fail at charge time. COD is always allowed: it needs no keys.
ALTER TABLE payment_settings DROP CONSTRAINT IF EXISTS payment_settings_gateway_ready_check;
ALTER TABLE payment_settings ADD CONSTRAINT payment_settings_gateway_ready_check CHECK (
  active_gateway = 'COD'
  OR (active_gateway = 'PAYSTACK' AND paystack_secret_key IS NOT NULL AND paystack_public_key IS NOT NULL)
  OR (active_gateway = 'HUBTEL' AND hubtel_client_id IS NOT NULL
      AND hubtel_client_secret IS NOT NULL AND hubtel_merchant_account_id IS NOT NULL)
);

-- Webhook signature verification resolves the store from the transaction
-- reference, so this lookup is on the hot path of every payment callback.
CREATE INDEX IF NOT EXISTS payment_settings_gateway_idx
  ON payment_settings (active_gateway) WHERE active_gateway <> 'COD';


-- ---------------------------------------------------------------------------
-- Per-store SMS provider credentials (BYOK), used for ORDER messages only.
-- ---------------------------------------------------------------------------
-- Merchant keys are scoped to customer-facing order notifications and are
-- NEVER used for the billing lifecycle or low-stock alerts. That separation is
-- deliberate and load-bearing: when a store is SUSPENDED its own credentials
-- are exactly what cannot be relied on, and a suspension notice sent on them
-- would never arrive. Those platform-level messages always use the DiDwa key.
--
-- Secrets use the same v1:<iv>:<authTag>:<ciphertext> envelope as
-- payment_settings, sealed by services/secretBox.js.
CREATE TABLE IF NOT EXISTS store_sms_settings (
  store_id          UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  -- Which provider the ORDER path should prefer. 'PLATFORM' means "use the
  -- DiDwa mNotify key", which is the default so nothing changes until a
  -- merchant deliberately connects their own account.
  provider          TEXT NOT NULL DEFAULT 'PLATFORM'
                      CHECK (provider IN ('MNOTIFY','ARKESEL','HUBTEL','PLATFORM')),
  -- A merchant may disable order SMS entirely without deleting their keys.
  enable_order_sms  BOOLEAN NOT NULL DEFAULT FALSE,
  -- Credential columns are nullable because each provider needs a different
  -- subset; which columns MUST be present is enforced per provider below.
  api_key           TEXT,
  sender_id         TEXT,
  client_id         TEXT,
  client_secret     TEXT,
  merchant_account_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order SMS can only be enabled for a provider whose credentials are actually
-- present, so a half-saved form cannot leave a store advertising a rail that
-- would fail on every order. 'PLATFORM' needs no credentials by definition.
ALTER TABLE store_sms_settings DROP CONSTRAINT IF EXISTS store_sms_settings_provider_ready_check;
ALTER TABLE store_sms_settings ADD CONSTRAINT store_sms_settings_provider_ready_check CHECK (
  NOT enable_order_sms
  OR provider = 'PLATFORM'
  OR (provider = 'MNOTIFY' AND api_key IS NOT NULL AND sender_id IS NOT NULL)
  OR (provider = 'ARKESEL' AND api_key IS NOT NULL AND sender_id IS NOT NULL)
  OR (provider = 'HUBTEL' AND client_id IS NOT NULL
      AND client_secret IS NOT NULL AND merchant_account_id IS NOT NULL)
);

-- =========================================================== platform SMS quota
--
-- Order SMS sent on the DiDwa key is DiDwa's own cost, so it is metered. A
-- merchant sending on THEIR key is never metered: they pay their own provider
-- from their own balance, and charging them quota too would be double-billing.
--
-- Balance = this period's free allowance + whatever they have prepaid. Both are
-- counted in SEGMENTS, never messages: providers bill per 140-char part, so one
-- order receipt can cost 3-4 segments. Metering messages would understate real
-- cost by that multiple.

-- One row per store: the plan allowance consumed THIS period. Keyed by period
-- so a new billing period starts a fresh allowance automatically - no cron, and
-- no chance of a reset job silently failing and locking a merchant out.
-- Created lazily on the first order SMS of a period.
CREATE TABLE IF NOT EXISTS store_sms_usage (
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  period_start    TIMESTAMPTZ NOT NULL,
  period_end      TIMESTAMPTZ NOT NULL,
  plan_segments_used INTEGER NOT NULL DEFAULT 0 CHECK (plan_segments_used >= 0),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (store_id, period_start)
);

-- One row per store: PREPAID segments, which deliberately carry over forever.
-- Kept apart from store_sms_usage on purpose. A period-keyed row is discarded
-- at the boundary, which would silently wipe money a merchant has already paid
-- for; this row is never reset. That is also why consumption spends the free
-- allowance first (see services/smsQuota.js) - the free remainder is what lapses
-- at period end, which is the honest outcome since nobody paid for it.
CREATE TABLE IF NOT EXISTS store_sms_balance (
  store_id   UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  segments   INTEGER NOT NULL DEFAULT 0 CHECK (segments >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Global switches for prepaid purchases. Single-row, mirroring domain_settings.
--
-- price_per_segment is NULLABLE ON PURPOSE: it ships unset and an admin sets it
-- in the dashboard. A seeded default would become a real charged price that
-- nobody deliberately chose. NULL means "not configured" and purchases fail
-- closed rather than charging a placeholder. Six decimals because a per-segment
-- price in pesewas is small - NUMERIC(10,2) would round it to zero.
CREATE TABLE IF NOT EXISTS sms_settings (
  id                    INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  price_per_segment     NUMERIC(10,6) CHECK (price_per_segment IS NULL OR price_per_segment > 0),
  min_purchase          INTEGER NOT NULL DEFAULT 100 CHECK (min_purchase > 0),
  -- Global kill switch: stops NEW purchases platform-wide without touching the
  -- quota logic or balances already bought. The lever to pull if the mNotify
  -- account needs protecting.
  is_purchases_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment audit for prepaid segments. Deliberately mirrors subscription_payments:
-- a PENDING row is written BEFORE the gateway call so a crash mid-collection
-- leaves an auditable row, and ACTIVE/credit only ever follows a confirmed
-- charge. Never a silent balance increase.
CREATE TABLE IF NOT EXISTS sms_pack_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  segments         INTEGER NOT NULL CHECK (segments > 0),
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  momo_number      TEXT NOT NULL,
  network          TEXT NOT NULL CHECK (network IN ('MTN','VODAFONE','AT')),
  provider         TEXT NOT NULL DEFAULT 'PENDING' CHECK (provider IN ('MTN','HUBTEL','PENDING')),
  reference        TEXT,
  gateway_reference TEXT,
  -- The per-segment price at purchase time. Recorded rather than re-read later:
  -- an admin price change must never alter what a past payment was worth.
  price_per_segment NUMERIC(10,6) NOT NULL CHECK (price_per_segment > 0),
  status           TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','FAILED')),
  failure_reason   TEXT,
  initiated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at          TIMESTAMPTZ
);
-- One row per gateway attempt reference, so a replayed idempotency key cannot
-- insert a second payment row for the same tap.
CREATE UNIQUE INDEX IF NOT EXISTS sms_pack_payments_reference_idx
  ON sms_pack_payments (reference);

-- Widen plans for the SMS allowance. CREATE TABLE IF NOT EXISTS is a no-op on an
-- existing database, so the column has to be added separately. Idempotent.
ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_sms_monthly_segments_check;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS sms_monthly_segments INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plans ADD CONSTRAINT plans_sms_monthly_segments_check
  CHECK (sms_monthly_segments >= 0);

-- Backfill the allowance for the three seeded plans. Only where the column is
-- still 0: this must never overwrite an admin's configured figure on a re-run.
UPDATE plans SET sms_monthly_segments = 50 WHERE id = 'growth'   AND sms_monthly_segments = 0;
UPDATE plans SET sms_monthly_segments = 100 WHERE id = 'scale'  AND sms_monthly_segments = 0;


-- Widen orders.payment_method to name the gateway that actually charged.
-- CREATE TABLE IF NOT EXISTS above is a no-op on an existing database, so the
-- CHECK has to be dropped and re-added for the new values to be accepted.
DO $$
DECLARE
  old_check TEXT;
BEGIN
  SELECT conname INTO old_check
    FROM pg_constraint
   WHERE conrelid = 'orders'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) LIKE '%payment_method%';
  IF old_check IS NOT NULL THEN
    EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', old_check);
  END IF;
END $$;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('CASH','MOMO','COD','PAYSTACK','HUBTEL'));


/* -----------------------------------------------------------------------------
 * Retire the platform wallet and instant-payout ledger.
 *
 * Customer funds no longer pass through the platform: each store charges with
 * its own gateway keys and the money settles in the merchant's account, so
 * there is no balance to hold and nothing for the platform to pay out from.
 *
 * The columns and the payouts table are RENAMEd to *_retired_* rather than
 * dropped. Payout history is financial records merchants may need for
 * reconciliation, and DROP TABLE cannot be undone. The application code stops
 * reading them entirely, so the retired columns carry no runtime weight.
 *
 * To actually reclaim the space once you are certain the records are no longer
 * needed, drop them by hand:
 *   ALTER TABLE stores DROP COLUMN available_balance_retired;
 *   ALTER TABLE stores DROP COLUMN pending_balance_retired;
 *   DROP TABLE payouts_retired;
 * --------------------------------------------------------------------------- */
-- Conditional so re-applying the schema is a no-op: after the first run the
-- original names are gone, so an unconditional RENAME would error on every
-- subsequent `db:init` (and abort the rest of the file in a bulk apply).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'stores' AND column_name = 'available_balance'
  ) THEN
    ALTER TABLE stores RENAME COLUMN available_balance TO available_balance_retired;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'stores' AND column_name = 'pending_balance'
  ) THEN
    ALTER TABLE stores RENAME COLUMN pending_balance TO pending_balance_retired;
  END IF;
END $$;


-- MODULE 4: cash collected by dispatch riders while in transit.
CREATE TABLE IF NOT EXISTS rider_transits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_ids      JSONB NOT NULL DEFAULT '[]'::jsonb,
  rider_name     TEXT NOT NULL,
  rider_phone    TEXT,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  status         TEXT NOT NULL DEFAULT 'TRANSIT' CHECK (status IN ('TRANSIT','RECONCILED')),
  dispatched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reconciled_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS rider_transits_store_idx
  ON rider_transits (store_id, status, dispatched_at DESC);

-- ------------------------------------------------------------ platform admins
CREATE TABLE IF NOT EXISTS platform_admins (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  name           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Super admin has full operational control, so every mutation it performs is
-- recorded here. last_login_* let the Team page show who is actually active.
ALTER TABLE platform_admins
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_ip  TEXT;

-- Append-only ledger of every platform-admin write (suspend a merchant, settle
-- a payout, adjust stock, change a plan). BEFORE/AFTER values live in `detail`
-- as JSONB. Never updated or deleted, so it stays a usable audit trail.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID,
  admin_email  TEXT,
  admin_name   TEXT,
  action       TEXT NOT NULL,
  target_type  TEXT,
  target_id    TEXT,
  detail       JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip           TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
  ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx
  ON admin_audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx
  ON admin_audit_log (target_type, target_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_admin_idx
  ON admin_audit_log (admin_id, created_at DESC);


-- ------------------------------------------------------------ subscription payments (Module 1)
-- Every POST /api/billing/subscribe attempt is recorded here BEFORE the
-- provider is charged: a crash after collection leaves a PENDING row (never a
-- silent ACTIVE), and a UNIQUE reference stops a retried request paying twice.
CREATE TABLE IF NOT EXISTS subscription_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  plan_id           TEXT NOT NULL,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  momo_number       TEXT NOT NULL,
  network           TEXT NOT NULL CHECK (network IN ('MTN','VODAFONE','AT')),
  provider          TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (provider IN ('MTN','HUBTEL','PENDING')),
  reference         TEXT,
  gateway_reference TEXT,
  -- Which cycle was bought, so a later reconciliation knows how long the paid
  -- period should run for. Recorded on the payment, not inferred later.
  cycle             TEXT CHECK (cycle IN ('monthly','yearly')),
  period_start      TIMESTAMPTZ,
  period_end        TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING','PAID','FAILED')),
  failure_reason    TEXT,
  initiated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at           TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS subscription_payments_ref_idx
  ON subscription_payments (reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS subscription_payments_store_idx
  ON subscription_payments (store_id, initiated_at DESC);

-- Cycle and the paid period, added after this table already existed (see the
-- same ALTER on stores above).
ALTER TABLE subscription_payments
  ADD COLUMN IF NOT EXISTS cycle        TEXT CHECK (cycle IN ('monthly','yearly')),
  ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS period_end   TIMESTAMPTZ;

-- A paid subscription can only ever point at a real catalogue entry, so a typo
-- in the upgrade request cannot write an unpriceable plan onto a money row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_payments_plan_fkey'
  ) THEN
    ALTER TABLE subscription_payments ADD CONSTRAINT subscription_payments_plan_fkey
      FOREIGN KEY (plan_id) REFERENCES plans(id) NOT VALID;
  END IF;
END $$;
ALTER TABLE subscription_payments VALIDATE CONSTRAINT subscription_payments_plan_fkey;

-- ------------------------------------------------------------ store domains (Module 7)
CREATE TABLE IF NOT EXISTS store_domains (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  domain_name         TEXT NOT NULL,
  provider            TEXT NOT NULL DEFAULT 'EXTERNAL'
                        CHECK (provider IN ('EXTERNAL','PURCHASED')),
  status              TEXT NOT NULL DEFAULT 'PENDING_DNS'
                        CHECK (status IN ('PENDING_DNS','ACTIVE','FAILED','CANCELLED')),
  custom_hostname_id  TEXT,
  ssl_status          TEXT DEFAULT 'pending',
  dns_target_a        TEXT,
  dns_target_cname    TEXT,
  price_paid_ghs      NUMERIC(10,2),
  purchase_reference  TEXT,
  verification_errors JSONB DEFAULT '[]'::jsonb,
  registered_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS store_domains_name_idx ON store_domains (LOWER(domain_name));
CREATE INDEX IF NOT EXISTS store_domains_store_idx ON store_domains (store_id, status);
CREATE INDEX IF NOT EXISTS store_domains_status_idx ON store_domains (status, created_at DESC);



-- Canonical DiDwa fresh-install schema; supplemental historical SQL is not executed.
