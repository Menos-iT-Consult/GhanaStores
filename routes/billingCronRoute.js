/**
 * DiDwa - Billing Cron Route (Vercel Cron Jobs)
 *
 *   GET /api/cron/billing
 *
 * Runs the full billing lifecycle every day:
 *   Trial:  Day 11 reminder -> Day 14 TRIAL->PAST_DUE -> Day 17 SUSPENDED
 *   Paid:   3 days before plan_period_end reminder -> lapse -> +3d SUSPENDED
 *
 * Ordering matters: both expiry steps run before suspension, so a store that
 * lapses today is PAST_DUE (with a fresh grace window) before the suspension
 * step evaluates it.
 *
 * Secured with `Authorization: Bearer $CRON_SECRET`. Vercel attaches that
 * header automatically when CRON_SECRET exists in Project Environment
 * Variables. In local dev (no CRON_SECRET) the endpoint still runs so manual
 * triggers / tests work, but it logs a loud warning.
 */
import { Router } from 'express';
import {
  runRenewalReminders,
  runSendRenewalReminders,
  runExpireTrials,
  runExpireRenewals,
  runSuspendOverdue,
} from '../jobs/billingCron.js';

const router = Router();

export async function billingCronHandler(req, res, next) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const provided = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (provided !== secret) {
        return res.status(401).json({ error: 'Unauthorized cron invocation.' });
      }
    } else {
      console.warn('[cron] CRON_SECRET is not set - /api/cron/billing is unauthenticated. Set it before going live.');
    }

    const renewalRemindersSent = await runRenewalReminders();
    const renewalRemindersSentPaid = await runSendRenewalReminders();
    const trialsMovedToPastDue = await runExpireTrials();
    // Must precede suspension: a store that lapsed today is PAST_DUE before
    // runSuspendOverdue evaluates its grace window.
    const renewalsMovedToPastDue = await runExpireRenewals();
    const storesSuspended = await runSuspendOverdue();

    return res.json({
      ok: true,
      ranAt: new Date().toISOString(),
      result: {
        renewalRemindersSent,
        renewalRemindersSentPaid,
        trialsMovedToPastDue,
        renewalsMovedToPastDue,
        storesSuspended,
      },
    });
  } catch (err) {
    return next(err);
  }
}

router.get('/billing', billingCronHandler);

export default router;