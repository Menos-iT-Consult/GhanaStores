/**
 * DiDwa - Offline POS & COD Reconciliation Routes
 * MODULE 4: In-store register sales (cash / MoMo) with atomic inventory
 * decrement + loyalty awarding, plus Rider Transit Balance tracking and
 * one-click cash reconciliation into the merchant wallet.
 */
import { Router } from 'express';
import { pool, query, withTransaction } from '../config/database.js';
import { requireActiveSeller } from '../middleware/authMiddleware.js';
import { runPosSale } from '../services/posSaleService.js';
import { normalizeGhPhone, redeemValue, money } from '../utils/helpers.js';

const router = Router();

const PAID = "'PAID','FULFILLED','DELIVERED'";

/* ------------------------- Loyalty lookup (checkout) ------------------------ */
// GET /api/pos/loyalty/:phone -> points balance + max redemption value.
// Exported for the seller app's POS checkout (/api/mobile/v1/pos/loyalty/:phone).
export async function loyaltyLookupHandler(req, res, next) {
  try {
    const phone = normalizeGhPhone(req.params.phone);
    if (!phone) return res.status(400).json({ error: 'Invalid Ghana phone number.' });

    const [cust, store] = await Promise.all([
      query(
        `SELECT id, name, loyalty_points, total_spent, orders_count
           FROM customers WHERE store_id = $1 AND phone = $2`,
        [req.auth.sub, phone],
      ),
      query(
        'SELECT loyalty_point_value FROM stores WHERE id = $1',
        [req.auth.sub],
      ),
    ]);
    const customer = cust.rows[0] || null;
    const pointValue = Number(store.rows[0]?.loyalty_point_value ?? 0.05);
    res.json({
      customer: customer && {
        ...customer,
        loyalty_points: customer.loyalty_points,
        redeemableValueGhs: redeemValue(customer.loyalty_points, pointValue),
      },
      pointValueGhs: pointValue,
    });
  } catch (err) {
    next(err);
  }
}

/* Thin PWA route over the shared handler. */
router.get('/loyalty/:phone', requireActiveSeller, loyaltyLookupHandler);

/* ------------------------------- Log a POS sale ------------------------------ */
// body: {
//   items: [{ variantId, quantity }],
//   paymentMethod: 'CASH' | 'MOMO',
//   momoNetwork?: 'MTN'|'VODAFONE'|'AT',
//   customerPhone?: '0244123456', customerName?,
//   redeemPoints?: number, notes?
// }
router.post('/sales', requireActiveSeller, async (req, res, next) => {
  // Thin wrapper over the shared sale engine: identical ledger semantics for
  // the PWA and the mobile app (offline sync replays with the same saleId).
  try {
    const result = await runPosSale({
      storeId: req.auth.sub,
      storePhone: req.store?.phone,
      body: req.body || {},
    });
    return res.status(result.status).json(result.json);
  } catch (err) {
    next(err);
  }
});

/* ------------------------- Rider transit: dispatch -------------------------- */
// Seller hands COD orders to a rider; cash is tracked as "in transit".
router.post('/riders/dispatch', requireActiveSeller, async (req, res, next) => {
  try {
    const { riderName, riderPhone, orderIds } = req.body || {};
    if (!riderName) return res.status(400).json({ error: 'Rider name is required.' });
    const ids = Array.isArray(orderIds) ? orderIds.filter(Boolean) : [];
    if (ids.length === 0) {
      return res.status(400).json({ error: 'Select at least one COD order for dispatch.' });
    }
    const phone = riderPhone ? normalizeGhPhone(riderPhone) : null;

    const result = await withTransaction(async (t) => {
      const orders = await t.query(
        `SELECT id, COALESCE(NULLIF(total, 0), total_amount, 0) AS total FROM orders
          WHERE store_id = $1
            AND id = ANY($2::uuid[])
            AND payment_method = 'COD'
            AND status IN ('PAID','FULFILLED')
          FOR UPDATE`,
        [req.auth.sub, ids],
      );
      if (orders.rows.length === 0) {
        throw Object.assign(
          new Error('No eligible COD orders found (must be PAID/FULFILLED with COD payment).'),
          { status: 404 },
        );
      }
      const amount = money(orders.rows.reduce((s, o) => s + Number(o.total), 0));
      const lockedIds = orders.rows.map((o) => o.id);

      const ins = await t.query(
        `INSERT INTO rider_transits (store_id, order_ids, rider_name, rider_phone, amount)
         VALUES ($1,$2::jsonb,$3,$4,$5) RETURNING id, amount, status, dispatched_at`,
        [req.auth.sub, JSON.stringify(lockedIds), String(riderName).trim(), phone, amount],
      );
      // Handing the parcel to the rider means it left the shop - but it is NOT
      // delivered until the rider's cash is reconciled. Keep it FULFILLED and
      // mirror order_status so the fulfilment console agrees.
      await t.query(
        `UPDATE orders
            SET status = 'FULFILLED', order_status = 'PROCESSING', updated_at = NOW()
          WHERE store_id = $1 AND id = ANY($2::uuid[])`,
        [req.auth.sub, lockedIds],
      );
      return ins.rows[0];
    });

    res.status(201).json({
      message: `GHS ${Number(result.amount).toFixed(2)} handed to ${riderName}. Track it under Rider Transit.`,
      transit: { ...result, amount: Number(result.amount), riderName },
    });
  } catch (err) {
    next(err);
  }
});

/* --------------------- Rider transit: open + history list -------------------- */
router.get('/riders', requireActiveSeller, async (req, res, next) => {
  try {
    const [open, history] = await Promise.all([
      query(
        `SELECT * FROM rider_transits
          WHERE store_id = $1 AND status = 'TRANSIT'
          ORDER BY dispatched_at DESC`,
        [req.auth.sub],
      ),
      query(
        `SELECT * FROM rider_transits
          WHERE store_id = $1 AND status = 'RECONCILED'
          ORDER BY reconciled_at DESC LIMIT 20`,
        [req.auth.sub],
      ),
    ]);
    const transitTotal = money(open.rows.reduce((s, r) => s + Number(r.amount), 0));
    res.json({
      openTransits: open.rows.map((r) => ({
        ...r, amount: Number(r.amount), orderCount: r.order_ids?.length || 0,
      })),
      reconciledHistory: history.rows.map((r) => ({
        ...r, amount: Number(r.amount), orderCount: r.order_ids?.length || 0,
      })),
      transitTotal,
    });
  } catch (err) {
    next(err);
  }
});

/* --------------- One-click reconciliation into merchant wallet --------------- */
router.post('/riders/:id/reconcile', requireActiveSeller, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Lock BOTH the transit row and the wallet row before moving money.
    const lock = await client.query(
      `SELECT rt.* FROM rider_transits rt
        WHERE rt.id = $1 AND rt.store_id = $2 AND rt.status = 'TRANSIT'
        FOR UPDATE OF rt`,
      [req.params.id, req.auth.sub],
    );
    const transit = lock.rows[0];
    if (!transit) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Open transit record not found.' });
    }

    // No wallet credit on delivery: the collected funds live in the merchant's
    // own gateway account, so there is no platform balance to add to.
    // The parcel truly reached the buyer: close the transit AND mark every
    // carried order DELIVERED (mirroring order_status) in the same commit.
    const parsedIds = Array.isArray(transit.order_ids) ? transit.order_ids : [];
    if (parsedIds.length > 0) {
      await client.query(
        `UPDATE orders
            SET status = 'DELIVERED', order_status = 'DELIVERED', updated_at = NOW()
          WHERE store_id = $1 AND id = ANY($2::uuid[])`,
        [req.auth.sub, parsedIds],
      );
    }
    const done = await client.query(
      `UPDATE rider_transits SET status = 'RECONCILED', reconciled_at = NOW()
        WHERE id = $1 RETURNING amount, reconciled_at`,
      [transit.id],
    );
    await client.query('COMMIT');
    client.release();

    res.json({
      message: `Reconciled GHS ${Number(transit.amount).toFixed(2)} from ${transit.rider_name} into your available balance.`,
      transit: { ...done.rows[0], amount: Number(done.rows[0].amount) },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* noop */ }
    client.release();
    next(err);
  }
});

/* ------------------------------ Recent POS sales ----------------------------- */
router.get('/sales', requireActiveSeller, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, order_number, customer_name, customer_phone, payment_method,
              total, points_earned, points_redeemed, created_at,
              (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = orders.id) AS item_count
         FROM orders
        WHERE store_id = $1 AND channel = 'POS'
        ORDER BY created_at DESC LIMIT 25`,
      [req.auth.sub],
    );
    res.json({ sales: rows });
  } catch (err) {
    next(err);
  }
});

export default router;


