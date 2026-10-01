/**
 * theme/preview.jsx
 * A faithful, dependency-free renderer for a theme TEMPLATE config.
 *
 * The theme market used to draw generic grey skeletons over the palette, so a
 * template whose whole identity is its hero headline, font and section order
 * was indistinguishable from every other template in its palette. This renders
 * the template's actual `sections` list, in its actual `order`, using its real
 * typography, border radius, grid columns and card style.
 *
 * Both the grid thumbnail and the full-page modal render THIS SAME component -
 * the thumbnail only scales the identical DOM down. That is deliberate: a
 * thumbnail that is a simplified re-drawing drifts from the real theme, which
 * is the exact bug this replaced.
 *
 * No iframes and no network: 100+ templates must be affordable to show at once.
 *
 * STRICT RULE: pure SVG / Lucide icons only, ZERO emojis.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Star, Wallet } from 'lucide-react';

/** Natural width the preview is authored at; the thumbnail scales from this. */
const CANVAS_W = 1200;

/* Deterministic sample stock so every template previews with a full grid and no
   network requests. Tints are derived from the template palette. */
const SAMPLES = [
  { name: 'Kente Cloth Scarf', price: 180, rating: 4.8, reviews: 64, badge: 'Bestseller' },
  { name: 'Ankara Print Dress', price: 250, rating: 4.6, reviews: 41, badge: 'New arrival' },
  { name: 'Leather Sandals', price: 150, rating: 4.9, reviews: 88, badge: 'Hot deal' },
  { name: 'Krobo Bead Necklace', price: 80, rating: 4.5, reviews: 27, badge: 'Low stock' },
  { name: 'Bolga Basket Bag', price: 120, rating: 4.7, reviews: 52, badge: '' },
  { name: 'Batakari Smock', price: 320, rating: 4.4, reviews: 19, badge: '' },
  { name: 'Adinkra Wall Art', price: 210, rating: 4.9, reviews: 73, badge: 'Bestseller' },
  { name: 'Adinkra Printed Shirt', price: 195, rating: 4.6, reviews: 35, badge: '' },
];

const CATEGORIES = [
  'Kente & Weaves', 'Ankara', 'Footwear', 'Accessories', 'Home Decor', 'Kids', 'Menswear', 'Womenswear',
];

/** Palette with a hard fallback, so a half-populated template still renders. */
function paletteOf(config) {
  const p = config?.palette || {};
  return {
    primary: p.primary || '#0B6E4F',
    secondary: p.secondary || p.primary || '#0B6E4F',
    accent: p.accent || '#F59E0B',
    background: p.background || '#FFFFFF',
    text: p.textPrimary || '#0F172A',
    textSoft: p.textSecondary || '#64748B',
    isDark: p.isDark ?? p.background !== '#FFFFFF',
  };
}

/** The template's real font stacks, falling back to the seeded defaults. */
function fontsOf(config) {
  const t = config?.typography || {};
  return {
    heading: t.headingFont || 'Poppins, system-ui, sans-serif',
    body: t.bodyFont || 'Inter, system-ui, sans-serif',
    scale: t.headingScale || 1.25,
  };
}

const cedi = (n) => `₵${Number(n).toLocaleString('en-GH')}`;

/** Deterministic tint for a product image placeholder. */
function tintFor(i, pal) {
  const tints = [pal.primary, pal.accent, pal.secondary, pal.textSoft];
  return `${tints[i % tints.length]}1F`;
}


/** Announcement strip + masthead, driven by the template's own tokens. */
function PreviewHeader({ config, pal, fonts, radius }) {
  const conv = config?.conversion || {};
  const ticker = conv.urgencyTicker;
  return (
    <>
      {ticker && (
        <div
          className="flex items-center justify-center px-6 py-2 text-[13px] font-semibold"
          style={{ background: pal.primary, color: '#fff' }}
        >
          {conv.freeShippingThresholdGHS
            ? `${ticker} · Free delivery on orders over ${cedi(conv.freeShippingThresholdGHS)}`
            : ticker}
        </div>
      )}
      <header
        className="flex items-center justify-between gap-6 px-8 py-5"
        style={{ background: pal.background, borderBottom: `1px solid ${pal.text}14` }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center font-black text-white"
            style={{ background: pal.primary, borderRadius: radius, fontFamily: fonts.heading }}
          >
            D
          </span>
          <span className="text-lg font-extrabold" style={{ color: pal.text, fontFamily: fonts.heading }}>
            {config?.seo?.defaultTitle?.split('—')[0]?.trim() || 'Storefront'}
          </span>
        </div>
        <nav className="flex items-center gap-7 text-sm font-semibold" style={{ color: pal.textSoft }}>
          {CATEGORIES.slice(0, 4).map((c) => <span key={c}>{c}</span>)}
        </nav>
        <div className="flex items-center gap-4" style={{ color: pal.textSoft }}>
          <Search size={17} />
          <span className="text-sm font-semibold">Cart (0)</span>
        </div>
      </header>
    </>
  );
}

/** The template's real hero: headline, subcopy, CTA and palette gradient. */
function PreviewHero({ config, pal, fonts, radius }) {
  const hero = config?.hero || {};
  if (hero.enabled === false) return null;
  return (
    <section
      className="flex min-h-[300px] flex-col items-center justify-center gap-4 px-12 py-16 text-center"
      style={{ background: hero.bgGradient || pal.background }}
    >
      <h1
        className="max-w-2xl font-extrabold leading-[1.15]"
        style={{ color: pal.text, fontFamily: fonts.heading, fontSize: `calc(2.4rem * ${fonts.scale})` }}
      >
        {hero.title || 'Welcome to our store'}
      </h1>
      <p className="max-w-xl text-base" style={{ color: pal.textSoft }}>
        {hero.subtitle || 'Shop our curated collection.'}
      </p>
      {hero.callToAction && (
        <span
          className="mt-1 px-7 py-3 text-sm font-bold text-white"
          style={{ background: pal.primary, borderRadius: radius, boxShadow: `0 8px 20px ${pal.primary}33` }}
        >
          {hero.callToAction}
        </span>
      )}
    </section>
  );
}

/** Category strip - column count comes from the template's own layout. */
function PreviewCategories({ config, pal, fonts, radius, section }) {
  const cols = Math.min(section?.columns || config?.layout?.gridColumns || 4, 8);
  return (
    <section className="px-8 py-10" style={{ background: pal.background }}>
      <h2 className="mb-5 text-xl font-extrabold" style={{ color: pal.text, fontFamily: fonts.heading }}>
        Shop by category
      </h2>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {CATEGORIES.slice(0, cols).map((c, i) => (
          <div
            key={c}
            className="flex flex-col items-center justify-center gap-2 py-8"
            style={{ background: tintFor(i, pal), border: `1px solid ${pal.text}12`, borderRadius: radius }}
          >
            <span className="h-7 w-7 rounded-full" style={{ background: pal.accent, opacity: 0.75 }} />
            <span className="text-xs font-bold" style={{ color: pal.text }}>{c}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** One product card - honours the template's cardStyle (bordered/compact/minimal). */
function PreviewCard({ item, index, config, pal, fonts, radius }) {
  const style = config?.layout?.cardStyle || 'bordered';
  const showImages = config?.layout?.showProductImages !== false;
  const showBadge = config?.layout?.showDiscountBadge !== false && !!item.badge;
  const bordered = style === 'bordered';
  return (
    <div
      className="overflow-hidden"
      style={{
        background: bordered ? pal.background : 'transparent',
        border: bordered ? `1px solid ${pal.text}14` : 'none',
        borderRadius: radius,
        boxShadow: style === 'minimal' ? `0 6px 18px ${pal.text}0F` : 'none',
      }}
    >
      {showImages && (
        <div className="relative flex h-28 items-center justify-center" style={{ background: tintFor(index, pal) }}>
          {showBadge && (
            <span
              className="absolute left-2 top-2 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white"
              style={{ background: pal.accent, borderRadius: radius }}
            >
              {item.badge}
            </span>
          )}
        </div>
      )}
      <div className={style === 'compact' ? 'p-2' : 'p-3.5'}>
        <p className="truncate text-sm font-bold" style={{ color: pal.text }}>{item.name}</p>
        <p className="mt-1 text-base font-extrabold" style={{ color: pal.primary, fontFamily: fonts.heading }}>
          {cedi(item.price)}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold" style={{ color: pal.textSoft }}>
          <Star size={11} className="fill-amber-400 text-amber-400" /> {item.rating} ({item.reviews})
        </p>
      </div>
    </div>
  );
}

/** Product grid - the section the grid-columns and card-style tokens shape. */
function PreviewProducts({ config, pal, fonts, radius, section }) {
  const cols = Math.min(section?.columns || config?.layout?.gridColumns || 4, 4);
  const gap = config?.layout?.gridGap || '1rem';
  return (
    <section className="px-8 py-10" style={{ background: pal.background }}>
      <h2 className="mb-5 text-xl font-extrabold" style={{ color: pal.text, fontFamily: fonts.heading }}>
        Featured products
      </h2>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap }}>
        {SAMPLES.slice(0, cols * 2).map((item, i) => (
          <PreviewCard key={item.name} item={item} index={i} config={config} pal={pal} fonts={fonts} radius={radius} />
        ))}
      </div>
    </section>
  );
}

/** Ratings strip - the template's social-proof section. */
function PreviewSocialProof({ pal, fonts }) {
  return (
    <section className="px-8 py-10 text-center" style={{ background: `${pal.primary}0D` }}>
      <p className="text-sm font-bold" style={{ color: pal.text, fontFamily: fonts.heading }}>
        Rated 4.8 out of 5 by 2,400+ Ghanaian shoppers
      </p>
      <div className="mt-3 flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} size={16} className="fill-amber-400 text-amber-400" />
        ))}
      </div>
    </section>
  );
}

/** Closing CTA banner - carries the template's free-shipping promise. */
function PreviewCta({ config, pal, fonts, radius, section }) {
  return (
    <section className="flex flex-col items-center gap-3 px-8 py-12 text-center" style={{ background: pal.primary }}>
      <p className="text-xl font-extrabold" style={{ color: '#fff', fontFamily: fonts.heading }}>
        {section?.text || 'Shop the collection today'}
      </p>
      <span className="px-6 py-2.5 text-sm font-bold" style={{ background: '#fff', color: pal.primary, borderRadius: radius }}>
        {config?.hero?.callToAction || 'Shop Now'}
      </span>
    </section>
  );
}

/** Footer carrying the template's payment badges. */
function PreviewFooter({ config, pal, fonts, radius }) {
  const badges = config?.paymentBadges || [];
  return (
    <footer className="px-8 py-10" style={{ background: pal.background, borderTop: `1px solid ${pal.text}14` }}>
      <div className="grid grid-cols-3 gap-6">
        {['Shop', 'Help', 'Company'].map((heading) => (
          <div key={heading}>
            <p className="mb-2 text-sm font-extrabold" style={{ color: pal.text, fontFamily: fonts.heading }}>
              {heading}
            </p>
            <div className="space-y-1.5">
              {['Contact us', 'Shipping', 'Returns'].map((l) => (
                <p key={l} className="text-xs" style={{ color: pal.textSoft }}>{l}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
      {badges.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-2">
          {badges.map((b) => (
            <span
              key={b}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: `${pal.text}0A`, color: pal.textSoft, borderRadius: radius }}
            >
              <Wallet size={12} /> {b}
            </span>
          ))}
        </div>
      )}
      <p className="mt-6 text-[11px]" style={{ color: pal.textSoft }}>
        {config?.seo?.defaultTitle || 'Your store'} — powered by DiDwa
      </p>
    </footer>
  );
}

/** Maps a section key to its renderer. Unknown keys render nothing. */
const SECTION_RENDERERS = {
  hero: PreviewHero,
  urgency: () => null, // folded into the announcement strip
  categories: PreviewCategories,
  'products-grid': PreviewProducts,
  'social-proof': PreviewSocialProof,
  'cta-banner': PreviewCta,
  footer: PreviewFooter,
};

/**
 * The theme's sections in the template's own order.
 *
 * The order is read from `config.sections`, NOT hardcoded here: a template that
 * ships its grid before its hero previews that way, which is the whole point of
 * previewing the real thing. Sections with no renderer, and disabled sections,
 * are dropped.
 */
export function orderedSections(config) {
  const list = Array.isArray(config?.sections) ? config.sections : [];
  if (list.length === 0) return Object.keys(SECTION_RENDERERS);
  return [...list]
    .filter((s) => s && s.enabled !== false && SECTION_RENDERERS[s.key])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s) => s.key);
}

/**
 * Render a theme template faithfully at full size. This is the single source of
 * preview markup; ThemeThumb renders this same component scaled down.
 */
export function ThemePreview({ config, className = '' }) {
  const pal = paletteOf(config);
  const fonts = fontsOf(config);
  const radius = config?.borderRadius?.base || config?.layout?.productCardRounded || '0.5rem';
  const keys = orderedSections(config);

  return (
    <div
      className={`w-full overflow-hidden ${className}`}
      style={{ background: pal.background, color: pal.text, fontFamily: fonts.body }}
    >
      <PreviewHeader config={config} pal={pal} fonts={fonts} radius={radius} />
      {keys.map((key) => {
        const Renderer = SECTION_RENDERERS[key];
        const section = (config?.sections || []).find((s) => s?.key === key);
        return (
          <Renderer
            key={key}
            config={config}
            section={section}
            pal={pal}
            fonts={fonts}
            radius={radius}
          />
        );
      })}
    </div>
  );
}

/**
 * The grid-card thumbnail: the SAME DOM as the full preview, scaled to fit.
 *
 * Scale-transform rather than a reduced markup variant, because a simplified
 * re-drawing is what made every theme in a palette look identical. The parent
 * measures itself with a ResizeObserver so the scale is exact at any card width.
 */
export function ThemeThumb({ config, className = '' }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(0.28);

  const measure = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const next = el.clientWidth / CANVAS_W;
    if (next > 0) setScale(next);
  }, []);

  useEffect(() => {
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // Height is derived from the real content so tall templates stay in frame.
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = contentRef.current;
    if (el) setHeight(el.offsetHeight);
  }, [config]);

  return (
    <div ref={wrapRef} className={`relative w-full overflow-hidden ${className}`} aria-hidden="true">
      <div
        style={{
          width: CANVAS_W,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <div ref={contentRef}>
          <ThemePreview config={config} />
        </div>
      </div>
      {/* Reserve the scaled height so the card does not collapse. */}
      <div style={{ height: height ? height * scale : undefined }} />
    </div>
  );
}
