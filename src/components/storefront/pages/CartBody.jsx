/**
 * components/storefront/pages/CartBody.jsx
 * The cart page: line items with quantity steppers, the order summary, and -
 * on a live store - the checkout form for the owner's configured payment rail.
 */
import { useState } from 'react';
import SafeImage from '../../SafeImage.jsx';
import { ghs } from '../../../api.js';
import { Trash2 } from 'lucide-react';
import StepperIcon from '../StepperIcon.jsx';
import { CART_ITEMS, PAYMENT_LABELS } from '../data.js';

/**
 * @param {object} props
 * @param {object} props.t Render tokens from useTokens.
 * @param {Function} props.onNavigate Page navigation callback.
 * @param {object} props.ctx Preview context (cart, isLive, onSetQty, onRemove, checkout).
 */
export default function CartBody({ t, onNavigate, ctx }) {
  const { compact } = t;
  const cc = t.c.cart_content || {};
  const [promo, setPromo] = useState('');
  /* Live shop: the lines and every mutation live in the storefront page. The
     customizer preview keeps its own self-contained quantities. */
  const [demoQtys, setDemoQtys] = useState(CART_ITEMS.map(() => 1));
  const items = ctx.isLive
    ? ctx.cart
    : CART_ITEMS.map((i, idx) => ({ ...i, quantity: demoQtys[idx] }));
  const subtotal = items.reduce((s, i) => s + Number(i.price) * Number(i.quantity || 0), 0);
  const setQty = (line, next) => (ctx.isLive
    ? ctx.onSetQty?.(line, next)
    : setDemoQtys((q) => q.map((v, i) => (i === items.indexOf(line) ? Math.max(1, next) : v))));

  return (
    <section className="p-5" aria-label="Shopping cart">
      <h1 className="mb-4 text-lg font-extrabold">{cc.heading || 'Your Cart'}</h1>
      {ctx.isLive && !items.length ? (
        <div className="rounded-lg border border-dashed p-8 text-center" style={{ borderColor: 'rgba(148,163,184,.4)' }}>
          <p className="text-xs font-semibold opacity-75">{cc.empty_body || 'Your cart is empty.'}</p>
          <button type="button" onClick={() => onNavigate('shop')} className="mt-3 rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}>
            Browse the collection
          </button>
        </div>
      ) : (
      <div className={`gap-5 ${compact ? 'grid grid-cols-1' : 'flex'}`}>
        <ul className="min-w-0 flex-1 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 border-b pb-3" style={{ borderColor: 'rgba(148,163,184,.25)' }}>
              <SafeImage src={item.img} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold">{item.name}</span>
                {item.label ? <span className="block text-[10px] font-semibold opacity-60">{item.label}</span> : null}
                <span className="block text-[11px] font-semibold" style={{ color: 'var(--primary)' }}>{ghs(item.price)}</span>
              </span>
              <span className="flex items-center rounded-md border" style={{ borderColor: 'rgba(148,163,184,.5)' }}>
                <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => setQty(item, Number(item.quantity) - 1)} className="px-1.5 py-1"><StepperIcon d="M6 9l6 6 6-6" /></button>
                <span className="min-w-5 text-center text-[11px] font-extrabold">{item.quantity}</span>
                <button type="button" aria-label={`Increase ${item.name}`} onClick={() => setQty(item, Number(item.quantity) + 1)} className="px-1.5 py-1"><StepperIcon d="M18 15l-6-6-6 6" /></button>
              </span>
              <button type="button" aria-label={`Remove ${item.name}`} onClick={() => ctx.onRemove?.(item)} className="opacity-50 transition hover:opacity-100"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>

        <aside className={`${compact ? '' : 'w-56 shrink-0'} self-start rounded-lg border p-4`} style={{ borderRadius: 'var(--radius)', background: 'var(--surface)', borderColor: 'rgba(148,163,184,.35)' }}>
          <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wide">Order Summary</h2>
          <dl className="space-y-1 text-[11px] font-semibold">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{ghs(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd className="font-bold text-emerald-600">Free</dd></div>
            <div className="flex justify-between border-t pt-1 text-sm font-extrabold" style={{ borderColor: 'rgba(148,163,184,.35)' }}><dt>Total</dt><dd>{ghs(subtotal)}</dd></div>
          </dl>
          {ctx.checkout ? (
            /* Cash on delivery: the real order the storefront posts to the API. */
            <form className="mt-3 space-y-1.5" onSubmit={ctx.checkout.onSubmit}>
              {/* The payment method the shop owner selected. Shown as a fixed
                  summary, not a picker: the customer pays however the owner
                  configured the store, so the cart can never offer a rail the
                  merchant has not set up. */}
              <div className="flex items-center justify-between gap-2 rounded-md border bg-slate-50 px-2 py-1.5" style={{ borderColor: 'rgba(148,163,184,.5)' }}>
                <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">Payment</span>
                <span className="text-[11px] font-extrabold" style={{ color: 'var(--primary)' }}>
                  {PAYMENT_LABELS[ctx.checkout.method] || 'Cash on Delivery'}
                </span>
              </div>
              <input required value={ctx.checkout.customer.name} onChange={(e) => ctx.checkout.setCustomer({ ...ctx.checkout.customer, name: e.target.value })} placeholder="Full name" aria-label="Full name" className="w-full rounded-md border bg-white px-2 py-1.5 text-[11px] outline-none" style={{ borderColor: 'rgba(148,163,184,.5)' }} />
              <input required value={ctx.checkout.customer.phone} onChange={(e) => ctx.checkout.setCustomer({ ...ctx.checkout.customer, phone: e.target.value })} placeholder="Phone number" aria-label="Phone number" className="w-full rounded-md border bg-white px-2 py-1.5 text-[11px] outline-none" style={{ borderColor: 'rgba(148,163,184,.5)' }} />
              {/* Card gateways require an email, so ask for one whenever the
                  store takes card payment. Optional for COD, where nobody
                  charges an address. */}
              {ctx.checkout.method === 'PAYSTACK' ? (
                <input required type="email" value={ctx.checkout.customer.email || ''} onChange={(e) => ctx.checkout.setCustomer({ ...ctx.checkout.customer, email: e.target.value })} placeholder="Email address" aria-label="Email address" className="w-full rounded-md border bg-white px-2 py-1.5 text-[11px] outline-none" style={{ borderColor: 'rgba(148,163,184,.5)' }} />
              ) : null}
              <textarea required value={ctx.checkout.customer.address} onChange={(e) => ctx.checkout.setCustomer({ ...ctx.checkout.customer, address: e.target.value })} placeholder="Delivery address" aria-label="Delivery address" rows={2} className="w-full rounded-md border bg-white px-2 py-1.5 text-[11px] outline-none" style={{ borderColor: 'rgba(148,163,184,.5)' }} />
              <button type="submit" disabled={ctx.checkout.busy || !items.length} className={`w-full rounded-lg px-3 py-2 text-xs font-bold text-white transition disabled:opacity-40 ${t.btn()}`} style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}>
                {ctx.checkout.busy ? 'Placing order...' : `Pay with ${PAYMENT_LABELS[ctx.checkout.method] || 'Cash on Delivery'}`}
              </button>
              {ctx.checkout.message ? (
                <p className="text-[10px] font-semibold leading-snug" style={{ color: ctx.checkout.error ? '#B91C1C' : 'var(--primary)' }}>
                  {ctx.checkout.message}
                </p>
              ) : null}
            </form>
          ) : (
            <>
              <div className="mt-3 flex overflow-hidden rounded-lg ring-1 ring-black/10">
                <input type="text" value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Promo code" aria-label="Promo code" className="w-full bg-white px-2 py-1.5 text-[11px] outline-none" />
                <span className="grid shrink-0 place-items-center px-2.5 text-[10px] font-extrabold uppercase tracking-wide text-white" style={{ background: 'var(--primary)' }}>Apply</span>
              </div>
              <button type="button" className={`mt-2.5 w-full rounded-lg px-3 py-2 text-xs font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 ${t.btn()}`} style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}>
                Checkout with MoMo
              </button>
            </>
          )}
          <button type="button" onClick={() => onNavigate('shop')} className="mt-2 block w-full text-center text-[10px] font-bold underline opacity-70 hover:opacity-100">{cc.continue_label || 'Continue shopping'}</button>
        </aside>
      </div>
      )}
    </section>
  );
}