/**
 * components/storefront/templates/FlashExpress/ExpressList.jsx
 * Single-column list rows: thumbnail / desc+price / +,- stepper.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import SafeImage from '../../../SafeImage.jsx';
import GlassCard from '../../templates/shared/GlassCard.jsx';
import { PriceTag, QtyStepper } from '../../templates/shared/fragments.jsx';
import WishlistButton from '../../WishlistButton.jsx';

/**
 * @param {object} props
 * @param {object} props.t Render tokens from useTokens.
 * @param {Array} props.products Display products.
 * @param {Function} props.onNavigate Page navigation callback.
 * @param {object} props.ctx Preview context (cart, onSetQty, onAddToCart).
 */
export default function ExpressList({ t, products, onNavigate, ctx }) {
  const qtyInCart = (p) => ctx.cart.find((l) => String(l.id) === String(p.id))?.quantity || 0;
  return (
    <ul className="space-y-2" aria-label="Express menu">
      {products.map((p) => {
        const qty = qtyInCart(p);
        return (
          <li key={p.id}>
            <GlassCard className="flex items-center gap-2.5 p-2.5" tint="rgba(148,163,184,.14)">
              <button type="button" onClick={() => onNavigate('product', p.id)} className="shrink-0" aria-label={`View ${p.name}`}>
                <SafeImage src={p.img} alt={p.name} loading="lazy" className="h-16 w-16 rounded-lg object-cover" style={{ borderRadius: 'calc(var(--radius) - 4px)' }} />
              </button>
              <button type="button" onClick={() => onNavigate('product', p.id)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-xs font-bold text-white">{p.name}</span>
                {p.description ? <span className="mt-0.5 line-clamp-1 block text-[10px] text-white/75">{p.description}</span> : null}
                <span className="mt-1 block"><PriceTag value={p.price} /></span>
              </button>
              <span className="flex shrink-0 items-center gap-1">
                <WishlistButton product={p} ctx={ctx} className="h-8 w-8" />
                {qty > 0 ? (
                  <QtyStepper
                    small
                    qty={qty}
                    onDec={() => ctx.onSetQty?.({ id: p.id }, qty - 1)}
                    onInc={() => (qty + 1 > (p.stock || 99) ? ctx.onSetQty?.({ id: p.id }, p.stock || 99) : ctx.onSetQty?.({ id: p.id }, qty + 1))}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => ctx.onAddToCart?.(p)}
                    aria-label={`Add ${p.name} to cart`}
                    className="grid h-9 w-9 place-items-center rounded-full text-lg font-extrabold text-white transition hover:brightness-110"
                    style={{ background: 'var(--primary)' }}
                  >
                    +
                  </button>
                )}
              </span>
            </GlassCard>
          </li>
        );
      })}
    </ul>
  );
}
