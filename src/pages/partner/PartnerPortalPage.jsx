import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight, BadgePercent, Building2, Copy, Handshake, LogOut, RefreshCw, Users, Wallet,
} from 'lucide-react';
import {
  clearPartnerSession, getPartnerToken, ghs, partnerApi,
} from '../../api.js';
import { navigate, usePathname } from '../../router.js';
import PartnerAccessPage from './PartnerAccessPage.jsx';

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';


function Stat({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">{value}</p>
          {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
        </div>
        <span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Icon size={20} /></span>
      </div>
    </div>
  );
}

export default function PartnerPortalPage() {
  const route = usePathname();
  const [partner, setPartner] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [checking, setChecking] = useState(Boolean(getPartnerToken()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [momo, setMomo] = useState({ network: 'MTN', momoNumber: '' });
  const [amount, setAmount] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [profile, overview, payoutList] = await Promise.all([
        partnerApi.get('/api/partners/me'),
        partnerApi.get('/api/partners/dashboard'),
        partnerApi.get('/api/partners/payouts'),
      ]);
      setPartner(profile.partner);
      setDashboard(overview);
      setPayouts(payoutList.payouts || []);
    } catch (err) {
      setError(err.message || 'Partner dashboard could not be loaded.');
      setPartner(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (getPartnerToken()) load();
    else setChecking(false);
  }, [load]);

  useEffect(() => {
    const onLogout = () => { setPartner(null); setDashboard(null); };
    window.addEventListener('gs:partner-logout', onLogout);
    return () => window.removeEventListener('gs:partner-logout', onLogout);
  }, []);

  const submitMoMo = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await partnerApi.post('/api/partners/payout-account/verify', momo);
      setNotice(`Verified ${result.verification.accountName} with ${result.verification.bankName}.`);
      await load();
    } catch (err) {
      setError(err.message || 'Mobile Money account could not be verified.');
    } finally {
      setBusy(false);
    }
  };

  const requestPayout = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await partnerApi.post('/api/partners/payouts', { amountGhs: Number(amount) });
      setNotice(result.message);
      setAmount('');
      await load();
    } catch (err) {
      setError(err.message || 'Payout request could not be submitted.');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      setNotice('Referral link copied.');
    } catch {
      setError('Could not copy the link. Select and copy it manually.');
    }
  };

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-semibold text-slate-300">Loading partner portal...</div>;
  if (!partner) {
    const mode = route.endsWith('/apply') ? 'apply' : route.endsWith('/login') ? 'login' : 'apply';
    return <PartnerAccessPage initialMode={mode} initialError={error} onLogin={(profile) => { setPartner(profile); load(); }} />;
  }

  const stats = dashboard?.stats || {};
  const referralLinks = dashboard?.links || {};
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-600 p-2"><Handshake size={19} /></span>
            <div>
              <p className="text-sm font-extrabold">DiDwa Partner Network</p>
              <p className="text-xs text-slate-400">{partner.organization_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-white/10" aria-label="Refresh dashboard"><RefreshCw size={16} /></button>
            <button type="button" onClick={() => { clearPartnerSession(); setPartner(null); navigate('/', { replace: true }); }} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10">
              <LogOut size={14} />Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <p className="text-sm font-semibold text-blue-700">Ambassador dashboard</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Welcome, {partner.full_name}</h1>
          <p className="mt-1 text-sm text-slate-500">Grow your merchant and affiliate network from one place.</p>
        </div>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={Building2} label="Active merchants" value={Number(stats.active_merchants || 0).toLocaleString()} />
          <Stat icon={Users} label="Active affiliates" value={Number(stats.active_affiliates || 0).toLocaleString()} />
          <Stat icon={BadgePercent} label="Monthly network volume" value={ghs(stats.monthly_volume_ghs || 0)} detail="Paid order GMV this month" />
          <Stat icon={Wallet} label="Withdrawable MoMo balance" value={ghs(stats.available_balance_ghs || 0)} detail={`Minimum payout ${ghs(dashboard?.payoutMinimumGhs || 50)}`} />
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          {[
            { title: 'Merchant onboarding link', description: 'Onboard merchants directly into your partner network.', link: referralLinks.merchant },
            { title: 'Affiliate recruitment link', description: 'Recruit affiliates into your network for tier-2 overrides.', link: referralLinks.affiliate },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-extrabold text-slate-900">{item.title}</h2>
                <ArrowUpRight size={17} className="text-blue-600" />
              </div>
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input className={`${fieldClass} min-w-0 flex-1 bg-slate-50`} readOnly value={item.link || ''} aria-label={item.title} />
                <button type="button" onClick={() => copyLink(item.link)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
                  <Copy size={15} />Copy link
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-extrabold text-slate-900">Verified payout account</h2>
            {partner.momo_verified_at && (
              <p className="mt-2 text-sm text-emerald-700">
                {partner.momo_verified_name} · {partner.momo_number} · {partner.momo_network}
              </p>
            )}
            <form onSubmit={submitMoMo} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto]">
              <select className={fieldClass} value={momo.network} onChange={(event) => setMomo((value) => ({ ...value, network: event.target.value }))} aria-label="Mobile Money network">
                <option value="MTN">MTN MoMo</option><option value="TELECEL">Telecel Cash</option><option value="AT">AT Money</option>
              </select>
              <input className={fieldClass} value={momo.momoNumber} onChange={(event) => setMomo((value) => ({ ...value, momoNumber: event.target.value }))} type="tel" placeholder="Mobile Money number" required />
              <button type="submit" disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Verify</button>
            </form>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-extrabold text-slate-900">Request a payout</h2>
            <p className="mt-1 text-sm text-slate-500">Requests are reviewed and released by Central Admin.</p>
            <form onSubmit={requestPayout} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input className={`${fieldClass} flex-1`} value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min={dashboard?.payoutMinimumGhs || 50} step="0.01" placeholder="Amount in GHS" required />
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
    </main>
  );
}
