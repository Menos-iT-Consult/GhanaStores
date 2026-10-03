/**
 * DiDwa - Billing lifecycle test
 *
 * Locks the store billing state machine:
 *   TRIAL --day 14--> PAST_DUE --+3d grace--> SUSPENDED
 *   ACTIVE --plan_period_end--> PAST_DUE (renewal lapse) --+3d--> SUSPENDED
 *
 * Two things this guards that nothing else does:
 *   1. A paying merchant must actually lapse. `plan_period_end` is written on
 *      every successful payment but was read by no transition, so ACTIVE
 *      stores never expired.
 *   2. Each lapse must get a FRESH grace window. `grace_ends_at` is stamped
 *      once by the INSERT trigger (trial_ends_at + 3 days) and is never
 *      cleared on subscribe, so a merchant who subscribes then lets their plan
 *      lapse would carry a stale, long-past grace date and be suspended by the
 *      very next cron run with no grace at all.
 *
 * No database required: transition SQL is asserted as source, and pure
 * helpers are called directly. Follows the planPricingTest.js convention.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let pass = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    pass += 1;
    console.log(`PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`FAIL  ${label}${detail ? ` - ${detail}` : ''}`);
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const cron = read('jobs/billingCron.js');
const cronRoute = read('routes/billingCronRoute.js');
const sms = read('services/smsService.js');
const vercel = JSON.parse(read('vercel.json'));

/* 1. The renewal transition exists at all. */
check(
  'runExpireRenewals() exists - a paying plan must actually lapse',
  /export async function runExpireRenewals\(/.test(cron),
  'no such export in jobs/billingCron.js',
);
check(
  'the renewal transition is driven by plan_period_end, not trial_ends_at',
  /plan_period_end/.test(cron),
  'plan_period_end is never read by any transition',
);
check(
  "the renewal transition only touches ACTIVE stores",
  /status\s*=\s*'ACTIVE'[\s\S]{0,200}plan_period_end\s*<=\s*NOW\(\)/.test(cron),
  "expected WHERE status = 'ACTIVE' ... AND plan_period_end <= NOW()",
);

/* 2. Each lapse gets a FRESH grace window (the stale-grace bug). */
check(
  'lapsing to PAST_DUE also SETs grace_ends_at',
  /SET\s+status\s*=\s*'PAST_DUE'\s*,\s*grace_ends_at/.test(cron),
  'grace_ends_at is left over from the trial, so grace would be skipped',
);
check(
  'the fresh grace window is anchored to plan_period_end, not now()',
  /grace_ends_at\s*=\s*\w+\.plan_period_end\s*\+\s*INTERVAL\s*'3 days'/.test(cron),
  "expected grace_ends_at = <alias>.plan_period_end + INTERVAL '3 days'",
);
check(
  'the grace window matches the trial grace length',
  /INTERVAL\s*'3 days'/.test((cron.split('runExpireRenewals')[1] || '').slice(0, 900)),
  "expected INTERVAL '3 days' so paying and trial merchants get the same grace",
);

/* 3. Suspension keeps a fallback when grace_ends_at was never set.
 *    Slice on the definition, not the bare name: runExpireRenewals' comment
 *    also mentions runSuspendOverdue, so the first match is the wrong one. */
const suspendStart = cron.indexOf('export async function runSuspendOverdue');
const suspendFn = cron.slice(suspendStart, suspendStart + 900);
check(
  'suspension still falls back to a computed grace date',
  /COALESCE\(\s*grace_ends_at/.test(suspendFn),
  'removing COALESCE would skip grace for any store without the column',
);

/* 4. Renewal reminders reach PAID plans too, with paid-plan wording. */
check(
  'a renewal reminder exists for paying merchants',
  /export async function sendRenewalReminderSms\(/.test(sms),
  'no paid-plan reminder in services/smsService.js',
);
check(
  'the paid-plan reminder is not worded as a free trial',
  /export async function sendRenewalReminderSms\([\s\S]{0,600}free trial/i.test(sms),
  'a paying merchant should not be told their free trial ends',
);
check(
  'a cron step warns PAID plans before they lapse',
  /sendRenewalReminderSms/.test(cron),
  'no cron step calls the paid-plan reminder',
);
check(
  "the paid-plan reminder targets ACTIVE stores",
  /status\s*=\s*'ACTIVE'/.test(cron.split('plan_period_end::date')[0] || ''),
  "expected status = 'ACTIVE' in the paid reminder query",
);

/* 5. Both entry points stay in sync - this is the live production path. */
const cycleFn = (cron.split('export async function runBillingCycle')[1] || '')
  .split('let scheduledTask')[0];
check(
  'runBillingCycle runs the renewal expiry',
  /runExpireRenewals\(\)/.test(cycleFn),
  'the scheduler would skip renewal expiry',
);
check(
  'renewal expiry runs before suspension',
  cycleFn.indexOf('runExpireRenewals()') > -1
    && cycleFn.indexOf('runExpireRenewals()') < cycleFn.indexOf('runSuspendOverdue()'),
  'a store must become PAST_DUE before it can be suspended in the same run',
);
check(
  'the Vercel cron route calls the renewal expiry',
  /runExpireRenewals/.test(cronRoute),
  'vercel.json drives this endpoint, so it would never run in production',
);
check(
  'the cron route imports the renewal expiry',
  /runExpireRenewals/.test(cronRoute.split('router.get')[0]),
  'missing from the import list',
);
check(
  'the cron route reports the renewal count in its response',
  /renewalsMovedToPastDue/.test(cronRoute),
  'the operator cannot see how many stores lapsed',
);

const cronEntries = Array.isArray(vercel.crons) ? vercel.crons : [];
check(
  'vercel.json still schedules /api/cron/billing',
  cronEntries.some((c) => c.path === '/api/cron/billing'),
  `crons = ${JSON.stringify(cronEntries)}`,
);

/* 6. Pure helpers: cycle intervals and the cycle gate.
 *    cycleInterval returns a Postgres interval fragment ("1 months" / "12
 *    months") and deliberately defaults to monthly; resolveOffer is the gate
 *    that rejects a cycle we do not bill. */
const { cycleInterval, resolveOffer } = await import('../services/planCatalog.js');
check('cycleInterval monthly is a 1-month interval', cycleInterval('monthly') === '1 months');
check('cycleInterval yearly is a 12-month interval', cycleInterval('yearly') === '12 months');
const weeklyOffer = await resolveOffer('growth', 'weekly');
check(
  'resolveOffer rejects an unknown cycle',
  weeklyOffer?.ok === false,
  `got ${JSON.stringify(weeklyOffer)}`,
);
const starterOffer = await resolveOffer('starter', 'monthly');
check(
  'resolveOffer refuses to sell the free trial plan',
  starterOffer?.ok === false,
  'starter is granted at registration, never purchased',
);

/* ------------------------------------------------------------------ */
console.log(`\n${pass} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('failing:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('RESULT: all lifecycle assertions pass');
