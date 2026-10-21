/**
 * DiDwa - Subscription payment fallback verification (POST /api/billing/subscribe)
 *
 * Guards the exact rules this feature lives or dies by:
 *  1. MTN is the PRODUCTION gateway by default - proxy.momoapi.mtn.com +
 *     `mtnghana`, never the sandbox host whose 404 HTML page is what produced
 *     the opaque failure this refactor fixes.
 *  2. The requestToPay call carries exactly the four production headers and an
 *     international MSISDN with no leading plus/zeroes.
 *  3. The subscribe route charges MTN first and, on ANY failure (or a non-MTN
 *     number), falls back to a Hubtel HOSTED CHECKOUT - returning a checkoutUrl
 *     so the seller is redirected, never a crash/opaque 402.
 *  4. A hosted-checkout payment is activated by the webhook (money moves
 *     later), via findSubscriptionByReference + handleSubscriptionWebhook, and
 *     the Hubtel webhook router has a subscription branch - otherwise the
 *     fallback would collect money and never activate the plan.
 *
 * Run: node scripts/billingFallbackTest.js   (no database needed - source scan)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toMsisdn, mtnConfig, REQUEST_TO_PAY_URL } from '../services/mtnMomoService.js';

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
/** Strip comments so prose is not mistaken for code. */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

const mtn = strip(read('services/mtnMomoService.js'));
const billing = strip(read('routes/billingRoutes.js'));
const webhooks = strip(read('services/paymentWebhooks.js'));
const domainRoutes = strip(read('routes/domainRoutes.js'));
const env = read('.env.example');
const sellerPlan = read('src/pages/SellerPlan.jsx');

console.log('\nDiDwa billing fallback -> MTN production + Hubtel hosted checkout\n');

/* --------------------------------- MTN production -------------------------- */

log('MTN base URL defaults to the production proxy',
  /proxy\.momoapi\.mtn\.com/.test(mtn) && !/sandbox/i.test(REQUEST_TO_PAY_URL),
  REQUEST_TO_PAY_URL);

log('target environment defaults to mtnghana',
  mtnConfig.targetEnv === 'mtnghana', mtnConfig.targetEnv);

log('the requestToPay endpoint is the production collection path',
  /\/collection\/v1_0\/requesttopay$/.test(REQUEST_TO_PAY_URL), REQUEST_TO_PAY_URL);

log('.env.example ships production defaults, not the sandbox trap',
  /^MTN_MOMO_BASE_URL=https:\/\/proxy\.momoapi\.mtn\.com/m.test(env)
  && /^MTN_TARGET_ENVIRONMENT=mtnghana/m.test(env)
  && !/^MTN_MOMO_BASE_URL=https:\/\/sandbox/m.test(env));

log('the request carries all four production headers',
  /Authorization: `Bearer \$\{token\}`/.test(mtn)
  && /'X-Reference-Id': xReferenceId/.test(mtn)
  && /'X-Target-Environment': TARGET_ENV/.test(mtn)
  && /'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY/.test(mtn));

/* --------------------------------- MSISDN ---------------------------------- */

log('a local number is sanitised to international MSISDN',
  toMsisdn('0241234567') === '233241234567', toMsisdn('0241234567'));
log('a 233-prefixed number has no leading plus/zero',
  toMsisdn('233241234567') === '233241234567', toMsisdn('233241234567'));
log('a plus-prefixed number loses the plus',
  toMsisdn('+233241234567') === '233241234567', toMsisdn('+233241234567'));

/* ------------------------------- Subscribe route --------------------------- */

log('subscribe charges MTN first (mtnCollect)',
  /await mtnCollect\(/.test(billing));

log('subscribe falls back to a Hubtel hosted checkout (initCheckout)',
  /await initCheckout\(/.test(billing)
  && /checkoutUrl:\s*checkout\.checkoutUrl/.test(billing));

log('the fallback returns provider hubtel + a checkoutUrl the UI redirects to',
  /provider:\s*'hubtel'/.test(billing) && /checkoutUrl/.test(billing));

log('a hosted-checkout success is NOT marked paid synchronously (webhook does it)',
  !/status = 'PAID'[\s\S]{0,200}checkout\.checkoutUrl/.test(billing));

log('both-legs failure returns a JSON error, not a crash',
  /res\.status\(402\)\.json\(\{\s*error:/.test(billing));

/* --------------------------------- Webhook loop ---------------------------- */

log('a subscription reference can be resolved from the callback',
  /export async function findSubscriptionByReference/.test(webhooks)
  && /FROM subscription_payments WHERE reference = \$1/.test(webhooks));

log('a confirmed hosted-checkout payment activates the plan',
  /export async function handleSubscriptionWebhook/.test(webhooks)
  && /status = 'ACTIVE'/.test(webhooks)
  && /status = 'PAID'/.test(webhooks));

log('the subscription webhook is idempotent (a replay does not re-activate)',
  /if \(sub\.status === 'PAID'\)/.test(webhooks));

log('the Hubtel webhook router has a subscription branch',
  /findSubscriptionByReference/.test(domainRoutes)
  && /handleSubscriptionWebhook/.test(domainRoutes));

log('the subscription webhook branch verifies via Hubtel status API (Hubtel never signs)',
  /verifyHubtelTransaction/.test(webhooks)
  && /Transaction not confirmed by Hubtel/.test(webhooks));

/* ---------------------------------- Frontend -------------------------------- */

log('the plan page redirects to the checkoutUrl on fallback',
  /if \(data\?\.checkoutUrl\)\s*\{\s*window\.location\.href = data\.checkoutUrl/.test(sellerPlan));

console.log(`\n${pass}/${pass + fail} billing-fallback assertions passed`);
process.exit(fail ? 1 : 0);
