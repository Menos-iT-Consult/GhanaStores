/**
 * components/storefront/ProductCard.jsx
 * The catalog tile used by the home grid, the shop grid and related products.
 */
import SafeImage from '../SafeImage.jsx';
import { ghs } from '../../api.js';
import { IconWhatsApp } from '../icons.jsx';

/**
 * @param {object} props
 * @param {object} props.p A display product from toDisplayProduct.
 * @param {object} props.t Render tokens from useTokens.
 * @param {Function} props.onNavigate Page navigation callback.
 * @param {object} props.ctx Preview context (onAddToCart).
 */
export default function ProductCard({ p, t, onNavigate, ctx }) {
  const { c, waDigits, btn } = t;
  const open = () => onNavigate('product', p.id);
  return (
    <article
      className="group overflow-hidden border border-slate-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ borderRadius: 'var(--radius)', background: 'var(--surface)' }}
    >
      <button type="button" onClick={open} className="relative block aspect-[4/3] w-full overflow-hidden">
        <SafeImage src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {c.features.enable_stock_counter && p.stock <= 5 && (
          <span className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide shadow-sm" style={{ background: 'var(--accent)', color: '#0F172A' }}>
            Only {p.stock} left
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 translate-y-full bg-black/55 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-white transition-transform duration-300 group-hover:translate-y-0">
          Quick view
        </span>
      </button>
      <div className="space-y-1.5 p-3">
        <h3 className="truncate text-sm font-bold">{p.name}</h3>
        <p className="inline-block rounded-md px-2 py-0.5 text-sm font-extrabold" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>
          {ghs(p.price)}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => (ctx?.onAddToCart ? ctx.onAddToCart(p) : open())}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 ${btn()}`}
            style={{ background: 'var(--primary)', borderRadius: 'calc(var(--radius) - 4px)' }}
          >
            Buy Now
          </button>
          {c.features.enable_whatsapp_buy && (
            <a
              href={waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`${c.features.whatsapp_custom_message} ${p.name}`)}` : undefined}
              target="_blank"
              rel="noreferrer"
              title={waDigits ? 'WhatsApp Quick Buy' : 'Set a WhatsApp number first'}
              className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold ${waDigits ? 'border-emerald-500 text-emerald-600 hover:bg-emerald-50' : 'pointer-events-none border-slate-200 text-slate-300'}`}
              style={{ borderRadius: 'calc(var(--radius) - 4px)' }}
            >
              <IconWhatsApp size={12} /> Quick Buy
            </a>
          )}
        </div>
      </div>
    </article>
  );
}