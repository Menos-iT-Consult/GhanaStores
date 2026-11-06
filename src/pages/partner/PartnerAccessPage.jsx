import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, Building2, LockKeyhole, LogIn, Mail, Phone, Tag, UserPlus, UserRound,
} from 'lucide-react';
import { partnerApi, setPartnerSession } from '../../api.js';
import { navigate } from '../../router.js';
import { LogoLockup } from '../../components/icons.jsx';
import PasswordInput from '../../components/PasswordInput.jsx';

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-mist/60 py-2.5 pl-10 pr-11 text-sm text-charcoal placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100';
const inputLabelClass = 'block space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500';

export default function PartnerAccessPage({ initialMode, initialError = '', onLogin }) {
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
                <label className={inputLabelClass}>Preferred referral code <span className="font-normal normal-case tracking-normal text-rose-600">(required)</span>
                  <span className="relative block"><Tag size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input className={`${fieldClass} uppercase`} value={form.preferredReferralCode} onChange={(event) => setForm((value) => ({ ...value, preferredReferralCode: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) }))} placeholder="E.G. KOFI2026" autoComplete="off" required maxLength={20} minLength={3} pattern="[A-Za-z0-9]{3,20}" aria-describedby="partner-code-help" /></span>
                  <span id="partner-code-help" className="block text-[11px] font-normal normal-case tracking-normal text-slate-400">Choose a unique code with 3-20 letters or numbers.</span>
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
            <button type="button" onClick={() => { setMode(applying ? 'login' : 'apply'); setError(''); setNotice(''); }}
              className="font-bold text-blue-700 hover:underline">
              {applying ? 'Sign in' : 'Apply now'}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
