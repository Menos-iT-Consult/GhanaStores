/**
 * components/storefront/templates/shared/fragments.jsx
 * Shared template fragments: stock badge, star rating, qty stepper,
 * price tag, SKU tag. Consumed by all 3 templates; token-aware via
 * CSS vars (--primary / --accent / --radius).
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { Star } from 'lucide-react';
import { IconPlus, IconMinus } from '../../../icons.jsx';
import { ghs } from '../../../../api.js';

/** Stock / sale badge. */
export function StockBadge({ p, sale = false }) {
  if (sale) {
    return (
      <span className="rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide" style={{ background: 'var(--accent)', color: '#0F172A' }}>
        Sale
      </span>
    );
  }
  const low = Number(p.stock ?? 0) <= 5;
  return (
    <span
      className="rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide"
      style={low
        ? { background: 'rgba(245,158,11,.18)', color: '#FBBF24', border: '1px solid rgba(245,158,11,.4)' }
        : { background: 'rgba(16,185,129,.15)', color: '#34D399', border: '1px solid rgba(16,185,129,.4)' }}
    >
      {low ? `Only ${p.stock} left` : 'In Stock'}
    </span>
  );
}

/** SKU tag. */
export function SkuTag({ id }) {
  return (
    <span className="rounded px-1.5 py-0.5 font-mono text-[9px] opacity-60 ring-1 ring-current">
      SKU-{String(id).slice(0, 8).toUpperCase()}
    </span>
  );
}

/** Star rating (deterministic demo rating from product id). */
export function Stars({ p }) {
  const n = 4 + (Number(String(p.id).charCodeAt(0) || 0) % 2);
  return (
    <span className="flex items-center gap-0.5" aria-label={`Rated ${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={11} aria-hidden="true" fill={i <= n ? 'var(--accent)' : 'none'} style={{ color: i <= n ? 'var(--accent)' : 'rgba(148,163,184,.5)' }} />
      ))}
    </span>
  );
}

/** Price tag. */
export function PriceTag({ value, large = false }) {
  return (
    <span className={large ? 'text-lg font-extrabold' : 'text-sm font-extrabold'} style={{ color: 'var(--accent)' }}>
      {ghs(value)}
    </span>
  );
}

/**
 * Quantity stepper. Calls onSetQty(lineId, qty).
 * @param {object} props
 */
export function QtyStepper({ qty, onDec, onInc, small = false }) {
  const btn = `${small ? 'h-7 w-7' : 'h-8 w-8'} grid place-items-center rounded-md border transition hover:bg-white/10`;
  return (
    <span className="inline-flex items-center gap-1.5" style={{ borderColor: 'rgba(148,163,184,.3)' }}>
      <button type="button" onClick={onDec} aria-label="Decrease quantity" className={btn}>
        <IconMinus size={13} />
      </button>
      <span className="min-w-6 text-center text-sm font-extrabold">{qty}</span>
      <button type="button" onClick={onInc} aria-label="Increase quantity" className={btn}>
        <IconPlus size={13} />
      </button>
    </span>
  );
}
