/**
 * components/storefront/lib/device.js
 * -----------------------------------------------------------------------------
 * Device-aware orchestration for the DI-DWA storefront.
 *
 * Shopify Online Store 2.0 / headless pattern: instead of baking a single
 * media-query breakpoint into the template file, the theme resolves *device*
 * once at render time and passes the resolved tier into the DOM via CSS
 * custom properties + a stable `data-device` attribute. Templates respond to
 * the device object, which keeps them presentation-neutral and lets a seller
 * add a template without touching the responsive logic.
 *
 * Tiers mirror the Tailwind 3 default scale + Shopify's "phone / tablet /
 * desktop" heuristic:
 *   - desktop : >= 1024px  (Shopify "desktop" default)
 *   - tablet  : >= 768px and < 1024px
 *   - mobile  : < 768px
 *
 * Overrides (Shopify POS-style use-case): a seller can override the tablet
 * threshold per theme in config.layout.device_overrides.
 */

import { tierForWidth, BREAKPOINTS } from '../../../lib/responsive.js';

/**
 * Canonical top-level device tiers.
 * Order matters: iterate from the widest to the narrowest.
 * Bounds mirror lib/responsive.js BREAKPOINTS (+1px, since BREAKPOINTS stores
 * the WIDEST value still treated as the narrower tier).
 */
export const DEVICE_TIERS = [
  { key: 'desktop', minWidth: BREAKPOINTS.tablet + 1, label: 'Desktop' },
  { key: 'tablet',  minWidth: BREAKPOINTS.mobile + 1, label: 'Tablet' },
  { key: 'mobile',  minWidth: 0,                       label: 'Mobile' },
];

/**
 * The custom property names that are exposed to CSS so templates can opt
 * into device-aware behaviour without re-deriving the breakpoints in JS.
 */
export const DEVICE_PROPS = {
  DEV: '--s-device',
  TIER: '--s-device-tier',
  MIN_W: '--s-device-min-width',
};

/**
 * Resolve the device tier for a given viewport width.
 *
 * @param {number|null} width - The measured viewport/container width in px.
 * @returns {string} One of `desktop`, `tablet`, `mobile`, or `unknown`.
 */
export function resolveDevice(width) {
  if (typeof width !== 'number' || Number.isNaN(width)) return 'unknown';

  // 1. Merchant / theme-level override (Shopify Online Store 2.0 config
  //    ships `theme.settings.device_breakpoints`; we expose the mirror here).
  //    NOTE: the old guard compared `typeof x > 'number'`, which is never true
  //    (typeof yields a string), so the override branch was dead on arrival.
  const overrides =
    typeof window !== 'undefined' &&
    window.__didwaDeviceOverrides &&
    window.__didwaDeviceOverrides;
  if (overrides && typeof overrides.tabletFrom === 'number') {
    // Desktop needs its own bound too; without one the override could never
    // return 'desktop' at any width. Default it 256px past the tablet bound.
    const desktopFrom = typeof overrides.desktopFrom === 'number'
      ? overrides.desktopFrom
      : overrides.tabletFrom + 256;
    if (width >= desktopFrom) return 'desktop';
    if (width >= overrides.tabletFrom) return 'tablet';
    return 'mobile';
  }

  // 2. Shared app definition (lib/responsive.js). device.js used to re-derive
  //    its own 768/1024 literals here - the same duplication useTokens was
  //    already fixed for - so a 600px viewport was 'mobile' by one system and
  //    'tablet' by the other.
  return tierForWidth(width);
}

/**
 * Pre-compute the inclusive min-width for a tier so templates can derive
 * scale-down values via `calc()` without touching JS.
 */
export function tierMinWidth(tierKey) {
  const tier = DEVICE_TIERS.find((t) => t.key === tierKey);
  return tier ? tier.minWidth : 0;
}

/**
 * Return an object consumable by `useMediaQuery` that resolves lazily on the
 * client (server renders `unknown`).
 */
export function resolveDeviceForClient() {
  if (typeof window === 'undefined') return { tier: 'unknown', width: 0 };

  const width = window.innerWidth;
  const query = `(min-width: ${DEVICE_TIERS[0].minWidth}px)`;
  const match = window.matchMedia(query);
  // Last resolved tier. Doubles as the "resolved at least once" marker that
  // useMediaQuery used to gate on (it previously read window.__didwaDevice
  // BEFORE anything could ever set it, so the gate could never pass).
  window.__didwaDevice = resolveDevice(width);

  return {
    tier: window.__didwaDevice,
    width,
    media: match,
    query,
    subscribe: (onChange) => {
      // A single matchMedia query fires at only ONE boundary, so a phone
      // growing past 480 (mobile -> tablet) would never notify. Window resize
      // covers every crossing; the tier guard keeps the callback silent
      // unless the tier actually changed (resize fires continuously while
      // dragging, but the handler is then O(1) and state updates stay rare).
      const handler = () => {
        const next = resolveDevice(window.innerWidth);
        if (next === window.__didwaDevice) return;
        window.__didwaDevice = next;
        onChange(next);
      };
      window.addEventListener('resize', handler, { passive: true });
      return () => window.removeEventListener('resize', handler);
    },
  };
}
