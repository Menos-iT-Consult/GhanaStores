/**
 * DiDwa - Order Management Module
 * Public storefront checkout + seller fulfillment console.
 *
 *   POST  /api/public/orders              guest checkout (transactional)
 *   GET   /api/seller/orders              status-filtered feed, JSON_AGG items
 *   PATCH /api/seller/orders/:id/status   fulfillment transitions
 *
 * Auth note: the platform guard lives at requireSeller in
 * middleware/authMiddleware.js; aliased to authenticateSeller below to
 * match this module's contract.
 */
import { Router } from 'express';
import { pool, query, withTransaction } from '../config/database.js';
import { requireSeller as authenticateSeller } from '../middleware/authMiddleware.js';
import { generateOrderNumber, money, toIntOr } from '../utils/helpers.js';
import {
  CONSOLE_TO_CANONICAL,
  PAID_STATUSES,
  deriveOrderStatus,
  derivePaymentStatus,
  transitionOrder,
} from '../services/orderLifecycle.js';
import {
  collectLowStockCandidate,
  persistAlertFlag,
  dispatchLowStockAlerts,
} from './inventoryRoutes.js';
import { canonicalDomain } from '../services/domainService.js';
import {
  getSettings as getStoreSettings,
  resolveMethod,
  chargeStorePayment,
  availableMethods,
} from '../services/storePayments.js';

const router = Router();

/* Console statuses (UI vocabulary) - the DB stores canonical `orders.status`. */
const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'DELIVERED', 'CANCELLED'];
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED'];
/* Must match the orders.payment_method CHECK constraint in db/schema.sql.
   BANK_TRANSFER was advertised here but rejected by the database.
   PAYSTACK/HUBTEL name the specific BYOK gateway that took the money; CASH and
   MOMO are the legacy spellings kept for older orders and the POS. */
const PAYMENT_METHODS = ['COD', 'MOMO', 'CASH', 'PAYSTACK', 'HUBTEL'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalise the three accepted body shapes for the fulfilment transition. */
function paymentParam(b) {
  const v = b.payment_status ?? b.paymentStatus;
  if (v === undefined || v === null) return null;
  const s = String(v).toUpperCase();
  return PAYMENT_STATUSES.includes(s) ? s : '__invalid__';
}

function orderParam(b) {
  const v = b.order_status ?? b.orderStatus;
  if (v === undefined || v === null) return null;
  const s = String(v).toUpperCase();
  return ORDER_STATUSES.includes(s) ? s : '__invalid__';
}

function canonicalParam(b) {
  const v = b.status;
  if (v === undefined || v === null) return null;
  const s = String(v).toUpperCase();
  if (['PAID', 'FULFILLED', 'DELIVERED', 'CANCELLED', 'PENDING'].includes(s)) return s;
  return '__invalid__';
}

/* ------------------------------- Guest checkout ---------------------------- */

/**
 * GET /api/public/payment-methods?slug=<apex-or-custom-domain>
 *
 * Lets the storefront render exactly the methods this store can charge with,
 * before an order exists. Public by necessity (a customer is not a signed-in
 * seller) but strictly read-only and it exposes only method NAMES - no keys, no
 * amounts, no store internals. A store with no configured keys reports COD.
 */
router.get('/public/payment-methods', async (req, res, next) => {
  try {
    const key = canonicalDomain(String(req.query.slug || ''));
    if (!key) return res.status(400).json({ error: 'A store slug or custom domain is required.' });

    const s = await query(
      `SELECT id FROM stores
        WHERE LOWER(subdomain_slug) = LOWER($1)
           OR LOWER(custom_domain) = ANY ($2::text[])
        LIMIT 1`,
      [key, [key, `www.${key}`]],
    );
    if (!s.rows[0]) return res.status(404).json({ error: 'Store not found.' });

    const settings = await getStoreSettings(s.rows[0].id);
    const methods = availableMethods(settings);

    res.json({
      methods,
      // The gateway whose keys are live, so the storefront can label the option.
      activeGateway: settings?.activeGateway || 'COD',
      codEnabled: methods.includes('COD'),
      // Paystack's public key is publishable - the checkout script needs it.
      paystackPublicKey: methods.includes('PAYSTACK') ? settings.paystackPublicKey : null,
    });
  } catch (err) { next(err); }
});

// POST /api/public/orders - called by customer storefronts upon checkout.
// Wraps pricing + order/items creation + stock decrement in one transaction.
router.post('/public/orders', async (req, res, next) => {
  try {
    const b = req.body || {};
    const rawItems = Array.isArray(b.items) ? b.items : [];
    const customerName = String(b.customer_name ?? b.customerName ?? '').trim();
    const customerPhone = String(b.customer_phone ?? b.customerPhone ?? '').trim();
    const customerAddress = String(b.customer_address ?? b.customerAddress ?? '').trim();
    const methodRaw = String(b.payment_method ?? b.paymentMethod ?? 'COD').toUpperCase();
    // The requested method is NOT trusted: resolvePaymentMethod() below narrows
    // it to what this store is actually able to charge with, so a hand-rolled
    // POST cannot push a store with no keys into a card payment.
    const notes = b.notes ? String(b.notes).slice(0, 500) : null;

    if (!customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({ error: 'Customer name, phone and delivery address are required.' });
    }
    if (rawItems.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    // Multi-tenant scope: explicit store_id (embedded widget) or storefront slug.
    let storeId = b.store_id ?? b.storeId ?? null;
    if (!storeId && b.slug) {
      // A storefront checkout sends whichever host the customer is on, so this
      // is the apex or its www. spelling; both must resolve to the same store.
      const key = canonicalDomain(b.slug);
      const s = await query(
        `SELECT id FROM stores
          WHERE LOWER(subdomain_slug) = LOWER($1)
             OR LOWER(custom_domain) = ANY ($2::text[])
          LIMIT 1`,
        [key, [key, `www.${key}`]],
      );
      if (!s.rows[0]) return res.status(404).json({ error: 'Store not found.' });
      storeId = s.rows[0].id;
    }
    if (!storeId) {
      return res.status(400).json({ error: 'Store context missing: provide store_id or slug.' });
    }

    const items = rawItems
      .map((it) => ({
        variantId: it.variant_id ?? it.variantId ?? null,
        productId: it.product_id ?? it.productId ?? null,
        quantity: toIntOr(it.quantity ?? it.qty, 0),
      }))
      .filter((it) => it.quantity > 0);
    if (items.length === 0) {
      return res.status(400).json({ error: 'Cart quantities must be at least 1.' });
    }
    // Reject malformed ids up front: a non-UUID used to reach Postgres and
    // surface as a 500 "invalid input syntax for type uuid".
    const badId = items.find((it) => {
      const v = it.variantId ?? it.productId;
      return !v || !UUID_RE.test(String(v));
    });
    if (badId) {
      return res.status(400).json({ error: 'Every cart line needs a valid variant_id or product_id.' });
    }

    // Resolve the store's own payment configuration. This is what makes checkout
    // BYOK: the methods offered are the merchant's, and a store with no keys
    // can only ever be COD, regardless of what the request asked for.
    const paymentSettings = await getStoreSettings(storeId);
    const paymentMethod = resolveMethod(paymentSettings, methodRaw);

    const alertCandidates = [];
    const created = await withTransaction(async (t) => {
      // Single canonical ledger: status/total/subtotal are the source of
      // truth for analytics, wallet credit, receipts and rider dispatch.
      // order_status/payment_status/total_amount are kept as mirrors so
      // every reader of either column sees the same numbers.
      const orderRow = await t.query(
        `INSERT INTO orders
            (store_id, order_number, customer_name, customer_phone, customer_address,
             channel, payment_method, status, payment_status, order_status,
             subtotal, total, total_amount, notes)
         VALUES ($1, $2, $3, $4, $5, 'ONLINE_WHATSAPP', $6,
                 'PENDING', 'PENDING', 'PENDING', 0, 0, 0, $7)
         RETURNING id, order_number, created_at`,
        [storeId, generateOrderNumber(), customerName, customerPhone, customerAddress, paymentMethod, notes],
      );
      const order = orderRow.rows[0];
      let totalAmount = 0;

      for (const it of items) {
        // Tenant-scoped lock + pricing derived from catalog truth.
        // An explicit variant id always wins; a bare product id matches that
        // product's variant. A product with several variants must name the
        // exact variant, otherwise the buyer could check out the wrong one.
        const found = await t.query(
          `SELECT v.id, v.product_id, p.name AS product_name, v.option_value,
                  COALESCE(v.price_override, p.price) AS unit_price,
                  v.stock_quantity
             FROM product_variants v
             JOIN products p ON p.id = v.product_id
            WHERE v.store_id = $2
              AND ($1::uuid IS NULL OR v.id = $1::uuid)
              AND ($3::uuid IS NULL OR p.id = $3::uuid)
            ORDER BY v.id
            FOR UPDATE OF v`,
          [it.variantId, storeId, it.productId],
        );
        const candidates = found.rows;
        if (candidates.length === 0) {
          throw Object.assign(new Error('An item in your cart is no longer available.'), { status: 404 });
        }
        if (!it.variantId && candidates.length > 1) {
          throw Object.assign(
            new Error(`"${candidates[0].product_name}" has several variants - please choose one.`),
            { status: 400, code: 'VARIANT_REQUIRED' },
          );
        }
        const row = candidates[0];
        if (Number(row.stock_quantity) < it.quantity) {
          throw Object.assign(
            new Error(`${row.product_name} has only ${row.stock_quantity} left in stock.`),
            { status: 409, code: 'INSUFFICIENT_STOCK' },
          );
        }

        const unitPrice = money(row.unit_price);
        const lineTotal = money(unitPrice * it.quantity);
        totalAmount = money(totalAmount + Number(lineTotal));

        await t.query(
          `INSERT INTO order_items
              (order_id, store_id, product_id, variant_id, product_name,
               quantity, unit_price, total_price, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
          [order.id, storeId, row.product_id, row.id, row.product_name, it.quantity, unitPrice, lineTotal],
        );

        const dec = await t.query(
          `UPDATE product_variants
              SET stock_quantity = stock_quantity - $2, updated_at = NOW()
            WHERE id = $1
            RETURNING id, stock_quantity, low_stock_threshold, low_stock_alert_sent`,
          [row.id, it.quantity],
        );
        const after = dec.rows[0];
        if (collectLowStockCandidate(after)) {
          await persistAlertFlag(t, after.id, true);
          alertCandidates.push({
            id: after.id,
            product_name: row.product_name,
            option_value: row.option_value,
            stock_quantity: after.stock_quantity,
            low_stock_threshold: after.low_stock_threshold,
          });
        }
      }

      await t.query(
        'UPDATE orders SET subtotal = $2, total = $2, total_amount = $2, updated_at = NOW() WHERE id = $1',
        [order.id, totalAmount],
      );
      return { ...order, totalAmount };
    });

    // Post-commit side effects - dispatchLowStockAlerts re-arms the latch on
    // failure, so an SMS hiccup never rolls back stock NOR silently drops the alert.
    if (alertCandidates.length > 0) {
      dispatchLowStockAlerts(storeId, alertCandidates).catch(() => {});
    }

    // The order now exists, so the gateway can be initialised against a real
    // order number as the transaction reference. Done post-commit on purpose:
    // a gateway timeout must never discard a placed order.
    let payment = { method: paymentMethod, requiresCharge: false, success: true };
    if (paymentMethod !== 'COD') {
      try {
        payment = await chargeStorePayment(storeId, {
          reference: created.order_number,
          /* `totalAmount` is computed inside the transaction above and only
             exists on its return value. Referring to the bare name here threw a
             ReferenceError that the catch below swallowed into a generic
             "Payment could not be started", so EVERY gateway checkout silently
             failed with no authorizationUrl and the customer was never sent to
             the payment page. */
          amount: created.totalAmount,
          method: paymentMethod,
          email: b.customer_email || b.customerEmail || null,
          msisdn: customerPhone,
          network: b.momoNetwork || 'MTN',
          description: `Order ${created.order_number}`,
          callbackUrl: `${process.env.CLIENT_URL || ''}/api/webhooks/${paymentMethod.toLowerCase()}`,
        });
        // The reference sent to the gateway IS the order number, so the webhook
        // can match the callback to this order with no extra bookkeeping.
        if (!payment.success) {
          console.warn(`[checkout] ${paymentMethod} declined to initialise for ${created.order_number}: ${payment.message || ''}`);
        }
      } catch (err) {
        console.error(`[checkout] ${paymentMethod} charge failed for ${created.order_number}: ${err.message}`);
        // The order is already committed, so it stands and the customer can
        // retry; telling them the order failed would invite a duplicate order.
        payment = { method: paymentMethod, requiresCharge: true, success: false, error: 'Payment could not be started.' };
      }
    }

    res.status(201).json({
      message: `Order ${created.order_number} placed successfully.`,
      order: {
        id: created.id,
        orderNumber: created.order_number,
        totalAmount: Number(created.totalAmount),
        paymentMethod,
        paymentStatus: payment.paymentStatus || 'PENDING',
        orderStatus: payment.orderStatus || 'PENDING',
        createdAt: created.created_at,
      },
      payment: {
        method: payment.method || paymentMethod,
        // COD settles with nothing further to do; a gateway needs the customer
        // to complete an authorisation before the webhook marks it paid.
        requiresAction: Boolean(payment.requiresCharge && payment.success),
        requiresCharge: Boolean(payment.requiresCharge),
        authorizationUrl: payment.authorizationUrl || null,
        accessCode: payment.accessCode || null,
        error: payment.error || null,
      },
      // What this store can offer, so the storefront renders exactly the
      // methods that are actually chargeable right now.
      availableMethods: availableMethods(paymentSettings),
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    next(err);
  }
});

/* --------------------------------- Helpers --------------------------------- */
// The console's orderStatus/paymentStatus are DERIVED from canonical
// `orders.status` (see services/orderLifecycle.js), with the stored mirror
// columns as fallbacks for rows written before the unification.
function mapOrder(r) {
  const status = r.status;
  return {
    id: r.id,
    orderNumber: r.order_number,
    customer: { name: r.customer_name, phone: r.customer_phone, address: r.customer_address },
    totalAmount: Number(r.total_amount ?? r.total ?? 0),
    paymentMethod: r.payment_method,
    paymentStatus: derivePaymentStatus(status),
    orderStatus: deriveOrderStatus(status),
    status,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    items: (r.items || []).map((i) => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      productName: i.productName,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
  };
}
/* ------------------------------- Seller feed ------------------------------- */
// GET /api/seller/orders?status=ALL|PENDING|PROCESSING|DELIVERED|CANCELLED
// Console tabs map onto canonical status: PROCESSING = PAID/FULFILLED.
router.get('/seller/orders', authenticateSeller, async (req, res, next) => {
  try {
    const status = String(req.query.status || 'ALL').toUpperCase();
    if (status !== 'ALL' && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status filter: ${status}` });
    }
    const storeId = req.auth.sub;
    let where = 'o.store_id = $1';
    const params = [storeId];
    if (status === 'PROCESSING') {
      where += ` AND o.status IN ('PAID','FULFILLED')`;
    } else if (status !== 'ALL') {
      where += ` AND o.status = $${params.length + 1}`;
      params.push(status);
    }

    const [feed, counts] = await Promise.all([
      query(
        `SELECT o.id, o.order_number, o.customer_name, o.customer_phone,
                o.customer_address, o.total, o.total_amount, o.payment_method,
                o.status, o.payment_status, o.order_status, o.notes,
                o.created_at, o.updated_at,
                COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
                    'id',          i.id,
                    'productId',   i.product_id,
                    'variantId',   i.variant_id,
                    'productName', i.product_name,
                    'quantity',    i.quantity,
                    'unitPrice',   i.unit_price,
                    'totalPrice',  i.total_price
                  ) ORDER BY i.product_name)
                FILTER (WHERE i.id IS NOT NULL), '[]') AS items
           FROM orders o
           LEFT JOIN order_items i ON i.order_id = o.id
          WHERE ${where}
          GROUP BY o.id
          ORDER BY o.created_at DESC
          LIMIT 200`,
        params,
      ),
      query(
        // Console counts per canonical status, mapped to console tab labels.
        `SELECT CASE
                  WHEN status IN ('PAID','FULFILLED') THEN 'PROCESSING'
                  ELSE status END AS status,
                COUNT(*)::int AS n
           FROM orders WHERE store_id = $1 GROUP BY 1`,
        [storeId],
      ),
    ]);

    const countMap = { ALL: 0 };
    for (const r of counts.rows) {
      countMap[r.status] = r.n;
      countMap.ALL += r.n;
    }
    res.json({ orders: feed.rows.map(mapOrder), counts: countMap, currency: 'GHS' });
  } catch (err) {
    next(err);
  }
});

/* --------------------------- Fulfillment transition ------------------------ */
// PATCH /api/seller/orders/:id/status - order_status and/or payment_status
// in the console's vocabulary. Both translate to ONE canonical transition in
// services/orderLifecycle.js, so "mark payment received" credits the wallet
// and awards loyalty exactly like the POS/WhatsApp flows do.
//
// Accepted shapes (camelCase aliases also work):
//   { order_status: 'PROCESSING' | 'DELIVERED' | 'CANCELLED' }
//   { payment_status: 'PAID' }                     records the payment
//   { status: 'PAID'|'FULFILLED'|'DELIVERED'|'CANCELLED' }   canonical, direct
router.patch('/seller/orders/:id/status', authenticateSeller, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const b = req.body || {};

    let nextStatus = null;
    const paymentStatus = paymentParam(b);
    const orderStatus = orderParam(b);
    const canonical = canonicalParam(b);

    if (canonical) {
      nextStatus = canonical;
    } else if (paymentStatus) {
      nextStatus = paymentStatus === 'PAID' ? 'PAID' : null;
      if (paymentStatus === 'FAILED') {
        client.release();
        return res.status(409).json({
          error: 'Failed payments cannot be recorded here. Cancel the order or collect payment again.',
        });
      }
    } else if (orderStatus) {
      if (orderStatus === '__invalid__') {
        client.release();
        return res.status(400).json({ error: `Invalid order_status. Use ${ORDER_STATUSES.join('|')}.` });
      }
      nextStatus = CONSOLE_TO_CANONICAL[orderStatus] ?? null;
    }
    if (canonical === '__invalid__' || paymentStatus === '__invalid__') {
      client.release();
      return res.status(400).json({
        error: 'Invalid status value. Use status (PAID|FULFILLED|DELIVERED|CANCELLED), order_status (PROCESSING|DELIVERED|CANCELLED) or payment_status (PAID).',
      });
    }
    if (!nextStatus) {
      client.release();
      return res.status(400).json({
        error: 'Provide order_status (PROCESSING|DELIVERED|CANCELLED), payment_status (PAID), or status (PAID|FULFILLED|DELIVERED|CANCELLED).',
      });
    }

    await client.query('BEGIN');
    const lock = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND store_id = $2 FOR UPDATE',
      [req.params.id, req.auth.sub],
    );
    const order = lock.rows[0];
    if (!order) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Order not found for your store.' });
    }

    // A console "PROCESSING" step resolves to FULFILLED only when the money is
    // already in; otherwise the seller must record the payment first. This
    // prevents orders marked fulfilled without any wallet credit.
    const moved = await transitionOrder(client, {
      order,
      storeId: req.auth.sub,
      next: nextStatus,
    });

    await client.query('COMMIT');
    client.release();

    const idLine = `Order ${order.order_number} marked ${moved.status.toLowerCase()}.`;
    res.json({
      message: idLine + (moved.pointsAwarded > 0 ? ` ${moved.pointsAwarded} loyalty points awarded.` : ''),
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: moved.status,
        orderStatus: moved.order_status,
        paymentStatus: moved.payment_status,
        pointsAwarded: moved.pointsAwarded,
        paidAt: moved.paid_at,
      },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* noop */ }
    client.release();
    if (err.status) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    next(err);
  }
});

export default router;