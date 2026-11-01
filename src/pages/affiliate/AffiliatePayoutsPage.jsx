import { CheckCircle2, ShieldCheck } from 'lucide-react';

const money = (value) => `GHS ${Number(value || 0).toFixed(2)}`;
const date = (value) => value ? new Date(value).toLocaleDateString() : '—';

function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase();
  const styles = {
    pending: 'bg-amber-50 text-amber-700',
    paid: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-rose-50 text-rose-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${styles[normalized] || 'bg-slate-100 text-slate-600'}`}>
      {normalized || 'Unknown'}
    </span>
  );
}

export default function AffiliatePayoutsPage({
  profile,
  stats,
  program,
  payouts,
  payoutAmount,
  onPayoutAmountChange,
  onRequestPayout,
  busy,
  momoNetwork,
  onMomoNetworkChange,
  momoNumber,
  onMomoNumberChange,
  onVerifyPayoutAccount,
  savingPayoutAccount,
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-blue-600" size={20} aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold text-charcoal">Payout account</h2>
            <p className="mt-1 text-sm text-slate-500">Add or change the MoMo account for your payouts. Paystack will verify and return the account name.</p>
          </div>
        </div>
        {profile?.momo_verified_at ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={16} aria-hidden="true" />
            Verified name: {profile.momo_verified_name}
          </p>
        ) : (
          <p className="mt-3 text-sm font-semibold text-amber-700">A verified payout account is required before requesting a payout.</p>
        )}
        <form onSubmit={onVerifyPayoutAccount} className="mt-4 space-y-3">
          <label htmlFor="payout-network" className="block text-xs font-bold uppercase tracking-wide text-slate-500">Mobile Money network</label>
          <select
            id="payout-network"
            value={momoNetwork}
            onChange={(event) => onMomoNetworkChange(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="MTN">MTN Mobile Money</option>
            <option value="VODAFONE">Telecel Cash</option>
            <option value="AT">AirtelTigo Money</option>
          </select>
          <label htmlFor="payout-momo-number" className="block text-xs font-bold uppercase tracking-wide text-slate-500">Mobile Money number</label>
          <input
            id="payout-momo-number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={momoNumber}
            onChange={(event) => onMomoNumberChange(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="0244123456"
            required
          />
          <button type="submit" disabled={savingPayoutAccount || !momoNumber.trim()}
            className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">
            {savingPayoutAccount ? 'Verifying with Paystack...' : 'Verify and save payout account'}
          </button>
        </form>
      </section>

      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-charcoal">Request a payout</h2>
          <p className="mt-1 text-sm text-slate-500">{profile?.momo_verified_at
            ? `${profile.momo_network} · ${profile.momo_number}`
            : 'Verify your payout account above to enable requests.'}</p>
          {program && <p className="mt-2 text-xs text-slate-500">Minimum {money(program.minimumPayoutGhs)}. Processing: {program.payoutProcessingMinDays}–{program.payoutProcessingMaxDays} business days.</p>}
          <form onSubmit={onRequestPayout} className="mt-4 space-y-3">
            <label htmlFor="payout-amount" className="block text-xs font-bold uppercase tracking-wide text-slate-500">Amount (GHS)</label>
            <input id="payout-amount" type="number" min={program?.minimumPayoutGhs || 0.01} max={Number(stats?.available_payout || 0)} step="0.01"
              value={payoutAmount} onChange={(event) => onPayoutAmountChange(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="0.00" required />
            <button type="submit" disabled={busy || !profile?.momo_verified_at || Number(stats?.available_payout || 0) < Number(program?.minimumPayoutGhs || Infinity)}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? 'Submitting...' : 'Request Mobile Money payout'}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-bold text-charcoal">Payout history</h2>
          </div>
          {payouts.length ? (
            <ul className="divide-y divide-slate-100">
              {payouts.map((payout) => (
                <li key={payout.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-bold text-charcoal">{money(payout.amount_ghs)}</p>
                    <p className="text-xs text-slate-500">{date(payout.requested_at)}</p>
                  </div>
                  <StatusBadge status={payout.status} />
                </li>
              ))}
            </ul>
          ) : <p className="px-5 py-6 text-center text-sm text-slate-500">No payout requests yet.</p>}
        </section>
      </div>
    </div>
  );
}
