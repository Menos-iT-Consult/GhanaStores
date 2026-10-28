/**
 * components/storefront/templates/themeComponents/BaseThemeComponent.jsx
 * Shared rendering engine for per-theme components. Each of the 100 themes
 * renders a unique composition driven by its config signature:
 *   - category   -> header / hero / grid archetype
 *   - palette    -> color CSS class + bg/text tones
 *   - layout     -> grid columns, hero presence, card style
 *   - borderRadius -> corner radius tokens
 *
 * Wrappers (Theme01..Theme100) load their catalog design and merge active
 * merchant tokens before delegating here. Shared commerce building blocks keep
 * behavior consistent while CuratedThemeHome applies each theme composition.
 *
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { useEffect, useState } from 'react';
import { scopeCss } from '../../../../theme/config.js';
import { useTokens } from '../../useTokens.js';
import { useStorefrontData } from '../useStorefrontData.js';
import { useMediaQuery } from '../useMediaQuery.js';
import StorefrontFooter from '../../StorefrontFooter.jsx';
import ShopBody from '../../pages/ShopBody.jsx';
import ProductBody from '../../pages/ProductBody.jsx';
import CartBody from '../../pages/CartBody.jsx';
import TrackBody from '../../pages/TrackBody.jsx';
import AboutBody from '../../pages/AboutBody.jsx';
import ContactBody from '../../pages/ContactBody.jsx';
import TrustStrip from '../../TrustStrip.jsx';
import { categoriesOf, filterProducts, sortProducts } from '../../catalog.js';
import BoutiqueHeader from '../BoutiqueEditorial/BoutiqueHeader.jsx';
import EditorialHero from '../BoutiqueEditorial/EditorialHero.jsx';
import MasonryGrid from '../BoutiqueEditorial/MasonryGrid.jsx';
import QuickViewDrawer from '../BoutiqueEditorial/QuickViewDrawer.jsx';
import DenseHeader from '../CatalogGrid/DenseHeader.jsx';
import DualCardHero from '../CatalogGrid/DualCardHero.jsx';
import DenseProductGrid from '../CatalogGrid/DenseProductGrid.jsx';
import FilterSidebar from '../CatalogGrid/FilterSidebar.jsx';
import TickerHeader from '../FlashExpress/TickerHeader.jsx';
import DealTimerHero from '../FlashExpress/DealTimerHero.jsx';
import ExpressList from '../FlashExpress/ExpressList.jsx';
import StickyCheckoutBar from '../FlashExpress/StickyCheckoutBar.jsx';
import '../themeCompositions.css';
import CuratedThemeHome from '../CuratedThemeHome.jsx';

const PAGE_BODIES = {
  shop: ShopBody,
  product: ProductBody,
  cart: CartBody,
  track: TrackBody,
  about: AboutBody,
  contact: ContactBody,
};

const HEADER_BY_CATEGORY = {
  fashion: BoutiqueHeader,
  beauty: BoutiqueHeader,
  electronics: DenseHeader,
  marketplace: DenseHeader,
  groceries: TickerHeader,
};

const HERO_BY_CATEGORY = {
  fashion: EditorialHero,
  beauty: EditorialHero,
  electronics: DualCardHero,
  marketplace: DualCardHero,
  groceries: DealTimerHero,
};

const GRID_BY_CATEGORY = {
  fashion: MasonryGrid,
  beauty: MasonryGrid,
  electronics: DenseProductGrid,
  marketplace: DenseProductGrid,
  groceries: ExpressList,
};

/**
 * Root wrapper: applies palette colors, border radius, and a unique
 * per-theme CSS class so every theme styles differently even before layout.
 */
export function ThemeRoot({ config, children, className = '', page = 'home' }) {
  const design = config.theme_design || config.design || {};
  const pal = config.palette || {};
  const br = config.borderRadius || {};
  const ly = config.layout || {};
  const primary = config.colors?.primary || pal.primary || '#0B6E4F';
  const secondary = config.colors?.accent || pal.secondary || primary;
  const background = config.colors?.background || pal.background || '#FFFFFF';
  const text = config.colors?.text || pal.textPrimary || '#0F172A';
  const radius = ly.border_radius || br.base || '0.375rem';
  const category = config.theme_category || config.category || 'marketplace';
  const dark = background !== '#FFFFFF';
  const themeClass = `gs-theme-${category}-${ly.cardStyle || 'card'}-${br.name || 'subtle'}`;
  return (
    <div
      data-gs-preview=""
      data-gs-theme={config.themeId || config.theme_id || ''}
      data-gs-page={page}
      data-gs-category={config.category || ''}
      data-gs-composition={design.composition || ''}
      data-gs-profile={design.profile || ''}
      data-gs-header={design.header || ''}
      data-gs-hero={design.hero || ''}
      data-gs-product-presentation={design.productPresentation || ''}
      data-device="desktop"
      className={`h-full w-full overflow-y-auto overflow-x-hidden ${className}`}
      style={{
        '--primary': primary,
        '--secondary': secondary,
        '--accent': config.colors?.accent || pal.accent || '#F59E0B',
        '--bg': background,
        '--surface': background === '#FFFFFF' ? '#F8FAFC' : 'rgba(15,23,42,.6)',
        '--text': text,
        '--textSecondary': pal.textSecondary || '#475569',
        '--radius': radius,
        '--radiusButtons': br.buttons || '0.375rem',
        background: dark ? '#090D16' : 'var(--bg)',
        color: dark ? '#E2E8F0' : 'var(--text)',
        fontFamily: config.typography?.font_family || config.typography?.headingFont
          ? `'${(config.typography.font_family || config.typography.headingFont).split(',')[0].replace(/'/g, '')}', system-ui, sans-serif`
          : "'Poppins', system-ui, sans-serif",
        fontSize: `${(config.typography?.body_size ?? config.typography?.baseFontSize ?? 16)}px`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Home page composed per theme signature.
 */
export function ThemeHome({ t, onNavigate, ctx, config, shopShortcut, setShopShortcut }) {
  if ((config.theme_design || config.design)?.profile) {
    return <CuratedThemeHome t={t} onNavigate={onNavigate} ctx={ctx} config={config} />;
  }
  const hc = t.c?.home_content || {};
  const cats = categoriesOf(ctx.products);
  const filters = { category: 'All', term: '', ...(shopShortcut || {}) };
  const list = sortProducts(filterProducts(ctx.products, filters), 'featured').slice(0, 8);
  const HeaderComp = HEADER_BY_CATEGORY[config.theme_category || config.category] || DenseHeader;
  const HeroComp = HERO_BY_CATEGORY[config.category] || DualCardHero;
  const GridComp = GRID_BY_CATEGORY[config.category] || DenseProductGrid;
  const [quickId, setQuickId] = useState(null);
  const quick = ctx.products.find((p) => String(p.id) === String(quickId)) || null;
  const showHero = !!(config.layout?.heroBanner);
  const gridCols = config.layout?.gridColumns ?? 3;
  const cardStyle = config.layout?.cardStyle ?? 'card';

  return (
    <>
      <HeaderComp t={t} active="home" onNavigate={onNavigate} ctx={ctx} />
      {showHero ? (
        <HeroComp t={t} onNavigate={onNavigate} ctx={ctx} />
      ) : null}
      <section
        className="mx-auto max-w-6xl space-y-4 px-4 py-6"
        aria-label={hc.featured_heading || 'Featured products'}
        style={{ gridTemplateColumns: `repeat(${Math.min(gridCols, 4)}, 1fr)` }}
      >
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] opacity-50">Curated</p>
            <h2 className="mt-1 text-2xl font-extrabold">{hc.featured_heading || 'Featured products'}</h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="text-[11px] font-bold uppercase tracking-widest underline underline-offset-4 opacity-70 hover:opacity-100"
          >
            {hc.view_all_label || 'View all'}
          </button>
        </div>
        <GridComp
          t={t}
          products={list}
          onNavigate={onNavigate}
          ctx={ctx}
          cardStyle={cardStyle}
          columns={gridCols}
        />
      </section>
      <div className="mx-auto max-w-6xl px-4 pb-8"><TrustStrip t={t} /></div>
      {(config.category === 'fashion' || config.category === 'beauty') && (
        <QuickViewDrawer
          t={t}
          product={quick}
          ctx={ctx}
          onClose={() => setQuickId(null)}
          onQuickView={(p) => setQuickId(p.id)}
        />
      )}
    </>
  );
}

/**
 * BaseThemeComponent - single entry point used by every Theme01..Theme100
 * wrapper. Renders the full storefront (header + page body + footer) scoped
 * to the theme's own config.
 */
export default function BaseThemeComponent({
  config,
  viewportWidth = null,
  page = 'home',
  onNavigate,
  products = null,
  cart = [],
  productId = null,
  onAddToCart = null,
  onSetQty = null,
  onRemove = null,
  checkout = null,
  storeSlug = null,
  orderNumber = null,
  shopShortcut,
  setShopShortcut,
}) {
  const mq = useMediaQuery();
  const [, setWindowTier] = useState(null);
  useEffect(() => {
    if (viewportWidth != null || !mq.subscribe) return undefined;
    return mq.subscribe((tier) => setWindowTier(tier));
  }, [viewportWidth, mq.subscribe]);
  const effectiveWidth = viewportWidth != null ? viewportWidth : (mq.ready ? mq.width : null);
  const t = useTokens(config, effectiveWidth);
  const d = t.device;

  const ctx = useStorefrontData({
    products,
    cart,
    productId,
    onAddToCart,
    onSetQty,
    onRemove,
    checkout,
    storeSlug,
  });
  const nav = onNavigate || (() => {});
  const scoped = scopeCss(config.advanced?.custom_css);
  const dark = (config.palette?.background ?? '#FFFFFF') !== '#FFFFFF';
  const themeClass = `gs-theme-${config.category || 'marketplace'}-${config.layout?.cardStyle ?? 'card'}-${config.borderRadius?.name ?? 'subtle'}`;

  return (
    <ThemeRoot config={config} className={themeClass} page={page}>
      {scoped ? <style>{scoped}</style> : null}
      {page === 'home' ? (
        <ThemeHome
          t={t}
          onNavigate={nav}
          ctx={ctx}
          config={config}
          shopShortcut={shopShortcut}
          setShopShortcut={setShopShortcut}
        />
      ) : (
        <>
          {(() => {
            const HeaderComp = HEADER_BY_CATEGORY[config.category] || DenseHeader;
            const BodyComp = PAGE_BODIES[page] || ShopBody;
            return (
              <>
                <HeaderComp t={t} active={page} onNavigate={nav} ctx={ctx} />
                <main style={{ minHeight: '60%' }}>
                  <BodyComp t={t} onNavigate={nav} ctx={ctx} orderNumber={orderNumber} />
                </main>
              </>
            );
          })()}
        </>
      )}
      <StorefrontFooter t={t} onNavigate={nav} />
    </ThemeRoot>
  );
}