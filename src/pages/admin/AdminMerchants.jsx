/**
 * DiDwa - Super admin merchants (every tenant on the platform).
 *
 * Search, filter and sort are server-side, and the list is paged: the previous
 * dashboard returned every store on the page, which stops being usable well
 * before a marketplace has a thousand merchants.
 */
import { ExternalLink, ShieldAlert, Users } from 'lucide-react';
import { ghs } from '../../api.js';
import { getPlatformDomain } from '../../config.js';
import { navigate } from '../../router.js';
import {
  Button, DataTable, EmptyState, ErrorBanner, LoadingBlock, Money, PageHeader, Pagination,
  Panel, RefreshCw, Select, Stacked, StatusPill, Toolbar, dateOrDash, storefrontHref,
} from '../../components/admin/ui.jsx';
import { useAdminList } from '../../components/admin/useAdminList.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAST_DUE', label: 'Past due' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

export default function AdminMerchants() {
  const list = useAdminList('/api/admin/merchants', { params: { status: '' } });
  const platformDomain = getPlatformDomain();

  const open = (row) => navigate(`/admin/merchants/${row.id}`);

  return (
    <>
      <PageHeader
        title="Merchants"
        subtitle="Every store trading on DiDwa, and the state of each one."
        actions={(
          <Button icon={RefreshCw} onClick={list.reload}>Refresh</Button>
        )}
      />

      <Panel>
        <Toolbar
          term={list.term}
          onTerm={list.setTerm}
          placeholder="Search name, email, phone or subdomain..."
        >
          <Select
            label="Status"
            value={list.filters.status || ''}
            onChange={(value) => list.setFilter('status', value)}
            options={STATUS_OPTIONS}
          />
        </Toolbar>

        {list.error ? <div className="p-5"><ErrorBanner error={list.error} onRetry={list.reload} /></div> : null}

        {list.loading ? <LoadingBlock label="Loading merchants..." /> : (
          <DataTable
            rows={list.rows}
            onRowClick={open}
            empty={(
              <EmptyState
                title={list.isFiltered ? 'No merchants match those filters.' : 'No merchants have signed up yet.'}
                hint={list.isFiltered
                  ? 'Try a different search term, or clear the status filter.'
                  : 'New sellers appear here as soon as they complete registration.'}
                action={list.isFiltered ? <Button onClick={() => { list.setTerm(''); list.setFilter('status', ''); }}>Clear filters</Button> : null}
              />
            )}
            columns={[
              {
                key: 'name',
                label: 'Merchant',
                render: (row) => <Stacked primary={row.name} secondary={`${row.slug} - ${row.email}`} />,
              },
              { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
              { key: 'plan', label: 'Plan', render: (row) => <span className="text-xs font-bold uppercase text-slate-500">{row.plan}</span> },
              { key: 'ordersCount', label: 'Orders', align: 'right', render: (row) => Number(row.ordersCount || 0).toLocaleString() },
              { key: 'revenue', label: 'Revenue', align: 'right', render: (row) => <Money value={row.revenue} /> },
              {
                key: 'availableBalance',
                label: 'Wallet',
                align: 'right',
                render: (row) => <span className="whitespace-nowrap text-xs font-bold text-charcoal">{ghs(row.availableBalance)}</span>,
              },
              { key: 'created_at', label: 'Joined', align: 'right', render: (row) => dateOrDash(row.createdAt) },
              {
                key: 'storefront',
                label: '',
                align: 'right',
                render: (row) => {
                  const href = storefrontHref(row, platformDomain);
                  if (!href) return <span className="text-xs text-slate-300">-</span>;
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                    >
                      <ExternalLink size={13} />View
                    </a>
                  );
                },
              },
            ]}
          />
        )}

        {!list.loading && !list.error ? (
          <Pagination page={list.page} pages={list.pages} total={list.total} onPage={list.setPage} />
        ) : null}
      </Panel>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <ShieldAlert size={13} />
        Suspending a merchant immediately blocks their storefront. Every change is recorded.
        <Users size={13} className="ml-2" />
      </p>
    </>
  );
}
