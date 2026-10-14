/**
 * DiDwa - Mobile Merchant API (/api/mobile/v1)
 *
 * The seller mobile app's dashboard surface. Every route is authenticated by the
 * mobile bearer token (authenticateMobileToken), which loads the store from the
 * token subject - a client can never target another store by passing a store id.
 *
 * These wrap the SAME canonical data and lifecycle as the PWA (services/
 * orderLifecycle.js, services/storePayments.js) rather than reimplementing it,
 * so a status change made in the app and one made in the dashboard are
 * indistinguishable to the ledger. Where an action should alert the merchant's
 * other devices (a status change), it fires a push via services/pushService.js.
 */
import { Router } from 'express';
import { pool, query } from '../config/database.js';
import { authenticateMobileToken } from '../middleware/authMiddleware.js';
import {
  deriveOrderStatus,
  derivePaymentStatus,
  transitionOrder,
} from '../services/orderLifecycle.js';
import { sendMerchantPushNotification } from '../services/pushService.js';
import { formatGhs } from '../utils/helpers.js';
import { getSettings, saveSettings, toClientView } from '../services/storePayments.js';
import { encryptionConfigured } from '../services/secretBox.js';

const router = Router();

const CANONICAL = ['PENDING', 'PAID', 'FULFILLED', 'DELIVERED', 'CANCELLED'];

/**
 * Mobile order tab -> the canonical statuses it should include. `null` means
 * "no status filter" (all). Exported for the test suite.
 */
export function orderFilterToStatuses(filter) {
  switch (String(filter || 'all').toLowerCase()) {
    case 'pending':
      return ['PENDING'];
    case 'dispatched':
      return ['PAID', 'FULFILLED'];
    case 'completed':
      return ['DELIVERED'];
    case 'all':
    default:
      return null;
  }
}

/** Compact order shape for the mobile list. */
function slimOrder(r) {
  return {
    id: r.id,
    orderNumber: r.order_number,
    customer: {
      name: r.customer_name,
      phone: r.customer_phone,
      address: r.customer_address,
    },
    totalAmount: Number(r.total_amount ?? r.total ?? 0),
    paymentMethod: r.payment_method,
    orderStatus: deriveOrderStatus(r.status),
    paymentStatus: derivePaymentStatus(r.status),
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/* ------------------------------ Dashboard stats ---------------------------- */
router.get('/dashboard/stats', authenticateMobileToken, async (req, res, next) => {
  try {
    const [rev, counts] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(total) FILTER (WHERE status IN ('PAID','FULFILLED','DELIVERED')
                                            AND created_at >= date_trunc('day', NOW())), 0)::numeric(12,2) AS today_revenue,
                COALESCE(SUM(total) FILTER (WHERE status IN ('PAID','FULFILLED','DELIVERED')), 0)::numeric(14,2) AS total_revenue
           FROM orders WHERE store_id = $1`,
        [req.storeId],
      ),
      query(
        `SELECT COUNT(*)::int AS total_orders,
                COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_orders
           FROM orders WHERE store_id = $1`,
        [req.storeId],
      ),
    ]);
    res.json({
      todayRevenue: Number(rev.rows[0].today_revenue),
      totalRevenue: Number(rev.rows[0].total_revenue),
      totalOrders: counts.rows[0].total_orders,
      pendingOrders: counts.rows[0].pending_orders,
      currency: 'GHS',
    });
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------- Orders --------------------------------- */
// Paginated, status-filtered feed. The filter vocabulary is mobile-friendly
// (pending / dispatched / completed) and maps onto canonical status here.
router.get('/orders', authenticateMobileToken, async (req, res, next) => {
  try {
    const filter = String(req.query.filter || 'all').toLowerCase();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const statuses = orderFilterToStatuses(filter);

    const params = [req.storeId];
    let where = 'o.store_id = $1';
    if (statuses) {
      params.push(statuses);
      where += ` AND o.status = ANY ($${params.length}::text[])`;
    }

    const [totalRes, feed] = await Promise.all([
      query(`SELECT COUNT(*)::int AS n FROM orders o WHERE ${where}`, params),
      query(
        `SELECT o.id, o.order_number, o.customer_name, o.customer_phone, o.customer_address,
                o.total, o.total_amount, o.payment_method, o.status, o.notes,
                o.created_at, o.updated_at
           FROM orders o
          WHERE ${where}
          ORDER BY o.created_at DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, (page - 1) * limit],
      ),
    ]);

    const total = totalRes.rows[0].n;
    res.json({
      orders: feed.rows.map(slimOrder),
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (err) {
    next(err);
  }
});

/* ---------------------------- Order detail (by id) ------------------------- */
// The order-detail screen and push deep-links reference a single order by id;
// the list endpoint is paginated so it can't reliably surface it. Same slim
// shape as the list, scoped to the signed-in store.
router.get('/orders/:id', authenticateMobileToken, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT o.id, o.order_number, o.customer_name, o.customer_phone, o.customer_address,
              o.total, o.total_amount, o.payment_method, o.status, o.notes,
              o.created_at, o.updated_at
         FROM orders o
        WHERE o.id = $1 AND o.store_id = $2
        LIMIT 1`,
      [req.params.id, req.storeId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found for your store.' });
    res.json({ order: slimOrder(rows[0]) });
  } catch (err) {
    next(err);
  }
});

/* --------------------------- Orders: status update ------------------------- */
// Canonical status transition via the single source of truth, then a push to the
// merchant's devices so any other logged-in phone sees it instantly.
router.patch('/orders/:id/status', authenticateMobileToken, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const next = String(req.body?.status || '').toUpperCase();
    if (!CANONICAL.includes(next)) {
      client.release();
      return res.status(400).json({ error: `status must be one of ${CANONICAL.join('|')}.` });
    }

    await client.query('BEGIN');
    const lock = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND store_id = $2 FOR UPDATE',
      [req.params.id, req.storeId],
    );
    const order = lock.rows[0];
    if (!order) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Order not found for your store.' });
    }

    const moved = await transitionOrder(client, { order, storeId: req.storeId, next });
    await client.query('COMMIT');
    client.release();

    sendMerchantPushNotification({
      storeId: req.storeId,
      title: 'Order updated',
      body: `Order ${order.order_number} is now ${moved.status.toLowerCase()}.`,
      data: { type: 'order_status', orderId: order.id, orderNumber: order.order_number, status: moved.status },
    }).catch(() => {});

    res.json({
      message: `Order ${order.order_number} marked ${moved.status.toLowerCase()}.`,
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
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });
    next(err);
  }
});

/* --------------------------------- Products -------------------------------- */
router.get('/products', authenticateMobileToken, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.id, p.name, p.category, p.image_url, p.price, p.is_active,
              COALESCE(json_agg(json_build_object(
                  'id', v.id,
                  'optionName', v.option_name,
                  'optionValue', v.option_value,
                  'priceOverride', v.price_override,
                  'stockQuantity', v.stock_quantity
                ) ORDER BY v.option_name, v.option_value)
              FILTER (WHERE v.id IS NOT NULL), '[]') AS variants
         FROM products p
         LEFT JOIN product_variants v ON v.product_id = p.id
        WHERE p.store_id = $1
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT 200`,
      [req.storeId],
    );
    res.json({
      products: rows.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        imageUrl: r.image_url,
        price: Number(r.price),
        isActive: r.is_active,
        variants: r.variants,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------ Products: availability toggle -------------------- */
// Quick "in stock / sold out" switch: maps directly onto products.is_active.
router.patch('/products/:id/stock', authenticateMobileToken, async (req, res, next) => {
  try {
    const raw = req.body?.is_active ?? req.body?.isActive;
    if (typeof raw !== 'boolean') {
      return res.status(400).json({ error: 'Provide is_active (true|false) to toggle availability.' });
    }
    const { rows } = await query(
      'UPDATE products SET is_active = $2 WHERE id = $1 AND store_id = $3 RETURNING id, name, is_active',
      [req.params.id, raw, req.storeId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found for your store.' });
    res.json({ product: { id: rows[0].id, name: rows[0].name, isActive: rows[0].is_active } });
  } catch (err) {
    next(err);
  }
});

/* ---------------------------- Products: quick price ----------------------- */
// Price quick-edit from the mobile product list. Mirrors the stock toggle:
// store-scoped, returns the persisted value so the client never trusts its own
// optimistic number.
router.patch('/products/:id/price', authenticateMobileToken, async (req, res, next) => {
  try {
    const price = Number(req.body?.price);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: 'Provide a valid non-negative price.' });
    }
    const { rows } = await query(
      'UPDATE products SET price = $2 WHERE id = $1 AND store_id = $3 RETURNING id, name, price',
      [req.params.id, price.toFixed(2), req.storeId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found for your store.' });
    res.json({ product: { id: rows[0].id, name: rows[0].name, price: Number(rows[0].price) } });
  } catch (err) {
    next(err);
  }
});

/* --------------------------- Settings: payment keys ------------------------ */
// Thin, mobile-facing wrappers over the BYOK storePayments service, identical to
// the PWA's /api/payment-settings: GET returns masks (never secrets), POST saves
// keys with the "blank means keep the stored value" merge.
const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? null : String(v).trim() || null);

function parsePaymentKeys(b = {}) {
  return {
    paystackPublicKey: str(b.paystackPublicKey),
    paystackSecretKey: str(b.paystackSecretKey),
    hubtelClientId: str(b.hubtelClientId),
    hubtelClientSecret: str(b.hubtelClientSecret),
    hubtelMerchantAccountId: str(b.hubtelMerchantAccountId),
    enableCod: b.enableCod !== false && b.enableCod !== 'false',
    activeGateway: String(b.activeGateway || 'COD').toUpperCase(),
  };
}

async function mergeWithStored(storeId, input) {
  const stored = (await getSettings(storeId)) || {};
  const pick = (incoming, existing) => (incoming == null ? existing || null : incoming);
  return {
    paystackPublicKey: pick(input.paystackPublicKey, stored.paystackPublicKey),
    paystackSecretKey: pick(input.paystackSecretKey, stored.paystackSecretKey),
    hubtelClientId: pick(input.hubtelClientId, stored.hubtelClientId),
    hubtelClientSecret: pick(input.hubtelClientSecret, stored.hubtelClientSecret),
    hubtelMerchantAccountId: pick(input.hubtelMerchantAccountId, stored.hubtelMerchantAccountId),
    enableCod: input.enableCod,
    activeGateway: input.activeGateway,
  };
}

router.get('/settings/payment-keys', authenticateMobileToken, async (req, res, next) => {
  try {
    const settings = await getSettings(req.storeId);
    res.json({ settings: toClientView(settings), storageConfigured: encryptionConfigured() });
  } catch (err) {
    next(err);
  }
});

router.post('/settings/payment-keys', authenticateMobileToken, async (req, res, next) => {
  try {
    if (!encryptionConfigured()) {
      return res.status(503).json({ error: 'Secure key storage is not configured on the server.' });
    }
    const merged = await mergeWithStored(req.storeId, parsePaymentKeys(req.body));
    const saved = await saveSettings(req.storeId, merged);
    res.json({ settings: toClientView(saved) });
  } catch (err) {
    next(err);
  }
});

export default router;


