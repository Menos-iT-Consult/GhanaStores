// models/affiliate.js
// DiDwa - Affiliate Program Model (pg queries, NO Prisma)

import { query } from '../config/database.js';
import { getAffiliateProgramSettings } from '../services/affiliateProgramSettings.js';
import { randomUUID } from 'node:crypto';

// Find affiliate by referral code
export async function findByReferralCode(code) {
  const { rows } = await query(
    `SELECT a.id, a.referral_code, a.full_name, a.email, a.phone,
            a.momo_network, a.momo_number, a.is_active,
            a.created_at, a.updated_at
     FROM affiliates a
     WHERE a.referral_code = $1 AND a.is_active = TRUE`,
    [code]
  );
  return rows[0];
}

// Find affiliate by userId
export async function findByUserId(userId) {
  const { rows } = await query(
    `SELECT a.id, a.referral_code, a.full_name, a.email, a.phone,
            a.momo_network, a.momo_number, a.is_active,
            a.created_at, a.updated_at
     FROM affiliates a
     WHERE a.id = $1`,
    [userId]
  );
  return rows[0];
}

export async function findByEmailForAuth(email) {
  const { rows } = await query(
    `SELECT id, email, password_hash, is_active
       FROM affiliates
      WHERE LOWER(email) = $1
      LIMIT 1`,
    [String(email || '').trim().toLowerCase()],
  );
  return rows[0] || null;
}

export async function findById(id) {
  const { rows } = await query(
    `SELECT id, referral_code, full_name, email, phone,
            momo_network, momo_number, is_active,
            created_at, updated_at
       FROM affiliates
      WHERE id = $1 AND is_active = TRUE
      LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

// Create new affiliate profile
export async function create({ fullName, email, phone, momoNetwork, momoNumber, passwordHash, referralCode }) {
  const finalCode = referralCode || randomUUID();

  const { rows } = await query(
    `INSERT INTO affiliates
       (referral_code, full_name, email, phone, momo_network, momo_number, password_hash, is_active)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7, TRUE)
     RETURNING
       id, referral_code, full_name, email, phone,
       momo_network, momo_number, is_active,
       created_at, updated_at`,
    [finalCode, fullName, email, phone, momoNetwork, momoNumber, passwordHash]
  );
  return rows[0];
}

// Link store to affiliate assignment
export async function linkStoreToAffiliate(storeId, affiliateId) {
  const { rows } = await query(
    `SELECT id, affiliate_id, status, referred_at, upgraded_at FROM referrals WHERE referred_store_id = $1`,
    [storeId]
  );
  if (rows.length > 0) {
    return rows[0];
  }

  const { rows: inserted } = await query(
    `INSERT INTO referrals (affiliate_id, referred_store_id, status)
     VALUES ($1, $2, 'pending_upgrade')
     RETURNING id, affiliate_id, referred_store_id, status, referred_at`,
    [affiliateId, storeId]
  );
  return inserted[0];
}

// Mark a referred store as upgraded
export async function markReferredUpgraded(referralId, planAmountGHS, affiliateCommissionRate) {
  const commissionRate = parseFloat(affiliateCommissionRate) / 100;
  const earned = Number((planAmountGHS * commissionRate).toFixed(2));

  const { rows } = await query(
    `UPDATE referrals
       SET status = 'active_paid',
         upgraded_at = now()
     WHERE id = $1
       AND status = 'pending_upgrade'
     RETURNING *`,
    [referralId]
  );
  return { earned, referral: rows[0] };
}

// Record commission ledger entry
export async function recordCommission({ affiliateId, referralId, transactionRef, planAmountGHS }) {
  const { commissionRatePercent } = await getAffiliateProgramSettings();
  const commissionRate = commissionRatePercent / 100;
  const earned = Number((planAmountGHS * commissionRate).toFixed(2));

  const { rows } = await query(
    `INSERT INTO affiliate_commissions
       (affiliate_id, referral_id, transaction_ref, plan_amount_ghs,
        commission_rate, earned_amount_ghs, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING id, earned_amount_ghs, earned_at, status`,
    [affiliateId, referralId, transactionRef, planAmountGHS, commissionRatePercent, earned]
  );
  return rows[0];
}

// Fetch total earned commissions summary
export async function fetchSummary(affiliateId) {
  const { rows } = await query(
    `SELECT
        COALESCE(SUM(CASE WHEN status = 'pending'    THEN earned_amount_ghs END), 0) AS pending,
        COALESCE(SUM(CASE WHEN status = 'paid'      THEN earned_amount_ghs END), 0) AS paid,
        COALESCE(SUM(earned_amount_ghs),             0) AS total_earned
    FROM affiliate_commissions
    WHERE affiliate_id = $1`,
    [affiliateId]
  );
  return rows[0];
}

// List pending payout requests
export async function listPayoutRequests(affiliateId) {
  const { rows } = await query(
    `SELECT id, amount_ghs, status, requested_at
     FROM affiliate_payouts
     WHERE affiliate_id = $1
     ORDER BY requested_at DESC`,
    [affiliateId]
  );
  return rows;
}
