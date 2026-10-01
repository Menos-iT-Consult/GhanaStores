/**
 * DiDwa - Super admin logistics oversight (rider transits).
 *
 * Read-only: rider dispatch and reconciliation belong to the merchant's own POS
 * session (routes/posRoutes.js), and reconciling someone else's cash collection
 * is not something the platform should be able to do silently.
 */
import { Router } from 'express';
import { query } from '../../config/database.js';
import { requireAdmin, readListQuery, listResponse, paged, enumFilter, uuidParam } from './helpers.js';

const router = Router();

const TRANSIT_STATUSES = ['TRANSIT', 'RECONCILED'];

router.get('/riders', requireAdmin, async (req, res, next) => {
  try {
    const plan = readListQuery(req, {
      defaultLimit: 25,
      sorts: { dispatched: 'r.dispatched_at', amount: 'r.amount', status: 'r.status' },
    });
    const status = enumFilter(req.query.status, TRANSIT_STATUSES);
    const storeId = uuidParam(req.query.storeId);
    const filters = [];
    const params = [];

    if (plan.search) {
      params.push(plan.search);
      filters.push(`(r.rider_name ILIKE $${params.length} OR r.rider_phone ILIKE $${params.length}
                 OR s.name ILIKE $${params.length})`);
    }
    if (status) { params.push(status); filters.push(`r.status = $${params.length}`); }
    if (storeId) { params.push(storeId); filters.push(`r.store_id = $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const from = 'FROM rider_transits r JOIN stores s ON s.id = r.store_id';

    const result = await paged({
      countSql: `SELECT COUNT(*)::int AS total ${from} ${where}`,
      rowsSql: `SELECT r.id, r.store_id, s.name AS store_name, r.order_ids, r.rider_name, r.rider_phone,
                       r.amount, r.status, r.dispatched_at, r.reconciled_at
                  ${from} ${where}
                 ORDER BY ${plan.orderBy} NULLS LAST
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      params,
      page: plan.page,
      limit: plan.limit,
      offset: plan.offset,
    });
    listResponse(res, {
      ...result,
      rows: result.rows.map((row) => ({
        id: row.id,
        storeId: row.store_id,
        storeName: row.store_name,
        // order_ids is JSONB; normalise so the table can always count the legs.
        orderIds: Array.isArray(row.order_ids) ? row.order_ids : [],
        riderName: row.rider_name,
        riderPhone: row.rider_phone,
        amount: row.amount,
        status: row.status,
        dispatchedAt: row.dispatched_at,
        reconciledAt: row.reconciled_at,
      })),
    }, 'transits');
  } catch (err) {
    next(err);
  }
});

router.get('/riders/summary', requireAdmin, async (_req, res, next) => {
  try {
    const [status, cash] = await Promise.all([
      query(`SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS amount
               FROM rider_transits GROUP BY status`),
      query(`SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'TRANSIT'), 0) AS in_transit,
                    COALESCE(SUM(amount) FILTER (WHERE status = 'RECONCILED'), 0) AS reconciled
               FROM rider_transits`),
    ]);
    res.json({ byStatus: status.rows, cash: cash.rows[0] || { in_transit: 0, reconciled: 0 } });
  } catch (err) {
    next(err);
  }
});

export default router;
