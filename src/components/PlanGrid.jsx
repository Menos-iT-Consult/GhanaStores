/**
 * PlanGrid - the monthly/yearly plan cards, shared by the public pricing page
 * and the seller's upgrade dialog so the two can never drift apart.
 *
 * Display-only: every price shown comes from the catalogue via usePlans, and
 * the amount charged is resolved again on the server when the seller subscribes.
 * `renderAction` decides what the button on each card does.
 */
import { Check, Sparkles } from 'lucide-react';
import { ghs, priceFor, yearlySavingPct } from '../lib/plans.js';

/** Monthly / yearly switch. Yearly is the default so the saving is visible. */
export function CycleToggle({ cycle, onChange }) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl bg-mist p-1"
      role="group"
      aria-label="Billing period"
    >
      {['monthly', 'yearly'].map((option) => {
        const active = cycle === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={`rounded-lg px-4 py-2 text-sm font-bold capitalize transition ${
              active ? 'bg-white text-charcoal shadow-sm' : 'text-slate-500 hover:text-charcoal'
            }`}
          >
            {option}
            {option === 'yearly' ? (
              <span className="ml-1.5 text-[10px] font-extrabold uppercase text-emerald-brand">Save 2 mo</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default function PlanGrid({ plans, cycle, currentPlanId, loading, error, renderAction }) {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
        {error}
      </p>
    );
  }

  if (!plans.length) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
        No plans are available right now. Please contact support.
      </p>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => {
        const amount = priceFor(plan, cycle);
        const free = amount <= 0;
        const isCurrent = plan.id === currentPlanId;
        const saving = cycle === 'yearly' ? yearlySavingPct(plan) : 0;
        // The middle tier is the one we want most sellers on.
        const featured = plan.id === 'growth';

        return (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-2xl border bg-white p-6 ${
              featured ? 'border-blue-600 shadow-xl shadow-blue-600/10' : 'border-slate-200'
            }`}
          >
            {featured ? (
              <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
                <Sparkles size={11} aria-hidden="true" /> Most popular
              </span>
            ) : null}
            {isCurrent ? (
              <span className="absolute -top-3 right-6 rounded-full bg-emerald-brand px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
                Your plan
              </span>
            ) : null}

            <h3 className="text-lg font-extrabold tracking-tight">{plan.name}</h3>
            {plan.tagline ? <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p> : null}

            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold tracking-tight">{free ? 'Free' : ghs(amount)}</span>
              {!free ? (
                <span className="text-sm font-semibold text-slate-400">
                  /{cycle === 'yearly' ? 'yr' : 'mo'}
                </span>
              ) : null}
            </p>
            {saving > 0 ? (
              <p className="mt-1 text-xs font-bold text-emerald-brand">
                Two months free versus paying monthly
              </p>
            ) : null}

            <ul className="mt-6 flex-1 space-y-2.5">
              {(plan.features || []).map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check size={16} className="mt-0.5 shrink-0 text-emerald-brand" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7">{renderAction?.(plan, { amount, cycle, isCurrent, free })}</div>
          </div>
        );
      })}
    </div>
  );
}
