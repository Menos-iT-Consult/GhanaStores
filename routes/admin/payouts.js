/**
 * DiDwa - Super admin payout oversight (every merchant withdrawal).
 *
 * Read-only on purpose. Settling a payout moves real money and the one
 * implementation of that (POST /api/payouts/:payoutId/settle in
 * routes/payoutRoutes.js, with its FOR UPDATE lock and its deliberate refusal
 * to re-approve an ambiguous gateway attempt) must not be forked here. The
 * admin UI calls that endpoint, and the settle handler writes its own audit
 * entry - so there is one code path and it is fully audited.
 */
import { Router } from 'express';
import { query } from '../../config/database.js';
import { requireAdmin, readListQuery, listResponse, paged, enumFilter, uuidParam } from './helpers.js';

const router = Router();

const PAYOUT_STATUSES = ['APPROVED', 'PENDING_REVIEW', 'FAILED', 'PROCESSING'];

const payoutRow = (row) => ({
  id: row.id,
  storeId: row.store_id,
  storeName: row.store_name,
  amount: row.amount,
  destination: row.destination,
  network: row.network,
  provider: row.provider,
  fallbackUsed: row.fallback_used,
  mtnStatus: row.mtn_status,
  status: row.status,
  reference: row.reference,
  failureReason: row.failure_reason,
  initiatedAt: row.initiated_at,
  completedAt: row.completed_at,
});

router.get('/payouts', requireAdmin, async (req, res, next) => {
  try {
    const plan = readListQuery(req, {
      defaultLimit: 25,
      sorts: { initiated: 'p.initiated_at', amount: 'p.amount', status: 'p.status' },
    });
    const status = enumFilter(req.query.status, PAYOUT_STATUSES);
    const storeId = uuidParam(req.query.storeId);
    const filters = [];
    const params = [];

    if (plan.search) {
      params.push(plan.search);
      filters.push(`(s.name ILIKE $${params.length} OR p.destination ILIKE $${params.length}
                 OR p.reference ILIKE $${params.length})`);
    }
    if (status) { params.push(status); filters.push(`p.status = $${params.length}`); }
    if (storeId) { params.push(storeId); filters.push(`p.store_id = $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const from = 'FROM payouts p JOIN stores s ON s.id = p.store_id';

    const result = await paged({
      countSql: `SELECT COUNT(*)::int AS total ${from} ${where}`,
      rowsSql: `SELECT p.*, s.name AS store_name ${from} ${where}
                 ORDER BY ${plan.orderBy} NULLS LAST
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      params: [...params, plan.limit, plan.offset],
      page: plan.page,
      limit: plan.limit,
      offset: plan.offset,
    });
    listResponse(res, { ...result, rows: result.rows.map(payoutRow) }, 'payouts');
  } catch (err) {
    next(err);
  }
});

/** Headline numbers + the review queue the super admin actually acts on. */
router.get('/payouts/summary', requireAdmin, async (_req, res, next) => {
  try {
    const [totals, byStatus, review, held] = await Promise.all([
      query(`SELECT COALESCE(SUM(amount), 0) AS total,
                    COALESCE(SUM(amount) FILTER (WHERE status = 'APPROVED'), 0) AS approved,
                    COALESCE(SUM(amount) FILTER (WHERE status = 'FAILED'), 0) AS failed,
                    COUNT(*)::int AS count
               FROM payouts`),
      query('SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS amount FROM payouts GROUP BY status'),
      query(`SELECT p.id, p.store_id, s.name AS store_name, p.amount, p.destination, p.network,
                    p.failure_reason, p.initiated_at
               FROM payouts p JOIN stores s ON s.id = p.store_id
              WHERE p.status = 'PENDING_REVIEW'
              ORDER BY p.initiated_at ASC LIMIT 50`),
      query('SELECT COALESCE(SUM(pending_balance), 0) AS pending_balance, COUNT(*)::int AS stores FROM stores'),
    ]);

    res.json({
      totals: totals.rows[0] || { total: 0, approved: 0, failed: 0, count: 0 },
      byStatus: byStatus.rows,
      reviewQueue: review.rows.map(payoutRow),
      merchantHold: held.rows[0] || { pending_balance: 0, stores: 0 },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
