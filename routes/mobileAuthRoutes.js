/**
 * DiDwa - Mobile App Authentication (/api/mobile/auth)
 *
 * The seller mobile app cannot rely on the storefront's host-header routing, so
 * it signs in here and gets a short-lived mobile access token plus a rotating
 * refresh token. Credentials are the same merchant account the PWA uses
 * (stores.password_hash), and 2FA is honoured identically to the web login:
 * when TOTP is on, the password step returns a challenge instead of a session.
 *
 * Refresh tokens are opaque random strings, stored SHA-256 hashed (a DB read
 * cannot be replayed as a session), single-use and rotated on every refresh, so
 * a stolen refresh token is short-lived and detectable.
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import {
  MOBILE_ACCESS_TTL,
  MOBILE_REFRESH_TTL,
  issueMobileAccessToken,
  mobileRefreshExpiry,
  issueTwoFactorChallenge,
  verifyTwoFactorChallenge,
} from '../middleware/authMiddleware.js';
import { decryptSecret } from '../services/secretBox.js';
import { verifyTotp } from '../services/totpService.js';

const router = Router();

/* ----------------------------- refresh token helpers ----------------------- */

const newRefreshToken = () => crypto.randomBytes(48).toString('hex');
const hashToken = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');

async function persistRefreshToken(storeId, raw) {
  await query(
    'INSERT INTO mobile_refresh_tokens (store_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [storeId, hashToken(raw), mobileRefreshExpiry()],
  );
}

/** The shared success body + refresh-token issuance for both login paths. */
async function issueMobileSession(res, store) {
  const refreshToken = newRefreshToken();
  await persistRefreshToken(store.id, refreshToken);
  return res.json({
    token: issueMobileAccessToken(store),
    refreshToken,
    expiresIn: MOBILE_ACCESS_TTL,
    refreshExpiresIn: MOBILE_REFRESH_TTL,
    user: { userId: store.id, storeId: store.id, role: 'SELLER' },
    store: {
      id: store.id,
      name: store.name,
      email: store.email,
      subdomainSlug: store.subdomain_slug,
      status: store.status,
      plan: store.plan,
      currency: store.currency,
    },
  });
}

const SELECT_AUTH =
  `SELECT id, name, owner_name, email, phone, subdomain_slug, status, plan, currency,
          password_hash, totp_enabled, totp_secret
     FROM stores`;

/* --------------------------------- Login ---------------------------------- */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { rows } = await query(`${SELECT_AUTH} WHERE LOWER(email) = $1 LIMIT 1`, [
      String(email).trim().toLowerCase(),
    ]);
    const store = rows[0];
    if (!store) return res.status(401).json({ error: 'Invalid email or password.' });

    const ok = await bcrypt.compare(String(password), store.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

    delete store.password_hash;
    const twoFactorEnabled = Boolean(store.totp_enabled) && Boolean(store.totp_secret);

    // Same 2FA gate as the web login: a correct password is not enough when TOTP
    // is on. Return the challenge; the app completes /login/2fa with a code.
    if (twoFactorEnabled) {
      return res.json({ twoFactorRequired: true, challenge: issueTwoFactorChallenge(store) });
    }

    await query('UPDATE stores SET last_login_at = NOW() WHERE id = $1', [store.id]);
    return issueMobileSession(res, store);
  } catch (err) {
    next(err);
  }
});

/* ------------------------- Login: two-factor step -------------------------- */
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

    const { rows } = await query(`${SELECT_AUTH} WHERE id = $1 LIMIT 1`, [payload.sub]);
    const store = rows[0];
    if (!store || !store.totp_enabled || !store.totp_secret) {
      return res.status(401).json({ error: 'Two-factor is no longer active on this account.' });
    }

    const secret = decryptSecret(store.totp_secret);
    if (!secret || !verifyTotp(secret, String(code))) {
      return res.status(401).json({ error: 'That code is not correct. Try the next code from your app.' });
    }

    delete store.password_hash;
    delete store.totp_secret;
    await query('UPDATE stores SET last_login_at = NOW() WHERE id = $1', [store.id]);
    return issueMobileSession(res, store);
  } catch (err) {
    next(err);
  }
});

/* -------------------------------- Refresh --------------------------------- */
// Exchange a valid refresh token for a NEW access token + a rotated refresh
// token. The presented token is revoked in the same step, so each refresh token
// is single-use: replaying an old one fails (revoked_at is set).
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'A refresh token is required.' });

    const { rows } = await query(
      `SELECT id, store_id, expires_at FROM mobile_refresh_tokens
        WHERE token_hash = $1 AND revoked_at IS NULL LIMIT 1`,
      [hashToken(refreshToken)],
    );
    const row = rows[0];
    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    const { rows: stores } = await query(
      'SELECT id, name, email, subdomain_slug, status, plan, currency FROM stores WHERE id = $1 LIMIT 1',
      [row.store_id],
    );
    const store = stores[0];
    if (!store) return res.status(401).json({ error: 'Account no longer exists.' });

    // Rotate: revoke the presented token, mint and store a fresh one.
    await query('UPDATE mobile_refresh_tokens SET revoked_at = NOW() WHERE id = $1', [row.id]);
    const rotated = newRefreshToken();
    await persistRefreshToken(store.id, rotated);

    return res.json({
      token: issueMobileAccessToken(store),
      refreshToken: rotated,
      expiresIn: MOBILE_ACCESS_TTL,
    });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------- Logout ---------------------------------- */
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      await query(
        'UPDATE mobile_refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL',
        [hashToken(refreshToken)],
      ).catch(() => {});
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

