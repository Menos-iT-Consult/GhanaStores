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
import { resolveTemplate, resolveComponent } from './storefrontTypes.js';
import { useStorefrontData } from './useStorefrontData.js';
import { useMediaQuery } from './useMediaQuery.js';
import StorefrontFooter from '../StorefrontFooter.jsx';
import ShopBody from '../pages/ShopBody.jsx';
import ProductBody from '../pages/ProductBody.jsx';
import CartBody from '../pages/CartBody.jsx';
import TrackBody from '../pages/TrackBody.jsx';
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

const PAGE_BODIES = {
  shop: ShopBody,
  product: ProductBody,
  cart: CartBody,
  track: TrackBody,
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
        <MasonryGrid t={t} products={ctx.products.slice(0, 8)} onQuickView={(p) => setQuickId(p.id)} />
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
  orderNumber = null,
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
  const nav = onNavigate || (() => {});
  const scoped = scopeCss(config.advanced?.custom_css);

  /* Resolve a dedicated per-theme component first; fall back to archetype-based
   * rendering for backward compatibility with themes that have no dedicated
   * component yet. */
  const themeId = config?.themeId;
  const [ThemeComp, setThemeComp] = useState(null);
  const [themeResolved, setThemeResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const Comp = await resolveComponent(themeId);
      if (!cancelled) setThemeComp(Comp);
      if (!cancelled) setThemeResolved(true);
    })();
    return () => { cancelled = true; };
  }, [themeId]);

  /* Legacy archetype path (used while the async theme component resolves, or
   * when no dedicated component exists for this theme ID). */
  const template = resolveTemplate(config);
  const Header = HEADERS[template] || DenseHeader;
  const dark = template !== 'catalog_grid';
  const [shopShortcut, setShopShortcut] = useState(null);

  return (
    <div
      data-gs-preview=""
      data-gs-template={template}
      data-gs-theme={themeId || ''}
      data-device={d}
      className="h-full w-full overflow-y-auto overflow-x-hidden"
      style={{
        '--primary': config.colors.primary,
        '--bg': config.colors.background,
        '--text': config.colors.text,
        '--accent': config.colors.accent,
        '--radius': config.layout.border_radius,
        background: dark ? '#090D16' : 'var(--bg)',
        color: dark ? '#E2E8F0' : 'var(--text)',
        fontFamily: t.fontStack,
        fontSize: `${config.typography.body_size}px`,
      }}
      aria-label={`Live storefront preview - ${page} page`}
    >
      {scoped ? <style>{scoped}</style> : null}

      {ThemeComp && themeResolved ? (
        /* Dedicated per-theme component handles header + body + footer. */
        <ThemeComp
          viewportWidth={viewportWidth}
          page={page}
          onNavigate={nav}
          products={products}
          cart={cart}
          productId={productId}
          onAddToCart={onAddToCart}
          onSetQty={onSetQty}
          onRemove={onRemove}
          checkout={checkout}
          storeSlug={storeSlug}
          orderNumber={orderNumber}
          shopShortcut={shopShortcut}
          setShopShortcut={setShopShortcut}
        />
      ) : (
        /* Legacy archetype-based rendering (fallback). */
        <>
          {template === 'catalog_grid'
            ? <Header t={t} active={page} onNavigate={nav} ctx={ctx} onShopShortcut={setShopShortcut} />
            : <Header t={t} active={page} onNavigate={nav} ctx={ctx} />}
          <main style={{ minHeight: '60%' }}>
            {page === 'home' && template === 'boutique_editorial' ? <BoutiqueHome t={t} onNavigate={nav} ctx={ctx} /> : null}
            {page === 'home' && template === 'catalog_grid' ? <CatalogHome t={t} onNavigate={nav} ctx={ctx} shopShortcut={shopShortcut} setShopShortcut={setShopShortcut} /> : null}
            {page === 'home' && template === 'flash_express' ? <FlashHome t={t} onNavigate={nav} ctx={ctx} /> : null}
            {page !== 'home' ? (() => {
              const Body = PAGE_BODIES[page] || ShopBody;
              return <Body t={t} onNavigate={nav} ctx={ctx} orderNumber={orderNumber} />;
            })() : null}
          </main>
          <StorefrontFooter t={t} onNavigate={nav} />
        </>
      )}
    </div>
  );
}

