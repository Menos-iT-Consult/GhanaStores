/**
 * Client-side platform configuration.
 *
 * The apex used to build seller storefront URLs comes from the API, which owns
 * the truth: App.jsx adopts `platformDomain` from GET /api/domains/resolve (set
 * in middleware/domainMiddleware.js). VITE_PLATFORM_DOMAIN is only the
 * build-time fallback, because a value baked into an already-deployed bundle
 * used to leak a stale domain into the dashboard sidebar, the Domains page, the
 * legal copy and the admin tenant list.
 *
 * Accepted shapes for the fallback value:
 *   didwaghana.com              -> https://<slug>.didwaghana.com
 *   https://mybrand.com        -> https://<slug>.mybrand.com
 *   http://lvh.me:5173         -> http://<slug>.lvh.me:5173  (local dev)
 */
const RAW = String(import.meta.env.VITE_PLATFORM_DOMAIN || '').trim();
if (!RAW) {
  console.warn('[config] VITE_PLATFORM_DOMAIN is not set; using the apex reported by the API.');
}
const SCHEME = /^http:\/\//i.test(RAW) ? 'http' : 'https';

/** Normalises an apex: no protocol, no path, lowercase. A port is kept. */
function normalizeApex(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .replace(/\/+$/, '')
    .replace(/\.+$/, '');
}

/** Apex compiled into this bundle - used only until the API answers. */
const BUILD_TIME_DOMAIN = normalizeApex(RAW);

/** Apex reported by the API. Wins over the build-time value. */
let serverDomain = '';

/**
 * A non-standard port means a local dev origin (e.g. http://lvh.me:5173), where
 * the build-time value is deliberately pointed somewhere else, so the API must
 * not override it.
 */
function isDevOrigin() {
  if (typeof window === 'undefined' || !window.location) return false;
  const port = String(window.location.port || '');
  return Boolean(port) && port !== '80' && port !== '443';
}

/**
 * Adopt the apex reported by the API. Call it once per load from App.jsx.
 * @returns {boolean} true when this changed the apex storefront hosts are built from.
 */
export function setPlatformDomain(value) {
  const next = normalizeApex(value);
  if (!next || next === serverDomain || isDevOrigin()) return false;
  serverDomain = next;
  return true;
}

/**
 * The apex to build storefront hosts from: the API value when available, the
 * build-time value otherwise. Always call this at render time - never cache the
 * result in a module constant, or a late API answer will be ignored.
 */
export function getPlatformDomain() {
  return serverDomain || BUILD_TIME_DOMAIN;
}

/**
 * Build the seller's canonical storefront URL from persisted store data.
 * A custom domain wins; otherwise the automatically allocated slug is used.
 * No arbitrary fallback such as `shop` is permitted.
 */
export function storefrontUrl(storeOrSlug) {
  const store = typeof storeOrSlug === 'string'
    ? { subdomain_slug: storeOrSlug }
    : (storeOrSlug || {});
  const custom = String(store.custom_domain || store.customDomain || '').trim();
  const slug = String(store.subdomain_slug || store.subdomainSlug || '').trim();
  const apex = getPlatformDomain();
  const host = custom || (slug && apex ? `${slug}.${apex}` : '');
  return host ? `${SCHEME}://${host}` : '';
}
