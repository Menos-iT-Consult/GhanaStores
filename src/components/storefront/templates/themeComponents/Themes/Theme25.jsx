/**
 * components/storefront/templates/themeComponents/Themes/Theme25.jsx
 * AUTO-GENERATED THEME WRAPPER - theme identity and design come from THEME_DATA.
 * Regenerate with:
 *   node scripts/gen-theme-wrappers.js
 */
import BaseThemeComponent from '../BaseThemeComponent.jsx';
import { THEME_BY_ID } from '../themeData.js';
import { mergeThemeConfig, normalizeCustomThemeConfig, templateToCustomizerTokens } from '../../../../../theme/config.js';

const THEME_ID = "groceries-coral_blush-wide_nohero_list-extra_rounded";
const THEME_CATEGORY = "groceries";
const THEME = THEME_BY_ID[THEME_ID];
const BASE_CONFIG = THEME ? templateToCustomizerTokens({
  id: THEME.id,
  name: THEME.name,
  category: THEME.category,
  config: THEME.config,
}) : null;

export default function Theme25({
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
  const config = BASE_CONFIG
    ? activeConfig
      ? {
        ...normalizeCustomThemeConfig(mergeThemeConfig(BASE_CONFIG, activeConfig)),
        theme_design: BASE_CONFIG.theme_design,
        theme_id: THEME_ID,
        theme_category: THEME_CATEGORY,
      }
      : BASE_CONFIG
    : normalizeCustomThemeConfig({
      ...activeConfig,
      theme_id: activeConfig?.theme_id || THEME_ID,
      theme_category: activeConfig?.theme_category || THEME_CATEGORY,
    });
  if (!BASE_CONFIG) {
    console.error(`[storefront] Catalog entry missing for ${THEME_ID}; rendering with available storefront config.`);
  }
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

Theme25.displayName = 'Theme25';
Theme25.themeId = "groceries-coral_blush-wide_nohero_list-extra_rounded";
Theme25.themeName = "The Provision Room";
Theme25.category = "groceries";
