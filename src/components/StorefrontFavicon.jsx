/**
 * Per-store browser tab icon.
 *
 * The favicon in index.html is a single static file, so it can never differ
 * between tenant subdomains - every store would show the DiDwa mark. This
 * component swaps the <link rel="icon"> at runtime using the faviconUrl the
 * resolve endpoint returns for the tenant, and puts the platform icon back
 * whenever there is no tenant (marketing site, seller PWA, admin).
 *
 * The original tags are captured once and restored rather than removed, so
 * navigating between a storefront and the platform does not leave the document
 * with no icon at all.
 */
import { useEffect } from 'react';

const PLATFORM_ICON = '/didwa-logo.jpg?v=3';
const SELECTOR = 'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]';

let originals = null;

/** Point the tab at `href`, creating the tags on first use. */
export function applyFavicon(href) {
  if (typeof document === 'undefined') return;
  if (!originals) {
    originals = [...document.querySelectorAll(SELECTOR)].map((link) => ({
      rel: link.getAttribute('rel'),
      href: link.getAttribute('href'),
    }));
  }
  const targets = href
    ? [{ rel: 'icon', href }, { rel: 'shortcut icon', href }, { rel: 'apple-touch-icon', href }]
    : originals.map((entry) => ({ rel: entry.rel, href: entry.href }));

  for (const { rel, href: target } of targets) {
    if (!rel || !target) continue;
    let link = document.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', rel);
      document.head.appendChild(link);
    }
    // Cache-bust on the tenant's own URL so replacing a logo is not masked by
    // the browser's favicon cache; the platform icon keeps its version query.
    link.setAttribute('href', href ? target : target || PLATFORM_ICON);
  }
}

/** @param {string|null} faviconUrl - the tenant's icon, or null off-tenant. */
export default function StorefrontFavicon({ faviconUrl = null }) {
  useEffect(() => {
    applyFavicon(faviconUrl || null);
  }, [faviconUrl]);
  return null;
}
