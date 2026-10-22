/**
 * components/storefront/templates/storefrontTypes.js
 * Layout archetype vocabulary for the 3-template storefront architecture.
 * JS + JSDoc (repo convention: web app is plain JSX, no TS toolchain).
 *
 * @typedef {'boutique_editorial'|'catalog_grid'|'flash_express'} StorefrontTemplate
 */

/** All valid template keys. */
export const TEMPLATE_KEYS = ['boutique_editorial', 'catalog_grid', 'flash_express'];

/**
 * Template metadata for marketplace grouping + customizer picker.
 */
export const TEMPLATE_META = {
  boutique_editorial: {
    key: 'boutique_editorial',
    label: 'Boutique Editorial',
    tagline: 'Luxury, fashion, handcrafted, lifestyle',
    description: 'Magazine-style full-bleed hero, asymmetric masonry, quick-view drawer.',
  },
  catalog_grid: {
    key: 'catalog_grid',
    label: 'Catalog Grid',
    tagline: 'Electronics, wholesale, large inventories',
    description: 'Dense sticky header, dual-card hero, 4-column grid, filter sidebar.',
  },
  flash_express: {
    key: 'flash_express',
    label: 'Flash Express',
    tagline: 'Food, grocery, drops, quick delivery',
    description: 'Ticker header, deal countdown, express list, sticky checkout bar.',
  },
};

/**
 * Is this a valid template key?
 * @param {*} v
 * @returns {v is StorefrontTemplate}
 */
export function isTemplateKey(v) {
  return TEMPLATE_KEYS.includes(v);
}

/**
 * Resolve which template a config paints with.
 * Order: explicit layout.template -> legacy fallback map -> default.
 *
 * Legacy map keeps all 100 existing seller themes rendering with zero
 * breakage while new picks are explicit.
 *
 * @param {object} config Active storefront theme config (customizer tokens).
 * @returns {StorefrontTemplate}
 */
export function resolveTemplate(config) {
  const explicit = config?.layout?.template;
  if (isTemplateKey(explicit)) return explicit;
  const cat = String(config?.category || config?.theme_category || '').toLowerCase();
  const card = String(config?.layout?.cardStyle || config?.layout?.card_style || '').toLowerCase();
  // fashion/beauty + minimal -> boutique
  if ((cat === 'fashion' || cat === 'beauty') && (card === 'minimal' || !card)) return 'boutique_editorial';
  // groceries + compact -> flash
  if (cat === 'groceries' && (card === 'compact' || !card)) return 'flash_express';
  // electronics/marketplace + bordered -> catalog
  return 'catalog_grid';
}

/**
 * Resolve the dedicated per-theme component for a theme ID.
 * Returns undefined if the theme ID is not registered, letting callers
 * fall back to legacy archetype resolution.
 *
 * @param {string|undefined} themeId Stable theme ID.
 * @returns {import('react').ComponentType|undefined}
 */
export async function resolveComponent(themeId) {
  const { THEME_COMPONENT_REGISTRY } = await import('./themeComponents/themeRegistry.js');
  return themeId ? THEME_COMPONENT_REGISTRY[themeId] : undefined;
}
