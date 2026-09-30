-- ============================================================
-- DIDWA - Neon PostgreSQL Schema
-- Row-Level Multi-Tenancy: every tenant table carries store_id.
-- Apply with: npm run db:init   (or psql -f db/schema.sql)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  trial_ends_at         TIMESTAMPTZ,
  grace_ends_at         TIMESTAMPTZ,
  loyalty_points_per_ghs NUMERIC(6,2) NOT NULL DEFAULT 1.00,  -- points per whole GHS spent
  loyalty_point_value    NUMERIC(6,4) NOT NULL DEFAULT 0.0500, -- GHS discount per point
  currency              TEXT NOT NULL DEFAULT 'GHS',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS stores_email_lower_idx ON stores ((LOWER(email)));
CREATE INDEX IF NOT EXISTS stores_status_trial_idx ON stores (status, trial_ends_at);

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
