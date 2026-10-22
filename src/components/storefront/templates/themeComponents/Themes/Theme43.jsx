/**
 * components/storefront/templates/themeComponents/Themes/Theme43.jsx
 * Per-theme component for Theme 43 (beauty-midnight_noir-compact_nohero_card-rounded).
 * Auto-generated - DO NOT EDIT BY HAND. Regenerate with:
 *   node scripts/gen-theme-wrappers.js
 */
import BaseThemeComponent from '../BaseThemeComponent.jsx';
import { THEME_DATA } from '../themeData.js';

const CONFIG = THEME_DATA.find((t) => t.id === "beauty-midnight_noir-compact_nohero_card-rounded").config;

export default function Theme43({
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

Theme43.displayName = 'Theme43';
Theme43.themeId = "beauty-midnight_noir-compact_nohero_card-rounded";
Theme43.themeName = "Theme 43";
Theme43.category = "beauty";
