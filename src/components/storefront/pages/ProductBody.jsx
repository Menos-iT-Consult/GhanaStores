/**
 * components/storefront/pages/ProductBody.jsx
 * The product detail page: gallery, variant picker, quantity stepper, add to
 * cart and the related-products row.
 */
import { useState } from 'react';
import SafeImage from '../../SafeImage.jsx';
import { ghs } from '../../../api.js';
import { IconWhatsApp } from '../../icons.jsx';
import { Check, ChevronRight } from 'lucide-react';
import ProductCard from '../ProductCard.jsx';
import Stars from '../Stars.jsx';
import StepperIcon from '../StepperIcon.jsx';
import TrustStrip from '../TrustStrip.jsx';
import { DEMO_CATALOG } from '../data.js';

/**
 * @param {object} props
 * @param {object} props.t Render tokens from useTokens.
 * @param {Function} props.onNavigate Page navigation callback.
 * @param {object} props.ctx Preview context (product, products, isLive, onAddToCart).
 */
export default function ProductBody({ t, onNavigate, ctx }) {
  const { c, compact, narrow, waDigits, btn } = t;
  const [qty, setQty] = useState(1);
  const [thumb, setThumb] = useState(0);
  const [variantId, setVariantId] = useState(null);
  const pp = c.product_page || {};
  const bullets = pp.feature_bullets || [];
  const p = ctx.product || ctx.products[0] || DEMO_CATALOG[0];
  const stack = compact || narrow;
  const thumbs = ['kente', 'kente-b', 'kente-c'];
  /* Real products carry purchasable variants; demo products do not. */
  const chosen = p.variants.find((v) => v.id === variantId)
    || p.variants.find((v) => v.inStock)
    || null;

  return (
    <section className="p-5" aria-label="Product detail">
      {pp.breadcrumbs && (
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-[10px] font-bold uppercase tracking-wide opacity-60" aria-label="Breadcrumb">
          <button type="button" onClick={() => onNavigate('home')} className="hover:underline">Home</button> <ChevronRight size={10} aria-hidden="true" />
          <button type="button" onClick={() => onNavigate('shop')} className="hover:underline">Shop</button> <ChevronRight size={10} aria-hidden="true" />
          <span>{p.name}</span>
        </nav>
      )}

      <div className={`gap-5 ${stack ? 'grid grid-cols-1' : 'flex'}`}>
        <div className={stack ? '' : 'w-[46%] shrink-0'}>
          <SafeImage src={p.img || `https://picsum.photos/seed/${thumbs[thumb]}/640/480`} alt={p.name} className="w-full rounded-lg object-cover shadow-sm" style={{ borderRadius: 'var(--radius)' }} />
          <div className={`mt-2 flex gap-2 ${ctx.isLive ? 'hidden' : ''}`}>
            {thumbs.map((seed, i) => (
              <button
                key={seed}
                type="button"
                onClick={() => setThumb(i)}
                aria-label={`View image ${i + 1}`}
                aria-pressed={thumb === i}
                className={`h-14 w-14 overflow-hidden rounded-md ring-2 transition ${thumb === i ? '' : 'opacity-60 hover:opacity-100'}`}
                style={{ borderRadius: 'calc(var(--radius) - 6px)', boxShadow: thumb === i ? '0 0 0 2px var(--primary)' : undefined }}
              >
                <img src={`https://picsum.photos/seed/${seed}/120/120`} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {pp.reviews && <Stars />}
          <h1 className={`${compact ? 'text-base' : 'text-xl'} font-extrabold leading-tight`}>{p.name}</h1>
          <p className="text-lg font-extrabold" style={{ color: 'var(--primary)' }}>{ghs(p.price)}</p>
          <p className="text-xs leading-relaxed opacity-75">{p.description || pp.fallback_description || ''}</p>

          {bullets.length ? (
            <ul className="space-y-1 text-xs opacity-75">
              {bullets.map((x) => (
                <li key={x} className="flex items-center gap-1.5"><Check size={12} style={{ color: 'var(--primary)' }} aria-hidden="true" /> {x}</li>
              ))}
            </ul>
          ) : null}

          {p.variants.length > 1 ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a variant">
              {p.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={!v.inStock}
                  onClick={() => setVariantId(v.id)}
                  aria-pressed={chosen?.id === v.id}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-40 ${chosen?.id === v.id ? 'text-white' : ''}`}
                  style={chosen?.id === v.id
                    ? { background: 'var(--primary)', borderColor: 'var(--primary)' }
                    : { borderColor: 'rgba(148,163,184,.5)' }}
                >
                  {v.label} · {ghs(v.price)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {pp.quantity_stepper && (
              <span className="flex items-center rounded-lg border" style={{ borderColor: 'rgba(148,163,184,.5)' }}>
                <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-2 py-1.5"><StepperIcon d="M6 9l6 6 6-6" /></button>
                <span className="min-w-6 text-center text-xs font-extrabold">{qty}</span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(99, q + 1))} className="px-2 py-1.5"><StepperIcon d="M18 15l-6-6-6 6" /></button>
              </span>
            )}
            <button type="button" onClick={() => ctx.onAddToCart?.(p, chosen, qty)} className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 ${btn()}`} style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}>
              Add to Cart
            </button>
            {c.features.enable_whatsapp_buy && (
              <a
                href={waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`${c.features.whatsapp_custom_message} ${p.name}`)}` : undefined}
                target="_blank"
                rel="noreferrer"
                title={waDigits ? 'WhatsApp Quick Buy' : 'Set a WhatsApp number first'}
                className={`flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold ${waDigits ? 'border-emerald-500 text-emerald-600 hover:bg-emerald-50' : 'pointer-events-none border-slate-200 opacity-50'}`}
                style={{ borderRadius: 'var(--radius)' }}
              >
                <IconWhatsApp size={13} /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {pp.related_products && (
        <>
          <h2 className="mb-3 mt-6 text-sm font-extrabold uppercase tracking-wide">You may also like</h2>
          <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {ctx.products.filter((x) => x.id !== p.id).slice(0, compact ? 2 : 4).map((x) => (
              <ProductCard key={x.id} p={x} t={t} onNavigate={onNavigate} ctx={ctx} />
            ))}
          </div>
        </>
      )}
      <TrustStrip t={t} />
    </section>
  );
}