/**
 * components/storefront/templates/BoutiqueEditorial/EditorialHero.jsx
 * Full-height magazine-style full-bleed hero with serif typography and
 * overlay "Explore Collection" button.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { ChevronRight } from 'lucide-react';
import SafeImage from '../../../SafeImage.jsx';

export default function EditorialHero({ t, onNavigate, ctx }) {
  const { c, compact } = t;
  const hc = c.home_content || {};
  if (c.features?.enable_hero_banner === false) return null;
  const first = ctx.products[0];
  return (
    <section className="relative flex items-end justify-center overflow-hidden text-center text-white" style={{ minHeight: compact ? '78vh' : '92vh' }} aria-label="Featured collection">
      {first?.img ? (
        <SafeImage src={first.img} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: 'linear-gradient(140deg, #090D16 0%, #1E293B 55%, var(--primary) 130%)' }} aria-hidden="true" />
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(9,13,22,.88) 0%, rgba(9,13,22,.35) 45%, rgba(9,13,22,.25) 100%)' }} aria-hidden="true" />
      <div className={`relative mx-auto w-full max-w-3xl px-5 ${compact ? 'pb-14 pt-24' : 'pb-20 pt-32'}`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/70">The Collection</p>
        <h1 className={`${compact ? 'text-3xl' : 'text-5xl'} mt-3 font-extrabold leading-[1.05]`} style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {c.branding.site_title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/80">{c.branding.tagline || 'Shop our latest arrivals'}</p>
        <button
          type="button"
          onClick={() => onNavigate('shop')}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/10 px-7 py-3 text-xs font-bold uppercase tracking-[0.25em] text-white backdrop-blur transition hover:bg-white hover:text-slate-900"
        >
          {hc.hero_button_label || 'Explore Collection'} <ChevronRight size={13} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
