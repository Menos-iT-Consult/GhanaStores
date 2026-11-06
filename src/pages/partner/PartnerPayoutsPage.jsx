import { useEffect, useState } from 'react';
import { ghs, partnerApi } from '../../api.js';

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export default function PartnerPayoutsPage({ dashboard, payouts, partner, stats, onError, onNotice, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [momo, setMomo] = useState({ network: partner.momo_network || 'MTN', momoNumber: partner.momo_number || '' });
  const [amount, setAmount] = useState('');

  useEffect(() => {
    setMomo({ network: partner.momo_network || 'MTN', momoNumber: partner.momo_number || '' });
  }, [partner.momo_network, partner.momo_number]);

  const verifyMoMo = async (event) => {
    event.preventDefault();
    setBusy(true);
    onError('');
    onNotice('');
    try {
      const result = await partnerApi.post('/api/partners/payout-account/verify', momo);
      onNotice(`Verified ${result.verification.accountName} with ${result.verification.bankName}.`);
      await onRefresh();
    } catch (err) {
      onError(err.message || 'Mobile Money account could not be verified.');
    } finally {
      setBusy(false);
    }
  };

  const requestPayout = async (event) => {
    event.preventDefault();
    setBusy(true);
    onError('');
    onNotice('');
    try {
      const result = await partnerApi.post('/api/partners/payouts', { amountGhs: Number(amount) });
      onNotice(result.message);
      setAmount('');
      await onRefresh();
    } catch (err) {
      onError(err.message || 'Payout request could not be submitted.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-extrabold text-slate-900">Verified payout account</h2>
          {partner.momo_verified_at && (
            <p className="mt-2 text-sm text-emerald-700">{partner.momo_verified_name} · {partner.momo_number} · {partner.momo_network}</p>
          )}
          <form onSubmit={verifyMoMo} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto]">
            <select className={fieldClass} value={momo.network} onChange={(event) => setMomo((value) => ({ ...value, network: event.target.value }))} aria-label="Mobile Money network">
              <option value="MTN">MTN MoMo</option><option value="TELECEL">Telecel Cash</option><option value="AT">AT Money</option>
            </select>
            <input className={fieldClass} value={momo.momoNumber} onChange={(event) => setMomo((value) => ({ ...value, momoNumber: event.target.value }))} type="tel" placeholder="Mobile Money number" required />
            <button type="submit" disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Verify</button>
          </form>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-extrabold text-slate-900">Request a payout</h2>
          <p className="mt-1 text-sm text-slate-500">Available balance: {ghs(stats.available_balance_ghs || 0)}. Requests are reviewed by Central Admin.</p>
          <form onSubmit={requestPayout} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input className={`${fieldClass} flex-1`} value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min={dashboard?.payoutMinimumGhs || 50} max={Number(stats.available_balance_ghs || 0)} step="0.01" placeholder="Amount in GHS" required />
            <button type="submit" disabled={busy} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">Request MoMo payout</button>
          </form>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-extrabold text-slate-900">Payout history</h2>
        </div>
        {payouts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Requested</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Destination</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Reference / note</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.map((payout) => <tr key={payout.id}>
                  <td className="px-5 py-3">{new Date(payout.requested_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 font-semibold">{ghs(payout.amount_ghs)}</td>
                  <td className="px-5 py-3">{payout.momo_number} · {payout.momo_network}</td>
                  <td className="px-5 py-3 capitalize">{payout.status}</td>
                  <td className="px-5 py-3 text-slate-500">{payout.transfer_reference || payout.admin_note || '—'}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        ) : <p className="px-5 py-8 text-center text-sm text-slate-500">No payout requests yet.</p>}
      </section>
    </div>
  );
}
