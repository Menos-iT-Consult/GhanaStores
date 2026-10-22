/**
 * components/storefront/templates/themeComponents/Themes/Theme92.jsx
 * Per-theme component for Theme 92 (groceries-jade_district-wide_nohero_list-extra_rounded).
 * Auto-generated - DO NOT EDIT BY HAND. Regenerate with:
 *   node scripts/gen-theme-wrappers.js
 */
import BaseThemeComponent from '../BaseThemeComponent.jsx';
import { THEME_DATA } from '../themeData.js';

const CONFIG = THEME_DATA.find((t) => t.id === "groceries-jade_district-wide_nohero_list-extra_rounded").config;

export default function Theme92({
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

Theme92.displayName = 'Theme92';
Theme92.themeId = "groceries-jade_district-wide_nohero_list-extra_rounded";
Theme92.themeName = "Theme 92";
Theme92.category = "groceries";
