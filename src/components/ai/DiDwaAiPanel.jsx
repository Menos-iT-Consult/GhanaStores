import { useEffect, useState } from 'react';
import {
  Bot, Check, Clipboard, LoaderCircle, Mail, MessageSquareText, Phone, Sparkles, X,
} from 'lucide-react';
import { api } from '../../api.js';
import {
  AI_ACTIONS,
  AI_SUPPORT_FALLBACK,
  createAiSupportNotice,
  isSupportedOrderText,
} from '../../../config/didwaAiActions.js';

function formatGhs(value) {
  return `GH₵${Number(value || 0).toFixed(2)}`;
}

function ResultValue({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 py-2 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-900">{children}</span>
    </div>
  );
}

export default function DiDwaAiPanel() {
  const [open, setOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [orderText, setOrderText] = useState('');
  const [productId, setProductId] = useState('');
  const [amount, setAmount] = useState('');
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [supportContact, setSupportContact] = useState({});
  const fallbackText = createAiSupportNotice(supportContact);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    api.get('/api/platform-settings/public')
      .then((response) => setSupportContact(response.settings?.contact || {}))
      .catch((err) => setError(err.message || 'Platform support contacts could not be loaded.'));
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open || selectedAction !== '[GENERATE_PRODUCT_COPY]' || products.length || productsLoading) return;
    setProductsLoading(true);
    api.get('/api/ai/products')
      .then((response) => {
        setProducts(response.products || []);
      })
      .catch((err) => {
        setError(err.message || 'Could not load products from your store.');
      })
      .finally(() => {
        setProductsLoading(false);
      });
    return undefined;
  }, [open, selectedAction, products.length]);

  const runAction = async (action, payload = {}) => {
    setBusy(true);
    setError('');
    setResult(null);
    setCopied(false);
    try {
      const response = await api.post('/api/ai/gateway', { action, payload });
      setResult(response.result);
    } catch (err) {
      setError(err.message || fallbackText);
    } finally {
      setBusy(false);
    }
  };

  const chooseAction = (action) => {
    setSelectedAction(action);
    setError('');
    setResult(null);
    if (action === '[CHECK_MOMO_BALANCE]') {
      runAction(action);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (selectedAction === '[PARSE_WHATSAPP_ORDER]') {
      if (!isSupportedOrderText(orderText)) return setError(fallbackText);
      return runAction(selectedAction, { text: orderText });
    }
    if (selectedAction === '[GENERATE_PRODUCT_COPY]') {
      if (!productId) return setError(fallbackText);
      return runAction(selectedAction, { productId });
    }
    if (selectedAction === '[REQUEST_PAYOUT]') {
      const amountGhs = Number(amount);
      if (!Number.isFinite(amountGhs) || amountGhs <= 0) return setError(fallbackText);
      return runAction(selectedAction, { amountGhs });
    }
    if (['[INVENTORY_INSIGHTS]', '[SALES_SUMMARY]', '[ORDER_SUMMARY]'].includes(selectedAction)) {
      return runAction(selectedAction);
    }
    return setError(fallbackText);
  };

  const supportPhone = supportContact.whatsappNumber || supportContact.supportPhone || '';
  const whatsappDigits = String(supportPhone).replace(/\D/g, '');
  const whatsappNumber = whatsappDigits.startsWith('0') ? `233${whatsappDigits.slice(1)}` : whatsappDigits;

  const copyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
    } catch {
      setError('Clipboard access is unavailable in this browser.');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-xl transition hover:bg-blue-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Sparkles size={18} aria-hidden="true" />
        DiDwa AI
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex justify-end" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setOpen(false)}
            aria-label="Close DiDwa AI panel"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="didwa-ai-title"
            className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-blue-50 p-2 text-blue-700"><Bot size={21} /></span>
                <div>
                  <h2 id="didwa-ai-title" className="font-bold text-slate-950">DiDwa AI</h2>
                  <p className="text-xs text-slate-500">Seller tools generated from your store data</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Choose a suggested action</h3>
                <div className="flex flex-wrap gap-2">
                  {AI_ACTIONS.map((action) => (
                    <button
                      type="button"
                      key={action.id}
                      onClick={() => chooseAction(action.id)}
                      aria-pressed={selectedAction === action.id}
                      className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                        selectedAction === action.id
                          ? 'border-blue-700 bg-blue-700 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-blue-500 hover:text-blue-700'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedAction ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  {AI_ACTIONS.find((action) => action.id === selectedAction)?.description}
                </div>
              ) : null}
              {['[INVENTORY_INSIGHTS]', '[SALES_SUMMARY]', '[ORDER_SUMMARY]'].includes(selectedAction) ? (
                <button
                  type="button"
                  onClick={() => runAction(selectedAction)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {selectedAction === '[INVENTORY_INSIGHTS]' ? 'Review inventory'
                    : selectedAction === '[SALES_SUMMARY]' ? 'Show sales summary' : 'Review orders'}
                </button>
              ) : null}

              {selectedAction === '[PARSE_WHATSAPP_ORDER]' ? (
                <form onSubmit={submit} className="space-y-3">
                  <label htmlFor="didwa-order-message" className="block text-sm font-semibold text-slate-800">
                    WhatsApp order message
                  </label>
                  <textarea
                    id="didwa-order-message"
                    rows={6}
                    maxLength={5000}
                    value={orderText}
                    onChange={(event) => setOrderText(event.target.value)}
                    placeholder={'Example: Customer name: Ama\n2x rice, 1x oil\nDeliver to: Madina, Greater Accra\nTotal: GHS 120'}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="text-xs text-slate-500">Only the order details are extracted; verify the result before creating an order.</p>
                  <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                    {busy ? <LoaderCircle size={16} className="animate-spin" /> : <MessageSquareText size={16} />}
                    Parse order
                  </button>
                </form>
              ) : null}

              {selectedAction === '[GENERATE_PRODUCT_COPY]' ? (
                <form onSubmit={submit} className="space-y-3">
                  <label htmlFor="didwa-product" className="block text-sm font-semibold text-slate-800">Store product</label>
                  {productsLoading ? (
                    <p className="text-sm text-slate-500">Loading your products…</p>
                  ) : products.length ? (
                    <select
                      id="didwa-product"
                      value={productId}
                      onChange={(event) => setProductId(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>{product.name} · {formatGhs(product.price)}</option>
                      ))}
                    </select>
                  ) : <p className="text-sm text-slate-500">No active products were found in your store.</p>}
                  <button type="submit" disabled={busy || productsLoading || !products.length} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                    {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Generate copy
                  </button>
                </form>
              ) : null}

              {selectedAction === '[REQUEST_PAYOUT]' ? (
                <form onSubmit={submit} className="space-y-3">
                  <label htmlFor="didwa-payout-amount" className="block text-sm font-semibold text-slate-800">Amount in GHS</label>
                  <input
                    id="didwa-payout-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max="1000000"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                  />
                  <p className="text-xs text-slate-500">Payouts go to your verified wallet and require DiDwa manual review.</p>
                  <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                    {busy ? <LoaderCircle size={16} className="animate-spin" /> : null}
                    Request payout
                  </button>
                </form>
              ) : null}

              {error ? (
                <div role="alert" className="whitespace-pre-wrap rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  {error}
                </div>
              ) : null}

              {result ? (
                <section aria-live="polite" className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">Result</h3>
                    <button type="button" onClick={copyResult} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                      {copied ? <Check size={14} /> : <Clipboard size={14} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  {Array.isArray(result.items) ? (
                    <>
                      <ResultValue label="Customer">{result.customerName || 'Not identified'}</ResultValue>
                      <div className="border-b border-slate-200 py-2">
                        <p className="mb-1 text-sm text-slate-500">Items</p>
                        {result.items.length ? result.items.map((item, index) => (
                          <p key={`${item.name}-${index}`} className="text-sm font-semibold text-slate-900">{item.quantity} × {item.name}</p>
                        )) : <p className="text-sm text-slate-700">Not identified</p>}
                      </div>
                      <ResultValue label="Delivery location">{result.deliveryLocation || 'Not identified'}</ResultValue>
                      <ResultValue label="Region">{result.deliveryRegion || 'Not identified'}</ResultValue>
                      <ResultValue label="Total">{result.totalGhs === null ? 'Not identified' : formatGhs(result.totalGhs)}</ResultValue>
                      {result.reviewNotes?.length ? (
                        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                          <p className="font-semibold">Please review before using this order</p>
                          <ul className="mt-1 list-disc pl-5">{result.reviewNotes.map((note) => <li key={note}>{note}</li>)}</ul>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  {result.professionalEnglish ? (
                    <div className="space-y-3">
                      <div><p className="text-xs font-semibold uppercase text-slate-500">Professional English</p><p className="mt-1 text-sm text-slate-900">{result.professionalEnglish}</p></div>
                      <div><p className="text-xs font-semibold uppercase text-slate-500">English caption</p><p className="mt-1 text-sm text-slate-900">{result.professionalCaption}</p></div>
                      <div><p className="text-xs font-semibold uppercase text-slate-500">Ghanaian Pidgin</p><p className="mt-1 text-sm text-slate-900">{result.ghanaianPidgin}</p></div>
                    </div>
                  ) : null}
                  {Object.hasOwn(result, 'totalSalesGhs') ? (
                    <>
                      <ResultValue label="Gross sales">{formatGhs(result.totalSalesGhs)}</ResultValue>
                      <ResultValue label={`DiDwa platform fee (${result.platformFeePercent}%)`}>{formatGhs(result.platformFeesGhs)}</ResultValue>
                      <ResultValue label="Net payable">{formatGhs(result.netPayableGhs)}</ResultValue>
                      <ResultValue label="Paid out">{formatGhs(result.paidOutGhs)}</ResultValue>
                      <ResultValue label="Pending payouts">{formatGhs(result.pendingPayoutGhs)}</ResultValue>
                      <ResultValue label="Available to withdraw">{formatGhs(result.availableGhs)}</ResultValue>
                      <p className="text-xs text-slate-500">Supported wallets: {result.supportedWallets.join(', ')}</p>
                    </>
                  ) : null}
                  {result.request ? (
                    <>
                      <ResultValue label="Request status">{result.request.status}</ResultValue>
                      <ResultValue label="Amount">{formatGhs(result.request.amount_ghs)}</ResultValue>
                      <ResultValue label="Wallet">{result.request.momo_network} · {result.request.momo_number}</ResultValue>
                      <p className="text-sm text-slate-600">{result.message}</p>
                    </>
                  ) : null}
                  {result.type === 'inventory' ? (
                    <>
                      <ResultValue label="Active variants">{result.variantCount}</ResultValue>
                      <ResultValue label="Low-stock variants">{result.lowStockCount}</ResultValue>
                      <ResultValue label="Units in stock">{result.unitsInStock}</ResultValue>
                      <ResultValue label="Estimated stock value">{formatGhs(result.stockValueGhs)}</ResultValue>
                      <div className="pt-2">
                        <p className="mb-2 text-sm font-semibold text-slate-700">Restock priorities</p>
                        {result.lowStockItems.length ? result.lowStockItems.map((item, index) => (
                          <ResultValue key={`${item.productName}-${item.variant}-${index}`} label={`${item.productName} · ${item.variant}`}>
                            {item.quantity} left (restock at {item.reorderLevel})
                          </ResultValue>
                        )) : <p className="text-sm text-slate-600">No active variants are below their reorder levels.</p>}
                      </div>
                    </>
                  ) : null}
                  {result.type === 'sales' ? (
                    <>
                      <ResultValue label="Sales, last 7 days">{formatGhs(result.last7DaysGhs)}</ResultValue>
                      <ResultValue label="Previous 7 days">{formatGhs(result.previous7DaysGhs)}</ResultValue>
                      <ResultValue label="Week-on-week change">{result.changePercent === null ? 'No previous sales to compare' : `${result.changePercent > 0 ? '+' : ''}${result.changePercent}%`}</ResultValue>
                      <ResultValue label="Sales, last 30 days">{formatGhs(result.last30DaysGhs)}</ResultValue>
                      <ResultValue label="Paid orders, last 30 days">{result.paidOrders30Days}</ResultValue>
                      <ResultValue label="Average order value">{formatGhs(result.averageOrderValue30Days)}</ResultValue>
                      <p className="pt-2 text-sm font-semibold text-slate-700">Top products (30 days)</p>
                      {result.topProducts.length ? result.topProducts.map((item) => (
                        <ResultValue key={item.name} label={`${item.name} · ${item.unitsSold} sold`}>{formatGhs(item.revenueGhs)}</ResultValue>
                      )) : <p className="text-sm text-slate-600">No completed sales in the last 30 days.</p>}
                    </>
                  ) : null}
                  {result.type === 'orders' ? (
                    <>
                      <ResultValue label="All orders">{result.totalOrders}</ResultValue>
                      <ResultValue label="Pending over 48 hours">{result.pendingOver48Hours}</ResultValue>
                      <div className="pt-2">
                        <p className="mb-2 text-sm font-semibold text-slate-700">Orders by status</p>
                        {result.byStatus.map((item) => (
                          <ResultValue key={item.status} label={item.status}>{item.count} · {formatGhs(item.totalGhs)}</ResultValue>
                        ))}
                      </div>
                    </>
                  ) : null}
                </section>
              ) : null}
            </div>

            <footer className="border-t border-slate-200 bg-slate-50 p-4">
              <div className="space-y-2 rounded-xl border border-blue-100 bg-white p-3 text-sm text-slate-800">
                <strong className="block">DiDwa Support</strong>
                {supportContact.supportEmail ? (
                  <a className="flex items-center gap-2 text-blue-700" href={`mailto:${supportContact.supportEmail}`}>
                    <Mail size={16} />{supportContact.supportEmail}
                  </a>
                ) : null}
                {supportContact.supportPhone ? (
                  <a className="flex items-center gap-2 text-blue-700" href={`tel:${supportContact.supportPhone}`}>
                    <Phone size={16} />{supportContact.supportPhone}
                  </a>
                ) : null}
                {supportContact.whatsappNumber ? (
                  <a className="flex items-center gap-2 text-blue-700" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">
                    <MessageSquareText size={16} />WhatsApp DiDwa Support
                  </a>
                ) : null}
                {!supportContact.supportEmail && !supportContact.supportPhone && !supportContact.whatsappNumber
                  ? <p className="text-slate-600">{AI_SUPPORT_FALLBACK}</p> : null}
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
