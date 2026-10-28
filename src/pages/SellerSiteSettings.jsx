/**
 * DiDwa - Store Site Settings (/settings/site)
 *
 * The merchant's account control centre, reached from the dashboard sidebar.
 * Five independent concerns, each its own card so a mistake in one cannot affect
 * the others:
 *   1. Store name        - display name only; the address (slug) never changes
 *   2. Password          - change (current password required) or reset by email
 *   3. Subscription      - current plan + period, links to the renew page
 *   4. Delete account    - irreversible; typed slug + password, bold warning
 *   5. Two-factor (2FA)  - TOTP authenticator app, QR setup, enable/disable
 *
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Building2, CheckCircle2, CreditCard, KeyRound,
  Lock, RefreshCw, ShieldCheck, Smartphone, Trash2, XCircle,
} from 'lucide-react';
import { api, getCachedStore, setSession, getToken, clearSession } from '../api.js';
import { navigate } from '../router.js';
import { IconSpinner } from '../components/icons.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

/* --------------------------------- Atoms ---------------------------------- */
const cardCls = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6';
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const inputCls =
  'w-full rounded-xl border border-slate-200 bg-mist/60 px-3.5 py-2.5 pl-10 text-sm text-charcoal placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100';

function CardHeader({ icon: Icon, title, hint }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
        <Icon size={18} aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-base font-extrabold text-charcoal">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

function Field({ id, label, icon: Icon, children }) {
  return (
    <div>
      <label className={labelCls} htmlFor={id}>{label}</label>
      <div className="relative">
        {Icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon size={16} aria-hidden="true" />
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

/** Inline success/error banner inside a card. */
function Notice({ kind, children }) {
  if (!children) return null;
  const ok = kind === 'ok';
  return (
    <div
      role="status"
      className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${
        ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

const saveBtnCls =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300';

export default function SellerSiteSettings() {
  const [store, setStore] = useState(() => getCachedStore());
  const [billing, setBilling] = useState(null);
  const [twofa, setTwofa] = useState({ enabled: false, loading: true });
  const [busy, setBusy] = useState('');

  // Load billing status (plan / period) and 2FA status once.
  const loadStatus = useCallback(async () => {
    api.get('/api/billing/status').then((d) => setBilling(d.billing)).catch(() => {});
    api.get('/api/site-settings/2fa/status')
      .then((d) => setTwofa({ enabled: Boolean(d.enabled), loading: false }))
      .catch(() => setTwofa({ enabled: false, loading: false }));
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  /** Persist a renamed store into the cached session without a reload. */
  const applyName = (name) => {
    const next = { ...(store || {}), name };
    setStore(next);
    if (getToken()) setSession(getToken(), next);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-charcoal">Site Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your store identity, security, subscription and account.
        </p>
      </header>

      <NameCard store={store} busy={busy} setBusy={setBusy} onSaved={applyName} />
      <PasswordCard store={store} busy={busy} setBusy={setBusy} />
      <SubscriptionCard billing={billing} />
      <TwoFactorCard twofa={twofa} busy={busy} setBusy={setBusy} onChanged={loadStatus} />
      <DeleteCard store={store} busy={busy} setBusy={setBusy} />
    </div>
  );
}

/* ------------------------------- 1. Store name ------------------------------ */
function NameCard({ store, busy, setBusy, onSaved }) {
  const [name, setName] = useState(store?.name || '');
  const [msg, setMsg] = useState(null);
  const working = busy === 'name';

  const save = async (e) => {
    e.preventDefault();
    setBusy('name');
    setMsg(null);
    try {
      const data = await api.patch('/api/site-settings/name', { name: name.trim() });
      onSaved(data.name);
      setMsg({ kind: 'ok', text: 'Store name updated.' });
    } catch (err) {
      setMsg({ kind: 'err', text: err.message });
    } finally {
      setBusy('');
    }
  };

  const slug = store?.subdomain_slug || store?.subdomainSlug || '';
  return (
    <section className={cardCls}>
      <CardHeader icon={Building2} title="Store name" hint="How your shop is named across DiDwa. Your store address stays the same." />
      <form onSubmit={save} className="space-y-3">
        <Field id="storeName" label="Store name" icon={Building2}>
          <input
            id="storeName" type="text" className={inputCls} value={name}
            onChange={(e) => setName(e.target.value)} maxLength={60} required
          />
        </Field>
        {slug && (
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Lock size={12} /> Your address <span className="font-semibold text-slate-500">{slug}</span> cannot be changed here.
          </p>
        )}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={working || !name.trim()} className={saveBtnCls}>
            {working ? <IconSpinner size={14} /> : null} Save name
          </button>
        </div>
        <Notice kind={msg?.kind}>{msg?.text}</Notice>
      </form>
    </section>
  );
}

/* ------------------------------- 2. Password -------------------------------- */
function PasswordCard({ store, busy, setBusy }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState(null);
  const [resetMsg, setResetMsg] = useState(null);
  const working = busy === 'password';
  const resetting = busy === 'forgot';

  const save = async (e) => {
    e.preventDefault();
    if (next.length < 8) { setMsg({ kind: 'err', text: 'New password must be at least 8 characters.' }); return; }
    setBusy('password');
    setMsg(null);
    try {
      await api.patch('/api/site-settings/password', { currentPassword: current, newPassword: next });
      setCurrent(''); setNext('');
      setMsg({ kind: 'ok', text: 'Your password has been updated.' });
    } catch (err) {
      setMsg({ kind: 'err', text: err.message });
    } finally {
      setBusy('');
    }
  };

  const sendReset = async () => {
    setBusy('forgot');
    setResetMsg(null);
    try {
      const email = store?.email || '';
      await api.post('/api/site-settings/password/forgot', { email });
      setResetMsg({ kind: 'ok', text: `If ${email || 'your account'} has an account, a reset link is on its way.` });
    } catch (err) {
      setResetMsg({ kind: 'err', text: err.message });
    } finally {
      setBusy('');
    }
  };

  return (
    <section className={cardCls}>
      <CardHeader icon={Lock} title="Password" hint="Change your password, or email yourself a reset link." />
      <form onSubmit={save} className="space-y-3">
        <Field id="curPw" label="Current password" icon={KeyRound}>
          <PasswordInput id="curPw" className={inputCls} value={current}
            onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        </Field>
        <Field id="newPw" label="New password" icon={KeyRound}>
          <PasswordInput id="newPw" className={inputCls} value={next}
            onChange={(e) => setNext(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" required minLength={8} />
        </Field>
        <button type="submit" disabled={working} className={saveBtnCls}>
          {working ? <IconSpinner size={14} /> : null} Update password
        </button>
        <Notice kind={msg?.kind}>{msg?.text}</Notice>
      </form>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <button
          type="button" onClick={sendReset} disabled={resetting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          {resetting ? <IconSpinner size={14} /> : <RefreshCw size={14} />} Email me a reset link
        </button>
        <Notice kind={resetMsg?.kind}>{resetMsg?.text}</Notice>
      </div>
    </section>
  );
}

/* ---------------------------- 3. Subscription ------------------------------- */
function SubscriptionCard({ billing }) {
  const planName = billing?.planName || billing?.plan || 'Starter';
  const cycle = billing?.plan_cycle || 'monthly';
  const periodEnd = billing?.plan_period_end;
  const status = billing?.status;
  const leftDays = billing?.paid_days_left ?? billing?.days_left ?? null;

  const statusTone = status === 'ACTIVE'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : status === 'SUSPENDED'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-blue-200 bg-blue-50 text-blue-700';

  return (
    <section className={cardCls}>
      <CardHeader icon={CreditCard} title="Subscription" hint="Your plan and billing period. Renew or change plan to keep your storefront live." />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-charcoal">{planName}</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">({cycle})</span>
            {status && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone}`}>{status}</span>}
          </div>
          {periodEnd && (
            <p className="text-xs text-slate-500">
              Renews / ends {new Date(periodEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
          {leftDays != null && Number(leftDays) > 0 && (
            <p className="text-xs text-slate-400">{Math.round(Number(leftDays))} day(s) remaining</p>
          )}
        </div>
        <button type="button" onClick={() => navigate('/settings/plan')} className={saveBtnCls}>
          Manage plan <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

/* ------------------------------ 5. Two-factor ------------------------------- */
function TwoFactorCard({ twofa, busy, setBusy, onChanged }) {
  const [setup, setSetup] = useState(null);   // { secret, qrDataUrl }
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  const working = busy === '2fa';
  const enabled = twofa?.enabled;

  const beginSetup = async () => {
    setBusy('2fa');
    setMsg(null);
    try {
      const data = await api.post('/api/site-settings/2fa/setup');
      setSetup({ secret: data.secret, qrDataUrl: data.qrDataUrl });
    } catch (err) {
      setMsg({ kind: 'err', text: err.message });
    } finally {
      setBusy('');
    }
  };

  const enable = async (e) => {
    e.preventDefault();
    setBusy('2fa');
    setMsg(null);
    try {
      const data = await api.post('/api/site-settings/2fa/enable', { code: code.trim() });
      setSetup(null); setCode('');
      setMsg({ kind: 'ok', text: data.message });
      onChanged();
    } catch (err) {
      setMsg({ kind: 'err', text: err.message });
    } finally {
      setBusy('');
    }
  };

  const disable = async (e) => {
    e.preventDefault();
    setBusy('2fa');
    setMsg(null);
    try {
      const data = await api.post('/api/site-settings/2fa/disable', { code: code.trim() });
      setCode('');
      setMsg({ kind: 'ok', text: data.message });
      onChanged();
    } catch (err) {
      setMsg({ kind: 'err', text: err.message });
    } finally {
      setBusy('');
    }
  };

  return (
    <section className={cardCls}>
      <CardHeader icon={ShieldCheck} title="Two-factor authentication" hint="Add a code from an authenticator app (Google Authenticator, Authy, 1Password) when you sign in." />

      <div className="flex items-center gap-2 text-sm">
        {enabled
          ? <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={13} /> Enabled</span>
          : <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500"><XCircle size={13} /> Not enabled</span>}
      </div>

      {/* Disabled: offer setup */}
      {!enabled && !setup && (
        <div className="mt-4">
          <button type="button" onClick={beginSetup} disabled={working} className={saveBtnCls}>
            {working ? <IconSpinner size={14} /> : <Smartphone size={14} />} Set up two-factor
          </button>
        </div>
      )}

      {/* Setup: QR + secret + confirm */}
      {!enabled && setup && (
        <form onSubmit={enable} className="mt-4 space-y-3">
          <p className="text-xs text-slate-500">
            Scan this QR code with your authenticator app, then enter the 6-digit code it shows to finish.
          </p>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-mist/40 p-4 sm:flex-row sm:items-start">
            {setup.qrDataUrl && <img src={setup.qrDataUrl} alt="Two-factor QR code" width={180} height={180} className="rounded-lg bg-white p-2" />}
            <div className="w-full">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Or enter this key manually</p>
              <code className="mt-1 block break-all rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-charcoal">{setup.secret}</code>
            </div>
          </div>
          <Field id="totpCode" label="6-digit code" icon={KeyRound}>
            <input id="totpCode" type="text" inputMode="numeric" className={inputCls} value={code}
              onChange={(e) => setCode(e.target.value)} placeholder="123456" maxLength={6} required autoComplete="one-time-code" />
          </Field>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={working || code.length < 6} className={saveBtnCls}>
              {working ? <IconSpinner size={14} /> : null} Enable two-factor
            </button>
            <button type="button" onClick={() => { setSetup(null); setCode(''); }} className="rounded-lg px-3 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      {/* Enabled: offer disable (needs a live code) */}
      {enabled && (
        <form onSubmit={disable} className="mt-4 space-y-3">
          <p className="text-xs text-slate-500">To turn two-factor off, enter a current code from your authenticator app.</p>
          <Field id="totpOff" label="6-digit code" icon={KeyRound}>
            <input id="totpOff" type="text" inputMode="numeric" className={inputCls} value={code}
              onChange={(e) => setCode(e.target.value)} placeholder="123456" maxLength={6} required autoComplete="one-time-code" />
          </Field>
          <button type="submit" disabled={working || code.length < 6} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:text-red-300">
            {working ? <IconSpinner size={14} /> : null} Disable two-factor
          </button>
        </form>
      )}

      <Notice kind={msg?.kind}>{msg?.text}</Notice>
    </section>
  );
}

/* ---------------------------- 4. Delete account ----------------------------- */
function DeleteCard({ store, busy, setBusy }) {
  const [confirmSlug, setConfirmSlug] = useState('');
  const [password, setPassword] = useState('');
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState(null);
  const working = busy === 'delete';
  const slug = store?.subdomain_slug || store?.subdomainSlug || '';

  const remove = async (e) => {
    e.preventDefault();
    setBusy('delete');
    setMsg(null);
    try {
      await api.del('/api/site-settings/account', { confirmSlug: confirmSlug.trim(), password });
      // The store no longer exists server-side; drop the local session and go home.
      clearSession();
      window.dispatchEvent(new Event('gs:logout'));
      window.location.href = '/';
    } catch (err) {
      setMsg({ kind: 'err', text: err.message });
      setBusy('');
    }
  };

  return (
    <section className="rounded-2xl border border-red-200 bg-red-50/40 p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-100 text-red-600">
          <Trash2 size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-extrabold text-charcoal">Delete account</h2>
          <p className="mt-0.5 text-xs text-slate-500">Permanently remove this store and everything in it.</p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        <span>
          This <strong>cannot be undone</strong>. Your storefront, products, orders, customers, payments and
          subscription history will be <strong>permanently erased</strong>, and your address <strong>{slug}</strong> will
          be released so anyone could register it again.
        </span>
      </div>

      {!armed ? (
        <button
          type="button" onClick={() => setArmed(true)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
        >
          <Trash2 size={14} /> I want to delete this store
        </button>
      ) : (
        <form onSubmit={remove} className="mt-4 space-y-3">
          <Field id="delSlug" label={`Type your store address (${slug}) to confirm`} icon={Building2}>
            <input id="delSlug" type="text" className={inputCls} value={confirmSlug}
              onChange={(e) => setConfirmSlug(e.target.value)} placeholder={slug} required autoComplete="off" />
          </Field>
          <Field id="delPw" label="Current password" icon={Lock}>
            <PasswordInput id="delPw" className={inputCls} value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </Field>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={working} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300">
              {working ? <IconSpinner size={14} /> : <Trash2 size={14} />} Permanently delete account
            </button>
            <button type="button" onClick={() => { setArmed(false); setConfirmSlug(''); setPassword(''); setMsg(null); }} className="rounded-lg px-3 py-2.5 text-sm font-bold text-slate-500 hover:bg-white">Cancel</button>
          </div>
          <Notice kind={msg?.kind}>{msg?.text}</Notice>
        </form>
      )}
    </section>
  );
}



