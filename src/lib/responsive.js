/**
 * DiDwa - shared responsive primitives.
 *
 * Two separate problems live here, and conflating them is what caused the live
 * storefront to render a 4-column grid on a 360px phone.
 *
 * 1. REAL viewport (the dashboard, admin, marketing pages). Tailwind's
 *    sm/md/lg classes are correct for these: they are driven by the browser
 *    window. `useBreakpoint` exists for the rare case a component must branch in
 *    JavaScript rather than in CSS.
 *
 * 2. CONTAINER width (the storefront). The storefront is rendered inside fixed
 *    device frames in the theme customizer AND on a real phone. A media query
 *    there measures the WINDOW, not the 375px frame, so `sm:` would fire on a
 *    desktop preview. The storefront therefore measures its own container with
 *    a ResizeObserver. That is the only correct source for it.
 *
 * The three tiers match the storefront's own thresholds, so a phone, a tablet
 * and a desktop mean the same thing in both systems.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

/** Tier boundaries in px. Mirrors useTokens() in components/storefront. */
export const TIER = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
};

/** Widest value still treated as each tier. Mirrors the storefront's <480/<768. */
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
};

/**
 * Classify a pixel width into a tier.
 * @param {number} width
 * @returns {'mobile'|'tablet'|'desktop'}
 */
export function tierForWidth(width) {
  const w = Number(width);
  // An unknown or absent width is treated as desktop: that is the historical
  // fallback (the customizer with no measurement yet), and it is also the
  // safest choice for a screen reader / print context with no layout.
  if (!Number.isFinite(w) || w <= 0) return TIER.DESKTOP;
  if (w < BREAKPOINTS.mobile) return TIER.MOBILE;
  // 768 belongs to tablet, not desktop. The theme customizer's Tablet preset is
  // exactly 768px wide, so an exclusive bound made pressing "Tablet" render the
  // desktop layout - the button lied about what it was previewing. 769+ is
  // desktop, which is also where Tailwind's own `md:` and up start.
  if (w <= BREAKPOINTS.tablet) return TIER.TABLET;
  return TIER.DESKTOP;
}

/**
 * Measures an element's own width and classifies it into a tier.
 *
 * This is what the storefront uses, and it is deliberately NOT a media query:
 * the storefront renders both full-bleed (a real phone) and inside a fixed
 * 375px preview frame on a large monitor. Only the element's own width tells
 * the truth in both cases.
 *
 * @param {boolean} enabled Skip observing (the caller has no width to track).
 * @returns {{width:number, tier:string, isMobile:boolean, isTablet:boolean, isDesktop:boolean, ref:Function}}
 */
export function useContainerTier(enabled = true) {
  const [width, setWidth] = useState(0);
  const nodeRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const node = nodeRef.current;
    if (!node) return undefined;

    // ResizeObserver, not a window resize listener: this must react to a device
    // frame being resized and to a sidebar opening, neither of which fires a
    // window resize event.
    const measure = (w) => {
      const next = Math.round(w);
      // Ignore sub-pixel jitter so a scrollbar appearing does not re-render the
      // whole storefront into a different tier.
      setWidth((prev) => (Math.abs(prev - next) <= 1 ? prev : next));
    };

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) measure(entry.contentRect.width);
      });
      observer.observe(node);
      measure(node.getBoundingClientRect().width);
      return () => observer.disconnect();
    }

    // Safari < 13.1 fallback: the frame still resizes with the window.
    const onWindowResize = () => measure(node.getBoundingClientRect().width);
    onWindowResize();
    window.addEventListener('resize', onWindowResize);
    return () => window.removeEventListener('resize', onWindowResize);
  }, [enabled]);

  const tier = tierForWidth(width);
  return {
    width,
    tier,
    isMobile: tier === TIER.MOBILE,
    isTablet: tier === TIER.TABLET,
    isDesktop: tier === TIER.DESKTOP,
    ref: nodeRef,
  };
}

/**
 * The real browser viewport, for chrome that is not inside a measured frame
 * (the dashboard sidebar, the admin table).
 *
 * Prefer Tailwind classes. Reach for this only when a component genuinely has
 * to branch in JavaScript.
 */
export function useBreakpoint() {
  const query = useMemo(() => (typeof window !== 'undefined'
    ? window.matchMedia('(max-width: 767px)')
    : null), []);
  const [isMobile, setIsMobile] = useState(() => Boolean(query?.matches));

  useEffect(() => {
    if (!query) return undefined;
    const onChange = (e) => setIsMobile(e.matches);
    // Safari < 14 only has the deprecated addListener.
    if (query.addEventListener) query.addEventListener('change', onChange);
    else query.addListener(onChange);
    setIsMobile(query.matches);
    return () => {
      if (query.removeEventListener) query.removeEventListener('change', onChange);
      else query.removeListener(onChange);
    };
  }, [query]);

  return { isMobile, isDesktop: !isMobile };
}
