/**
 * components/storefront/templates/StorefrontRenderer.jsx
 * Template renderer: renders the storefront layout matching the seller's
 * selected theme configuration. Thin adapter over the existing page bodies
 * for non-home pages; home pages diverge per template.
 *
 * This module is the storefront's public surface. Storefront.jsx re-exports
 * it as StorefrontRouter so LiveStorefront + ThemeCustomizer keep working.
 *
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { useEffect, useState } from 'react';
import { scopeCss } from '../../../theme/config.js';
import { useTokens } from '../useTokens.js';
import { resolveTemplate } from './storefrontTypes.js';
import { useStorefrontData } from './useStorefrontData.js';
import { useMediaQuery } from './useMediaQuery.js';
import StorefrontFooter from '../StorefrontFooter.jsx';
import { useWishlist } from '../useWishlist.js';
import ShopBody from '../pages/ShopBody.jsx';
import ProductBody from '../pages/ProductBody.jsx';
import CartBody from '../pages/CartBody.jsx';
import TrackBody from '../pages/TrackBody.jsx';
import WishlistBody from '../pages/WishlistBody.jsx';
import AboutBody from '../pages/AboutBody.jsx';
import ContactBody from '../pages/ContactBody.jsx';
import TrustStrip from '../TrustStrip.jsx';
import BoutiqueHeader from './BoutiqueEditorial/BoutiqueHeader.jsx';
import EditorialHero from './BoutiqueEditorial/EditorialHero.jsx';
import MasonryGrid from './BoutiqueEditorial/MasonryGrid.jsx';
import QuickViewDrawer from './BoutiqueEditorial/QuickViewDrawer.jsx';
import DenseHeader from './CatalogGrid/DenseHeader.jsx';
import DualCardHero from './CatalogGrid/DualCardHero.jsx';
import DenseProductGrid from './CatalogGrid/DenseProductGrid.jsx';
import FilterSidebar from './CatalogGrid/FilterSidebar.jsx';
import { categoriesOf, filterProducts, sortProducts } from '../catalog.js';
import TickerHeader from './FlashExpress/TickerHeader.jsx';
import DealTimerHero from './FlashExpress/DealTimerHero.jsx';
import ExpressList from './FlashExpress/ExpressList.jsx';
import StickyCheckoutBar from './FlashExpress/StickyCheckoutBar.jsx';
import './themeCompositions.css';
import RegisteredCuratedThemeHome, { CuratedThemeHeader } from './CuratedThemeHome.jsx';

const PAGE_BODIES = {
  shop: ShopBody,
  product: ProductBody,
  cart: CartBody,
  track: TrackBody,
  wishlist: WishlistBody,
  about: AboutBody,
  contact: ContactBody,
};

export function BoutiqueHome({ t, onNavigate, ctx }) {
  const hc = t.c.home_content || {};
  const [quickId, setQuickId] = useState(null);
  const quick = ctx.products.find((p) => String(p.id) === String(quickId)) || null;
  return (
    <>
      <EditorialHero t={t} onNavigate={onNavigate} ctx={ctx} />
      <section className="mx-auto max-w-6xl px-5 py-10" aria-label={hc.featured_heading || 'Featured products'}>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] opacity-50">Curated</p>
            <h2 className="mt-1 text-2xl font-extrabold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{hc.featured_heading || 'Featured products'}</h2>
          </div>
          <button type="button" onClick={() => onNavigate('shop')} className="text-[11px] font-bold uppercase tracking-widest underline underline-offset-4 opacity-70 hover:opacity-100">{hc.view_all_label || 'View all'}</button>
        </div>
        <MasonryGrid t={t} products={ctx.products.slice(0, 8)} onQuickView={(p) => setQuickId(p.id)} ctx={ctx} />
      </section>
      <div className="mx-auto max-w-6xl px-5 pb-8"><TrustStrip t={t} /></div>
      <QuickViewDrawer t={t} product={quick} ctx={ctx} onClose={() => setQuickId(null)} />
    </>
  );
}

export function CatalogHome({ t, onNavigate, ctx, shopShortcut, setShopShortcut }) {
  const hc = t.c.home_content || {};
  const cats = categoriesOf(ctx.products);
  const filters = { category: 'All', term: '', ...(shopShortcut || {}) };
  const list = sortProducts(filterProducts(ctx.products, filters), 'featured').slice(0, 8);
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
      <DualCardHero t={t} onNavigate={onNavigate} ctx={ctx} />
      <div className="flex gap-4">
        <FilterSidebar t={t} categories={cats} filters={filters} onChange={(patch) => setShopShortcut({ ...filters, ...patch })} />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-end justify-between">
            <h2 className="text-sm font-extrabold text-white">{hc.featured_heading || 'Featured products'}</h2>
            <button type="button" onClick={() => onNavigate('shop')} className="text-[11px] font-bold text-white/60 underline underline-offset-4 hover:text-white">{hc.view_all_label || 'View all'}</button>
          </div>
          <DenseProductGrid t={t} products={list} onNavigate={onNavigate} ctx={ctx} />
        </div>
      </div>
      <TrustStrip t={t} />
    </div>
  );
}

export function FlashHome({ t, onNavigate, ctx }) {
  const hc = t.c.home_content || {};
  return (
    <div className="mx-auto max-w-3xl space-y-3 px-3 py-3">
      <DealTimerHero t={t} onNavigate={onNavigate} ctx={ctx} />
      <div className="flex items-end justify-between px-1">
        <h2 className="text-sm font-extrabold text-white">{hc.featured_heading || "Today's menu"}</h2>
        <button type="button" onClick={() => onNavigate('shop')} className="text-[11px] font-bold text-white/60 underline underline-offset-4 hover:text-white">{hc.view_all_label || 'View all'}</button>
      </div>
      <ExpressList t={t} products={ctx.products} onNavigate={onNavigate} ctx={ctx} />
      <TrustStrip t={t} />
      <StickyCheckoutBar ctx={ctx} onNavigate={onNavigate} />
    </div>
  );
}

const HEADERS = {
  boutique_editorial: BoutiqueHeader,
  catalog_grid: DenseHeader,
  flash_express: TickerHeader,
};

const CURATED_HERO_BY_CATEGORY = {
  fashion: EditorialHero,
  beauty: EditorialHero,
  electronics: DualCardHero,
  marketplace: DualCardHero,
  groceries: DealTimerHero,
};

const CURATED_GRID_BY_CATEGORY = {
  fashion: MasonryGrid,
  beauty: MasonryGrid,
  electronics: DenseProductGrid,
  marketplace: DenseProductGrid,
  groceries: ExpressList,
};

function CuratedThemeHome({ t, onNavigate, ctx, config }) {
  const design = config.theme_design || {};
  const category = config.theme_category || config.category || 'marketplace';
  const homeContent = config.home_content || {};
  const Hero = CURATED_HERO_BY_CATEGORY[category] || DualCardHero;
  const grid = CURATED_GRID_BY_CATEGORY[category] || DenseProductGrid;
  const products = sortProducts(filterProducts(ctx.products, { category: 'All', term: '' }), 'featured').slice(0, 8);
  const categories = categoriesOf(ctx.products).filter((value) => value !== 'All');
  const [quickId, setQuickId] = useState(null);
  const quickProduct = ctx.products.find((product) => String(product.id) === String(quickId)) || null;
  const sections = Array.isArray(design.sectionOrder)
    ? design.sectionOrder
    : ['hero', 'categories', 'products-grid', 'social-proof', 'footer'];

  return (
    <>
      {sections.map((section) => {
        if (section === 'hero') {
          return <div key={section} data-gs-home-section="hero"><Hero t={t} onNavigate={onNavigate} ctx={ctx} /></div>;
        }
        if (section === 'categories') {
          return (
            <section key={section} data-gs-home-section="categories" className="mx-auto max-w-6xl px-4 py-8">
              <h2 className="mb-4 text-xl font-extrabold">{homeContent.category_heading || 'Shop by category'}</h2>
              <div className="flex flex-wrap gap-2">
                {categories.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onNavigate('shop')}
                    className="rounded-full border px-4 py-2 text-xs font-bold"
                    style={{ borderColor: 'var(--accent)', color: 'var(--text)' }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </section>
          );
        }
        if (section === 'products-grid') {
          return (
            <section key={section} data-gs-home-section="products-grid" className="mx-auto max-w-6xl px-4 py-8">
              <div className="mb-5 flex items-end justify-between gap-3">
                <h2 className="text-xl font-extrabold">{homeContent.featured_heading || 'Featured products'}</h2>
                <button type="button" onClick={() => onNavigate('shop')} className="text-xs font-bold underline underline-offset-4">
                  {homeContent.view_all_label || 'View all'}
                </button>
              </div>
              {grid === MasonryGrid
                ? <MasonryGrid t={t} products={products} onQuickView={(product) => setQuickId(product.id)} ctx={ctx} />
                : grid === ExpressList
                  ? <ExpressList t={t} products={products} onNavigate={onNavigate} ctx={ctx} />
                  : <DenseProductGrid t={t} products={products} onNavigate={onNavigate} ctx={ctx} columns={config.layout.product_grid_columns} />}
              {grid === MasonryGrid && (
                <QuickViewDrawer t={t} product={quickProduct} ctx={ctx} onClose={() => setQuickId(null)} />
              )}
            </section>
          );
        }
        if (section === 'urgency') {
          return (
            <div key={section} data-gs-home-section="urgency" className="px-4 py-2 text-center text-xs font-bold text-white" style={{ background: 'var(--primary)' }}>
              {config.conversion?.urgencyTicker || 'New arrivals'} · Nationwide delivery
            </div>
          );
        }
        if (section === 'social-proof') {
          return <div key={section} data-gs-home-section="social-proof" className="mx-auto max-w-6xl px-4 py-6"><TrustStrip t={t} /></div>;
        }
        if (section === 'cta-banner') {
          const threshold = Number(config.conversion?.freeShippingThresholdGHS) || 0;
          return (
            <section key={section} data-gs-home-section="cta-banner" className="px-4 py-8 text-center text-white" style={{ background: 'var(--primary)' }}>
              {threshold > 0 && <p className="mb-3 text-sm font-bold">Free delivery on orders over ₵{threshold}</p>}
              <button type="button" onClick={() => onNavigate('shop')} className="rounded-full bg-white px-5 py-2.5 text-xs font-extrabold" style={{ color: 'var(--primary)' }}>
                {homeContent.hero_button_label || 'Shop now'}
              </button>
            </section>
          );
        }
        return null;
      })}
    </>
  );
}

/**
 * StorefrontRenderer - renders any storefront page inside the token-styled
 * root, for BOTH the customizer preview and the live shop.
 * (Same props contract as the legacy StorefrontRouter.)
 */
export default function StorefrontRenderer({
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
  wishlistEnabled = false,
  orderNumber = null,
  className = '',
  rootStyle = {},
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

  const ctx = useStorefrontData({ products, cart, productId, onAddToCart, onSetQty, onRemove, checkout, storeSlug });
  const wishlist = useWishlist(wishlistEnabled && ctx.isLive);
  const storefrontCtx = {
    ...ctx,
    wishlistEnabled: Boolean(wishlistEnabled && ctx.isLive),
    wishlistCount: wishlist.ids.length,
    isWishlisted: wishlist.isSaved,
    toggleWishlist: wishlist.toggle,
    removeFromWishlist: wishlist.remove,
  };
  const nav = onNavigate || (() => {});
  const scoped = scopeCss(config.advanced?.custom_css);

  /* The catalog-driven renderer is the storefront source of truth. Loading
   * generated per-theme wrapper modules here made a theme-specific render
   * failure capable of taking down the entire live shop. */
  const template = resolveTemplate(config);
  const design = config.theme_design || {};
  const Header = design.profile ? CuratedThemeHeader : (HEADERS[template] || DenseHeader);
  const dark = template !== 'catalog_grid';
  const [shopShortcut, setShopShortcut] = useState(null);
  const renderStorefront = () => (
    <>
      {!(page === 'home' && design.profile) && (template === 'catalog_grid'
        ? <Header t={t} active={page} onNavigate={nav} ctx={storefrontCtx} config={config} onShopShortcut={setShopShortcut} />
        : <Header t={t} active={page} onNavigate={nav} ctx={storefrontCtx} config={config} />)}
      <main style={{ minHeight: '60%' }}>
        {page === 'home' && design.profile
          ? <RegisteredCuratedThemeHome t={t} onNavigate={nav} ctx={storefrontCtx} config={config} />
          : null}
        {page === 'home' && !design.profile && template === 'boutique_editorial'
          ? <BoutiqueHome t={t} onNavigate={nav} ctx={storefrontCtx} />
          : null}
        {page === 'home' && !design.profile && template === 'catalog_grid'
          ? <CatalogHome t={t} onNavigate={nav} ctx={storefrontCtx} shopShortcut={shopShortcut} setShopShortcut={setShopShortcut} />
          : null}
        {page === 'home' && !design.profile && template === 'flash_express'
          ? <FlashHome t={t} onNavigate={nav} ctx={storefrontCtx} />
          : null}
        {page !== 'home' ? (() => {
          const Body = PAGE_BODIES[page] || ShopBody;
          return <Body t={t} onNavigate={nav} ctx={storefrontCtx} orderNumber={orderNumber} />;
        })() : null}
      </main>
      <StorefrontFooter t={t} onNavigate={nav} />
    </>
  );

  return (
    <div
      data-gs-preview=""
      data-gs-template={template}
      data-gs-theme={config.themeId || config.theme_id || ''}
      data-gs-page={page}
      data-gs-composition={design.composition || ''}
      data-gs-profile={design.profile || ''}
      data-gs-header={design.header || ''}
      data-gs-hero={design.hero || ''}
      data-gs-product-presentation={design.productPresentation || ''}
      data-device={d}
      className={`h-full w-full overflow-y-auto overflow-x-hidden ${className}`}
      style={{
        '--primary': config.colors.primary,
        '--bg': config.colors.background,
        '--text': config.colors.text,
        '--accent': config.colors.accent,
        '--radius': config.layout.border_radius,
        containerType: 'inline-size',
        containerName: 'storefront',
        background: dark ? '#090D16' : 'var(--bg)',
        color: dark ? '#E2E8F0' : 'var(--text)',
        fontFamily: t.fontStack,
        fontSize: `${config.typography.body_size}px`,
        ...rootStyle,
      }}
      aria-label={`Live storefront preview - ${page} page`}
    >
      {scoped ? <style>{scoped}</style> : null}

      {renderStorefront()}
    </div>
  );
}
