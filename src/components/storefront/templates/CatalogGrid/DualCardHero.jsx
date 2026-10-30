/**
 * components/storefront/templates/CatalogGrid/DualCardHero.jsx
 * Compact dual-card banner: featured promo (left) + trending deals (right).
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { ChevronRight, Flame } from 'lucide-react';
import SafeImage from '../../../SafeImage.jsx';
import GlassCard from '../../templates/shared/GlassCard.jsx';
import { ghs } from '../../../../api.js';

export default function DualCardHero({ t, onNavigate, ctx, variant }) {
  const { c, compact, narrow } = t;
  const hc = c.home_content || {};
  const defaults = c.theme_defaults || {};
  if (c.features?.enable_hero_banner === false) return null;
  const [promo, ...rest] = ctx.products;
  const image = hc.hero_image_url || defaults.hero_image_url || promo?.img;
  const trending = rest.slice(0, compact ? 2 : 3);
  const stack = compact || narrow;
  return (
    <section data-gs-hero-layout={variant || 'dual'} className={`gs-hero-layout grid gap-3 ${stack ? 'grid-cols-1' : 'grid-cols-5'}`} aria-label="Featured deals">
      <GlassCard className={`relative flex min-h-[180px] flex-col justify-end overflow-hidden p-5 ${stack ? '' : 'col-span-3'}`} tint="color-mix(in srgb, var(--primary) 45%, transparent)">
        {image ? <SafeImage src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-40" /> : null}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, rgba(9,13,22,.92) 30%, rgba(9,13,22,.45))' }} aria-hidden="true" />
        <div className="relative">
          <p className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest" style={{ background: 'var(--accent)', color: '#0F172A' }}>
            <Flame size={10} aria-hidden="true" /> {hc.hero_eyebrow || defaults.hero_eyebrow || 'Featured'}
          </p>
          <h1 className={`${compact ? 'text-lg' : 'text-2xl'} mt-2 font-extrabold text-white`}>{hc.hero_title || defaults.hero_title || promo?.name || c.branding.site_title}</h1>
          <p className="mt-1 max-w-sm text-xs text-white/80">{hc.hero_description || defaults.hero_description || c.branding.tagline || 'Top picks, ready to ship'}</p>
          <div className="mt-3 flex items-center gap-3">
            {promo ? <span className="text-base font-extrabold text-white">{ghs(promo.price)}</span> : null}
            <button type="button" onClick={() => onNavigate('shop')} className="inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-[11px] font-bold text-white" style={{ background: 'var(--primary)', borderRadius: 'calc(var(--radius) - 4px)' }}>
              {hc.hero_button_label || defaults.hero_button_label || 'Shop now'} <ChevronRight size={12} aria-hidden="true" />
            </button>
          </div>
        </div>
      </GlassCard>
      <GlassCard className={`${stack ? '' : 'col-span-2'} p-4`}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-white/75">Trending deals</p>
        <ul className="mt-2 space-y-2">
          {trending.map((p, i) => (
            <li key={p.id}>
              <button type="button" onClick={() => onNavigate('product', p.id)} className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition hover:bg-white/5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-extrabold" style={{ background: 'color-mix(in srgb, var(--accent) 25%, transparent)', color: 'var(--accent)' }}>{i + 1}</span>
                <SafeImage src={p.img} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold text-white">{p.name}</span>
                  <span className="block text-[11px] font-extrabold" style={{ color: 'var(--accent)' }}>{ghs(p.price)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </GlassCard>
    </section>
  );
}
