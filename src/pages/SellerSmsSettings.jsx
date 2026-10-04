/**
 * DiDwa - Seller SMS Settings (/settings/notifications)
 *
 * Bring Your Own SMS account, used for ORDER confirmations only.
 *
 * This page is deliberately separate from Payments. Two different questions:
 * Payments answers "whose money is it?"; this answers "whose reputation goes on
 * the message?". Different failure modes, different blast radius - bundling them
 * makes both harder to reason about.
 *
 * The scoping rule, which this page states in the UI rather than hiding:
 * merchant credentials are used for ORDER messages only. Billing notices and
 * low-stock alerts always go out on the DiDwa account, because when a store is
 * suspended its own credentials are exactly what cannot be relied on.
 *
 * Secret-handling rules match the Payments page exactly:
 *  - Secrets are write-only. The API never returns one; a saved key shows only
 *    as a mask, and replacing it means typing a new one.
 *  - A blank secret field means "keep the saved key", never "clear it".
 *  - "Test connection" validates against a non-delivery probe BEFORE saving.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { AlertTriangle, CheckCircle2, Info, MessageSquare, Lock, PhoneCall } from 'lucide-react';
import { IconSpinner } from '../components/icons.jsx';

const CHANNELS = [
  { id: 'PLATFORM', label: 'DiDwa platform sender', hint: 'No keys needed. Uses the DiDwa account and sender ID.' },
  { id: 'MNOTIFY', label: 'mNotify', hint: 'Your own mNotify account and balance.' },
  { id: 'ARKESEL', label: 'Arkesel', hint: 'Your own Arkesel account and balance.' },
  { id: 'HUBTEL', label: 'Hubtel', hint: 'Reuses the Client ID and secret from your Payments settings.' },
];

const EMPTY = {
  provider: 'PLATFORM',
  enableOrderSms: false,
  apiKey: '',
  senderId: '',
  clientId: '',
  clientSecret: '',
  merchantAccountId: '',
};

const cx = (...v) => v.filter(Boolean).join(' ');

/* ------------------------------ Small parts ------------------------------ */

function Callout({ tone = 'info', icon: Icon = Info, title, children }) {
  const tones = {
    info: ['bg-blue-50 border-blue-200 text-blue-900', 'text-blue-600'],
    warn: ['bg-amber-50 border-amber-200 text-amber-900', 'text-amber-600'],
    ok: ['bg-emerald-50 border-emerald-200 text-emerald-900', 'text-emerald-600'],
  };
  const [box, ic] = tones[tone] || tones.info;
  return (
    <div className={cx('flex gap-3 rounded-xl border p-4 text-sm', box)}>
      <Icon size={18} className={cx('mt-0.5 shrink-0', ic)} aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-bold">{title}</p>}
        <div className={cx(title && 'mt-1', 'leading-relaxed')}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, hint, secret, masked, value, onChange, placeholder }) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
        {secret && <Lock size={12} className="text-slate-400" aria-hidden="true" />}
        {label}
      </span>
      <input
        type={secret ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      {/* A blank field means "keep what is saved", so say which key is in use -
          otherwise the merchant cannot tell whether one is stored at all. */}
      {secret && masked && !value && (
        <span className="block font-mono text-[11px] text-emerald-700">Saved: {masked} &mdash; leave blank to keep it</span>
      )}
      {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

function Toggle({ label, hint, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800">{label}</p>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          disabled && 'cursor-not-allowed opacity-50',
          checked ? 'bg-blue-600' : 'bg-slate-300',
        )}
      >
        <span className={cx('absolute h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  );
}

/**
 * Live segment meter for the DiDwa sender.
 *
 * The number shown is the SERVER's figure. It is deliberately not derived from
 * the allowance minus anything the browser remembers - the period and the
 * balance both change without the page knowing.
 */
function QuotaMeter({ quota }) {
  if (!quota) return null;

  const {
    allowance, used, purchased, totalRemaining, periodEnd, exhausted,
  } = quota;
  const hasAllowance = allowance > 0;
  const resetsOn = periodEnd ? new Date(periodEnd).toLocaleDateString() : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          DiDwa SMS segments
        </p>
        <p className={cx('text-sm font-extrabold', exhausted ? 'text-rose-700' : 'text-charcoal')}>
          {totalRemaining} available
        </p>
      </div>

      {hasAllowance && (
        <>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={used}
            aria-valuemin={0}
            aria-valuemax={allowance}
            aria-label="Free SMS segments used this period"
          >
            <div
              className={cx(
                'h-full rounded-full transition-all',
                used >= allowance ? 'bg-rose-500' : 'bg-blue-500',
              )}
              style={{ width: `${Math.min(100, (used / allowance) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            <span className="font-bold text-slate-700">{used} of {allowance}</span>
            {' '}free segments used{resetsOn ? ` · resets ${resetsOn}` : ''}
          </p>
        </>
      )}

      {purchased > 0 && (
        <p className="mt-1.5 text-xs text-slate-500">
          <span className="font-bold text-slate-700">{purchased}</span>
          {' '}prepaid segments left. These carry over until you use them.
        </p>
      )}

      {exhausted && (
        <p className="mt-2 text-xs font-semibold text-rose-700">
          Your segments are used up, so DiDwa will not send order SMS until you top up.
          Orders still go through - customers just miss the text.
        </p>
      )}
    </div>
  );
}

/**
 * Buy prepaid segments. One field and a network, deliberately: there is no pack
 * catalogue, because the price per segment is a single admin-set number and a
 * fixed pack list would be this form with more clicks.
 */
function BuySegments({ onPurchased }) {
  const [segments, setSegments] = useState('');
  const [network, setNetwork] = useState('MTN');
  const [momoNumber, setMomoNumber] = useState('');
  const [pricing, setPricing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/api/sms-packs').then(setPricing).catch(() => setPricing(null));
  }, []);

  // Generated once per form instance and reused for retries, so a double-tap or
  // a timeout-and-retry reuses the key and cannot be charged twice.
  const [idemKey] = useState(() => `ui-${Math.random().toString(36).slice(2, 12)}`);

  const count = Number.parseInt(segments, 10);
  const min = pricing?.settings?.minPurchase ?? 100;
  const canBuy = Boolean(pricing?.canPurchase)
    && Number.isFinite(count) && count >= min && Boolean(momoNumber);

  async function onBuy() {
    setBusy(true); setErr(''); setMsg(null);
    try {
      const res = await api.post('/api/sms-packs/buy', {
        segments: count, network, momoNumber, idempotencyKey: idemKey,
      });
      setMsg(res.message);
      setSegments('');
      onPurchased?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!pricing) return null;

  if (!pricing.canPurchase) {
    return (
      <p className="text-xs text-slate-500">
        Buying extra segments is not available on your account right now. Contact support if you
        need more DiDwa SMS.
      </p>
    );
  }

  const unit = pricing.settings.pricePerSegment;
  const total = Number.isFinite(count) && count > 0 ? Math.round(count * unit * 100) / 100 : 0;

  return (
    <div className="rounded-xl border border-slate-200 p-3.5">
      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
        Buy more segments
      </p>
      <p className="mt-1 text-xs text-slate-500">
        GHS {unit} per segment. These never expire and carry over between months.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-bold text-slate-600">Segments</span>
          <input
            type="number"
            min={min}
            step="1"
            inputMode="numeric"
            value={segments}
            onChange={(e) => setSegments(e.target.value)}
            placeholder={`min ${min}`}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-slate-600">Network</span>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="MTN">MTN</option>
            <option value="VODAFONE">Vodafone (Telecel)</option>
            <option value="AT">AT</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold text-slate-600">MoMo number</span>
          <input
            type="tel"
            value={momoNumber}
            onChange={(e) => setMomoNumber(e.target.value)}
            placeholder="0241234567"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBuy}
          disabled={!canBuy || busy}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <IconSpinner size={14} /> : null}
          {busy ? 'Waiting for approval' : `Buy${total > 0 ? ` · GHS ${total.toFixed(2)}` : ''}`}
        </button>
        {msg && <p className="text-xs font-semibold text-emerald-700">{msg}</p>}
        {err && <p className="text-xs font-semibold text-rose-700">{err}</p>}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        Approve the MoMo prompt on your phone. Segments are only added once your payment is
        confirmed.
      </p>
    </div>
  );
}

export default function SellerSmsSettings() {
  const [form, setForm] = useState(EMPTY);
  const [view, setView] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  // Quota comes from the server on every load. It is never computed here: the
  // allowance depends on the plan and the period, and the balance changes on
  // every order, so anything cached client-side would be a guess.
  const [quota, setQuota] = useState(null);
  const [canUsePlatform, setCanUsePlatform] = useState(true);

  const set = (key) => (v) => { setForm((f) => ({ ...f, [key]: v })); setSaved(false); setTest(null); };

  const load = useCallback(async () => {
    try {
      setError('');
      const [res, provs] = await Promise.all([
        api.get('/api/sms-settings'),
        api.get('/api/sms-settings/providers').catch(() => ({ providers: [] })),
      ]);
      setView(res.settings);
      setProviders(provs.providers || []);
      setQuota(res.quota || null);
      setCanUsePlatform(res.canUsePlatform !== false);
      // Only non-secret fields are seeded; secrets stay blank so the server
      // keeps whatever is stored.
      setForm((f) => ({
        ...f,
        provider: res.settings.provider || 'PLATFORM',
        enableOrderSms: Boolean(res.settings.enableOrderSms),
        senderId: res.settings.senderId || '',
        clientId: res.settings.clientId || '',
        merchantAccountId: res.settings.merchantAccountId || '',
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = CHANNELS.find((c) => c.id === form.provider) || CHANNELS[0];
  const descriptor = providers.find((p) => p.id === form.provider);
  const usingOwn = form.provider !== 'PLATFORM';

  async function onTest() {
    setTesting(true); setError(''); setTest(null);
    try {
      setTest(await api.post('/api/sms-settings/test', form));
    } catch (e) {
      setError(e.message);
    } finally {
      setTesting(false);
    }
  }

  async function onSave() {
    setSaving(true); setError(''); setSaved(false); setTest(null);
    try {
      const res = await api.put('/api/sms-settings', form);
      setView(res.settings);
      // A quota gate can reject the save, so refresh the meter either way rather
      // than leaving a stale "you have plenty left" on screen.
      load();
      // Clear the typed secrets once sealed server-side, so a later save cannot
      // resend them and they do not linger in component state.
      setForm((f) => ({ ...f, apiKey: '', clientSecret: '' }));
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-slate-400"><IconSpinner className="mr-2" />Loading SMS settings...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <div className="flex items-center gap-2.5">
          <MessageSquare size={22} className="text-blue-600" aria-hidden="true" />
          <h1 className="text-xl font-extrabold tracking-tight text-charcoal">Order SMS</h1>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          Send your customers an SMS when they place an order, using your own SMS account.
        </p>
      </header>

      {error && <Callout tone="warn" icon={AlertTriangle} title="Could not save">{error}</Callout>}
      {saved && !error && <Callout tone="ok" icon={CheckCircle2} title="Saved">Your order SMS settings are up to date.</Callout>}

      {/* The scoping rule, stated in the UI rather than hidden in code. */}
      <Callout tone="info" icon={PhoneCall} title="What this account is and is not used for">
        <p>Your credentials are used for <strong>order confirmations only</strong>.</p>
        <p className="mt-1">
          Trial reminders, payment notices, suspension warnings and low-stock alerts always go out
          from the DiDwa account. That is deliberate: if your store is suspended, your own SMS
          account is exactly what cannot be relied on, and a suspension notice sent on it would
          never reach you.
        </p>
      </Callout>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <Toggle
          label="Send an SMS when an order is placed"
          hint="Sent to the customer's phone number after the order is confirmed."
          checked={form.enableOrderSms}
          onChange={(v) => set('enableOrderSms')(v)}
        />

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Which account sends it</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {CHANNELS.map((c) => {
              // A store with no allowance and no prepaid balance cannot use the
              // DiDwa sender: the card is shown but disabled, with the reason,
              // rather than hidden - a merchant needs to know it exists.
              const locked = c.id === 'PLATFORM' && !canUsePlatform;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={locked}
                  onClick={() => set('provider')(c.id)}
                  aria-pressed={form.provider === c.id}
                  className={cx(
                    'rounded-xl border p-3 text-left transition',
                    locked
                      ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                      : form.provider === c.id
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <p className="text-sm font-bold text-charcoal">{c.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{c.hint}</p>
                  {locked && (
                    <p className="mt-1.5 text-xs font-bold text-rose-600">
                      No segments left - buy more below, or connect your own provider.
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* The DiDwa sender is metered, so it gets its own panel. Only shown when
          the DiDwa option is selected - a merchant using their own key is
          spending their own money and has no DiDwa quota to think about. */}
      {!usingOwn && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-base font-extrabold text-charcoal">Your DiDwa SMS balance</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Order SMS sent from the DiDwa account uses your included segments. When they run
              out, DiDwa stops sending - it never spends its own credit on your behalf.
            </p>
          </div>

          <QuotaMeter quota={quota} />
          <BuySegments onPurchased={load} />
        </section>
      )}

      {usingOwn && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-base font-extrabold text-charcoal">{active.label} credentials</h2>
            <p className="mt-0.5 text-xs text-slate-500">Encrypted before storage. Never shown again once saved.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(descriptor?.fields || []).map((f) => (
              <Field
                key={f.key}
                label={f.label}
                hint={f.hint}
                secret={f.type === 'password'}
                masked={f.type === 'password'
                  ? (f.key === 'apiKey' ? view?.apiKeyMasked : view?.clientSecretMasked)
                  : null}
                value={form[f.key] || ''}
                onChange={set(f.key)}
                placeholder={f.type === 'password' && view?.apiKeyMasked ? 'unchanged' : ''}
              />
            ))}
          </div>

          <Callout tone="warn" icon={AlertTriangle} title="Check your segment maths">
            Providers bill per 140-character segment, and a receipt listing several items is
            usually 3&ndash;4 segments. With order SMS on, every order costs you that many
            segments out of your own balance.
          </Callout>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onTest}
              disabled={testing || saving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {testing ? <IconSpinner size={14} /> : null}
              Test connection
            </button>
            {test && (
              <p className={cx('text-xs font-semibold', test.valid ? 'text-emerald-700' : 'text-rose-700')}>
                {test.message}
              </p>
            )}
          </div>
        </section>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || testing}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <IconSpinner size={15} /> : null}
          {saving ? 'Saving' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
