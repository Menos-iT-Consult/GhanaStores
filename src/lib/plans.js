/**
 * usePlans - the subscription catalogue for the browser.
 *
 * Prices are FETCHED, never hard-coded: an admin price change must show up on
 * the public pricing page and in the seller's upgrade dialog without a client
 * release. The values here are display-only - the amount actually charged is
 * always resolved server-side from the same catalogue (services/planCatalog.js),
 * so a tampered client cannot influence what a seller is billed.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

/** GHS with no decimals when whole, which is how prices are advertised. */
export const ghs = (value) => {
  const n = Number(value ?? 0);
  return `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

/** The price of a plan on a cycle, in the catalogue's own field. */
export const priceFor = (plan, cycle) =>
  Number(cycle === 'yearly' ? plan?.yearlyPriceGhs : plan?.monthlyPriceGhs) || 0;

/** Effective monthly cost of a yearly plan, for the "save X%" hint. */
export function yearlySavingPct(plan) {
  const monthly = priceFor(plan, 'monthly');
  const yearly = priceFor(plan, 'yearly');
  // A free plan (0/0) has no saving to advertise, and monthly 0 would divide by 0.
  if (!(monthly > 0) || !(yearly > 0)) return 0;
  return Math.max(0, Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100));
}

/**
 * Loads the public plan catalogue.
 *
 * No token argument: `api.get` already attaches the seller token when one is
 * signed in, and the endpoint treats it as optional, so an anonymous visitor and
 * a signed-in seller use the exact same call.
 */
export function usePlans() {
  const [plans, setPlans] = useState([]);
  const [current, setCurrent] = useState(null);
  const [currency, setCurrency] = useState('GHS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/billing/plans');
      setPlans(Array.isArray(data?.plans) ? data.plans : []);
      setCurrent(data?.current ?? null);
      setCurrency(data?.currency || 'GHS');
    } catch (err) {
      setError(err.message || 'Could not load plans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { plans, current, currency, loading, error, reload: load };
}

export default usePlans;
