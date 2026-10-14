/**
 * DiDwa - Reset Password (/reset-password)
 *
 * The public page the "forgot password" email links to. The raw token arrives in
 * the URL (?token=...); the page sends it back with the new password to
 * POST /api/site-settings/password/reset, which verifies the token's hash, is
 * single-use and expired-safe server-side. This page only presents the form and
 * surfaces the server's message - it never decides validity itself.
 *
 * Reachable while signed out (the whole point) so it is a PUBLIC_ROUTES entry.
 *
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, KeyRound, Lock } from 'lucide-react';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { LogoLockup, IconSpinner } from '../components/icons.jsx';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-mist/60 py-2.5 pl-10 pr-3 text-sm text-charcoal placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Read the token from the query string once, on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setBusy(true);
    try {
      const data = await api.post('/api/site-settings/password/reset', { token, newPassword: password });
      setDone(true);
      // Give the seller a moment to read the confirmation, then to the login page.
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><LogoLockup /></div>
        <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-card ring-1 ring-slate-900/5 sm:p-8">
          <h1 className="text-xl font-extrabold text-charcoal">Choose a new password</h1>
          <p className="mt-1 text-sm text-slate-400">Enter a new password for your DiDwa store account.</p>

          {done ? (
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700" role="status">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>Your password has been reset. Taking you to the sign-in page...</span>
            </div>
          ) : !token ? (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  This reset link is missing its token. Request a new link from the
                  {' '}<button type="button" onClick={() => navigate('/login')} className="font-bold underline">sign-in page</button>.
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="pw">New password</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={16} aria-hidden="true" />
                  </span>
                  <input
                    id="pw" type="password" className={inputCls} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
                    required minLength={8} autoComplete="new-password"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit" disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? <IconSpinner size={18} /> : <KeyRound size={16} aria-hidden="true" />}
                Reset password
              </button>
            </form>
          )}

          <button
            type="button" onClick={() => navigate('/login')}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-charcoal"
          >
            <ArrowLeft size={14} /> Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
