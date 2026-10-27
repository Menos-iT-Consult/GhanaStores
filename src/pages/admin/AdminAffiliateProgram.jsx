import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { adminApi } from '../../api.js';
import {
  Button, ErrorBanner, Field, LoadingBlock, PageHeader, Panel, PanelHeader, Stacked, inputClass,
} from '../../components/admin/ui.jsx';

const INITIAL_SETTINGS = {
  commissionRatePercent: '',
  minimumPayoutGhs: '',
  attributionDays: '',
  payoutProcessingMinDays: '',
  payoutProcessingMaxDays: '',
};

export default function AdminAffiliateProgram() {
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await adminApi.get('/api/admin/affiliate-program');
      setSettings(result.settings);
      setDraft(Object.fromEntries(
        Object.entries(result.settings).map(([key, value]) => [key, String(value)]),
      ));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setBusy(true);
    setSaveError('');
    setNotice('');
    try {
      await adminApi.patch('/api/admin/affiliate-program', {
        commissionRatePercent: Number(draft.commissionRatePercent),
        minimumPayoutGhs: Number(draft.minimumPayoutGhs),
        attributionDays: Number(draft.attributionDays),
        payoutProcessingMinDays: Number(draft.payoutProcessingMinDays),
        payoutProcessingMaxDays: Number(draft.payoutProcessingMaxDays),
        reason,
      });
      setReason('');
      setNotice('Affiliate program terms saved.');
      await load();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingBlock label="Loading affiliate program settings..." />;
  if (error && !settings) return <ErrorBanner error={error} onRetry={load} />;

  return (
    <Stacked>
      <PageHeader title="Affiliate program" subtitle="Configure the public program terms and operational thresholds" />
      {error && <ErrorBanner>{error}</ErrorBanner>}
      {saveError && <ErrorBanner>{saveError}</ErrorBanner>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}

      <Panel>
        <PanelHeader
          title="Program figures"
          subtitle="Changes update the public affiliate page and related payout behavior. Every save is recorded in the audit log."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Recurring commission rate (%)" hint="Applied to qualifying referred plan payments. Enter 0 to disable commissions.">
            <input type="number" min="0" max="100" step="0.01" className={inputClass} value={draft.commissionRatePercent} onChange={(e) => update('commissionRatePercent', e.target.value)} />
          </Field>
          <Field label="Minimum payout (GHS)" hint="Minimum balance required before an affiliate can request a payout.">
            <input type="number" min="0" max="1000000" step="0.01" className={inputClass} value={draft.minimumPayoutGhs} onChange={(e) => update('minimumPayoutGhs', e.target.value)} />
          </Field>
          <Field label="Referral attribution (days)" hint="How long a referral attribution remains valid.">
            <input type="number" min="1" max="3650" step="1" className={inputClass} value={draft.attributionDays} onChange={(e) => update('attributionDays', e.target.value)} />
          </Field>
          <Field label="Minimum payout processing time (business days)">
            <input type="number" min="0" max="365" step="1" className={inputClass} value={draft.payoutProcessingMinDays} onChange={(e) => update('payoutProcessingMinDays', e.target.value)} />
          </Field>
          <Field label="Maximum payout processing time (business days)" hint="Must be greater than or equal to the minimum.">
            <input type="number" min="0" max="365" step="1" className={inputClass} value={draft.payoutProcessingMaxDays} onChange={(e) => update('payoutProcessingMaxDays', e.target.value)} />
          </Field>
          <Field label="Reason for change">
            <input type="text" maxLength="500" className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are these terms changing?" />
          </Field>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-4">
          <Button
            tone="primary"
            icon={Save}
            busy={busy}
            disabled={!settings || Object.keys(settings).every((key) => Number(draft[key]) === Number(settings[key])) || !reason.trim()}
            onClick={save}
          >
            Save program terms
          </Button>
        </div>
      </Panel>
    </Stacked>
  );
}
