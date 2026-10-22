/**
 * components/storefront/templates/themeComponents/Themes/Theme100.jsx
 * Per-theme component for Theme 100 (groceries-coral_blush-wide_nohero_list-extra_rounded).
 * Auto-generated - DO NOT EDIT BY HAND. Regenerate with:
 *   node scripts/gen-theme-wrappers.js
 */
import BaseThemeComponent from '../BaseThemeComponent.jsx';
import { THEME_DATA } from '../themeData.js';

const CONFIG = THEME_DATA.find((t) => t.id === "groceries-coral_blush-wide_nohero_list-extra_rounded").config;

export default function Theme100({
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

Theme100.displayName = 'Theme100';
Theme100.themeId = "groceries-coral_blush-wide_nohero_list-extra_rounded";
Theme100.themeName = "Theme 100";
Theme100.category = "groceries";
