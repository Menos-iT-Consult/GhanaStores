/**
 * components/storefront/templates/FlashExpress/StickyCheckoutBar.jsx
 * Floating bottom bar: total count + price + 1-tap Checkout Now.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { ArrowRight } from 'lucide-react';
import { ghs } from '../../../../api.js';

export default function StickyCheckoutBar({ ctx, onNavigate }) {
  const count = ctx.cart.reduce((s, l) => s + Number(l.quantity || 0), 0);
  if (!count) return null;
  const total = ctx.cart.reduce((s, l) => s + Number(l.price) * Number(l.quantity || 0), 0);
  return (
    <div className="sticky bottom-0 z-20 px-3 pb-3 pt-1" style={{ background: 'linear-gradient(to top, rgba(9,13,22,.95), transparent)' }}>
      <button
        type="button"
        onClick={() => onNavigate('cart')}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-white shadow-xl transition hover:brightness-110"
        style={{ background: 'var(--primary)', borderRadius: 'var(--radius)', boxShadow: '0 16px 40px -12px color-mix(in srgb, var(--primary) 70%, transparent)' }}
        aria-label={`Checkout now, ${count} items, ${ghs(total)}`}
      >
        <span className="grid h-7 min-w-7 place-items-center rounded-full bg-white/20 px-1.5 text-xs font-extrabold">{count}</span>
        <span className="flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-white/70">Total</span>
          <span className="block text-base font-extrabold leading-tight">{ghs(total)}</span>
        </span>
        <span className="flex items-center gap-1 text-xs font-extrabold uppercase tracking-widest">
          Checkout Now <ArrowRight size={14} aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}
