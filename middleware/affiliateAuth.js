// middleware/affiliateAuth.js
// DiDwa - Affiliate Authentication Middleware
//
// Reads the didwa_ref cookie, looks up the affiliate, and attaches
// req.affiliate if found. Used on protected affiliate web routes.
//
// Usage in routes/affiliateRoutes.js:
//   import affiliateCookieMiddleware from '../middleware/affiliateAuth.js';
//   app.use(affiliateCookieMiddleware);

import { findByReferralCode } from '../models/affiliate.js';

/**
 * Express middleware that:
 * 1. Reads the `didwa_ref` cookie from the request
 * 2. Looks up the affiliate by referral code
 * 3. Attaches the affiliate object to `req.affiliate`
 */
export default async function affiliateCookieMiddleware(req, res, next) {
  const refCode = req.cookies?.didwa_ref || req.headers?.cookie?.split('didwa_ref=')[1]?.split(';')[0] || req.query?.ref;

  if (refCode) {
    try {
      const affiliate = await findByReferralCode(refCode);
      if (affiliate) {
        req.affiliate = affiliate;
      }
    } catch (err) {
      // Silently ignore lookup errors - routes handle req.affiliate === undefined
      console.warn('[affiliateAuth] Cookie lookup error:', err.message);
    }
  }

  next();
}
