/**
 * components/storefront/templates/BoutiqueEditorial/EditorialHero.jsx
 * Full-height magazine-style full-bleed hero with serif typography and
 * overlay "Explore Collection" button.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { ChevronRight } from 'lucide-react';
import SafeImage from '../../../SafeImage.jsx';

export default function EditorialHero({ t, onNavigate, ctx, variant = null }) {
  const { c, compact } = t;
  const hc = c.home_content || {};
  if (c.features?.enable_hero_banner === false) return null;
  const first = ctx.products[0];
  const defaults = c.theme_defaults || {};
  const image = hc.hero_image_url || defaults.hero_image_url || first?.img;
  const title = hc.hero_title || defaults.hero_title || c.branding.site_title;
  const description = hc.hero_description || defaults.hero_description || c.branding.tagline || 'Shop our latest arrivals';
  const split = variant === 'split' || variant === 'split_reverse';
  const variantHeight = {
    split: compact ? '22rem' : '30rem',
    split_reverse: compact ? '22rem' : '30rem',
    full_bleed: compact ? '28rem' : 'min(82vh, 42rem)',
    centered: compact ? '16rem' : '18rem',
    editorial: compact ? '20rem' : '24rem',
    framed: compact ? '18rem' : '20rem',
    typographic: compact ? '20rem' : '25rem',
    dark: compact ? '19rem' : '23rem',
    story: compact ? '20rem' : '24rem',
  }[variant];
  const variantAlignment = {
    split: 'items-center justify-start text-left',
    split_reverse: 'items-center justify-end text-right',
    centered: 'items-center justify-center text-center',
    editorial: 'items-end justify-start text-left',
    framed: 'items-center justify-center text-center',
    typographic: 'items-center justify-start text-left',
    dark: 'items-end justify-start text-left',
    story: 'items-end justify-start text-left',
  }[variant] || 'items-end justify-center text-center';
  return (
    <section
      data-gs-hero-layout={variant || 'campaign'}
      className={`gs-hero-layout relative isolate overflow-hidden ${split ? 'grid' : 'flex'} ${variant ? variantAlignment : 'items-end justify-center text-center'}`}
      style={{ minHeight: variantHeight || (compact ? '78vh' : '92vh') }}
      aria-label="Featured collection"
    >
      <div
        data-gs-hero-media=""
        className={split ? 'relative min-h-64 overflow-hidden' : 'absolute inset-0'}
        aria-hidden="true"
      >
        {image ? (
          <SafeImage src={image} alt="" aria-hidden="true" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: 'linear-gradient(140deg, #090D16 0%, #1E293B 55%, var(--primary) 130%)' }} />
        )}
      </div>
      {!split && <div data-gs-hero-overlay="" className="absolute inset-0" aria-hidden="true" />}
      <div data-gs-hero-copy="" className={`relative z-10 mx-auto w-full max-w-3xl px-5 ${compact ? 'pb-14 pt-24' : 'pb-20 pt-32'}`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/70">{hc.hero_eyebrow || defaults.hero_eyebrow || 'The Collection'}</p>
        <h1 className={`${compact ? 'text-3xl' : 'text-5xl'} mt-3 font-extrabold leading-[1.05]`} style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/80">{description}</p>
        <button
          type="button"
          onClick={() => onNavigate('shop')}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/10 px-7 py-3 text-xs font-bold uppercase tracking-[0.25em] text-white backdrop-blur transition hover:bg-white hover:text-slate-900"
        >
          {hc.hero_button_label || defaults.hero_button_label || 'Explore Collection'} <ChevronRight size={13} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
