/**
 * DiDwa - Super admin logistics (rider transits).
 *
 * Read-only on purpose. A transit is cash a rider collected on the merchant's
 * behalf, and reconciling someone else's cash is a merchant action - the
 * platform can see where that cash is, but cannot quietly mark it settled.
 */
import { useCallback, useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { adminApi, ghs } from '../../api.js';
import {
  Button, DataTable, EmptyState, ErrorBanner, LoadingBlock, Money, PageHeader, Pagination,
  Panel, PanelHeader, RefreshCw, Select, Stacked, StatCard, StatusPill, Toolbar, dateTimeOrDash, list,
} from '../../components/admin/ui.jsx';
import { useAdminList } from '../../components/admin/useAdminList.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All transits' },
  { value: 'TRANSIT', label: 'In transit' },
  { value: 'RECONCILED', label: 'Reconciled' },
];

export default function AdminLogistics() {
  const transits = useAdminList('/api/admin/riders', { params: { rowsKey: 'transits' } });
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState('');

  const loadSummary = useCallback(async () => {
    setSummaryError('');
    try {
      setSummary(await adminApi.get('/api/admin/riders/summary'));
    } catch (err) {
      setSummaryError(err.message);
    }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const cash = summary?.cash || {};
  const open = Number(cash.in_transit || 0);

  return (
    <>
      <PageHeader
        title="Logistics"
        subtitle="Cash collected by dispatch riders, platform-wide."
        actions={<Button icon={RefreshCw} onClick={() => { transits.reload(); loadSummary(); }}>Refresh</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard title="Cash in transit" value={ghs(cash.in_transit)} icon={Truck} detail="Collected, not yet reconciled" tone={open > 0 ? 'amber' : 'blue'} />
        <StatCard title="Reconciled" value={ghs(cash.reconciled)} detail="Settled with the merchant" tone="emerald" />
      </div>

      {summaryError ? <ErrorBanner error={summaryError} onRetry={loadSummary} /> : null}

      <Panel>
        <PanelHeader title="Rider transits" subtitle="Newest dispatches first" />
        <Toolbar term={transits.term} onTerm={transits.setTerm} placeholder="Search rider, phone or merchant...">
          <Select
            label="Status"
            value={transits.filters.status || ''}
            onChange={(value) => transits.setFilter('status', value)}
            options={STATUS_OPTIONS}
          />
        </Toolbar>
        {transits.error ? <div className="p-5"><ErrorBanner error={transits.error} onRetry={transits.reload} /></div> : null}
        {transits.loading ? <LoadingBlock label="Loading transits..." /> : (
          <DataTable
            rows={transits.rows}
            empty={<EmptyState title={transits.isFiltered ? 'No transits match those filters.' : 'No riders dispatched yet.'} />}
            columns={[
              { key: 'riderName', label: 'Rider', render: (row) => <Stacked primary={row.riderName} secondary={row.riderPhone} /> },
              { key: 'storeName', label: 'Merchant' },
              { key: 'orderIds', label: 'Orders', render: (row) => (Array.isArray(row.orderIds) ? row.orderIds.length : 0) },
              { key: 'amount', label: 'Cash collected', align: 'right', render: (row) => <Money value={row.amount} /> },
              { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
              { key: 'dispatchedAt', label: 'Dispatched', align: 'right', render: (row) => dateTimeOrDash(row.dispatchedAt) },
              {
                key: 'reconciledAt',
                label: 'Reconciled',
                align: 'right',
                render: (row) => (row.reconciledAt ? dateTimeOrDash(row.reconciledAt) : <span className="text-xs text-slate-300">-</span>),
              },
            ]}
          />
        )}
        {!transits.loading && !transits.error ? (
          <Pagination page={transits.page} pages={transits.pages} total={transits.total} onPage={transits.setPage} />
        ) : null}
      </Panel>
    </>
  );
}
