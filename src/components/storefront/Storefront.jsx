/**
 * components/storefront/Storefront.jsx
 * The storefront's page router. Renders one of six page bodies inside the
 * token-styled root, with the shared header and footer around them.
 *
 * This module is the storefront's public surface and the entry point for BOTH
 * the live shop (pages/LiveStorefront.jsx) and the theme customizer preview
 * frame. The pages themselves live under ./pages, and the shared chrome under
 * ./. Container-aware breakpoints are measured from the frame itself so every
 * page responds exactly like the real storefront on a physical device.
 *
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { scopeCss } from '../../theme/config.js';
import { useTokens } from './useTokens.js';
import StorefrontRenderer from './templates/StorefrontRenderer.jsx';

/* Re-exported so existing importers of this module keep working. */
export { toDisplayProduct } from './mappers.js';
export { DEMO_PRODUCTS, PAYMENT_LABELS } from './data.js';
export { useTokens };
export { default as StorefrontRenderer, BoutiqueHome, CatalogHome, FlashHome } from './templates/StorefrontRenderer.jsx';
export { resolveTemplate, TEMPLATE_KEYS, TEMPLATE_META, isTemplateKey } from './templates/storefrontTypes.js';
export { useStorefrontData } from './templates/useStorefrontData.js';

/* ------------------------------- Page router ------------------------------- */
/**
 * StorefrontRouter - thin compat wrapper. Delegates to StorefrontRenderer so
 * LiveStorefront + ThemeCustomizer keep working unchanged.
 * (Same props contract; see templates/StorefrontRenderer.jsx.)
 */
export default function StorefrontRouter(props) {
  return <StorefrontRenderer {...props} />;
}