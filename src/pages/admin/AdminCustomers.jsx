/**
 * DiDwa - Super admin customers (across every tenant).
 *
 * Strictly read-only. Customers and their loyalty balances are the merchant's
 * ledger - the platform can see a customer to investigate a dispute, but must
 * never be able to silently edit their record.
 */
import {
  Button, DataTable, EmptyState, ErrorBanner, LoadingBlock, Money, PageHeader, Pagination,
  Panel, RefreshCw, Stacked, Toolbar, dateOrDash,
} from '../../components/admin/ui.jsx';
import { useAdminList } from '../../components/admin/useAdminList.js';

export default function AdminCustomers() {
  const customers = useAdminList('/api/admin/customers', { params: { rowsKey: 'customers' } });

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Every customer record across every merchant, newest first."
        actions={<Button icon={RefreshCw} onClick={customers.reload}>Refresh</Button>}
      />

      <Panel>
        <Toolbar
          term={customers.term}
          onTerm={customers.setTerm}
          placeholder="Search name, phone, email or merchant..."
        />
        {customers.error ? <div className="p-5"><ErrorBanner error={customers.error} onRetry={customers.reload} /></div> : null}
        {customers.loading ? <LoadingBlock label="Loading customers..." /> : (
          <DataTable
            rows={customers.rows}
            empty={(
              <EmptyState
                title={customers.isFiltered ? 'No customers match that search.' : 'No customers yet.'}
                action={customers.isFiltered ? <Button onClick={() => customers.setTerm('')}>Clear search</Button> : null}
              />
            )}
            columns={[
              { key: 'name', label: 'Customer', render: (row) => <Stacked primary={row.name || 'Unnamed'} secondary={row.email || 'No email'} /> },
              { key: 'phone', label: 'Phone' },
              { key: 'storeName', label: 'Merchant' },
              { key: 'ordersCount', label: 'Orders', align: 'right' },
              { key: 'loyaltyPoints', label: 'Points', align: 'right', render: (row) => Number(row.loyaltyPoints || 0).toLocaleString() },
              { key: 'totalSpent', label: 'Lifetime spend', align: 'right', render: (row) => <Money value={row.totalSpent} /> },
              { key: 'createdAt', label: 'Joined', align: 'right', render: (row) => dateOrDash(row.createdAt) },
            ]}
          />
        )}
        {!customers.loading && !customers.error ? (
          <Pagination page={customers.page} pages={customers.pages} total={customers.total} onPage={customers.setPage} />
        ) : null}
      </Panel>
    </>
  );
}
