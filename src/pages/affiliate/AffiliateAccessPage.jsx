import { useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole, LogIn, Mail, Phone, Tag, UserPlus, UserRound } from 'lucide-react';
import { affiliateApi, setAffiliateSession } from '../../api.js';
import { navigate } from '../../router.js';
import { LogoLockup } from '../../components/icons.jsx';
import PasswordInput from '../../components/PasswordInput.jsx';

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-mist/60 py-2.5 pl-10 pr-11 text-sm text-charcoal placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100';

export default function AffiliateAccessPage({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    partnerCode: String(new URLSearchParams(window.location.search).get('ref') || '').trim().toUpperCase(),
  });

  function update(key) {
    return (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await affiliateApi.post(
        mode === 'signup' ? '/api/affiliate/signup' : '/api/affiliate/login',
        {
          ...form,
          partnerCode: mode === 'signup' ? form.partnerCode.trim().toUpperCase() || undefined : undefined,
        },
      );
      setAffiliateSession(result.token);
      navigate('/affiliate/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Could not access your affiliate account.');
    } finally {
      setBusy(false);
    }
  }

  const signingUp = mode === 'signup';

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-mist px-4 py-10">
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-emerald-brand/10 blur-3xl" aria-hidden="true" />
      <div className="relative w-full max-w-md">
        <a href="/" aria-label="DiDwa affiliate program home" className="mb-7 flex justify-center">
          <LogoLockup onLight subtitle="Affiliate program" />
        </a>
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-card ring-1 ring-slate-900/5 sm:p-8">
        <button type="button" onClick={() => navigate('/')} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-charcoal">
          <ArrowLeft size={14} aria-hidden="true" /> Affiliate program
        </button>
        <div className="mb-6 mt-5 grid grid-cols-2 gap-1 rounded-xl bg-mist p-1" role="tablist" aria-label="Affiliate account access">
          {[
            { key: 'signup', label: 'Join program', Icon: UserPlus },
            { key: 'login', label: 'Sign in', Icon: LogIn },
          ].map(({ key, label, Icon }) => (
            <button key={key} type="button" role="tab" aria-selected={mode === key}
              onClick={() => { setMode(key); setError(''); setForm((current) => ({ ...current, password: '' })); }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${mode === key ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-charcoal'}`}>
              <Icon size={14} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
        <h1 className="text-xl font-extrabold text-charcoal">
          {signingUp ? 'Join the affiliate program' : 'Affiliate sign in'}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {signingUp ? 'Create an account to refer businesses and track your commissions.' : 'Sign in to manage your referrals and earnings.'}
        </p>

        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

        <form onSubmit={submit} className="mt-5 space-y-4" autoComplete="on">
          {signingUp && (
            <>
              <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
                Full name
                <span className="relative block">
                  <UserRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input value={form.name} onChange={update('name')} className={`${fieldClass} pl-9`} autoComplete="name" required maxLength={120} />
                </span>
              </label>
              <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
                Phone
                <span className="relative block">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input value={form.phone} onChange={update('phone')} className={`${fieldClass} pl-9`} type="tel" autoComplete="tel" required maxLength={32} />
                </span>
              </label>
            </>
          )}
          <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
            Email
            <span className="relative block">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input value={form.email} onChange={update('email')} className={`${fieldClass} pl-9`} type="email" autoComplete="email" required />
            </span>
          </label>
          {signingUp && (
            <label className="block space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Partner referral code <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
              <span className="relative block">
                <Tag size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input value={form.partnerCode} onChange={update('partnerCode')} className={`${fieldClass} uppercase`} autoComplete="off" maxLength={20} minLength={form.partnerCode ? 3 : undefined} pattern={form.partnerCode ? '[A-Za-z0-9]{3,20}' : undefined} aria-describedby="affiliate-partner-code-help" />
              </span>
              <span id="affiliate-partner-code-help" className="block text-[11px] font-normal normal-case tracking-normal text-slate-400">Prefilled when you join through a partner's invite link.</span>
            </label>
          )}
          <div className="block space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <label htmlFor="affiliate-password">Password</label>
            <span className="relative block">
              <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <PasswordInput id="affiliate-password" value={form.password} onChange={update('password')} className={fieldClass} autoComplete={signingUp ? 'new-password' : 'current-password'} required minLength={8} maxLength={128} />
            </span>
          </div>
          <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:from-blue-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? 'Please wait...' : signingUp ? 'Create affiliate account' : 'Sign in'}
            {!busy && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {signingUp ? 'Already have an account?' : 'New to the program?'}{' '}
          <button type="button" onClick={() => { setMode(signingUp ? 'login' : 'signup'); setError(''); }}
            className="font-bold text-blue-700 hover:underline">
            {signingUp ? 'Sign in' : 'Join now'}
          </button>
        </p>
        </section>
      </div>
    </main>
  );
}
