/**
 * DiDwa - Billing & Onboarding Routes
 * MODULE 1: Zero-upfront registration -> automatic 14-day trial (DB trigger),
 * welcome SMS via mNotify, subscription activation and lifecycle status.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool, query, withTransaction } from '../config/database.js';
import { issueStoreToken, requireSeller, requireAdmin, optionalSeller, issueTwoFactorChallenge, verifyTwoFactorChallenge } from '../middleware/authMiddleware.js';
import { sendWelcomeSms, sendOtpSms } from '../services/smsService.js';
import { sendLifecycleEmail } from '../services/emailService.js';
import { sendMerchantPushNotification } from '../services/pushService.js';
import { recordAdminAction } from '../services/adminAudit.js';
import dns from 'node:dns/promises';
import { normalizeGhPhone, slugifyStoreName } from '../utils/helpers.js';
import { normalizeSubdomain, subdomainProblem, SUBDOMAIN_MESSAGES } from '../services/subdomainSlug.js';
import { isMtnNumber } from '../services/paymentRouter.js';
import { mtnCollect } from '../services/mtnMomoService.js';
import { initCheckout, hubtelDryRun } from '../services/hubtelService.js';
import { initPaystackCheckout, paystackPlatformReady } from '../services/paystackPlatform.js';
import { decryptSecret } from '../services/secretBox.js';
import { verifyTotp } from '../services/totpService.js';
import { billingCronHandler } from './billingCronRoute.js';
import { cycleInterval, listPublicPlans, loadPlanCatalog, resolveOffer } from '../services/planCatalog.js';

const router = Router();

/** Ensure the generated slug is unique AND not a platform-reserved slug. */
async function uniqueSlug(base) {
  let candidate = base;
  for (let i = 2; i < 50; i += 1) {
    const problem = subdomainProblem(candidate);
    const { rows } = await query('SELECT 1 FROM stores WHERE subdomain_slug = $1', [candidate]);
    if (rows.length === 0 && !problem) return candidate;
    candidate = `${base}-${i}`;
  }
  // Fallback: keep trying random suffixes until one is neither taken nor reserved.
  for (let i = 0; i < 20; i += 1) {
    const random = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (!subdomainProblem(random)) {
      const { rows } = await query('SELECT 1 FROM stores WHERE subdomain_slug = $1', [random]);
      if (rows.length === 0) return random;
    }
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ------------------------ Scheduled billing cycle (cron) -------------------- */
// Legacy alias; the canonical endpoint is GET /api/cron/billing (see
// billingCronRoute.js). Vercel Cron calls /api/cron/billing directly.
router.get('/cron', billingCronHandler);

/* --------------------------------- Register -------------------------------- */
router.post('/register', async (req, res, next) => {
  try {
    const { name, ownerName, email, phone, password, whatsappNumber, momoNumber, subdomain } = req.body || {};

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Shop name, email, phone and password are required.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    const normPhone = normalizeGhPhone(phone);
    if (!normPhone) {
      return res.status(400).json({ error: 'Enter a valid Ghana mobile number (e.g. 0244123456).' });
    }
    const normWhatsapp = whatsappNumber ? (normalizeGhPhone(whatsappNumber) || null) : null;
    const normMomo = momoNumber ? (normalizeGhPhone(momoNumber) || null) : null;

    const emailLower = String(email).trim().toLowerCase();
    // Real email existence & domain validation via DNS MX lookup.
    const emailDomain = emailLower.split('@')[1];
    if (!emailDomain || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      return res.status(400).json({ error: 'The email address provided does not exist or cannot receive mail.' });
    }
    let hasMx = false;
    try {
      const mx = await dns.resolveMx(emailDomain);
      hasMx = Array.isArray(mx) && mx.length > 0;
    } catch {
      hasMx = false;
    }
    if (!hasMx) {
      return res.status(400).json({ error: 'The email address provided does not exist or cannot receive mail.' });
    }
    const dupe = await query('SELECT 1 FROM stores WHERE LOWER(email) = $1 LIMIT 1', [emailLower]);
    if (dupe.rows.length > 0) {
      return res.status(409).json({ error: 'This email address is already registered to an account.' });
    }
    // Phone uniqueness: one phone number maps to strictly one account.
    const phoneDupe = await query('SELECT 1 FROM stores WHERE phone = $1 LIMIT 1', [normPhone]);
    if (phoneDupe.rows.length > 0) {
      return res.status(409).json({ error: 'This phone number is already registered to an account.' });
    }

    /* The seller's CHOSEN address, when the signup form supplied one. Taken
       verbatim - never silently substituted with a generated one, because the
       form promised them this exact URL. */
    /* Whether the seller picked their own address. Decided once, because the insert
       retry below has to know which collision policy applies. */
    const sellerChoseSlug = Boolean(String(subdomain || '').trim());
    let slug;
    if (sellerChoseSlug) {
      const wanted = normalizeSubdomain(subdomain);
      /* Same validator the availability tick used, so a green tick and this
         verdict can never disagree. */
      const problem = subdomainProblem(wanted);
      if (problem) {
        return res.status(400).json({ error: SUBDOMAIN_MESSAGES[problem] });
      }
      const { rows } = await query('SELECT 1 FROM stores WHERE subdomain_slug = $1 LIMIT 1', [wanted]);
      if (rows.length > 0) {
        return res.status(409).json({ error: SUBDOMAIN_MESSAGES.taken });
      }
      slug = wanted;
    } else {
      /* No choice made: keep the historical behaviour of deriving one from the
         shop name, so every existing signup flow is unaffected. */
      slug = await uniqueSlug(slugifyStoreName(name));
    }
    const hash = await bcrypt.hash(password, 12);

    // trial_ends_at / grace_ends_at are stamped by trg_stores_auto_trial trigger.
    let store;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const inserted = await withTransaction(async (t) =>
          t.query(
            `INSERT INTO stores (name, owner_name, email, phone, password_hash,
                                 subdomain_slug, whatsapp_number, momo_number)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             RETURNING id, name, owner_name, email, phone, subdomain_slug, status, plan,
                       trial_ends_at, grace_ends_at, currency, custom_domain, created_at`,
            [String(name).trim(), ownerName ? String(ownerName).trim() : String(name).trim(),
              emailLower, normPhone, hash, attempt === 1 ? slug
                : await uniqueSlug(`${slug}-retry-${Math.random().toString(36).slice(2, 6)}`),
              normWhatsapp, normMomo],
          ));
        store = inserted.rows[0];
        break;
      } catch (err) {
        // Check-then-insert races (concurrent email/slug) surface as unique
        // violations - recheck and, for slugs, retry with a fresh suffix.
        if (err.code === '23505' && attempt < maxAttempts) {
          const again = await query('SELECT 1 FROM stores WHERE LOWER(email) = $1 LIMIT 1', [emailLower]);
          if (again.rows.length > 0) {
            return res.status(409).json({ error: 'This email address is already registered to an account.' });
          }
          const phoneAgain = await query('SELECT 1 FROM stores WHERE phone = $1 LIMIT 1', [normPhone]);
          if (phoneAgain.rows.length > 0) {
            return res.status(409).json({ error: 'This phone number is already registered to an account.' });
          }
          /* Someone else claimed the address between the availability tick and
             this insert. Retrying with a random suffix would hand the seller a
             URL they never chose, so report the collision instead and let them
             pick again. The auto-generated path keeps its old retry behaviour. */
          if (sellerChoseSlug) {
            return res.status(409).json({ error: SUBDOMAIN_MESSAGES.taken });
          }
          continue;
        }
        throw err;
      }
    }
    const token = issueStoreToken(store);

    // Phone-ownership OTP verification via mNotify / Hubtel.
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await query(
      'UPDATE stores SET otp_code = $1, otp_expires_at = NOW() + INTERVAL \'10 minutes\', phone_verified = FALSE WHERE id = $2',
      [otp, store.id],
    );
    sendOtpSms(normPhone, otp).catch(() => {});

    // Welcome SMS + email + app push (Module 1) - none of the three blocks
    // registration on gateway hiccups: each channel is fire-and-forget and
    // independent of the others, so if one is down the others still deliver.
    // The push is also recorded in merchant_notifications (the app's inbox).
    sendWelcomeSms(store).catch(() => {});
    sendLifecycleEmail(store, 'welcome').catch(() => {});
    sendMerchantPushNotification({
      storeId: store.id,
      title: 'Welcome to DiDwa',
      body: `Your store "${store.name}" is live — your 14-day free trial has started.`,
      data: { type: 'welcome' },
    }).catch(() => {});

    res.status(201).json({
      message: 'Store created. Your 14-day free trial has started.',
      token,
      store: { ...store, trial_days_left: 14 },
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------ Phone OTP verification --------------------------- */
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { phone, otp } = req.body || {};
    const normPhone = normalizeGhPhone(phone);
    if (!normPhone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required.' });
    }
    const { rows } = await query(
      'SELECT id, otp_code, otp_expires_at FROM stores WHERE phone = $1 LIMIT 1',
      [normPhone],
    );
    const store = rows[0];
    if (!store || !store.otp_code || store.otp_code !== String(otp).trim()) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }
    if (store.otp_expires_at && new Date(store.otp_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }
    await query(
      'UPDATE stores SET phone_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
      [store.id],
    );
    res.json({ success: true, message: 'Phone number verified.' });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------- Login ---------------------------------- */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { rows } = await query(
      `SELECT id, name, owner_name, email, phone, password_hash, subdomain_slug, status, plan,
              trial_ends_at, grace_ends_at, currency, custom_domain, created_at,
              totp_enabled, totp_secret
         FROM stores WHERE LOWER(email) = $1 LIMIT 1`,
      [String(email).trim().toLowerCase()],
    );
    const store = rows[0];
    if (!store) return res.status(401).json({ error: 'Invalid email or password.' });

    const ok = await bcrypt.compare(password, store.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

    // Two-factor gate. The password is correct, but if the store has TOTP enabled
    // a password alone is not enough: hand back a short-lived challenge token
    // instead of a session, and let the client complete /login/2fa with a code.
    const twoFactorEnabled = Boolean(store.totp_enabled) && Boolean(store.totp_secret);
    delete store.password_hash;
    delete store.totp_secret;

    if (twoFactorEnabled) {
      return res.json({
        twoFactorRequired: true,
        challenge: issueTwoFactorChallenge(store),
        email: store.email,
      });
    }

    res.json({ token: issueStoreToken(store), store });
  } catch (err) {
    next(err);
  }
});

/* ------------------------- Login: two-factor step --------------------------- */
// Second half of a 2FA login. The `challenge` token proves the password was
// already verified for this store; we now require a live TOTP code from the
// seller's authenticator app before issuing the real session token.
router.post('/login/2fa', async (req, res, next) => {
  try {
    const { challenge, code } = req.body || {};
    if (!challenge || !code) {
      return res.status(400).json({ error: 'Verification code is required.' });
    }

    const payload = verifyTwoFactorChallenge(challenge);
    if (!payload) {
      return res.status(401).json({ error: 'This verification has expired. Please sign in again.' });
    }

    const { rows } = await query(
      `SELECT id, name, owner_name, email, phone, subdomain_slug, status, plan,
              trial_ends_at, grace_ends_at, currency, custom_domain, created_at,
              totp_enabled, totp_secret
         FROM stores WHERE id = $1 LIMIT 1`,
      [payload.sub],
    );
    const store = rows[0];
    if (!store || !store.totp_enabled || !store.totp_secret) {
      return res.status(401).json({ error: 'Two-factor is no longer active on this account. Please sign in again.' });
    }

    const secret = decryptSecret(store.totp_secret);
    if (!secret || !verifyTotp(secret, String(code))) {
      return res.status(401).json({ error: 'That code is not correct. Try the next code from your app.' });
    }

    delete store.totp_secret;
    res.json({ token: issueStoreToken(store), store });
  } catch (err) {
    next(err);
  }
});

/* --------------------------- Trial status (countdown) ----------------------- */
router.get('/status', requireSeller, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, status, plan, plan_cycle, plan_period_end, trial_ends_at, grace_ends_at,
              GREATEST(0, EXTRACT(EPOCH FROM (trial_ends_at - NOW())) / 86400)::numeric(6,2) AS days_left,
              GREATEST(0, EXTRACT(EPOCH FROM (plan_period_end - NOW())) / 86400)::numeric(6,2) AS paid_days_left
         FROM stores WHERE id = $1`,
      [req.auth.sub],
    );
    const store = rows[0] || null;
    // The plan's current price comes from the catalogue so the banner can say
    // what the next renewal would cost without hard-coding it.
    const { byId } = await loadPlanCatalog();
    const plan = store ? byId.get(store.plan) || null : null;
    res.json({
      billing: store
        ? { ...store, planName: plan?.name || store.plan, monthlyPriceGhs: plan?.monthlyPriceGhs ?? null, yearlyPriceGhs: plan?.yearlyPriceGhs ?? null }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ Activate (pay) ------------------------------ */
// POST /api/billing/subscribe - charge the subscription and flip the store to
// ACTIVE only when the provider confirms. MTN numbers hit the MTN MoMo
// PRODUCTION API first; on ANY MTN failure (error/timeout/pending) or for a
// non-MTN number it falls back to a Hubtel HOSTED CHECKOUT (card or any MoMo),
// and the plan is activated by the Hubtel webhook when that settles.
//
// Idempotency: every attempt carries a client-supplied `idempotencyKey`
// (default: one per request) so a retried tap on "Activate" cannot charge
// twice - a replayed key returns the outcome of the original attempt.
router.post('/subscribe', requireSeller, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const network = String(req.body?.network || 'MTN').toUpperCase();
    const momoNumber = normalizeGhPhone(req.body?.momoNumber || req.body?.destination);

    if (!['MTN', 'VODAFONE', 'AT'].includes(network)) {
      client.release();
      return res.status(400).json({ error: 'Network must be MTN, VODAFONE (Telecel) or AT.' });
    }
    if (!momoNumber) {
      client.release();
      return res.status(400).json({ error: 'Enter the MoMo number the subscription should be charged from.' });
    }

    // The amount is resolved HERE, on the server, from the catalogue - a price
    // sent by the client is ignored entirely. This also rejects the free trial
    // and any plan an admin has taken off sale.
    const offer = await resolveOffer(req.body?.planId, req.body?.cycle);
    if (!offer.ok) {
      client.release();
      return res.status(400).json({ error: offer.error });
    }
    const { plan, cycle, amountGhs } = offer;

    await client.query('BEGIN');
    const lock = await client.query(
      'SELECT id, status, plan FROM stores WHERE id = $1 FOR UPDATE',
      [req.auth.sub],
    );
    const store = lock.rows[0];
    if (!store) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Store not found.' });
    }
    if (store.status === 'SUSPENDED') {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: 'Suspended accounts must contact support first.' });
    }
    await client.query('COMMIT');
    client.release();

    // Idempotency: the comment above promises a client-supplied key, but the
    // code generated a fresh reference every call — a retried tap on
    // "Activate" charged twice. Honour the supplied key when present so a
    // replay returns the original attempt instead of a second charge.
    const rawKey = String(req.body?.idempotencyKey || '').trim().slice(0, 120);
    const reference = rawKey ? `GS-SUB-${rawKey}` : `GS-SUB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (rawKey) {
      const prior = await query(
        `SELECT id, status, reference FROM subscription_payments
          WHERE store_id = $1 AND reference = $2 LIMIT 1`,
        [req.auth.sub, reference],
      );
      if (prior.rows[0]) {
        return res.json({
          success: prior.rows[0].status === 'PAID',
          replayed: true,
          reference: prior.rows[0].reference,
          status: prior.rows[0].status,
          message: 'This subscription attempt was already recorded.',
        });
      }
    }
    const attempt = await query(
      `INSERT INTO subscription_payments
          (store_id, plan_id, amount, momo_number, network, provider, reference, cycle, status)
       VALUES ($1,$2,$3,$4,$5,'PENDING',$6,$7,'PENDING')
       RETURNING id`,
      [req.auth.sub, plan.id, amountGhs, momoNumber, network, reference, cycle],
    );
    const attemptId = attempt.rows[0].id;

    // Charge the subscription. MTN numbers go to the MTN MoMo PRODUCTION API
    // first (instant requestToPay + status poll). Anything else - a non-MTN
    // number, or any MTN failure/timeout/still-pending - falls back to a Hubtel
    // HOSTED CHECKOUT, so the seller is redirected to a secure page and can pay
    // by card or any Mobile Money network. A confirmed MTN charge activates the
    // plan immediately; a hosted checkout settles later and is activated by the
    // Hubtel webhook (see services/paymentWebhooks.js), so the row stays PENDING
    // until then - never a silent ACTIVE.
    const useMtn = isMtnNumber(momoNumber);
    let collected = null;

    if (useMtn) {
      try {
        collected = await mtnCollect({
          customerMsisdn: momoNumber,
          amount: amountGhs,
          description: `DiDwa ${plan.name} ${cycle} plan - ${reference}`,
          clientReference: reference,
        });
      } catch (err) {
        // mtnCollect catches its own HTTP errors, but an unexpected throw
        // (timeout, network) must still fall back rather than surface as a 500.
        console.error('[billing] MTN collect threw:', err.message);
        collected = { success: false, provider: 'MTN', status: 'ERROR', message: err.message };
      }
    }

    if (collected && collected.success) {
      // Provider confirmed: activate + close the payment row in one transaction.
      // plan_period_end is computed server-side from the cycle; it is what the
      // paid period actually bought, recorded on both the tenant and the payment.
      const done = await withTransaction(async (t) => {
        const activated = await t.query(
          `UPDATE stores
              SET status = 'ACTIVE', plan = $2, plan_cycle = $3,
                  plan_period_end = NOW() + $4::INTERVAL
            WHERE id = $1 AND status <> 'SUSPENDED'
            RETURNING id, name, status, plan, plan_cycle, plan_period_end`,
          [req.auth.sub, plan.id, cycle, cycleInterval(cycle)],
        );
        if (!activated.rows[0]) {
          throw Object.assign(new Error('Store cannot be activated in its current state.'), { status: 400 });
        }
        await t.query(
          `UPDATE subscription_payments
              SET status = 'PAID', provider = $2, gateway_reference = $3, paid_at = NOW(),
                  period_start = NOW(), period_end = NOW() + $4::INTERVAL
            WHERE id = $1`,
          [attemptId, collected.provider || 'MTN', collected.reference || reference, cycleInterval(cycle)],
        );
        return activated.rows[0];
      });

      return res.json({
        success: true,
        message: `${plan.name} (${cycle}) activated for GHS ${amountGhs.toFixed(2)} via ${collected.provider || 'MTN'}. Your storefront stays live.`,
        store: done,
        plan: { id: plan.id, name: plan.name, cycle, amountGhs },
        periodEnd: done.plan_period_end,
        provider: collected.provider || 'MTN',
        dryRun: Boolean(collected.dryRun),
      });
    }

    // MTN declined/errored/timed-out (or this was never an MTN number). Instead
    // of failing the seller with an opaque 402, hand them a Hubtel hosted
    // checkout to complete the SAME payment by card or any MoMo network. Money
    // moves later, so the plan is activated by the webhook, not here.
    if (collected && !collected.success) {
      console.warn(
        `[billing] MTN collect failed for ${reference} (${collected.status || 'ERROR'}): `
        + `${collected.message || 'unknown'} - falling back to Hubtel hosted checkout.`,
      );
    }

    /* When Hubtel is NOT configured but Paystack is, do not dry-run a fake
       checkout page - a simulated checkoutUrl is a dead end and the seller's
       money would never move. Skip straight to the real Paystack leg below.
       Both unconfigured keeps the dry-run so local development still works. */
    let checkout = null;
    let hubtelError = null;
    if (!(hubtelDryRun && paystackPlatformReady())) {
      try {
        checkout = await initCheckout({
          amountGhs,
          description: `DiDwa ${plan.name} ${cycle} plan - ${reference}`,
          clientReference: reference,
          customerPhone: momoNumber,
          returnUrl: `${process.env.CLIENT_URL || 'https://didwaghana.com'}/settings/plan`,
          cancellationUrl: `${process.env.CLIENT_URL || 'https://didwaghana.com'}/settings/plan`,
          metadata: { kind: 'SUBSCRIPTION', storeId: req.auth.sub, planId: plan.id, cycle },
        });
      } catch (err) {
        hubtelError = err;
        console.error(`[billing] Hubtel checkout failed for ${reference}: ${err.message}`);
      }
    }

    if (checkout) {
      return res.json({
        success: true,
        provider: 'hubtel',
        checkoutUrl: checkout.checkoutUrl,
        checkoutId: checkout.checkoutId,
        reference,
        message: 'Complete your payment on the secure checkout page to activate your plan.',
        dryRun: Boolean(checkout.dryRun),
      });
    }

    // Hubtel leg failed or was skipped. Paystack is Fallback 2: the SAME
    // reference is offered as a Paystack payment page, so the webhook
    // activates the plan from whichever gateway confirms. The row stays
    // PENDING either way - never a silent ACTIVE.
    let lastError = hubtelError || new Error('The payment gateway is unavailable right now.');
    if (paystackPlatformReady()) {
      try {
        const ps = await initPaystackCheckout({
          amountGhs,
          email: req.store.email,
          reference,
          callbackUrl: `${process.env.CLIENT_URL || 'https://didwaghana.com'}/settings/plan`,
          metadata: { kind: 'SUBSCRIPTION', storeId: req.auth.sub, planId: plan.id, cycle },
        });
        return res.json({
          success: true,
          provider: 'paystack',
          checkoutUrl: ps.checkoutUrl,
          checkoutId: ps.checkoutId,
          reference,
          message: 'Complete your payment on the secure checkout page to activate your plan.',
        });
      } catch (psErr) {
        console.error(`[billing] Paystack fallback failed for ${reference}: ${psErr.message}`);
        lastError = psErr; // the seller sees whichever leg failed last
      }
    }

    // Every leg failed. Record it and return an actionable JSON error instead
    // of crashing - the UI displays this message verbatim.
    await query(
      `UPDATE subscription_payments
          SET status = 'FAILED', provider = 'HUBTEL', failure_reason = $2
        WHERE id = $1`,
      [attemptId, (lastError.message || 'Checkout could not be created').slice(0, 300)],
    );
    return res.status(402).json({
      error: lastError.message || 'Payment could not be completed. Please try again or contact support.',
      provider: 'HUBTEL',
      reference,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* noop */ }
    try { client.release(); } catch { /* noop */ }
    next(err);
  }
});

/* --------------------------- Manual activation ---------------------------- */
// Direct activation is now an ADMIN override (support desk, manual bank
// transfer, comped plan). Sellers subscribe through POST /subscribe, which
// only activates after a confirmed MoMo collection.
router.post('/activate', requireAdmin, async (req, res, next) => {
  try {
    const storeId = req.body?.storeId || req.body?.store_id;
    if (!storeId) {
      return res.status(400).json({ error: 'storeId is required for manual activation.' });
    }
    const planId = String(req.body?.planId || 'growth').toLowerCase();
    // An override still has to name a plan that exists - the FK would reject an
    // unknown slug anyway, but failing here returns a readable message.
    const { byId } = await loadPlanCatalog();
    const plan = byId.get(planId);
    if (!plan) return res.status(400).json({ error: 'Unknown plan.' });
    const cycle = String(req.body?.cycle || 'monthly').toLowerCase();
    if (!['monthly', 'yearly'].includes(cycle)) {
      return res.status(400).json({ error: 'Cycle must be monthly or yearly.' });
    }
    const { rows } = await query(
      `UPDATE stores
          SET status = 'ACTIVE', plan = $2, plan_cycle = $3,
              plan_period_end = NOW() + $4::INTERVAL
        WHERE id = $1 AND status <> 'SUSPENDED'
        RETURNING id, name, status, plan, plan_cycle, plan_period_end`,
      [storeId, plan.id, cycle, cycleInterval(cycle)],
    );
    if (!rows[0]) {
      return res.status(400).json({ error: 'Store not found or suspended.' });
    }
    // Manual activation moves money-adjacent state, so it is in the audit
    // ledger like every other admin write.
    await recordAdminAction(req, {
      action: 'billing.activate',
      targetType: 'store',
      targetId: rows[0].id,
      detail: { name: rows[0].name, plan: rows[0].plan, cycle, status: rows[0].status, reason: req.body?.reason || null },
    });
    res.json({ message: `${plan.name} (${cycle}) activated for ${rows[0].name}.`, store: rows[0] });
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------- Plans ----------------------------------- */
// Public: the pricing page and the seller upgrade dialog both read this, so the
// prices shown are whatever the admin last saved. No price is ever hard-coded on
// the client, and a seller token (when present) also gets their current plan so
// the UI can mark it without a second round trip.
router.get('/plans', optionalSeller, async (req, res, next) => {
  try {
    const plans = await listPublicPlans();

    // A signed-in seller also gets their current plan so the page can mark it
    // without a second round trip. Visitors simply get null.
    let current = null;
    if (req.auth?.sub) {
      const { rows } = await query(
        'SELECT plan, plan_cycle, plan_period_end FROM stores WHERE id = $1',
        [req.auth.sub],
      );
      current = rows[0] || null;
    }

    res.json({ plans, currency: 'GHS', cycles: ['monthly', 'yearly'], current });
  } catch (err) {
    next(err);
  }
});

export default router;

