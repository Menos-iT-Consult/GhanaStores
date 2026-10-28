/**
 * components/storefront/templates/themeComponents/Themes/Theme50.jsx
 * AUTO-GENERATED THEME WRAPPER - theme identity and design come from THEME_DATA.
 * Regenerate with:
 *   node scripts/gen-theme-wrappers.js
 */
import BaseThemeComponent from '../BaseThemeComponent.jsx';
import { THEME_BY_ID } from '../themeData.js';
import { mergeThemeConfig, normalizeCustomThemeConfig, templateToCustomizerTokens } from '../../../../../theme/config.js';

const THEME = THEME_BY_ID["beauty-jade_district-spacious_hero_minimal-subtle"];
const BASE_CONFIG = templateToCustomizerTokens({
  id: THEME.id,
  name: THEME.name,
  category: THEME.category,
  config: THEME.config,
});

export default function Theme50({
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

Theme50.displayName = 'Theme50';
Theme50.themeId = "beauty-jade_district-spacious_hero_minimal-subtle";
Theme50.themeName = "Petal & Clay";
Theme50.category = "beauty";
