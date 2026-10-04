/**
 * DiDwa - SMS provider registry for merchant BYOK credentials.
 *
 * Every provider exposes the SAME contract so `resolveProvider` can pick one
 * without knowing which it picked:
 *
 *   await dispatch(providerId, creds, { to, message })
 *     -> { ok: boolean, messageId: string|null, error?: string }
 *
 * Two invariants this module exists to enforce:
 *
 * 1. `dispatch` NEVER throws and NEVER rejects. A gateway that is down, revoked
 *    or rate-limited must not take down the caller - the order is already
 *    committed, and an unhandled rejection here would surface as a 500 on a
 *    successful purchase.
 * 2. Every provider takes the caller's credentials as an argument. There is no
 *    module-level "current key", because two stores in one process must be able
 *    to send on different accounts simultaneously.
 */
import axios from 'axios';

const TIMEOUT_MS = 20_000;

/**
 * Ghana numbers are normalized to 233XXXXXXXXX before dispatch, so providers
 * receive one canonical form. DiDwa normalises at the edge (utils/helpers.js);
 * this is a defensive second pass for values reaching a provider from elsewhere.
 *
 * A bare 9-digit national number with no 0/233 prefix is REJECTED rather than
 * guessed - guessing wrong sends a customer's order receipt to a stranger.
 */
export function normalizeMsisdn(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  if (!digits) return null;
  let local = digits.replace(/^\+/, '');
  if (local.startsWith('0')) local = `233${local.slice(1)}`;
  return local.startsWith('233') ? local : null;
}

/** Pull a short, non-leaking reason out of a provider error body. */
function summarize(data) {
  if (!data) return 'The provider returned an empty response.';
  const msg = data.message || data.Message || data.error || data.errorMessage;
  return typeof msg === 'string' ? msg.slice(0, 200) : 'The provider rejected the message.';
}

/* ------------------------------- mNotify -------------------------------- */
/**
 * Mirrors the platform client in services/smsService.js, verified live:
 *   POST {base}/sms/quick?key={apiKey}
 *   Headers: Authorization: {apiKey}
 *   Body:    { recipient: string[], sender, message }
 *
 * `recipient` is SINGULAR but must be an array - the most common integration
 * mistake with this provider.
 */
async function mnotifySend(creds, { to, message }) {
  const { data } = await axios.post(
    `${creds.baseUrl || 'https://api.mnotify.com/api'}/sms/quick`,
    { recipient: [to], sender: creds.senderId, message, is_schedule: false, schedule_date: '' },
    {
      headers: { Authorization: creds.apiKey, 'Content-Type': 'application/json' },
      // mNotify accepts the key as a query param too; send both so auth works
      // regardless of how the account is configured.
      params: { key: creds.apiKey },
      timeout: TIMEOUT_MS,
    },
  );
  const ok = data?.status === 'success' || data?.code === 'ok' || Boolean(data?.summary?._id);
  return {
    ok: Boolean(ok),
    // summary._id is the campaign ID needed to poll /campaign/{id}.
    messageId: data?.summary?._id || null,
    error: ok ? undefined : summarize(data),
  };
}

/* -------------------------------- Arkesel -------------------------------- */
/**
 * Arkesel's quick-sms endpoint. `to` here is a COMMA-SEPARATED STRING, not an
 * array - the opposite of mNotify, and exactly the quirk a registry must hide.
 */
async function arkeselSend(creds, { to, message }) {
  const { data } = await axios.post(
    `${creds.baseUrl || 'https://sms.arkesel.com/api/v1/sms'}/quick`,
    `to=${encodeURIComponent(to)}&message=${encodeURIComponent(message)}`
    + `&sender_id=${encodeURIComponent(creds.senderId)}`,
    {
      headers: { 'api-key': creds.apiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: TIMEOUT_MS,
    },
  );
  const ok = String(data?.status || '').toLowerCase() === 'success';
  return { ok, messageId: data?.message_id || null, error: ok ? undefined : summarize(data) };
}

/* -------------------------------- Hubtel --------------------------------- */
/**
 * Hubtel SMS, authenticated with the SAME client id/secret the merchant already
 * supplied for payments - which is why Hubtel is cheap to add here.
 *
 * NOTE: unlike the mNotify path, this route has NOT been exercised against a
 * live Hubtel account from this codebase. The payments endpoints in
 * services/storePayments.js are verified; this is written to the documented
 * shape and fails closed, so a wrong assumption degrades to a platform
 * fallback rather than a lost message.
 */
async function hubtelSmsSend(creds, { to, message }) {
  const base = creds.baseUrl || 'https://api-ecs.hubtel.com';
  const url = `${base}/v1/merchantaccount/merchants/${encodeURIComponent(creds.merchantAccountId)}/sms/send`;
  const { data } = await axios.post(
    url,
    { Content: message, From: creds.senderId || 'DiDwa', To: [to] },
    {
      auth: { username: creds.clientId, password: creds.clientSecret },
      headers: { 'Content-Type': 'application/json' },
      timeout: TIMEOUT_MS,
    },
  );
  const ok = data?.status?.code === 0 || String(data?.Status || '').toLowerCase() === 'success';
  return { ok, messageId: data?.status?.messageId || null, error: ok ? undefined : summarize(data) };
}

/**
 * The registry. `fields` drives the merchant UI, so adding a provider is a
 * single entry rather than edits across the form, the service and the routes.
 */
export const SMS_PROVIDERS = {
  MNOTIFY: {
    label: 'mNotify',
    docs: 'https://developers.mnotify.com/',
    fields: [
      { key: 'apiKey', label: 'API key', type: 'password', hint: 'mNotify dashboard -> API keys' },
      { key: 'senderId', label: 'Sender ID', hint: 'Must be registered and approved on your account' },
    ],
    send: mnotifySend,
  },
  ARKESEL: {
    label: 'Arkesel',
    docs: 'https://developers.arkesel.com/',
    fields: [
      { key: 'apiKey', label: 'API key', type: 'password', hint: 'Arkesel dashboard -> API key' },
      { key: 'senderId', label: 'Sender ID', hint: 'Your registered Arkesel sender' },
    ],
    send: arkeselSend,
  },
  HUBTEL: {
    label: 'Hubtel',
    docs: 'https://developers.hubtel.com/',
    fields: [
      { key: 'clientId', label: 'Client ID', hint: 'Same Client ID you use for payments' },
      { key: 'clientSecret', label: 'Client secret', type: 'password', hint: 'Same client secret as payments' },
      { key: 'merchantAccountId', label: 'Merchant account ID', hint: 'Hubtel merchant account number' },
      { key: 'senderId', label: 'Sender (optional)', hint: 'Leave blank to send as DiDwa' },
    ],
    send: hubtelSmsSend,
  },
};

export const PROVIDER_IDS = Object.keys(SMS_PROVIDERS);

/**
 * Dispatch through one provider. NEVER throws - the contract above is the whole
 * point of this wrapper, since every caller is a post-commit fire-and-forget
 * path where a rejection would surface as a 500 on a completed order.
 */
export async function dispatch(providerId, creds, payload) {
  const provider = SMS_PROVIDERS[providerId];
  if (!provider) return { ok: false, messageId: null, error: `Unknown SMS provider "${providerId}".` };

  const to = normalizeMsisdn(payload.to);
  if (!to) return { ok: false, messageId: null, error: 'The recipient number is not a usable Ghana number.' };

  try {
    const result = await provider.send(creds, { ...payload, to });
    return { messageId: null, ...result };
  } catch (err) {
    const timedOut = err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT';
    return {
      ok: false,
      messageId: null,
      error: timedOut
        ? `${provider.label} did not respond in ${TIMEOUT_MS / 1000}s.`
        : summarize(err?.response?.data) || `Could not reach ${provider.label}.`,
    };
  }
}

export { mnotifySend, arkeselSend, hubtelSmsSend };