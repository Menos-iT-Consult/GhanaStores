/**
 * components/storefront/templates/themeComponents/Themes/Theme84.jsx
 * Per-theme component for Theme 84 (groceries-midnight_noir-wide_nohero_list-extra_rounded).
 * Auto-generated - DO NOT EDIT BY HAND. Regenerate with:
 *   node scripts/gen-theme-wrappers.js
 */
import BaseThemeComponent from '../BaseThemeComponent.jsx';
import { THEME_DATA } from '../themeData.js';

const CONFIG = THEME_DATA.find((t) => t.id === "groceries-midnight_noir-wide_nohero_list-extra_rounded").config;

export default function Theme84({
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

Theme84.displayName = 'Theme84';
Theme84.themeId = "groceries-midnight_noir-wide_nohero_list-extra_rounded";
Theme84.themeName = "Theme 84";
Theme84.category = "groceries";
