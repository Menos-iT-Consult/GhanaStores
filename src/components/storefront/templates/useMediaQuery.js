/**
 * components/storefront/templates/useMediaQuery.js
 * -----------------------------------------------------------------------------
 * Stable, subscription-based media-query hook shared by every template.
 *
 * Why it is a separate file:
 * - It is the client-side counterpart of `useTokens` (defined in
 *   `useTokens.js`). `useTokens` derives the *initial* tier from a flat
 *   `viewportWidth` value (used by the customizer preview frame and SSR),
 *   so that inlined SSR output looks identical to a real device.
 * - `useMediaQuery` re-subscribes to the resize/matchMedia event when the
 *   component re-renders and therefore drives live, interactive responsiveness.
 * - Keeping both files separate means the test suite can import the pure
 *   derivation path without loading a DOM, and no component ever calls
 *   `window.matchMedia` *before* mount.
 *
 * Returned shape:
 *   {
 *     ready: boolean,        // false during SSR / hydration until the client
 *                            //       resolves the first (as in Shopify's
 *                            //       `useDevicePixelRatio` early-return).
 *     tier: 'desktop' | 'tablet' | 'mobile' | 'unknown',
 *     width: number,
 *     query: string,         // raw media query for matching
 *     media: MediaQueryList, // for manual subscription if needed
 *   }
 *
 * Example template usage:
 *   const mq = useMediaQuery();
 *   if (!mq.ready) return null;               // do not render before mount
 *   if (mq.tier === 'tablet') return <Tabs />; // Shopify Tablet-first layout
 */

import { resolveDeviceForClient } from '../lib/device.js';

export function useMediaQuery() {
  // 1. SSR guard: do not emit `window`/`matchMedia` before the client has a
  //    chance to resolve a device. This app client-renders (no hydration), so
  //    the browser path may resolve immediately; only the server (and the
  //    render test's renderToString) takes this branch.
  if (typeof window === 'undefined') {
    return {
      ready: false,
      tier: 'unknown',
      width: 0,
      query: '(min-width: 769px)',
      media: null,
    };
  }

  // 2. Resolve against the actual measured viewport.
  const { tier, width, query, media, subscribe } = resolveDeviceForClient();

  return {
    ready: true,
    tier,
    width,
    query,
    media,
    subscribe,
  };
}
