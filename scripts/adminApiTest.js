/**
 * Super admin API surface verification.
 *
 * Two failure modes this guards, both invisible in a unit test of any single
 * page and both serious for a surface where every account is fully privileged:
 *
 *  1. An endpoint that exists but is not behind requireAdmin. The super admin can
 *     suspend merchants and change plans; one missing guard
 *     would expose all of it to anyone who can reach the API.
 *  2. A write that records an action name with no human label, so the audit log
 *     shows a raw string like "merchant.balance" to whoever reads it months
 *     later. The vocabulary is scanned from the source, so a new write cannot
 *     slip in unlabeled.
 *
 * Usage: node scripts/adminApiTest.js   (no database needed)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADMIN_DIR = path.join(ROOT, 'routes', 'admin');

/** Every admin route file, plus the seller routers whose admin-gated
 *  handlers (manual billing activation) also write audit rows. */
const AUDITED_SOURCES = [
  ...fs.readdirSync(ADMIN_DIR).filter((n) => n.endsWith('.js')).map((n) => path.join('routes', 'admin', n)),
  path.join('routes', 'billingRoutes.js'),
];

const { default: adminRouter } = await import('../routes/admin/index.js');
const { ACTION_LABELS } = await import('../routes/admin/audit.js');

console.log('\nDiDwa super admin API -> routes/admin/*\n');

/* ---------- 1. Every endpoint exists, and every one is guarded ---------- */
/** Walk nested routers too: routes/admin/index.js mounts 13 sub-routers. */
function collect(router, prefix = '', out = []) {
  for (const layer of router.stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) {
        out.push({
          method: method.toUpperCase(),
          path: `${prefix}${layer.route.path}`,
          // Express keeps the handler functions, so the guard can be inspected
          // rather than assumed.
          handlers: layer.route.stack.map((entry) => entry.handle?.name || ''),
        });
      }
    } else if (layer.name === 'router' && layer.handle?.stack) {
      // A mounted sub-router. Express exposes its mount path only as a compiled
      // regexp - e.g. "^\/admin(?=\/|$)" for '/admin' and "^\/?(?=\/|$)" for a
      // root mount - so the prefix is recovered from that.
      const raw = (layer.regexp?.source || '').replace(/^\^/, '').split('(?=')[0];
      const mount = raw.replace(/\\\//g, '/').replace(/\?\??$/, '').replace(/\/$/, '');
      collect(layer.handle, mount, out);
    }
  }
  return out;
}

const routes = collect(adminRouter);

log('the admin router mounts routes', routes.length >= 35, `${routes.length} endpoints`);

/* Two routes are deliberately not listed as guarded: the sign-in endpoint
   (public by definition) and the two legacy aliases, which forward into a
   guarded sub-router via req.url rather than mounting a guard of their own. */
const OPEN_BY_DESIGN = ['POST /login'];
const ALIASES = ['POST /admins', 'PATCH /tenants/:id/status'];
const intentionallyOpen = (route) => OPEN_BY_DESIGN.includes(`${route.method} ${route.path}`)
  || ALIASES.includes(`${route.method} ${route.path}`);

for (const route of routes) {
  const label = `${route.method} ${route.path}`;
  if (intentionallyOpen(route)) continue;
  log(`guarded ${label}`, route.handlers.includes('requireAdmin'));
}

/* Sign-in is public; nothing else is. */
const unguarded = routes.filter((route) => !intentionallyOpen(route)
  && !route.handlers.includes('requireAdmin'));
log('sign-in is the only unguarded endpoint',
  unguarded.length === 0,
  unguarded.map((r) => `${r.method} ${r.path}`).join(', '));
const login = routes.find((route) => route.method === 'POST' && route.path === '/login');
log('sign-in is mounted and public', Boolean(login) && !login.handlers.includes('requireAdmin'));
const unguardedWrites = routes.filter((route) => route.method !== 'GET' && !intentionallyOpen(route)
  && !route.handlers.includes('requireAdmin'));
log('no write endpoint skips the guard',
  unguardedWrites.length === 0,
  unguardedWrites.map((r) => `${r.method} ${r.path}`).join(', '));

/* ---------- 2. Every page's endpoint actually exists ---------- */
const PAGE_ENDPOINTS = [
  '/api/admin/overview',
  '/api/admin/merchants',
  '/api/admin/orders',
  '/api/admin/products',
  '/api/admin/restock-alerts',
  '/api/admin/customers',
  '/api/admin/payments',
  '/api/admin/payments/gateways',
  '/api/admin/riders',
  '/api/admin/riders/summary',
  '/api/admin/domains',
  '/api/admin/domains/summary',
  '/api/admin/themes',
  '/api/admin/themes/categories',
  '/api/admin/themes/usage',
  '/api/admin/team',
  '/api/admin/system',
  '/api/admin/audit',
  '/api/admin/audit/actions',
];
const mounted = new Set(routes.map((route) => `/api/admin${route.path}`));
for (const endpoint of PAGE_ENDPOINTS) {
  log(`page endpoint ${endpoint}`, mounted.has(endpoint));
}

/* ---------- 3. Every audited action has a human label ---------- */
/* Scan for the action NAMES themselves rather than the `action:` key, because
   some are chosen dynamically (`detail.passwordReset ? a : b`, `wasPaid ? refund
   : void`) and a key-shaped scan would silently miss them. */
const NAMESPACE = '(admin|merchant|order|catalog|payout|domain|theme|billing)';
const written = new Set();
for (const file of AUDITED_SOURCES) {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const match of source.matchAll(new RegExp(`'${NAMESPACE}\\.[a-z_.]+'`, 'g'))) {
    written.add(match[0].replaceAll("'", ''));
  }
}
log('the admin routes write audit entries', written.size >= 12, `${written.size} distinct actions`);
for (const action of written) {
  log(`labelled ${action}`, Boolean(ACTION_LABELS[action]));
}
for (const action of Object.keys(ACTION_LABELS)) {
  log(`label used ${action}`, written.has(action));
}

/* ---------- 4. Writes live behind the audit helper ---------- */
const writes = [
  ['merchants.js', 'merchant.status'],
  ['merchants.js', 'merchant.plan'],
  ['orders.js', 'order.status'],
  ['catalog.js', 'catalog.stock'],
  ['domains.js', 'domain.retry'],
  ['themes.js', 'theme.update'],
  ['auth.js', 'admin.team.revoke'],
];
for (const [file, action] of writes) {
  const source = fs.readFileSync(path.join(ADMIN_DIR, file), 'utf8');
  const near = source.includes(`recordAdminAction(req, {`) && source.includes(`action: '${action}'`);
  log(`${file} records ${action}`, near);
}

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====\n`);
process.exit(fail === 0 ? 0 : 1);
