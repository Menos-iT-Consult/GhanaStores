/**
 * DiDwa - Platform payment fallback verification (Fallback chain + gap fixes)
 *
 * Guards the rules this feature lives or dies by:
 *  1. Paystack is the platform's Fallback 2 after Hubtel hosted checkout on
 *     all three platform flows (subscription, SMS packs, domain purchases),
 *     and the legs are tried in order.
 *  2. Paystack platform payments are signed with PAYSTACK_SECRET_KEY and
 *     dispatched by reference prefix - never confused with a merchant order.
 *  3. Every webhook activation is guarded: PAID replay no-ops and a callback
 *     whose amount does not match the recorded price is refused.
 *  4. Domain purchase fixes: an idempotent reference, the price recorded on
 *     the pending row (price_paid_ghs), and guards that run BEFORE the
 *     registrar side effects.
 *  5. SMS packs settle through the webhook: PAID + creditPurchase in ONE
 *     transaction, so segments can never exist without a payment behind them.
 *
 * Run: node scripts/platformFallbackTest.js   (no database needed - source scan)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  paystackPlatformReady, verifyPlatformSignature, platformReferenceKind,
} from '../services/paystackPlatform.js';

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

const platform = strip(read('services/paystackPlatform.js'));
const webhooks = strip(read('services/paymentWebhooks.js'));
const billing = strip(read('routes/billingRoutes.js'));
const packs = strip(read('routes/smsPacksRoutes.js'));
const domainRoutes = strip(read('routes/domainRoutes.js'));
const domainService = strip(read('services/domainService.js'));
const schema = read('db/schema.sql');
const env = read('.env.example');
const smsPage = read('src/pages/SellerSmsSettings.jsx');
const domainPage = read('src/pages/DomainManager.jsx');

console.log('\nDiDwa platform payments -> gap fixes + Paystack as Fallback 2\n');

/* ----------------------------- Configuration ------------------------------ */

log('.env.example documents the platform Paystack keys',
  /^PAYSTACK_SECRET_KEY=/m.test(env) && /^PAYSTACK_PUBLIC_KEY=/m.test(env));

log('the platform module refuses to initialise without the secret',
  /if \(!paystackPlatformReady\(\)\)/.test(platform));

log('the platform checkout converts GHS to kobo and pins GHS currency',
  /Math\.round\(Number\(amountGhs\) \* 100\)/.test(platform) && /currency: 'GHS'/.test(platform));

log('the platform checkout authenticates with the platform secret',
  /Authorization: `Bearer \$\{SECRET\}`/.test(platform));

log('the platform module has NO dry-run shortcut (unconfigured must not simulate success)',
  !/dryRun/.test(platform) && !/dry_run/.test(platform));

/* ------------------------- Reference classification ----------------------- */

log('subscription, SMS and domain references are classified by prefix',
  platformReferenceKind('GS-SUB-x') === 'subscription'
  && platformReferenceKind('GS-SMS-x') === 'sms'
  && platformReferenceKind('GSD-x') === 'domain');

log('a merchant order number is NOT a platform reference',
  platformReferenceKind('GS-250101-ABCD') === null);

log('the webhook signature check is HMAC-SHA512 with the platform secret',
  /createHmac\('sha512', SECRET\)/.test(platform));

/* ------------------------ Subscription fallback chain --------------------- */

log('subscribe tries Paystack after the Hubtel checkout fails',
  /initPaystackCheckout\(/.test(billing) && /provider: 'paystack'/.test(billing));

log('subscribe only closes FAILED after every leg (Paystack leg precedes the FAILED update)',
  billing.indexOf('await initPaystackCheckout(') < billing.indexOf("status = 'FAILED'"));

/* ----------------------------- SMS pack chain ----------------------------- */

log('SMS packs fall back to a Hubtel hosted checkout on a failed collection',
  /initCheckout\(/.test(packs) && /provider: 'hubtel'/.test(packs));

log('SMS packs fall back to Paystack after Hubtel (Fallback 2)',
  /initPaystackCheckout\(/.test(packs) && /provider: 'paystack'/.test(packs));

log('the row only closes FAILED after both hosted legs are exhausted',
  packs.indexOf('await initCheckout(') < packs.indexOf('await initPaystackCheckout(')
  && packs.indexOf('await initPaystackCheckout(') < packs.indexOf("status = 'FAILED'"));

log('the SMS webhook credits inside the settlement transaction',
  /findSmsPackByReference/.test(webhooks)
  && /FROM sms_pack_payments WHERE reference = \$1/.test(webhooks)
  && /creditPurchase\(pack\.store_id, pack\.segments, t\)/.test(webhooks));

log('the SMS webhook is idempotent (a replay does not re-credit)',
  /if \(pack\.status === 'PAID'\)/.test(webhooks));

/* ------------------------- Subscription webhook guards -------------------- */

log('the subscription webhook is idempotent (a replay does not re-activate)',
  /if \(sub\.status === 'PAID'\)/.test(webhooks));

log('the Paystack subscription leg converts pesewas before the amount guard',
  /Number\(paidAmount\) \/ 100/.test(webhooks));

log('the Hubtel and Paystack paths share one settlement (no drift between them)',
  /settleSubscription\(sub, \{/.test(webhooks));

/* --------------------------- Paystack dispatch ---------------------------- */

log('the paystack webhook dispatches platform references before the order path',
  webhooks.indexOf('platformReferenceKind(') < webhooks.indexOf('await findOrderByReference('));

log('platform callbacks are verified with the PLATFORM secret, not a store key',
  /verifyPlatformSignature\(rawBody, signature\)/.test(webhooks));

log('a platform reference is refused outright when the key is missing in production',
  /PAYSTACK_SECRET_KEY is not configured|Paystack is not configured on this platform/.test(webhooks));

/* ------------------------- Domain purchase fixes -------------------------- */

log('the buy endpoint builds its reference from the client idempotency key',
  /idempotencyKey/.test(domainRoutes) && /GSD-\$\{req\.auth\.sub\}-/.test(domainRoutes));

log('an already-settled attempt answers 409 without a new checkout',
  /alreadyOwned: true/.test(domainRoutes));

log('the pending row records the server-resolved price (price_paid_ghs)',
  /purchase_reference, price_paid_ghs/.test(domainRoutes));

log('the hubtel domain webhook runs its guards BEFORE the registrar call',
  domainRoutes.indexOf('domainPaymentGuards(') < domainRoutes.indexOf('domainService.handleHubtelWebhook('));

log('the hubtel domain webhook refuses a replayed callback',
  /status === 'ACTIVE'/.test(domainRoutes) && /Already settled\./.test(domainRoutes));

log('the hubtel domain webhook refuses an amount mismatch (amount guard)',
  /Amount mismatch\./.test(domainRoutes));

log('both webhook branches share one activation path (ownership rules cannot drift)',
  (domainRoutes.match(/activatePurchasedDomain\(/g) || []).length >= 3
  && /LOWER\(custom_domain\) = LOWER\(\$1\) AND id <> \$2/.test(domainRoutes));

log('the Paystack domain branch is dispatched by reference prefix',
  /platformReferenceKind\(reference\) === 'domain'/.test(domainRoutes));

log('the Paystack domain branch verifies with the platform secret',
  /verifyPlatformSignature\(rawBody/.test(domainRoutes));

log('the Paystack domain branch converts pesewas before the amount guard',
  /Number\(rawAmount\) \/ 100/.test(domainRoutes));

log('registrar + CDN work is shared via fulfilDomainPurchase',
  /fulfilDomainPurchase\(/.test(domainRoutes) && /export async function fulfilDomainPurchase/.test(domainService));

log('initializeHubtelCheckout accepts a caller-pinned reference',
  /initializeHubtelCheckout\(\{ amountGhs, domainName, customerPhone, customerEmail, storeId, reference \}\)/.test(domainService));

/* --------------------------------- Schema --------------------------------- */

{
  const smsCheck = /sms_pack_payments_provider_check\s*\n?\s*CHECK \(([^)]+)\)/.exec(schema);
  const subCheck = /subscription_payments_provider_check\s*\n?\s*CHECK \(([^)]+)\)/.exec(schema);
  log('the sms pack provider CHECK accepts PAYSTACK (idempotent constraint swap)',
    /DROP CONSTRAINT IF EXISTS sms_pack_payments_provider_check/.test(schema)
    && Boolean(smsCheck && smsCheck[1].includes("'PAYSTACK'")));
  log('the subscription provider CHECK accepts PAYSTACK (idempotent constraint swap)',
    /DROP CONSTRAINT IF EXISTS subscription_payments_provider_check/.test(schema)
    && Boolean(subCheck && subCheck[1].includes("'PAYSTACK'")));
  log('a purchase reference resolves to exactly one pending purchase',
    /store_domains_purchase_reference_idx/.test(schema));
}

/* -------------------------------- Frontend -------------------------------- */

log('the SMS settings page redirects to a hosted checkout when one comes back',
  /res\?\.checkoutUrl/.test(smsPage) && /window\.location\.href = res\.checkoutUrl/.test(smsPage));

log('the domain drawer sends a stable idempotency key',
  /idempotencyKey: idemKey/.test(domainPage));

/* ------------------------------- Live signature --------------------------- */
// A real HMAC round trip: the only check above that would still pass if the
// compare were `===` on a string both sides produced.
{
  const crypto = await import('node:crypto');
  const prevSecret = process.env.PAYSTACK_SECRET_KEY;
  const secret = crypto.randomBytes(32).toString('hex');
  process.env.PAYSTACK_SECRET_KEY = secret;
  const fresh = await import(`../services/paystackPlatform.js?sig=${Date.now()}`);
  const body = JSON.stringify({ event: 'charge.success', data: { reference: 'GS-SUB-1', amount: 10000 } });
  const good = crypto.createHmac('sha512', secret).update(body).digest('hex');
  log('a correctly signed payload verifies and a forged one does not',
    fresh.verifyPlatformSignature(body, good) === true
    && fresh.verifyPlatformSignature(body, 'f'.repeat(128)) === false);
  if (prevSecret === undefined) delete process.env.PAYSTACK_SECRET_KEY;
  else process.env.PAYSTACK_SECRET_KEY = prevSecret;
}

console.log(`\n${pass}/${pass + fail} platform-fallback assertions passed`);
process.exit(fail ? 1 : 0);
