/**
 * components/storefront/templates/themeComponents/Themes/Theme27.jsx
 * AUTO-GENERATED THEME WRAPPER - theme identity and design come from THEME_DATA.
 * Regenerate with:
 *   node scripts/gen-theme-wrappers.js
 */
import BaseThemeComponent from '../BaseThemeComponent.jsx';
import { THEME_BY_ID } from '../themeData.js';
import { mergeThemeConfig, normalizeCustomThemeConfig, templateToCustomizerTokens } from '../../../../../theme/config.js';

const THEME = THEME_BY_ID["electronics-golden_hour-compact_nohero_card-rounded"];
const BASE_CONFIG = templateToCustomizerTokens({
  id: THEME.id,
  name: THEME.name,
  category: THEME.category,
  config: THEME.config,
});

export default function Theme27({
  config: activeConfig = null,
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
  const config = activeConfig
    ? {
      ...normalizeCustomThemeConfig(mergeThemeConfig(BASE_CONFIG, activeConfig)),
      theme_design: BASE_CONFIG.theme_design,
      theme_id: THEME.id,
      theme_category: THEME.category,
    }
    : BASE_CONFIG;
  return (
    <BaseThemeComponent
      config={config}
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

Theme27.displayName = 'Theme27';
Theme27.themeId = "electronics-golden_hour-compact_nohero_card-rounded";
Theme27.themeName = "Power District";
Theme27.category = "electronics";
