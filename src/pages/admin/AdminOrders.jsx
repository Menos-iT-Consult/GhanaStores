/**
 * DiDwa - Super admin orders (every order on every tenant).
 *
 * Read-mostly, with two writes: moving an order's status and refunding/voiding
 * it. Both go through the shared order lifecycle service on the server, so an
 * admin refund restocks inventory and reverses the wallet credit exactly as a
 * seller-side cancellation does - there is no second, divergent code path.
 */
import { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { adminApi } from '../../api.js';
import { navigate } from '../../router.js';
import {
  Button, ConfirmDialog, DataTable, Drawer, EmptyState, ErrorBanner, Field, LoadingBlock,
  Money, PageHeader, Pagination, Panel, RefreshCw, Select, Stacked, StatusPill, Toolbar,
  dateTimeOrDash, inputClass, list,
} from '../../components/admin/ui.jsx';
import { useAdminList } from '../../components/admin/useAdminList.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...['PENDING', 'PAID', 'FULFILLED', 'DELIVERED', 'CANCELLED'].map((value) => ({ value, label: value })),
];

const CHANNEL_OPTIONS = [
  { value: '', label: 'All channels' },
  { value: 'ONLINE_WHATSAPP', label: 'WhatsApp' },
  { value: 'POS', label: 'POS' },
  { value: 'COD_RIDER', label: 'COD + rider' },
];

export default function AdminOrders() {
  const orders = useAdminList('/api/admin/orders');
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDetail = useCallback(async (id) => {
    setDetailLoading(true);
    setError('');
    try {
      setDetail(await adminApi.get(`/api/admin/orders/${id}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (openId) loadDetail(openId);
    else { setDetail(null); setNotice(''); setError(''); }
  }, [openId, loadDetail]);

  async function refund() {
    setBusy(true);
    setError('');
    try {
      const result = await adminApi.post(`/api/admin/orders/${openId}/refund`, { reason });
      setNotice(result.note || (result.reversal
        ? `Refunded ${result.reversal.debited} of ${result.reversal.total}.`
        : 'Order voided - no money had been collected.'));
      setRefundOpen(false);
      setReason('');
      await loadDetail(openId);
      orders.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const order = detail?.order;
  const refundable = order && order.status !== 'CANCELLED' && order.status !== 'DELIVERED';

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Every order placed across every merchant."
        actions={<Button icon={RefreshCw} onClick={orders.reload}>Refresh</Button>}
      />

      <Panel>
        <Toolbar term={orders.term} onTerm={orders.setTerm} placeholder="Search order number, customer or merchant...">
          <Select
            label="Status"
            value={orders.filters.status || ''}
            onChange={(value) => orders.setFilter('status', value)}
            options={STATUS_OPTIONS}
          />
          <Select
            label="Channel"
            value={orders.filters.channel || ''}
            onChange={(value) => orders.setFilter('channel', value)}
            options={CHANNEL_OPTIONS}
          />
        </Toolbar>

        {orders.error ? <div className="p-5"><ErrorBanner error={orders.error} onRetry={orders.reload} /></div> : null}

        {orders.loading ? <LoadingBlock label="Loading orders..." /> : (
          <DataTable
            rows={orders.rows}
            onRowClick={(row) => setOpenId(row.id)}
            empty={(
              <EmptyState
                title={orders.isFiltered ? 'No orders match those filters.' : 'No orders yet.'}
                action={orders.isFiltered ? <Button onClick={() => { orders.setTerm(''); orders.setFilter('status', ''); orders.setFilter('channel', ''); }}>Clear filters</Button> : null}
              />
            )}
            columns={[
              { key: 'orderNumber', label: 'Order', render: (row) => <span className="font-mono text-xs font-bold">{row.orderNumber}</span> },
              { key: 'storeName', label: 'Merchant' },
              { key: 'customerName', label: 'Customer', render: (row) => <Stacked primary={row.customerName || 'Walk-in'} secondary={row.customerPhone} /> },
              { key: 'channel', label: 'Channel', render: (row) => <span className="text-xs font-semibold text-slate-500">{String(row.channel || '').replaceAll('_', ' ')}</span> },
              { key: 'paymentMethod', label: 'Payment', render: (row) => row.paymentMethod },
              { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
              { key: 'total', label: 'Total', align: 'right', render: (row) => <Money value={row.total} /> },
              { key: 'createdAt', label: 'When', align: 'right', render: (row) => dateTimeOrDash(row.createdAt) },
            ]}
          />
        )}

        {!orders.loading && !orders.error ? (
          <Pagination page={orders.page} pages={orders.pages} total={orders.total} onPage={orders.setPage} />
        ) : null}
      </Panel>

      <Drawer
        open={Boolean(openId)}
        wide
        title={order ? `Order ${order.orderNumber}` : 'Order'}
        subtitle={order ? `${order.storeName} - ${dateTimeOrDash(order.createdAt)}` : ''}
        onClose={() => setOpenId(null)}
        footer={order && refundable ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-400">
              Refunding restocks the items and reverses the merchant wallet credit.
            </p>
            <Button tone="danger" icon={RotateCcw} onClick={() => setRefundOpen(true)}>
              {['PAID', 'FULFILLED'].includes(order.status) ? 'Refund order' : 'Void order'}
            </Button>
          </div>
        ) : null}
      >
        {detailLoading ? <LoadingBlock label="Loading order..." /> : null}
        {error && !refundOpen ? <ErrorBanner error={error} /> : null}
        {notice ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
        ) : null}

        {order ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Status', <StatusPill status={order.status} key="s" />],
                ['Payment', `${order.paymentMethod} (${order.paymentStatus})`],
                ['Channel', String(order.channel || '').replaceAll('_', ' ')],
                ['Customer', order.customerName || 'Walk-in'],
                ['Phone', order.customerPhone || '-'],
                ['Address', order.customerAddress || '-'],
                ['Rider', order.riderName || '-'],
                ['Placed', dateTimeOrDash(order.createdAt)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                  <div className="mt-0.5 text-sm font-semibold text-charcoal">{value}</div>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Items</p>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {list(detail.items).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-charcoal">{item.product_name}</span>
                      <span className="text-xs text-slate-400">
                        {item.variant_label || 'Default'} - {item.quantity} x {Number(item.unit_price).toFixed(2)}
                      </span>
                    </span>
                    <Money value={item.total_price} />
                  </li>
                ))}
                {list(detail.items).length === 0 ? <li className="px-4 py-3 text-sm text-slate-400">No items recorded.</li> : null}
              </ul>
            </div>

            <dl className="space-y-1.5 rounded-xl border border-slate-200 p-4 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-semibold">{Number(order.subtotal || 0).toFixed(2)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Delivery</dt><dd className="font-semibold">{Number(order.deliveryFee || 0).toFixed(2)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="font-semibold">-{Number(order.discountAmount || 0).toFixed(2)}</dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 text-base"><dt className="font-bold">Total</dt><dd className="font-extrabold">{Number(order.total || 0).toFixed(2)} GHS</dd></div>
            </dl>

            <button
              type="button"
              onClick={() => { setOpenId(null); navigate(`/admin/merchants/${order.storeId}`); }}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Open this merchant
            </button>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={refundOpen}
        tone="danger"
        busy={busy}
        title={order && ['PAID', 'FULFILLED'].includes(order.status) ? 'Refund this order?' : 'Void this order?'}
        message={(
          <span className="block space-y-3">
            <span className="block">
              {order && ['PAID', 'FULFILLED'].includes(order.status)
                ? 'The items go back into stock and the merchant wallet is debited by the order total.'
                : 'No money was collected, so this only cancels the order and releases the reserved stock.'}
            </span>
            <Field label="Reason" hint="Recorded in the audit log. Required.">
              <input
                className={inputClass}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Customer returned the item"
              />
            </Field>
            {error ? <span className="block rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</span> : null}
          </span>
        )}
        confirmLabel="Confirm"
        onCancel={() => setRefundOpen(false)}
        onConfirm={() => (reason.trim() ? refund() : undefined)}
      />
    </>
  );
}
