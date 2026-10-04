/**
 * DiDwa - platform SMS quota.
 *
 * Order SMS sent on the DiDwa key is DiDwa's own cost, so it is metered. A store
 * sending on THEIR OWN key is never metered here - they pay their provider from
 * their own balance, and charging them quota too would be double-billing.
 *
 * Two balances, both in SEGMENTS (140 chars, what providers actually bill):
 *
 *   plan allowance - free with Growth/Scale, RESETS every period
 *                    (store_sms_usage, keyed by period, so a new period starts
 *                    clean with no cron that can silently fail)
 *   prepaid        - bought via MoMo, CARRIES OVER forever
 *                    (store_sms_balance, one row per store, never reset)
 *
 * Consumption order is allowance first, then prepaid. That is the deliberate
 * choice: the free remainder is what lapses at period end, which is the honest
 * outcome since nobody paid for it, while a merchant's paid segments survive
 * untouched until their free allowance is genuinely used up.
 *
 * FAIL CLOSED. If the ledger cannot be read or written, callers must not send on
 * the platform key - a broken ledger would otherwise spend DiDwa's real mNotify
 * balance with nothing stopping it, which is the exact unbounded cost this quota
 * exists to prevent.
 */
import { query, withTransaction } from '../config/database.js';
import { loadPlanCatalog } from './planCatalog.js';

/** Largest single purchase we accept, so a typo cannot ask for a billion. */
const MAX_PURCHASE_SEGMENTS = 1_000_000;

/** Free segments included with a store's plan. 0 for Starter - not a lockout. */
export async function planAllowance(storeId) {
  const { rows } = await query('SELECT plan FROM stores WHERE id = $1', [storeId]);
  if (!rows[0]) return 0;
  const { byId } = await loadPlanCatalog();
  return byId.get(rows[0].plan)?.smsMonthlySegments ?? 0;
}

/**
 * The store's current billing period, taken from the paid subscription itself.
 *
 * This is the subscription anniversary, not the calendar month: the allowance
 * was bought with that period, so resetting on the 1st would hand out a free
 * period's worth of segments to everyone whose renewal landed early. A store
 * with no live paid period (trial, manual, comped) falls back to the calendar
 * month, the best boundary available.
 */
async function currentPeriod(client, storeId) {
  const db = client || { query };
  const { rows } = await db.query(
    'SELECT plan_cycle, plan_period_end FROM stores WHERE id = $1',
    [storeId],
  );
  const end = rows[0]?.plan_period_end;
  if (end && new Date(end).getTime() > Date.now()) {
    const months = rows[0]?.plan_cycle === 'yearly' ? 12 : 1;
    const start = new Date(end);
    start.setUTCMonth(start.getUTCMonth() - months);
    return { periodStart: start.toISOString(), periodEnd: new Date(end).toISOString() };
  }
  const now = new Date();
  return {
    periodStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
    periodEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
  };
}

/**
 * Ensure this period's usage row exists, under a row lock, and return the count.
 *
 * The INSERT races are handled by ON CONFLICT DO NOTHING plus a re-select: two
 * orders confirming at the same moment must not both die on a unique violation,
 * and must both end up locked on the SAME row.
 */
async function lockPeriodUsage(client, storeId, period) {
  await client.query(
    `INSERT INTO store_sms_usage (store_id, period_start, period_end)
     VALUES ($1, $2, $3) ON CONFLICT (store_id, period_start) DO NOTHING`,
    [storeId, period.periodStart, period.periodEnd],
  );
  const { rows } = await client.query(
    `SELECT plan_segments_used FROM store_sms_usage
      WHERE store_id = $1 AND period_start = $2 FOR UPDATE`,
    [storeId, period.periodStart],
  );
  return Number(rows[0]?.plan_segments_used ?? 0);
}

/** Ensure the store's prepaid balance row exists and return it, locked. */
async function lockBalance(client, storeId) {
  await client.query(
    `INSERT INTO store_sms_balance (store_id, segments) VALUES ($1, 0)
     ON CONFLICT (store_id) DO NOTHING`,
    [storeId],
  );
  const { rows } = await client.query(
    'SELECT segments FROM store_sms_balance WHERE store_id = $1 FOR UPDATE',
    [storeId],
  );
  return Number(rows[0]?.segments ?? 0);
}
/**
 * A store's full quota picture, for the dashboard. Read-only: it never locks and
 * never creates rows, so rendering the page cannot contend with an order.
 */
export async function getQuota(storeId) {
  const [allowance, period] = await Promise.all([
    planAllowance(storeId),
    currentPeriod(null, storeId),
  ]);
  const { rows } = await query(
    `SELECT u.plan_segments_used AS used, b.segments AS purchased
       FROM stores s
       LEFT JOIN store_sms_usage u ON u.store_id = s.id AND u.period_start = $2
       LEFT JOIN store_sms_balance b ON b.store_id = s.id
      WHERE s.id = $1`,
    [storeId, period.periodStart],
  );
  const used = Number(rows[0]?.used ?? 0);
  const purchased = Number(rows[0]?.purchased ?? 0);
  const allowanceRemaining = Math.max(0, allowance - used);
  const totalRemaining = allowanceRemaining + purchased;

  return {
    allowance,
    used,
    allowanceRemaining,
    purchased,
    // What the store may actually send right now, across both balances.
    totalRemaining,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    exhausted: totalRemaining <= 0,
  };
}

/**
 * Spend `segments` of the store's quota, or report that there is none left.
 *
 * Spends the free allowance first, then prepaid (see the header for why).
 *
 * CONCURRENCY: two orders confirming simultaneously must not both read
 * "remaining = 1" and both spend it. The whole decision runs in one transaction
 * with SELECT ... FOR UPDATE on both rows, so the second order blocks and then
 * re-reads the already-decremented value.
 *
 * Lock order is ALWAYS usage-then-balance, matching creditPurchase, so the two
 * can never deadlock against each other.
 *
 * @returns {{ok:true, fromAllowance:number, fromPurchased:number}
 *          | {ok:false, reason:'QUOTA_EXHAUSTED'|'QUOTA_UNAVAILABLE'}}
 */
export async function consumeSegments(storeId, segments) {
  const wanted = Math.max(1, Math.ceil(Number(segments) || 0));
  try {
    const allowance = await planAllowance(storeId);
    const period = await currentPeriod(null, storeId);

    return await withTransaction(async (t) => {
      const used = await lockPeriodUsage(t, storeId, period);
      const purchased = await lockBalance(t, storeId);
      const freeLeft = Math.max(0, allowance - used);

      if (freeLeft + purchased < wanted) {
        return { ok: false, reason: 'QUOTA_EXHAUSTED' };
      }

      // Free allowance first, then prepaid.
      const fromAllowance = Math.min(wanted, freeLeft);
      const fromPurchased = wanted - fromAllowance;

      if (fromAllowance > 0) {
        await t.query(
          `UPDATE store_sms_usage
              SET plan_segments_used = plan_segments_used + $3, updated_at = NOW()
            WHERE store_id = $1 AND period_start = $2`,
          [storeId, period.periodStart, fromAllowance],
        );
      }
      if (fromPurchased > 0) {
        await t.query(
          `UPDATE store_sms_balance SET segments = segments - $2, updated_at = NOW()
            WHERE store_id = $1`,
          [storeId, fromPurchased],
        );
      }
      return { ok: true, fromAllowance, fromPurchased };
    });
  } catch (err) {
    // Fail closed: the caller must NOT send on the platform key.
    console.error('[sms-quota] could not consume segments, blocking platform SMS', {
      store: storeId,
      segments: wanted,
      error: err.message,
    });
    return { ok: false, reason: 'QUOTA_UNAVAILABLE' };
  }
}

/**
 * Credit prepaid segments after a confirmed payment.
 *
 * Segments carry over indefinitely, so there is no period argument: the money
 * was already taken and the balance must never silently lapse.
 *
 * `client` lets a caller pass an existing transaction so the credit commits
 * together with the payment row it belongs to. Called on its own it opens its
 * own transaction. It must NOT be called with a bare client while also opening
 * one of its own - that would take a second pooled connection and split the two
 * writes across two transactions, which is exactly the paid-row-without-balance
 * state this exists to prevent.
 */
export async function creditPurchase(storeId, segments, client = null) {
  const amount = Math.max(0, Math.min(MAX_PURCHASE_SEGMENTS, Math.ceil(Number(segments) || 0)));
  if (!amount) return { ok: false, error: 'Enter how many segments you want to buy.' };

  if (client) {
    await lockBalance(client, storeId);
    const { rows } = await client.query(
      `UPDATE store_sms_balance SET segments = segments + $2, updated_at = NOW()
        WHERE store_id = $1 RETURNING segments`,
      [storeId, amount],
    );
    return { ok: true, purchased: Number(rows[0].segments) };
  }

  return withTransaction(async (t) => creditPurchase(storeId, amount, t));
}

/** The global pricing switches, for the seller page and for price resolution. */
export async function getSmsSettings() {
  const { rows } = await query(
    `SELECT price_per_segment, min_purchase, is_purchases_enabled
       FROM sms_settings WHERE id = 1`,
  );
  return {
    pricePerSegment: rows[0]?.price_per_segment == null ? null : Number(rows[0].price_per_segment),
    minPurchase: Number(rows[0]?.min_purchase ?? 100),
    isPurchasesEnabled: Boolean(rows[0]?.is_purchases_enabled),
  };
}

/**
 * Resolve a segment count to a chargeable offer.
 *
 * The price is read HERE, on the server, from sms_settings. A price sent by the
 * client is ignored outright - the same rule resolveOffer enforces for plans, and
 * the reason this endpoint cannot be used to buy 10,000 segments for one pesewa.
 *
 * @returns {{ok:true, segments:number, pricePerSegment:number, amountGhs:number}
 *          | {ok:false, error:string}}
 */
export async function resolveSegmentOffer(segments) {
  const settings = await getSmsSettings();

  if (!settings.isPurchasesEnabled) {
    return { ok: false, error: 'Buying extra SMS is temporarily unavailable. Please contact support.' };
  }
  if (settings.pricePerSegment == null) {
    // Ships unset on purpose: never charge against a placeholder price.
    return { ok: false, error: 'Extra SMS are not available yet. Please contact support.' };
  }

  const wanted = Math.ceil(Number(segments));
  if (!Number.isFinite(wanted) || wanted < settings.minPurchase) {
    return { ok: false, error: `Buy at least ${settings.minPurchase} segments.` };
  }
  if (wanted > MAX_PURCHASE_SEGMENTS) {
    return { ok: false, error: `That is more than the ${MAX_PURCHASE_SEGMENTS}-segment maximum per purchase.` };
  }

  // Rounded to pesewas because that is what the gateway actually charges;
  // passing the unrounded figure would leave the payment row and the collection
  // amount disagreeing.
  const amountGhs = Math.round(wanted * settings.pricePerSegment * 100) / 100;
  return { ok: true, segments: wanted, pricePerSegment: settings.pricePerSegment, amountGhs };
}

export const SMS_SEGMENT_MAX = MAX_PURCHASE_SEGMENTS;