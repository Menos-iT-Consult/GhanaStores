/**
 * DiDwa - Super admin payments (subscription charges + gateway health).
 *
 * Read-only by design. Activating a subscription stays in ONE implementation -
 * POST /api/billing/activate, which already writes to the audit ledger - so this
 * page reports the state of charges rather than offering a second, divergent way
 * to flip a store to ACTIVE.
 */
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, WifiOff } from 'lucide-react';
import { adminApi, ghs } from '../../api.js';
import {
  Button, DataTable, EmptyState, ErrorBanner, LoadingBlock, Money, PageHeader, Pagination,
  Panel, PanelHeader, RefreshCw, Select, Stacked, StatCard, StatusPill, Toolbar, dateTimeOrDash, list,
} from '../../components/admin/ui.jsx';
import { useAdminList } from '../../components/admin/useAdminList.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
];

const PROVIDER_OPTIONS = [
  { value: '', label: 'All gateways' },
  { value: 'MTN', label: 'MTN' },
  { value: 'HUBTEL', label: 'Hubtel' },
  { value: 'PENDING', label: 'Not dispatched' },
];

export default function AdminPayments() {
  const payments = useAdminList('/api/admin/payments', { params: { rowsKey: 'payments' } });
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState('');

  const loadHealth = useCallback(async () => {
    setHealthError('');
    try {
      setHealth(await adminApi.get('/api/admin/payments/gateways'));
    } catch (err) {
      setHealthError(err.message);
    }
  }, []);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  const failed = Number(health?.revenue?.failed || 0);
  const pending = Number(health?.revenue?.pending || 0);

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Subscription charges and how the gateways are behaving."
        actions={<Button icon={RefreshCw} onClick={() => { payments.reload(); loadHealth(); }}>Refresh</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Collected (all time)" value={ghs(health?.revenue?.total)} icon={CheckCircle2} tone="emerald" />
        <StatCard title="Failed charges" value={String(failed)} icon={AlertCircle} detail="Needs a follow-up" tone={failed > 0 ? 'rose' : 'blue'} />
        <StatCard title="Still pending" value={String(pending)} icon={WifiOff} detail="Awaiting confirmation" tone={pending > 0 ? 'amber' : 'blue'} />
      </div>

      {healthError ? <ErrorBanner error={healthError} onRetry={loadHealth} /> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Gateways" />
          <ul className="divide-y divide-slate-100">
            {list(health?.providers).map((row) => (
              <li key={`${row.provider}-${row.status}`} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="flex items-center gap-2">
                  <CreditCard size={14} className="text-slate-400" />
                  <span className="text-sm font-semibold text-charcoal">{row.provider}</span>
                  <StatusPill status={row.status} />
                </span>
                <span className="text-xs font-bold text-slate-500">{Number(row.count || 0).toLocaleString()}</span>
              </li>
            ))}
            {list(health?.providers).length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-slate-400">No charges recorded yet.</li>
            ) : null}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader title="By network" />
          <ul className="divide-y divide-slate-100">
            {list(health?.networks).map((row) => (
              <li key={row.network} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="text-sm font-semibold text-charcoal">{row.network}</span>
                <span className="text-xs text-slate-500">
                  {Number(row.count || 0).toLocaleString()} charges - {ghs(row.collected)}
                </span>
              </li>
            ))}
            {list(health?.networks).length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-slate-400">No data yet.</li>
            ) : null}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader title="Failure reasons" subtitle="Last 30 days" />
          <ul className="divide-y divide-slate-100">
            {list(health?.failureReasons).map((row) => (
              <li key={row.failure_reason} className="flex items-start justify-between gap-3 px-5 py-3">
                <span className="min-w-0 text-sm text-slate-600">{row.failure_reason || 'Unspecified'}</span>
                <span className="shrink-0 text-xs font-bold text-rose-600">{Number(row.count || 0)}</span>
              </li>
            ))}
            {list(health?.failureReasons).length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-slate-400">No failures in the last 30 days.</li>
            ) : null}
          </ul>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Transactions" subtitle="Every subscription charge attempt" />
        <Toolbar term={payments.term} onTerm={payments.setTerm} placeholder="Search merchant, phone or reference...">
          <Select
            label="Status"
            value={payments.filters.status || ''}
            onChange={(value) => payments.setFilter('status', value)}
            options={STATUS_OPTIONS}
          />
          <Select
            label="Gateway"
            value={payments.filters.provider || ''}
            onChange={(value) => payments.setFilter('provider', value)}
            options={PROVIDER_OPTIONS}
          />
        </Toolbar>
        {payments.error ? <div className="p-5"><ErrorBanner error={payments.error} onRetry={payments.reload} /></div> : null}
        {payments.loading ? <LoadingBlock label="Loading payments..." /> : (
          <DataTable
            rows={payments.rows}
            empty={<EmptyState title={payments.isFiltered ? 'No payments match those filters.' : 'No subscription charges yet.'} />}
            columns={[
              { key: 'storeName', label: 'Merchant' },
              { key: 'planId', label: 'Plan', render: (row) => <span className="text-xs font-bold uppercase text-slate-500">{row.planId}</span> },
              { key: 'amount', label: 'Amount', align: 'right', render: (row) => <Money value={row.amount} /> },
              { key: 'momoNumber', label: 'Payer', render: (row) => <Stacked primary={row.momoNumber} secondary={row.network} /> },
              { key: 'provider', label: 'Gateway' },
              { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
              { key: 'initiatedAt', label: 'When', align: 'right', render: (row) => dateTimeOrDash(row.initiatedAt) },
            ]}
          />
        )}
        {!payments.loading && !payments.error ? (
          <Pagination page={payments.page} pages={payments.pages} total={payments.total} onPage={payments.setPage} />
        ) : null}
      </Panel>
    </>
  );
}
