/**
 * DiDwa - Super admin payouts (merchant withdrawals).
 *
 * Settling a payout moves real money, so it is NOT reimplemented here. This page
 * calls the single existing implementation - POST /api/payouts/:id/settle - which
 * holds the row lock, refuses to re-approve an ambiguous gateway attempt, and
 * now writes its own audit entry. A second approve path would be a second way
 * to pay out the same funds.
 */
import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { adminApi, ghs } from '../../api.js';
import {
  Button, DataTable, EmptyState, ErrorBanner, LoadingBlock, Money, PageHeader, Pagination,
  Panel, PanelHeader, RefreshCw, Select, Stacked, StatCard, StatusPill, Toolbar, dateTimeOrDash, list,
} from '../../components/admin/ui.jsx';
import { useAdminList } from '../../components/admin/useAdminList.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING_REVIEW', label: 'Awaiting approval' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'APPROVED', label: 'Paid' },
  { value: 'FAILED', label: 'Failed' },
];

export default function AdminPayouts() {
  const payouts = useAdminList('/api/admin/payouts', { params: { rowsKey: 'payouts' } });
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState('');

  const loadSummary = useCallback(async () => {
    setSummaryError('');
    try {
      setSummary(await adminApi.get('/api/admin/payouts/summary'));
    } catch (err) {
      setSummaryError(err.message);
    }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  async function settle(payout, approve) {
    setBusyId(payout.id);
    setNotice('');
    try {
      const result = await adminApi.post(`/api/payouts/${payout.id}/settle`, { approve });
      setNotice(result.message || 'Payout updated.');
      await Promise.all([payouts.reload(), loadSummary()]);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const totals = summary?.totals || {};
  const review = list(summary?.reviewQueue);
  const reviewTotal = review.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return (
    <>
      <PageHeader
        title="Payouts"
        subtitle="Merchant cash-outs, and the ones waiting on you."
        actions={<Button icon={RefreshCw} onClick={() => { payouts.reload(); loadSummary(); }}>Refresh</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total disbursed" value={ghs(totals.approved)} icon={Check} tone="emerald" />
        <StatCard title="Awaiting approval" value={ghs(reviewTotal)} detail={`${review.length} payouts`} tone={review.length ? 'amber' : 'blue'} />
        <StatCard title="Failed" value={ghs(totals.failed)} icon={X} tone={Number(totals.failed) > 0 ? 'rose' : 'blue'} />
        <StatCard title="Funds held by merchants" value={ghs(summary?.merchantHold?.pending_balance)} detail="Pending across all wallets" />
      </div>

      {notice ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{notice}</p>
      ) : null}
      {summaryError ? <ErrorBanner error={summaryError} onRetry={loadSummary} /> : null}

      <Panel>
        <PanelHeader title="Awaiting your approval" subtitle="Large withdrawals park here until an admin signs off" />
        {review.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Nothing is waiting for approval.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {review.map((payout) => (
              <li key={payout.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-charcoal">{payout.store_name}</p>
                  <p className="truncate text-xs text-slate-400">
                    {payout.network} - {payout.destination} - {dateTimeOrDash(payout.initiated_at)}
                  </p>
                  {payout.failure_reason ? (
                    <p className="mt-0.5 text-xs font-semibold text-amber-600">{payout.failure_reason}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Money value={payout.amount} />
                  <Button tone="danger" icon={X} busy={busyId === payout.id} onClick={() => settle(payout, false)}>Reject</Button>
                  <Button tone="primary" icon={Check} busy={busyId === payout.id} onClick={() => settle(payout, true)}>Approve</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHeader title="All payouts" />
        <Toolbar term={payouts.term} onTerm={payouts.setTerm} placeholder="Search merchant, destination or reference...">
          <Select
            label="Status"
            value={payouts.filters.status || ''}
            onChange={(value) => payouts.setFilter('status', value)}
            options={STATUS_OPTIONS}
          />
        </Toolbar>
        {payouts.error ? <div className="p-5"><ErrorBanner error={payouts.error} onRetry={payouts.reload} /></div> : null}
        {payouts.loading ? <LoadingBlock label="Loading payouts..." /> : (
          <DataTable
            rows={payouts.rows}
            empty={<EmptyState title={payouts.isFiltered ? 'No payouts match those filters.' : 'No payouts requested yet.'} />}
            columns={[
              { key: 'storeName', label: 'Merchant' },
              { key: 'amount', label: 'Amount', align: 'right', render: (row) => <Money value={row.amount} /> },
              { key: 'destination', label: 'Destination', render: (row) => <Stacked primary={row.destination} secondary={row.network} /> },
              { key: 'provider', label: 'Provider', render: (row) => (row.fallbackUsed ? `${row.provider} (fallback)` : row.provider) },
              { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
              { key: 'reference', label: 'Reference', render: (row) => <span className="font-mono text-[11px] text-slate-500">{row.reference || '-'}</span> },
              { key: 'initiatedAt', label: 'When', align: 'right', render: (row) => dateTimeOrDash(row.initiatedAt) },
            ]}
          />
        )}
        {!payouts.loading && !payouts.error ? (
          <Pagination page={payouts.page} pages={payouts.pages} total={payouts.total} onPage={payouts.setPage} />
        ) : null}
      </Panel>
    </>
  );
}
