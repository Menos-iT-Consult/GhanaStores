/**
 * DiDwa - Super admin audit ledger (read-only).
 *
 * Every write the super admin performs lands in admin_audit_log. This page is
 * the ledger itself, plus the one place that explains what the action names
 * mean, so an operator reading "merchant.balance" is not left guessing.
 */
import { Router } from 'express';
import { query } from '../../config/database.js';
import { requireAdmin, readListQuery, listResponse, paged, uuidParam } from './helpers.js';

const router = Router();

/** Human labels for the action vocabulary, so the log is self-explaining. */
export const ACTION_LABELS = {
  'admin.login': 'Signed in',
  'admin.team.create': 'Created/reset an administrator',
  'admin.team.update': 'Updated an administrator',
  'admin.team.password_reset': 'Reset an administrator password',
  'admin.team.revoke': 'Revoked an administrator',
  'merchant.status': 'Changed a merchant status',
  'merchant.plan': 'Changed a merchant plan',
  'merchant.balance': 'Adjusted a merchant balance',
  'order.status': 'Moved an order',
  'order.refund': 'Refunded an order',
  'order.void': 'Voided an unpaid order',
  'catalog.stock': 'Corrected stock',
  'payout.settle': 'Settled a payout',
  'domain.retry': 'Re-ran domain verification',
  'theme.update': 'Edited a theme template',
  'billing.activate': 'Activated a subscription',
'domain.price': 'Changed a domain price',
  'domain.price_bulk': 'Repriced a group of TLDs',
  'domain.settings': 'Changed domain search settings',
};

router.get('/audit', requireAdmin, async (req, res, next) => {
  try {
    const plan = readListQuery(req, {
      defaultLimit: 30,
      sorts: { created: 'created_at', action: 'action' },
    });
    const action = String(req.query.action || '').trim();
    const adminId = uuidParam(req.query.adminId);
    const targetType = String(req.query.targetType || '').trim().toLowerCase();
    const filters = [];
    const params = [];

    if (plan.search) {
      params.push(plan.search);
      filters.push(`(admin_email ILIKE $${params.length} OR action ILIKE $${params.length}
                 OR target_id ILIKE $${params.length})`);
    }
    if (action) { params.push(action); filters.push(`action = $${params.length}`); }
    if (adminId) { params.push(adminId); filters.push(`admin_id = $${params.length}`); }
    if (targetType) { params.push(targetType); filters.push(`target_type = $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const result = await paged({
      countSql: `SELECT COUNT(*)::int AS total FROM admin_audit_log ${where}`,
      rowsSql: `SELECT id, admin_id, admin_email, admin_name, action, target_type, target_id,
                       detail, ip, created_at
                  FROM admin_audit_log ${where}
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
        adminId: row.admin_id,
        adminEmail: row.admin_email,
        adminName: row.admin_name,
        action: row.action,
        actionLabel: ACTION_LABELS[row.action] || row.action,
        targetType: row.target_type,
        targetId: row.target_id,
        detail: row.detail || {},
        ip: row.ip,
        createdAt: row.created_at,
      })),
    }, 'entries');
  } catch (err) {
    next(err);
  }
});

/** The action vocabulary, for the filter dropdown. */
router.get('/audit/actions', requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT action, COUNT(*)::int AS count FROM admin_audit_log GROUP BY action ORDER BY action',
    );
    res.json({
      actions: rows.map((row) => ({
        action: row.action,
        label: ACTION_LABELS[row.action] || row.action,
        count: Number(row.count || 0),
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
