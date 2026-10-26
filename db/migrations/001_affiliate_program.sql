-- ============================================================================
-- DiDwa Affiliate Program - Database Migration
-- NeonDB / PostgreSQL
-- ============================================================================

-- --------------------------------------------------------
-- 1. system_settings - Key-value store for admin-controlled parameters
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key  TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description  TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by key
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Seed default affiliate settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('affiliate_commission_rate', '10.00', 'Recurring commission percentage (%) paid to affiliate on each referred merchant upgrade/renewal'),
  ('affiliate_min_cashout_ghs', '50.00', 'Minimum available balance (GHS) required before an affiliate can request a MoMo payout')
ON CONFLICT (setting_key) DO NOTHING;

-- --------------------------------------------------------
-- 2. affiliates - Promoter profiles (NOT merchants/store owners)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS affiliates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code   UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  phone           TEXT NOT NULL,
  momo_network    TEXT NOT NULL CHECK (momo_network IN ('MTN','VODAFONE','AT')),
  momo_number     TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by referral code
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);
-- Index for fast lookup by email (login)
CREATE INDEX IF NOT EXISTS idx_affiliates_email ON affiliates(email);

-- --------------------------------------------------------
-- 3. referrals - Maps referred merchant to affiliate
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS referrals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id     UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referred_store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending_upgrade'
                   CHECK (status IN ('pending_upgrade','active_paid')),
  referred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  upgraded_at      TIMESTAMPTZ,
  -- Ensures a store can only be referred once by one affiliate
  CONSTRAINT uq_referrals_store UNIQUE (referred_store_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_store ON referrals(referred_store_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- --------------------------------------------------------
-- 4. affiliate_commissions - Ledger for recurring commission cuts
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id      UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referral_id       UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  transaction_ref   TEXT NOT NULL,           -- Paystack/Hubtel reference or subscription id
  plan_amount_ghs   NUMERIC(12,2) NOT NULL CHECK (plan_amount_ghs > 0),
  commission_rate   NUMERIC(5,2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  earned_amount_ghs NUMERIC(12,2) NOT NULL CHECK (earned_amount_ghs >= 0),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','reversed')),
  earned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_earned_at ON affiliate_commissions(earned_at);
-- Prevent duplicate commission for same transaction
CREATE INDEX IF NOT EXISTS idx_commissions_tx_unique ON affiliate_commissions(transaction_ref) WHERE status <> 'reversed';

-- --------------------------------------------------------
-- 5. affiliate_payouts - Payout requests to MoMo
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id   UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount_ghs     NUMERIC(12,2) NOT NULL CHECK (amount_ghs > 0),
  momo_network   TEXT NOT NULL CHECK (momo_network IN ('MTN','VODAFONE','AT')),
  momo_number    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','paid','rejected')),
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at   TIMESTAMPTZ,
  admin_note     TEXT
);

CREATE INDEX IF NOT EXISTS idx_payouts_affiliate ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON affiliate_payouts(status);

-- ============================================================================
-- End of migration
-- ============================================================================
