/**
 * DiDwa - mNotify Transactional SMS Service
 * https://mnotify.com/ (API: https://api.mnotify.com/api)
 *
 * When MNOTIFY_API_KEY is missing the service runs in DRY_RUN mode:
 * messages are logged to the console instead of being dispatched,
 * so local development never fails on integrations.
 *
 * mNotify contract (verified against the official TS + Laravel SDKs):
 *   POST {base}/sms/quick?key={apiKey}
 *   Headers: Authorization: {apiKey}, Content-Type: application/json
 *   Body:    { recipient: string[], sender, message, is_schedule, schedule_date }
 *
 * Note the recipient field is SINGULAR but still an array. Sending a bare
 * string here is the single most common integration mistake.
 *
 * The sender ID must be registered and approved on the mNotify account
 * (`DiDwa`) before live delivery will succeed.
 */
import axios from 'axios';
import { formatGhs } from '../utils/helpers.js';

const MNOTIFY_BASE = process.env.MNOTIFY_BASE_URL || 'https://api.mnotify.com/api';
const API_KEY = process.env.MNOTIFY_API_KEY || '';
const SENDER_ID = process.env.MNOTIFY_SENDER_ID || 'DiDwa';

/**
 * Send timeout.
 *
 * Deliberately NOT capped at Vercel's 10s function budget the way the previous
 * gateway client was: every caller of sendSms() is fire-and-forget AFTER a
 * commit, so this request never sits in front of a seller waiting on a
 * response. The 504 the old cap was avoiding cannot happen on these paths, and
 * capping it only caused real alerts to be discarded - mNotify's quick-SMS
 * endpoint negotiates with carriers and can exceed 8s on its own.
 */
export const smsDryRun = !API_KEY;

const TIMEOUT_MS = 20_000;

const client = axios.create({
  baseURL: MNOTIFY_BASE,
  timeout: TIMEOUT_MS,
  headers: {
    Authorization: API_KEY,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // mNotify accepts the key as a `key` query param as well as the header;
  // send both so auth succeeds regardless of which one the account uses.
  params: { key: API_KEY },
});

/** Low-level send. `recipients`: array of normalized 233XXXXXXXXX numbers. */
export async function sendSms(recipients, message) {
  const list = Array.isArray(recipients) ? recipients : [recipients];
  if (list.length === 0) return { ok: false, reason: 'no-recipients' };

  if (smsDryRun) {
    console.log(`[sms:DRY_RUN] to=${list.join(',')} sender=${SENDER_ID}\n${message}\n`);
    return { ok: true, dryRun: true, messageId: `dry-${Date.now()}` };
  }

  try {
    const { data } = await client.post('/sms/quick', {
      recipient: list,
      sender: SENDER_ID,
      message,
      is_schedule: false,
      schedule_date: '',
    });
    // Success is signalled by `status`/`code`; `summary._id` is the campaign
    // ID needed to poll the delivery report at /campaign/{id}.
    const ok = data?.status === 'success' || data?.code === 'ok' || Boolean(data?.summary?._id);
    const messageId = data?.summary?._id || null;
    if (!ok) console.error('[sms] unexpected mNotify response:', JSON.stringify(data));
    else console.log('[sms] accepted by mNotify', { campaignId: messageId, recipients: list.length });
    return { ok: Boolean(ok), messageId, raw: data };
  } catch (err) {
    // Logged with enough context to diagnose without exposing the message body:
    // a bare "timeout of 8000ms exceeded" says nothing about which alert died.
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error('[sms] dispatch failed', {
      recipients: list.length,
      sender: SENDER_ID,
      timeoutMs: TIMEOUT_MS,
      timedOut: err.code === 'ECONNABORTED' || /timeout/i.test(err.message),
      detail,
    });
    return { ok: false, error: detail };
  }
}

/* ------------------------- Module 1: lifecycle SMS ------------------------- */

function formatDate(tzDate) {
  return new Date(tzDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

/** Registration welcome: storefront URL + trial expiry (Module 1). */
export async function sendWelcomeSms(store) {
  const platformDomain = (process.env.PLATFORM_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const storefront = store.custom_domain
    ? `https://${String(store.custom_domain).replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
    : (store.subdomain_slug && platformDomain
      ? `https://${store.subdomain_slug}.${platformDomain}`
      : 'your DiDwa storefront');
  const expires = formatDate(store.trial_ends_at);
  const message =
    `Welcome to DiDwa, ${store.name}!\n` +
    `Your 14-day FREE trial is live until ${expires}.\n` +
    `Storefront: ${storefront}\n` +
    `Renew subscription before time to avoid your store being suspended. Sell smarter today.`;
  return sendSms([store.phone], message);
}

/** Day 11 renewal reminder. */
export async function sendTrialReminderSms(store) {
  const expires = formatDate(store.trial_ends_at);
  const message =
    `Hi ${store.name}, your DiDwa free trial ends ${expires} (3 days left).\n` +
    `Keep your storefront open - renew now to avoid interruption. Your data stays safe.`;
  return sendSms([store.phone], message);
}

/**
 * Paid-plan renewal warning: `plan_period_end` is 3 days out.
 *
 * Deliberately NOT worded as a trial - these merchants already pay, so telling
 * them their free trial is ending would read as spam or a billing error. Lead
 * with the date the plan actually lapses and the consequence.
 */
export async function sendRenewalReminderSms(store) {
  const ends = formatDate(store.plan_period_end);
  const message =
    `Hi ${store.name}, your DiDwa ${store.plan || 'current'} plan ends ${ends}.\n` +
    `Renew in Settings > Payments to keep your storefront online. Your products, ` +
    `orders and history stay exactly as they are.`;
  return sendSms([store.phone], message);
}

/** Day 14: trial over, moved to PAST_DUE (grace active). */
export async function sendPastDueSms(store) {
  const graceEnds = formatDate(store.grace_ends_at || new Date(Date.now() + 3 * 86_400_000));
  const message =
    `${store.name}, your free trial has ended. Your account is PAST DUE.\n` +
    `Grace period runs until ${graceEnds} - subscribe before then to keep selling.`;
  return sendSms([store.phone], message);
}

/** Day 17 (trial end + 3-day grace): suspension notice. */
export async function sendSuspensionSms(store) {
  const message =
    `DiDwa: ${store.name} has been SUSPENDED after the grace period.\n` +
    `Subscribe anytime to instantly restore your storefront, inventory and sales history.`;
  return sendSms([store.phone], message);
}

/* -------------------- Module 6: low-stock variant alerts ------------------- */

export async function sendLowStockAlertSms(store, lowVariants) {
  if (!Array.isArray(lowVariants) || lowVariants.length === 0) {
    return { ok: false, reason: 'nothing-low' };
  }
  const lines = lowVariants
    .slice(0, 6)
    .map((v) => `- ${v.product_name} (${v.option_value}): ${Number(v.stock_quantity)} left`)
    .join('\n');
  const more = lowVariants.length > 6 ? `\n+${lowVariants.length - 6} more item(s)...` : '';
  const message =
    `LOW STOCK ALERT - ${store.name}\n` +
    `The following variant(s) hit their re-order threshold:\n${lines}${more}\n` +
    `Restock now to keep selling.`;
  return sendSms([store.phone], message);
}

/* --------------------------- payout confirmation --------------------------- */

export async function sendPayoutSms(store, payout) {
  const message =
    `PAYOUT ${payout.status}: ${formatGhs(payout.amount)} sent to ${payout.destination}` +
    ` (${payout.network}).\nRef: ${payout.reference || 'n/a'}\nDiDwa Wallet`;
  return sendSms([store.phone], message);
}

export default {
  sendSms,
  sendWelcomeSms,
  sendTrialReminderSms,
  sendPastDueSms,
  sendSuspensionSms,
  sendLowStockAlertSms,
  sendPayoutSms,
  get dryRun() { return smsDryRun; },
};
