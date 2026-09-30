/**
 * Route table verification for DiDwa.
 *
 * Guards the 404 surface: every page the app can navigate to must stay routable,
 * and anything else must be answered with "Page not found" instead of a login
 * wall or a dashboard page the visitor never asked for. Also cross-checks the
 * seller sidebar links so a renamed route cannot silently dead-end navigation.
 *
 * Usage: node scripts/routeTest.js   (no server and no database needed)
 */
import {
  DYNAMIC_ROUTE_PREFIXES, PWA_ROUTES, PUBLIC_ROUTES, isKnownRoute, isPwaRoute,
} from '../src/routes.js';

let pass = 0;
let fail = 0;

function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

/* Public links rendered by the marketing shell, welcome page and legal pages. */
const PUBLIC_LINKS = ['/', '/about', '/contact', '/terms', '/privacy'];

/* Links in the seller sidebar (DashboardLayout) - all auth-gated. */
const SIDEBAR_LINKS = ['/dashboard', '/pos', '/settings/payments', '/inventory', '/orders',
  '/dashboard/themes', '/domains', '/store-profile'];

console.log('\nDiDwa route table -> src/routes.js\n');

/* ---------- Every reachable path stays routable ---------- */
for (const path of [...PUBLIC_LINKS, ...SIDEBAR_LINKS, '/admin', '/login',
  '/dashboard/themes/customizer', '/dashboard/themes/demo/clean-slate']) {
  log(`routable ${path}`, isKnownRoute(path) === true);
}
/* ---------- The super admin hub: every area must have a real route ---------- */
/* These are the pages in src/pages/admin/. Each one has to be listed, or its
   sidebar entry would navigate into a 404 that looks like a broken platform. */
const ADMIN_ROUTES = [
  '/admin', '/admin/merchants', '/admin/orders', '/admin/catalog', '/admin/customers',
  '/admin/payments', '/admin/logistics', '/admin/domains', '/admin/pricing',
  '/admin/themes', '/admin/team', '/admin/system', '/admin/audit',
];
for (const path of ADMIN_ROUTES) {
  log(`admin routable ${path}`, isKnownRoute(path) === true);
  log(`admin pwa-gated ${path}`, isPwaRoute(path) === true);
}

/* A merchant's 360-degree view is dynamic, so the id must be non-empty. */
log('admin merchant detail is routable',
  isKnownRoute('/admin/merchants/2f0b1c3a-1111-2222-3333-444455556666') === true);
log('admin merchant detail without an id is a 404',
  isKnownRoute('/admin/merchants/') === false);
log('an unknown admin area is a 404', isKnownRoute('/admin/nonsense') === false);
log('an admin sub-area is not a public route', isPwaRoute('/admin') !== false);

/* ---------- Everything else is a 404, never a login wall ---------- */
for (const path of ['/nonsense', '/dashboards', '/POS', '/product/42', '/login/extra',
  '/dashboard/nope', '/dashboard/themes/demo', '/dashboard/themes/demo/',
  '/verify/abc123', '/api/domains/resolve']) {
  log(`404 ${path}`, isKnownRoute(path) === false);
}

/* ---------- PWA vs public drives the auth gate ---------- */
for (const path of SIDEBAR_LINKS) {
  log(`pwa route ${path}`, isPwaRoute(path) === true);
}
for (const path of PUBLIC_LINKS) {
  log(`public route ${path}`, isPwaRoute(path) === false);
}

/* ---------- Defensive: a malformed path must not throw ---------- */
log("empty path treated as '/'", isKnownRoute('') === true);
log('undefined path treated as /', isKnownRoute(undefined) === true);

/* ---------- Table hygiene ---------- */
log('no duplicate public routes', new Set(PUBLIC_ROUTES).size === PUBLIC_ROUTES.length);
log('no duplicate pwa routes', new Set(PWA_ROUTES).size === PWA_ROUTES.length);
log('dynamic prefixes end with a slash', DYNAMIC_ROUTE_PREFIXES.every((p) => p.endsWith('/')));
log('every sidebar link is in the table', SIDEBAR_LINKS.every((p) => PWA_ROUTES.includes(p)));

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====\n`);
process.exit(fail === 0 ? 0 : 1);
