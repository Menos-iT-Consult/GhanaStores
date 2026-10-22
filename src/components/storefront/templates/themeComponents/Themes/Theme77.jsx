/**
 * components/storefront/templates/themeComponents/Themes/Theme77.jsx
 * Per-theme component for Theme 77 (marketplace-coral_blush-dense_hero_bordered-crisp).
 * Auto-generated - DO NOT EDIT BY HAND. Regenerate with:
 *   node scripts/gen-theme-wrappers.js
 */
import BaseThemeComponent from '../BaseThemeComponent.jsx';
import { THEME_DATA } from '../themeData.js';

const CONFIG = THEME_DATA.find((t) => t.id === "marketplace-coral_blush-dense_hero_bordered-crisp").config;

export default function Theme77({
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

Theme77.displayName = 'Theme77';
Theme77.themeId = "marketplace-coral_blush-dense_hero_bordered-crisp";
Theme77.themeName = "Theme 77";
Theme77.category = "marketplace";
