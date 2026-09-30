/**
 * DiDwa - Seller Payment Settings (/settings/payments)
 *
 * Bring Your Own Gateway Keys. The merchant pastes their own Paystack or Hubtel
 * credentials; DiDwa stores them encrypted and charges with them, so the money
 * goes straight from the customer into the merchant's gateway account.
 *
 * Secret-handling rules this page follows:
 *  - Secrets are write-only. The API never returns one, so once saved a key is
 *    shown only as a mask. Replacing it means typing a new one.
 *  - A blank secret field means "keep the saved key", never "clear it". Sending
 *    a mask back would overwrite the real key and break the store's checkout.
 *  - "Test connection" checks the credentials against the gateway BEFORE they
 *    are saved, so a typo cannot take a live store offline.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  AlertTriangle, CheckCircle2, CreditCard, Lock, Wallet,
} from 'lucide-react';
import { IconSpinner } from '../components/icons.jsx';

const GATEWAYS = [
  { id: 'PAYSTACK', label: 'Paystack', hint: 'Cards and Mobile Money via Paystack' },
  { id: 'HUBTEL', label: 'Hubtel', hint: 'Mobile Money and cards via Hubtel' },
  { id: 'COD', label: 'Cash on Delivery', hint: 'No keys needed - the customer pays the rider' },
];

const EMPTY = {
  paystackPublicKey: '',
  paystackSecretKey: '',
  hubtelClientId: '',
  hubtelClientSecret: '',
  hubtelMerchantAccountId: '',
  enableCod: true,
  activeGateway: 'COD',
};

/** Label for a field that already holds a saved key. */
function MaskHint({ masked }) {
  if (!masked) return null;
  return <span className="text-xs text-slate-400">Saved: {masked}. Leave blank to keep it.</span>;
}

export default function SellerPaymentSettings() {
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState(null);
  const [storageOk, setStorageOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState(null);
  const [saveMsg, setSaveMsg] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/api/payment-settings');
      const s = data.settings || {};
      setStorageOk(data.storageConfigured !== false);
      setForm({
        // Secrets stay blank: the page never receives them.
        paystackPublicKey: s.paystack?.publicKey || '',
        paystackSecretKey: '',
        hubtelClientId: s.hubtel?.clientId || '',
        hubtelClientSecret: '',
        hubtelMerchantAccountId: s.hubtel?.merchantAccountId || '',
        enableCod: s.enableCod !== false,
        activeGateway: s.activeGateway || 'COD',
      });
      setState(s);
    } catch (err) {
      setError(err.message || 'Could not load your payment settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setTest(null);
    setSaveMsg(null);
  };

  const paystackReady = Boolean(form.paystackPublicKey || state?.paystack?.configured)
    && Boolean(form.paystackSecretKey || state?.paystack?.configured);
  const hubtelReady = Boolean(form.hubtelClientId || state?.hubtel?.configured)
    && Boolean(form.hubtelClientSecret || state?.hubtel?.configured)
    && Boolean(form.hubtelMerchantAccountId || state?.hubtel?.configured);

  async function runTest() {
    setTesting(true);
    setTest(null);
    setError('');
    try {
      // Send only what the merchant typed; the server merges with what is saved.
      const result = await api.post('/api/payment-settings/test', {
        activeGateway: form.activeGateway,
        enableCod: form.enableCod,
        paystackPublicKey: form.paystackPublicKey || undefined,
        paystackSecretKey: form.paystackSecretKey || undefined,
        hubtelClientId: form.hubtelClientId || undefined,
        hubtelClientSecret: form.hubtelClientSecret || undefined,
        hubtelMerchantAccountId: form.hubtelMerchantAccountId || undefined,
      });
      setTest(result);
    } catch (err) {
      setTest({ valid: false, message: err.message || 'Could not reach the gateway.' });
    } finally {
      setTesting(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaveMsg(null);
    try {
      // Blank secrets are omitted entirely so the server keeps the saved value.
      const body = {
        activeGateway: form.activeGateway,
        enableCod: form.enableCod,
      };
      if (form.paystackPublicKey) body.paystackPublicKey = form.paystackPublicKey;
      if (form.paystackSecretKey) body.paystackSecretKey = form.paystackSecretKey;
      if (form.hubtelClientId) body.hubtelClientId = form.hubtelClientId;
      if (form.hubtelClientSecret) body.hubtelClientSecret = form.hubtelClientSecret;
      if (form.hubtelMerchantAccountId) body.hubtelMerchantAccountId = form.hubtelMerchantAccountId;

      const data = await api.put('/api/payment-settings', body);
      setState(data.settings);
      setSaveMsg('Payment settings saved.');
      setTest(null);
      setForm((f) => ({ ...f, paystackSecretKey: '', hubtelClientSecret: '' }));
    } catch (err) {
      setError(err.message || 'Could not save your payment settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
        <IconSpinner className="mr-2" size={18} /> Loading payment settings...
      </div>
    );
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none '
    + 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
  const labelCls = 'mb-1.5 block text-xs font-semibold text-slate-600';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-charcoal">
          <CreditCard size={22} /> Payment Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect your own Paystack or Hubtel account. Payments go directly from your
          customer into your account - DiDwa never holds your money.
        </p>
      </header>

      {!storageOk && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
          <p className="text-sm text-amber-800">
            <strong>Key storage is not configured on this server.</strong> Payment keys cannot
            be saved until the administrator sets <code>PAYMENT_KEYS_ENCRYPTION_SECRET</code>.
            For now, checkout falls back to Cash on Delivery.
          </p>
        </div>
      )}

      {/* No keys yet: this is the default state for every new store, and it is
          a valid configuration - not an error. */}
      {!state?.configured && (
        <div className="mb-6 flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Wallet className="mt-0.5 shrink-0 text-slate-400" size={18} />
          <p className="text-sm text-slate-600">
            You have no payment gateway connected yet, so your checkout is{' '}
            <strong>Cash on Delivery only</strong>. Add a Paystack or Hubtel account below to
            accept online payments.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}
      {saveMsg && (
        <div className="mb-4 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {saveMsg}
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        {/* ------------------------------ Gateway ------------------------------ */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-bold text-charcoal">Active payment method</h2>
          <p className="mb-4 text-xs text-slate-500">
            Customers will see this option at checkout.
          </p>
          <div className="space-y-2">
            {GATEWAYS.map((g) => {
              const ready = g.id === 'COD' ? true : g.id === 'PAYSTACK' ? paystackReady : hubtelReady;
              const active = form.activeGateway === g.id;
              return (
                <label
                  key={g.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    active ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="activeGateway"
                    value={g.id}
                    checked={active}
                    onChange={() => setForm((f) => ({ ...f, activeGateway: g.id }))}
                    className="mt-1"
                  />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-charcoal">
                      {g.label}
                      {g.id !== 'COD' && !ready && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          keys needed
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-slate-500">{g.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* ------------------------------ Paystack ------------------------------ */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-charcoal">
            Paystack <span className="text-[10px] font-medium text-slate-400">OPTIONAL</span>
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Find both keys in your Paystack dashboard under Settings &rarr; API Keys.
          </p>
          <div className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="psPublic">Public key</label>
              <input
                id="psPublic" type="text" className={inputCls} value={form.paystackPublicKey}
                onChange={set('paystackPublicKey')} placeholder="pk_live_..."
                autoComplete="off" spellCheck="false"
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="psSecret">Secret key</label>
              <input
                id="psSecret" type="password" className={inputCls} value={form.paystackSecretKey}
                onChange={set('paystackSecretKey')} placeholder="sk_live_..."
                autoComplete="new-password" spellCheck="false"
              />
              <div className="mt-1.5"><MaskHint masked={state?.paystack?.secretKeyMasked} /></div>
            </div>
          </div>
        </section>

        {/* ------------------------------- Hubtel ------------------------------- */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-charcoal">
            Hubtel <span className="text-[10px] font-medium text-slate-400">OPTIONAL</span>
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            From your Hubtel merchant account settings. All three values are required.
          </p>
          <div className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="htClientId">Client ID</label>
              <input
                id="htClientId" type="text" className={inputCls} value={form.hubtelClientId}
                onChange={set('hubtelClientId')} autoComplete="off" spellCheck="false"
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="htSecret">Client secret</label>
              <input
                id="htSecret" type="password" className={inputCls} value={form.hubtelClientSecret}
                onChange={set('hubtelClientSecret')} autoComplete="new-password" spellCheck="false"
              />
              <div className="mt-1.5"><MaskHint masked={state?.hubtel?.clientSecretMasked} /></div>
            </div>
            <div>
              <label className={labelCls} htmlFor="htAccount">Merchant account ID</label>
              <input
                id="htAccount" type="text" className={inputCls} value={form.hubtelMerchantAccountId}
                onChange={set('hubtelMerchantAccountId')} autoComplete="off" spellCheck="false"
              />
            </div>
          </div>
        </section>

        {/* --------------------------------- COD -------------------------------- */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox" checked={form.enableCod} onChange={set('enableCod')} className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-charcoal">
                Also accept Cash on Delivery
              </span>
              <span className="block text-xs text-slate-500">
                Leave this on to let customers pay the rider in cash. It is always the
                only option if you have no gateway connected.
              </span>
            </span>
          </label>
        </section>

        {test && (
          <div className={`flex gap-2 rounded-lg border p-3 text-sm ${
            test.valid
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
          >
            {test.valid
              ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
            {test.message}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving || !storageOk}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? <IconSpinner size={14} /> : null}
            Save settings
          </button>
          <button
            type="button"
            onClick={runTest}
            disabled={testing || !storageOk}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            {testing ? <IconSpinner size={14} /> : null}
            Test connection
          </button>
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Lock size={12} /> Keys are encrypted at rest and never shown again.
          </p>
        </div>
      </form>
    </div>
  );
}

