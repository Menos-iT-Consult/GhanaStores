/**
 * DiDwa - JWT Authentication Middleware
 * Issues and verifies tokens for SELLER (store owner) and ADMIN (platform)
 * roles, and enforces tenant scoping + store status guards.
 */
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

const TOKEN_TTL = '7d';
const DEV_SECRET = 'didwa-dev-secret';

/**
 * Resolve the signing secret once.
 *
 * Production MUST provide JWT_SECRET: a shipped default would let anyone forge
 * seller/admin tokens, so boot fails loudly instead of degrading silently.
 * Local development keeps the documented dev secret with a warning.
 */
const JWT_SECRET = (() => {
  const fromEnv = (process.env.JWT_SECRET || '').trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET is required when NODE_ENV=production. Set it in the environment before starting DiDwa.',
    );
  }
  console.warn('[auth] JWT_SECRET is not set - signing with the development secret. Never deploy like this.');
  return DEV_SECRET;
})();

/* ---------------------------------- Issue ---------------------------------- */

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function issueStoreToken(store) {
  return signToken({
    sub: store.id,
    role: 'SELLER',
    email: store.email,
    slug: store.subdomain_slug,
    name: store.name,
  });
}

export function issueAffiliateToken(affiliate) {
  return signToken({
    sub: affiliate.id,
    role: 'AFFILIATE',
    email: affiliate.email,
  });
}

export function issueAdminToken(admin) {
  return signToken({
    sub: admin.id,
    role: 'ADMIN',
    email: admin.email,
    name: admin.name,
  });
}

/* ------------------------- Two-factor login challenge ------------------------ */

/*
 * When a seller has 2FA on, the password check passes but we must NOT hand back a
 * real session yet - a stolen password alone is not enough. Instead the login
 * route returns a short-lived "challenge" token that only proves "password was
 * correct for this store". The follow-up /login/2fa call verifies the TOTP code
 * and, only then, issues the full session token.
 *
 * The challenge is a JWT so it is signed and tamper-proof, carries the store id
 * as its subject, and is typed (purpose: '2fa') plus given a brief TTL so a leaked
 * challenge cannot be reused as a session or replayed later.
 */
export function issueTwoFactorChallenge(store) {
  return jwt.sign(
    { sub: store.id, purpose: '2fa', role: 'SELLER' },
    JWT_SECRET,
    { expiresIn: '5m' },
  );
}

/** Verify a 2FA challenge token; returns its payload or null when invalid. */
export function verifyTwoFactorChallenge(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.purpose !== '2fa' || payload?.role !== 'SELLER') return null;
    return payload;
  } catch {
    return null;
  }
}

/* ----------------------------- Mobile app tokens --------------------------- */

/*
 * The DiDwa Seller mobile app authenticates with its own access token rather
 * than the storefront's host-header session. It is the SAME seller identity
 * (role SELLER, sub = store id, so it is interchangeable with requireSeller),
 * but it also carries the mobile contract's { userId, storeId, role } explicitly
 * and is tagged typ='mobile-access'. That tag lets authenticateMobileToken reject
 * a refresh token or a 2FA challenge being replayed as an API session.
 */
export const MOBILE_ACCESS_TTL = '30d';
export const MOBILE_REFRESH_TTL = '90d';

export function issueMobileAccessToken(store) {
  return jwt.sign(
    {
      sub: store.id,
      userId: store.id,
      storeId: store.id,
      role: 'SELLER',
      typ: 'mobile-access',
    },
    JWT_SECRET,
    { expiresIn: MOBILE_ACCESS_TTL },
  );
}

/**
 * Expiry for a freshly minted mobile refresh token. Refresh tokens are opaque
 * random strings (NOT JWTs) stored hashed by routes/mobileAuthRoutes.js; this
 * keeps the TTL in one place beside the token issuer.
 */
export function mobileRefreshExpiry() {
  return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
}

/* ------------------------------ Verify & guard ----------------------------- */

/**
 * Tokens are read from the Authorization header ONLY. A `?token=` query
 * parameter was previously accepted, which leaked credentials into access
 * logs, browser history and Referer headers. Public receipt links use their
 * own HMAC share token instead (see routes/whatsappInvoiceRoutes.js).
 */
function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/** Hard requirement: valid JWT attached to the request. */
export function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // A 2FA challenge (purpose '2fa') is proof of password, not a session:
    // it must never pass a general auth check nor load a store.
    if (payload?.purpose === '2fa') {
      return res.status(401).json({ error: 'Two-factor verification required.' });
    }
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
}

/**
 * Attaches a seller identity when one is present, but never rejects the request.
 *
 * Public pages that personalise - the pricing page marks the plan the signed-in
 * seller is already on - must stay open to visitors who are not signed in. A
 * missing, malformed or expired token simply leaves req.auth unset; the same is
 * true of an ADMIN token, which is not a seller.
 */
export function optionalSeller(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload?.role === 'SELLER') req.auth = payload;
    } catch { /* anonymous - the public page still renders */ }
  }
  return next();
}

/**
 * Platform administrator only.
 *
 * The token's ADMIN role is not enough on its own: the subject must also exist
 * in `platform_admins`, so a leaked long-lived admin token can be revoked by
 * deleting (or rotating) the row and a hand-made token with role=ADMIN is
 * useless. Admins are created with `npm run admin:create` and sign in through
 * POST /api/admin/login.
 */
export async function requireAdmin(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
  if (payload?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Platform administrator access required.' });
  }
  try {
    const { rows } = await query('SELECT id FROM platform_admins WHERE id = $1 LIMIT 1', [payload.sub]);
    if (!rows[0]) {
      return res.status(403).json({ error: 'This administrator account no longer has access.' });
    }
    req.auth = payload;
    return next();
  } catch (err) {
    return next(err);
  }
}


/**
 * Seller routes: loads the authenticated store onto req.store so downstream
 * handlers never have to trust client-supplied store_id values.
 */
export async function loadSellerStore(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT id, name, email, phone, owner_name, subdomain_slug, custom_domain,
              status, plan, trial_ends_at, grace_ends_at, whatsapp_number, momo_number,
              currency,
              loyalty_points_per_ghs, loyalty_point_value, created_at
         FROM stores WHERE id = $1 LIMIT 1`,
      [req.auth.sub],
    );
    if (!rows[0]) return res.status(401).json({ error: 'Store account not found.' });
    req.store = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

/** requireAuth + loadSellerStore combined for seller API mounts. */
export function requireSeller(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    loadSellerStore(req, res, next);
  });
}

/**
 * Mobile API auth (DiDwa Seller iOS/Android app).
 *
 * Same trust model as requireSeller - a Bearer JWT, role SELLER, and the store
 * loaded from the token's subject so a client can never supply a store id - but
 * it publishes the names the mobile routes speak: `req.user` ({ userId, storeId,
 * role, email }) and `req.storeId`. It refuses any non-access mobile token (a
 * refresh token or a 2FA challenge) so those can never open an API session.
 */
export async function authenticateMobileToken(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
  if (payload?.role !== 'SELLER') {
    return res.status(403).json({ error: 'Merchant access required.' });
  }
  // Mobile API requires a mobile-access token: a web session, a 2FA challenge,
  // or a refresh token must never open a mobile API session.
  if (payload?.typ !== 'mobile-access' || payload?.purpose === '2fa') {
    return res.status(401).json({ error: 'This token cannot access the API. Please sign in again.' });
  }

  try {
    const { rows } = await query(
      `SELECT id, name, email, phone, subdomain_slug, status, plan, currency
         FROM stores WHERE id = $1 LIMIT 1`,
      [payload.sub],
    );
    const store = rows[0];
    if (!store) return res.status(401).json({ error: 'Store account not found.' });

    req.auth = payload;
    req.store = store;
    req.storeId = store.id;
    req.user = {
      id: payload.userId || store.id,
      storeId: store.id,
      role: 'SELLER',
      email: store.email,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Blocking gate for billing-sensitive actions (payouts, POS sales).
 * SUSPENDED stores are hard-blocked; PAST_DUE stores get a warning header
 * but remain operable during their grace period.
 */
export function requireOperationalStore(req, res, next) {
  if (!req.store) return res.status(500).json({ error: 'Store not loaded.' });
  if (req.store.status === 'SUSPENDED') {
    return res.status(403).json({
      error: 'Your store is suspended due to an expired subscription.',
      code: 'STORE_SUSPENDED',
      status: req.store.status,
    });
  }
  if (req.store.status === 'PAST_DUE') {
    res.setHeader('X-Billing-Status', 'PAST_DUE');
    res.setHeader('X-Warning', 'Subscription past due - settle before the grace period ends.');
  }
  next();
}

/** Convenience wrapper: seller auth + operational gate in one line. */
export function requireActiveSeller(req, res, next) {
  requireSeller(req, res, (err) => {
    if (err) return next(err);
    requireOperationalStore(req, res, next);
  });
}

export default {
  signToken,
  issueStoreToken,
  issueAdminToken,
  issueMobileAccessToken,
  requireAuth,
  requireAdmin,
  requireSeller,
  authenticateMobileToken,
  requireActiveSeller,
};
