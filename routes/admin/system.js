/**
 * DiDwa - Super admin system health.
 *
 * Reports whether the platform's moving parts are actually configured. It
 * reports PRESENCE of a secret, never its value: an admin screen is not a place
 * to print credentials, and this response is written to browser history.
 */
import { Router } from 'express';
import os from 'node:os';
import { query, pingDb, getSchemaState } from '../../config/database.js';
import { requireAdmin } from './helpers.js';

const router = Router();

/**
 * Capability -> the env vars that must ALL be present for it to work.
 *
 * These keys used to be invented (SMS_API_KEY, HUBTEL_API_KEY,
 * MTN_MOMO_CLIENT_KEY, WHATSAPP_TOKEN) and matched nothing in the codebase, so
 * a healthy Hubtel or MTN read as `configured: false`. Worse, the SMS row
 * outlived the Arkesel -> mNotify migration and never got renamed.
 *
 * Two rules keep this from rotting again:
 *   1. A capability lists every env var it needs; presence means ALL of them.
 *      A single-key check hid missing disbursement credentials.
 *   2. Only env-backed capabilities belong here. Paystack/Hubtel credentials
 *      are PER STORE and encrypted in payment_settings (see
 *      services/storePayments.js isPaystackReady/isHubtelReady), so there is no
 *      env var to check - only the encryption key that protects them.
 *
 * scripts/adminSqlTest.js asserts every key below actually exists in source,
 * so a rename or removal cannot silently turn a healthy row red again.
 */
const INTEGRATIONS = [
  { keys: ['DATABASE_URL'], label: 'PostgreSQL database' },
  { keys: ['JWT_SECRET'], label: 'Session signing' },
  { keys: ['MTN_MOMO_SUBSCRIPTION_KEY'], label: 'MTN MoMo subscriptions' },
  {
    keys: ['MTN_MOMO_COLLECTION_API_KEY', 'MTN_MOMO_COLLECTION_USER_ID'],
    label: 'MTN MoMo collections',
  },
  {
    keys: ['MTN_MOMO_DISBURSEMENT_API_KEY', 'MTN_MOMO_DISBURSEMENT_USER_ID'],
    label: 'MTN MoMo disbursements',
  },
  { keys: ['CLOUDFLARE_API_TOKEN'], label: 'Cloudflare custom domains' },
  { keys: ['MNOTIFY_API_KEY'], label: 'mNotify transactional SMS' },
  {
    keys: ['PAYMENT_KEYS_ENCRYPTION_SECRET'],
    label: 'Per-store payment keys (Paystack/Hubtel, encrypted at rest)',
  },
];

const configured = ({ keys }) => keys.every((k) => Boolean(String(process.env[k] || '').trim()));

router.get('/system', requireAdmin, async (_req, res, next) => {
  try {
    const dbStarted = Date.now();
    let database = { ok: false, latencyMs: null, error: null };
    try {
      await pingDb();
      database = { ok: true, latencyMs: Date.now() - dbStarted, error: null };
    } catch (err) {
      database = { ok: false, latencyMs: null, error: err.message };
    }

    // The row counts deliberately exclude the retired payouts table: the schema
    // renames it to payouts_retired, so counting it made this whole endpoint
    // 503 with a schema_missing fault. scripts/retiredSchemaTest.js guards that.
    const [counts, growth, auditTrail] = await Promise.all([
      query(`SELECT (SELECT COUNT(*) FROM stores)::int     AS stores,
                    (SELECT COUNT(*) FROM products)::int    AS products,
                    (SELECT COUNT(*) FROM orders)::int      AS orders,
                    (SELECT COUNT(*) FROM customers)::int   AS customers,
                    (SELECT COUNT(*) FROM store_domains)::int AS domains,
                    (SELECT COUNT(*) FROM theme_templates)::int AS themes,
                    (SELECT COUNT(*) FROM platform_admins)::int AS admins,
                    (SELECT COUNT(*) FROM admin_audit_log)::int AS audit_entries,
                    (SELECT MAX(created_at) FROM orders)     AS latest_order_at`),
      query(`SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0) AS collected,
                    COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed
               FROM subscription_payments WHERE initiated_at > NOW() - INTERVAL '30 days'`),
      query('SELECT COUNT(*)::int AS recent FROM admin_audit_log WHERE created_at > NOW() - INTERVAL \'24 hours\''),
    ]);

    res.json({
      database: { ...database, schema: getSchemaState() },
      counts: counts.rows[0],
      payments30d: growth.rows[0],
      audit24h: Number(auditTrail.rows[0]?.recent || 0),
      // Keys, not values: a health endpoint is not a place to print credentials.
      integrations: INTEGRATIONS.map((c) => ({ ...c, configured: configured(c) })),
      runtime: {
        node: process.version,
        platform: process.platform,
        uptimeSeconds: Math.round(os.uptime()),
        memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        environment: process.env.NODE_ENV || 'development',
      },
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
