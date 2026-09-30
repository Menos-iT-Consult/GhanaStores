/**
 * DiDwa - Super admin order oversight (every order on every tenant).
 *
 * Refunds are the sharpest tool in this dashboard, so POST /orders/:id/refund
 * reuses the SAME lifecycle helper the seller console uses rather than
 * re-implementing stock movement: transitionOrder() restocks the reserved units
 * and mirrors the console columns, and the refund then reverses the wallet
 * credit and loyalty totals the original PAID transition created. The order row
 * is locked FOR UPDATE for the whole thing, so a double click cannot pay out
 * twice.
 */
import { Router } from 'express';
import { query, withTransaction } from '../../config/database.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import { CANONICAL_STATUSES, PAID_STATUSES, transitionOrder } from '../../services/orderLifecycle.js';
import { requireAdmin, readListQuery, listResponse, paged, enumFilter, uuidParam } from './helpers.js';

const router = Router();

const ORDER_STATUSES = CANONICAL_STATUSES;
const CHANNELS = ['ONLINE_WHATSAPP', 'POS', 'COD_RIDER'];
const PAYMENT_METHODS = ['CASH', 'MOMO', 'COD'];

const orderRow = (row) => ({
  id: row.id,
  storeId: row.store_id,
  storeName: row.store_name,
  orderNumber: row.order_number,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  channel: row.channel,
  paymentMethod: row.payment_method,
  status: row.status,
  orderStatus: row.order_status,
  paymentStatus: row.payment_status,
  subtotal: row.subtotal,
  deliveryFee: row.delivery_fee,
  discountAmount: row.discount_amount,
  total: row.total,
  riderName: row.rider_name,
  createdAt: row.created_at,
  paidAt: row.paid_at,
});

/* ---------------------------------- List ----------------------------------- */
router.get('/orders', requireAdmin, async (req, res, next) => {
  try {
    const plan = readListQuery(req, {
      defaultLimit: 25,
      sorts: { created: 'o.created_at', total: 'o.total', status: 'o.status', store: 's.name' },
    });
    const status = enumFilter(req.query.status, ORDER_STATUSES);
    const channel = enumFilter(req.query.channel, CHANNELS);
    const method = enumFilter(req.query.paymentMethod, PAYMENT_METHODS);
    const storeId = uuidParam(req.query.storeId);
    const filters = [];
    const params = [];

    if (plan.search) {
      params.push(plan.search);
      filters.push(`(o.order_number ILIKE $${params.length} OR o.customer_name ILIKE $${params.length}
                 OR o.customer_phone ILIKE $${params.length} OR s.name ILIKE $${params.length})`);
    }
    if (status) { params.push(status); filters.push(`o.status = $${params.length}`); }
    if (channel) { params.push(channel); filters.push(`o.channel = $${params.length}`); }
    if (method) { params.push(method); filters.push(`o.payment_method = $${params.length}`); }
    if (storeId) { params.push(storeId); filters.push(`o.store_id = $${params.length}`); }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const from = 'FROM orders o JOIN stores s ON s.id = o.store_id';

    const result = await paged({
      countSql: `SELECT COUNT(*)::int AS total ${from} ${where}`,
      rowsSql: `SELECT o.id, o.store_id, s.name AS store_name, o.order_number, o.customer_name,
                       o.customer_phone, o.channel, o.payment_method, o.status, o.order_status,
                       o.payment_status, o.subtotal, o.delivery_fee, o.discount_amount, o.total,
                       o.rider_name, o.created_at, o.paid_at
                  ${from} ${where}
                 ORDER BY ${plan.orderBy} NULLS LAST
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      params: [...params, plan.limit, plan.offset],
      page: plan.page,
      limit: plan.limit,
      offset: plan.offset,
    });
    listResponse(res, { ...result, rows: result.rows.map(orderRow) }, 'orders');
  } catch (err) {
    next(err);
  }
});

/* --------------------------------- Detail ---------------------------------- */
router.get('/orders/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = uuidParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid order id.' });
    const [order, items] = await Promise.all([
      query(`SELECT o.*, s.name AS store_name FROM orders o
               JOIN stores s ON s.id = o.store_id WHERE o.id = $1 LIMIT 1`, [id]),
      query(`SELECT id, product_name, variant_label, quantity, unit_price, total_price, variant_id
               FROM order_items WHERE order_id = $1 ORDER BY id`, [id]),
    ]);
    if (!order.rows[0]) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order: orderRow(order.rows[0]), items: items.rows });
  } catch (err) {
    next(err);
  }
});

/* ------------------------- Move an order's status -------------------------- */
router.patch('/orders/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const id = uuidParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid order id.' });
    const target = String(req.body?.status || '').toUpperCase();
    if (!ORDER_STATUSES.includes(target)) {
      return res.status(400).json({ error: `Status must be one of ${ORDER_STATUSES.join(', ')}.` });
    }

    const outcome = await withTransaction(async (t) => {
      const { rows } = await t.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
      const order = rows[0];
      if (!order) return { notFound: true };
      const from = String(order.status || '').toUpperCase();
      // transitionOrder throws a 4xx on an illegal move, which the shared error
      // handler turns into a clean response.
      const moved = await transitionOrder(t, { order, storeId: order.store_id, next: target });
      return { order, from, moved };
    });

    if (outcome.notFound) return res.status(404).json({ error: 'Order not found.' });
    await recordAdminAction(req, {
      action: 'order.status',
      targetType: 'order',
      targetId: id,
      detail: {
        orderNumber: outcome.order.order_number,
        from: outcome.from,
        to: target,
        reason: req.body?.reason || null,
      },
    });
    res.json({ order: outcome.moved });
  } catch (err) {
    next(err);
  }
});

/* -------------------------- Refund / void an order ------------------------- */
router.post('/orders/:id/refund', requireAdmin, async (req, res, next) => {
  try {
    const id = uuidParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid order id.' });
    const reason = String(req.body?.reason || '').trim().slice(0, 500);
    if (!reason) {
      return res.status(400).json({ error: 'A reason is required to refund or void an order.' });
    }

    const outcome = await withTransaction(async (t) => {
      // One lock for the whole refund: without it, two concurrent refunds would
      // both read status PAID and each reverse the wallet credit.
      const { rows } = await t.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
      const order = rows[0];
      if (!order) return { notFound: true };

      const from = String(order.status || '').toUpperCase();
      if (from === 'CANCELLED') return { alreadyCancelled: true, order };
      if (from === 'DELIVERED') {
        return {
          blocked: 'Delivered orders cannot be refunded here - record the return with the merchant instead.',
          order,
        };
      }

      const wasPaid = PAID_STATUSES.includes(from);
      // Restocks the reserved units and mirrors the console columns.
      const moved = await transitionOrder(t, { order, storeId: order.store_id, next: 'CANCELLED' });

      let reversal = null;
      if (wasPaid) {
        const total = Number(order.total || 0);
        // There is no wallet to reverse: the customer's money went straight to
        // the merchant's own gateway account, so the actual refund has to be
        // issued in their Paystack/Hubtel dashboard. We record the intent and
        // the amount so the merchant can reconcile it, and say so plainly rather
        // than implying DiDwa moved money it never held.

        // Keep loyalty in step, so a refunded sale stops inflating the
        // merchant's customer lifetime value.
        if (order.customer_phone) {
          await t.query(
            `UPDATE customers
                SET total_spent    = GREATEST(total_spent - $3, 0),
                    orders_count   = GREATEST(orders_count - 1, 0),
                    loyalty_points = GREATEST(loyalty_points - $4, 0)
              WHERE store_id = $1
                AND (($2::uuid IS NOT NULL AND id = $2::uuid) OR phone = $5)`,
            [order.store_id, order.customer_id, total, Number(order.points_earned || 0), order.customer_phone],
          );
        }

        reversal = {
          total,
          settledWithGateway: true,
          // No debit happened on our side; the merchant refunds the customer in
          // their own gateway dashboard.
          debited: 0,
          action: 'refund must be issued by the merchant in their payment gateway',
        };
      }
      return { order, from, moved, wasPaid, reversal };
    });

    if (outcome.notFound) return res.status(404).json({ error: 'Order not found.' });
    if (outcome.alreadyCancelled) {
      return res.status(409).json({ error: 'This order is already cancelled.' });
    }
    if (outcome.blocked) return res.status(409).json({ error: outcome.blocked });

    await recordAdminAction(req, {
      action: outcome.wasPaid ? 'order.refund' : 'order.void',
      targetType: 'order',
      targetId: id,
      detail: {
        orderNumber: outcome.order.order_number,
        store: outcome.order.store_id,
        from: outcome.from,
        to: 'CANCELLED',
        reason,
        reversal: outcome.reversal,
      },
    });

    res.json({
      order: outcome.moved,
      reversal: outcome.reversal,
      // Be explicit that no money moved on our side - a silent success here would
      // read as "DiDwa refunded the customer" when it did not.
      note: outcome.reversal
        ? `Order cancelled. GHS ${outcome.reversal.total.toFixed(2)} was collected by the `
          + "merchant's payment gateway, so the refund must be issued there."
        : undefined,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
