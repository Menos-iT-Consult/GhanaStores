/**
 * components/storefront/templates/CatalogGrid/DenseProductGrid.jsx
 * Dense 4-column grid: badge tags, star ratings, qty selectors, Add to Cart.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { useState } from 'react';
import SafeImage from '../../../SafeImage.jsx';
import GlassCard from '../../templates/shared/GlassCard.jsx';
import { StockBadge, SkuTag, Stars, PriceTag, QtyStepper } from '../../templates/shared/fragments.jsx';
import WishlistButton from '../../WishlistButton.jsx';

/**
 * @param {object} props
 * @param {object} props.t Render tokens from useTokens.
 * @param {Array} props.products Display products.
 * @param {Function} props.onNavigate Page navigation callback.
 * @param {object} props.ctx Preview context (onAddToCart, onSetQty).
 * @param {number} [props.columns] Grid columns (default 4 desktop).
 */
export default function DenseProductGrid({ t, products, onNavigate, ctx, columns = 4 }) {
  const { compact, narrow } = t;
  const [qtyById, setQtyById] = useState({});
  const cols = compact ? 2 : narrow ? 3 : Math.min(columns, 4);
  const qtyOf = (p) => qtyById[p.id] || 1;
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }} aria-label="Product grid">
      {products.map((p) => (
        <GlassCard
          key={p.id}
          className="flex flex-col transition duration-300 hover:-translate-y-1"
          tint="var(--gs-card-border)"
          style={{
            background: 'var(--bg)',
            color: 'var(--text)',
            boxShadow: 'var(--gs-shadow)',
          }}
        >
          <div className="relative">
            <button type="button" onClick={() => onNavigate('product', p.id)} className="relative block aspect-[4/3] w-full overflow-hidden" aria-label={`View ${p.name}`}>
              <SafeImage src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute left-1.5 top-1.5 flex gap-1"><StockBadge p={p} sale={Number(p.id) % 4 === 0} /></span>
            </button>
            <WishlistButton product={p} ctx={ctx} className="absolute right-2 top-2 h-8 w-8" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5 p-2.5">
            <SkuTag id={p.id} />
            <button type="button" onClick={() => onNavigate('product', p.id)} className="truncate text-left text-xs font-bold text-[var(--text)] hover:underline">
              {p.name}
            </button>
            <Stars p={p} />
            <PriceTag value={p.price} surface />
            <div className="mt-auto flex items-center justify-between gap-1.5 pt-1">
              <QtyStepper
                small
                qty={qtyOf(p)}
                onDec={() => setQtyById((q) => ({ ...q, [p.id]: Math.max(1, qtyOf(p) - 1) }))}
                onInc={() => setQtyById((q) => ({ ...q, [p.id]: Math.min(99, qtyOf(p) + 1) }))}
              />
              <button
                type="button"
                onClick={() => ctx.onAddToCart?.(p, null, qtyOf(p))}
                className="flex-1 rounded-md px-2 py-1.5 text-[11px] font-bold text-white"
                style={{ background: 'var(--primary)', borderRadius: 'calc(var(--radius) - 6px)' }}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
