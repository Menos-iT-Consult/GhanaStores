/**
 * components/storefront/pages/TrackBody.jsx
 * Customer-facing order tracking.
 */
import { useState } from 'react';
import { api } from '../../../api.js';
import { Package, Search, Truck, CheckCircle2, XCircle } from 'lucide-react';

export default function TrackBody({ t, onNavigate, ctx, orderNumber }) {
  const { compact } = t;
  const fromLocation = (() => {
    if (typeof window === 'undefined') return '';
    const match = window.location.pathname.match(/\/(?:track|tracking|order|orders)\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  })();
  const initial = String(orderNumber || ctx?.orderNumber || ctx?.trackingNumber || fromLocation || '').trim();
  const [number, setNumber] = useState(initial);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  async function lookup(value) {
    const n = String(value ?? number).trim();
    if (!n || !phone.trim()) {
      setError('Enter both your order number and checkout phone number.');
      return;
    }
    setBusy(true);
    setError('');
    setData(null);
    try {
      const query = `?phone=${encodeURIComponent(phone.trim())}`;
      const result = await api.get(`/api/public/orders/${encodeURIComponent(n)}${query}`);
      setData(result);
      setNumber(n);
    } catch (err) {
      setError(err?.message || 'Could not find that order.');
    } finally {
      setBusy(false);
    }
  }

  const order = data?.order || null;
  const items = Array.isArray(data?.items) ? data.items : [];
  const status = String(order?.status || order?.orderStatus || '').toUpperCase();
  const steps = [
    { key: 'PENDING', label: 'Order placed', Icon: Package },
    { key: 'PAID', label: 'Payment confirmed', Icon: CheckCircle2 },
    { key: 'FULFILLED', label: 'Processing', Icon: Truck },
    { key: 'DELIVERED', label: 'Delivered', Icon: CheckCircle2 },
  ];
  const currentIndex = status === 'CANCELLED' ? -1
    : status === 'DELIVERED' ? 3
    : status === 'FULFILLED' ? 2
    : status === 'PAID' ? 1 : 0;

  return (
    <section className="p-5" aria-label="Track your order">
      <h1 className="text-lg font-extrabold">Track Your Order</h1>
      <p className="mt-1 text-[11px] opacity-70">
        Enter your order number and the phone number used at checkout to see its status.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); lookup(); }}
        className={`mt-4 flex flex-col gap-2 ${compact ? '' : 'sm:flex-row sm:items-end'}`}
      >
        <label className="flex-1 text-[10px] font-bold uppercase tracking-wide opacity-60">
          Order number
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="GS-240101-1234"
            aria-label="Order number"
            className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-[11px] outline-none"
            style={{ borderColor: 'rgba(148,163,184,.5)' }}
          />
        </label>
        <label className="flex-1 text-[10px] font-bold uppercase tracking-wide opacity-60">
          Phone used at checkout
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="0244 123 456"
            aria-label="Phone number"
            className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-[11px] outline-none"
            style={{ borderColor: 'rgba(148,163,184,.5)' }}
          />
        </label>
        <button
          type="submit"
          disabled={busy || !number.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition disabled:opacity-40"
          style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}
        >
          <Search size={12} aria-hidden="true" /> {busy ? 'Looking up...' : 'Track'}
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {error}
        </p>
      ) : null}
      {order ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border p-4" style={{ borderColor: 'rgba(148,163,184,.35)', borderRadius: 'var(--radius)' }}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">Order</p>
                <p className="text-sm font-extrabold">{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">Status</p>
                <p className="text-sm font-extrabold" style={{ color: 'var(--primary)' }}>
                  {status === 'CANCELLED' ? 'Cancelled' : (order.orderStatus || status || 'Pending')}
                </p>
              </div>
            </div>
            {order.storeName ? (
              <p className="mt-2 text-[11px] opacity-70">Sold by {order.storeName}</p>
            ) : null}
            {order.totalAmount != null ? (
              <p className="mt-1 text-[11px] font-bold">Total: GHS {Number(order.totalAmount).toFixed(2)}</p>
            ) : null}
          </div>

          {status === 'CANCELLED' ? (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              <XCircle size={14} aria-hidden="true" /> This order was cancelled.
            </div>
          ) : (
            <ol className="space-y-2">
              {steps.map((step, index) => {
                const done = index <= currentIndex;
                const Icon = step.Icon;
                return (
                  <li
                    key={step.key}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
                    style={{
                      borderColor: done ? 'var(--primary)' : 'rgba(148,163,184,.35)',
                      opacity: done ? 1 : 0.55,
                    }}
                  >
                    <Icon size={14} style={{ color: done ? 'var(--primary)' : 'rgba(148,163,184,.8)' }} aria-hidden="true" />
                    {step.label}
                    {step.key === 'PAID' && order.paymentStatus ? (
                      <span className="ml-auto text-[10px] opacity-60">{order.paymentStatus}</span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}

          {items.length ? (
            <div className="rounded-lg border p-4" style={{ borderColor: 'rgba(148,163,184,.35)', borderRadius: 'var(--radius)' }}>
              <p className="mb-2 text-xs font-extrabold">Items</p>
              <ul className="space-y-1.5">
                {items.map((item, index) => (
                  <li key={index} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="min-w-0 truncate">
                      {item.name || 'Item'}
                      {item.variant ? <span className="opacity-60"> - {item.variant}</span> : null}
                      <span className="opacity-60"> x{item.quantity}</span>
                    </span>
                    {item.lineTotal != null ? (
                      <span className="shrink-0 font-bold">GHS {Number(item.lineTotal).toFixed(2)}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => onNavigate?.('shop')}
            className="block w-full text-center text-[10px] font-bold underline opacity-70 hover:opacity-100"
          >
            Continue shopping
          </button>
        </div>
      ) : null}
    </section>
  );
}