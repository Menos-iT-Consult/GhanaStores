/**
 * components/storefront/Storefront.jsx
 * The storefront's page router. Renders one of six page bodies inside the
 * token-styled root, with the shared header and footer around them.
 *
 * This module is the storefront's public surface and the entry point for BOTH
 * the live shop (pages/LiveStorefront.jsx) and the theme customizer preview
 * frame. The pages themselves live under ./pages, and the shared chrome under
 * ./. Container-aware breakpoints are measured from the frame itself so every
 * page responds exactly like the real storefront on a physical device.
 *
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { scopeCss } from '../../theme/config.js';
import { useTokens } from './useTokens.js';
import StorefrontHeader from './StorefrontHeader.jsx';
import StorefrontFooter from './StorefrontFooter.jsx';
import HomeBody from './pages/HomeBody.jsx';
import ShopBody from './pages/ShopBody.jsx';
import ProductBody from './pages/ProductBody.jsx';
import CartBody from './pages/CartBody.jsx';
import AboutBody from './pages/AboutBody.jsx';
import ContactBody from './pages/ContactBody.jsx';
import { CART_ITEMS, DEMO_CATALOG } from './data.js';

/* Re-exported so existing importers of this module keep working. */
export { toDisplayProduct } from './mappers.js';
export { DEMO_PRODUCTS, PAYMENT_LABELS } from './data.js';
export { useTokens };

/* ------------------------------- Page router ------------------------------- */
const PAGE_BODIES = {
  home: HomeBody,
  shop: ShopBody,
  product: ProductBody,
  cart: CartBody,
  about: AboutBody,
  contact: ContactBody,
};
/**
 * StorefrontRouter - renders any storefront page inside the token-styled root,
 * for BOTH the customizer preview and the live shop.
 *
 * Backward compatible: `page` defaults to 'home' and `onNavigate` is optional,
 * so in-frame links become no-ops. Every data prop is optional too - with no
 * `products` the router paints the demo catalogue, which is exactly what
 * ThemeCustomizer passes.
 *
 * @param {object} props
 * @param {object} props.config The active storefront theme config.
 * @param {number|null} [props.viewportWidth] Measured container width, or null.
 * @param {string} [props.page] The page key to render.
 * @param {Function} [props.onNavigate] Page navigation callback.
 * @param {Array|null} [props.products] Real catalog products, or null for demo.
 * @param {Array} [props.cart] Live cart lines.
 * @param {*} [props.productId] The product to show on the detail page.
 * @param {Function|null} [props.onAddToCart] Add-to-cart callback.
 * @param {Function|null} [props.onSetQty] Cart quantity callback.
 * @param {Function|null} [props.onRemove] Cart remove callback.
 * @param {object|null} [props.checkout] Live checkout config.
 */
export default function StorefrontRouter({
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
}) {
  const t = useTokens(config, viewportWidth);
  const Body = PAGE_BODIES[page] || HomeBody;
  const nav = onNavigate || (() => {});
  const scoped = scopeCss(config.advanced?.custom_css);

  /* isLive separates a real shop from the demo frame: the demo keeps its own
     cart quantities, hides the COD form and keeps the promo/MoMo affordances. */
  const isLive = Boolean(products);
  const lines = isLive ? cart : CART_ITEMS;
  const ctx = {
    isLive,
    products: isLive ? products : DEMO_CATALOG,
    cart: lines,
    cartCount: lines.length,
    product: (isLive ? products : DEMO_CATALOG).find((p) => p.id === productId) || null,
    onAddToCart,
    onSetQty,
    onRemove,
    checkout,
  };

  return (
    <div
      data-gs-preview=""
      className="h-full w-full overflow-y-auto overflow-x-hidden"
      style={{
        '--primary': config.colors.primary,
        '--bg': config.colors.background,
        '--text': config.colors.text,
        '--accent': config.colors.accent,
        '--radius': config.layout.border_radius,
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: t.fontStack,
        fontSize: `${config.typography.body_size}px`,
      }}
      aria-label={`Live storefront preview - ${page} page`}
    >
      {scoped ? <style>{scoped}</style> : null}
      <StorefrontHeader t={t} active={page} onNavigate={nav} ctx={ctx} />
      <main style={{ minHeight: '60%' }}>
        <Body t={t} onNavigate={nav} ctx={ctx} />
      </main>
      <StorefrontFooter t={t} onNavigate={nav} />
    </div>
  );
}