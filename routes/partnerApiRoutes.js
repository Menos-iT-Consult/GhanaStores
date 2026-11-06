import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  createPartnerApplication,
  createPartnerPayout,
  findApprovedPartnerByCode,
  findApprovedPartnerBySlug,
  findPartnerByEmailForAuth,
  findPartnerById,
} from '../models/partner.js';
import { issuePartnerToken, requireAuth } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';
import { platformDomain } from '../middleware/domainMiddleware.js';
import { normalizeGhPhone } from '../utils/helpers.js';
import { resolvePaystackMomoAccountName } from '../services/paystackPlatform.js';

const router = Router();

function requirePartner(req, res, next) {
  requireAuth(req, res, async (err) => {
    if (err) return next(err);
    if (req.auth?.role !== 'PARTNER') {
      return res.status(403).json({ error: 'Strategic partner account access required.' });
    }
    try {
      const partner = await findPartnerById(req.auth.sub);
      if (!partner) return res.status(401).json({ error: 'Partner account is not approved or active.' });
      req.partner = partner;
      return next();
    } catch (queryErr) {
      return next(queryErr);
    }
  });
}

router.get('/public/:slug', async (req, res, next) => {
  try {
    const partner = await findApprovedPartnerBySlug(req.params.slug);
    if (!partner) return res.status(404).json({ error: 'Partner page not found.' });
    res.json({
      partner: {
        fullName: partner.full_name,
        organizationName: partner.organization_name,
        partnerSlug: partner.partner_slug,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/attribution', async (req, res, next) => {
  try {
    const code = String(req.query?.code || '').trim();
    const partner = await findApprovedPartnerByCode(code);
    if (!partner) return res.status(404).json({ error: 'Partner referral code was not found or is inactive.' });
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    };
    if (process.env.NODE_ENV === 'production') options.domain = `.${platformDomain()}`;
    res.cookie('didwa_partner', partner.partner_code, options);
    res.clearCookie('didwa_ref', options);
    return res.json({ attributed: true });
  } catch (err) {
    return next(err);
  }
});

router.post('/apply', async (req, res, next) => {
  try {
    const fullName = String(req.body?.fullName || '').trim();
    const organizationName = String(req.body?.organizationName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = normalizeGhPhone(req.body?.phone);
    const password = String(req.body?.password || '');
    const rawReferralCode = String(req.body?.preferredReferralCode || '').trim();
    const preferredReferralCode = rawReferralCode ? rawReferralCode.toUpperCase() : '';
    if (!fullName || fullName.length > 120 || !organizationName || organizationName.length > 160
        || email.length > 254
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone
        || password.length < 8 || password.length > 128
        || (preferredReferralCode && !/^[A-Z0-9]{3,20}$/.test(preferredReferralCode))) {
      return res.status(400).json({
        error: 'Enter valid application details and a password of at least 8 characters. Referral codes must be 3-20 letters or numbers.',
      });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const application = await createPartnerApplication({
      fullName,
      organizationName,
      email,
      phone,
      passwordHash,
      preferredReferralCode,
    });
    return res.status(201).json({
      application,
      message: `Your application has been received${application.partner_code ? ` with referral code ${application.partner_code}` : ''}. You can sign in after Central Admin approves it.`,
    });
  } catch (err) {
    if (err.code === 'PARTNER_CODE_EXISTS') {
      return res.status(409).json({ error: 'That referral code is already in use. Choose another code.' });
    }
    if (err.code === 'PARTNER_EMAIL_EXISTS' || err.code === '23505') {
      return res.status(409).json({ error: 'A partner application already uses this email.' });
    }
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const account = await findPartnerByEmailForAuth(email);
    if (!account || account.status !== 'approved'
        || !(await bcrypt.compare(password, account.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials or partner application not yet approved.' });
    }
    const partner = await findPartnerById(account.id);
    return res.json({ token: issuePartnerToken(partner), partner });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', requirePartner, (req, res) => res.json({ partner: req.partner }));

router.get('/dashboard', requirePartner, async (req, res, next) => {
  try {
    const [statsResult, setting] = await Promise.all([
      query(
      `WITH network_stores AS (
         SELECT pn.merchant_id AS store_id
           FROM partner_network pn
          WHERE pn.partner_id = $1 AND pn.relationship = 'merchant'
         UNION
         SELECT r.referred_store_id AS store_id
           FROM partner_network pn
           JOIN referrals r ON r.affiliate_id = pn.affiliate_id
          WHERE pn.partner_id = $1 AND pn.relationship = 'affiliate'
       )
       SELECT
         (SELECT COUNT(*)::int
            FROM partner_network pn JOIN stores s ON s.id = pn.merchant_id
           WHERE pn.partner_id = $1 AND pn.relationship = 'merchant'
             AND s.status = 'ACTIVE') AS active_merchants,
         (SELECT COUNT(*)::int
            FROM partner_network pn JOIN affiliates a ON a.id = pn.affiliate_id
           WHERE pn.partner_id = $1 AND pn.relationship = 'affiliate'
             AND a.is_active = TRUE) AS active_affiliates,
         (SELECT COALESCE(SUM(o.total), 0)
            FROM network_stores ns JOIN orders o ON o.store_id = ns.store_id
           WHERE o.payment_status = 'PAID'
             AND o.status IN ('PAID','FULFILLED','DELIVERED')
             AND o.paid_at >= date_trunc('month', NOW())) AS monthly_volume_ghs,
         (SELECT COALESCE(SUM(l.earned_amount_ghs), 0)
            FROM partner_ledgers l
           WHERE l.partner_id = $1 AND l.status IN ('available','pending')) AS total_earned_ghs,
         (SELECT COALESCE(SUM(l.earned_amount_ghs), 0)
            FROM partner_ledgers l
           WHERE l.partner_id = $1 AND l.status = 'available') AS eligible_earned_ghs,
         (SELECT COALESCE(SUM(p.amount_ghs), 0)
            FROM partner_payouts p
           WHERE p.partner_id = $1 AND p.status IN ('pending','paid')) AS reserved_payouts_ghs`,
      [req.partner.id],
      ),
      query("SELECT setting_value FROM system_settings WHERE setting_key = 'partner_min_cashout_ghs'"),
    ]);
    const stats = statsResult.rows[0];
    stats.available_balance_ghs = Math.max(
      0,
      Number(stats.eligible_earned_ghs || 0) - Number(stats.reserved_payouts_ghs || 0),
    );
    const apex = platformDomain();
    res.json({
      stats,
      links: {
        merchant: `https://${apex}/p/${encodeURIComponent(req.partner.partner_slug)}`,
        affiliate: `https://affiliate.${apex}/affiliate/signup?ref=${encodeURIComponent(req.partner.partner_code)}`,
      },
      payoutMinimumGhs: Number(setting.rows[0]?.setting_value || 50),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/payout-account/verify', requirePartner, async (req, res, next) => {
  try {
    const network = String(req.body?.network || '').trim().toUpperCase();
    const momoNumber = normalizeGhPhone(req.body?.momoNumber);
    if (!['MTN', 'TELECEL', 'AT'].includes(network) || !momoNumber) {
      return res.status(400).json({ error: 'Enter a valid Ghanaian Mobile Money number and network.' });
    }
    const verificationNetwork = network === 'TELECEL' ? 'TELECEL' : network;
    const { accountName, bankName } = await resolvePaystackMomoAccountName({
      network: verificationNetwork,
      phone: momoNumber,
    });
    await query(
      `UPDATE partners
          SET momo_network = $2, momo_number = $3, momo_verified_name = $4,
              momo_verified_at = NOW(), updated_at = NOW()
        WHERE id = $1`,
      [req.partner.id, network, momoNumber, accountName],
    );
    return res.json({ verification: { accountName, bankName } });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

router.get('/payouts', requirePartner, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, amount_ghs, momo_network, momo_number, status, transfer_reference,
              admin_note, requested_at, processed_at
         FROM partner_payouts
        WHERE partner_id = $1
        ORDER BY requested_at DESC
        LIMIT 50`,
      [req.partner.id],
    );
    return res.json({ payouts: rows });
  } catch (err) {
    return next(err);
  }
});

router.post('/payouts', requirePartner, async (req, res, next) => {
  try {
    const raw = req.body?.amountGhs;
    const amountGhs = Number(raw);
    if (!Number.isFinite(amountGhs) || amountGhs <= 0
        || Math.abs(amountGhs * 100 - Math.round(amountGhs * 100)) > 1e-8) {
      return res.status(400).json({ error: 'Enter a valid payout amount with up to two decimal places.' });
    }
    const setting = await query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'partner_min_cashout_ghs'`,
    );
    const minimum = Number(setting.rows[0]?.setting_value || 50);
    if (amountGhs < minimum) {
      return res.status(400).json({ error: `Minimum payout is GHS ${minimum.toFixed(2)}.` });
    }
    const payout = await createPartnerPayout(req.partner.id, amountGhs);
    return res.status(201).json({ payout, message: 'Your Mobile Money payout request has been submitted for review.' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

export default router;
