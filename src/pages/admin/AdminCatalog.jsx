/**
 * DiDwa - Super admin catalog (products, variants, stock).
 *
 * Products belong to merchants, so this page inspects listings and corrects
 * stock - it does not let the platform rewrite a merchant's catalogue, prices
 * or descriptions.
 */
import { useState } from 'react';
import { adminApi } from '../../api.js';
import StockEditor from './StockEditor.jsx';
import {
  Button, DataTable, Drawer, EmptyState, ErrorBanner, LoadingBlock, Money, PageHeader,
  Pagination, Panel, PanelHeader, RefreshCw, Select, Stacked, StatusPill, Toolbar, list,
} from '../../components/admin/ui.jsx';
import { useAdminList } from '../../components/admin/useAdminList.js';

const ONLY_OPTIONS = [
  { value: '', label: 'All products' },
  { value: 'low-stock', label: 'Low stock' },
  { value: 'inactive', label: 'Hidden' },
];

export default function AdminCatalog() {
  const products = useAdminList('/api/admin/products', { params: { rowsKey: 'products' } });
  const alerts = useAdminList('/api/admin/restock-alerts', { params: { rowsKey: 'alerts' } });
  const [openProduct, setOpenProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [editing, setEditing] = useState(null);

  async function showProduct(row) {
    setOpenProduct(row);
    setLoadingVariants(true);
    try {
      const detail = await adminApi.get(`/api/admin/products/${row.id}`);
      setVariants(list(detail.variants));
    } catch {
      setVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Catalog"
        subtitle="Every product and variant listed by every merchant."
        actions={<Button icon={RefreshCw} onClick={() => { products.reload(); alerts.reload(); }}>Refresh</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader title="Products" subtitle={`${Number(products.total || 0).toLocaleString()} across all merchants`} />
          <Toolbar term={products.term} onTerm={products.setTerm} placeholder="Search product, category or merchant...">
            <Select
              label="Filter"
              value={products.filters.only || ''}
              onChange={(value) => products.setFilter('only', value)}
              options={ONLY_OPTIONS}
            />
          </Toolbar>
          {products.error ? <div className="p-5"><ErrorBanner error={products.error} onRetry={products.reload} /></div> : null}
          {products.loading ? <LoadingBlock label="Loading products..." /> : (
            <DataTable
              rows={products.rows}
              onRowClick={showProduct}
              empty={(
                <EmptyState
                  title={products.isFiltered ? 'No products match those filters.' : 'No products listed yet.'}
                  action={products.isFiltered ? <Button onClick={() => { products.setTerm(''); products.setFilter('only', ''); }}>Clear filters</Button> : null}
                />
              )}
              columns={[
                { key: 'name', label: 'Product', render: (row) => <Stacked primary={row.name} secondary={row.category} /> },
                { key: 'storeName', label: 'Merchant' },
                { key: 'price', label: 'Price', align: 'right', render: (row) => <Money value={row.price} /> },
                { key: 'variantCount', label: 'Variants', align: 'right' },
                {
                  key: 'stockTotal',
                  label: 'Stock',
                  align: 'right',
                  render: (row) => (
                    <span className={row.lowStock > 0 ? 'font-bold text-amber-600' : 'font-semibold text-charcoal'}>
                      {Number(row.stockTotal || 0)}
                      {row.lowStock > 0 ? ` (${row.lowStock} low)` : ''}
                    </span>
                  ),
                },
                {
                  key: 'isActive',
                  label: 'Listed',
                  render: (row) => (row.isActive
                    ? <StatusPill status="ACTIVE" label="Listed" />
                    : <StatusPill status="CANCELLED" label="Hidden" />),
                },
              ]}
            />
          )}
          {!products.loading && !products.error ? (
            <Pagination page={products.page} pages={products.pages} total={products.total} onPage={products.setPage} />
          ) : null}
        </Panel>

        <Panel>
          <PanelHeader title="Restock alerts" subtitle="Most recent triggers" />
          {alerts.loading ? <LoadingBlock label="Loading alerts..." /> : (
            <ul className="divide-y divide-slate-100">
              {alerts.rows.map((alert) => (
                <li key={alert.id} className="px-5 py-3">
                  <p className="truncate text-sm font-semibold text-charcoal">{alert.productName} - {alert.optionValue}</p>
                  <p className="truncate text-xs text-slate-400">{alert.storeName}</p>
                  <p className="mt-0.5 text-xs font-bold text-amber-600">
                    {alert.stockQuantity} left (reorder at {alert.reorderLevel})
                  </p>
                </li>
              ))}
              {alerts.rows.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-slate-400">No stock alerts.</li>
              ) : null}
            </ul>
          )}
        </Panel>
      </div>

      <Drawer
        open={Boolean(openProduct)}
        wide
        title={openProduct?.name || 'Product'}
        subtitle={openProduct ? `${openProduct.storeName} - ${openProduct.category}` : ''}
        onClose={() => setOpenProduct(null)}
      >
        {loadingVariants ? <LoadingBlock label="Loading variants..." /> : (
          <DataTable
            rows={variants}
            columns={[
              {
                key: 'option_value',
                label: 'Variant',
                render: (row) => <Stacked primary={`${row.option_name}: ${row.option_value}`} secondary={row.sku || 'No SKU'} />,
              },
              { key: 'price_override', label: 'Price', align: 'right', render: (row) => (row.price_override ? <Money value={row.price_override} /> : <span className="text-xs text-slate-400">base</span>) },
              { key: 'stock_quantity', label: 'Stock', align: 'right', render: (row) => <span className="font-bold">{row.stock_quantity}</span> },
              { key: 'low_stock_threshold', label: 'Reorder at', align: 'right' },
              {
                key: 'actions',
                label: '',
                align: 'right',
                render: (row) => <Button onClick={() => setEditing(row)}>Correct</Button>,
              },
            ]}
          />
        )}
      </Drawer>

      <StockEditor
        variant={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { products.reload(); alerts.reload(); }}
      />
    </>
  );
}
