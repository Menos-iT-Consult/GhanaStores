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
import { query, withTransaction } from '../config/database.js';
import {
  getSettings, paystackClient, hubtelClient, isPaystackReady, isHubtelReady,
} from './storePayments.js';
import { verifyHubtelTransaction } from './hubtelService.js';
import {
  paystackPlatformReady, verifyPlatformSignature, platformReferenceKind,
} from './paystackPlatform.js';
import { creditPurchase } from './smsQuota.js';
import { cycleInterval } from './planCatalog.js';
import { formatGhs } from '../utils/helpers.js';
import { sendMerchantPushNotification } from './pushService.js';
import { sendSubscriptionActiveSms } from './smsService.js';
import { sendLifecycleEmail } from './emailService.js';

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

  // Instant merchant push so the seller's phone confirms the money landed.
  // Fire-and-forget: the order is already committed, so a push failure here must
  // never affect the webhook's 200 response.
  if (order.store_id) {
    sendMerchantPushNotification({
      storeId: order.store_id,
      title: 'Payment received',
      body: `Payment received for Order #${order.order_number} - ${formatGhs(order.total, { symbol: true })}`,
      data: { type: 'order_paid', orderId: order.id, orderNumber: order.order_number },
    }).catch(() => {});
  }

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

  /* PLATFORM payments (GS-SUB-... subscriptions and GS-SMS-... SMS packs)
     are signed with the platform's own PAYSTACK_SECRET_KEY - they never touch
     a merchant's BYOK payment_settings. Domain purchases (GSD-...) are
     dispatched by the router, which needs domainService + store_domains, so
     only the two billing flows land here. Everything else - order numbers are
     GS-YYMMDD-... - falls through to the per-store order path below. */
  const platformKind = platformReferenceKind(payload?.data?.reference);
  if (platformKind === 'subscription' || platformKind === 'sms') {
    if (paystackPlatformReady()) {
      if (!verifyPlatformSignature(rawBody, signature)) {
        console.warn(`[payment-webhook] Paystack platform signature rejected for ${payload?.data?.reference}`);
        return { status: 401, body: { error: 'Invalid signature.' } };
      }
    } else if (process.env.NODE_ENV === 'production') {
      // Refuse rather than activate on a claim nobody can verify.
      return { status: 400, body: { error: 'Paystack is not configured on this platform.' } };
    } else {
      console.warn('[payment-webhook] PAYSTACK_SECRET_KEY is not set - accepting platform callback unverified (development only).');
    }

    const event = payload?.event;
    if (!paystackEventSucceeded(event)) {
      return { status: 200, body: { received: true, processed: false, ignored: event } };
    }
    const result = platformKind === 'subscription'
      ? await handlePaystackSubscriptionWebhook(payload)
      : await handlePaystackSmsPackWebhook(payload);
    return {
      status: 200,
      body: { received: true, processed: result.processed, reason: result.reason || undefined },
    };
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

/* --------------------------- Subscriptions (platform) ---------------------- */
// A subscription bought through the Hubtel HOSTED CHECKOUT (the fallback when
// MTN MoMo cannot complete the charge) is a PLATFORM-level Hubtel transaction,
// not a per-store BYOK one: it is authenticated by the platform webhook secret
// in the router, exactly like a domain purchase. Its reference is our own
// GS-SUB-... business reference, so the callback is joined back to the
// subscription_payments row (and the store) here. Unlike an MTN charge - which
// activates the plan synchronously in the route - a hosted checkout settles
// LATER, so THIS is the only place that flips the plan to paid. Missing this
// branch would take the seller's money and never activate anything.

/**
 * Find the subscription attempt a hosted-checkout callback refers to.
 * @returns {Promise<{id, store_id, plan_id, amount, cycle, status}|null>}
 */
export async function findSubscriptionByReference(reference) {
  if (!reference) return null;
  const { rows } = await query(
    `SELECT id, store_id, plan_id, amount, cycle, status, reference
       FROM subscription_payments WHERE reference = $1 LIMIT 1`,
    [String(reference).trim()],
  );
  return rows[0] || null;
}

/**
 * Settle a confirmed subscription payment. Shared by the Hubtel and Paystack
 * webhook paths - the guards are identical, only the provider label and the
 * amount source differ. The unique reference plus the PAID guard make a
 * double callback a no-op instead of a double extension of the paid period.
 */
async function settleSubscription(sub, { provider, paidAmountGhs = null, gatewayReference = null }) {
  // Idempotency: a replayed callback must not activate (and re-bill the period)
  // a second time.
  if (sub.status === 'PAID') {
    return { processed: false, reason: 'Already settled.' };
  }

  // Amount guard: if the callback carries an amount, it must match what we
  // asked for, so a payment for a different amount cannot activate this plan.
  if (paidAmountGhs !== null && Math.abs(Number(paidAmountGhs) - Number(sub.amount)) > 0.01) {
    console.warn(
      `[payment-webhook] subscription ${sub.reference || sub.id} amount ${paidAmountGhs} != ${sub.amount} - refused`,
    );
    return { processed: false, reason: 'Amount mismatch.' };
  }

  const cycle = sub.cycle || 'monthly';
  // Activate the tenant and close the payment row atomically, mirroring the
  // synchronous MTN path: plan_period_end is computed from the recorded cycle.
  await withTransaction(async (t) => {
    await t.query(
      `UPDATE stores
          SET status = 'ACTIVE', plan = $2, plan_cycle = $3,
              plan_period_end = NOW() + $4::INTERVAL
        WHERE id = $1 AND status <> 'SUSPENDED'`,
      [sub.store_id, sub.plan_id, cycle, cycleInterval(cycle)],
    );
    await t.query(
      `UPDATE subscription_payments
          SET status = 'PAID', provider = $2, gateway_reference = $3, paid_at = NOW(),
              period_start = NOW(), period_end = NOW() + $4::INTERVAL
        WHERE id = $1 AND status <> 'PAID'`,
      [sub.id, provider, gatewayReference, cycleInterval(cycle)],
    );
  });

  console.log(
    `[payment-webhook] subscription ${sub.reference || sub.id} settled via ${provider} `
    + `(store ${sub.store_id}, plan ${sub.plan_id}, ${cycle})`,
  );

  // Notify the merchant across SMS, email and push. All fire-and-forget so a
  // down gateway never unwinds the committed settlement.
  const store = await query(`SELECT name, email, phone, plan FROM stores WHERE id = $1`, [
    sub.store_id,
  ]).then((r) => r.rows[0]);

  if (store) {
    sendSubscriptionActiveSms(store, { planId: sub.plan_id, cycle }).catch(() => {});
    sendLifecycleEmail(store, 'subscription-active', {
      planId: sub.plan_id,
      cycle,
    }).catch(() => {});
  }

  // Let the merchant's phone know their plan went live.
  sendMerchantPushNotification({
    storeId: sub.store_id,
    title: 'Subscription active',
    body: `Your DiDwa plan (${sub.plan_id}) is now active.`,
    data: { type: 'subscription_active', planId: sub.plan_id },
  }).catch(() => {});

  return { processed: true, storeId: sub.store_id, planId: sub.plan_id };
}

/**
 * Activate a subscription after a Hubtel hosted-checkout payment is confirmed.
 *
 * @param {object} payload parsed Hubtel callback body
 * @returns {Promise<{processed: boolean, reason?: string, storeId?: string}>}
 */
export async function handleSubscriptionWebhook(payload = {}) {
  const reference = payload?.Data?.ClientReference || payload?.reference || '';
  const transactionId = payload?.Data?.TransactionId ?? payload?.TransactionId ?? null;
  const sub = await findSubscriptionByReference(reference);
  if (!sub) {
    return { processed: false, reason: 'Unknown subscription reference.' };
  }

  // Hubtel does NOT sign callbacks, so confirm the payment with Hubtel's own
  // status API before activating anything. A self-asserted "success" payload is
  // not sufficient - this is what makes hosted-checkout callbacks trustworthy.
  const verified = await verifyHubtelTransaction({ transactionId, reference });
  if (!verified.success) {
    console.warn(
      `[payment-webhook] subscription ${reference} rejected: ${verified.message || 'Hubtel verification failed'}`,
    );
    return { processed: false, reason: 'Transaction not confirmed by Hubtel.' };
  }

  const status = String(payload?.Data?.Status || payload?.status || '').toLowerCase();

  if (status !== 'success') {
    console.log('[payment-webhook] subscription callback: non-success status ignored:', status);
    return { processed: false, reason: 'Not a successful transaction.' };
  }

  const paidAmount = payload?.Data?.Amount ?? payload?.Amount ?? null;
  return settleSubscription(sub, {
    provider: 'HUBTEL',
    paidAmountGhs: paidAmount === null ? null : Number(paidAmount),
    gatewayReference: payload?.Data?.TransactionId ?? payload?.TransactionId ?? null,
  });
}

/**
 * Activate a subscription after a PAYSTACK hosted-checkout payment is
 * confirmed (the Fallback 2 leg). The signature was already verified by
 * handlePaystackWebhook - it covers the whole payload - so this handler owns
 * only the domain rules: replay and amount. Paystack reports `data.amount` in
 * PESEWAS, so it is converted to Cedis before the guard compares it against
 * the GHS column.
 */
export async function handlePaystackSubscriptionWebhook(payload = {}) {
  const reference = payload?.data?.reference || '';
  const sub = await findSubscriptionByReference(reference);
  if (!sub) {
    return { processed: false, reason: 'Unknown subscription reference.' };
  }
  const paidAmount = payload?.data?.amount;
  return settleSubscription(sub, {
    provider: 'PAYSTACK',
    paidAmountGhs: paidAmount == null ? null : Number(paidAmount) / 100,
    gatewayReference: payload?.data?.transaction_id ?? null,
  });
}

/* ----------------------------- SMS packs (platform) ------------------------ */
// Prepaid SMS segments bought via POST /api/sms-packs/buy settle synchronously
// on the MoMo rails. When every direct leg fails the route falls back to a
// hosted checkout (Hubtel, then Paystack) carrying the SAME GS-SMS- reference:
// money then moves later, and THIS webhook is the only place that credits the
// segments. The PAID update and the credit share one transaction - the same
// rule the synchronous path follows - so a crash can never leave a paid row
// with no balance, or a balance nobody paid for.

/**
 * Find the SMS pack attempt a hosted-checkout callback refers to.
 * @returns {Promise<{id, store_id, segments, amount, status}|null>}
 */
export async function findSmsPackByReference(reference) {
  if (!reference) return null;
  const { rows } = await query(
    `SELECT id, store_id, segments, amount, status, reference
       FROM sms_pack_payments WHERE reference = $1 LIMIT 1`,
    [String(reference).trim()],
  );
  return rows[0] || null;
}

/**
 * Credit a confirmed SMS pack payment. Shared by the Hubtel and Paystack
 * webhook paths - the guards are identical, only the provider label and the
 * amount source differ.
 */
async function settleSmsPack(pack, { provider, paidAmountGhs = null, gatewayReference = null }) {
  // Idempotency: a replayed callback must not credit the same segments twice.
  if (pack.status === 'PAID') {
    return { processed: false, reason: 'Already settled.' };
  }

  // Amount guard: a payment for a different amount cannot unlock this pack.
  if (paidAmountGhs !== null && Math.abs(Number(paidAmountGhs) - Number(pack.amount)) > 0.01) {
    console.warn(
      `[payment-webhook] sms pack ${pack.reference || pack.id} amount ${paidAmountGhs} != ${pack.amount} - refused`,
    );
    return { processed: false, reason: 'Amount mismatch.' };
  }

  await withTransaction(async (t) => {
    await t.query(
      `UPDATE sms_pack_payments
          SET status = 'PAID', provider = $2, gateway_reference = $3, paid_at = NOW()
        WHERE id = $1 AND status <> 'PAID'`,
      [pack.id, provider, gatewayReference],
    );
    return creditPurchase(pack.store_id, pack.segments, t);
  });

  console.log(
    `[payment-webhook] sms pack ${pack.reference || pack.id} credited ${pack.segments} segments `
    + `via ${provider} (store ${pack.store_id})`,
  );
  return { processed: true, storeId: pack.store_id, segments: pack.segments };
}

/**
 * Credit SMS segments after a Hubtel hosted-checkout payment is confirmed.
 * @param {object} payload parsed Hubtel callback body
 */
export async function handleSmsPackWebhook(payload = {}) {
  const reference = payload?.Data?.ClientReference || payload?.reference || '';
  const transactionId = payload?.Data?.TransactionId ?? payload?.TransactionId ?? null;
  const pack = await findSmsPackByReference(reference);
  if (!pack) {
    return { processed: false, reason: 'Unknown SMS pack reference.' };
  }

  const verified = await verifyHubtelTransaction({ transactionId, reference });
  if (!verified.success) {
    console.warn(
      `[payment-webhook] sms pack ${reference} rejected: ${verified.message || 'Hubtel verification failed'}`,
    );
    return { processed: false, reason: 'Transaction not confirmed by Hubtel.' };
  }

  const status = String(payload?.Data?.Status || payload?.status || '').toLowerCase();
  if (status !== 'success') {
    console.log('[payment-webhook] sms pack callback: non-success status ignored:', status);
    return { processed: false, reason: 'Not a successful transaction.' };
  }
  const paidAmount = payload?.Data?.Amount ?? payload?.Amount ?? null;
  return settleSmsPack(pack, {
    provider: 'HUBTEL',
    paidAmountGhs: paidAmount === null ? null : Number(paidAmount),
    gatewayReference: transactionId,
  });
}

/**
 * Credit SMS segments after a PAYSTACK hosted-checkout payment is confirmed
 * (the Fallback 2 leg). The signature was verified upstream by
 * handlePaystackWebhook; `data.amount` is converted from pesewas to Cedis.
 */
export async function handlePaystackSmsPackWebhook(payload = {}) {
  const reference = payload?.data?.reference || '';
  const pack = await findSmsPackByReference(reference);
  if (!pack) {
    return { processed: false, reason: 'Unknown SMS pack reference.' };
  }
  const paidAmount = payload?.data?.amount;
  return settleSmsPack(pack, {
    provider: 'PAYSTACK',
    paidAmountGhs: paidAmount == null ? null : Number(paidAmount) / 100,
    gatewayReference: payload?.data?.transaction_id ?? null,
  });
}

export default {
  handlePaystackWebhook, handleHubtelWebhook, findOrderByReference,
  findSubscriptionByReference, handleSubscriptionWebhook,
  findSmsPackByReference, handleSmsPackWebhook,
  handlePaystackSubscriptionWebhook, handlePaystackSmsPackWebhook,
};
