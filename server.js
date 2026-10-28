/**
 * DIDWA - Root Express Application
 * Multi-tenant e-commerce platform & seller PWA API for Ghana (GHS).
 *
 * Dual-mode boot:
 *   - Direct run (`node server.js` / `npm start`): binds PORT, boots the
 *     in-process node-cron scheduler.
 *   - Imported by the Vercel serverless entry point (api/index.js): exports
 *     the app untouched; Vercel's edge router supplies static hosting and
 *     scheduled invocations replace the local scheduler.
 *
 * Modular mounts:
 *   /api/billing     14-day trial engine, auth, subscription, cron webhook
 *   /api/analytics   Sales KPIs + Recharts series
 *   /api/pos         Offline POS sales, rider COD reconciliation
 *   /api/payouts     Instant Hubtel MoMo disbursements
 *   /api/orders      WhatsApp commerce + PDF receipts
 *   /api/inventory   Multi-variant stock + low-stock SMS
 *   /api/domains     Subdomain / custom-domain routing + SSL hook
 *   /api/admin       Platform administrator login (platform_admins)
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { pingDb, ensureSchema, getSchemaState, isMissingSchemaError } from './config/database.js';
import { resolveTenantStore, platformDomain } from './middleware/domainMiddleware.js';
import { errorHandler, requestContext, apiNotFound, installProcessGuards } from './middleware/errorMiddleware.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import billingRoutes from './routes/billingRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import posRoutes from './routes/posRoutes.js';
import paymentSettingsRoutes from './routes/paymentSettingsRoutes.js';
import smsSettingsRoutes from './routes/smsSettingsRoutes.js';
import smsPacksRoutes from './routes/smsPacksRoutes.js';
import whatsappInvoiceRoutes, { whatsappRouter } from './routes/whatsappInvoiceRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import domainRoutes from './routes/domainRoutes.js';
import { webhookRouter } from './routes/domainRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import billingCronRoute from './routes/billingCronRoute.js';
import themeRoutes from './routes/themeRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import siteSettingsRoutes from './routes/siteSettingsRoutes.js';
import mobileAuthRoutes from './routes/mobileAuthRoutes.js';
import mobileDeviceRoutes from './routes/mobileDeviceRoutes.js';
import mobileRoutes from './routes/mobileRoutes.js';
import publicPlatformSettingsRoutes from './routes/publicPlatformSettingsRoutes.js';
import seoRoutes from './routes/seoRoutes.js';
import { startBillingCron } from './jobs/billingCron.js';
import affiliateApiRoutes from './routes/affiliateApiRoutes.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT || 4000);
const ON_VERCEL = Boolean(process.env.VERCEL);

/* --------------------------------- Core middleware -------------------------- */
app.disable('x-powered-by');
// First in the chain: every request gets an id that ties the log line, the
// response body and anything the user quotes back to support together.
app.use(requestContext);
// Conservative baseline headers without adding another runtime dependency.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https:; frame-ancestors 'self'");
  next();
});
/* Global rate limit: protects every API endpoint used by both the web app and
   the mobile app from abuse (120 requests / minute / client IP). */
const globalLimiter = createRateLimiter({
  name: 'global',
  windowMs: 60_000,
  max: 120,
  message: 'Too many requests. Try again shortly.',
  skip: (req) => !req.path.startsWith('/api/') && req.path !== '/health',
});
app.use(globalLimiter);

/* Stricter guard for authentication endpoints (both web + mobile login). */
const authLimiter = createRateLimiter({
  name: 'authentication',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Try again later.',
});
app.use('/api/billing/login', authLimiter);
app.use('/api/billing/register', authLimiter);
app.use('/api/billing/verify-otp', authLimiter);
app.use('/api/site-settings/password/forgot', authLimiter);
app.use('/api/site-settings/password/reset', authLimiter);
app.use('/api/site-settings/profile/contact/request', authLimiter);
app.use('/api/site-settings/profile/contact/verify', authLimiter);
app.use('/api/mobile/auth/login', authLimiter);
app.use('/api/mobile/auth/refresh', authLimiter);
app.use('/api/affiliate/signup', authLimiter);
app.use('/api/affiliate/login', authLimiter);
app.use('/api/admin/login', authLimiter);
/* retain the raw body for webhook signature verification.
   Paystack signs the EXACT bytes it sent with HMAC-SHA512; a body that has been
   through JSON.parse + JSON.stringify is not byte-identical, so verifying
   against req.body alone would reject every real callback. verify:false then
   populates req.body from the captured buffer. The 2mb cap is unchanged. */
app.use(express.json({ limit: '2mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({
  extended: true,
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
/* CORS. The API uses Bearer tokens (not cookies), so `credentials` stays false.
   `CLIENT_URL` may be a comma-separated list of allowed origins; when it is unset
   we fall back to '*'. In addition we always allow every origin on the platform
   apex itself (apex, www, app, api) so the seller PWA served from
   app.<apex> and any same-apex host work without extra configuration. The apex
   is read from platformDomain() (env-driven), never hard-coded. */
const apex = platformDomain();
const platformOrigins = [
  `https://${apex}`,
  `https://www.${apex}`,
  `https://app.${apex}`,
  `https://api.${apex}`,
];
const configuredOrigins = String(process.env.CLIENT_URL || '')
  .split(',')
  .map((value) => value.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const allowAllOrigins = configuredOrigins.includes('*');
const allowedOrigins = new Set(
  [...configuredOrigins.filter((value) => value !== '*'), ...platformOrigins],
);

app.use(cors({
  origin: (origin, callback) => {
    // No Origin header (curl, server-to-server, native mobile): allow.
    if (!origin) return callback(null, true);
    if (allowAllOrigins) return callback(null, true);
    const normalized = origin.replace(/\/+$/, '');
    if (allowedOrigins.has(normalized)) return callback(null, true);
    return callback(null, false);
  },
  credentials: false,
}));

/* ------------------- Tenant resolution must run FIRST ----------------------- */
// Maps custom domains / subdomains to req.tenantStore (legacy alias
// req.storeFromHost) for public storefront traffic; platform requests pass
// through untouched.
app.use(resolveTenantStore);

/* --------------------------------- API mounts ------------------------------- */
const publicOrderLimiter = createRateLimiter({
  name: 'public-orders',
  windowMs: 60_000,
  max: 15,
  message: 'Too many order attempts. Please wait a moment and try again.',
  skip: (req) => req.method !== 'POST',
});
const publicContactLimiter = createRateLimiter({
  name: 'public-contact',
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Too many contact submissions. Please wait before sending another message.',
  skip: (req) => req.method !== 'POST',
});
const domainSearchLimiter = createRateLimiter({
  name: 'domain-search',
  windowMs: 60_000,
  max: 20,
  message: 'Too many domain searches. Please wait a moment and try again.',
});
const affiliatePayoutLimiter = createRateLimiter({
  name: 'affiliate-payouts',
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many payout requests. Please wait before submitting another request.',
  skip: (req) => req.method !== 'POST',
});

app.use('/api/public/orders', publicOrderLimiter);
app.use('/api/contact', publicContactLimiter);
app.use('/api/storefront', publicContactLimiter);
app.use('/api/domains/search', domainSearchLimiter);
app.use('/api/affiliate/payouts', affiliatePayoutLimiter);

app.get('/health', async (_req, res) => {
  try {
    const now = await pingDb();
    // Apply the schema on demand. This is what makes a fresh database usable
    // without a manual `npm run db:init` step: the first request self-heals.
    // ensureSchema() is idempotent and a no-op once the checksum matches.
    let applied = false;
    try {
      const result = await ensureSchema();
      applied = Boolean(result?.applied);
    } catch (schemaErr) {
      if (isMissingSchemaError(schemaErr)) {
        return res.status(503).json({
          ok: false,
          service: 'didwa-api',
          db: 'connected',
          schema: 'missing',
          hint: 'The database is reachable but the schema could not be applied. Check Vercel logs for the DDL error.',
        });
      }
      throw schemaErr;
    }
    res.json({
      ok: true,
      service: 'didwa-api',
      db: 'connected',
      schema: getSchemaState() === 'failed' ? 'unknown' : 'applied',
      appliedNow: applied,
      at: now.now,
    });
  } catch {
    res.status(503).json({
      ok: false,
      service: 'didwa-api',
      db: 'unreachable',
      hint: 'Set DATABASE_URL in Vercel (use the Neon pooled connection string) and redeploy.',
    });
  }
});

app.use('/api/billing', billingRoutes);
app.use('/api/payment-settings', paymentSettingsRoutes);
app.use('/api/sms-settings', smsSettingsRoutes);
app.use('/api/sms-packs', smsPacksRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/pos', posRoutes);
// Seller payouts were removed with the escrow model: customer money now settles
// directly in the merchant's own gateway account, so there is no platform
// balance to pay out from. See db/schema.sql (payouts_retired).
app.use('/api/orders', whatsappInvoiceRoutes);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/affiliate', affiliateApiRoutes);
app.use('/api', publicPlatformSettingsRoutes);
app.use('/api/cron', billingCronRoute);
// Hubtel payment webhook — must be at /api/webhooks/hubtel (called by Hubtel infra)
app.use('/api/webhooks', webhookRouter);
// Theme catalog + storefront theme management (mounted at /api so that
// /api/themes and /api/store/theme/* resolve as written).
app.use('/api', themeRoutes);
// Order management: public checkout + seller fulfillment console.
app.use('/api', orderRoutes);
app.use('/api', contactRoutes);
// Store Site Settings: rename, change/forgot/reset password, hard delete, 2FA.
app.use('/api/site-settings', siteSettingsRoutes);
// DiDwa Seller mobile app (iOS/Android): Bearer-JWT auth, Expo push device
// tokens, and the versioned merchant API. These authenticate by token rather
// than the storefront's host-header routing, so they work from the app.
app.use('/api/mobile/auth', mobileAuthRoutes);
app.use('/api/mobile/devices', mobileDeviceRoutes);
app.use('/api/mobile/v1', mobileRoutes);

// SEO: sitemap.xml and robots.txt at root level
app.use('/', seoRoutes);

app.use('/api', apiNotFound);

/* ------------------------- Production SPA serving ---------------------------- */
// Self-hosted mode only. On Vercel, static files are served by the edge from
// dist/ and rewrites in vercel.json keep non-API paths away from this function.
if (process.env.NODE_ENV === 'production' && !ON_VERCEL) {
  const dist = path.join(__dirname, 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

/* --------------------------------- Errors ------------------------------------ */
// The inline handler this replaces did `res.status(err.status || 500).json({
// error: err.message })`, which returned raw Postgres and provider text on any
// unhandled fault. All error formatting now lives in one module: this one logs
// the full detail and returns only a safe sentence plus a reference id.
app.use(errorHandler);
installProcessGuards();

/* --------------------------------- Boot -------------------------------------- */
// Only bind a port + start the scheduler when executed directly. Under Vercel
// (or any serverless wrapper importing this module) the platform owns the
// socket, and scheduled jobs arrive via GET /api/billing/cron instead.
const invokedDirectly = Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly && !ON_VERCEL) {
  app.listen(PORT, () => {
    console.log(`DiDwa API listening on port ${PORT}`);
  });

  // Boot-time connectivity check is informational only - the API stays up so
  // health probes work even when Neon is briefly unreachable.
  pingDb()
    .then(() => console.log('[db] Neon PostgreSQL connected.'))
    .catch(() => console.warn(
      '[db] WARNING: database not reachable yet. Apply db/schema.sql via `npm run db:init`.',
    ));

  startBillingCron();
}

// Exported for the Vercel serverless entry point (api/index.js).
export default app;
