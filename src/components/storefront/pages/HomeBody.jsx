/**
 * components/storefront/pages/HomeBody.jsx
 * The storefront landing page: the gradient hero, the featured-product grid and
 * the trust strip.
 */
import { ChevronRight } from 'lucide-react';
import ProductCard from '../ProductCard.jsx';
import TrustStrip from '../TrustStrip.jsx';

/**
 * @param {object} props
 * @param {object} props.t Render tokens from useTokens.
 * @param {Function} props.onNavigate Page navigation callback.
 * @param {object} props.ctx Preview context (products).
 */
export default function HomeBody({ t, onNavigate, ctx }) {
  const { c, compact, gridColumns } = t;
  const hc = c.home_content || {};
  return (
    <>
      {c.features.enable_hero_banner && (
        <section className={`relative overflow-hidden text-center ${compact ? 'px-4 py-7' : 'px-6 py-10'}`} style={{ background: 'linear-gradient(125deg, var(--primary) 0%, var(--accent) 165%)', color: '#fff' }}>
          <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-black/10 blur-2xl" aria-hidden="true" />
          <h1 className={`relative ${compact ? 'text-lg' : 'text-xl sm:text-2xl'} font-extrabold`} style={{ fontWeight: c.typography.heading_weight }}>
            {c.branding.site_title}
          </h1>
          <p className="relative mx-auto mt-1.5 max-w-md text-sm opacity-90">{c.branding.tagline || 'Shop our latest arrivals'}</p>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className={`relative mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 ${t.btn()}`}
            style={{ background: 'rgba(255,255,255,.16)', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,.45)' }}
          >
            {hc.hero_button_label || 'Shop Now'} <ChevronRight size={12} aria-hidden="true" />
          </button>
        </section>
      )}
      <section className="p-5" aria-label="Featured products">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-base font-extrabold">{hc.featured_heading || 'Featured products'}</h2>
          <button type="button" onClick={() => onNavigate('shop')} className="text-[11px] font-bold underline opacity-70 hover:opacity-100">{hc.view_all_label || 'View all'}</button>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0,1fr))` }}>
          {ctx.products.slice(0, gridColumns * 2).map((p) => (
            <ProductCard key={p.id} p={p} t={t} onNavigate={onNavigate} ctx={ctx} />
          ))}
        </div>
      </section>
      <TrustStrip t={t} />
    </>
  );
}