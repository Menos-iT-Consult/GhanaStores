import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BadgePercent, Building2, Copy, Handshake, LockKeyhole, LogIn, LogOut, Mail, Phone, RefreshCw, Tag, UserPlus, UserRound, Users, Wallet,
} from 'lucide-react';
import {
  clearPartnerSession, getPartnerToken, ghs, partnerApi, setPartnerSession,
} from '../../api.js';
import { navigate, usePathname } from '../../router.js';
import { LogoLockup } from '../../components/icons.jsx';
import PasswordInput from '../../components/PasswordInput.jsx';

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-mist/60 py-2.5 pl-10 pr-11 text-sm text-charcoal placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100';
const inputLabelClass = 'block space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500';

function PartnerAccess({ initialMode, initialError = '', onLogin }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ fullName: '', organizationName: '', preferredReferralCode: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState('');
  const update = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'apply') {
        const result = await partnerApi.post('/api/partners/apply', form);
        setNotice(result.message);
        setMode('login');
      } else {
        const result = await partnerApi.post('/api/partners/login', {
          email: form.email,
          password: form.password,
        });
        setPartnerSession(result.token);
        onLogin(result.partner);
      }
    } catch (err) {
      setError(err.message || 'Partner access could not be completed.');
    } finally {
      setBusy(false);
    }
  };
  const applying = mode === 'apply';

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-mist px-4 py-10">
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-emerald-brand/10 blur-3xl" aria-hidden="true" />
      <div className="relative w-full max-w-md">
      <a href="/" aria-label="DiDwa strategic partner program home" className="mb-7 flex justify-center">
        <LogoLockup onLight subtitle="Strategic partner program" />
      </a>
      <section className="rounded-3xl border border-slate-100 bg-white p-6 text-charcoal shadow-card ring-1 ring-slate-900/5 sm:p-8">
        <button type="button" onClick={() => navigate('/')} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-charcoal">
          <ArrowLeft size={14} aria-hidden="true" /> Partner program
        </button>
        <div className="mb-6 mt-5 grid grid-cols-2 gap-1 rounded-xl bg-mist p-1" role="tablist" aria-label="Partner account access">
          {[
            { key: 'apply', label: 'Apply', Icon: UserPlus },
            { key: 'login', label: 'Sign in', Icon: LogIn },
          ].map(({ key, label, Icon }) => (
            <button key={key} type="button" role="tab" aria-selected={mode === key}
              onClick={() => { setMode(key); setError(''); setNotice(''); setForm((current) => ({ ...current, password: '' })); }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${mode === key ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-charcoal'}`}>
              <Icon size={14} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
        <h1 className="text-xl font-extrabold">{applying ? 'Apply to become a partner' : 'Partner sign in'}</h1>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          {applying
            ? 'For institutional leaders, business associations, tech hubs, and community voices building local commerce.'
            : 'Sign in to view your network and manage your Mobile Money payout requests.'}
        </p>
        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          {applying && (
            <>
              <label className={inputLabelClass}>Full name
                <span className="relative block"><UserRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input className={fieldClass} value={form.fullName} onChange={update('fullName')} autoComplete="name" required maxLength={120} /></span>
              </label>
              <label className={inputLabelClass}>Organization or community
                <span className="relative block"><Building2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input className={fieldClass} value={form.organizationName} onChange={update('organizationName')} autoComplete="organization" required maxLength={160} /></span>
              </label>
              <label className={inputLabelClass}>Preferred referral code <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
                <span className="relative block"><Tag size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input className={`${fieldClass} uppercase`} value={form.preferredReferralCode} onChange={(event) => setForm((value) => ({ ...value, preferredReferralCode: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) }))} placeholder="E.G. KOFI2026" autoComplete="off" maxLength={20} minLength={3} pattern="[A-Za-z0-9]{3,20}" aria-describedby="partner-code-help" /></span>
                <span id="partner-code-help" className="block text-[11px] font-normal normal-case tracking-normal text-slate-400">Use 3-20 letters or numbers. Leave blank for an automatically generated code.</span>
              </label>
              <label className={inputLabelClass}>Phone number
                <span className="relative block"><Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input className={fieldClass} value={form.phone} onChange={update('phone')} type="tel" autoComplete="tel" required maxLength={32} /></span>
              </label>
            </>
          )}
          <label className={inputLabelClass}>Email
            <span className="relative block"><Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input className={fieldClass} value={form.email} onChange={update('email')} type="email" autoComplete="email" required /></span>
          </label>
          <label className={inputLabelClass}>Password
            <span className="relative block"><LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <PasswordInput id="partner-password" className={fieldClass} value={form.password} onChange={update('password')} autoComplete={applying ? 'new-password' : 'current-password'} required minLength={8} maxLength={128} /></span>
          </label>
          <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:from-blue-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? 'Please wait...' : applying ? 'Submit application' : 'Sign in'} {!busy && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          {applying ? 'Already applied or have an account?' : 'Interested in the program?'}{' '}
          <button
            type="button"
            onClick={() => { setMode(applying ? 'login' : 'apply'); setError(''); setNotice(''); }}
            className="font-bold text-blue-700 hover:underline"
          >
            {applying ? 'Sign in' : 'Apply now'}
          </button>
        </p>
      </section>
      </div>
    </main>
  );
}

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
    return <PartnerAccess initialMode={mode} initialError={error} onLogin={(profile) => { setPartner(profile); load(); }} />;
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
