/**
 * Renders the catalog-authored home composition used by live themes and the
 * customizer preview. Shared commerce components remain responsible for
 * product/cart behavior; this module handles the theme-specific composition.
 */
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import SafeImage from '../../SafeImage.jsx';
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

const HERO_BY_STYLE = {
  split: EditorialHero,
  split_reverse: EditorialHero,
  full_bleed: EditorialHero,
  centered: EditorialHero,
  editorial: EditorialHero,
  compact: DealTimerHero,
  framed: EditorialHero,
  dual: DualCardHero,
  banner: DealTimerHero,
  typographic: EditorialHero,
  dark: EditorialHero,
  search_first: DualCardHero,
  story: EditorialHero,
};

const MASONRY_PRESENTATIONS = new Set(['asymmetric', 'masonry', 'gallery', 'editorial_cards']);
const LIST_PRESENTATIONS = new Set(['list', 'produce']);

export function CuratedThemeHeader({ t, active, onNavigate, ctx, config }) {
  const design = config.theme_design || config.design || {};
  const category = config.theme_category || config.category || 'marketplace';
  const Header = HEADER_BY_STYLE[design.header] || ({
    fashion: BoutiqueHeader,
    beauty: BoutiqueHeader,
    groceries: TickerHeader,
  }[category] || DenseHeader);
  return (
    <div data-gs-theme-header={design.header || ''} className="contents">
      <Header t={t} active={active} onNavigate={onNavigate} ctx={ctx} />
    </div>
  );
}

function ProductPresentation({ design, t, products, onNavigate, ctx, onQuickView }) {
  if (MASONRY_PRESENTATIONS.has(design.productPresentation)) {
    return <MasonryGrid t={t} products={products} onQuickView={onQuickView} ctx={ctx} />;
  }
  if (LIST_PRESENTATIONS.has(design.productPresentation)) {
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
  const Hero = HERO_BY_STYLE[design.hero] || (category === 'groceries' ? DealTimerHero : DualCardHero);
  const products = sortProducts(
    filterProducts(ctx.products, { category: 'All', term: '' }),
    'featured',
  ).slice(0, 8);
  const categories = categoriesOf(ctx.products).filter((value) => value !== 'All');
  const categoryCards = categories.map((name) => {
    const categoryProducts = ctx.products.filter((product) => product.category === name);
    return {
      name,
      count: categoryProducts.length,
      image: categoryProducts.find((product) => product.img)?.img,
    };
  });
  const [quickId, setQuickId] = useState(null);
  const quickProduct = ctx.products.find((product) => String(product.id) === String(quickId)) || null;
  const sections = Array.isArray(design.sectionOrder)
    ? design.sectionOrder
    : ['hero', 'categories', 'products-grid', 'social-proof', 'footer'];

  return (
    <>
      <CuratedThemeHeader t={t} active="home" onNavigate={onNavigate} ctx={ctx} config={config} />
      {sections.map((section) => {
        if (section === 'hero') {
          return (
            <div key={section} data-gs-home-section="hero" data-gs-theme-hero={design.hero || ''}>
              <Hero t={t} onNavigate={onNavigate} ctx={ctx} variant={design.hero} />
            </div>
          );
        }
        if (section === 'categories') {
          return (
            <section
              key={section}
              data-gs-home-section="categories"
              data-gs-category-presentation={design.productPresentation || ''}
              className="mx-auto max-w-6xl px-4 py-8"
            >
              <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] opacity-60">Explore the collection</p>
                  <h2 className="text-xl font-extrabold">{homeContent.category_heading || 'Shop by category'}</h2>
                </div>
              </div>
              <div data-gs-category-grid="" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {categoryCards.map(({ name, count, image }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onNavigate('shop', name)}
                    data-gs-category-card=""
                    aria-label={`Shop ${name}, ${count} ${count === 1 ? 'product' : 'products'}`}
                    className="group relative flex min-h-40 items-end overflow-hidden rounded-xl p-4 text-left text-white shadow-lg transition duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                    style={{ backgroundColor: 'var(--primary)' }}
                  >
                    {image && (
                      <SafeImage
                        src={image}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                    <span data-gs-category-shade="" className="absolute inset-0" aria-hidden="true" />
                    <span className="relative z-10 min-w-0 flex-1">
                      <span className="block truncate text-base font-extrabold tracking-tight">{name}</span>
                      <span className="mt-1 block text-[11px] font-semibold text-white/80">
                        {count} {count === 1 ? 'product' : 'products'}
                      </span>
                    </span>
                    <ArrowUpRight className="relative z-10 ml-2 shrink-0 text-white/80 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" size={18} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          );
        }
        if (section === 'products-grid') {
          return (
            <section
              key={section}
              data-gs-home-section="products-grid"
              data-gs-product-style={design.productPresentation || ''}
              className="mx-auto max-w-6xl px-4 py-8"
            >
              <div className="mb-5 flex items-end justify-between gap-3">
                <h2 className="text-xl font-extrabold">{homeContent.featured_heading || 'Featured products'}</h2>
                <button type="button" onClick={() => onNavigate('shop')} className="text-xs font-bold underline underline-offset-4">
                  {homeContent.view_all_label || 'View all'}
                </button>
              </div>
              <ProductPresentation
                design={design}
                t={t}
                products={products}
                onNavigate={onNavigate}
                ctx={ctx}
                onQuickView={(product) => setQuickId(product.id)}
              />
              {MASONRY_PRESENTATIONS.has(design.productPresentation) && (
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
