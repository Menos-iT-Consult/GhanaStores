/**
 * DiDwa - MTN Mobile Money API Service (primary provider for MTN numbers)
 * Collections + Disbursements with async status polling.
 * https://momodeveloper.mtn.com/
 *
 * PRODUCTION-BY-DEFAULT: the base URL and target environment below default to
 * the MTN Ghana production gateway (`proxy.momoapi.mtn.com` / `mtnghana`).
 * Defaulting to the sandbox host is what made live requestToPay calls hit
 * `sandbox.momodeveloper.mtn.com`, receive the developer-portal 404 page (an
 * HTML document), and surface to the seller as an opaque payment failure.
 * Sandbox is now an explicit opt-in via .env (see .env.example).
 *
 * Routing (see routes/paymentRouter.js):
 *   MTN numbers    -> MTN MoMo API first, Hubtel once on failure/timeout.
 *   Telecel/AT     -> Hubtel directly (fallback provider).
 *
 * Env: MTN_MOMO_BASE_URL (default https://proxy.momoapi.mtn.com),
 *   MTN_MOMO_SUBSCRIPTION_KEY,
 *   MTN_MOMO_COLLECTION_USER_ID, MTN_MOMO_COLLECTION_API_KEY,
 *   MTN_MOMO_DISBURSEMENT_USER_ID, MTN_MOMO_DISBURSEMENT_API_KEY
 *   (default to the collection user), MTN_TARGET_ENVIRONMENT
 *   (default `mtnghana`; legacy MTN_MOMO_TARGET_ENVIRONMENT still honoured),
 *   MTN_MOMO_PARTY_ID_TYPE, MTN_MOMO_CURRENCY,
 *   MTN_MOMO_TIMEOUT_MS, MTN_MOMO_POLL_ATTEMPTS,
 *   MTN_MOMO_POLL_INTERVAL_MS, MTN_MOMO_CALLBACK_URL.
 */
import axios from 'axios';
import crypto from 'node:crypto';
import { normalizeGhPhone } from '../utils/helpers.js';

const BASE_URL = (process.env.MTN_MOMO_BASE_URL || 'https://proxy.momoapi.mtn.com')
  .replace(/\/+$/, '');
// Canonical name is MTN_TARGET_ENVIRONMENT (`mtnghana` for live traffic). The
// legacy MTN_MOMO_TARGET_ENVIRONMENT keeps existing .env files working instead
// of silently flipping them to production values they were not configured for.
const TARGET_ENV = process.env.MTN_TARGET_ENVIRONMENT
  || process.env.MTN_MOMO_TARGET_ENVIRONMENT
  || 'mtnghana';
const SUBSCRIPTION_KEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY || '';
const COLLECTION_USER_ID = process.env.MTN_MOMO_COLLECTION_USER_ID || '';
const COLLECTION_API_KEY = process.env.MTN_MOMO_COLLECTION_API_KEY || '';
const DISBURSEMENT_USER_ID = process.env.MTN_MOMO_DISBURSEMENT_USER_ID || COLLECTION_USER_ID;
const DISBURSEMENT_API_KEY = process.env.MTN_MOMO_DISBURSEMENT_API_KEY || COLLECTION_API_KEY;
const PARTY_ID_TYPE = process.env.MTN_MOMO_PARTY_ID_TYPE || 'MSISDN';
const CURRENCY = (process.env.MTN_MOMO_CURRENCY || 'GHS').toUpperCase();
const CALLBACK_URL = process.env.MTN_MOMO_CALLBACK_URL || '';

/* The two settings are a pair - MTN rejects the request when the host says
 * sandbox and the header says production (or the other way round), and the
 * rejection arrives as an opaque error. Say so at boot instead. */
const HOST_IS_SANDBOX = /sandbox/i.test(BASE_URL);
const ENV_IS_SANDBOX = /sandbox/i.test(TARGET_ENV);
if (HOST_IS_SANDBOX !== ENV_IS_SANDBOX) {
  console.warn(
    `[mtn] MTN_MOMO_BASE_URL (${BASE_URL}) and target environment (${TARGET_ENV}) disagree. `
    + 'MTN rejects mismatched pairs - align them in .env '
    + '(production: https://proxy.momoapi.mtn.com + mtnghana).',
  );
}

/** The exact requestToPay endpoint, built from the configured base URL. */
export const REQUEST_TO_PAY_URL = `${BASE_URL}/collection/v1_0/requesttopay`;

/** Read-only view of the resolved MTN configuration (ops panels + tests). */
export const mtnConfig = Object.freeze({
  baseUrl: BASE_URL,
  targetEnv: TARGET_ENV,
  requestToPayUrl: REQUEST_TO_PAY_URL,
});

/** Keep attempts inside serverless time budgets (Vercel Hobby ~10s). */
const ON_VERCEL = Boolean(process.env.VERCEL);
const TIMEOUT_MS = Number(process.env.MTN_MOMO_TIMEOUT_MS || (ON_VERCEL ? 8_000 : 20_000));
const POLL_ATTEMPTS = Number(process.env.MTN_MOMO_POLL_ATTEMPTS || (ON_VERCEL ? 3 : 6));
const POLL_INTERVAL_MS = Number(process.env.MTN_MOMO_POLL_INTERVAL_MS || 2_000);

export const mtnDryRun = !(SUBSCRIPTION_KEY && COLLECTION_USER_ID && COLLECTION_API_KEY);

const http = axios.create({ baseURL: BASE_URL, timeout: TIMEOUT_MS });

/* Short-lived OAuth tokens per product, refreshed a minute before expiry. */
const tokenCache = { collection: null, disbursement: null };

async function fetchToken(kind) {
  const userId = kind === 'disbursement' ? DISBURSEMENT_USER_ID : COLLECTION_USER_ID;
  const apiKey = kind === 'disbursement' ? DISBURSEMENT_API_KEY : COLLECTION_API_KEY;
  const { data } = await http.post(`/${kind}/token/`, {}, {
    headers: { 'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY, 'Content-Type': 'application/json' },
    auth: { username: userId, password: apiKey },
  });
  const ttl = Number(data?.expires_in || 3600);
  tokenCache[kind] = {
    token: data?.access_token || '',
    expiresAt: Date.now() + Math.max(30_000, (ttl - 60) * 1000),
  };
  return tokenCache[kind].token;
}

async function bearerToken(kind) {
  const cached = tokenCache[kind];
  if (cached?.token && Date.now() < cached.expiresAt) return cached.token;
  return fetchToken(kind);
}

function mtnHeaders(token, xReferenceId) {
  // Exactly the four headers the production proxy requires. X-Reference-Id must
  // be a UUIDv4: the sandbox accepted our GS-SUB-... strings, the production
  // gateway rejects anything else (and it is the key the status poll uses).
  return {
    Authorization: `Bearer ${token}`,
    'X-Reference-Id': xReferenceId,
    'X-Target-Environment': TARGET_ENV,
    'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
    'Content-Type': 'application/json',
    ...(CALLBACK_URL ? { 'Callback-Url': CALLBACK_URL } : {}),
  };
}

const newReference = () => crypto.randomUUID();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * MTN's X-Reference-Id must be a UUIDv4. Our business references
 * (`GS-SUB-...`, `GS-POS-...`) are not, so each call gets a real UUID while the
 * business reference stays on `externalId` for reconciliation. A caller that
 * already passes a UUID keeps it, so a retried request still dedupes on MTN's
 * side instead of creating a second charge.
 */
function toXReferenceId(clientReference) {
  return UUID_RE.test(String(clientReference || '')) ? String(clientReference) : newReference();
}

/**
 * Sanitize any phone input into the international MSISDN MTN expects:
 * no leading `+`, no leading `0` - e.g. `23324XXXXXXX`.
 * Accepts `0244123456`, `244123456`, `+233244123456`, `00233244123456`.
 * @returns {string|null} `233XXXXXXXXX` or null when the input is not a valid
 * Ghanaian number (the caller turns null into a clear 400/402, not a gateway hit).
 */
export function toMsisdn(input) {
  return normalizeGhPhone(input);
}

/**
 * Turn any MTN/axios failure into one sentence a seller can act on.
 * The important case: a wrong base URL answers with the developer portal's
 * HTML 404 page, so `err.response.data` is an HTML document, not JSON - that
 * must never reach the UI verbatim (or as "[object Object]").
 */
function describeMtnError(err) {
  const status = err.response?.status;
  const data = err.response?.data;
  const dataText = typeof data === 'string' ? data : JSON.stringify(data || '');
  const isHtml = typeof data === 'string'
    ? /^\s*<(!doctype|html|head|body)/i.test(data)
    : /<(!doctype|html)/i.test(dataText);

  if (isHtml) {
    return `MTN MoMo returned a web page instead of a payment response (HTTP ${status || '404'}). `
      + 'Check MTN_MOMO_BASE_URL - production is https://proxy.momoapi.mtn.com.';
  }
  if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '')) {
    return 'The MTN MoMo request timed out before it was confirmed. Please try again.';
  }
  if (status === 401 || status === 403) {
    return 'MTN MoMo rejected the platform credentials. Payments are temporarily unavailable - please try the fallback payment method or contact support.';
  }
  if (status === 404) {
    return 'The MTN MoMo endpoint was not found. Check MTN_MOMO_BASE_URL (production: https://proxy.momoapi.mtn.com).';
  }
  if (status === 429) {
    return 'MTN MoMo is rate-limiting us right now. Please wait a moment and try again.';
  }
  if (status >= 500) {
    return 'The MTN MoMo service is currently unavailable. Please try again shortly.';
  }
  // Gateway JSON rejections (insufficient funds, wrong target environment...):
  // prefer MTN's own human text when it sent any.
  const reason = data?.reason?.message || data?.message || data?.reason || data?.error?.message;
  if (typeof reason === 'string' && reason.trim() && reason.length < 200) return reason.trim();
  if (/insufficient|balance/i.test(dataText)) {
    return 'The Mobile Money wallet has insufficient balance for this payment.';
  }
  return 'The MTN MoMo payment could not be completed. Please try again or use the fallback payment method.';
}

/* Status polling: requestToPay/transfer are async on MTN's side - HTTP 202
 * only means "received". SUCCESSFUL vs FAILED/REJECTED/TIMEOUT/EXPIRED are
 * the terminal states reported by the transaction-status endpoints. */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollStatus(kind, reference) {
  const path = kind === 'disbursement'
    ? `/disbursement/v1_0/transfer/${reference}`
    : `/collection/v1_0/requesttopay/${reference}`;
  let last = null;
  for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt += 1) {
    try {
      const token = await bearerToken(kind);
      const headers = {
        Authorization: `Bearer ${token}`,
        'X-Target-Environment': TARGET_ENV,
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
      };
      const { data } = await http.get(path, { headers });
      last = data;
      const status = String(data?.status || '').toUpperCase();
      if (status === 'SUCCESSFUL') return { final: true, success: true, status, raw: data };
      if (['FAILED', 'REJECTED', 'TIMEOUT', 'EXPIRED'].includes(status)) {
        return {
          final: true, success: false, status,
          message: data?.reason?.message || data?.message || `MTN transaction ${status.toLowerCase()}.`,
          raw: data,
        };
      }
    } catch (err) {
      const httpStatus = err.response?.status;
      // 404/202 while the transaction propagates = "not final yet".
      if (httpStatus && ![404, 202].includes(httpStatus) && httpStatus < 500) {
        return { final: false, success: false, message: describeMtnError(err), raw: err.response?.data };
      }
      last = err.response?.data ?? null;
    }
    if (attempt < POLL_ATTEMPTS) await sleep(POLL_INTERVAL_MS);
  }
  return {
    final: false, success: false, status: 'PENDING',
    message: 'MTN transaction still pending; Hubtel fallback may proceed.', raw: last,
  };
}

function dryResult(verb, amount, counterparty) {
  console.log(`[mtn:DRY_RUN] ${verb} ${Number(amount).toFixed(2)} GHS ${counterparty}`);
  return {
    success: true, dryRun: true, provider: 'MTN', reference: newReference(),
    transactionId: `TX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    status: 'SUCCESSFUL', raw: { status: 'SUCCESSFUL' },
  };
}

/**
 * Charge a customer's MTN wallet (requestToPay). amount is GHS.
 *
 * `customerMsisdn` is sanitized here into international MSISDN form
 * (`233XXXXXXXXX`, no `+`, no leading `0`) so a raw `024...` from a form can
 * never be sent to the gateway. `clientReference` is our business reference
 * (kept on `externalId`); MTN's X-Reference-Id is always a UUIDv4.
 *
 * Never throws: every failure comes back as `{ success: false, message }` with
 * a human sentence, so callers can fall back instead of crashing on gateway
 * text (or an HTML 404 page from a wrong base URL).
 */
export async function mtnCollect({ customerMsisdn, amount, description = 'DiDwa purchase', clientReference }) {
  const reference = clientReference || newReference();
  const msisdn = toMsisdn(customerMsisdn);
  if (!msisdn) {
    return {
      success: false, provider: 'MTN', reference, status: 'INVALID_MSISDN',
      message: 'Enter a valid Ghana Mobile Money number, e.g. 0241234567.',
    };
  }
  if (mtnDryRun) return dryResult('COLLECT', amount, `from ${msisdn}`);

  const xRef = toXReferenceId(clientReference);
  const payload = {
    amount: Number(amount).toFixed(2),
    currency: CURRENCY,
    externalId: reference,
    payer: { partyIdType: PARTY_ID_TYPE, partyId: msisdn },
    payerMessage: String(description).slice(0, 160),
    payeeNote: String(description).slice(0, 160),
  };

  try {
    await http.post(REQUEST_TO_PAY_URL, payload,
      { headers: mtnHeaders(await bearerToken('collection'), xRef) });
    const polled = await pollStatus('collection', xRef);
    if (polled.final && polled.success) {
      return { success: true, provider: 'MTN', reference, transactionId: xRef, status: 'SUCCESSFUL', raw: polled.raw };
    }
    return {
      success: false, provider: 'MTN', reference, transactionId: xRef, status: polled.status || 'UNKNOWN',
      message: polled.message || 'MTN collection was not approved.',
      pending: !polled.final, raw: polled.raw,
    };
  } catch (err) {
    const detail = err.response?.data || err.message;
    const message = describeMtnError(err);
    console.error('[mtn] collect failed:', message, '|', typeof detail === 'object' ? JSON.stringify(detail).slice(0, 400) : String(detail).slice(0, 400));
    return {
      success: false, provider: 'MTN', reference, transactionId: xRef, status: 'ERROR',
      message, raw: detail,
    };
  }
}

/**
 * Pay out to a seller MTN wallet (transfer). destination is sanitized into
 * international MSISDN form here (`233XXXXXXXXX`), same as collections.
 */
export async function mtnDisburse({ destination, amount, description = 'DiDwa payout', clientReference }) {
  const reference = clientReference || newReference();
  const msisdn = toMsisdn(destination);
  if (!msisdn) {
    return {
      success: false, provider: 'MTN', reference, status: 'INVALID_MSISDN',
      message: 'Enter a valid Ghana Mobile Money number, e.g. 0241234567.',
    };
  }
  if (mtnDryRun) return dryResult('DISBURSE', amount, `to ${msisdn}`);

  const xRef = toXReferenceId(clientReference);
  const payload = {
    amount: Number(amount).toFixed(2),
    currency: CURRENCY,
    externalId: reference,
    payee: { partyIdType: PARTY_ID_TYPE, partyId: msisdn },
    payerMessage: String(description).slice(0, 160),
    payeeNote: String(description).slice(0, 160),
  };

  try {
    await http.post(`${BASE_URL}/disbursement/v1_0/transfer`, payload,
      { headers: mtnHeaders(await bearerToken('disbursement'), xRef) });
    const polled = await pollStatus('disbursement', xRef);
    if (polled.final && polled.success) {
      return { success: true, provider: 'MTN', reference, transactionId: xRef, status: 'SUCCESSFUL', raw: polled.raw };
    }
    return {
      success: false, provider: 'MTN', reference, transactionId: xRef, status: polled.status || 'UNKNOWN',
      message: polled.message || 'MTN disbursement was not completed.',
      pending: !polled.final, raw: polled.raw,
    };
  } catch (err) {
    const detail = err.response?.data || err.message;
    const message = describeMtnError(err);
    console.error('[mtn] disbursement failed:', message, '|', typeof detail === 'object' ? JSON.stringify(detail).slice(0, 400) : String(detail).slice(0, 400));
    return {
      success: false, provider: 'MTN', reference, transactionId: xRef, status: 'ERROR',
      message, raw: detail,
    };
  }
}

export default {
  mtnCollect,
  mtnDisburse,
  toMsisdn,
  mtnConfig,
  get dryRun() { return mtnDryRun; },
};
