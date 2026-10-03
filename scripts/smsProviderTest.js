/**
 * DiDwa - SMS provider contract test (mNotify)
 *
 * The Arkesel -> mNotify cutover is invisible above the `sendSms` boundary: no
 * caller changed and no template changed. That is exactly why it is risky -
 * a malformed payload would only show up as merchant messages silently not
 * arriving, in production, after a cron run.
 *
 * So this pins the provider contract as source:
 *   1. Endpoint/auth/payload match the mNotify API (NOT Arkesel's).
 *   2. `recipient` stays an array - the field is singular but takes a list,
 *      and "fixing" it to a string is the classic mistake here.
 *   3. Dry-run still short-circuits before any HTTP when the key is absent,
 *      so the billing cron degrades gracefully instead of throwing.
 *   4. No Arkesel remnants remain anywhere in the repo.
 *
 * No database or network required. Follows the billingLifecycleTest.js
 * convention: assert on source text, plus real dry-run calls.
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

const sms = read('services/smsService.js');

/* 1. Endpoint, auth and payload match the mNotify API. */
check(
  'the SMS endpoint is mNotify /sms/quick, not Arkesel /sms/send',
  /MNOTIFY_BASE[\s\S]{0,80}https:\/\/api\.mnotify\.com\/api/.test(sms)
    && /post\('\/sms\/quick'/.test(sms)
    && !/post\('\/sms\/send'/.test(sms),
  'expected base https://api.mnotify.com/api and a POST to /sms/quick',
);
check(
  'auth uses the Authorization header (mNotify), not the Arkesel api-key header',
  /Authorization:\s*API_KEY/.test(sms) && !/'api-key':\s*API_KEY/.test(sms),
  'expected an Authorization header carrying the bare API key',
);
check(
  'the API key is also sent as a `key` query param, as the reference SDKs do',
  /params:\s*\{\s*key:\s*API_KEY\s*\}/.test(sms),
  'expected `params: { key: API_KEY }` on the axios instance',
);

/* 2. Payload shape - the highest-risk part of this migration. */
check(
  'the payload uses the SINGULAR `recipient` field',
  // Anchored to the payload object so unrelated log lines can't trip it.
  /post\('\/sms\/quick',\s*\{\s*recipient:\s*list,\s*sender:/.test(sms),
  'mNotify expects `recipient` (singular); Arkesel used `recipients`',
);
check(
  '`recipient` is always an array, never coerced to a bare string',
  /const list = Array\.isArray\(recipients\)\s*\?\s*recipients\s*:\s*\[recipients\]/.test(sms),
  'sendSms must wrap a single recipient into an array',
);
check(
  'the payload carries the scheduling fields mNotify expects',
  /is_schedule:\s*false/.test(sms) && /schedule_date:\s*''/.test(sms),
  'expected is_schedule: false and schedule_date: ""',
);
check(
  'the sender ID comes from MNOTIFY_SENDER_ID with a DiDwa default',
  /MNOTIFY_SENDER_ID/.test(sms) && /MNOTIFY_SENDER_ID\s*\|\|\s*'DiDwa'/.test(sms),
  'expected MNOTIFY_SENDER_ID falling back to DiDwa',
);
/* 3. Success detection must read mNotify's shape, not Arkesel's. */
check(
  'success detection reads `summary._id` (the campaign/delivery-report handle)',
  /data\?\.summary\?\._id/.test(sms),
  'expected the response campaign ID to be captured from summary._id',
);
check(
  'the returned messageId is populated from the response',
  /messageId\s*[,=]/.test(sms) && /data\?\.summary\?\._id\s*\|\|\s*null/.test(sms),
  'expected sendSms to return the campaign ID for delivery-report lookups',
);

/* 4. Dry-run safety: no HTTP when credentials are absent. */
check(
  'dry-run is derived from a missing mNotify API key',
  /export const smsDryRun = !API_KEY/.test(sms),
  'expected `export const smsDryRun = !API_KEY`',
);
check(
  'the dry-run branch returns before any HTTP call is attempted',
  /if \(smsDryRun\)[\s\S]{0,400}return \{ ok: true, dryRun: true/.test(sms)
    && sms.indexOf('if (smsDryRun)') < sms.indexOf('client.post'),
  'the dry-run guard must sit above the client.post call',
);
/* 5. Failure handling stays non-fatal for the billing cron. */
check(
  'dispatch errors are caught and returned, not thrown',
  /catch \(err\)[\s\S]{0,600}return \{ ok: false, error: detail \}/.test(sms),
  'a failed SMS must not reject into the billing cron',
);

/* 6. No Arkesel remnants anywhere in the repo. */
const tracked = [
  'services/smsService.js', 'routes/billingRoutes.js', 'routes/inventoryRoutes.js',
  'src/pages/SellerInventory.jsx', 'src/pages/PublicPages.jsx', 'utils/helpers.js',
  'README.md', '.env.example',
];
const leaked = tracked.filter((f) => /arkesel/i.test(read(f)));
check(
  'no Arkesel references remain in source, docs or env templates',
  leaked.length === 0,
  leaked.length ? `still present in: ${leaked.join(', ')}` : '',
);

/* 7. The admin health panel must not drift from the SMS provider again.
 * Assert against CODE ONLY: the file's comment block deliberately names the old
 * invented keys to explain why they were removed. */
const adminSystem = read('routes/admin/system.js')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const adminSystemView = read('src/pages/admin/AdminSystem.jsx');
check(
  'the admin health panel checks MNOTIFY_API_KEY, not the invented SMS_API_KEY',
  /MNOTIFY_API_KEY/.test(adminSystem) && !/SMS_API_KEY/.test(adminSystem),
  'a healthy SMS provider must not read as unconfigured on the health screen',
);
check(
  'no invented integration keys remain on the health panel',
  !/HUBTEL_API_KEY|MTN_MOMO_CLIENT_KEY|WHATSAPP_TOKEN/.test(adminSystem),
  'these keys exist nowhere in the codebase, so those rows were always false',
);
check(
  'a capability lists every env var it needs (ALL, not any)',
  /keys\.every\(/.test(adminSystem),
  'expected keys.every(...) so a partial credential set cannot read as configured',
);
check(
  'the health panel renders every key a capability needs',
  /row\.keys\.join/.test(adminSystemView) && !/row\.key\b/.test(adminSystemView),
  'a multi-key capability must not render an undefined row.key',
);

/* 8. Live behaviour: with no key set, a real call must dry-run, not throw. */
const { smsDryRun, sendSms, sendWelcomeSms } = await import('../services/smsService.js');
check(
  'smsDryRun is true in this test environment (MNOTIFY_API_KEY unset)',
  smsDryRun === true,
  'tests must not attempt live delivery - clear MNOTIFY_API_KEY when running',
);

const sent = await sendSms(['233201234567'], 'test message');
check(
  'sendSms returns ok in dry-run without throwing',
  sent?.ok === true && sent?.dryRun === true,
  `got ${JSON.stringify(sent)}`,
);

const welcome = await sendWelcomeSms({
  name: 'Test Store', phone: '233201234567', trial_ends_at: new Date(),
});
check(
  'a lifecycle template routes through the same dry-run guard',
  welcome?.ok === true && welcome?.dryRun === true,
  `got ${JSON.stringify(welcome)}`,
);

/* 8. A failed low-stock send must NOT leave the merchant silently unalerted.
 * The latch is set inside the stock transaction (for de-duplication), so a
 * failure that leaves it set loses the alert permanently until restock. */
const inventory = read('routes/inventoryRoutes.js');

check(
  'a failed low-stock send re-arms the alert latch',
  /low_stock_alert_sent = FALSE/.test(inventory),
  'expected the failed-send path to clear low_stock_alert_sent so it retries',
);
check(
  'the restock audit row is written only on confirmed success',
  /if \(res\?\.ok\) \{\s*await recordLowStockAlerts/.test(inventory),
  'expected recordLowStockAlerts to run only inside the success branch',
);
check(
  'every stock route dispatches through the shared failure-aware helper',
  // inventoryRoutes.js may call the template only inside dispatchLowStockAlerts;
  // orderRoutes.js and posRoutes.js must not call it at all.
  /dispatchLowStockAlerts\(/.test(read('routes/orderRoutes.js'))
    && /dispatchLowStockAlerts\(/.test(read('routes/posRoutes.js'))
    && !/sendLowStockAlertSms\(/.test(read('routes/orderRoutes.js'))
    && !/sendLowStockAlertSms\(/.test(read('routes/posRoutes.js')),
  'these routes must call dispatchLowStockAlerts, not sendLowStockAlertSms, which skips the re-arm',
);
check(
  'dispatch de-duplicates candidates by variant id',
  /new Map\(list\.map\(\(c\) => \[c\.id, c\]\)\)/.test(inventory),
  'several lines moving one variant must not produce duplicate alerts',
);

/* 9. The 8s cap discarded live alerts. All sendSms callers are post-commit and
 * fire-and-forget, so no seller is waiting on the gateway. */
check(
  'the send timeout is no longer capped for serverless',
  !/ON_VERCEL \? 8_000/.test(sms) && /TIMEOUT_MS = 20_000/.test(sms),
  'expected a single 20s timeout, not a serverless-capped one',
);
check(
  'a failed dispatch logs enough context to diagnose',
  /timedOut:/.test(sms) && /timeoutMs:/.test(sms),
  'a bare "timeout exceeded" gives no way to tell which alert died',
);

/* 10. Callers still funnel through the unchanged sendSms signature. */
const cron = read('jobs/billingCron.js');
check(
  'billingCron still imports the notification functions by name',
  /from '\.\.\/services\/smsService\.js'/.test(cron)
    && /sendTrialReminderSms|sendRenewalReminderSms|sendSuspensionSms/.test(cron),
  'the provider swap must not have changed any exported notification function',
);

console.log(`\n${pass} passed, ${failures.length} failed`);
if (failures.length) {
  console.log(`Failed: ${failures.join(', ')}`);
  process.exit(1);
}