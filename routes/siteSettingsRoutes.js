/**
 * DiDwa - Store Site Settings API (/api/site-settings)
 *
 * Powers the merchant dashboard "Site Settings" tab. Five concerns, all scoped to
 * the signed-in seller's own store (never a client-supplied store_id):
 *   - Business profile        GET/PATCH /profile (public contacts, description, address)
 *   - Account contacts        POST /profile/contact/request + /verify (new-channel OTP)
 *   - Change password         PATCH /password (current password required)
 *   - Forgot / reset password POST /password/forgot + /password/reset (public)
 *   - Delete account          DELETE /account (hard delete, slug + password)
 *   - Two-factor (TOTP)       POST /2fa/setup | /2fa/enable | /2fa/disable
 *
 * Design notes:
 *  - Secrets: the TOTP secret is stored encrypted at rest via secretBox.js.
 *  - Deletion is a real DELETE FROM stores; every child table cascades (orders,
 *    products, payments, domains, the 2FA/reset rows, etc.), so a freed slug and
 *    email can be re-registered and the new tenant starts with a clean dashboard.
 *  - Reset tokens are SHA-256 hashed before storage, single-use and time-limited.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { query, pool, withTransaction } from '../config/database.js';
import { JWT_SECRET, requireSeller } from '../middleware/authMiddleware.js';
import { encryptSecret, decryptSecret, encryptionConfigured } from '../services/secretBox.js';
import { sendEmail } from '../services/emailService.js';
import { sendMerchantPushNotification } from '../services/pushService.js';
import { passwordResetTemplate } from '../services/emailTemplates.js';
import { generateSecret, verifyTotp, otpauthUri, qrDataUrl } from '../services/totpService.js';
import { normalizeGhPhone } from '../utils/helpers.js';
import { sendOtpSms } from '../services/smsService.js';
import { RENDITIONS, buildDeliveryUrl } from '../services/storage.js';

const router = Router();

/* --------------------------------- Constants -------------------------------- */

const BCRYPT_ROUNDS = 12;            // matches registration hashing cost
const RESET_TTL_MINUTES = 60;        // how long a forgot-password link stays valid
const NAME_MIN = 2;
const NAME_MAX = 60;
const PROFILE_DESCRIPTION_MAX = 500;
const PROFILE_ADDRESS_MAX = 240;
const CONTACT_OTP_TTL_MINUTES = 10;
const CONTACT_OTP_MAX_ATTEMPTS = 5;

const hashCode = (code) =>
  crypto.createHmac('sha256', JWT_SECRET).update(String(code)).digest('hex');
const isEmailAddress = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function contactOtpMatches(code, expectedHash) {
  const actual = Buffer.from(hashCode(code), 'hex');
  const expected = Buffer.from(String(expectedHash || ''), 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/** Build the platform's origin for links in emails (never trust the Host header). */
function platformUrl() {
  return (process.env.CLIENT_URL || 'https://didwaghana.com').replace(/\/+$/, '');
}

/** bcrypt cost with a small safety net; registration uses 12 so we match it. */
const hashPassword = (plain) => bcrypt.hash(String(plain), BCRYPT_ROUNDS);

/* ------------------------------- Rename store ------------------------------- */
// Display name only. The subdomain slug is deliberately NOT changeable here: it
// is the store's address, changing it would break every link and bookmark the
// seller has shared. Renaming never touches the slug.
router.patch('/name', requireSeller, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      return res.status(400).json({ error: `Store name must be ${NAME_MIN}-${NAME_MAX} characters.` });
    }
    const { rows } = await query(
      `UPDATE stores SET name = $2 WHERE id = $1 RETURNING id, name`,
      [req.auth.sub, name],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Store not found.' });
    res.json({ success: true, name: rows[0].name });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------- Store profile ----------------------------- */
router.get('/profile', requireSeller, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT name, email, phone, phone_verified,
              COALESCE(NULLIF(public_email, ''), custom_theme_config #>> '{pages_content,contact_email}', '') AS public_email,
              COALESCE(NULLIF(public_phone, ''), custom_theme_config #>> '{pages_content,contact_phone}', '') AS public_phone,
              COALESCE(NULLIF(whatsapp_number, ''), custom_theme_config #>> '{features,whatsapp_number}', '') AS whatsapp_number,
              COALESCE(NULLIF(store_description, ''), custom_theme_config #>> '{pages_content,about_body}', '') AS store_description,
              COALESCE(NULLIF(business_address, ''), custom_theme_config #>> '{pages_content,contact_address}', '') AS business_address,
              logo_url, subdomain_slug
         FROM stores
        WHERE id = $1
        LIMIT 1`,
      [req.auth.sub],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Store not found.' });
    const store = rows[0];
    res.json({
      name: store.name,
      email: store.email,
      phone: store.phone,
      phoneVerified: store.phone_verified,
      publicEmail: store.public_email || '',
      publicPhone: store.public_phone || '',
      whatsappNumber: store.whatsapp_number || '',
      description: store.store_description || '',
      address: store.business_address || '',
      logoUrl: buildDeliveryUrl(store.logo_url, RENDITIONS.logo),
      logoKey: store.logo_url,
      subdomainSlug: store.subdomain_slug,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/profile', requireSeller, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const publicEmail = String(req.body?.publicEmail || '').trim().toLowerCase();
    const publicPhoneInput = String(req.body?.publicPhone || '').trim();
    const whatsappInput = String(req.body?.whatsappNumber || '').trim();
    const description = String(req.body?.description || '').trim();
    const address = String(req.body?.address || '').trim();

    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      return res.status(400).json({ error: `Store name must be ${NAME_MIN}-${NAME_MAX} characters.` });
    }
    if (publicEmail && (publicEmail.length > 254 || !isEmailAddress(publicEmail))) {
      return res.status(400).json({ error: 'Enter a valid public email address.' });
    }
    if (description.length > PROFILE_DESCRIPTION_MAX) {
      return res.status(400).json({ error: `Store description must be ${PROFILE_DESCRIPTION_MAX} characters or fewer.` });
    }
    if (address.length > PROFILE_ADDRESS_MAX) {
      return res.status(400).json({ error: `Business address must be ${PROFILE_ADDRESS_MAX} characters or fewer.` });
    }
    const publicPhone = publicPhoneInput ? normalizeGhPhone(publicPhoneInput) : null;
    const whatsappNumber = whatsappInput ? normalizeGhPhone(whatsappInput) : null;
    if ((publicPhoneInput && !publicPhone) || (whatsappInput && !whatsappNumber)) {
      return res.status(400).json({ error: 'Enter valid Ghanaian public phone and WhatsApp numbers.' });
    }

    const { rows } = await query(
      `UPDATE stores
          SET name = $2,
              public_email = $3,
              public_phone = $4,
              whatsapp_number = $5,
              store_description = $6,
              business_address = $7,
              custom_theme_config = COALESCE(custom_theme_config, '{}'::jsonb) || jsonb_build_object(
                'branding',
                  COALESCE(custom_theme_config->'branding', '{}'::jsonb)
                  || jsonb_build_object('site_title', $2::text),
                'features',
                  COALESCE(custom_theme_config->'features', '{}'::jsonb)
                  || jsonb_build_object('whatsapp_number', COALESCE($5::text, '')),
                'pages_content',
                  COALESCE(custom_theme_config->'pages_content', '{}'::jsonb)
                  || jsonb_build_object(
                    'about_body', $6::text,
                    'contact_email', COALESCE($3::text, ''),
                    'contact_phone', COALESCE($4::text, ''),
                    'contact_address', $7::text
                  )
              )
        WHERE id = $1
        RETURNING name, email, phone, phone_verified, public_email, public_phone,
                  whatsapp_number, store_description, business_address, logo_url,
                  subdomain_slug`,
      [req.auth.sub, name, publicEmail || null, publicPhone, whatsappNumber, description, address],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Store not found.' });
    const store = rows[0];
    res.json({
      name: store.name,
      email: store.email,
      phone: store.phone,
      phoneVerified: store.phone_verified,
      publicEmail: store.public_email || '',
      publicPhone: store.public_phone || '',
      whatsappNumber: store.whatsapp_number || '',
      description: store.store_description || '',
      address: store.business_address || '',
      logoUrl: buildDeliveryUrl(store.logo_url, RENDITIONS.logo),
      logoKey: store.logo_url,
      subdomainSlug: store.subdomain_slug,
    });
  } catch (err) {
    next(err);
  }
});

/* ----------------------- Verify account contact changes -------------------- */
router.post('/profile/contact/request', requireSeller, async (req, res, next) => {
  try {
    const type = String(req.body?.type || '');
    const currentPassword = String(req.body?.currentPassword || '');
    const rawValue = String(req.body?.value || '').trim();
    if (!['email', 'phone'].includes(type) || !currentPassword || !rawValue) {
      return res.status(400).json({ error: 'Contact type, new value, and current password are required.' });
    }

    const { rows } = await query(
      'SELECT email, phone, password_hash FROM stores WHERE id = $1 LIMIT 1',
      [req.auth.sub],
    );
    const store = rows[0];
    if (!store) return res.status(404).json({ error: 'Store not found.' });
    if (!(await bcrypt.compare(currentPassword, store.password_hash))) {
      return res.status(403).json({ error: 'Your current password is incorrect.' });
    }

    let value;
    if (type === 'email') {
      value = rawValue.toLowerCase();
      if (value.length > 254 || !isEmailAddress(value)) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
      }
      if (value === String(store.email).toLowerCase()) {
        return res.status(400).json({ error: 'That is already the account email.' });
      }
      const duplicate = await query(
        'SELECT 1 FROM stores WHERE LOWER(email) = $1 AND id <> $2 LIMIT 1',
        [value, req.auth.sub],
      );
      if (duplicate.rows.length) return res.status(409).json({ error: 'That email is already in use.' });
    } else {
      value = normalizeGhPhone(rawValue);
      if (!value) return res.status(400).json({ error: 'Enter a valid Ghanaian phone number.' });
      if (value === store.phone) return res.status(400).json({ error: 'That is already the account phone.' });
      const duplicate = await query(
        'SELECT 1 FROM stores WHERE phone = $1 AND id <> $2 LIMIT 1',
        [value, req.auth.sub],
      );
      if (duplicate.rows.length) return res.status(409).json({ error: 'That phone number is already in use.' });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = hashCode(code);
    await query(
      `UPDATE stores
          SET pending_contact_type = $2,
              pending_contact_value = $3,
              pending_contact_code_hash = $4,
              pending_contact_expires_at = NOW() + ($5 || ' minutes')::interval,
              pending_contact_attempts = 0
        WHERE id = $1`,
      [req.auth.sub, type, value, codeHash, String(CONTACT_OTP_TTL_MINUTES)],
    );

    const delivery = type === 'email'
      ? await sendEmail({
        to: value,
        subject: 'Confirm your DiDwa account email',
        text: `Your DiDwa confirmation code is ${code}. It expires in ${CONTACT_OTP_TTL_MINUTES} minutes. Do not share it with anyone.`,
      })
      : await sendOtpSms(value, code);
    const delivered = type === 'email' ? delivery.sent : delivery.ok && !delivery.dryRun;
    if (!delivered) {
      await query(
        `UPDATE stores
            SET pending_contact_type = NULL, pending_contact_value = NULL,
                pending_contact_code_hash = NULL, pending_contact_expires_at = NULL,
                pending_contact_attempts = 0
          WHERE id = $1 AND pending_contact_code_hash = $2`,
        [req.auth.sub, codeHash],
      );
      return res.status(503).json({ error: `Could not send the verification code to the new ${type}. Please try again.` });
    }
    res.json({ success: true, type, message: `A verification code was sent to the new ${type}.` });
  } catch (err) {
    next(err);
  }
});

router.post('/profile/contact/verify', requireSeller, async (req, res, next) => {
  try {
    const type = String(req.body?.type || '');
    const code = String(req.body?.code || '').trim();
    if (!['email', 'phone'].includes(type) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Enter the six-digit verification code.' });
    }

    const result = await withTransaction(async (tx) => {
      const pending = await tx.query(
        `SELECT pending_contact_type, pending_contact_value, pending_contact_code_hash,
                pending_contact_expires_at, pending_contact_attempts
           FROM stores
          WHERE id = $1
          FOR UPDATE`,
        [req.auth.sub],
      );
      const store = pending.rows[0];
      if (!store || store.pending_contact_type !== type || !store.pending_contact_code_hash
          || !store.pending_contact_expires_at
          || new Date(store.pending_contact_expires_at).getTime() <= Date.now()) {
        return { status: 400, error: 'That verification code is invalid or expired. Request a new code.' };
      }
      if (Number(store.pending_contact_attempts) >= CONTACT_OTP_MAX_ATTEMPTS) {
        return { status: 429, error: 'Too many incorrect codes. Request a new verification code.' };
      }
      if (!contactOtpMatches(code, store.pending_contact_code_hash)) {
        const attempts = Number(store.pending_contact_attempts) + 1;
        await tx.query(
          `UPDATE stores
              SET pending_contact_attempts = $2,
                  pending_contact_type = CASE WHEN $2 >= $3 THEN NULL ELSE pending_contact_type END,
                  pending_contact_value = CASE WHEN $2 >= $3 THEN NULL ELSE pending_contact_value END,
                  pending_contact_code_hash = CASE WHEN $2 >= $3 THEN NULL ELSE pending_contact_code_hash END,
                  pending_contact_expires_at = CASE WHEN $2 >= $3 THEN NULL ELSE pending_contact_expires_at END
            WHERE id = $1`,
          [req.auth.sub, attempts, CONTACT_OTP_MAX_ATTEMPTS],
        );
        return {
          status: attempts >= CONTACT_OTP_MAX_ATTEMPTS ? 429 : 400,
          error: attempts >= CONTACT_OTP_MAX_ATTEMPTS
            ? 'Too many incorrect codes. Request a new verification code.'
            : 'That verification code is incorrect.',
        };
      }

      if (type === 'email') {
        const duplicate = await tx.query(
          'SELECT 1 FROM stores WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1',
          [store.pending_contact_value, req.auth.sub],
        );
        if (duplicate.rows.length) {
          return { status: 409, error: 'That email is already in use. Request a code for a different address.' };
        }
      } else {
        await tx.query('SELECT pg_advisory_xact_lock(hashtext($1), 0)', [store.pending_contact_value]);
        const duplicate = await tx.query(
          'SELECT 1 FROM stores WHERE phone = $1 AND id <> $2 LIMIT 1',
          [store.pending_contact_value, req.auth.sub],
        );
        if (duplicate.rows.length) {
          return { status: 409, error: 'That phone number is already in use. Request a code for a different number.' };
        }
      }

      const updated = await tx.query(
        `UPDATE stores
            SET email = CASE WHEN $2 = 'email' THEN pending_contact_value ELSE email END,
                phone = CASE WHEN $2 = 'phone' THEN pending_contact_value ELSE phone END,
                phone_verified = CASE WHEN $2 = 'phone' THEN TRUE ELSE phone_verified END,
                pending_contact_type = NULL,
                pending_contact_value = NULL,
                pending_contact_code_hash = NULL,
                pending_contact_expires_at = NULL,
                pending_contact_attempts = 0
          WHERE id = $1
          RETURNING email, phone, phone_verified`,
        [req.auth.sub, type],
      );
      return { status: 200, contact: updated.rows[0] };
    });
    if (result.status !== 200) return res.status(result.status).json({ error: result.error });
    res.json({
      success: true,
      email: result.contact.email,
      phone: result.contact.phone,
      phoneVerified: result.contact.phone_verified,
    });
  } catch (err) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'That email is already in use. Request a code for a different address.' });
    }
    next(err);
  }
});

/* ----------------------------- Change password ------------------------------ */
// Requires the CURRENT password: a leaked session token alone must not be enough
// to take over the account. Rejects a too-short new password before hashing.
router.patch('/password', requireSeller, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const { rows } = await query('SELECT password_hash FROM stores WHERE id = $1', [req.auth.sub]);
    const store = rows[0];
    if (!store) return res.status(404).json({ error: 'Store not found.' });

    const ok = await bcrypt.compare(String(currentPassword), store.password_hash);
    if (!ok) {
      return res.status(403).json({ error: 'Your current password is incorrect.' });
    }

    await query('UPDATE stores SET password_hash = $2 WHERE id = $1', [
      req.auth.sub,
      await hashPassword(newPassword),
    ]);

    // Housekeeping: a password change should retire any outstanding reset links.
    await query('UPDATE store_password_resets SET used_at = NOW() WHERE store_id = $1 AND used_at IS NULL', [
      req.auth.sub,
    ]);

    res.json({ success: true, message: 'Your password has been updated.' });
  } catch (err) {
    next(err);
  }
});

/* --------------------------- Forgot password (public) ----------------------- */
// No auth: the seller is locked out, that is the whole point. Always returns the
// same generic success whether or not the email exists, so this endpoint cannot
// be used to enumerate which addresses have accounts.
router.post('/password/forgot', async (req, res, next) => {
  const GENERIC = { success: true, message: 'If an account exists for that email, a reset link is on its way.' };
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Enter your account email.' });

    const { rows } = await query('SELECT id, name, email FROM stores WHERE LOWER(email) = $1 LIMIT 1', [email]);
    const store = rows[0];
    if (!store) return res.json(GENERIC); // do not reveal whether the email exists

    // Raw token goes in the email; only its SHA-256 hash is stored.
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

    await query(
      `INSERT INTO store_password_resets (store_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [store.id, tokenHash, expiresAt],
    );

    const link = `${platformUrl()}/reset-password?token=${token}`;
    const mail = passwordResetTemplate({ store, link, minutes: RESET_TTL_MINUTES });
    await sendEmail({
      to: store.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    // Security push mirrors the reset email (anything that emails the merchant
    // also pushes): the seller hears about a reset attempt even away from the
    // inbox. Store-scoped via store.id; no token or link in the payload.
    sendMerchantPushNotification({
      storeId: store.id,
      title: 'Password reset requested',
      body: 'A password reset was requested for your store account. If this was not you, change your password now.',
      data: { type: 'security' },
    }).catch(() => {});

    res.json(GENERIC);
  } catch (err) {
    next(err);
  }
});

/* ----------------------------- Reset password (public) ---------------------- */
// Redeems a forgot-password token. The token is looked up by its hash; a token
// that is unknown, expired or already used is rejected. Consumed atomically so
// two parallel requests cannot both redeem the same link.
router.post('/password/reset', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    if (!token) return res.status(400).json({ error: 'This reset link is invalid. Request a new one.' });
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, store_id FROM store_password_resets
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
        FOR UPDATE`,
      [tokenHash],
    );
    const reset = rows[0];
    if (!reset) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Request a new one.' });
    }

    await client.query('UPDATE stores SET password_hash = $2 WHERE id = $1', [
      reset.store_id,
      await hashPassword(newPassword),
    ]);
    // Consume this token, and retire any other outstanding ones for the store.
    await client.query(
      `UPDATE store_password_resets
          SET used_at = NOW()
        WHERE (id = $1 OR store_id = $2) AND used_at IS NULL`,
      [reset.id, reset.store_id],
    );
    await client.query('COMMIT');
    client.release();

    res.json({ success: true, message: 'Your password has been reset. You can now sign in.' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* noop */ }
    try { client.release(); } catch { /* noop */ }
    next(err);
  }
});

/* ------------------------------- Delete account ----------------------------- */
// HARD delete. This is irreversible: every child table cascades (orders,
// subscription_payments, products, product_variants, customers, order_items,
// store_domains, custom_theme_config, store_password_resets, store_sms_* ...),
// so all of the store's money and sales history is destroyed and cannot be
// recovered. Guarded twice - the seller must type their exact store slug AND
// re-enter their password - so a stray click or a stolen token cannot nuke a
// live store. After this the slug and email are free for a new registration.
router.delete('/account', requireSeller, async (req, res, next) => {
  try {
    const { confirmSlug, password } = req.body || {};
    if (!confirmSlug || !password) {
      return res.status(400).json({ error: 'Type your store address and current password to confirm deletion.' });
    }

    const { rows } = await query(
      'SELECT id, name, subdomain_slug, password_hash FROM stores WHERE id = $1',
      [req.auth.sub],
    );
    const store = rows[0];
    if (!store) return res.status(404).json({ error: 'Store not found.' });

    // The confirmation must match the store's exact slug (case-insensitive).
    if (String(confirmSlug).trim().toLowerCase() !== String(store.subdomain_slug).toLowerCase()) {
      return res.status(400).json({ error: 'The store address you typed does not match this account.' });
    }

    const ok = await bcrypt.compare(String(password), store.password_hash);
    if (!ok) {
      return res.status(403).json({ error: 'Your current password is incorrect.' });
    }

    // Cascade delete. store_password_resets has ON DELETE CASCADE; the 2FA secret
    // and all tenant data live on columns/child rows of stores, so they go too.
    const del = await query('DELETE FROM stores WHERE id = $1', [req.auth.sub]);
    if (!del.rowCount) return res.status(404).json({ error: 'Store not found.' });

    res.json({ success: true, message: `"${store.name}" has been permanently deleted.` });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ 2FA: setup ---------------------------------- */
// Generates a fresh TOTP secret, stores it ENCRYPTED (still disabled), and returns
// the otpauth URI + a QR data URL for the authenticator app. Nothing is enabled
// until /2fa/enable confirms a live code from that app.
router.post('/2fa/setup', requireSeller, async (req, res, next) => {
  try {
    if (!encryptionConfigured()) {
      return res.status(503).json({
        error: 'Two-factor setup is unavailable right now (server key storage is not configured). Please contact support.',
      });
    }
    const { rows } = await query('SELECT email, totp_enabled FROM stores WHERE id = $1', [req.auth.sub]);
    const store = rows[0];
    if (!store) return res.status(404).json({ error: 'Store not found.' });
    if (store.totp_enabled) {
      return res.status(400).json({ error: 'Two-factor is already enabled. Disable it first to set up a new device.' });
    }

    const secret = generateSecret();
    const sealed = encryptSecret(secret);
    // Persist now so a page refresh between setup and enable does not lose the
    // secret; it stays inert because totp_enabled is still false.
    await query('UPDATE stores SET totp_secret = $2 WHERE id = $1', [req.auth.sub, sealed]);

    const uri = otpauthUri(secret, store.email);
    const qr = await qrDataUrl(uri);
    res.json({ success: true, secret, otpauthUri: uri, qrDataUrl: qr });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ 2FA: enable --------------------------------- */
// Confirms a code from the authenticator app, proving the seller scanned the QR
// and the server clock agrees, before switching 2FA on.
router.post('/2fa/enable', requireSeller, async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').trim();
    if (!code) return res.status(400).json({ error: 'Enter the 6-digit code from your authenticator app.' });

    const { rows } = await query('SELECT totp_secret, totp_enabled FROM stores WHERE id = $1', [req.auth.sub]);
    const store = rows[0];
    if (!store) return res.status(404).json({ error: 'Store not found.' });
    if (store.totp_enabled) return res.json({ success: true, enabled: true, message: 'Two-factor is already enabled.' });
    if (!store.totp_secret) return res.status(400).json({ error: 'Start two-factor setup first.' });

    const secret = decryptSecret(store.totp_secret);
    if (!verifyTotp(secret, code)) {
      return res.status(400).json({ error: 'That code is not correct. Check your app and try again.' });
    }

    await query('UPDATE stores SET totp_enabled = true WHERE id = $1', [req.auth.sub]);
    res.json({ success: true, enabled: true, message: 'Two-factor authentication is now on.' });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ 2FA: disable -------------------------------- */
// Turning 2FA off also requires a live code, so a stolen session alone cannot
// silently weaken the account's security.
router.post('/2fa/disable', requireSeller, async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').trim();
    if (!code) return res.status(400).json({ error: 'Enter the 6-digit code from your authenticator app.' });

    const { rows } = await query('SELECT totp_secret, totp_enabled FROM stores WHERE id = $1', [req.auth.sub]);
    const store = rows[0];
    if (!store) return res.status(404).json({ error: 'Store not found.' });
    if (!store.totp_enabled) return res.json({ success: true, enabled: false, message: 'Two-factor is already off.' });

    const secret = store.totp_secret ? decryptSecret(store.totp_secret) : null;
    if (!secret || !verifyTotp(secret, code)) {
      return res.status(400).json({ error: 'That code is not correct. Check your app and try again.' });
    }

    await query('UPDATE stores SET totp_secret = NULL, totp_enabled = false WHERE id = $1', [req.auth.sub]);
    res.json({ success: true, enabled: false, message: 'Two-factor authentication has been turned off.' });
  } catch (err) {
    next(err);
  }
});

/* --------------------------- 2FA: current status ---------------------------- */
// Read-only so the settings page can show whether 2FA is on without exposing the
// secret. Never returns totp_secret.
router.get('/2fa/status', requireSeller, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT totp_enabled FROM stores WHERE id = $1', [req.auth.sub]);
    res.json({ enabled: Boolean(rows[0]?.totp_enabled) });
  } catch (err) {
    next(err);
  }
});

export default router;
