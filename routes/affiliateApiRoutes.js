// routes/affiliateApiRoutes.js
// DiDwa - Affiliate API Routes
// Mounted at /api/affiliate in server.js

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  findByReferralCode,
  findById,
  findByEmailForAuth,
  create,
  listPayoutRequests,
} from '../models/affiliate.js';
import { formatGHS } from '../lib/affiliate.js';
import { issueAffiliateToken, requireAuth } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { getAffiliateProgramSettings } from '../services/affiliateProgramSettings.js';
import { platformDomain } from '../middleware/domainMiddleware.js';

const router = Router();

function requireAffiliate(req, res, next) {
  requireAuth(req, res, async (err) => {
    if (err) return next(err);
    if (req.auth?.role !== 'AFFILIATE') {
      return res.status(403).json({ error: 'Affiliate account access required.' });
    }
    try {
      const affiliate = await findById(req.auth.sub);
      if (!affiliate) return res.status(401).json({ error: 'Affiliate account not found or inactive.' });
      req.affiliate = affiliate;
      return next();
    } catch (queryErr) {
      return next(queryErr);
    }
  });
}

router.get('/program', async (_req, res, next) => {
  try {
    res.json({ settings: await getAffiliateProgramSettings() });
  } catch (err) {
    next(err);
  }
});

router.get('/attribution', async (req, res, next) => {
  try {
    const referralCode = String(req.query?.ref || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(referralCode)) {
      return res.status(400).json({ error: 'Referral code is invalid.' });
    }
    const affiliate = await findByReferralCode(referralCode);
    if (!affiliate) return res.status(404).json({ error: 'Referral code was not found.' });
    const settings = await getAffiliateProgramSettings();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: settings.attributionDays * 24 * 60 * 60 * 1000,
      path: '/',
    };
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.domain = `.${platformDomain()}`;
    }
    res.cookie('didwa_ref', referralCode, cookieOptions);
    return res.json({ attributed: true });
  } catch (err) {
    return next(err);
  }
});

router.post('/signup', async (req, res, next) => {
  try {
    const fullName = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim();
    const momoNetwork = String(req.body?.momoNetwork || '').trim().toUpperCase();
    const momoNumber = String(req.body?.momoNumber || '').trim();
    const password = String(req.body?.password || '');
    if (!fullName || fullName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        || !phone || phone.length > 32 || !momoNumber || momoNumber.length > 32
        || !['MTN', 'VODAFONE', 'AT'].includes(momoNetwork) || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Enter valid account, Mobile Money, and password details. Passwords must be at least 8 characters.' });
    }
    if (await findByEmailForAuth(email)) {
      return res.status(409).json({ error: 'An affiliate account already uses this email.' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const affiliate = await create({
      fullName,
      email,
      phone,
      momoNetwork,
      momoNumber,
      passwordHash,
    });
    return res.status(201).json({
      token: issueAffiliateToken(affiliate),
      affiliate,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An affiliate account already uses this email.' });
    }
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const account = await findByEmailForAuth(email);
    if (!account || !account.is_active || !(await bcrypt.compare(password, account.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const affiliate = await findById(account.id);
    return res.json({
      token: issueAffiliateToken(affiliate),
      affiliate,
    });
  } catch (err) {
    return next(err);
  }
});

// 🔹 GET /api/affiliate/me - Current affiliate profile
router.get('/me', requireAffiliate, async (req, res) => {
  res.json(req.affiliate);
});

// 🔹 GET /api/affiliate/stats - Earnings stats
router.get('/stats', requireAffiliate, async (req, res) => {
  const { rows: stats } = await query(
    `SELECT
       (SELECT COALESCE(SUM(earned_amount_ghs), 0)
          FROM affiliate_commissions
         WHERE affiliate_id = $1 AND status <> 'reversed') AS total_earned,
       (SELECT COUNT(*)::int
          FROM referrals
         WHERE affiliate_id = $1) AS referred_count`,
    [req.affiliate.id]
  );
  res.json(stats[0]);
});

// 🔹 GET /api/affiliate/referrals - List referred stores
router.get('/referrals', requireAffiliate, async (req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.status, r.referred_at, r.upgraded_at,
            s.id AS store_id, s.subdomain_slug, s.email AS merchant_email,
            s.plan AS plan_name
     FROM referrals r
     JOIN stores s ON s.id = r.referred_store_id
     WHERE r.affiliate_id = $1
     ORDER BY r.referred_at DESC
     LIMIT 30`,
    [req.affiliate.id]
  );
  res.json(rows);
});

// 🔹 GET /api/affiliate/payouts - List payout requests
router.get('/payouts', requireAffiliate, async (req, res) => {
  const requests = await listPayoutRequests(req.affiliate.id);
  res.json(requests);
});

// 🔹 POST /api/affiliate/payouts - Request a payout
router.post('/payouts', requireAffiliate, async (req, res) => {
  const { amountGHS } = req.body;
  if (!amountGHS || isNaN(amountGHS) || amountGHS <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const programSettings = await getAffiliateProgramSettings();
  const minPayout = programSettings.minimumPayoutGhs;

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
    [req.affiliate.id]
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
     VALUES ($1, $2, $3, $4, 'pending')`,
    [req.affiliate.id, amountGHS, req.affiliate.momo_network, req.affiliate.momo_number]
  );

  res.json({
    success: true,
    message: `Payout request of ${formatGHS(amountGHS)} submitted. Processing time: ${programSettings.payoutProcessingMinDays}-${programSettings.payoutProcessingMaxDays} business days.`,
  });
});

export default router;