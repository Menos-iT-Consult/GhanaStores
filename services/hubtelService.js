/**
 * DiDwa - Hubtel Mobile Money Service
 * Collections (Receive Money) + Instant Disbursements (Send Money).
 * https://developers.hubtel.com/
 *
 * DRY_RUN mode activates automatically when credentials are missing,
 * returning deterministic simulated results so the full payout and POS
 * flows remain demoable without live keys.
 */
import axios from 'axios';
import crypto from 'node:crypto';

const CLIENT_ID = process.env.HUBTEL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.HUBTEL_CLIENT_SECRET || '';
const MERCHANT_ACCOUNT = process.env.HUBTEL_MERCHANT_ACCOUNT || '';
const BASE_URL = process.env.HUBTEL_BASE_URL || 'https://api-txn.hubtel.com';
const CALLBACK_URL = process.env.HUBTEL_CALLBACK_URL || '';

/** Vercel serverless functions hard-kill at their maxDuration (10s on Hobby),
 *  so live gateway calls must give up well before that or a stale request
 *  would 504 after money has already moved. */
const ON_VERCEL = Boolean(process.env.VERCEL);

export const hubtelDryRun = !(CLIENT_ID && CLIENT_SECRET && MERCHANT_ACCOUNT);

const http = axios.create({
  baseURL: BASE_URL,
  timeout: ON_VERCEL ? 8_000 : 25_000,
  auth: { username: CLIENT_ID, password: CLIENT_SECRET },
  headers: { 'Content-Type': 'application/json' },
});

/** Internal network label -> Hubtel channel identifier. */
const CHANNEL_MAP = {
  MTN: 'mtn-gh',
  VODAFONE: 'vodafone-gh',   // Telecel/Vodafone Ghana
  AT: 'airteltigo-gh',       // AT Money (AirtelTigo)
};
// Allow operators to override Hubtel channel codes without a code change.
if (process.env.HUBTEL_CHANNEL_MTN) CHANNEL_MAP.MTN = process.env.HUBTEL_CHANNEL_MTN;
if (process.env.HUBTEL_CHANNEL_VODAFONE) CHANNEL_MAP.VODAFONE = process.env.HUBTEL_CHANNEL_VODAFONE;
if (process.env.HUBTEL_CHANNEL_AT) CHANNEL_MAP.AT = process.env.HUBTEL_CHANNEL_AT;

export function channelFor(network) {
  return CHANNEL_MAP[String(network || '').toUpperCase()] || CHANNEL_MAP.MTN;
}

function dryReference(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/** Hubtel marks success with HTTP 200/201 and Status=Success / ResponseCode=0000. */
function interpret(data) {
  const status = String(data?.Status || data?.status || '').toLowerCase();
  const code = String(data?.ResponseCode || data?.responseCode || '');
  const success = status === 'success' || code === '0000';
  return { success, code: code || null, message: data?.Message || data?.message || null, raw: data };
}

/* --------------------------- Collections (Receive) -------------------------- */

/**
 * Charge a customer's mobile money wallet (online checkout / POS MoMo).
 * amount is GHS. customerMsisdn: 233XXXXXXXXX.
 */
export async function collectMoMo({ customerMsisdn, amount, network, description = 'DiDwa purchase', clientReference }) {
  const payload = {
    CustomerMsisdn: customerMsisdn,
    Amount: Number(amount).toFixed(2),
    Channel: channelFor(network),
    Description: description,
    ClientReference: clientReference || `GS-${Date.now()}`,
    CallbackUrl: CALLBACK_URL || undefined,
    PrimaryCallbackUrl: CALLBACK_URL || undefined,
  };

  if (hubtelDryRun) {
    console.log(`[hubtel:DRY_RUN] COLLECT ${payload.Amount} GHS from ${customerMsisdn} (${payload.Channel})`);
    return {
      success: true,
      dryRun: true,
      reference: dryReference('COLLECT'),
      transactionId: dryReference('TX'),
      raw: { Status: 'Success', ResponseCode: '0000' },
    };
  }

  try {
    const { data } = await http.post(
      `/v1/merchantaccount/merchants/${encodeURIComponent(MERCHANT_ACCOUNT)}/receive/mobilemoney`,
      payload,
    );
    const result = interpret(data);
    return {
      success: result.success,
      reference: data?.Data?.ClientReference || payload.ClientReference,
      transactionId: data?.Data?.TransactionId || null,
      message: result.message,
      raw: result.raw,
    };
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[hubtel] collect failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    return { success: false, message: 'Mobile money collection failed. Ask the customer to approve or retry.', raw: detail };
  }
}

/* ----------------------- Hosted checkout (redirect) ------------------------ */

/**
 * Base URL for Hubtel's hosted checkout API. The domain purchase flow
 * (services/domainService.js) already uses this host + path successfully, so
 * the subscription fallback deliberately reuses the same contract instead of
 * inventing a second one.
 */
const CHECKOUT_BASE_URL = (process.env.HUBTEL_CHECKOUT_BASE_URL || 'https://api.hubtel.com')
  .replace(/\/+$/, '');

/**
 * Initialise a hosted checkout session: the caller redirects the browser to
 * the returned `checkoutUrl` and the payer completes the payment with card or
 * any Mobile Money network. Confirmation arrives later on
 * HUBTEL_CALLBACK_URL (`/api/webhooks/hubtel`), so this NEVER activates
 * anything by itself - it only opens the payment page.
 *
 * Used as the automatic fallback when the MTN MoMo leg fails on
 * POST /api/billing/subscribe (see routes/billingRoutes.js).
 *
 * @param {object} args
 * @param {number} args.amountGhs      amount in Ghana Cedis
 * @param {string} args.description    shown to the payer on the checkout page
 * @param {string} args.clientReference  our business reference (GS-SUB-...)
 * @param {string} [args.customerPhone]  prefilled payer MSISDN (233XXXXXXXXX)
 * @param {string} [args.returnUrl]    where the browser lands after paying
 * @param {string} [args.cancellationUrl] where the browser lands on cancel
 * @param {object} [args.metadata]     echoed back on the webhook callback
 * @returns {Promise<{checkoutUrl: string, checkoutId: string, reference: string,
 *   dryRun?: boolean}>} throws an Error with a seller-safe message on failure.
 */
export async function initCheckout({
  amountGhs, description, clientReference, customerPhone, returnUrl, cancellationUrl, metadata = {},
}) {
  if (!amountGhs || !Number(amountGhs) || Number(amountGhs) <= 0) {
    throw new Error('A payment amount greater than zero is required.');
  }
  if (!clientReference) {
    throw new Error('A payment reference is required.');
  }

  if (hubtelDryRun) {
    console.log(`[hubtel:DRY_RUN] INIT CHECKOUT ${Number(amountGhs).toFixed(2)} GHS for ${clientReference}`);
    return {
      dryRun: true,
      checkoutUrl: `https://checkout.hubtel.com/dry-run/${encodeURIComponent(clientReference)}`,
      checkoutId: clientReference,
      reference: clientReference,
    };
  }

  try {
    const { data } = await axios.post(
      `${CHECKOUT_BASE_URL}/v2/pos/onlinecheckout/items/initiate`,
      {
        totalAmount: Number(amountGhs).toFixed(2),
        description: String(description || 'DiDwa payment').slice(0, 160),
        callbackUrl: CALLBACK_URL || undefined,
        merchantAccountNumber: MERCHANT_ACCOUNT || undefined,
        customerMsisdn: customerPhone || undefined,
        returnUrl: returnUrl || undefined,
        cancellationUrl: cancellationUrl || undefined,
        clientReference,
        items: [{
          name: String(description || 'DiDwa payment').slice(0, 160),
          quantity: 1,
          unitPrice: Number(amountGhs).toFixed(2),
          totalPrice: Number(amountGhs).toFixed(2),
        }],
        metadata,
      },
      {
        auth: { username: CLIENT_ID, password: CLIENT_SECRET },
        headers: { 'Content-Type': 'application/json' },
        timeout: ON_VERCEL ? 8_000 : 25_000,
      },
    );

    const checkoutUrl = data?.checkoutUrl || data?.data?.checkoutUrl || data?.response?.checkoutUrl;
    if (!checkoutUrl) {
      // A 200 without a URL is still a failure - handing the seller `undefined`
      // would redirect them to a blank page.
      console.error('[hubtel] checkout init returned no URL:', JSON.stringify(data).slice(0, 400));
      throw new Error('The payment page could not be created. Please try again.');
    }
    return {
      checkoutUrl,
      checkoutId: data?.checkoutId || data?.data?.checkoutId || data?.data?.reference || clientReference,
      reference: clientReference,
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'The payment page could not be created. Please try again.') throw err;
    const detail = err.response?.data || err.message;
    console.error('[hubtel] checkout init failed:', typeof detail === 'object' ? JSON.stringify(detail).slice(0, 400) : String(detail).slice(0, 400));
    throw new Error('The payment gateway is unavailable right now. Please try again in a moment.');
  }
}

/* ----------------------- Transaction verification ----------------------- */
/**
 * Confirm a Hubtel transaction actually succeeded by querying Hubtel's
 * checktransactionstatus endpoint with the platform's own credentials.
 *
 * Hubtel does NOT sign its callbacks, so a webhook body alone cannot be
 * trusted. This is the only way to authenticate a platform-level Hubtel
 * callback (subscription, SMS pack and domain purchases).
 *
 * Returns { success, amount, reference, transactionId, message }.
 */
export async function verifyHubtelTransaction({ transactionId, reference } = {}) {
  if (hubtelDryRun) {
    console.log('[hubtel:DRY_RUN] verify transaction skipped - no live credentials');
    return {
      success: true,
      amount: null,
      reference: reference || null,
      transactionId: transactionId || null,
      message: 'dry run - not verified',
    };
  }
  if (!transactionId) {
    return { success: false, amount: null, reference: reference || null, transactionId: null, message: 'No transaction id to verify.' };
  }
  try {
    const { data } = await http.get(
      `/v1/merchantaccount/merchants/${encodeURIComponent(MERCHANT_ACCOUNT)}/checktransactionstatus/${encodeURIComponent(transactionId)}`,
      { timeout: ON_VERCEL ? 8_000 : 20_000 },
    );
    const d = data?.Data || data?.data || {};
    const code = String(data?.ResponseCode ?? data?.responseCode ?? d?.ResponseCode ?? '');
    const status = String(d?.Status ?? data?.Status ?? data?.status ?? '').toLowerCase();
    const settled = code === '0000' || status === 'success' || status === 'successful';
    const amount = Number(d?.Amount ?? data?.Amount ?? d?.ChargedAmount ?? NaN);
    return {
      success: settled,
      amount: Number.isFinite(amount) ? amount : null,
      reference: d?.ClientReference ?? d?.Reference ?? reference ?? null,
      transactionId: d?.TransactionId ?? transactionId,
      message: d?.Message ?? data?.Message ?? null,
    };
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[hubtel] verify transaction failed:', typeof detail === 'object' ? JSON.stringify(detail).slice(0, 400) : String(detail).slice(0, 400));
    return { success: false, amount: null, reference: reference || null, transactionId, message: 'Hubtel verification unavailable.' };
  }
}

/* ------------------------- Disbursements (Send) ---------------------------- */

/* ------------------------- Disbursements (Send) ---------------------------- */
/**
 * Instant MoMo payout to a seller's wallet (Module 3).
 * Returns { success, reference, transactionId, message }.
 */
export async function disburseMoMo({ destination, amount, network, description = 'DiDwa payout', clientReference }) {
  const payload = {
    Destination: destination,                 // 233XXXXXXXXX
    Amount: Number(amount).toFixed(2),
    Channel: channelFor(network),
    Description: description,
    ClientReference: clientReference || `GS-PAY-${Date.now()}`,
    CallbackUrl: CALLBACK_URL || undefined,
    PrimaryCallbackUrl: CALLBACK_URL || undefined,
  };

  if (hubtelDryRun) {
    console.log(`[hubtel:DRY_RUN] DISBURSE ${payload.Amount} GHS to ${destination} (${payload.Channel})`);
    return {
      success: true,
      dryRun: true,
      reference: dryReference('PAY'),
      transactionId: dryReference('TX'),
      raw: { Status: 'Success', ResponseCode: '0000' },
    };
  }

  try {
    const { data } = await http.post(
      `/v1/merchantaccount/merchants/${encodeURIComponent(MERCHANT_ACCOUNT)}/send/mobilemoney`,
      payload,
    );
    const result = interpret(data);
    return {
      success: result.success,
      reference: data?.Data?.ClientReference || payload.ClientReference,
      transactionId: data?.Data?.TransactionId || null,
      message: result.success ? null : (result.message || 'Disbursement declined by Hubtel.'),
      raw: result.raw,
    };
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[hubtel] disbursement failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    return { success: false, message: 'Hubtel disbursement error. Payout queued for retry review.', raw: detail };
  }
}

export default {
  collectMoMo,
  disburseMoMo,
  initCheckout,
  verifyHubtelTransaction,
  channelFor,
  get dryRun() { return hubtelDryRun; },
};
