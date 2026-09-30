/**
 * components/storefront/useTokens.js
 * Derived preview context shared by every storefront component: the responsive
 * tier and the values the pages read straight off the theme config.
 */
import { FONT_OPTIONS } from '../../theme/config.js';
import { tierForWidth } from '../../lib/responsive.js';

/**
 * Derive the shared render tokens for a theme config at a measured width.
 *
 * @param {object} config The active storefront theme config.
 * @param {number|null} viewportWidth The measured container width, or null when
 *   unmeasured (which is what the customizer's idle preview frame passes).
 * @returns {object} Tokens for the page bodies and shared chrome.
 */
export function useTokens(config, viewportWidth) {
  // tierForWidth is the single definition of the three tiers, shared with the
  // app shell via lib/responsive.js. It used to be re-derived here with its own
  // literals, so the storefront and the dashboard could disagree about what
  // "tablet" means.
  const tier = tierForWidth(viewportWidth);
  const compact = tier === 'mobile';
  const narrow = tier === 'tablet';
  const centered = config.layout.header_style === 'centered' || narrow || compact;
  return {
    c: config,
    compact,
    narrow,
    centered,
    gridColumns: Math.min(config.layout.product_grid_columns, compact ? 2 : narrow ? 3 : 4),
    footColumns: Math.min(config.footer.columns, compact ? 1 : narrow ? 2 : 4),
    fontStack: (FONT_OPTIONS.find((f) => f.value === config.typography.font_family) || FONT_OPTIONS[0]).stack,
    waDigits: String(config.features.whatsapp_number || '').replace(/\D/g, ''),
    btn: () => `${config.buttons?.shadow === false ? '' : 'shadow'} ${config.buttons?.uppercase ? 'uppercase tracking-wide' : ''}`,
  };
}