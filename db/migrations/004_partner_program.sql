-- DiDwa Ambassador & Strategic Partner Program.
-- Tier 1 is a percentage of paid order GMV (orders.total); Tier 2 is a
-- percentage of the earned affiliate commission amount, not merchant GMV.
BEGIN;

CREATE TABLE IF NOT EXISTS partners (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name                  TEXT NOT NULL,
  email                      TEXT NOT NULL UNIQUE,
  phone                      TEXT NOT NULL,
  organization_name          TEXT NOT NULL,
  partner_code               TEXT NOT NULL UNIQUE,
  partner_slug               TEXT NOT NULL UNIQUE,
  password_hash              TEXT NOT NULL,
  status                     TEXT NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','rejected','suspended')),
  merchant_override_rate_percent NUMERIC(7,4) NOT NULL DEFAULT 0.5000
                               CHECK (merchant_override_rate_percent >= 0 AND merchant_override_rate_percent <= 100),
  affiliate_override_rate_percent NUMERIC(7,4) NOT NULL DEFAULT 10.0000
                               CHECK (affiliate_override_rate_percent >= 0 AND affiliate_override_rate_percent <= 100),
  momo_network               TEXT
                               CHECK (momo_network IS NULL OR momo_network IN ('MTN','TELECEL','AT')),
  momo_number                TEXT,
  momo_verified_name         TEXT,
  momo_verified_at           TIMESTAMPTZ,
  admin_note                 TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at                TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS partners_status_created_idx ON partners (status, created_at DESC);
CREATE INDEX IF NOT EXISTS partners_code_active_idx ON partners (partner_code) WHERE status = 'approved';

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS referred_by_partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS parent_partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS stores_referred_by_partner_idx ON stores (referred_by_partner_id);
CREATE INDEX IF NOT EXISTS affiliates_parent_partner_idx ON affiliates (parent_partner_id);

CREATE TABLE IF NOT EXISTS partner_network (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id     UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  relationship   TEXT NOT NULL CHECK (relationship IN ('merchant','affiliate')),
  merchant_id    UUID REFERENCES stores(id) ON DELETE CASCADE,
  affiliate_id   UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (relationship = 'merchant' AND merchant_id IS NOT NULL AND affiliate_id IS NULL)
    OR (relationship = 'affiliate' AND affiliate_id IS NOT NULL AND merchant_id IS NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS partner_network_merchant_unique
  ON partner_network (merchant_id) WHERE merchant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS partner_network_affiliate_unique
  ON partner_network (affiliate_id) WHERE affiliate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS partner_network_partner_joined_idx
  ON partner_network (partner_id, joined_at DESC);

CREATE TABLE IF NOT EXISTS partner_ledgers (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id               UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  source_type              TEXT NOT NULL CHECK (source_type IN ('merchant_gmv','affiliate_commission')),
  source_id                UUID NOT NULL,
  base_amount_ghs          NUMERIC(14,2) NOT NULL CHECK (base_amount_ghs >= 0),
  override_rate_percent    NUMERIC(7,4) NOT NULL CHECK (override_rate_percent >= 0 AND override_rate_percent <= 100),
  earned_amount_ghs        NUMERIC(14,2) NOT NULL CHECK (earned_amount_ghs >= 0),
  status                   TEXT NOT NULL DEFAULT 'available'
                             CHECK (status IN ('pending','available','reversed')),
  description              JSONB NOT NULL DEFAULT '{}'::jsonb,
  earned_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reversed_at              TIMESTAMPTZ,
  UNIQUE (partner_id, source_type, source_id)
);
CREATE INDEX IF NOT EXISTS partner_ledgers_partner_earned_idx
  ON partner_ledgers (partner_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS partner_ledgers_status_idx
  ON partner_ledgers (partner_id, status);

CREATE TABLE IF NOT EXISTS partner_payouts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  amount_ghs            NUMERIC(14,2) NOT NULL CHECK (amount_ghs > 0),
  momo_network          TEXT NOT NULL CHECK (momo_network IN ('MTN','TELECEL','AT')),
  momo_number           TEXT NOT NULL,
  momo_account_name     TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','paid','rejected')),
  transfer_reference    TEXT,
  admin_note            TEXT,
  requested_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at          TIMESTAMPTZ,
  processed_by_admin_id UUID
);
CREATE INDEX IF NOT EXISTS partner_payouts_partner_requested_idx
  ON partner_payouts (partner_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS partner_payouts_review_idx
  ON partner_payouts (status, requested_at ASC);

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('partner_min_cashout_ghs', '50.00', 'Minimum available balance in GHS required for a strategic partner payout')
ON CONFLICT (setting_key) DO NOTHING;

-- Each paid merchant order accrues one idempotent override on its gross order
-- total. A later cancellation reverses that earning; a subsequent valid
-- settlement restores it without creating a duplicate source entry.
CREATE OR REPLACE FUNCTION record_partner_merchant_override()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  attributed_partner UUID;
  override_rate NUMERIC(7,4);
  eligible_paid BOOLEAN;
BEGIN
  SELECT s.referred_by_partner_id, p.merchant_override_rate_percent
    INTO attributed_partner, override_rate
    FROM stores s
    LEFT JOIN partners p ON p.id = s.referred_by_partner_id AND p.status = 'approved'
   WHERE s.id = NEW.store_id;

  eligible_paid := NEW.payment_status = 'PAID'
    AND NEW.status IN ('PAID','FULFILLED','DELIVERED')
    AND NEW.status <> 'CANCELLED';

  IF eligible_paid AND attributed_partner IS NOT NULL AND override_rate IS NOT NULL
     AND COALESCE(NEW.total, 0) > 0 THEN
    INSERT INTO partner_ledgers
      (partner_id, source_type, source_id, base_amount_ghs, override_rate_percent,
       earned_amount_ghs, status, description, earned_at, reversed_at)
    VALUES
      (attributed_partner, 'merchant_gmv', NEW.id, NEW.total, override_rate,
       ROUND(NEW.total * override_rate / 100, 2), 'available',
       jsonb_build_object('orderNumber', NEW.order_number, 'storeId', NEW.store_id),
       COALESCE(NEW.paid_at, NOW()), NULL)
    ON CONFLICT (partner_id, source_type, source_id) DO UPDATE
      SET earned_amount_ghs = ROUND(
            partner_ledgers.base_amount_ghs * partner_ledgers.override_rate_percent / 100, 2
          ),
          status = 'available',
          description = EXCLUDED.description,
          earned_at = EXCLUDED.earned_at,
          reversed_at = NULL;
  ELSIF attributed_partner IS NOT NULL AND
        (NEW.status = 'CANCELLED' OR NEW.payment_status = 'FAILED') THEN
    UPDATE partner_ledgers
       SET status = 'reversed', reversed_at = NOW()
     WHERE partner_id = attributed_partner
       AND source_type = 'merchant_gmv'
       AND source_id = NEW.id
       AND status <> 'reversed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_partner_override_trigger ON orders;
CREATE TRIGGER orders_partner_override_trigger
AFTER INSERT OR UPDATE OF status, payment_status, total, paid_at ON orders
FOR EACH ROW EXECUTE FUNCTION record_partner_merchant_override();

-- The partner's tier-2 base is the affiliate's commission earned amount.
-- Affiliate commission reversals are mirrored as ledger reversals.
CREATE OR REPLACE FUNCTION record_partner_affiliate_override()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  attributed_partner UUID;
  override_rate NUMERIC(7,4);
BEGIN
  SELECT a.parent_partner_id, p.affiliate_override_rate_percent
    INTO attributed_partner, override_rate
    FROM affiliates a
    LEFT JOIN partners p ON p.id = a.parent_partner_id AND p.status = 'approved'
   WHERE a.id = NEW.affiliate_id;

  IF attributed_partner IS NULL OR override_rate IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'reversed' THEN
    UPDATE partner_ledgers
       SET status = 'reversed', reversed_at = NOW()
     WHERE partner_id = attributed_partner
       AND source_type = 'affiliate_commission'
       AND source_id = NEW.id
       AND status <> 'reversed';
    RETURN NEW;
  END IF;

  INSERT INTO partner_ledgers
    (partner_id, source_type, source_id, base_amount_ghs, override_rate_percent,
     earned_amount_ghs, status, description, earned_at)
  VALUES
    (attributed_partner, 'affiliate_commission', NEW.id, NEW.earned_amount_ghs,
     override_rate, ROUND(NEW.earned_amount_ghs * override_rate / 100, 2),
     'available',
     jsonb_build_object('affiliateId', NEW.affiliate_id, 'commissionId', NEW.id),
     NEW.earned_at)
  ON CONFLICT (partner_id, source_type, source_id) DO UPDATE
    SET base_amount_ghs = EXCLUDED.base_amount_ghs,
        earned_amount_ghs = ROUND(
          EXCLUDED.base_amount_ghs * partner_ledgers.override_rate_percent / 100, 2
        ),
        status = 'available',
        description = EXCLUDED.description,
        earned_at = EXCLUDED.earned_at,
        reversed_at = NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS affiliate_commissions_partner_override_trigger ON affiliate_commissions;
CREATE TRIGGER affiliate_commissions_partner_override_trigger
AFTER INSERT OR UPDATE OF status, earned_amount_ghs ON affiliate_commissions
FOR EACH ROW EXECUTE FUNCTION record_partner_affiliate_override();

COMMIT;
