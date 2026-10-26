// middleware/affiliate.js
// DiDwa - Affiliate Program Middleware (Express)
//
// Responsibilities:
// 1. Rewrite requests from affiliate.didwaghana.com to internal /affiliate-portal routes
// 2. Intercept ?ref=CODE query params on didwaghana.com and set a 30-day didwa_ref cookie
//
// Usage in server.js:
//   const affiliateMiddleware = require('./middleware/affiliate');
//   app.use(affiliateMiddleware);

import cookie from 'cookie';

// Affiliate subdomain host
const AFFILIATE_HOST = 'affiliate.didwaghana.com';
const MAIN_HOST = 'didwaghana.com';

// 30 days in seconds
const REF_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * Express middleware for affiliate subdomain routing and referral cookie tracking.
 */
export default function affiliateMiddleware(req, res, next) {
  const host = req.get('host') || '';
  const hostname = host.split(':')[0]; // strip port

  // -----------------------------------------------------------
  // 1. Subdomain rewrite: affiliate.didwaghana.com -> /affiliate-portal
  // -----------------------------------------------------------
  if (hostname === AFFILIATE_HOST) {
    // Rewrite the URL so Express route matching sees /affiliate-portal/...
    req.url = '/affiliate-portal' + req.url;
    // Optional: set a flag so downstream code knows this is an affiliate portal request
    req.isAffiliatePortal = true;
  }

  // -----------------------------------------------------------
  // 2. Referral cookie: ?ref=CODE on didwaghana.com -> set didwa_ref cookie (30 days)
  // -----------------------------------------------------------
  const isMainHost = hostname === MAIN_HOST || hostname.endsWith('.' + MAIN_HOST);
  const refCode = req.query && req.query.ref;

  if (isMainHost && refCode && typeof refCode === 'string' && refCode.length > 0) {
    // Validate UUID format (optional but recommended since codes are UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(refCode)) {
      // Set the cookie on the response. We attach it via res.cookie if using
      // express, or manually via Set-Cookie header. Here we use a manual header
      // to avoid assuming express cookie-parser is installed.
      res.setHeader(
        'Set-Cookie',
        cookie.serialize('didwa_ref', refCode, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: REF_COOKIE_MAX_AGE,
          path: '/',
          domain: hostname.includes('.') ? `.${MAIN_HOST}` : undefined
        })
      );
      // Remove ref from query so it doesn't leak into downstream logs/analytics
      delete req.query.ref;
      if (req.url.includes('?ref=')) {
        req.url = req.url.replace(/[?&]ref=[^&]*/, '').replace(/(\?|&)$/, '');
      }
    }
  }

  next();
}
