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
import { formatGHS, isValidReferralCode } from '../lib/affiliate.js';
import { issueAffiliateToken, requireAuth } from '../middleware/authMiddleware.js';
import { query, withTransaction } from '../config/database.js';
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
    if (!isValidReferralCode(referralCode)) {
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
         WHERE affiliate_id = $1 AND status IN ('pending', 'paid')) AS total_earned,
       (SELECT COALESCE(SUM(earned_amount_ghs), 0)
          FROM affiliate_commissions
         WHERE affiliate_id = $1 AND status = 'pending') AS pending_commissions,
       (SELECT COALESCE(SUM(earned_amount_ghs), 0)
          FROM affiliate_commissions
         WHERE affiliate_id = $1 AND status = 'paid') AS paid_commissions,
       (SELECT COALESCE(SUM(amount_ghs), 0)
          FROM affiliate_payouts
         WHERE affiliate_id = $1 AND status = 'pending') AS pending_payouts,
       (SELECT COALESCE(SUM(amount_ghs), 0)
          FROM affiliate_payouts
         WHERE affiliate_id = $1 AND status = 'paid') AS completed_payouts,
       (SELECT COUNT(*)::int
          FROM referrals
         WHERE affiliate_id = $1) AS referred_count`,
    [req.affiliate.id]
  );
  stats[0].available_payout = Math.max(
    0,
    Number(stats[0].paid_commissions || 0)
      - Number(stats[0].pending_payouts || 0)
      - Number(stats[0].completed_payouts || 0),
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
router.post('/payouts', requireAffiliate, async (req, res, next) => {
  try {
    const rawAmount = req.body?.amountGHS;
    const amountGhs = Number(rawAmount);
    if (!Number.isFinite(amountGhs) || amountGhs <= 0 || Math.abs(amountGhs * 100 - Math.round(amountGhs * 100)) > 1e-8) {
      return res.status(400).json({ error: 'Enter a valid payout amount with up to two decimal places.' });
    }

    const programSettings = await getAffiliateProgramSettings();
    const minPayout = programSettings.minimumPayoutGhs;
    if (amountGhs < Number(minPayout)) {
      return res.status(400).json({
        error: `Minimum payout is ${formatGHS(minPayout)}`,
      });
    }

    const payout = await withTransaction(async (t) => {
      await t.query('SELECT id FROM affiliates WHERE id = $1 FOR UPDATE', [req.affiliate.id]);
      const { rows } = await t.query(
        `SELECT
           (SELECT COALESCE(SUM(earned_amount_ghs), 0)
              FROM affiliate_commissions
             WHERE affiliate_id = $1 AND status = 'paid') AS paid_commissions,
           (SELECT COALESCE(SUM(amount_ghs), 0)
              FROM affiliate_payouts
             WHERE affiliate_id = $1 AND status IN ('pending', 'paid')) AS reserved_payouts`,
        [req.affiliate.id],
      );
      const available = Math.max(0, Number(rows[0].paid_commissions) - Number(rows[0].reserved_payouts));
      if (amountGhs > available) {
        const err = new Error(`Insufficient available balance. Available: ${formatGHS(available)}.`);
        err.status = 400;
        throw err;
      }
      const { rows: inserted } = await t.query(
        `INSERT INTO affiliate_payouts (affiliate_id, amount_ghs, momo_network, momo_number, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING id, amount_ghs, status, requested_at`,
        [req.affiliate.id, amountGhs, req.affiliate.momo_network, req.affiliate.momo_number],
      );
      return inserted[0];
    });

    return res.json({
      success: true,
      payout,
      message: `Payout request of ${formatGHS(amountGhs)} submitted. Processing time: ${programSettings.payoutProcessingMinDays}-${programSettings.payoutProcessingMaxDays} business days.`,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

export default router;