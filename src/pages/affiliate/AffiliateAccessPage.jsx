import { useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
import { affiliateApi, setAffiliateSession } from '../../api.js';
import { navigate } from '../../router.js';
import { LogoLockup } from '../../components/icons.jsx';

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-charcoal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export default function AffiliateAccessPage({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
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
        form,
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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-9">
        <a href="/" aria-label="DiDwa affiliate program home" className="inline-flex">
          <LogoLockup onLight />
        </a>
        <button type="button" onClick={() => navigate('/')} className="mt-7 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-charcoal">
          <ArrowLeft size={14} aria-hidden="true" /> Affiliate program
        </button>
        <h1 className="mt-5 text-2xl font-extrabold text-charcoal">
          {signingUp ? 'Join the affiliate program' : 'Affiliate sign in'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {signingUp ? 'Create an account to refer businesses and track your commissions.' : 'Sign in to manage your referrals and earnings.'}
        </p>

        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

        <form onSubmit={submit} className="mt-6 space-y-4">
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
          <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
            Password
            <span className="relative block">
              <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input value={form.password} onChange={update('password')} className={`${fieldClass} pl-9`} type="password" autoComplete={signingUp ? 'new-password' : 'current-password'} required minLength={8} maxLength={128} />
            </span>
          </label>
          <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">
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
      </div>
    </main>
  );
}
