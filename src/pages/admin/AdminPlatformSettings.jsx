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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await adminApi.get('/api/admin/platform-settings');
      setSettings(result.settings);
      setDraft(result.settings);
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

  const isDirty = settings && JSON.stringify(settings) !== JSON.stringify(draft);

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
