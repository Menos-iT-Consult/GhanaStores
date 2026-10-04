/**
 * DiDwa - Super admin pricing for prepaid platform SMS.
 *
 * One number decides what a merchant pays for extra SMS: the price per segment.
 * The per-plan FREE allowance lives on the plans page instead, because that is a
 * per-plan entitlement while this is a platform-wide price - putting them
 * together would wrongly imply the price varies by plan.
 *
 * This page ships UNSET. There is deliberately no default price: a hard-coded
 * default would silently become a real charged rate that nobody chose. Purchases
 * also stay off until an operator enables them.
 *
 * Modelled on AdminDomainPricing - same audited-edits discipline, because the
 * number set here is what POST /api/sms-packs/buy actually charges.
 */
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, MessageSquare, Save } from 'lucide-react';
import { adminApi, ghs } from '../../api.js';
import {
  Button, ErrorBanner, Field, LoadingBlock, PageHeader, Panel, PanelHeader,
  StatCard, Stacked, inputClass,
} from '../../components/admin/ui.jsx';

export default function AdminSmsPricing() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState({
    pricePerSegment: '', minPurchase: '100', isPurchasesEnabled: false,
  });

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await adminApi.get('/api/admin/sms-pricing');
      setData(result);
      setDraft({
        pricePerSegment: result.settings.pricePerSegment == null
          ? '' : String(result.settings.pricePerSegment),
        minPurchase: String(result.settings.minPurchase),
        isPurchasesEnabled: result.settings.isPurchasesEnabled,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true); setSaveError(''); setNotice('');
    try {
      // An empty price is sent as null, which is a real state: it closes
      // purchases rather than charging against a guessed rate.
      await adminApi.patch('/api/admin/sms-pricing', {
        pricePerSegment: draft.pricePerSegment.trim() === '' ? null : Number(draft.pricePerSegment),
        minPurchase: Number(draft.minPurchase),
        isPurchasesEnabled: draft.isPurchasesEnabled,
        reason,
      });
      setReason('');
      setNotice('Saved. The new price applies to the next purchase.');
      await load();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingBlock />;

  const { settings, volume } = data;
  const priced = settings.pricePerSegment != null;

  return (
    <Stacked>
      <PageHeader title="SMS pricing" subtitle="What merchants pay for extra platform SMS segments" />

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {!priced && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-amber-900">No price set</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
              There is no default on purpose. Until an operator sets a price here, merchants cannot
              buy segments and the platform never charges them for SMS. Set a price below to open
              purchases.
            </p>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Price per segment"
          value={priced ? ghs(settings.pricePerSegment) : 'Not set'}
          hint="140 characters. A typical order receipt uses 3-4."
        />
        <StatCard
          label="Segments sold"
          value={(volume?.segmentsSold ?? 0).toLocaleString()}
          hint={`${volume?.payments?.paid ?? 0} approved purchases`}
        />
        <StatCard
          label="Outstanding liability"
          value={(volume?.outstanding ?? 0).toLocaleString()}
          hint={`${volume?.storesWithBalance ?? 0} stores hold prepaid segments`}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Pricing and availability"
          subtitle="Every change asks for a reason and lands in the audit log."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Price per segment (GHS)"
            hint="Leave empty to close purchases without a price. Up to six decimals, so a pesewa-scale price is not rounded away."
          >
            <input
              type="number"
              step="0.000001"
              min="0"
              className={inputClass}
              value={draft.pricePerSegment}
              onChange={(e) => setDraft({ ...draft, pricePerSegment: e.target.value })}
              placeholder="e.g. 0.05"
            />
          </Field>

          <Field
            label="Minimum purchase (segments)"
            hint="Smallest order a merchant may place. Stops tiny collections that cost more to process than they are worth."
          >
            <input
              type="number"
              min="1"
              step="1"
              className={inputClass}
              value={draft.minPurchase}
              onChange={(e) => setDraft({ ...draft, minPurchase: e.target.value })}
            />
          </Field>
        </div>

        <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 p-3.5">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            checked={draft.isPurchasesEnabled}
            onChange={(e) => setDraft({ ...draft, isPurchasesEnabled: e.target.checked })}
          />
          <span>
            <span className="block text-sm font-bold text-charcoal">Allow merchants to buy segments</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
              The kill switch. Turning this off stops new purchases immediately without touching
              balances already bought or the per-plan free allowance - the lever to pull if the
              mNotify account needs protecting.
            </span>
          </span>
        </label>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <Field label="Reason for this change" hint="Required.">
            <input
              className={inputClass}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. mNotify wholesale increase"
            />
          </Field>

          {saveError && <ErrorBanner>{saveError}</ErrorBanner>}
          {notice && <p className="mt-3 text-xs font-semibold text-emerald-700">{notice}</p>}

          <div className="mt-3">
            <Button onClick={save} disabled={busy || !reason.trim()} icon={<Save size={15} />}>
              {busy ? 'Saving' : 'Save SMS pricing'}
            </Button>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="How the quota works" subtitle="The same rules merchants see, stated once." />
        <ul className="space-y-2 text-xs leading-relaxed text-slate-600">
          <li>
            <span className="font-bold text-charcoal">Units are segments, not messages.</span>{' '}
            Providers bill per 140 characters, so one order receipt usually costs 3&ndash;4 segments.
          </li>
          <li>
            <span className="font-bold text-charcoal">Free allowance first.</span>{' '}
            A store spends its plan allowance before touching paid segments, so what lapses at the
            end of the period is the part nobody paid for.
          </li>
          <li>
            <span className="font-bold text-charcoal">Prepaid segments never expire.</span>{' '}
            They carry over between periods and across a downgrade, including down to a plan with no
            free allowance.
          </li>
          <li>
            <span className="font-bold text-charcoal">At zero, sending stops.</span>{' '}
            DiDwa does not silently send on its own account. The order still completes; only the
            customer text is skipped.
          </li>
          <li>
            <span className="font-bold text-charcoal">Merchant-key sends are never metered.</span>{' '}
            A store using its own provider pays that provider directly, so there is nothing to count.
          </li>
        </ul>
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
          <MessageSquare size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          The per-plan free allowance (50 on Growth, 100 on Scale, 0 on Starter) is set on the
          Subscription plans page, not here.
        </p>
      </Panel>
    </Stacked>
  );
}