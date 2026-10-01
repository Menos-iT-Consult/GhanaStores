/**
 * SellerPlan - the plan upgrade page (/settings/plan).
 *
 * A subscription is a Mobile Money collection, so it needs three things: the
 * plan, the billing period, and the wallet to charge. The amount shown here is
 * display-only - POST /api/billing/subscribe resolves the real price from the
 * plan catalogue on the server, so tampering with this page cannot change what
 * a seller is billed.
 *
 * Reached from the trial banner's "Activate Plan" button, from the public
 * pricing page, and from the settings nav.
 */
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard } from 'lucide-react';
import { api } from '../api.js';
import PlanGrid, { CycleToggle } from '../components/PlanGrid.jsx';
import { ghs, usePlans } from '../lib/plans.js';
import { navigate } from '../router.js';

const NETWORKS = [
  ['MTN', 'MTN MoMo'],
  ['VODAFONE', 'Telecel / Vodafone'],
  ['AT', 'AT Money'],
];

/** Preselect the plan/cycle a visitor arrived with, e.g. from the pricing page. */
function readQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    planId: params.get('plan') || '',
    cycle: params.get('cycle') === 'monthly' ? 'monthly' : 'yearly',
  };
}

export default function SellerPlan() {
  const initial = readQuery();
  const { plans, current, loading, error, reload } = usePlans();

  const [cycle, setCycle] = useState(initial.cycle);
  const [selected, setSelected] = useState(initial.planId);
  const [network, setNetwork] = useState('MTN');
  const [momoNumber, setMomoNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);

  /* Default to whatever the seller is on, so the page opens on their plan. */
  useEffect(() => {
    if (!selected && current?.plan) setSelected(current.plan);
  }, [current, selected]);

  /* Pre-fill the wallet with the number the store already uses, if we know it. */
  useEffect(() => {
    try {
      const store = JSON.parse(localStorage.getItem('gs_store') || 'null');
      if (store?.momoNumber) setMomoNumber(store.momoNumber);
    } catch { /* no cached store - the seller types it */ }
  }, []);

  const plan = plans.find((p) => p.id === selected) || null;
  const amount = plan ? Number(cycle === 'yearly' ? plan.yearlyPriceGhs : plan.monthlyPriceGhs) : 0;

  const subscribe = useCallback(async () => {
    setBusy(true);
    setFailure(null);
    setResult(null);
    try {
      const data = await api.post('/api/billing/subscribe', {
        planId: selected,
        cycle,
        network,
        momoNumber: momoNumber.trim(),
      });
      setResult(data);
      setSelected('');
      setMomoNumber('');
      // The catalogue may have changed under us; re-read it and the status.
      await reload();
      api.get('/api/billing/status').catch(() => {});
    } catch (err) {
      setFailure(err);
    } finally {
      setBusy(false);
    }
  }, [selected, cycle, network, momoNumber, reload]);

  const numberValid = /^\s*(0|233)\s*\d{9}\s*$/.test(momoNumber);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-charcoal">Plan &amp; billing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pay by Mobile Money for {cycle === 'yearly' ? 'twelve months up front' : 'one month'}.
          Nothing renews automatically.
        </p>
      </header>

      {result ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-emerald-900">{result.message}</p>
            {result.periodEnd ? (
              <p className="mt-0.5 text-xs font-semibold text-emerald-800">
                Your plan runs until {new Date(result.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {failure ? (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-rose-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-rose-900">That payment did not go through</p>
            <p className="mt-0.5 text-xs font-semibold text-rose-800">{failure.message}</p>
          </div>
        </div>
      ) : null}

      <div className="flex justify-center">
        <CycleToggle cycle={cycle} onChange={setCycle} />
      </div>

      <PlanGrid
        plans={plans}
        cycle={cycle}
        currentPlanId={current?.plan}
        loading={loading}
        error={error}
        renderAction={(p, meta) => (
          <button
            type="button"
            onClick={() => setSelected(p.id)}
            disabled={meta.free || selected === p.id}
            className={`w-full rounded-xl py-3 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              selected === p.id
                ? 'bg-blue-700 text-white shadow-lg shadow-blue-600/25'
                : meta.free
                ? 'cursor-default border border-slate-200 bg-mist text-slate-400'
                : 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700'
            }`}
          >
            {meta.free ? 'Free trial plan' : selected === p.id ? 'Selected' : `Choose ${p.name}`}
          </button>
        )}
      />

      {selected && plan && amount > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-blue-600" aria-hidden="true" />
            <h2 className="text-base font-extrabold tracking-tight">
              Pay {ghs(amount)} for {plan.name} ({cycle === 'yearly' ? '12 months' : '1 month'})
            </h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Mobile Money number</span>
              <input
                type="tel"
                inputMode="tel"
                value={momoNumber}
                onChange={(e) => setMomoNumber(e.target.value)}
                placeholder="e.g. 024 123 4567"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              {momoNumber && !numberValid ? (
                <span className="mt-1 block text-xs font-semibold text-rose-600">
                  Enter a valid Ghanaian number, e.g. 0241234567.
                </span>
              ) : (
                <span className="mt-1 block text-xs text-slate-400">The wallet the plan is charged from.</span>
              )}
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Network</span>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                {NETWORKS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-400">Approve the prompt on your phone to finish.</span>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <p className="text-xs text-slate-500">
              Your plan starts the moment the payment is confirmed.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelected('')}
                className="rounded-xl px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={subscribe}
                disabled={busy || !numberValid}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Waiting for approval...' : `Pay ${ghs(amount)}`}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-mist/60 p-6">
        <h2 className="text-sm font-extrabold text-charcoal">Need something else?</h2>
        <p className="mt-1 text-sm text-slate-500">
          Selling high volume or need team seats? Tell us what you need and we will point you at the
          right plan.
        </p>
        <button
          type="button"
          onClick={() => navigate('/contact')}
          className="mt-4 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-charcoal transition hover:border-slate-300"
        >
          Contact support
        </button>
      </div>
    </div>
  );
}

