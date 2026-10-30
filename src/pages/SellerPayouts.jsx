import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Wallet } from 'lucide-react';
import { api, ghs } from '../api.js';
import { IconSpinner } from '../components/icons.jsx';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
};

function Status({ value }) {
  const status = String(value || '').toLowerCase();
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-600'}`}>
      {status || 'unknown'}
    </span>
  );
}

export default function SellerPayouts() {
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await api.get('/api/seller/payouts'));
    } catch (requestError) {
      setError(requestError.message || 'Payout information could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function requestPayout(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api.post('/api/seller/payouts', { amountGhs: amount });
      setAmount('');
      setNotice(result.message || 'Payout request submitted for manual review.');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Payout request could not be submitted.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-slate-400"><IconSpinner className="mr-2" size={18} /> Loading payouts...</div>;
  }

  const balance = data?.balance || {};
  const payout = data?.payout || {};
  const canRequest = payout.managedMode && payout.momoNumber && payout.momoAccountName && payout.momoVerifiedAt
    && Number(balance.availableGhs || 0) >= Number(payout.minimumGhs || Infinity);

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-charcoal"><Wallet size={22} /> Managed payouts</h1>
        <p className="mt-1 text-sm text-slate-500">Track settled managed sales, fees, and Mobile Money payout requests.</p>
      </header>

      {error && <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <p role="status" className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={16} />{notice}</p>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Payout balances">
        {[
          ['Lifetime managed sales', balance.totalSalesGhs],
          ['Platform fees', balance.platformFeesGhs],
          ['Paid out', balance.paidOutGhs],
          ['Available balance', balance.availableGhs],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-xl font-extrabold text-charcoal">{ghs(value)}</p>
          </div>
        ))}
      </section>

      {!payout.managedMode && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          You are currently using your own gateway. Switch to DiDwa Managed Payments in Payment Settings to request managed payouts.
        </div>
      )}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-charcoal">Request a payout</h2>
          <p className="mt-1 text-sm text-slate-500">
            {payout.momoNetwork && payout.momoNumber
              ? `${payout.momoNetwork} · ${payout.momoNumber}`
              : 'Add a Mobile Money destination in Payment Settings.'}
          </p>
          {payout.momoAccountName && (
            <p className="mt-1 text-xs text-emerald-700">
              Verified account name: <strong>{payout.momoAccountName}</strong>
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">Minimum request: {ghs(payout.minimumGhs)}. Requests are manually reviewed and transferred.</p>
          <form onSubmit={requestPayout} className="mt-4 space-y-3">
            <label htmlFor="managed-payout-amount" className="block text-xs font-bold uppercase tracking-wide text-slate-500">Amount (GHS)</label>
            <input
              id="managed-payout-amount"
              type="number"
              min={payout.minimumGhs || 1}
              max={balance.availableGhs || 0}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="0.00"
              required
            />
            <button
              type="submit"
              disabled={busy || !canRequest || !amount}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {busy ? <IconSpinner size={15} /> : <Clock3 size={15} />}
              {busy ? 'Submitting...' : 'Request Mobile Money payout'}
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-charcoal">Payout history</h2>
          </div>
          {data?.requests?.length ? (
            <div className="divide-y divide-slate-100">
              {data.requests.map((request) => (
                <article key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm font-bold text-charcoal">{ghs(request.amount_ghs)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {request.momo_network} · {request.momo_number} · {new Date(request.requested_at).toLocaleDateString('en-GB')}
                    </p>
                    {request.momo_account_name && <p className="mt-0.5 text-xs text-slate-500">Verified for {request.momo_account_name}</p>}
                    {request.transfer_reference && <p className="mt-1 text-xs text-slate-500">Transfer ref: {request.transfer_reference}</p>}
                    {request.admin_note && <p className="mt-1 text-xs text-slate-500">{request.admin_note}</p>}
                  </div>
                  <Status value={request.status} />
                </article>
              ))}
            </div>
          ) : <p className="px-5 py-8 text-center text-sm text-slate-500">No payout requests yet.</p>}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-charcoal">Managed sales ledger</h2>
          <p className="mt-1 text-xs text-slate-500">Only verified managed Paystack settlements and their reversals appear here.</p>
        </div>
        {data?.ledger?.length ? (
          <div className="divide-y divide-slate-100">
            {data.ledger.map((entry) => (
              <article key={entry.id} className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-bold text-charcoal">
                    {String(entry.entry_type).replaceAll('_', ' ')}
                    {entry.order_number ? ` · Order ${entry.order_number}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(entry.created_at).toLocaleString('en-GB')}
                    {entry.external_reference ? ` · ${entry.external_reference}` : ''}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-bold text-charcoal">Net {ghs(entry.net_amount_ghs)}</p>
                  {entry.entry_type !== 'PAYOUT' && (
                    <p className="text-xs text-slate-500">
                      Gross {ghs(entry.gross_amount_ghs)} · Fee {ghs(entry.platform_fee_ghs)}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : <p className="px-5 py-8 text-center text-sm text-slate-500">No managed sales recorded yet.</p>}
      </section>
    </div>
  );
}
