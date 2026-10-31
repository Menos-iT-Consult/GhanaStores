/**
 * Storefront rendering and catalog behaviour.
 *
 * Every other suite in this repo reads source text and regex-matches it, which
 * proves the code is shaped correctly but never proves it renders. That gap was
 * not theoretical: /contact referenced an icon that was never imported, so the
 * page threw "Phone is not defined" on every render while all 147 assertions
 * across the other suites still passed.
 *
 * This suite actually renders the storefront for every page at all three
 * responsive widths, and exercises the catalog query rules directly.
 *
 * Usage: node scripts/storefrontRenderTest.js   (no server, no database)
 */
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

const vite = await createServer({
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const { default: Storefront } = await vite.ssrLoadModule('/src/components/storefront/Storefront.jsx');
const { DEFAULT_CUSTOM_THEME_CONFIG, templateToCustomizerTokens } = await vite.ssrLoadModule('/src/theme/config.js');
const { THEME_DATA } = await vite.ssrLoadModule('/src/components/storefront/templates/themeComponents/themeData.js');
const { matchesSearch, filterProducts, sortProducts, categoriesOf } = await vite.ssrLoadModule('/src/components/storefront/catalog.js');
const { toDisplayProduct } = await vite.ssrLoadModule('/src/components/storefront/mappers.js');
const { pathToStorefrontPage, storefrontPageToPath } = await vite.ssrLoadModule('/src/pages/LiveStorefront.jsx');
const { default: GlassCard } = await vite.ssrLoadModule('/src/components/storefront/templates/shared/GlassCard.jsx');
await vite.close();

const PAGES = ['home', 'shop', 'product', 'cart', 'wishlist', 'track', 'about', 'contact'];
const WIDTHS = [
  [375, 'mobile'],
  [768, 'tablet'],
  [1024, 'desktop'],
];

console.log('\nDidwa storefront render -> every page renders at every width\n');

/* ---------- 1. Every page renders at every responsive width ---------- */
for (const page of PAGES) {
  for (const [width, tier] of WIDTHS) {
    let html = null;
    let err = '';
    try {
      html = renderToString(React.createElement(Storefront, {
        config: DEFAULT_CUSTOM_THEME_CONFIG, page, viewportWidth: width,
      }));
    } catch (e) {
      err = String(e.message).split('\n')[0];
    }
    log(`${page} renders at ${width}px (${tier})`, Boolean(html), err);
  }
}

/* ---------- 2. Live data, not just the demo catalogue ---------- */
{
  let ok = true;
  let err = '';
  let html = '';
  try {
    html = renderToString(React.createElement(Storefront, {
      config: DEFAULT_CUSTOM_THEME_CONFIG,
      page: 'shop',
      viewportWidth: 1024,
      wishlistEnabled: true,
      products: [toDisplayProduct({ id: 1, name: 'Real Kente', price: 120, category: 'Cloth', stock: 3 })],
      cart: [{ id: 1, name: 'Real Kente', price: 120, quantity: 2 }],
    }));
  } catch (e) { ok = false; err = String(e.message).split('\n')[0]; }
  log('the shop page renders with a real catalog', ok, err);
  log('live product cards expose the cookie-backed wishlist control',
    html.includes('Add Real Kente to wishlist'));

  const previewHtml = renderToString(React.createElement(Storefront, {
    config: DEFAULT_CUSTOM_THEME_CONFIG,
    page: 'shop',
    viewportWidth: 1024,
    products: [toDisplayProduct({ id: 2, name: 'Demo Kente', price: 90, category: 'Cloth', stock: 3 })],
  }));
  log('demo catalogs do not expose wishlist controls',
    !previewHtml.includes('Add Demo Kente to wishlist'));
}

log('wishlist route resolves to its storefront page', pathToStorefrontPage('/wishlist').page === 'wishlist');
log('wishlist navigation produces a direct URL', storefrontPageToPath('wishlist') === '/wishlist');
log('category storefront URLs resolve to the shop with a decoded category',
  pathToStorefrontPage('/shop/category/Beauty%20Care').category === 'Beauty Care');
log('category navigation creates a direct category URL',
  storefrontPageToPath('shop', 'Beauty Care') === '/shop/category/Beauty%20Care');
const inventorySource = readFileSync('src/pages/SellerInventory.jsx', 'utf8');
log('new product creation requires a category and suggests existing categories',
  inventorySource.includes('input required list="inventory-product-categories"')
  && inventorySource.includes('categories.map((category)'));

{
  const theme = THEME_DATA[0];
  const config = templateToCustomizerTokens({
    id: theme.id,
    name: theme.name,
    category: theme.category,
    config: theme.config,
  });
  const html = renderToString(React.createElement(Storefront, {
    config,
    page: 'home',
    viewportWidth: 1024,
    products: [
      toDisplayProduct({ id: 21, name: 'Kente Shirt', price: 180, category: 'Clothing', img: '/kente-shirt.jpg', stock: 8 }),
      toDisplayProduct({ id: 22, name: 'Leather Tote', price: 220, category: 'Accessories', img: '/leather-tote.jpg', stock: 5 }),
    ],
  }));
  log('curated storefront categories render with product imagery and counts',
    html.includes('data-gs-category-card=""')
    && html.includes('src="/kente-shirt.jpg"')
    && html.includes('Shop Clothing, 1 product')
    && html.includes('Shop Accessories, 1 product'));
  log('curated product cards use theme surfaces and high-contrast pricing',
    html.includes('background:var(--bg)')
    && html.includes('color:var(--text)')
    && html.includes('color:var(--primary)'));

  const noHeroConfig = {
    ...config,
    features: { ...config.features, enable_hero_banner: false },
    branding: { ...config.branding, site_title: 'Atelier North', tagline: 'Contemporary Ghanaian fashion.' },
  };
  const noHeroHtml = renderToString(React.createElement(Storefront, {
    config: noHeroConfig,
    page: 'home',
    viewportWidth: 1024,
  }));
  const heading = noHeroHtml.match(/<h1\b[^>]*>(.*?)<\/h1>/);
  log('curated home retains one descriptive H1 when the hero is disabled',
    (noHeroHtml.match(/<h1\b/g) || []).length === 1
    && heading?.[1]?.includes('Shop fashion and apparel at Atelier North')
    && heading[1].length <= 150);
}

{
  const html = renderToString(React.createElement(GlassCard, null, React.createElement('span', null, 'Readable glass copy')));
  log('glass cards use an opaque dark surface for readable text',
    html.includes('rgba(9,13,22,.94)') && html.includes('color:#E2E8F0'));
}

{
  const categoryConfig = { ...DEFAULT_CUSTOM_THEME_CONFIG, shopCategory: 'Beauty' };
  const html = renderToString(React.createElement(Storefront, {
    config: categoryConfig,
    page: 'shop',
    viewportWidth: 1024,
    products: [
      toDisplayProduct({ id: 11, name: 'Shea Butter', price: 45, category: 'Beauty' }),
      toDisplayProduct({ id: 12, name: 'Kente Scarf', price: 90, category: 'Clothing' }),
    ],
  }));
  log('category route preselects and filters the shop catalog',
    html.includes('Beauty<!-- -->') && html.includes('Shea Butter') && !html.includes('Kente Scarf'));
}

{
  const html = renderToString(React.createElement(Storefront, {
    config: DEFAULT_CUSTOM_THEME_CONFIG,
    page: 'track',
    viewportWidth: 375,
    storeSlug: 'demo-store',
  }));
  log('order tracking offers independent order-number and phone lookup modes',
    html.includes('Order ID / number') && html.includes('Phone number') && !html.includes('Enter both'));
}

{
  let ok = true;
  let err = '';
  try {
    renderToString(React.createElement(Storefront, {
      config: DEFAULT_CUSTOM_THEME_CONFIG,
      page: 'cart',
      viewportWidth: 1024,
      products: [toDisplayProduct({ id: 1, name: 'Real Kente', price: 120, stock: 3 })],
      cart: [],
    }));
  } catch (e) { ok = false; err = String(e.message).split('\n')[0]; }
  log('an empty live cart renders the empty state', ok, err);
}

  {
    const liveProducts = [
      toDisplayProduct({ id: 1, name: 'Saved Kente', price: 120, stock: 3 }),
    ];
    let html = '';
    let err = '';
    try {
      html = renderToString(React.createElement(Storefront, {
        config: DEFAULT_CUSTOM_THEME_CONFIG,
        page: 'wishlist',
        viewportWidth: 375,
        wishlistEnabled: true,
        products: liveProducts,
      }));
    } catch (e) { err = String(e.message).split('\n')[0]; }
    log('live wishlist page renders safely without browser cookie APIs during SSR', Boolean(html), err);
  }

/* ---------- 3. The catalog query rules ---------- */
{
  const products = [
    { id: 1, name: 'Kente Cloth Scarf', category: 'Cloth', description: 'Hand-woven cotton', price: 180, createdAt: 3 },
    { id: 2, name: 'Ankara Print Dress', category: 'Dress', description: 'Bright print', price: 250, createdAt: 1 },
    { id: 3, name: 'Shea Butter 250g', category: 'Beauty', description: 'Unrefined shea', price: 45, createdAt: 2 },
  ];

  log('an empty query matches everything', matchesSearch(products[0], ''));
  log('search matches on the product name', matchesSearch(products[0], 'kente'));
  log('search is case-insensitive', matchesSearch(products[0], 'KENTE'));
  log('search matches on the category', matchesSearch(products[0], 'cloth'));
  log('search matches on the description', matchesSearch(products[2], 'unrefined'));
  log('search ignores surrounding whitespace', matchesSearch(products[0], '  kente  '));
  log('search rejects a non-match', !matchesSearch(products[0], 'zzzz'));
  log('a product with no category does not throw', matchesSearch({ name: 'x' }, 'x'));

  log('no category keeps every product', filterProducts(products, { category: 'All' }).length === 3);
  log('a category narrows the list', filterProducts(products, { category: 'Beauty' }).length === 1);
  log('category and query are ANDed', filterProducts(products, { category: 'Beauty', term: 'kente' }).length === 0);
  log('filtering leaves the input array untouched', products.length === 3);

  const asc = sortProducts(products, 'price-asc').map((p) => p.price);
  log('price low-to-high sorts ascending', asc.join() === '45,180,250', asc.join());
  const desc = sortProducts(products, 'price-desc').map((p) => p.price);
  log('price high-to-low sorts descending', desc.join() === '250,180,45', desc.join());
  const newest = sortProducts(products, 'newest').map((p) => p.id);
  log('newest puts the most recent first', newest.join() === '1,3,2', newest.join());
  const featured = sortProducts(products, 'featured').map((p) => p.id);
  log('featured preserves the order the API returned', featured.join() === '1,2,3', featured.join());
  log('sorting does not mutate its input', products[0].id === 1);
  log('sorting survives products with no timestamp', sortProducts([{ id: 1, price: 2 }, { id: 2, price: 1 }], 'newest').length === 2);

  log('categories start with All', categoriesOf(products)[0] === 'All');
  log('categories are de-duplicated', categoriesOf(products).length === 4);
  log('products with no category are skipped', categoriesOf([{ name: 'x' }]).length === 1);
}

/* ---------- 4. The mapper feeds the sort it promises ---------- */
{
  const dated = toDisplayProduct({ id: 1, name: 'A', price: 10, created_at: '2024-05-01T00:00:00Z' });
  log('the mapper carries created_at through', dated.createdAt === '2024-05-01T00:00:00Z', String(dated.createdAt));
  const undated = toDisplayProduct({ id: 2, name: 'B', price: 20 });
  log('a product with no date maps to null', undated.createdAt === null, String(undated.createdAt));
}

/* ---------- 5. Every storefront string is merchant-editable ---------- */
{
  const {
    mergeThemeConfig, normalizeCustomThemeConfig, DEFAULT_CUSTOM_THEME_CONFIG: D,
  } = await import('../src/theme/config.js');

  /* An override written by the customizer must survive normalisation, which is
     what runs on the way into the preview and into the published config. */
  const customised = normalizeCustomThemeConfig({
    home_content: { featured_heading: 'Bestsellers this week' },
    shop_content: { heading_all: 'Everything' },
    cart_content: { heading: 'Your Bag' },
    trust_badges: { secured: 'Verified Seller' },
    product_page: { fallback_description: 'Made in Ghana' },
  });
  log('a customizer edit survives normalisation', customised.home_content.featured_heading === 'Bestsellers this week');
  log('untouched sibling tokens keep their defaults', customised.home_content.hero_button_label === D.home_content.hero_button_label);

  const html = renderToString(React.createElement(Storefront, {
    config: customised, page: 'home', viewportWidth: 1024,
  }));
  log('the merchant heading reaches the storefront', html.includes('Bestsellers this week'));
  log('the trust badge copy is merchant-owned', html.includes('Verified Seller'));

  const heroVariants = [
    { category: 'fashion', hero: 'split', title: 'Made for your moment' },
    { category: 'marketplace', hero: 'dual', title: 'Find something special' },
    { category: 'groceries', hero: 'compact', title: 'Fresh from our market' },
  ];
  for (const variant of heroVariants) {
    const heroHtml = renderToString(React.createElement(Storefront, {
      config: normalizeCustomThemeConfig({
        theme_category: variant.category,
        theme_design: {
          profile: `hero-test-${variant.category}`,
          header: 'minimal',
          hero: variant.hero,
          productPresentation: 'dense',
          sectionOrder: ['hero'],
        },
        home_content: {
          hero_eyebrow: 'A store of our own',
          hero_title: variant.title,
          hero_description: 'Thoughtfully selected for our customers.',
          hero_image_url: 'https://cdn.example.test/storefront-hero.jpg',
          hero_button_label: 'Explore the collection',
        },
      }),
      page: 'home',
      viewportWidth: 1024,
    }));
    log(`${variant.category} theme renders merchant-authored hero copy`, heroHtml.includes(variant.title));
    log(`${variant.category} theme renders the merchant hero image and action`,
      heroHtml.includes('https://cdn.example.test/storefront-hero.jpg') && heroHtml.includes('Explore the collection'));
  }

  const socialConfig = normalizeCustomThemeConfig({
    social: {
      instagram: 'https://instagram.com/merchant',
      facebook: 'https://facebook.com/merchant',
    },
    social_settings: {
      alignment: 'center',
      style: 'soft',
      shape: 'rounded',
      visibility: { facebook: false },
    },
  });
  const socialHtml = renderToString(React.createElement(Storefront, {
    config: socialConfig, page: 'home', viewportWidth: 1024,
  }));
  log('social URLs render in the storefront footer', socialHtml.includes('https://instagram.com/merchant'));
  log('per-network visibility hides a linked social icon', !socialHtml.includes('https://facebook.com/merchant'));
  log('social presentation settings control alignment, style, and shape',
    socialHtml.includes('justify-center') && socialHtml.includes('bg-[#FCE7F3]') && socialHtml.includes('rounded-xl'));

  /* Arrays must REPLACE, not merge index-wise, or a merchant cannot shorten a
     list: deleting a bullet from a three-item list used to leave the rest in
     place and could never produce an empty one. */
  const shortened = mergeThemeConfig(
    { list: ['a', 'b', 'c'] },
    { list: ['a', 'c'] },
  );
  log('an array override replaces rather than merges', shortened.list.join() === 'a,c', shortened.list.join());
  const emptied = mergeThemeConfig({ list: ['a', 'b'] }, { list: [] });
  log('an array can be emptied entirely', Array.isArray(emptied.list) && emptied.list.length === 0);

  /* Emptying a copy section must hide it, not leave an empty shell behind. */
  const noTrust = normalizeCustomThemeConfig({ trust_badges: { secured: '', delivery: '', payment: '' } });
  const trustHtml = renderToString(React.createElement(Storefront, { config: noTrust, page: 'home', viewportWidth: 1024 }));
  log('clearing every trust badge hides the strip', !trustHtml.includes('GH Secured'));

  const noStats = normalizeCustomThemeConfig({ about_content: { stats: [] } });
  const aboutHtml = renderToString(React.createElement(Storefront, { config: noStats, page: 'about', viewportWidth: 1024 }));
  log('clearing the stat tiles hides that row', !aboutHtml.includes('Happy customers'));

  const noBullets = normalizeCustomThemeConfig({ product_page: { feature_bullets: [] } });
  const prodHtml = renderToString(React.createElement(Storefront, { config: noBullets, page: 'product', viewportWidth: 1024 }));
  log('clearing the spec bullets hides that list', !prodHtml.includes('Colourfast natural dyes'));

  /* Buttons styling is consumed by useTokens().btn(). */
  log('button styling has schema defaults', typeof D.buttons?.shadow === 'boolean' && typeof D.buttons?.uppercase === 'boolean');
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);