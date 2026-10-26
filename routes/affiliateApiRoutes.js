// routes/affiliateApiRoutes.js
// DiDwa - Affiliate API Routes
// Mounted at /api/affiliate in server.js

import { Router } from 'express';
import {
  findByReferralCode,
  findByUserId,
  create,
  linkStoreToAffiliate,
  markReferredUpgraded,
  recordCommission,
  fetchSummary,
  listPayoutRequests,
} from '../models/affiliate.js';
import {
  validateCommissionRate,
  calculateCommission,
  formatGHS,
} from '../services/affiliateService.js';
import { authenticate } from '../middleware/auth.js'; // your existing JWT middleware

const router = Router();

// 🔹 GET /api/affiliate/me - Current affiliate profile
router.get('/me', authenticate, async (req, res) => {
  const affiliate = await findByUserId(req.user.id);
  if (!affiliate) return res.status(404).json({ error: 'Affiliate profile not found' });
  res.json(affiliate);
});

// 🔹 GET /api/affiliate/stats - Earnings stats
router.get('/stats', authenticate, async (req, res) => {
  const affiliate = await findByUserId(req.user.id);
  if (!affiliate) return res.status(404).json({ error: 'Affiliate profile not found' });

  const { rows: stats } = await query(
    `SELECT COALESCE(SUM(earned_amount_ghs), 0) AS total_earned,
            COALESCE(COUNT(DISTINCT referral_id), 0) AS referred_count
      FROM affiliate_commissions
      WHERE affiliate_id = $1`,
    [affiliate.id]
  );
  res.json(stats[0]);
});

// 🔹 GET /api/affiliate/referrals - List referred stores
router.get('/referrals', authenticate, async (req, res) => {
  const affiliate = await findByUserId(req.user.id);
  if (!affiliate) return res.status(404).json({ error: 'Affiliate profile not found' });

  const { rows } = await query(
    `SELECT r.id, r.status, r.referred_at, r.upgraded_at,
            s.id AS store_id, s.subdomain_slug, u.email AS merchant_email,
            p.name AS plan_name, p.price_ghs
     FROM referrals r
     JOIN stores s ON s.id = r.referred_store_id
     JOIN users u ON u.id = s.user_id
     JOIN plans p ON p.id = s.plan_id
     WHERE r.affiliate_id = $1
     ORDER BY r.referred_at DESC
     LIMIT 30`,
    [affiliate.id]
  );
  res.json(rows);
});

// 🔹 GET /api/affiliate/payouts - List payout requests
router.get('/payouts', authenticate, async (req, res) => {
  const affiliate = await findByUserId(req.user.id);
  if (!affiliate) return res.status(404).json({ error: 'Affiliate profile not found' });

  const requests = await listPayoutRequests(affiliate.id);
  res.json(requests);
});

// 🔹 POST /api/affiliate/payouts - Request a payout
router.post('/payouts', authenticate, async (req, res) => {
  const affiliate = await findByUserId(req.user.id);
  if (!affiliate) return res.status(404).json({ error: 'Affiliate profile not found' });

  const { amountGHS } = req.body;
  if (!amountGHS || isNaN(amountGHS) || amountGHS <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  // Check minimum payout threshold from system_settings
  const { rows: threshold } = await query(
    `SELECT setting_value AS minimum_payout_ghs FROM system_settings WHERE setting_key = 'affiliate_min_cashout_ghs'`
  );
  const minPayout = Number(threshold[0]?.minimum_payout_ghs || 50.00);

  if (Number(amountGHS) < Number(minPayout)) {
    return res.status(400).json({
      error: `Minimum payout is ${formatGHS(minPayout)}`,
    });
  }

  // Check sufficient balance
  const { rows: summary } = await query(
    `SELECT total_earned FROM (
      SELECT COALESCE(SUM(earned_amount_ghs), 0) AS total_earned
      FROM affiliate_commissions
      WHERE affiliate_id = $1 AND status = 'paid'
    ) sub`,
    [affiliate.id]
  );
  const earned = Number(summary[0].total_earned);

  if (Number(amountGHS) > earned) {
    return res.status(400).json({
      error: `Insufficient balance. Earned: ${formatGHS(earned)}, Requested: ${formatGHS(amountGHS)}`,
    });
  }

  // Record payout request
  await query(
    `INSERT INTO affiliate_payouts (affiliate_id, amount_ghs, momo_network, momo_number, status)
     VALUES ($1, $2, 'MTN', $3, 'pending')`,
    [affiliate.id, amountGHS, affiliate.momo_number || '']
  );

  res.json({
    success: true,
    message: `Payout request of ${formatGHS(amountGHS)} submitted. Processing time: 3-5 business days.`,
  });
});

export default router;