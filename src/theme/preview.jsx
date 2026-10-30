/**
 * Theme-market previews rendered through the same StorefrontRenderer as live
 * shops. The market supplies deterministic demo products, while layout,
 * composition, typography, colors, and section order come from the selected
 * theme's real configuration.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Storefront from '../components/storefront/Storefront.jsx';
import { DEMO_CATALOG } from '../components/storefront/data.js';
import { templateToCustomizerTokens } from './config.js';

const CANVAS_W = 1200;
const DEFAULT_SECTIONS = ['hero', 'urgency', 'categories', 'products-grid', 'social-proof', 'cta-banner', 'footer'];

/** Retained for theme catalog checks and callers inspecting template ordering. */
export function orderedSections(config) {
  const sections = Array.isArray(config?.sections) ? config.sections : [];
  if (sections.length === 0) return DEFAULT_SECTIONS;
  return [...sections]
    .filter((section) => section && section.enabled !== false && DEFAULT_SECTIONS.includes(section.key))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((section) => section.key);
}

function themeTokens(theme, config) {
  const source = theme || {
    id: config?.themeId,
    name: config?.design?.name?.split(' · ')[0] || config?.seo?.defaultTitle || 'Storefront',
    category: config?.category,
    config,
  };
  return templateToCustomizerTokens(source);
}

/**
 * Render the actual storefront components at a fixed desktop canvas width.
 * The fixed width makes the card screenshot predictable; the real storefront's
 * own container queries still determine its desktop composition.
 */
export function ThemePreview({ config, theme, className = '' }) {
  const resolvedConfig = config || theme?.config || {};
  return (
    <Storefront
      config={themeTokens(theme, resolvedConfig)}
      products={DEMO_CATALOG}
      page="home"
      viewportWidth={CANVAS_W}
      className={`w-full overflow-hidden ${className}`}
      rootStyle={{
        height: 'auto',
        minHeight: 0,
        containerType: 'inline-size',
        containerName: 'storefront',
      }}
    />
  );
}

/**
 * Scaled thumbnail of the real storefront. Full preview and thumbnail share
 * StorefrontRenderer markup; only the outer scale differs.
 */
export function ThemeThumb({ config, theme, className = '' }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(0.28);
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);

  const measure = useCallback(() => {
    const element = wrapRef.current;
    if (!element) return;
    const next = element.clientWidth / CANVAS_W;
    if (next > 0) setScale(next);
  }, []);

  useEffect(() => {
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    const element = contentRef.current;
    if (element) setHeight(element.offsetHeight);
  }, [config, theme]);

  return (
    <div ref={wrapRef} className={`relative w-full overflow-hidden ${className}`} aria-hidden="true">
      <div
        style={{
          width: CANVAS_W,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <div ref={contentRef}>
          <ThemePreview config={config} theme={theme} />
        </div>
      </div>
      <div style={{ height: height ? height * scale : undefined }} />
    </div>
  );
}
