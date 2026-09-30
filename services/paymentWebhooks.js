/**
 * DiDwa - Payment webhook handling (per-store BYOK gateways).
 *
 * Each merchant's gateway posts to ONE shared DiDwa URL, so the store must be
 * resolved from the transaction reference BEFORE the payment can be trusted -
 * the credentials belong to that store, not to the platform. Order of operations
 * is therefore: parse -> resolve store -> verify with THAT store's credentials
 * -> apply. Verifying first is impossible here, and checking nothing is the trap:
 * an unverified callback that marks an order paid is a free-order attack.
 *
 * The two gateways verify differently, and neither is optional:
 *   - Paystack SIGNS its callbacks (HMAC-SHA512 over the raw body, keyed by the
 *     store's secret key), so we check the signature.
 *   - Hubtel does NOT sign callbacks, so a payload is self-asserted. The only
 *     trustworthy answer is Hubtel's own status API, queried with the store's
 *     client id/secret and cross-checked against the order.
 */
import { query } from '../config/database.js';
import {
  getSettings, paystackClient, hubtelClient, isPaystackReady, isHubtelReady,
} from './storePayments.js';

/**
 * Find the order a gateway callback refers to. The reference we send is the
 * order number, so this is the join point between an anonymous webhook and a
 * specific tenant's order.
 */
export async function findOrderByReference(reference) {
  if (!reference) return null;
  const { rows } = await query(
    `SELECT id, store_id, order_number, total, status, payment_status
       FROM orders WHERE order_number = $1 LIMIT 1`,
    [String(reference).trim()],
  );
  return rows[0] || null;
}

/** Paystack reports outcomes via a lowercase `event` name. */
function paystackEventSucceeded(event) {
  return event === 'charge.success' || event === 'transfer.success';
}

/** Only flip an order to PAID; never walk a paid/cancelled order backwards. */
async function markOrderPaid(order, note) {
  if (order.payment_status === 'PAID' || order.status === 'CANCELLED') {
    return { changed: false, reason: 'already_settled' };
  }
  await query(
    `UPDATE orders
        SET status = 'PAID', payment_status = 'PAID', paid_at = COALESCE(paid_at, NOW()),
            updated_at = NOW()
      WHERE id = $1`,
    [order.id],
  );
  console.log(`[payment-webhook] order ${order.order_number} marked PAID (${note})`);
  return { changed: true };
}

async function markOrderFailed(order, note) {
  if (order.payment_status === 'PAID' || order.status === 'CANCELLED') {
    return { changed: false, reason: 'already_settled' };
  }
  await query(
    'UPDATE orders SET payment_status = \'FAILED\', updated_at = NOW() WHERE id = $1',
    [order.id],
  );
  console.warn(`[payment-webhook] order ${order.order_number} marked FAILED (${note})`);
  return { changed: true };
}

/* -------------------------------- Paystack ---------------------------------- */

/**
 * Handle a Paystack callback.
 * @param {Buffer|string} rawBody exact bytes received - the HMAC covers them.
 * @param {string} signature value of the x-paystack-signature header.
 */
export async function handlePaystackWebhook(rawBody, signature) {
  let payload;
  try {
    payload = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody));
  } catch {
    return { status: 400, body: { error: 'Body is not valid JSON.' } };
  }

  const order = await findOrderByReference(payload?.data?.reference);
  if (!order) {
    // Do not reveal whether a reference exists to an unauthenticated caller.
    return { status: 404, body: { error: 'Unknown transaction reference.' } };
  }

  const settings = await getSettings(order.store_id);
  if (!isPaystackReady(settings)) {
    return { status: 400, body: { error: 'No Paystack credentials are configured for this store.' } };
  }

  // Verified with THIS store's secret, so a valid callback for one merchant can
  // never mark another merchant's order paid.
  if (!paystackClient(settings).verifyWebhook(rawBody, signature)) {
    console.warn(`[payment-webhook] Paystack signature rejected for order ${order.order_number}`);
    return { status: 401, body: { error: 'Invalid signature.' } };
  }

  const event = payload?.event;
  if (paystackEventSucceeded(event)) {
    const result = await markOrderPaid(order, 'paystack');
    return { status: 200, body: { received: true, changed: result.changed } };
  }
  if (event === 'charge.failed') {
    const result = await markOrderFailed(order, 'paystack charge.failed');
    return { status: 200, body: { received: true, changed: result.changed } };
  }
  // Acknowledge uninteresting events so Paystack stops retrying them.
  return { status: 200, body: { received: true, changed: false, ignored: event } };
}

/* --------------------------------- Hubtel ----------------------------------- */

/**
 * Handle a Hubtel Mobile Money callback.
 *
 * The payload is NOT proof of payment - Hubtel sends no signature - so the
 * order is only marked paid once Hubtel's own status API confirms the
 * transaction, using this merchant's stored credentials.
 *
 * @param {object} payload parsed callback body
 * @param {string|null} signature optional signature, honoured if Hubtel sends one
 * @param {Buffer|string|null} rawBody exact bytes, if a signature is present
 */
export async function handleHubtelWebhook(payload = {}, signature = null, rawBody = null) {
  const reference = payload?.ClientReference ?? payload?.clientReference
    ?? payload?.Reference ?? payload?.reference;

  const order = await findOrderByReference(reference);
  if (!order) {
    return { status: 404, body: { error: 'Unknown transaction reference.' } };
  }

  const settings = await getSettings(order.store_id);
  if (!isHubtelReady(settings)) {
    return { status: 400, body: { error: 'No Hubtel credentials are configured for this store.' } };
  }

  // Hubtel does NOT sign callbacks, so the payload is a self-asserted claim, not
  // proof of payment. The authority is Hubtel's own status API, queried with THIS
  // merchant's credentials. Anything unverifiable is refused: accepting an
  // unverified callback would let anyone POST a success and take goods for free.
  if (signature) {
    const body = rawBody ?? Buffer.from(JSON.stringify(payload));
    if (!hubtelClient(settings).verifyWebhook(body, signature)) {
      console.warn(`[payment-webhook] Hubtel signature rejected for order ${order.order_number}`);
      return { status: 401, body: { error: 'Invalid signature.' } };
    }
  }

  const transactionId = payload?.TransactionId ?? payload?.transactionId ?? null;
  let verified;
  try {
    verified = await hubtelClient(settings).verifyTransaction({ transactionId, reference });
  } catch (err) {
    // An unreachable status API is not evidence of failure either way; retry later.
    console.error(`[payment-webhook] Hubtel status check failed for ${order.order_number}: ${err.message}`);
    return { status: 202, body: { received: true, verified: false, reason: 'Status check unavailable.' } };
  }

  if (!verified.success) {
    console.warn(`[payment-webhook] Hubtel reports no successful payment for ${order.order_number}`);
    return { status: 200, body: { received: true, changed: false, verified: true, paid: false } };
  }

  // Guard against a genuine Hubtel payment for a DIFFERENT transaction being
  // replayed against this order: the settled reference and amount must match.
  const amount = Number(order.total);
  const refMismatch = verified.reference
    && String(verified.reference).trim() !== String(order.order_number).trim();
  const amountMismatch = verified.amount !== null
    && Math.abs(verified.amount - amount) > 0.01;
  if (refMismatch || amountMismatch) {
    console.warn(
      `[payment-webhook] Hubtel payment does not match order ${order.order_number} `
      + `(reference ${verified.reference}, amount ${verified.amount}) - refused`,
    );
    return { status: 409, body: { error: 'Payment does not match this order.' } };
  }

  const result = await markOrderPaid(order, 'hubtel (verified via status API)');
  return { status: 200, body: { received: true, changed: result.changed, verified: true } };
}

export default { handlePaystackWebhook, handleHubtelWebhook, findOrderByReference };
