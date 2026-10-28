/**
 * Renders the catalog-authored home composition used by live themes and the
 * customizer preview. Shared commerce components remain responsible for
 * product/cart behavior; this module handles the theme-specific composition.
 */
import { useState } from 'react';
import TrustStrip from '../TrustStrip.jsx';
import BoutiqueHeader from './BoutiqueEditorial/BoutiqueHeader.jsx';
import EditorialHero from './BoutiqueEditorial/EditorialHero.jsx';
import MasonryGrid from './BoutiqueEditorial/MasonryGrid.jsx';
import QuickViewDrawer from './BoutiqueEditorial/QuickViewDrawer.jsx';
import DenseHeader from './CatalogGrid/DenseHeader.jsx';
import DualCardHero from './CatalogGrid/DualCardHero.jsx';
import DenseProductGrid from './CatalogGrid/DenseProductGrid.jsx';
import TickerHeader from './FlashExpress/TickerHeader.jsx';
import DealTimerHero from './FlashExpress/DealTimerHero.jsx';
import ExpressList from './FlashExpress/ExpressList.jsx';
import { categoriesOf, filterProducts, sortProducts } from '../catalog.js';

const HEADER_BY_STYLE = {
  editorial: BoutiqueHeader,
  heritage: BoutiqueHeader,
  overlay: BoutiqueHeader,
  minimal: DenseHeader,
  utility: DenseHeader,
  catalog: DenseHeader,
  bold: DenseHeader,
  ticker: TickerHeader,
  floating: BoutiqueHeader,
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

function ProductPresentation({ design, category, t, products, onNavigate, ctx, onQuickView }) {
  if (design.productPresentation === 'asymmetric' || design.productPresentation === 'masonry'
    || design.productPresentation === 'gallery' || design.productPresentation === 'editorial_cards') {
    return <MasonryGrid t={t} products={products} onQuickView={onQuickView} />;
  }
  if (design.productPresentation === 'list' || design.productPresentation === 'produce') {
    return <ExpressList t={t} products={products} onNavigate={onNavigate} ctx={ctx} />;
  }
  return (
    <DenseProductGrid
      t={t}
      products={products}
      onNavigate={onNavigate}
      ctx={ctx}
      columns={t.c.layout.product_grid_columns}
    />
  );
}

export default function CuratedThemeHome({ t, onNavigate, ctx, config }) {
  const design = config.theme_design || config.design || {};
  const category = config.theme_category || config.category || 'marketplace';
  const homeContent = config.home_content || {};
  const Header = HEADER_BY_STYLE[design.header] || ({
    fashion: BoutiqueHeader,
    beauty: BoutiqueHeader,
    groceries: TickerHeader,
  }[category] || DenseHeader);
  const Hero = HERO_BY_CATEGORY[category] || DualCardHero;
  const productsRenderer = GRID_BY_CATEGORY[category] || DenseProductGrid;
  const products = sortProducts(
    filterProducts(ctx.products, { category: 'All', term: '' }),
    'featured',
  ).slice(0, 8);
  const categories = categoriesOf(ctx.products).filter((value) => value !== 'All');
  const [quickId, setQuickId] = useState(null);
  const quickProduct = ctx.products.find((product) => String(product.id) === String(quickId)) || null;
  const sections = Array.isArray(design.sectionOrder)
    ? design.sectionOrder
    : ['hero', 'categories', 'products-grid', 'social-proof', 'footer'];

  return (
    <>
      <Header t={t} active="home" onNavigate={onNavigate} ctx={ctx} />
      {sections.map((section) => {
        if (section === 'hero') {
          return (
            <div key={section} data-gs-home-section="hero">
              <Hero t={t} onNavigate={onNavigate} ctx={ctx} />
            </div>
          );
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
              <ProductPresentation
                design={design}
                category={category}
                t={t}
                products={products}
                onNavigate={onNavigate}
                ctx={ctx}
                onQuickView={(product) => setQuickId(product.id)}
              />
              {productsRenderer === MasonryGrid && (
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
