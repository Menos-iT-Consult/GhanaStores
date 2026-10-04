/**
 * DiDwa - Merchant SMS BYOK contract tests.
 *
 * No database and no server needed: this mixes pure-logic calls against the
 * real modules with static source assertions, matching the convention already
 * used by scripts/planPricingTest.js.
 *
 * The assertions that matter most are the SCOPING ones near the bottom. They
 * encode the rule that is easy to break by accident and expensive to break in
 * production: merchant SMS credentials are for ORDER messages only, and a
 * suspended store must never depend on its own key to be told it is suspended.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeMsisdn, SMS_PROVIDERS, PROVIDER_IDS, dispatch } from '../services/smsProviders.js';
import { SMS_CHANNELS, isProviderReady, usesMerchantKey, toClientView } from '../services/storeSms.js';
import { estimateSegments } from '../services/smsService.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0;
let failed = 0;
const ok = (cond, label) => {
  if (cond) { passed++; console.log(`PASS  ${label}`); } else { failed++; console.log(`FAIL  ${label}`); }
};
const section = (t) => console.log(`\n--- ${t} ---`);

/* ---------------------------- msisdn normalization ------------------------- */
section('msisdn normalization');

ok(normalizeMsisdn('0244123456') === '233244123456', 'a 0-prefixed national number gains +233');
ok(normalizeMsisdn('+233244123456') === '233244123456', 'an explicit +233 number is kept');
ok(normalizeMsisdn('233244123456') === '233244123456', 'a bare 233 number is kept');
ok(normalizeMsisdn('020 123 4567') === '233201234567', 'spaces are stripped before conversion');
// A bare national number cannot be normalised without guessing the operator,
// and a guessed prefix would send a customer's receipt to a stranger.
ok(normalizeMsisdn('12345') === null, 'a short unprefixed number is REJECTED, not guessed');
ok(normalizeMsisdn('abc') === null, 'non-numeric input is rejected');
ok(normalizeMsisdn('') === null, 'empty input is rejected');
ok(normalizeMsisdn(null) === null, 'null input is rejected');

/* ------------------------------ registry ----------------------------------- */
section('provider registry');

ok(PROVIDER_IDS.includes('MNOTIFY'), 'mNotify is registered');
ok(PROVIDER_IDS.includes('ARKESEL'), 'Arkesel is registered');
ok(PROVIDER_IDS.includes('HUBTEL'), 'Hubtel is registered');
ok(SMS_CHANNELS.includes('PLATFORM'), 'PLATFORM is a valid channel');
ok(!PROVIDER_IDS.includes('PLATFORM'), 'PLATFORM is deliberately NOT a provider entry');
for (const id of PROVIDER_IDS) {
  ok(typeof SMS_PROVIDERS[id].send === 'function', `${id} exposes a send()`);
  ok(Array.isArray(SMS_PROVIDERS[id].fields) && SMS_PROVIDERS[id].fields.length > 0,
    `${id} declares fields for the merchant UI`);
}

const r1 = await dispatch('NOPE', {}, { to: '0244123456', message: 'x' });
ok(r1.ok === false && !!r1.error, 'an unknown provider fails cleanly instead of throwing');
const r2 = await dispatch('MNOTIFY', {}, { to: 'nonsense', message: 'x' });
ok(r2.ok === false, 'dispatch rejects an unusable recipient before calling the provider');
/* ------------------------------ readiness ---------------------------------- */
section('credential readiness');

const readyMnotify = { provider: 'MNOTIFY', apiKey: 'k', senderId: 'Mine' };
const readyHubtel = { provider: 'HUBTEL', clientId: 'c', clientSecret: 's', merchantAccountId: 'm' };
ok(isProviderReady(readyMnotify) === true, 'mNotify is ready with an API key and sender ID');
ok(isProviderReady({ ...readyMnotify, senderId: '' }) === false, 'mNotify is NOT ready without a sender ID');
ok(isProviderReady(readyHubtel) === true, 'Hubtel is ready with all three fields');
ok(isProviderReady({ ...readyHubtel, clientSecret: '' }) === false, 'Hubtel is NOT ready without a client secret');
ok(isProviderReady(null) === false, 'null settings are never ready');

// The opt-in gate is separate from credential readiness: having keys saved must
// NOT silently start billing the merchant for every order.
ok(usesMerchantKey({ ...readyMnotify, enableOrderSms: true }) === true, 'opt-in + ready keys uses the merchant key');
ok(usesMerchantKey({ ...readyMnotify, enableOrderSms: false }) === false, 'ready keys WITHOUT opt-in stay on the platform key');
ok(usesMerchantKey({ ...readyMnotify, enableOrderSms: true, senderId: '' }) === false, 'opt-in with incomplete keys stays on the platform key');
ok(usesMerchantKey(null) === false, 'a store with no settings row stays on the platform key');

/* ------------------------------ client view -------------------------------- */
section('client view (no secret leakage)');

const view = toClientView({ ...readyMnotify, enableOrderSms: true, storeId: 's1' });
ok(view.apiKeyMasked !== undefined && view.apiKeyMasked !== 'k', 'the API key is masked, never returned raw');
ok(view.clientSecretMasked !== 's', 'no client secret is returned raw');
ok(view.senderId === 'Mine', 'the sender ID is returned in full (it is not a secret)');
ok(view.effectiveChannel === 'MNOTIFY', 'an opted-in ready store reports its own channel');
ok(toClientView({ ...readyMnotify, enableOrderSms: false }).effectiveChannel === 'PLATFORM',
  'a store with keys but no opt-in reports the PLATFORM channel');
ok(toClientView(null).effectiveChannel === 'PLATFORM', 'a store with no row reports the PLATFORM channel');

/* ------------------------------- segments ---------------------------------- */
section('segment estimate');

ok(estimateSegments('') === 0, 'an empty message costs zero segments');
ok(estimateSegments('short') === 1, 'a short message is one segment');
ok(estimateSegments('x'.repeat(140)) === 1, 'exactly 140 chars is one segment');
ok(estimateSegments('x'.repeat(141)) === 2, '141 chars spills into a second segment');
ok(estimateSegments('x'.repeat(400)) === 3, '400 chars is three segments');
/* --------------------- SCOPING: the invariants that matter ------------------ */
section('SCOPING: merchant keys are for ORDER messages only');

const smsService = read('services/smsService.js');
const storeSmsSrc = read('services/storeSms.js');
const cron = read('jobs/billingCron.js');
const inventory = read('routes/inventoryRoutes.js');
const pos = read('routes/posRoutes.js');

// Extract one exported function body so an assertion cannot be satisfied by a
// match that lives in a NEIGHBOURING function.
function bodyOf(src, name) {
  const start = src.indexOf(`export async function ${name}`);
  if (start < 0) return '';
  const rest = src.slice(start);
  const end = rest.indexOf('\nexport ');
  return end > 0 ? rest.slice(0, end) : rest;
}

// Every platform lifecycle / low-stock template must go out on the DiDwa key.
// If any of these started calling sendOrderSms or the BYOK dispatch, a
// suspended store would depend on its own credentials to learn it is suspended.
const LIFECYCLE = [
  'sendWelcomeSms', 'sendTrialReminderSms', 'sendRenewalReminderSms',
  'sendPastDueSms', 'sendSuspensionSms', 'sendLowStockAlertSms', 'sendPayoutSms',
];
for (const fn of LIFECYCLE) {
  const body = bodyOf(smsService, fn);
  ok(body.length > 0, `${fn} exists`);
  ok(body.includes('sendSms('), `${fn} sends on the platform key`);
  ok(!body.includes('dispatchSms('), `${fn} never touches the BYOK provider dispatch`);
  ok(!body.includes('loadStoreSmsSettings'), `${fn} never reads merchant SMS settings`);
}

// The merchant-key lookup must live in the order path, and nowhere else.
const orderBody = bodyOf(smsService, 'sendOrderSms');
ok(orderBody.includes('loadStoreSmsSettings('), 'sendOrderSms reads merchant settings');
ok(orderBody.includes('usesMerchantKey('), 'sendOrderSms gates on usesMerchantKey, so opt-in is required');
ok(orderBody.includes('dispatchSms('), 'sendOrderSms dispatches on the merchant provider');
// The DiDwa key is the safety net for a merchant whose own balance ran out, so
// it is tried second - but only WITHIN the store's quota. An unconditional
// fallback would spend the platform's mNotify credit with no limit at all.
ok(orderBody.includes('consumeSegments'), 'sendOrderSms meters the platform send');
ok(orderBody.indexOf('dispatchSms(') < orderBody.indexOf('consumeSegments('),
  'the merchant key is tried BEFORE the quota-gated platform send');

// Email is fire-and-forget by design and must not re-arm the stock latch: a
// Gmail outage would otherwise re-alert on every sale.
for (const [name, src] of [['inventoryRoutes', inventory], ['posRoutes', pos]]) {
  ok(!src.includes('sendOrderSms'), `${name} does not send order SMS (POS is excluded by design)`);
  ok(!src.includes('emailService'), `${name} does not import the email service`);
}

ok(cron.includes('sendOrderSms') === false, 'the billing cron never sends order SMS');
ok(storeSmsSrc.includes('SUSPENSION') || storeSmsSrc.includes('SUSPENDED'),
  'storeSms.js documents WHY merchant keys are order-only');
/* -------------------------------- wiring ----------------------------------- */
section('wiring');

const server = read('server.js');
const routes = read('routes/smsSettingsRoutes.js');
ok(server.includes("/api/sms-settings"), 'the SMS settings router is mounted');

const guarded = (routes.match(/requireSeller/g) || []).length;
ok(guarded >= 3, `every SMS settings route is requireSeller-scoped (found ${guarded})`);
ok(!/router\.(get|post|put)\([^)]*storeId/.test(routes),
  'no route takes a storeId from the client (own store is derived from the session)');
ok(routes.includes('encryptionConfigured()'), 'saving fails closed without the encryption master key');

// The test endpoint must not accept a destination number, or it becomes a free
// SMS relay charged to DiDwa's sender reputation.
ok(!/req\.body\.(to|phone|msisdn|recipient|destination)/.test(routes),
  'no route accepts an arbitrary destination number');
ok(routes.includes('/test'), 'a test-credentials endpoint exists');

const orderRoutes = read('routes/orderRoutes.js');
ok(orderRoutes.includes('sendOrderSms'), 'storefront checkout triggers the order SMS');
ok(orderRoutes.includes('orderLines'), 'checkout captures product names for the SMS body');
// Fire-and-forget after the commit: a gateway failure must not 500 a paid order.
const trigger = orderRoutes.slice(orderRoutes.indexOf('sendOrderSms({'));
ok(/\(async \(\) => \{[\s\S]*\}\)\(\)\.catch/.test(orderRoutes),
  'the checkout trigger is fire-and-forget with a .catch');
ok(trigger.includes('customerPhone') && trigger.includes('orderLines'),
  'the checkout trigger passes the customer phone and line items');

const schema = read('db/schema.sql');
ok(schema.includes('CREATE TABLE IF NOT EXISTS store_sms_settings'), 'the schema creates store_sms_settings');
ok(schema.includes('store_sms_settings_provider_ready_check'),
  'the schema prevents enabling order SMS without credentials');

/* --------------------- Platform SMS quota (segments) ----------------------- */
section('SMS quota - segment accounting');

// The unit must be segments, not messages. A 400-char receipt is 3 billable
// parts, so metering it as one message would understate cost threefold.
ok(estimateSegments('') === 0, 'an empty message costs no segments');
ok(estimateSegments('a'.repeat(140)) === 1, 'exactly 140 chars is one segment');
ok(estimateSegments('a'.repeat(141)) === 2, '141 chars spills into a second segment');
ok(estimateSegments('a'.repeat(400)) === 3, 'a long receipt is billed as multiple segments');

const quotaSrc = read('services/smsQuota.js');
ok(/consumeSegments/.test(quotaSrc), 'the quota service exposes consumeSegments');
ok(/creditPurchase/.test(quotaSrc), 'the quota service exposes creditPurchase');
ok(/resolveSegmentOffer/.test(quotaSrc), 'the quota service exposes a price resolver');

// Free allowance before prepaid: the segment that lapses at period end must be
// the one nobody paid for.
const consumeBody = quotaSrc.slice(quotaSrc.indexOf('export async function consumeSegments'));
ok(consumeBody.indexOf('fromAllowance = Math.min') < consumeBody.indexOf('fromPurchased ='),
  'consumption spends the free allowance before prepaid segments');

// Concurrency: without row locks two orders can both read the last segment.
// The lock lives in the helpers consumeSegments calls, not in its own body.
ok(/SELECT plan_segments_used[\s\S]*FOR UPDATE/.test(quotaSrc)
   && /SELECT segments FROM store_sms_balance[\s\S]*FOR UPDATE/.test(quotaSrc),
  'consumption locks the ledger rows before deciding');
// One consistent lock order, or two transactions can deadlock.
const lockOrder = [...consumeBody.matchAll(/lock(PeriodUsage|Balance)\(/g)].map((m) => m[1]);
ok(lockOrder.length >= 2 && lockOrder[0] === 'PeriodUsage' && lockOrder[1] === 'Balance',
  'rows are locked in one fixed order (usage then balance) to avoid deadlock');

// Fail closed: a broken ledger must stop the send, not wave it through.
ok(/QUOTA_UNAVAILABLE/.test(consumeBody) && /catch \(err\)[\s\S]*QUOTA_UNAVAILABLE/.test(consumeBody),
  'a ledger failure blocks the send instead of failing open');

// The price is resolved server-side from sms_settings.
ok(/price_per_segment/.test(quotaSrc) && !/req\.body/.test(quotaSrc),
  'the per-segment price comes from sms_settings, never the request');

// Carry-over: purchased segments live in a store-keyed row, never a period-keyed
// one, so a period boundary cannot silently wipe paid-for segments.
ok(/store_sms_balance/.test(quotaSrc), 'prepaid segments use store_sms_balance');
ok(/store_sms_usage/.test(quotaSrc), 'the free allowance uses store_sms_usage');

const packsRoutes = read('routes/smsPacksRoutes.js');
ok(packsRoutes.includes('resolveSegmentOffer'),
  'the purchase endpoint resolves the amount on the server');
ok(!/req\.body\.(amount|price)/.test(packsRoutes),
  'the purchase endpoint ignores any price sent by the client');
ok(packsRoutes.includes('idempotencyKey'),
  'the purchase endpoint is idempotent against a retried tap');
// Segments are money. They must never exist without a confirmed payment.
ok(/PENDING/.test(packsRoutes) && /routeCollection/.test(packsRoutes),
  'a PENDING payment row is written before the gateway call');
ok(packsRoutes.indexOf("status = 'PAID'") < packsRoutes.indexOf('creditPurchase(req.store.id'),
  'segments are only credited after the payment is confirmed');
ok(/creditPurchase\(req\.store\.id, offer\.segments, t\)/.test(packsRoutes),
  'the credit joins the payment transaction instead of taking a second connection');
ok(/requireSeller/.test(packsRoutes), 'the purchase endpoint is seller-scoped');

// Starter can buy: the gate must be allowance OR balance, never allowance alone.
const smsSettingsRoutes = read('routes/smsSettingsRoutes.js');
ok(/allowance <= 0 && \(quota\?\.totalRemaining \?\? 0\) <= 0/.test(smsSettingsRoutes),
  'platform SMS is blocked only when BOTH the allowance and the balance are empty');
/* ------------------------------- Schema ------------------------------------ */
const quotaSchema = read('db/schema.sql');
ok(quotaSchema.includes('CREATE TABLE IF NOT EXISTS store_sms_usage'), 'the schema creates store_sms_usage');
ok(quotaSchema.includes('CREATE TABLE IF NOT EXISTS store_sms_balance'), 'the schema creates store_sms_balance');
ok(quotaSchema.includes('CREATE TABLE IF NOT EXISTS sms_settings'), 'the schema creates sms_settings');
ok(quotaSchema.includes('CREATE TABLE IF NOT EXISTS sms_pack_payments'), 'the schema creates sms_pack_payments');
ok(quotaSchema.includes('sms_monthly_segments'), 'plans carry a per-period SMS allowance');
ok(/CHECK \(segments >= 0\)/.test(quotaSchema), 'a negative segment balance is impossible');
// NULL means "not configured yet" and must be allowed, or there is no way to
// ship without a hard-coded charged price.
ok(/price_per_segment\s+NUMERIC\(10,6\) CHECK \(price_per_segment IS NULL OR price_per_segment > 0\)/.test(quotaSchema),
  'the price ships unset and NULL is a valid state');

/* ------------------------- No unbounded fallback --------------------------- */
section('quota cannot be bypassed');

// The old behaviour sent on the DiDwa key whenever the merchant provider failed,
// which spends real money with no quota check at all.
const smsSvcSrc = read('services/smsService.js');
ok(!/falling back to platform/.test(smsSvcSrc),
  'a merchant provider failure no longer falls back to the platform key');
ok(smsSvcSrc.includes('consumeSegments(store.id, needed)'),
  'the platform send is gated on consumeSegments');
// QUOTA_EXHAUSTED is raised by the quota service and only surfaces here as the
// propagated reason, so assert both halves.
ok(/QUOTA_EXHAUSTED/.test(quotaSrc) && /reason: quota\.reason/.test(smsSvcSrc),
  'an exhausted quota stops the send');
ok(smsSvcSrc.indexOf('consumeSegments(store.id, needed)')
     < smsSvcSrc.lastIndexOf('await sendSms([customerPhone], message)'),
  'the quota is checked BEFORE the message is dispatched');
// Merchant-key sends are the merchant's own cost, so they must not be metered.
ok(smsSvcSrc.indexOf('dispatchSms') < smsSvcSrc.indexOf('consumeSegments(store.id, needed)'),
  'the merchant key is tried first, unmetered');

/* ------------------------- Server actually boots -------------------------- */
section('the server boots with these routes mounted');

// A bad import path (or a top-level throw) only shows up when Node resolves the
// real module graph, which `node --check` does not do: it parses one file at a
// time and never follows an import. Importing server.js is the closest thing to
// what the Vercel runtime does, so it is the check that would have caught a
// mis-spelled relative path before deploy.
let serverBoots = true;
let bootError = null;
try {
  await import('../server.js');
} catch (e) {
  serverBoots = false;
  bootError = e;
}
ok(serverBoots, 'server.js imports cleanly (module graph resolves)');
if (!serverBoots) {
  console.log(`      ${bootError?.code || ''} ${bootError?.message}`);
  console.log('      ^ this fails at deploy time; fix it before pushing');
}

const serverSrc = read('server.js');
ok(serverSrc.includes("'/api/sms-packs'"), 'the prepaid segments router is mounted');
ok(serverSrc.includes('smsPacksRoutes'), 'the prepaid segments router is imported');

/* ----------------------- Admin page survives a failed load ----------------- */
section('the SMS pricing page renders without data');

// A 500 from /api/admin/sms-pricing leaves `data` null. The page used to
// destructure it directly, so the admin shell white-screened with
// "Cannot destructure property 'settings' of null" instead of showing the
// error. This renders the REAL component with the network stubbed out, once
// healthy and once failed, and asserts each produces markup instead of
// throwing. Rendering is the only way to catch this - a static read of the
// source cannot tell you the destructuring actually ran.
const { build } = await import('esbuild');
const { pathToFileURL } = await import('node:url');
const tmpDir = path.join(ROOT, 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });

// The component pulls its initial state from adminApi.get(). Stub that module
// so the render is deterministic and never touches the network.
fs.writeFileSync(path.join(tmpDir, 'apiStub.mjs'), `
const noop = () => {};
export const adminApi = {
  get: async () => {
    if (globalThis.__SMS_LOAD_FAILS__) throw new Error('Server error (500)');
    return globalThis.__SMS_RESPONSE__;
  },
  patch: async () => ({}),
};
export const ghs = (n) => 'GHS ' + Number(n ?? 0).toFixed(2);
`);

// The shim must live in the SAME directory as the real page, or its relative
// imports ("../../components/admin/ui.jsx") no longer resolve. Written to a
// uniquely named sibling file and removed afterwards.
const pageDir = path.join(ROOT, 'src', 'pages', 'admin');
const realPage = path.join(pageDir, 'AdminSmsPricing.jsx');
const shimmedPage = path.join(pageDir, '__AdminSmsPricing.testshim.jsx');
const builtPage = path.join(ROOT, 'tmp', 'AdminSmsPricing.built.mjs');

const cleanup = () => {
  try { fs.rmSync(shimmedPage, { force: true }); } catch { /* noop */ }
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* noop */ }
};

const pageSrc = fs.readFileSync(realPage, 'utf8');
fs.writeFileSync(shimmedPage, pageSrc.replace(
  /from '\.\.\/\.\.\/api\.js'/,
  "from './__apiStub.testshim.mjs'",
));
const apiStubPath = path.join(pageDir, '__apiStub.testshim.mjs');
fs.writeFileSync(apiStubPath, `
const noop = () => {};
export const adminApi = {
  get: async () => {
    if (globalThis.__SMS_LOAD_FAILS__) throw new Error('Server error (500)');
    return globalThis.__SMS_RESPONSE__;
  },
  patch: async () => ({}),
};
export const ghs = (n) => 'GHS ' + Number(n ?? 0).toFixed(2);
`);

await build({
  entryPoints: [shimmedPage],
  bundle: true,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  outfile: builtPage,
  // react/react-dom resolve from node_modules at runtime; lucide-react is
  // stubbed because only its icon components are used and they render nothing
  // meaningful in static markup.
  external: ['react', 'react-dom', 'react-dom/server', 'lucide-react'],
  logLevel: 'error',
});
try { fs.rmSync(apiStubPath, { force: true }); } catch { /* noop */ }

const React = (await import('react')).default;
const { renderToStaticMarkup } = await import('react-dom/server');

const renderPage = async (response, { fail = false } = {}) => {
  globalThis.__SMS_RESPONSE__ = response;
  globalThis.__SMS_LOAD_FAILS__ = fail;
  // Fresh module instance so useState re-initialises and load() re-runs.
  const mod = await import(pathToFileURL(builtPage).href + `?v=${Math.random()}`);
  const el = React.createElement(mod.default);
  return renderToStaticMarkup(el);
};

// 1. Healthy response: the page must render the pricing UI.
try {
  const html = await renderPage({
    settings: { pricePerSegment: 0.05, minPurchase: 100, isPurchasesEnabled: true },
    volume: {
      outstanding: 0, storesWithBalance: 0, segmentsSold: 0,
      payments: { pending: 0, paid: 0, failed: 0 },
    },
  });
  ok(html.includes('SMS pricing'), 'the SMS pricing page renders with a healthy response');
} catch (e) {
  ok(false, `the SMS pricing page renders with a healthy response (${e.message})`);
}

// 2. The failure that white-screened the admin shell.
try {
  const html = await renderPage(undefined, { fail: true });
  ok(html.length > 0, 'the SMS pricing page SURVIVES a failed load instead of throwing');
} catch (e) {
  ok(false, `the SMS pricing page survives a failed load (${e.message})`);
}

// 3. An empty/undefined response must not crash either.
try {
  const html = await renderPage(undefined, { fail: false });
  ok(html.length > 0, 'the page tolerates an undefined response body');
} catch (e) {
  ok(false, `the page tolerates an undefined response body (${e.message})`);
}

cleanup();

// Static guard for the same class of bug: never destructure the load result
// unguarded, because data is null whenever load() throws.
const smsPage = read('src/pages/admin/AdminSmsPricing.jsx');
ok(!/const \{[^}]*\} = data;/.test(smsPage),
  'no unguarded destructuring of the loaded data');
ok(/data\?\.settings/.test(smsPage), 'the page reads settings defensively');

const files = [
  'services/smsQuota.js', 'services/smsService.js', 'services/planCatalog.js',
  'services/storeSms.js', 'services/smsProviders.js',
  'routes/smsPacksRoutes.js', 'routes/smsSettingsRoutes.js',
  'routes/admin/smsPricing.js', 'routes/admin/index.js', 'routes/admin/plans.js',
  'routes/orderRoutes.js', 'server.js',
  'scripts/smsSettingsDbRepair.js', 'scripts/smsByokTest.js',
  'src/pages/SellerSmsSettings.jsx', 'src/pages/admin/AdminSmsPricing.jsx',
  'src/pages/admin/AdminGate.jsx', 'src/pages/admin/AdminPlans.jsx',
  'src/layouts/AdminLayout.jsx',
];

const bad = [];
for (const file of files) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) { bad.push(`${file}: the file itself is missing`); continue; }
  const dir = path.dirname(abs);
  const src = fs.readFileSync(abs, 'utf8');
  for (const m of src.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    const spec = m[1];
    // Skip the harness's own temporary shims, which only exist while this
    // test runs and are deleted before it finishes.
    if (spec.includes('testshim')) continue;
    const target = path.resolve(dir, spec);
    const found = fs.existsSync(target)
      || fs.existsSync(`${target}.js`)
      || fs.existsSync(`${target}.jsx`)
      || fs.existsSync(`${target}.json`)
      || fs.existsSync(path.join(target, 'index.js'));
    if (!found) bad.push(`${file}: cannot resolve '${spec}'`);
  }
}

if (bad.length) {
  console.log('FAIL  every relative import resolves to a real file');
  bad.forEach((b) => console.log(`      ${b}`));
  process.exit(1);
}
console.log('PASS  every relative import in the SMS feature resolves to a real file');

console.log(`\n===== ${passed} passed, ${failed} failed =====`);
process.exit(failed ? 1 : 0);