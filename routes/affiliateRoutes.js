// routes/affiliateRoutes.js
// DiDwa - Affiliate Web UI Routes
// Mounted at /affiliate in server.js

import { Router } from 'express';
import bcrypt from 'bcryptjs';
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
  generateReferralCode,
  calculateCommission,
  formatGHS,
} from '../lib/affiliate.js';
import affiliateCookieMiddleware from '../middleware/affiliateAuth.js';
import { query } from '../config/database.js';
import { getAffiliateProgramSettings } from '../services/affiliateProgramSettings.js';

const router = Router();

// 🔹 GET /affiliate/signup
router.get('/signup', affiliateCookieMiddleware, async (req, res) => {
  const { referralCode } = req.query;
  const prefilledAffiliate = referralCode
    ? await findByReferralCode(referralCode)
    : null;

  res.render('affiliate/signup', {
    prefilledAffiliate,
    commissionRate: prefilledAffiliate?.commissionRate || '0.10',
  });
});

// 🔹 POST /affiliate/signup
router.post('/signup', affiliateCookieMiddleware, async (req, res, next) => {
  try {
    const { email, password, referralCode } = req.body;

    // 1. Create user first (existing auth flow)
    const user = await createSellerUser({ email, password });

    // 2. Generate or validate referral code
    const code = referralCode || generateReferralCode();

    // 3. Create affiliate record linked to new user
    await create({
      fullName: req.body.name || email.split('@')[0],
      email,
      phone: req.body.phone || '',
      momoNetwork: req.body.momoNetwork || 'MTN',
      momoNumber: req.body.momoNumber || '',
      passwordHash: user.passwordHash,
      referralCode: code,
    });

    const programSettings = await getAffiliateProgramSettings();
    res.cookie('didwa_ref', code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: programSettings.attributionDays * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    res.redirect('/affiliate/dashboard');
  } catch (err) {
    next(err);
  }
});

// 🔹 GET /affiliate/dashboard
router.get('/dashboard', affiliateCookieMiddleware, async (req, res) => {
  if (!req.affiliate) return res.redirect('/affiliate/signup');

  const affiliate = req.affiliate;

  // Fetch referred merchants who upgraded
  const { rows: referredMerchants } = await query(
    `SELECT u.id, u.email, p.name AS plan_name, p.price_ghs, u.created_at AS joined_at
       FROM users u
       JOIN stores s ON s.user_id = u.id
       JOIN plans p ON p.id = s.plan_id
      WHERE s.affiliate_id = $1
      ORDER BY u.created_at DESC
      LIMIT 20`,
    [affiliate.id]
  );

  // Fetch earnings stats
  const { rows: stats } = await query(
    `SELECT COALESCE(SUM(p.price_ghs * a.commission_rate), 0) AS total_earned,
            COALESCE(COUNT(DISTINCT u.id), 0) AS referred_count
       FROM users u
       JOIN stores s ON s.user_id = u.id
       JOIN plans p ON p.id = s.plan_id
       JOIN affiliates a ON a.id = s.affiliate_id
      WHERE a.id = $1 AND p.price_ghs IS NOT NULL`,
    [affiliate.id]
  );

  res.render('affiliate/dashboard', {
    affiliate,
    referredMerchants,
    stats: stats[0],
    formatGHS,
  });
});

// 🔹 GET /affiliate/program - Affiliate program info page
router.get('/program', affiliateCookieMiddleware, async (req, res, next) => {
  try {
    const programSettings = await getAffiliateProgramSettings();
    res.render('affiliate/program', {
      affiliate: req.affiliate || null,
      commissionRate: programSettings.commissionRatePercent,
      minimumPayout: programSettings.minimumPayoutGhs,
      attributionDays: programSettings.attributionDays,
      payoutProcessingMinDays: programSettings.payoutProcessingMinDays,
      payoutProcessingMaxDays: programSettings.payoutProcessingMaxDays,
    });
  } catch (err) {
    next(err);
  }
});

// 🔹 GET /affiliate/links
router.get('/links', affiliateCookieMiddleware, async (req, res) => {
  if (!req.affiliate) return res.status(401).json({ error: 'Unauthorized' });

  const affiliate = req.affiliate;
  const baseUrl = 'https://affiliate.didwaghana.com';

  const links = {
    dashboard: `${baseUrl}/affiliate/dashboard`,
    referral: `${baseUrl}/affiliate/signup?ref=${affiliate.referralCode}`,
    html: `<div class="affiliate-links">
        <a href="${baseUrl}/affiliate/dashboard" class="btn btn-primary">Dashboard</a>
        <a href="${baseUrl}/affiliate/signup?ref=${affiliate.referralCode}" class="btn btn-secondary">
          Referral Link
        </a>
      </div>`,
  };

  res.json(links);
});

// 🔹 POST /affiliate/withdraw
router.post('/withdraw', affiliateCookieMiddleware, async (req, res) => {
  if (!req.affiliate) return res.status(401).json({ error: 'Unauthorized' });

  const affiliate = req.affiliate;
  const { amountGHS } = req.body;

  const programSettings = await getAffiliateProgramSettings();
  const minPayout = programSettings.minimumPayoutGhs;

  if (Number(amountGHS) < Number(minPayout)) {
    return res.status(400).json({
      error: `Minimum payout is ${formatGHS(minPayout)}`,
    });
  }

  // Check affiliate has sufficient earned balance
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

  // Record the payout request
  await query(
    `INSERT INTO affiliate_payouts (affiliate_id, amount_ghs, momo_network, momo_number, status)
     VALUES ($1, $2, 'MTN', $3, 'pending')`,
    [affiliate.id, amountGHS, affiliate.momo_number || '']
  );

  res.json({
    success: true,
    message: `Payout request of ${formatGHS(amountGHS)} submitted. Processing time: ${programSettings.payoutProcessingMinDays}-${programSettings.payoutProcessingMaxDays} business days.`,
  });
});

// Helper: create seller user via existing auth flow
async function createSellerUser({ email, password }) {
  const passwordHash = await bcrypt.hash(String(password), 12);
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, status, plan, created_at)
     VALUES ($1, $2, 'active', 'free', now())
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id, password_hash`,
    [String(email).trim().toLowerCase(), passwordHash]
  );
  return { id: rows[0].id, passwordHash: rows[0].password_hash };
}

export default router;