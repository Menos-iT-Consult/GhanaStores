/**
 * Route table for the SPA (history API paths - see router.js).
 *
 * Kept in a plain module with no JSX so the table has a single source of truth
 * and can be unit-tested: anything not listed here renders NotFoundPage instead
 * of a login wall or, worse, a dashboard page the visitor never asked for.
 */

/**
 * Public marketing pages: no dashboard chrome, open to everyone.
 *
 * These are real routes, not anchors into one long marketing page: a visitor
 * (or a search engine) can link straight to pricing, features or how-it-works.
 */
export const PUBLIC_ROUTES = [
  '/', '/pricing', '/features', '/how-it-works', '/about', '/contact', '/terms', '/privacy',
];

/** Seller PWA + platform admin pages (auth-gated in App.jsx). */
export const PWA_ROUTES = [
  // Super admin hub: one entry point, then a page per platform area.
  '/admin',
  '/admin/merchants',
  '/admin/orders',
  '/admin/catalog',
  '/admin/customers',
  '/admin/payments',
  '/admin/logistics',
  '/admin/domains',
  '/admin/pricing',
  '/admin/plans',
  '/admin/themes',
  '/admin/team',
  '/admin/system',
  '/admin/audit',
  '/admin/contact',
  '/login',
  '/dashboard',
  '/pos',
  '/messages',
  '/settings/payments',
  '/settings/plan',
  '/inventory',
  '/orders',
  '/themes',
  '/dashboard/themes',
  '/dashboard/themes/customizer',
  '/domains',
  '/developer-guide',
];

/** Routes that carry a dynamic segment; the segment must not be empty. */
export const DYNAMIC_ROUTE_PREFIXES = [
  '/dashboard/themes/demo/',
  // A merchant's 360-degree view: /admin/merchants/<uuid>
  '/admin/merchants/',
];

const PUBLIC = new Set(PUBLIC_ROUTES);
const PWA = new Set(PWA_ROUTES);

const matchesPrefix = (value, prefixes) =>
  prefixes.some((prefix) => value.startsWith(prefix) && value.length > prefix.length);

/** True when `path` maps to a real page. */
export function isKnownRoute(path) {
  const value = String(path || '/');
  return PUBLIC.has(value) || PWA.has(value) || matchesPrefix(value, DYNAMIC_ROUTE_PREFIXES);
}

/** True for paths that belong to the seller PWA / admin area. */
export function isPwaRoute(path) {
  const value = String(path || '/');
  return PWA.has(value) || matchesPrefix(value, DYNAMIC_ROUTE_PREFIXES);
}
