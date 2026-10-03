/**
 * DiDwa - Super admin system health.
 *
 * Answers "is the platform actually wired up?" without ever printing a secret.
 * An admin screen is not the place to show credentials, and this response ends
 * up in browser history, so each integration is reported as configured or not.
 */
import { useCallback, useEffect, useState } from 'react';
import { Activity, CheckCircle2, Cpu, Database, HardDrive, XCircle } from 'lucide-react';
import { adminApi, ghs } from '../../api.js';
import {
  Button, ErrorBanner, LoadingBlock, PageHeader, Panel, PanelHeader, RefreshCw, StatCard,
  StatusPill, dateTimeOrDash, list,
} from '../../components/admin/ui.jsx';

export default function AdminSystem() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await adminApi.get('/api/admin/system'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingBlock label="Checking platform health..." />;
  if (error) return <ErrorBanner error={error} onRetry={load} />;

  const counts = data?.counts || {};
  const db = data?.database || {};
  const integrations = list(data?.integrations);
  const missing = integrations.filter((row) => !row.configured);

  return (
    <>
      <PageHeader
        title="System"
        subtitle="Database, integrations and runtime."
        actions={<Button icon={RefreshCw} onClick={load}>Refresh</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Database"
          value={db.ok ? 'Connected' : 'Unreachable'}
          icon={db.ok ? CheckCircle2 : XCircle}
          detail={db.ok ? `${db.latencyMs}ms round trip` : db.error}
          tone={db.ok ? 'emerald' : 'rose'}
        />
        <StatCard title="Admin actions (24h)" value={String(data?.audit24h ?? 0)} icon={Activity} detail="Recorded in the audit log" />
        <StatCard title="Collected (30d)" value={ghs(data?.payments30d?.collected)} detail={`${data?.payments30d?.failed ?? 0} failed`} tone="emerald" />
        <StatCard title="Memory" value={`${data?.runtime?.memoryMb ?? 0} MB`} icon={HardDrive} detail={`Uptime ${Math.floor((data?.runtime?.uptimeSeconds ?? 0) / 60)} min`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Integrations"
            subtitle="Presence only - values are never sent to the browser"
            actions={<span className="text-xs font-bold text-slate-400">{integrations.length - missing.length}/{integrations.length}</span>}
          />
          <ul className="divide-y divide-slate-100">
            {integrations.map((row) => (
              <li key={row.keys.join('|')} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-charcoal">{row.label}</p>
                  {/* A capability can need several vars; show them all, never values. */}
                  <p className="truncate font-mono text-[11px] text-slate-400">{row.keys.join(', ')}</p>
                </div>
                {row.configured
                  ? <StatusPill status="ACTIVE" label="Configured" />
                  : <StatusPill status="FAILED" label="Missing" />}
              </li>
            ))}
          </ul>
          {missing.length ? (
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-amber-700">
              {missing.length} integration{missing.length === 1 ? ' is' : 's are'} not configured - whatever
              depends on {missing.length === 1 ? 'it' : 'them'} will not work.
            </p>
          ) : null}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Data volume" />
            <ul className="divide-y divide-slate-100">
              {[
                ['Merchants', counts.stores],
                ['Products', counts.products],
                ['Orders', counts.orders],
                ['Customers', counts.customers],
                ['Payouts', counts.payouts],
                ['Domains', counts.domains],
                ['Theme templates', counts.themes],
                ['Administrators', counts.admins],
                ['Audit entries', counts.audit_entries],
              ].map(([label, value]) => (
                <li key={label} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="text-xs font-semibold text-slate-500">{label}</span>
                  <span className="text-sm font-extrabold text-charcoal">{Number(value || 0).toLocaleString()}</span>
                </li>
              ))}
            </ul>
            {counts.latest_order_at ? (
              <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
                Most recent order: {dateTimeOrDash(counts.latest_order_at)}
              </p>
            ) : null}
          </Panel>

          <Panel>
            <PanelHeader title="Runtime" />
            <dl className="grid gap-3 p-5 sm:grid-cols-2">
              {[
                ['Node', data?.runtime?.node],
                ['Platform', data?.runtime?.platform],
                ['Environment', data?.runtime?.environment],
                ['Server time', data?.serverTime ? dateTimeOrDash(data.serverTime) : '-'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
                  <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-charcoal">
                    {label === 'Platform' ? <Cpu size={13} className="text-slate-400" /> : null}
                    {value || '-'}
                  </dd>
                </div>
              ))}
            </dl>
            {db.schema ? (
              <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
                Schema state: <span className="font-mono">{JSON.stringify(db.schema)}</span>
              </p>
            ) : null}
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelHeader title="Database connectivity" />
        <p className="px-5 py-4 text-sm text-slate-600">
          <span className="inline-flex items-center gap-2">
            <Database size={15} className="text-slate-400" />
            {db.ok
              ? `Connected in ${db.latencyMs}ms. Every admin query runs against this connection.`
              : `The database is not reachable: ${db.error}`}
          </span>
        </p>
      </Panel>
    </>
  );
}
