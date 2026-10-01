/**
 * DiDwa - Super admin payment oversight (subscription charges + gateway health).
 *
 * Activating a subscription stays in ONE place: POST /api/billing/activate
 * (routes/billingRoutes.js) is the only code path that flips a store to ACTIVE
 * after a charge lands, and it now writes to the audit ledger itself. This
 * router only adds the platform-wide read model, rather than a second
 * implementation of the same state change that could drift.
 */
import { Router } from 'express';
import { query } from '../../config/database.js';
import { requireAdmin, readListQuery, listResponse, paged, enumFilter, uuidParam } from './helpers.js';

const router = Router();

const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED'];
const PROVIDERS = ['MTN', 'HUBTEL', 'PENDING'];

const paymentRow = (row) => ({
  id: row.id,
  storeId: row.store_id,
  storeName: row.store_name,
  planId: row.plan_id,
  amount: row.amount,
  momoNumber: row.momo_number,
  network: row.network,
  provider: row.provider,
  reference: row.reference,
  gatewayReference: row.gateway_reference,
  status: row.status,
  failureReason: row.failure_reason,
  initiatedAt: row.initiated_at,
  paidAt: row.paid_at,
});

/* ------------------------------- Transactions ------------------------------ */
router.get('/payments', requireAdmin, async (req, res, next) => {
  try {
    const plan = readListQuery(req, {
      defaultLimit: 25,
      sorts: { initiated: 'sp.initiated_at', amount: 'sp.amount', status: 'sp.status' },
    });
    const status = enumFilter(req.query.status, PAYMENT_STATUSES);
    const provider = enumFilter(req.query.provider, PROVIDERS);
    const storeId = uuidParam(req.query.storeId);
    const filters = [];
    const params = [];

    if (plan.search) {
      params.push(plan.search);
      filters.push(`(s.name ILIKE $${params.length} OR sp.momo_number ILIKE $${params.length}
                 OR sp.reference ILIKE $${params.length} OR sp.gateway_reference ILIKE $${params.length})`);
    }
    if (status) { params.push(status); filters.push(`sp.status = $${params.length}`); }
    if (provider) { params.push(provider); filters.push(`sp.provider = $${params.length}`); }
    if (storeId) { params.push(storeId); filters.push(`sp.store_id = $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const from = 'FROM subscription_payments sp JOIN stores s ON s.id = sp.store_id';

    const result = await paged({
      countSql: `SELECT COUNT(*)::int AS total ${from} ${where}`,
      rowsSql: `SELECT sp.*, s.name AS store_name ${from} ${where}
                 ORDER BY ${plan.orderBy} NULLS LAST
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      params,
      page: plan.page,
      limit: plan.limit,
      offset: plan.offset,
    });
    listResponse(res, { ...result, rows: result.rows.map(paymentRow) }, 'payments');
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ Gateway health ----------------------------- */
router.get('/payments/gateways', requireAdmin, async (_req, res, next) => {
  try {
    const [byProvider, byNetwork, recentFailures, plans, revenue] = await Promise.all([
      query(`SELECT provider, status, COUNT(*)::int AS count,
                    COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0) AS collected
               FROM subscription_payments GROUP BY provider, status`),
      query(`SELECT network, COUNT(*)::int AS count,
                    COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0) AS collected
               FROM subscription_payments GROUP BY network ORDER BY count DESC`),
      query(`SELECT sp.failure_reason, COUNT(*)::int AS count
               FROM subscription_payments sp
              WHERE sp.status = 'FAILED' AND sp.initiated_at > NOW() - INTERVAL '30 days'
              GROUP BY sp.failure_reason ORDER BY count DESC LIMIT 10`),
      query(`SELECT s.plan, COUNT(*)::int AS stores
               FROM stores s GROUP BY s.plan ORDER BY stores DESC`),
      query(`SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0) AS total,
                    COALESCE(SUM(amount) FILTER (WHERE status = 'FAILED'), 0) AS failed,
                    COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending
               FROM subscription_payments`),
    ]);

    res.json({
      providers: byProvider.rows,
      networks: byNetwork.rows,
      failureReasons: recentFailures.rows,
      plans,
      revenue: revenue.rows[0] || { total: 0, failed: 0, pending: 0 },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
