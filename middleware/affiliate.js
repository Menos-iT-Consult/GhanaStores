// middleware/affiliate.js
// DiDwa - Affiliate Program Middleware (Express)
//
// Responsibilities:
// Intercept ?ref=CODE query params and set a configured-duration didwa_ref cookie.
//
// Usage in server.js:
//   const affiliateMiddleware = require('./middleware/affiliate');
//   app.use(affiliateMiddleware);

import cookie from 'cookie';
import { getAffiliateProgramSettings } from '../services/affiliateProgramSettings.js';

const MAIN_HOST = 'didwaghana.com';

/**
 * Express middleware for affiliate subdomain routing and referral cookie tracking.
 */
export default async function affiliateMiddleware(req, res, next) {
  const host = req.get('host') || '';
  const hostname = host.split(':')[0]; // strip port

  // -----------------------------------------------------------
  // Referral cookie: ?ref=CODE on didwaghana.com -> set didwa_ref cookie
  // -----------------------------------------------------------
  const isMainHost = hostname === MAIN_HOST || hostname.endsWith('.' + MAIN_HOST);
  const refCode = req.query && req.query.ref;

  if (isMainHost && refCode && typeof refCode === 'string' && refCode.length > 0) {
    // Validate UUID format (optional but recommended since codes are UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(refCode)) {
      let programSettings;
      try {
        programSettings = await getAffiliateProgramSettings();
      } catch (err) {
        return next(err);
      }
      // Set the cookie on the response. We attach it via res.cookie if using
      // express, or manually via Set-Cookie header. Here we use a manual header
      // to avoid assuming express cookie-parser is installed.
      res.setHeader(
        'Set-Cookie',
        cookie.serialize('didwa_ref', refCode, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: programSettings.attributionDays * 24 * 60 * 60,
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
