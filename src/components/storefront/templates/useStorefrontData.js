/**
 * components/storefront/templates/useStorefrontData.js
 * Shared engine: every storefront template consumes the SAME underlying
 * product feed. Extracted from StorefrontRouter's ctx construction so all
 * three templates (and all six pages) share one code path.
 *
 * @param {object} args
 * @param {Array|null} args.products Real catalog products, or null for demo.
 * @param {Array} [args.cart] Live cart lines.
 * @param {*} [args.productId] Product shown on the detail page.
 * @param {Function|null} [args.onAddToCart]
 * @param {Function|null} [args.onSetQty]
 * @param {Function|null} [args.onRemove]
 * @param {object|null} [args.checkout] Live checkout config.
 * @param {string|null} [args.storeSlug] Live store slug (null in preview).
 * @returns {object} The ctx every template + page body consumes.
 */
import { CART_ITEMS, DEMO_CATALOG } from '../data.js';

export function useStorefrontData({
  products = null,
  cart = [],
  productId = null,
  onAddToCart = null,
  onSetQty = null,
  onRemove = null,
  checkout = null,
  storeSlug = null,
} = {}) {
  /* isLive separates a real shop from the demo frame: the demo keeps its own
     cart quantities, hides the COD form and keeps the promo/MoMo affordances. */
  const isLive = Boolean(products);
  const lines = isLive ? cart : CART_ITEMS;
  const feed = isLive ? products : DEMO_CATALOG;
  return {
    isLive,
    products: feed,
    cart: lines,
    cartCount: lines.length,
    product: feed.find((p) => p.id === productId) || null,
    onAddToCart,
    onSetQty,
    onRemove,
    checkout,
    /* Only set on the LIVE shop. Page bodies must gate any write on isLive as
       well, so previewing a theme in the customizer cannot create real leads. */
    storeSlug,
  };
}
