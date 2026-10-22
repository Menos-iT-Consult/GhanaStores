/**
 * components/storefront/templates/themeComponents/Themes/Theme33.jsx
 * Per-theme component for Theme 33 (electronics-azure_mist-dense_hero_bordered-crisp).
 * Auto-generated - DO NOT EDIT BY HAND. Regenerate with:
 *   node scripts/gen-theme-wrappers.js
 */
import BaseThemeComponent from '../BaseThemeComponent.jsx';
import { THEME_DATA } from '../themeData.js';

const CONFIG = THEME_DATA.find((t) => t.id === "electronics-azure_mist-dense_hero_bordered-crisp").config;

export default function Theme33({
  viewportWidth,
  page = 'home',
  onNavigate,
  products,
  cart,
  productId,
  onAddToCart,
  onSetQty,
  onRemove,
  checkout,
  storeSlug,
  shopShortcut,
  setShopShortcut,
}) {
  return (
    <BaseThemeComponent
      config={CONFIG}
      viewportWidth={viewportWidth}
      page={page}
      onNavigate={onNavigate}
      products={products}
      cart={cart}
      productId={productId}
      onAddToCart={onAddToCart}
      onSetQty={onSetQty}
      onRemove={onRemove}
      checkout={checkout}
      storeSlug={storeSlug}
      shopShortcut={shopShortcut}
      setShopShortcut={setShopShortcut}
    />
  );
}

Theme33.displayName = 'Theme33';
Theme33.themeId = "electronics-azure_mist-dense_hero_bordered-crisp";
Theme33.themeName = "Theme 33";
Theme33.category = "electronics";
