/**
 * DiDwa - Billing Cron Engine
 *
 * Daily lifecycle automation for free trials AND paid plans:
 *   Trial:  Day 11 reminder -> Day 14 TRIAL->PAST_DUE -> Day 17 SUSPENDED
 *   Paid:   Day -3 reminder -> plan_period_end ACTIVE->PAST_DUE
 *          -> +3d grace SUSPENDED
 *
 * Billing is pay-upfront with no auto-renew, so the paid path is the one that
 * actually keeps a storefront online over time. Both paths use the same 3-day
 * grace before suspension.
 *
 * Runs at 08:00 Africa/Accra when ENABLE_CRON=true, and every exported
 * function is callable directly for tests/manual triggers.
 */
import cron from 'node-cron';
import { query } from '../config/database.js';
import {
  sendTrialReminderSms,
  sendPastDueSms,
  sendSuspensionSms,
  sendRenewalReminderSms,
} from '../services/smsService.js';
import { sendLifecycleEmail } from '../services/emailService.js';

/**
 * Fire the matching lifecycle email alongside each SMS.
 *
 * Deliberately NOT awaited and NOT counted in the sent totals: email is a
 * second, independent channel, and a Gmail outage must not be reported as a
 * failed billing transition. `stores.email` is selected by every query below
 * for exactly this - the cron previously returned only name/phone, because
 * SMS was the sole channel.
 *
 * There is no retry and no latch here. If email fails the merchant still has
 * the SMS, and the next transition will try again anyway.
 */
function notifyEmail(store, template, extra) {
  sendLifecycleEmail(store, template, extra).catch(() => {});
}

/** Day 11: nudge merchants before expiry. */
export async function runRenewalReminders() {
  const { rows } = await query(
    `SELECT id, name, phone, email, subdomain_slug, custom_domain, trial_ends_at
       FROM stores
      WHERE status = 'TRIAL'
        AND trial_ends_at::date - CURRENT_DATE = 11`,
  );
  let sent = 0;
  for (const store of rows) {
    notifyEmail(store, 'trial-reminder');
    const res = await sendTrialReminderSms(store);
    if (res?.ok) sent += 1;
  }
  console.log(`[cron] renewal reminders sent: ${sent}/${rows.length}`);
  return sent;
}

/** Day 14+: expired trials move to PAST_DUE (grace period starts). */
export async function runExpireTrials() {
  const { rows } = await query(
    `UPDATE stores
        SET status = 'PAST_DUE'
      WHERE status = 'TRIAL'
        AND trial_ends_at <= NOW()
      RETURNING id, name, phone, email, subdomain_slug, custom_domain,
                trial_ends_at, grace_ends_at`,
  );
  for (const store of rows) {
    notifyEmail(store, 'past-due');
    await sendPastDueSms(store);
  }
  console.log(`[cron] trials moved to PAST_DUE: ${rows.length}`);
  return rows.length;
}

/**
 * Warn paying merchants 3 days before `plan_period_end`.
 *
 * Mirrors the trial reminder's Day-11 shape, but keyed on plan_period_end and
 * scoped to ACTIVE stores, so a lapsing subscriber is warned before the
 * storefront goes dark rather than after.
 */
export async function runSendRenewalReminders() {
  const { rows } = await query(
    `SELECT id, name, phone, email, subdomain_slug, custom_domain, plan, plan_period_end
       FROM stores
      WHERE status = 'ACTIVE'
        AND plan_period_end IS NOT NULL
        AND plan_period_end::date - CURRENT_DATE = 3`,
  );
  let sent = 0;
  for (const store of rows) {
    notifyEmail(store, 'renewal-reminder');
    const res = await sendRenewalReminderSms(store);
    if (res?.ok) sent += 1;
  }
  console.log(`[cron] paid-plan renewal reminders sent: ${sent}/${rows.length}`);
  return sent;
}

/**
 * A paid plan that ran out moves to PAST_DUE, with a FRESH 3-day grace window.
 *
 * The grace reset is the important part. `grace_ends_at` is stamped once by the
 * INSERT trigger (trial_ends_at + 3 days) and is never cleared on subscribe, so
 * without this a merchant who subscribed and later let their plan lapse would
 * arrive here still carrying a grace date from trial time - long past - and
 * `runSuspendOverdue` would suspend them on the very next run with no grace at
 * all. Anchoring to plan_period_end (not NOW()) keeps the window predictable and
 * gives the same 3 days a trialling merchant gets.
 */
export async function runExpireRenewals() {
  const { rows } = await query(
    `UPDATE stores s
        SET status = 'PAST_DUE',
            grace_ends_at = s.plan_period_end + INTERVAL '3 days'
      WHERE s.status = 'ACTIVE'
        AND s.plan_period_end IS NOT NULL
        AND s.plan_period_end <= NOW()
      RETURNING s.id, s.name, s.phone, s.email, s.subdomain_slug, s.custom_domain,
                s.plan, s.plan_period_end, s.grace_ends_at`,
  );
  for (const store of rows) {
    notifyEmail(store, 'past-due');
    await sendPastDueSms(store);
  }
  console.log(`[cron] paid plans moved to PAST_DUE: ${rows.length}`);
  return rows.length;
}

/** Trial end + 3-day grace elapsed -> hard suspension. */
export async function runSuspendOverdue() {
  const { rows } = await query(
    `UPDATE stores
        SET status = 'SUSPENDED'
      WHERE status = 'PAST_DUE'
        AND COALESCE(grace_ends_at, trial_ends_at + INTERVAL '3 days') <= NOW()
      RETURNING id, name, phone, email, subdomain_slug, custom_domain`,
  );
  for (const store of rows) {
    notifyEmail(store, 'past-due', { suspended: true });
    await sendSuspensionSms(store);
  }
  console.log(`[cron] stores suspended after grace period: ${rows.length}`);
  return rows.length;
}

/**
 * Full daily cycle in dependency order.
 *
 * Expiry must run before suspension: a store whose paid plan just lapsed is
 * moved to PAST_DUE here, and `runSuspendOverdue` may legitimately suspend it
 * in the same pass only if the fresh grace window is already over (a plan that
 * ran out more than 3 days ago and was never renewed). Running them in the other
 * order would leave it untouched until tomorrow.
 */
export async function runBillingCycle() {
  try {
    await runRenewalReminders();
    await runSendRenewalReminders();
    await runExpireTrials();
    await runExpireRenewals();
    await runSuspendOverdue();
  } catch (err) {
    console.error('[cron] billing cycle failed:', err.message);
  }
}

let scheduledTask = null;

export function startBillingCron() {
  if (scheduledTask) return scheduledTask;
  const enabled = String(process.env.ENABLE_CRON || '').toLowerCase() === 'true';
  if (!enabled) {
    console.log('[cron] ENABLE_CRON=false - billing scheduler idle (run manually via jobs API).');
    return null;
  }
  // 08:00 Accra time (GMT+0) daily.
  scheduledTask = cron.schedule('0 8 * * *', runBillingCycle, {
    timezone: 'Africa/Accra',
    name: 'didwa-billing',
  });
  console.log('[cron] billing scheduler active - daily at 08:00 Africa/Accra.');
  return scheduledTask;
}

export function stopBillingCron() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[cron] billing scheduler stopped.');
  }
}

export default { startBillingCron, stopBillingCron, runBillingCycle };
