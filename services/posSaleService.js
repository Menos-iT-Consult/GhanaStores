/**
 * DiDwa - Shared POS sale engine.
 *
 * ONE implementation of an in-store sale used by BOTH the PWA
 * (routes/posRoutes.js POST /sales) and the seller mobile app
 * (routes/mobileRoutes.js POST /pos/sales), so a sale rung on the phone
 * and one rung on the dashboard are indistinguishable to the ledger.
 *
 * Semantics preserved from the original PWA route:
 *   - idempotencyKey -> client_reference dedupe (offline replay safe)
 *   - atomic variant lock + stock decrement + loyalty in one transaction
 *   - MoMo collection (MTN-first, Hubtel fallback) BEFORE the order row
 *   - redeem capped server-side against the real balance (offline cap-note)
 *   - low-stock SMS latch via the inventory alert pipeline (fire-and-forget)
 *
 * Throws Error objects with `.status` (402/404/409/400) for client faults so
 * the central errorMiddleware renders them; routes only translate success.
 */
import { pool } from '../config/database.js';
import { routeCollection } from './paymentRouter.js';
import {
  normalizeGhPhone, generateOrderNumber, pointsForSpend,
  redeemValue, toIntOr, money,
} from '../utils/helpers.js';
import {
  collectLowStockCandidate, persistAlertFlag, dispatchLowStockAlerts,
} from '../routes/inventoryRoutes.js';

/**
 * @param {object} args
 * @param {string} args.storeId    tenant being charged
 * @param {string} [args.storePhone] fallback MoMo payer when no customer phone
 * @param {object} args.body       { items:[{variantId,quantity}], paymentMethod,
 *                                 momoNetwork, customerPhone, customerName,
 *                                 redeemPoints, notes, idempotencyKey }
 * @returns {Promise<{ status:number, json:object, alertCandidates:Array }>}
 */
export async function runPosSale({ storeId, storePhone, body = {} }) {
  const b = body;
  const clientReference = String(b.idempotencyKey || '').trim().slice(0, 120) || null;
  const client = await pool.connect();
  const release = () => { try { client.release(); } catch { /* noop */ } };
  try {
    // Idempotent replay: an offline sale retried with the same saleId returns
    // the original order instead of double-charging or double-decrementing.
    if (clientReference) {
      const existing = await client.query(
        `SELECT id, order_number, total, subtotal, discount_amount,
                points_earned, points_redeemed, notes
           FROM orders WHERE store_id = $1 AND client_reference = $2`,
        [storeId, clientReference],
      );
      if (existing.rows[0]) {
        release();
        return {
          status: 200,
          replayed: true,
          json: {
            message: `Sale ${existing.rows[0].order_number} was already recorded.`,
            order: {
              ...existing.rows[0],
              order_number: existing.rows[0].order_number,
              total: Number(existing.rows[0].total),
              subtotal: Number(existing.rows[0].subtotal),
              discount: Number(existing.rows[0].discount_amount),
              pointsEarned: existing.rows[0].points_earned,
              pointsRedeemed: existing.rows[0].points_redeemed,
            },
          },
          alertCandidates: [],
        };
      }
    }

    const items = Array.isArray(b.items) ? b.items : [];
    const paymentMethod = ['CASH', 'MOMO'].includes(b.paymentMethod) ? b.paymentMethod : 'CASH';
    if (items.length === 0) {
      throw Object.assign(new Error('Cart is empty.'), { status: 400 });
    }

    const customerPhone = b.customerPhone ? normalizeGhPhone(b.customerPhone) : null;
    if (b.customerPhone && !customerPhone) {
      throw Object.assign(new Error('Customer phone must be a valid Ghana number.'), { status: 400 });
    }

    await client.query('BEGIN');

    // ---- Lock + validate variants, compute totals, decrement stock ----
    const lineItems = [];
    let subtotal = 0;
    const alertCandidates = [];

    for (const raw of items) {
      const qty = toIntOr(raw.quantity, 0);
      if (qty <= 0) continue;
      const lock = await client.query(
        `SELECT v.*, p.name AS product_name, p.price AS base_price
           FROM product_variants v
           JOIN products p ON p.id = v.product_id
          WHERE v.id = $1 AND v.store_id = $2
            FOR UPDATE OF v`,
        [raw.variantId, storeId],
      );
      const v = lock.rows[0];
      if (!v) {
        throw Object.assign(new Error('A cart item no longer exists in your catalog.'), { status: 404 });
      }
      if (Number(v.stock_quantity) < qty) {
        throw Object.assign(
          new Error(`Insufficient stock for ${v.product_name} (${v.option_value}). Available: ${v.stock_quantity}.`),
          { status: 409, code: 'INSUFFICIENT_STOCK' },
        );
      }
      const unitPrice = Number(v.price_override ?? v.base_price);
      const lineTotal = money(unitPrice * qty);
      subtotal = money(subtotal + lineTotal);
      lineItems.push({
        variantId: v.id,
        productName: v.product_name,
        variantLabel: `${v.option_name}: ${v.option_value}`,
        unitPrice,
        quantity: qty,
        lineTotal,
      });

      const upd = await client.query(
        `UPDATE product_variants
            SET stock_quantity = stock_quantity - $2, updated_at = NOW()
          WHERE id = $1
          RETURNING stock_quantity, low_stock_threshold, low_stock_alert_sent`,
        [v.id, qty],
      );
      const after = upd.rows[0];
      if (collectLowStockCandidate(after)) {
        alertCandidates.push({
          id: v.id,
          product_name: v.product_name,
          option_value: v.option_value,
          stock_quantity: after.stock_quantity,
        });
        await persistAlertFlag(
          { query: (text, params) => client.query(text, params) }, v.id, true,
        );
      }
    }

    if (lineItems.length === 0) {
      throw Object.assign(new Error('Cart has no valid quantities.'), { status: 400 });
    }
    /* ---- Loyalty config + redemption ---- */
    const storeCfg = await client.query(
      'SELECT loyalty_points_per_ghs, loyalty_point_value, name FROM stores WHERE id = $1',
      [storeId],
    );
    const { loyalty_points_per_ghs, loyalty_point_value, name: storeName } = storeCfg.rows[0];

    // Redeem is capped against the REAL balance read inside this transaction,
    // so an offline sale that guessed high can never overdraw: the discount is
    // the min of (requested points value, subtotal), and the receipt notes any
    // shortfall via pointsRedeemed < requested.
    let discount = 0;
    let pointsRedeemed = 0;
    let customerId = null;

    if (customerPhone && b.redeemPoints) {
      const custLock = await client.query(
        `SELECT id, loyalty_points FROM customers
          WHERE store_id = $1 AND phone = $2 FOR UPDATE`,
        [storeId, customerPhone],
      );
      const cust = custLock.rows[0];
      if (cust && cust.loyalty_points > 0) {
        pointsRedeemed = Math.max(0, Math.min(toIntOr(b.redeemPoints, 0), cust.loyalty_points));
        discount = Math.min(redeemValue(pointsRedeemed, loyalty_point_value), subtotal);
        if (pointsRedeemed > 0) {
          await client.query(
            'UPDATE customers SET loyalty_points = loyalty_points - $2 WHERE id = $1',
            [cust.id, pointsRedeemed],
          );
          customerId = cust.id;
        }
      }
    }

    const total = money(Math.max(0, subtotal - discount));
    const pointsEarned = pointsForSpend(total, loyalty_points_per_ghs);
    const orderNumber = generateOrderNumber();

    /* ---- MoMo collection (MTN-first, Hubtel fallback) before crediting wallet ---- */
    let momoRef = null;
    let momoProvider = null;
    if (paymentMethod === 'MOMO') {
      const payPhone = customerPhone || normalizeGhPhone(storePhone);
      const collect = await routeCollection({
        customerMsisdn: payPhone,
        amount: total,
        network: b.momoNetwork || 'MTN',
        description: `${storeName} POS sale ${orderNumber}`,
        clientReference: orderNumber,
      });
      if (!collect.success) {
        throw Object.assign(new Error(collect.message || 'MoMo payment was not approved.'), { status: 402 });
      }
      momoRef = collect.reference;
      momoProvider = collect.provider || 'HUBTEL';
    }

    /* ---- Persist order + items ---- */
    const orderIns = await client.query(
      `INSERT INTO orders
         (store_id, order_number, customer_id, customer_name, customer_phone,
          channel, payment_method, status, subtotal, discount_amount,
          points_earned, points_redeemed, total, notes, paid_at, client_reference)
       VALUES ($1,$2,$3,$4,$5,'POS',$6,'PAID',$7,$8,$9,$10,$11,$12, NOW(),$13)
       RETURNING id, order_number, total`,
      [storeId, orderNumber, customerId, b.customerName || 'Walk-in customer',
        customerPhone, paymentMethod, subtotal, discount,
        pointsEarned, pointsRedeemed, total, clientReference,
        momoRef ? `MoMo ref ${momoRef} via ${momoProvider || 'HUBTEL'}` : (b.notes || null)],
    );
    const order = orderIns.rows[0];

    for (const li of lineItems) {
      await client.query(
        `INSERT INTO order_items
           (store_id, order_id, variant_id, product_name, variant_label, unit_price, quantity, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [storeId, order.id, li.variantId, li.productName,
          li.variantLabel, li.unitPrice, li.quantity, li.lineTotal],
      );
    }

    /* ---- Upsert loyalty ledger. No wallet credit: POS MoMo money is collected
       straight into the merchant's own Hubtel/MTN account, so DiDwa never held
       it and has no balance to credit. ---- */
    if (customerPhone) {
      await client.query(
        `INSERT INTO customers (store_id, name, phone, loyalty_points, total_spent, orders_count)
         VALUES ($1,NULLIF($2,''),$3,$4,$5,1)
         ON CONFLICT (store_id, phone) DO UPDATE SET
           loyalty_points = customers.loyalty_points + $4 - $6::int,
           total_spent    = customers.total_spent + $5,
           orders_count   = customers.orders_count + 1,
           name           = COALESCE(NULLIF($2,''), customers.name)`,
        // $6 carries redeemed points so the earn+redeem land atomically.
        [storeId, b.customerName || '', customerPhone, pointsEarned, total, pointsRedeemed],
      );
    }

    await client.query('COMMIT');
    release();

    if (alertCandidates.length > 0) {
      dispatchLowStockAlerts(storeId, alertCandidates).catch(() => {});
    }

    return {
      status: 201,
      replayed: false,
      json: {
        message: `Sale ${order.order_number} recorded. ${paymentMethod === 'CASH' ? 'Cash' : 'MoMo'} collected.`,
        order: {
          ...order,
          total: Number(order.total),
          subtotal, discount, paymentMethod, momoRef,
          momoProvider, pointsEarned, pointsRedeemed,
        },
      },
      alertCandidates,
    };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* noop */ }
    release();
    throw err;
  }
}
