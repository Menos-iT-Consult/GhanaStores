/**
 * DiDwa - Super admin merchant oversight (every tenant on the platform).
 *
 * This is the page the super admin lives in: who is on the platform, what they
 * sell, what they have earned and whether they are healthy. The writes here are
 * destructive enough to matter (suspend = cut a live shop off), so each one
 * records the previous value in the audit ledger.
 */
import { Router } from 'express';
import { query } from '../../config/database.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import { requireAdmin, readListQuery, listResponse, paged, enumFilter, uuidParam } from './helpers.js';

const router = Router();

export const STORE_STATUSES = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'];
export const REVENUE_STATUSES = ['PAID', 'FULFILLED', 'DELIVERED'];

export const storeRow = (row) => ({
  id: row.id,
  name: row.name,
  ownerName: row.owner_name,
  email: row.email,
  phone: row.phone,
  slug: row.subdomain_slug,
  customDomain: row.custom_domain,
  whatsappNumber: row.whatsapp_number,
  momoNumber: row.momo_number,
  status: row.status,
  plan: row.plan,
  trialEndsAt: row.trial_ends_at,
  graceEndsAt: row.grace_ends_at,
  availableBalance: row.available_balance,
  pendingBalance: row.pending_balance,
  themeId: row.active_theme_id,
  themeName: row.theme_name,
  ordersCount: Number(row.orders_count || 0),
  revenue: row.revenue,
  productsCount: Number(row.products_count || 0),
  createdAt: row.created_at,
});

/* ---------------------------------- List ----------------------------------- */
router.get('/merchants', requireAdmin, async (req, res, next) => {
  try {
    const plan = readListQuery(req, {
      defaultLimit: 25,
      sorts: {
        created: 's.created_at', name: 's.name', revenue: 'revenue',
        orders: 'orders_count', status: 's.status', tier: 's.plan',
      },
    });
    const status = enumFilter(req.query.status, STORE_STATUSES);
    const tier = String(req.query.plan || '').trim().toLowerCase();
    const filters = [];
    const params = [];

    if (plan.search) {
      params.push(plan.search);
      filters.push(`(s.name ILIKE $${params.length} OR s.email ILIKE $${params.length}
                 OR s.phone ILIKE $${params.length} OR s.subdomain_slug ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      filters.push(`s.status = $${params.length}`);
    }
    if (tier) {
      params.push(tier);
      filters.push(`s.plan = $${params.length}`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const columns = `
        s.id, s.name, s.owner_name, s.email, s.phone, s.subdomain_slug, s.custom_domain,
        s.whatsapp_number, s.momo_number, s.status, s.plan, s.trial_ends_at, s.grace_ends_at,
        s.available_balance, s.pending_balance, s.active_theme_id, s.created_at,
        t.name AS theme_name,
        (SELECT COUNT(*) FROM orders o WHERE o.store_id = s.id) AS orders_count,
        (SELECT COALESCE(SUM(o.total), 0) FROM orders o
          WHERE o.store_id = s.id AND o.status IN ('PAID','FULFILLED','DELIVERED')) AS revenue,
        (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id) AS products_count`;

    const result = await paged({
      countSql: `SELECT COUNT(*)::int AS total FROM stores s ${where}`,
      rowsSql: `SELECT ${columns} FROM stores s
                  LEFT JOIN theme_templates t ON t.id = s.active_theme_id
                 ${where}
                 ORDER BY ${plan.orderBy} NULLS LAST
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      params: [...params, plan.limit, plan.offset],
      page: plan.page,
      limit: plan.limit,
      offset: plan.offset,
    });
    listResponse(res, { ...result, rows: result.rows.map(storeRow) }, 'merchants');
  } catch (err) {
    next(err);
  }
});

/* ------------------------- Single merchant (360 degrees) ------------------- */
router.get('/merchants/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = uuidParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid merchant id.' });

    const [store, orders, catalog, domains, payments, recent, audit] = await Promise.all([
      query(`SELECT s.*, t.name AS theme_name
               FROM stores s LEFT JOIN theme_templates t ON t.id = s.active_theme_id
              WHERE s.id = $1 LIMIT 1`, [id]),
      query(`SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total), 0) AS total
               FROM orders WHERE store_id = $1 GROUP BY status`, [id]),
      query(`SELECT (SELECT COUNT(*) FROM products WHERE store_id = $1)::int AS total,
                    (SELECT COUNT(*) FROM products WHERE store_id = $1 AND is_active)::int AS active,
                    (SELECT COUNT(*) FROM product_variants
                      WHERE store_id = $1 AND stock_quantity <= low_stock_threshold)::int AS low_stock`,
        [id, id, id]),
      query(`SELECT id, domain_name, provider, status, ssl_status, created_at
               FROM store_domains WHERE store_id = $1 ORDER BY created_at DESC`, [id]),
      query(`SELECT plan_id, amount, provider, status, initiated_at
               FROM subscription_payments WHERE store_id = $1
              ORDER BY initiated_at DESC LIMIT 10`, [id]),
      query(`SELECT id, order_number, customer_name, status, channel, payment_method, total, created_at
               FROM orders WHERE store_id = $1 ORDER BY created_at DESC LIMIT 10`, [id]),
      query(`SELECT action, admin_email, detail, created_at
               FROM admin_audit_log
              WHERE target_type = 'store' AND target_id = $1
              ORDER BY created_at DESC LIMIT 10`, [id]),
    ]);

    if (!store.rows[0]) return res.status(404).json({ error: 'Merchant not found.' });
    const breakdown = orders.rows;
    const revenue = breakdown
      .filter((row) => REVENUE_STATUSES.includes(String(row.status || '').toUpperCase()))
      .reduce((sum, row) => sum + Number(row.total || 0), 0);

    res.json({
      merchant: storeRow({
        ...store.rows[0],
        orders_count: breakdown.reduce((sum, row) => sum + Number(row.count || 0), 0),
        revenue,
        products_count: catalog.rows[0]?.total,
      }),
      orderBreakdown: breakdown,
      catalog: catalog.rows[0] || { total: 0, active: 0, low_stock: 0 },
      domains: domains.rows,
      payments: payments.rows,
      recentOrders: recent.rows,
      audit: audit.rows,
    });
  } catch (err) {
    next(err);
  }
});

/* --------------------------- Suspend / reactivate -------------------------- */
router.patch('/merchants/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const id = uuidParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid merchant id.' });
    const status = String(req.body?.status || '').toUpperCase();
    if (!STORE_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of ${STORE_STATUSES.join(', ')}.` });
    }
    const reason = String(req.body?.reason || '').trim().slice(0, 500) || null;

    const { rows: before } = await query('SELECT id, name, status FROM stores WHERE id = $1 LIMIT 1', [id]);
    if (!before[0]) return res.status(404).json({ error: 'Merchant not found.' });
    if (before[0].status === status) {
      return res.status(409).json({ error: `Merchant is already ${status}.` });
    }

    // PAST_DUE keeps a shop selling; SUSPENDED is the kill switch.
    const { rows } = await query(
      'UPDATE stores SET status = $2 WHERE id = $1 RETURNING id, name, status',
      [id, status],
    );

    await recordAdminAction(req, {
      action: 'merchant.status',
      targetType: 'store',
      targetId: id,
      detail: { name: before[0].name, from: before[0].status, to: status, reason },
    });
    res.json({ merchant: rows[0] });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ Change plan -------------------------------- */
router.patch('/merchants/:id/plan', requireAdmin, async (req, res, next) => {
  try {
    const id = uuidParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid merchant id.' });
    const planName = String(req.body?.plan || '').trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,40}$/.test(planName)) {
      return res.status(400).json({ error: 'A valid plan name is required.' });
    }
    const { rows: before } = await query('SELECT id, name, plan FROM stores WHERE id = $1 LIMIT 1', [id]);
    if (!before[0]) return res.status(404).json({ error: 'Merchant not found.' });

    const { rows } = await query(
      'UPDATE stores SET plan = $2 WHERE id = $1 RETURNING id, name, plan',
      [id, planName],
    );
    await recordAdminAction(req, {
      action: 'merchant.plan',
      targetType: 'store',
      targetId: id,
      detail: {
        name: before[0].name,
        from: before[0].plan,
        to: planName,
        reason: req.body?.reason || null,
      },
    });
    res.json({ merchant: rows[0] });
  } catch (err) {
    next(err);
  }
});

/* --------------------------- Move a store balance -------------------------- */
router.patch('/merchants/:id/balance', requireAdmin, async (req, res, next) => {
  try {
    const id = uuidParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid merchant id.' });
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      return res.status(400).json({ error: 'Enter a non-zero adjustment amount.' });
    }
    if (Math.abs(amount) > 10_000_000) {
      return res.status(400).json({ error: 'Adjustment is unrealistically large.' });
    }
    const reason = String(req.body?.reason || '').trim().slice(0, 500);
    if (!reason) return res.status(400).json({ error: 'A reason is required for balance adjustments.' });

    // The CTE captures the balance BEFORE the update so both the response and
    // the audit entry can show what actually changed.
    const { rows } = await query(
      `WITH previous AS (SELECT available_balance FROM stores WHERE id = $1)
       UPDATE stores
          SET available_balance = GREATEST(stores.available_balance + $2, 0)
        WHERE stores.id = $1
       RETURNING stores.id, stores.name, stores.available_balance, stores.pending_balance,
                 (SELECT available_balance FROM previous) AS previous_balance`,
      [id, amount],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Merchant not found.' });

    const applied = Number(rows[0].available_balance) - Number(rows[0].previous_balance);
    await recordAdminAction(req, {
      action: 'merchant.balance',
      targetType: 'store',
      targetId: id,
      detail: {
        name: rows[0].name,
        requested: amount,
        applied,
        reason,
        balanceAfter: rows[0].available_balance,
      },
    });

    res.json({
      merchant: rows[0],
      applied,
      // A debit larger than the wallet holds stops at zero (the column is
      // CHECK >= 0), so the shortfall is reported instead of hidden.
      note: Math.abs(applied) < Math.abs(amount)
        ? `Balance floored at zero: ${amount} was requested but ${applied} was applied.`
        : undefined,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
