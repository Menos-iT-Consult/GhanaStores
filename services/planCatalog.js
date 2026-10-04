/**
 * DiDwa - Subscription plan catalogue.
 *
 * One authority for "what plans exist" and "what does each cost", shared by the
 * public /pricing page, the seller upgrade flow and the admin editor. The rule
 * that makes this safe is that the amount charged is ALWAYS resolved here on the
 * server: the browser's idea of a price is display-only and is never charged.
 * A request that sends its own price is ignored outright.
 *
 * Billing is pay-upfront - one charge buys the period and nothing auto-renews -
 * so a cycle only decides how long the paid period runs for.
 *
 * Reads are cached for a minute: the pricing page and the dashboard both render
 * the catalogue, while an admin's price change should still take effect almost
 * immediately.
 */
import { query } from '../config/database.js';

const CACHE_MS = 60_000;

/**
 * Last-resort catalogue used only if `plans` has not been seeded at all, so a
 * missing migration degrades to the previous hard-coded behaviour instead of a
 * broken page or a 503. These figures are NOT a pricing source of truth.
 *
 * smsMonthlySegments IS present here for the same reason: it is an entitlement
 * that gates whether a store can send platform SMS at all. Leaving it out would
 * let a missing `plans` table silently change what merchants can actually do.
 */
const FALLBACK_PLANS = [
  { id: 'starter', name: 'Starter', tagline: '14-day free trial', monthly_price_ghs: 0, yearly_price_ghs: 0, features: ['Up to 20 products', 'Mobile money payments', 'Order tracking', 'Email support'], max_products: 20, smsMonthlySegments: 0, is_enabled: true, sort_order: 1 },
  { id: 'growth', name: 'Growth', tagline: 'For growing shops', monthly_price_ghs: 79, yearly_price_ghs: 790, features: ['Up to 500 products', 'Mobile money payments', 'Domain name included', 'Theme marketplace', 'Priority support'], max_products: 500, smsMonthlySegments: 50, is_enabled: true, sort_order: 2 },
  { id: 'scale', name: 'Scale', tagline: 'High-volume merchants', monthly_price_ghs: 199, yearly_price_ghs: 1990, features: ['Unlimited products', 'Multi-currency pricing', 'Team seats', 'Dedicated account manager'], max_products: 100000, smsMonthlySegments: 100, is_enabled: true, sort_order: 3 },
];

/** Billing cycles a seller may choose. */
export const CYCLES = ['monthly', 'yearly'];

/** Months a cycle buys - drives `plan_period_end`. */
const CYCLE_MONTHS = { monthly: 1, yearly: 12 };

let cache = { at: 0, data: null };

/** Force the next read to hit the database. Called after any admin change. */
export function invalidatePlanCache() {
  cache = { at: 0, data: null };
}

const toPlan = (row) => ({
  id: row.id,
  name: row.name,
  tagline: row.tagline,
  monthlyPriceGhs: Number(row.monthly_price_ghs),
  yearlyPriceGhs: Number(row.yearly_price_ghs),
  features: Array.isArray(row.features) ? row.features : [],
  maxProducts: Number(row.max_products ?? 0),
  // Free platform SMS segments per period. 0 (Starter) means no free allowance -
  // NOT a lockout: Starter may still buy prepaid segments.
  smsMonthlySegments: Number(row.sms_monthly_segments ?? 0),
  isEnabled: Boolean(row.is_enabled),
  sortOrder: Number(row.sort_order ?? 100),
});

/**
 * Every plan in the catalogue, enabled or not.
 * @returns {Promise<{plans: object[], byId: Map<string,object>, catalogued: boolean}>}
 */
export async function loadPlanCatalog({ force = false } = {}) {
  if (!force && cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;

  let data;
  try {
    const { rows } = await query(
      `SELECT id, name, tagline, monthly_price_ghs, yearly_price_ghs, features,
              max_products, sms_monthly_segments, is_enabled, sort_order
         FROM plans ORDER BY sort_order, id`,
    );
    data = {
      plans: rows.map(toPlan),
      byId: new Map(rows.map((row) => [row.id, toPlan(row)])),
      catalogued: rows.length > 0,
    };
  } catch {
    // A missing table must not break the pricing page or the upgrade flow.
    data = {
      plans: FALLBACK_PLANS,
      byId: new Map(FALLBACK_PLANS.map((p) => [p.id, p])),
      catalogued: false,
    };
  }
  cache = { at: Date.now(), data };
  return data;
}

/** Only the plans offered to buyers, cheapest first - what the pricing page shows. */
export async function listPublicPlans() {
  const { plans } = await loadPlanCatalog();
  return plans.filter((p) => p.isEnabled);
}

/** The price of one plan on one cycle. */
export const planPrice = (plan, cycle) =>
  (cycle === 'yearly' ? plan.yearlyPriceGhs : plan.monthlyPriceGhs);

/** How long a cycle runs for, as a Postgres interval fragment. */
export const cycleInterval = (cycle) =>
  `${CYCLE_MONTHS[cycle === 'yearly' ? 'yearly' : 'monthly']} months`;

/**
 * Resolve a plan + cycle to a priceable offer, or an error explaining why not.
 *
 * The plan must exist and still be enabled: disabling a plan in the admin takes
 * it off sale without touching the tenants already paying for it. The cycle must
 * be one we bill, and the amount must be positive - the free trial (starter) is
 * never bought, it is granted at registration.
 *
 * @returns {{ok: true, plan: object, cycle: string, amountGhs: number} | {ok: false, error: string}}
 */
export async function resolveOffer(planId, cycle) {
  const wanted = String(cycle || '').toLowerCase();
  if (!CYCLES.includes(wanted)) {
    return { ok: false, error: 'Choose a monthly or yearly billing period.' };
  }

  const { byId } = await loadPlanCatalog();
  const plan = byId.get(String(planId || '').toLowerCase());
  if (!plan) return { ok: false, error: 'That plan does not exist.' };
  if (!plan.isEnabled) return { ok: false, error: 'That plan is no longer available. Please choose another.' };

  const amountGhs = planPrice(plan, wanted);
  if (!(amountGhs > 0)) {
    return { ok: false, error: 'Choose a paid plan to subscribe (starter is the free trial).' };
  }
  return { ok: true, plan, cycle: wanted, amountGhs };
}
