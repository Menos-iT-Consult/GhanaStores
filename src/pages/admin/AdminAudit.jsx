/**
 * DiDwa - Super admin audit log.
 *
 * The append-only record of every write performed on this platform. The filter
 * list comes from the ledger itself (GET /audit/actions), so an action that
 * starts appearing here cannot be missing from the dropdown, and the human label
 * for each action is defined once on the server next to the code that writes it.
 */
import { useEffect, useState } from 'react';
import { adminApi } from '../../api.js';
import {
  Button, DataTable, Drawer, EmptyState, ErrorBanner, LoadingBlock, PageHeader, Pagination,
  Panel, RefreshCw, Select, Stacked, Toolbar, dateTimeOrDash, list,
} from '../../components/admin/ui.jsx';
import { useAdminList } from '../../components/admin/useAdminList.js';

/** Flatten the audit detail object into readable key/value lines. */
function DetailRows({ detail }) {
  const entries = Object.entries(detail || {});
  if (entries.length === 0) return <p className="text-sm text-slate-400">No further detail recorded.</p>;
  return (
    <dl className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-2">
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{key}</dt>
          <dd className="text-right font-mono text-xs text-charcoal">
            {value && typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function AdminAudit() {
  const audit = useAdminList('/api/admin/audit', { params: { rowsKey: 'entries', limit: 30 } });
  const [actions, setActions] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    // A failure here only costs the filter dropdown, so it must not blank the log.
    adminApi.get('/api/admin/audit/actions')
      .then((result) => setActions(list(result.actions)))
      .catch(() => setActions([]));
  }, []);

  const options = [
    { value: '', label: 'All actions' },
    ...actions.map((row) => ({ value: row.action, label: `${row.label} (${row.count})` })),
  ];

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Every change an administrator has made to this platform."
        actions={<Button icon={RefreshCw} onClick={audit.reload}>Refresh</Button>}
      />

      <Panel>
        <Toolbar term={audit.term} onTerm={audit.setTerm} placeholder="Search action, admin email or target id...">
          <Select
            label="Action"
            value={audit.filters.action || ''}
            onChange={(value) => audit.setFilter('action', value)}
            options={options}
          />
        </Toolbar>
        {audit.error ? <div className="p-5"><ErrorBanner error={audit.error} onRetry={audit.reload} /></div> : null}
        {audit.loading ? <LoadingBlock label="Loading audit log..." /> : (
          <DataTable
            rows={audit.rows}
            onRowClick={(row) => setOpen(row)}
            empty={(
              <EmptyState
                title={audit.isFiltered ? 'No entries match that filter.' : 'Nothing has been logged yet.'}
                hint="Entries appear the moment an administrator changes anything."
              />
            )}
            columns={[
              { key: 'actionLabel', label: 'Action', render: (row) => <span className="font-semibold text-charcoal">{row.actionLabel}</span> },
              { key: 'admin_email', label: 'Administrator', render: (row) => <Stacked primary={row.admin_name || row.adminEmail || row.admin_email} secondary={row.ip || ''} /> },
              { key: 'target_type', label: 'Target', render: (row) => (row.targetType ? <span className="font-mono text-[11px] text-slate-500">{row.targetType}</span> : '-') },
              { key: 'createdAt', label: 'When', align: 'right', render: (row) => dateTimeOrDash(row.createdAt) },
            ]}
          />
        )}
        {!audit.loading && !audit.error ? (
          <Pagination page={audit.page} pages={audit.pages} total={audit.total} onPage={audit.setPage} />
        ) : null}
      </Panel>

      <Drawer
        open={Boolean(open)}
        title={open?.actionLabel || 'Audit entry'}
        subtitle={open ? `${open.admin_name || open.adminEmail || open.admin_email} - ${dateTimeOrDash(open.createdAt)}` : ''}
        onClose={() => setOpen(null)}
      >
        {open ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Action', open.action],
                ['Target', `${open.targetType || '-'} ${open.targetId || ''}`.trim()],
                ['Administrator', open.adminEmail || open.admin_email || '-'],
                ['IP address', open.ip || '-'],
                ['Recorded', dateTimeOrDash(open.createdAt)],
                ['Entry id', <span key="id" className="font-mono text-[11px]">{open.id}</span>],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                  <div className="mt-0.5 break-words text-sm font-semibold text-charcoal">{value}</div>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Detail</p>
              <DetailRows detail={open.detail} />
            </div>
          </div>
        ) : null}
      </Drawer>
    </>
  );
}
