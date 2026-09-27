/**
 * DiDwa - Super admin domains (provisioning across every tenant).
 *
 * Failed verification is the single most common support ticket on a custom
 * domain, so the retry action lives here - it re-runs the Cloudflare check and
 * writes the result back, exactly as the pre-split admin route did.
 */
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw as RetryIcon } from 'lucide-react';
import { adminApi, ghs } from '../../api.js';
import {
  Button, DataTable, EmptyState, ErrorBanner, LoadingBlock, PageHeader, Pagination, Panel,
  PanelHeader, RefreshCw, Select, Stacked, StatCard, StatusPill, Toolbar, dateOrDash, list,
} from '../../components/admin/ui.jsx';
import { useAdminList } from '../../components/admin/useAdminList.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING_DNS', label: 'Pending DNS' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const RETRYABLE = ['FAILED', 'CANCELLED'];

export default function AdminDomains() {
  const domains = useAdminList('/api/admin/domains', { params: { rowsKey: 'domains' } });
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState('');

  const loadSummary = useCallback(async () => {
    setSummaryError('');
    try {
      setSummary(await adminApi.get('/api/admin/domains/summary'));
    } catch (err) {
      setSummaryError(err.message);
    }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  async function retry(domain) {
    setBusyId(domain.id);
    setNotice('');
    try {
      const result = await adminApi.post(`/api/admin/domains/${domain.id}/retry`, {});
      setNotice(result.message || 'Verification refreshed.');
      await Promise.all([domains.reload(), loadSummary()]);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const count = (status) => Number(list(summary?.byStatus).find((row) => row.status === status)?.count || 0);

  return (
    <>
      <PageHeader
        title="Domains"
        subtitle="Every custom domain connected to a merchant storefront."
        actions={<Button icon={RefreshCw} onClick={() => { domains.reload(); loadSummary(); }}>Refresh</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active domains" value={String(count('ACTIVE'))} tone="emerald" />
        <StatCard title="Awaiting DNS" value={String(count('PENDING_DNS'))} detail="Waiting on the merchant's records" tone="amber" />
        <StatCard title="Failed" value={String(count('FAILED') + count('CANCELLED'))} detail="Can be retried" tone={count('FAILED') ? 'rose' : 'blue'} />
        <StatCard title="Domain spend" value={ghs(summary?.spend?.spent)} detail={`${Number(summary?.spend?.purchased || 0).toLocaleString()} purchased through us`} />
      </div>

      {notice ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{notice}</p>
      ) : null}
      {summaryError ? <ErrorBanner error={summaryError} onRetry={loadSummary} /> : null}

      <Panel>
        <PanelHeader title="Domain registry" />
        <Toolbar term={domains.term} onTerm={domains.setTerm} placeholder="Search domain or merchant...">
          <Select
            label="Status"
            value={domains.filters.status || ''}
            onChange={(value) => domains.setFilter('status', value)}
            options={STATUS_OPTIONS}
          />
        </Toolbar>
        {domains.error ? <div className="p-5"><ErrorBanner error={domains.error} onRetry={domains.reload} /></div> : null}
        {domains.loading ? <LoadingBlock label="Loading domains..." /> : (
          <DataTable
            rows={domains.rows}
            empty={<EmptyState title={domains.isFiltered ? 'No domains match those filters.' : 'No custom domains connected yet.'} />}
            columns={[
              { key: 'domain_name', label: 'Domain', render: (row) => <Stacked primary={row.domain_name} secondary={row.storeName} /> },
              { key: 'provider', label: 'Source', render: (row) => (row.provider === 'PURCHASED' ? 'Purchased' : 'Merchant') },
              { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
              { key: 'ssl_status', label: 'SSL', render: (row) => <span className="text-xs font-semibold text-slate-600">{row.ssl_status || '-'}</span> },
              { key: 'price_paid_ghs', label: 'Paid', align: 'right', render: (row) => (row.price_paid_ghs ? ghs(row.price_paid_ghs) : '-') },
              { key: 'created_at', label: 'Added', align: 'right', render: (row) => dateOrDash(row.created_at) },
              {
                key: 'actions',
                label: '',
                align: 'right',
                render: (row) => (RETRYABLE.includes(row.status)
                  ? (
                    <Button icon={RetryIcon} busy={busyId === row.id} onClick={() => retry(row)}>
                      Re-verify
                    </Button>
                  )
                  : <span className="text-xs text-slate-300">-</span>),
              },
            ]}
          />
        )}
        {!domains.loading && !domains.error ? (
          <Pagination page={domains.page} pages={domains.pages} total={domains.total} onPage={domains.setPage} />
        ) : null}
      </Panel>
    </>
  );
}
