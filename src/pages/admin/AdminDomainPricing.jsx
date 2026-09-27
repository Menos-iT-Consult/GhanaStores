/**
 * DiDwa - Super admin domain pricing.
 *
 * Two jobs, both of which change what a seller is charged:
 *   1. Decide the catalogue - which TLDs exist, which are searched by default,
 *      and whether the "include all TLDs" toggle is on.
 *   2. Decide the price - a fixed advertised price per TLD, or a markup on the
 *      provider's cost. The number set here is what checkout charges, which is
 *      why every edit asks for a reason and lands in the audit log.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe, Percent, Save, Tag, Zap } from 'lucide-react';
import { adminApi, ghs } from '../../api.js';
import {
  Button, DataTable, Drawer, EmptyState, ErrorBanner, Field, LoadingBlock, PageHeader,
  Panel, PanelHeader, RefreshCw, StatCard, Stacked, StatusPill, Toolbar, inputClass, list,
} from '../../components/admin/ui.jsx';

const blank = 'blank';

/**
 * Mirror of the server's price precedence (services/domainPricing.js), so the
 * drawer shows the effect of an edit before it is saved. The server remains
 * the authority - this is only ever what the operator sees.
 */
function resolvePreview({ retailGhs, wholesaleGhs, markupPct }, defaultMarkupPct = 25) {
  const round = (n) => Math.max(0, Math.round(n / 5) * 5);
  const fixed = String(retailGhs || '').trim();
  if (fixed !== '') return round(Number(fixed));
  const base = String(wholesaleGhs || '').trim();
  if (base !== '') return round(Number(base) * (1 + Number(markupPct) / 100));
  return round(200 * (1 + Number(markupPct || defaultMarkupPct) / 100));
}

export default function AdminDomainPricing() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [settings, setSettings] = useState({ includeAllTlds: false, defaultMarkupPct: 25 });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState({ scope: 'curated', markupPct: 25, reason: '' });

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await adminApi.get('/api/admin/domain-pricing');
      setData(result);
      setSettings(result.settings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const all = list(data?.tlds);
    const search = term.trim().toLowerCase();
    return all.filter((row) => {
      if (filter === 'enabled' && !row.isEnabled) return false;
      if (filter === 'disabled' && row.isEnabled) return false;
      if (filter === 'curated' && !row.isCurated) return false;
      if (filter === 'extended' && row.isCurated) return false;
      if (filter === 'fixed' && row.retailGhs === null) return false;
      return !search || row.tld.includes(search) || String(row.label || '').toLowerCase().includes(search);
    });
  }, [data, term, filter]);

  function startEdit(row) {
    setEditing(row);
    setDraft({
      retailGhs: row.retailGhs === null ? '' : String(row.retailGhs),
      wholesaleGhs: row.wholesaleGhs === null ? '' : String(row.wholesaleGhs),
      markupPct: String(row.markupPct),
      isEnabled: row.isEnabled,
      isCurated: row.isCurated,
      label: row.label || '',
    });
    setReason('');
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      const body = {
        reason: reason.trim(),
        // Blank means "not set", which puts the TLD back on cost + markup.
        retailGhs: String(draft.retailGhs).trim() === '' ? null : Number(draft.retailGhs),
        wholesaleGhs: String(draft.wholesaleGhs).trim() === '' ? null : Number(draft.wholesaleGhs),
        markupPct: Number(draft.markupPct),
        isEnabled: draft.isEnabled,
        isCurated: draft.isCurated,
        label: draft.label,
      };
      await adminApi.patch(`/api/admin/domain-pricing/${encodeURIComponent(editing.tld)}`, body);
      setNotice(`.${editing.tld} now sells at ${ghs(resolvePreview(draft))}.`);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    setBusy(true);
    setError('');
    try {
      await adminApi.patch('/api/admin/domain-pricing', settings);
      setNotice('Search settings saved.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function applyBulk() {
    setBusy(true);
    setError('');
    try {
      const result = await adminApi.post('/api/admin/domain-pricing/bulk', {
        scope: bulk.scope, markupPct: Number(bulk.markupPct), reason: bulk.reason.trim(),
      });
      setNotice(`${result.updated} TLDs repriced to ${bulk.markupPct}%.`);
      setBulkOpen(false);
      setBulk({ scope: 'curated', markupPct: 25, reason: '' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingBlock label="Loading domain pricing..." />;
  if (error && !data) return <ErrorBanner error={error} onRetry={load} />;

  const summary = data?.summary || {};
  const canSaveEdit = Boolean(reason.trim());
  const canSaveSettings = settings.includeAllTlds !== data?.settings?.includeAllTlds
    || Number(settings.defaultMarkupPct) !== Number(data?.settings?.defaultMarkupPct);
  const canSaveBulk = Boolean(bulk.reason.trim()) && Number.isFinite(Number(bulk.markupPct));

  return (
    <>
      <PageHeader
        title="Domain pricing"
        subtitle="Which extensions sellers can buy, and what they pay. This is the price checkout charges."
        actions={(
          <>
            <Button icon={Zap} onClick={() => setBulkOpen(true)}>Reprice a group</Button>
            <Button icon={RefreshCw} onClick={load}>Refresh</Button>
          </>
        )}
      />

      {notice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </p>
      ) : null}
      {error && data ? <ErrorBanner error={error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="TLDs known" value={String(summary.total ?? 0)} icon={Globe} detail={`${summary.enabled ?? 0} enabled for sale`} />
        <StatCard title="Offered by default" value={String(summary.offered ?? 0)} icon={Tag} detail="What a search returns today" />
        <StatCard title="Fixed prices" value={String(summary.fixedPrice ?? 0)} icon={Tag} detail="Override cost + markup" />
        <StatCard
          title="Default markup"
          value={`${settings.defaultMarkupPct}%`}
          icon={Percent}
          detail="Where no TLD override exists"
          tone="emerald"
        />
      </div>

      <Panel>
        <PanelHeader title="Search behaviour" subtitle="Applies to every seller's domain search" />
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={Boolean(settings.includeAllTlds)}
              onChange={(e) => setSettings({ ...settings, includeAllTlds: e.target.checked })}
            />
            <span>
              <span className="block text-sm font-bold text-charcoal">Offer every known TLD</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Off: a search returns only the curated set, which is fast and cheap. On: every
                enabled TLD is searched - broader, but slower per search.
              </span>
            </span>
          </label>

          <Field label="Default markup (%)" hint="Used for any TLD with no markup of its own.">
            <input
              type="number"
              min="0"
              max="1000"
              step="0.5"
              className={inputClass}
              value={settings.defaultMarkupPct}
              onChange={(e) => setSettings({ ...settings, defaultMarkupPct: e.target.value })}
            />
          </Field>
        </div>
        {canSaveSettings ? (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
            <Button tone="primary" icon={Save} onClick={saveSettings} busy={busy}>Save search settings</Button>
          </div>
        ) : null}
      </Panel>

      <Panel>
        <PanelHeader title="Catalogue" subtitle={`${rows.length} shown`} />
        <Toolbar term={term} onTerm={setTerm} placeholder="Search TLD...">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={inputClass}>
            <option value="all">All TLDs</option>
            <option value="curated">Default set</option>
            <option value="extended">Extended</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
            <option value="fixed">Fixed price</option>
          </select>
        </Toolbar>
        <DataTable
          rows={rows}
          empty={<EmptyState title="No TLDs match that filter." />}
          columns={[
            {
              key: 'tld',
              label: 'TLD',
              render: (row) => (
                <Stacked primary={`.${row.tld}`} secondary={row.label || (row.isCurated ? 'Default set' : 'Extended')} />
              ),
            },
            {
              key: 'isEnabled',
              label: 'Status',
              render: (row) => (row.isEnabled
                ? <StatusPill status="ACTIVE" label="For sale" />
                : <StatusPill status="SUSPENDED" label="Disabled" />),
            },
            {
              key: 'isCurated',
              label: 'In default search',
              render: (row) => (row.isCurated
                ? <StatusPill status="ACTIVE" label="Yes" />
                : <span className="text-xs text-slate-400">Only with all TLDs</span>),
            },
            {
              key: 'wholesaleGhs',
              label: 'Provider cost',
              align: 'right',
              render: (row) => (row.wholesaleGhs
                ? ghs(row.wholesaleGhs)
                : <span className="text-xs text-slate-400">from search</span>),
            },
            { key: 'markupPct', label: 'Markup', align: 'right', render: (row) => `${row.markupPct}%` },
            {
              key: 'retailGhs',
              label: 'Fixed price',
              align: 'right',
              render: (row) => (row.retailGhs ? ghs(row.retailGhs) : <span className="text-xs text-slate-400">-</span>),
            },
            {
              key: 'effectiveGhs',
              label: 'Seller pays',
              align: 'right',
              render: (row) => <span className="font-bold text-charcoal">{ghs(row.effectiveGhs)}</span>,
            },
            { key: 'actions', label: '', align: 'right', render: (row) => <Button onClick={() => startEdit(row)}>Edit</Button> },
          ]}
        />
      </Panel>

      <Drawer
        open={Boolean(editing)}
        title={editing ? `Edit .${editing.tld}` : 'Edit TLD'}
        subtitle={editing ? `Currently ${ghs(editing.effectiveGhs)} per year` : ''}
        onClose={() => setEditing(null)}
        footer={(
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-charcoal">
              Seller pays <span className="text-emerald-600">{ghs(resolvePreview(draft, Number(settings.defaultMarkupPct) || 25))}</span>
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
              <Button tone="primary" onClick={save} busy={busy} disabled={!canSaveEdit}>Save</Button>
            </div>
          </div>
        )}
      >
        <div className="space-y-4">
          {error ? <ErrorBanner error={error} /> : null}

          <Field label="Fixed price (GHS)" hint="Leave blank to charge provider cost plus the markup.">
            <input
              type="number"
              min="0"
              step="1"
              className={inputClass}
              value={draft.retailGhs ?? ''}
              onChange={(e) => setDraft({ ...draft, retailGhs: e.target.value })}
              placeholder={blank}
            />
          </Field>

          <Field label="Provider cost (GHS)" hint="Cached cost. Leave blank to use the price the search returns.">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={draft.wholesaleGhs ?? ''}
              onChange={(e) => setDraft({ ...draft, wholesaleGhs: e.target.value })}
              placeholder="from search"
            />
          </Field>

          <Field label="Markup (%)" hint="Applied to the provider cost when there is no fixed price.">
            <input
              type="number"
              min="0"
              max="1000"
              step="0.5"
              className={inputClass}
              value={draft.markupPct ?? ''}
              onChange={(e) => setDraft({ ...draft, markupPct: e.target.value })}
            />
          </Field>

          <Field label="Label" hint="Optional note shown to administrators.">
            <input
              className={inputClass}
              value={draft.label ?? ''}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="South Africa"
            />
          </Field>

          <div className="space-y-2 rounded-xl border border-slate-200 p-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-charcoal">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={Boolean(draft.isEnabled)}
                onChange={(e) => setDraft({ ...draft, isEnabled: e.target.checked })}
              />
              Available for purchase
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-charcoal">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={Boolean(draft.isCurated)}
                onChange={(e) => setDraft({ ...draft, isCurated: e.target.checked })}
              />
              Include in the default search
            </label>
          </div>

          <Field label="Reason" hint="Recorded in the audit log. Required.">
            <input
              className={inputClass}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Openprovider .co.za price increase"
            />
          </Field>
        </div>
      </Drawer>

      <Drawer
        open={bulkOpen}
        title="Reprice a group of TLDs"
        subtitle="Applies one markup to many extensions at once"
        onClose={() => setBulkOpen(false)}
        footer={(
          <div className="flex justify-end gap-2">
            <Button onClick={() => setBulkOpen(false)} disabled={busy}>Cancel</Button>
            <Button tone="primary" onClick={applyBulk} busy={busy} disabled={!canSaveBulk}>Apply</Button>
          </div>
        )}
      >
        <div className="space-y-4">
          {error ? <ErrorBanner error={error} /> : null}
          <Field label="Which group?">
            <select className={inputClass} value={bulk.scope} onChange={(e) => setBulk({ ...bulk, scope: e.target.value })}>
              <option value="curated">The default set</option>
              <option value="extended">The extended set</option>
              <option value="all">Every TLD</option>
            </select>
          </Field>
          <Field label="New markup (%)">
            <input
              type="number"
              min="0"
              max="1000"
              step="0.5"
              className={inputClass}
              value={bulk.markupPct}
              onChange={(e) => setBulk({ ...bulk, markupPct: e.target.value })}
            />
          </Field>
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            TLDs with a fixed price are skipped - those are deliberate prices and are not
            overwritten by a bulk change.
          </p>
          <Field label="Reason" hint="Recorded in the audit log. Required.">
            <input
              className={inputClass}
              value={bulk.reason}
              onChange={(e) => setBulk({ ...bulk, reason: e.target.value })}
              placeholder="Annual margin review"
            />
          </Field>
        </div>
      </Drawer>
    </>
  );
}
