import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { adminApi } from '../../api.js';
import {
  Button, ErrorBanner, Field, LoadingBlock, PageHeader, Panel, PanelHeader, inputClass,
} from '../../components/admin/ui.jsx';

const EMPTY_SETTINGS = {
  contact: {
    supportEmail: '',
    supportPhone: '',
    whatsappNumber: '',
    businessAddress: '',
  },
  socialLinks: {
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    x: '',
    linkedin: '',
  },
  whatsapp: {
    floatingEnabled: true,
    sellerGroupUrl: '',
    affiliateGroupUrl: '',
  },
};
const EMPTY_MANAGED_POLICY = {
  enabled: true,
  feePercent: 2,
  minimumPayoutGhs: 50,
  paystackReady: false,
};

const CONTACT_FIELDS = [
  ['supportEmail', 'Support email', 'email'],
  ['supportPhone', 'Phone number', 'tel'],
  ['whatsappNumber', 'WhatsApp number', 'tel'],
  ['businessAddress', 'Business address', 'text'],
];

const SOCIAL_FIELDS = [
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['tiktok', 'TikTok'],
  ['youtube', 'YouTube'],
  ['x', 'X (Twitter)'],
  ['linkedin', 'LinkedIn'],
];

export default function AdminPlatformSettings() {
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState(EMPTY_SETTINGS);
  const [managedPolicy, setManagedPolicy] = useState(null);
  const [managedDraft, setManagedDraft] = useState(EMPTY_MANAGED_POLICY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [managedBusy, setManagedBusy] = useState(false);
  const [managedReason, setManagedReason] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [result, managedResult] = await Promise.all([
        adminApi.get('/api/admin/platform-settings'),
        adminApi.get('/api/admin/managed-payment-settings'),
      ]);
      setSettings(result.settings);
      setDraft(result.settings);
      setManagedPolicy(managedResult.settings);
      setManagedDraft(managedResult.settings);
    } catch (requestError) {
      setError(requestError.message || 'Platform settings could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const update = (section, key, value) => {
    setDraft((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value },
    }));
  };
  const updateManaged = (key, value) => {
    setManagedDraft((current) => ({ ...current, [key]: value }));
  };

  const isDirty = settings && JSON.stringify(settings) !== JSON.stringify(draft);
  const isManagedDirty = managedPolicy
    && ['enabled', 'feePercent', 'minimumPayoutGhs'].some((key) => managedPolicy[key] !== managedDraft[key]);

  const save = async () => {
    setBusy(true);
    setSaveError('');
    setNotice('');
    try {
      const result = await adminApi.patch('/api/admin/platform-settings', { settings: draft, reason });
      setSettings(result.settings);
      setDraft(result.settings);
      setReason('');
      setNotice('Platform contact and link settings saved.');
    } catch (requestError) {
      setSaveError(requestError.message || 'Platform settings could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const saveManaged = async () => {
    setManagedBusy(true);
    setSaveError('');
    setNotice('');
    try {
      const result = await adminApi.patch('/api/admin/managed-payment-settings', {
        settings: {
          enabled: managedDraft.enabled,
          feePercent: Number(managedDraft.feePercent),
          minimumPayoutGhs: Number(managedDraft.minimumPayoutGhs),
        },
        reason: managedReason,
      });
      setManagedPolicy(result.settings);
      setManagedDraft(result.settings);
      setManagedReason('');
      setNotice('Managed payment policy saved.');
    } catch (requestError) {
      setSaveError(requestError.message || 'Managed payment policy could not be saved.');
    } finally {
      setManagedBusy(false);
    }
  };

  if (loading) return <LoadingBlock label="Loading platform contact and link settings..." />;
  if (error && !settings) return <ErrorBanner error={error} onRetry={() => { void load(); }} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform contact & links"
        subtitle="Manage the contact details and community links shown across public and dashboard pages."
        actions={<Button icon={RefreshCw} onClick={() => { void load(); }}>Refresh</Button>}
      />
      {error && <ErrorBanner error={error} onRetry={() => { void load(); }} />}
      {saveError && <ErrorBanner error={saveError} />}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}

      <Panel>
        <PanelHeader title="Platform contact details" subtitle="Displayed on public contact and footer areas. Leave a field blank to hide it." />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {CONTACT_FIELDS.map(([key, label, type]) => (
            <Field key={key} label={label}>
              <input
                type={type}
                maxLength={key === 'businessAddress' ? 300 : 254}
                className={inputClass}
                value={draft.contact[key]}
                onChange={(event) => update('contact', key, event.target.value)}
              />
            </Field>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Public social profiles" subtitle="Only configured HTTPS links appear as icons in the public footer." />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {SOCIAL_FIELDS.map(([key, label]) => (
            <Field key={key} label={`${label} URL`}>
              <input
                type="url"
                maxLength={500}
                className={inputClass}
                value={draft.socialLinks[key]}
                onChange={(event) => update('socialLinks', key, event.target.value)}
                placeholder={`https://${key === 'x' ? 'x.com' : `${key}.com`}/...`}
              />
            </Field>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="WhatsApp" subtitle="The floating button is shown on public marketing pages when enabled and a WhatsApp number is configured." />
        <div className="space-y-5 p-5">
          <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={draft.whatsapp.floatingEnabled}
              onChange={(event) => update('whatsapp', 'floatingEnabled', event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Show floating WhatsApp button on public marketing pages
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Seller WhatsApp group invite URL" hint="Use an invite URL from chat.whatsapp.com.">
              <input
                type="url"
                maxLength={500}
                className={inputClass}
                value={draft.whatsapp.sellerGroupUrl}
                onChange={(event) => update('whatsapp', 'sellerGroupUrl', event.target.value)}
                placeholder="https://chat.whatsapp.com/..."
              />
            </Field>
            <Field label="Affiliate WhatsApp group invite URL" hint="This is independent from the seller group.">
              <input
                type="url"
                maxLength={500}
                className={inputClass}
                value={draft.whatsapp.affiliateGroupUrl}
                onChange={(event) => update('whatsapp', 'affiliateGroupUrl', event.target.value)}
                placeholder="https://chat.whatsapp.com/..."
              />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Managed payments & payouts"
          subtitle="Configure the platform fee, payout threshold, and the managed checkout kill switch."
        />
        <div className="space-y-5 p-5">
          <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={managedDraft.enabled}
              onChange={(event) => updateManaged('enabled', event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Allow managed online checkout
          </label>
          <p className={`rounded-lg border px-3 py-2 text-xs ${
            managedPolicy?.paystackReady
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}>
            {managedPolicy?.paystackReady
              ? 'Platform Paystack credentials are present; signed webhooks are required for settlement.'
              : 'PAYSTACK_SECRET_KEY is not configured. Managed online checkout remains unavailable.'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Platform fee (%)" hint="Applied to new managed orders when they are created. Maximum 20%.">
              <input
                type="number"
                min="0"
                max="20"
                step="0.01"
                className={inputClass}
                value={managedDraft.feePercent}
                onChange={(event) => updateManaged('feePercent', event.target.value)}
              />
            </Field>
            <Field label="Minimum payout (GHS)" hint="Vendors can request payouts at or above this amount.">
              <input
                type="number"
                min="1"
                max="1000000"
                step="0.01"
                className={inputClass}
                value={managedDraft.minimumPayoutGhs}
                onChange={(event) => updateManaged('minimumPayoutGhs', event.target.value)}
              />
            </Field>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Reason for managed payment change">
              <input
                type="text"
                maxLength={500}
                className={inputClass}
                value={managedReason}
                onChange={(event) => setManagedReason(event.target.value)}
                placeholder="Why is this policy changing?"
              />
            </Field>
            <Button
              tone="primary"
              icon={Save}
              busy={managedBusy}
              disabled={!isManagedDirty || !managedReason.trim()}
              onClick={saveManaged}
            >
              Save managed policy
            </Button>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Save changes" subtitle="All changes are recorded in the admin audit log." />
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
          <Field label="Reason for change">
            <input
              type="text"
              maxLength={500}
              className={inputClass}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why are these platform details changing?"
            />
          </Field>
          <Button tone="primary" icon={Save} busy={busy} disabled={!isDirty || !reason.trim()} onClick={save}>
            Save platform settings
          </Button>
        </div>
      </Panel>
    </div>
  );
}
