/**
 * Subscription plan pricing verification.
 *
 * Guards four things that would each cost real money:
 *
 *  1. Prices come from ONE authority. The catalogue was a hard-coded PLANS array
 *     in routes/billingRoutes.js, so an admin could never change what a seller
 *     paid. This asserts the array is gone and every price path reads the plans
 *     table through services/planCatalog.js.
 *  2. THE REGRESSION: the amount charged is resolved server-side. This asserts
 *     the subscribe route never reads a price from the request body, and that
 *     resolveOffer refuses a plan the platform does not sell or has taken off
 *     sale, plus an unknown billing cycle.
 *  3. The free trial is not buyable. Starter costs 0, and subscribing to it must
 *     fail rather than silently "activate" a paid plan for nothing.
 *  4. Pay-upfront state is recorded. A cycle must set plan_cycle / plan_period_end
 *     on both the store and the payment, or nothing knows what was paid for.
 *
 * Usage: node scripts/planPricingTest.js   (no database needed)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CYCLES, cycleInterval, planPrice, resolveOffer } from '../services/planCatalog.js';

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

/** Strip comments so a price named in prose is not mistaken for code. */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

console.log('\nDiDwa plan pricing -> services/planCatalog.js\n');

const billing = read('routes/billingRoutes.js');
const billingCode = stripComments(billing);
const catalog = read('services/planCatalog.js');
const schema = read('db/schema.sql');

/* ---------- The hard-coded catalogue is gone ---------- */
log('the hard-coded PLANS array no longer exists', !/\bconst\s+PLANS\s*=/.test(billing));
log('billing routes read the plan catalogue', /from '\.\.\/services\/planCatalog\.js'/.test(billing));
log('the catalogue is the only price authority', /monthly_price_ghs/.test(catalog));

/* ---------- THE REGRESSION: no client-supplied amount ---------- */
log('the subscribe route never reads an amount from the body',
  !/req\.body\??\.\s*(amount|price|amountGhs|priceGhs)/.test(billingCode));
log('subscribe resolves the offer server-side',
  /resolveOffer\(req\.body\??\.planId,\s*req\.body\??\.cycle\)/.test(billingCode));
log('the charged amount is the resolved one, not a client field',
  /amount:\s*amountGhs/.test(billingCode));
log('the public plans endpoint returns DB prices, not a literal',
  !/res\.json\(\{\s*plans:\s*PLANS/.test(billingCode));

/* ---------- Offer validation (exercised without a database) ---------- */
{
  const offer = await resolveOffer('growth', 'monthly');
  log('a valid plan and cycle resolves', offer.ok === true);
  log('the free trial cannot be bought', (await resolveOffer('starter', 'monthly')).ok === false);
  log('an unknown plan is refused', (await resolveOffer('does-not-exist', 'monthly')).ok === false);
  log('an unknown cycle is refused', (await resolveOffer('growth', 'weekly')).ok === false);
  log('a missing cycle is refused', (await resolveOffer('growth', undefined)).ok === false);
  // Case must not create a second, unpriceable plan id.
  log('the plan id is matched case-insensitively', (await resolveOffer('GROWTH', 'monthly')).ok === true);
  log('an empty plan id is refused', (await resolveOffer('', 'monthly')).ok === false);
}

/* ---------- Cycles and prices ---------- */
log('exactly two billing cycles are supported',
  CYCLES.length === 2 && CYCLES.includes('monthly') && CYCLES.includes('yearly'));
log('monthly buys one month', cycleInterval('monthly') === '1 months');

/* ---------- Pay-upfront state is recorded ---------- */
log('subscribe records the cycle on the store',
  /plan_cycle\s*=\s*\$3/.test(billingCode) && /plan_period_end\s*=\s*NOW\(\)/.test(billingCode));
log('the period length is computed from the cycle', /cycleInterval\(cycle\)/.test(billingCode));
log('the payment row records the cycle too', /cycle,\s*status\)/.test(billingCode));
log('the payment row records the period it bought',
  /period_start\s*=\s*NOW\(\),\s*period_end\s*=\s*NOW\(\)/.test(billingCode));

/* ---------- Schema integrity ---------- */
log('the plans table is created', /CREATE TABLE IF NOT EXISTS plans/.test(schema));
log('the catalogue is seeded for existing stores', /INSERT INTO plans/.test(schema));
log('stores.plan has a real foreign key', /stores_plan_fkey[\s\S]{0,120}REFERENCES plans\(id\)/.test(schema));
log('subscription_payments.plan_id has a real foreign key',
  /subscription_payments_plan_fkey[\s\S]{0,140}REFERENCES plans\(id\)/.test(schema));
log('a yearly price cannot exceed twelve monthly payments',
  /CONSTRAINT plans_yearly_not_above_12x/.test(schema));
log('the catalogue is seeded before the FK is validated',
  schema.indexOf('INSERT INTO plans') < schema.indexOf('VALIDATE CONSTRAINT stores_plan_fkey'));

/* ---------- Columns added to tables that already existed ---------- */
log('plan_cycle is added to an existing stores table',
  /ALTER TABLE stores[\s\S]{0,160}ADD COLUMN IF NOT EXISTS plan_cycle/.test(schema));
log('plan_period_end is added to an existing stores table',
  /ADD COLUMN IF NOT EXISTS plan_period_end/.test(schema));
log('cycle and the period are added to subscription_payments',
  /ALTER TABLE subscription_payments[\s\S]{0,200}ADD COLUMN IF NOT EXISTS cycle/.test(schema));

/* ---------- The seller's upgrade button ---------- */
{
  const banner = read('src/components/TrialBanner.jsx');
  log('the trial banner no longer calls the admin-only activate endpoint',
    !/api\.post\('\/api\/billing\/activate'/.test(banner));
  log('the trial banner sends the seller to the upgrade page',
    /navigate\('\/settings\/plan'\)/.test(banner));
  // The endpoint the old button called must stay admin-only.
  log('POST /api/billing/activate is still an admin override',
    /router\.post\('\/activate',\s*requireAdmin/.test(billing));
  log('POST /api/billing/subscribe is the seller path',
    /router\.post\('\/subscribe',\s*requireSeller/.test(billing));
}

/* ---------- No price is hard-coded on the client ---------- */
for (const file of ['src/pages/SellerPlan.jsx', 'src/pages/PublicPages.jsx']) {
  const code = stripComments(read(file));
  log(`${file} hard-codes no plan price`,
    !/(79|199|790|1990)\s*(GHS|,|\})/.test(code) && !/priceGhs\s*[:=]\s*\d/.test(code));
}
log('the pricing page reads prices over the API', /usePlans\(\)/.test(read('src/pages/PublicPages.jsx')));

/* ---------- Admin authorisation ---------- */
const adminPlans = read('routes/admin/plans.js');
log('the admin plan list requires an admin', /router\.get\('\/plans',\s*requireAdmin/.test(adminPlans));
log('the admin plan edit requires an admin', /router\.patch\('\/plans\/:id',\s*requireAdmin/.test(adminPlans));
log('a price change must carry a reason', /reason is required for a plan pricing change/.test(adminPlans));
log('every plan write is audited', /recordAdminAction/.test(adminPlans));
log('there is no delete route', !/router\.delete/.test(adminPlans));
log('an unknown plan is a 404, not a silent create', /status\(404\)/.test(adminPlans));

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====\n`);
process.exit(fail === 0 ? 0 : 1);

log('yearly buys twelve months', cycleInterval('yearly') === '12 months');
log('an unknown cycle cannot lengthen a period', cycleInterval('weekly') === '1 months');
{
  const plan = { monthlyPriceGhs: 79, yearlyPriceGhs: 790 };
  log('the price follows the cycle', planPrice(plan, 'monthly') === 79 && planPrice(plan, 'yearly') === 790);
  log('a missing price is 0, never NaN', planPrice({}, 'monthly') === 0);
}
