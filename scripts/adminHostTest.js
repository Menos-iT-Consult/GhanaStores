/**
 * Admin subdomain verification.
 *
 * The super admin lives on its own host (admin.didwaghana.com). Two things must
 * hold, and this pins both:
 *
 *  1. Host classification. The admin host is platform traffic, never a tenant, and
 *     it is the ONLY host that claims to be the admin. A lookalike such as
 *     admin.didwaghana.com.evil.com must not pass as the admin.
 *  2. The client mounts the admin app only on that host, and redirects /admin
 *     everywhere else. Before this, /admin rendered a fully-privileged sign-in
 *     form on every seller storefront and on the marketing site.
 *
 * classifyHost is pure, so this needs no database and no server.
 *
 * Usage: node scripts/adminHostTest.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminDomain, classifyHost, normalizeHost, platformDomain } from '../middleware/domainMiddleware.js';

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

console.log('\nDiDwa admin subdomain -> middleware/domainMiddleware.js\n');

/* ---------- The admin host is derived from the apex ---------- */
{
  const plat = platformDomain();
  log('the admin host is derived from the apex', adminDomain() === `admin.${plat}`, adminDomain());
  log('ADMIN_DOMAIN can override it', (() => {
    const saved = process.env.ADMIN_DOMAIN;
    process.env.ADMIN_DOMAIN = 'ops.example.com';
    const ok = adminDomain() === 'ops.example.com';
    if (saved === undefined) delete process.env.ADMIN_DOMAIN;
    else process.env.ADMIN_DOMAIN = saved;
    return ok;
  })());
  log('an override with a scheme is normalised', (() => {
    const saved = process.env.ADMIN_DOMAIN;
    process.env.ADMIN_DOMAIN = 'https://ops.example.com/';
    const ok = adminDomain() === 'ops.example.com';
    if (saved === undefined) delete process.env.ADMIN_DOMAIN;
    else process.env.ADMIN_DOMAIN = saved;
    return ok;
  })());
}

/* ---------- The admin host is the admin, and only it is ---------- */
{
  const admin = classifyHost(adminDomain());
  log('the admin host is recognised', admin.isAdminHost === true, adminDomain());
  log('the admin host is platform traffic, not a tenant',
    admin.isPlatformRoot === true && admin.slug === null && admin.isPlatformSubdomain === false);
  log('the admin host never resolves to a store', admin.slug === null);
}

for (const [label, host] of [
  ['the apex', platformDomain()],
  ['www', `www.${platformDomain()}`],
  ['api', `api.${platformDomain()}`],
  ['app', `app.${platformDomain()}`],
  ['a seller storefront', `kwame.${platformDomain()}`],
  ['a seller custom domain', 'kofifashion.com'],
  ['localhost', 'localhost'],
]) {
  log(`${label} is not the admin host`, classifyHost(host).isAdminHost === false, host);
}

/* A lookalike must not be mistaken for the admin. */
for (const [label, host] of [
  ['admin.apex.evil.com', `admin.${platformDomain()}.evil.com`],
  ['a nested admin label', `x.admin.${platformDomain()}`],
  ['an admin prefix', `adminx.${platformDomain()}`],
  ['a subdomain of the admin host', `shop.admin.${platformDomain()}`],
]) {
  const classified = classifyHost(host);
  log(`${label} cannot pass as the admin host`, classified.isAdminHost === false, host);
}

/* ...but a different SPELLING of the real admin host is still the admin host:
   DNS is case-insensitive and a Host header may carry a port. Rejecting those
   would hand the real admin host to someone else. */
log('the admin host with a port is still the admin host',
  classifyHost(`admin.${platformDomain()}:443`).isAdminHost === true);
log('the admin host in mixed case is still the admin host',
  classifyHost(`ADMIN.${platformDomain()}`).isAdminHost === true);
log('a port is stripped from a host', classifyHost(`admin.${platformDomain()}:443`).host === `admin.${platformDomain()}`);
log('an admin prefix is an ordinary store slug, not the admin',
  classifyHost(`adminx.${platformDomain()}`).slug === 'adminx');
log('normalizeHost handles a full URL',
  normalizeHost('https://admin.didwaghana.com/admin') === 'admin.didwaghana.com');
log('normalizeHost lowercases', normalizeHost('KWAME.DidWaghana.COM') === 'kwame.didwaghana.com');
log('an empty host is platform traffic, not the admin', classifyHost('').isAdminHost === false);

{
  const seller = classifyHost(`kwame.${platformDomain()}`);
  log('a seller subdomain still resolves to its store', seller.slug === 'kwame');
  log('a seller subdomain is not platform traffic', seller.isPlatformRoot === false);
}

/* ---------- The API reports the admin host to the client ---------- */
{
  const routes = read('routes/domainRoutes.js');
  log('resolve reports whether this is the admin host', /isAdminHost: Boolean\(req\.isAdminHost\)/.test(routes));
  log('resolve reports the canonical admin domain', /adminDomain: adminDomain\(\)/.test(routes));
  const middleware = read('middleware/domainMiddleware.js');
  log('the middleware attaches isAdminHost to the request',
    /req\.isAdminHost = classifyHost\(req\.headers\.host\)\.isAdminHost/.test(middleware));
}

/* ---------- The client mounts the admin app on that host only ---------- */
{
  const app = read('src/App.jsx');
  log('the client reads isAdminHost from the API', /isAdminHost: Boolean\(resolved\?\.isAdminHost\)/.test(app));
  log('the admin host renders the admin app for every path',
    /if \(onAdminHost\) \{[\s\S]{0,320}return page;/.test(app));
  log('the bare host root opens the admin overview', /route === '\/' \? '\/admin' : route/.test(app));
  log('/admin elsewhere redirects to the canonical admin host',
    /window\.location\.replace\(`https:\/\/\$\{adminDomain\}\/admin`\)/.test(app));
  log('localhost is exempt so the admin stays reachable in development',
    /const isLocalDev = host === 'localhost' \|\| host\.endsWith\('\.localhost'\)/.test(app));
  log('the redirect waits for the server to classify the host',
    /hostState\.status === 'pending' \|\| hostState\.status === 'error'/.test(app));
  log('the admin-host branch comes before the storefront branch',
    app.indexOf('if (onAdminHost) {') > 0
      && app.indexOf('if (onAdminHost) {') < app.indexOf('if (isTenantHost &&'));
}

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====\n`);
process.exit(fail === 0 ? 0 : 1);
