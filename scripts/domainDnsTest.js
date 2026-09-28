/**
 * Custom-domain DNS instructions.
 *
 * The failure this guards: merchants were told to point an A record at
 * 104.16.0.1, which Cloudflare rejects with Error 1000 ("DNS points to
 * prohibited IP") - so a merchant who followed the instructions exactly still
 * ended up with a broken domain. Sellers must point BOTH the root (@) and www at
 * the Cloudflare for SaaS fallback origin with a CNAME (or ALIAS/ANAME), and the
 * platform must not emit an A record or a Vercel CNAME string anywhere.
 *
 * The contract has three consumers that can silently drift apart - the connect
 * response the UI renders, the /api/domains/verify instructions, and the target
 * the verifier accepts - so all of them are asserted from one source.
 *
 * Usage: node scripts/domainDnsTest.js   (no database, no network)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* The service owns the record contract. Credentials are cleared BEFORE it is
   imported so connectExistingDomain takes the deterministic dry-run path
   instead of calling Cloudflare. */
for (const key of [
  'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ZONE_ID', 'OPENPROVIDER_USERNAME',
  'OPENPROVIDER_PASSWORD', 'HUBTEL_CLIENT_ID', 'HUBTEL_CLIENT_SECRET',
  'DOMAIN_FALLBACK_ORIGIN',
]) delete process.env[key];
process.env.PLATFORM_DOMAIN = 'didwaghana.com';
const { classifyHost, resolveTenantStore } = await import('../middleware/domainMiddleware.js');

const domainService = (await import('../services/domainService.js')).default;
const svc = await import('../services/domainService.js');
const svcSource = fs.readFileSync(path.join(__dirname, '..', 'services', 'domainService.js'), 'utf8');
const mwSource = fs.readFileSync(path.join(__dirname, '..', 'middleware', 'domainMiddleware.js'), 'utf8');
const routesSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'domainRoutes.js'), 'utf8');
const { ROOT_CNAME_NOTE, dnsRecordsFor } = await import('../services/domainService.js');

console.log('\nDiDwa custom-domain DNS instructions -> services/domainService.js + src/pages/DomainManager.jsx\n');

/* ---------- The target is our own hostname, never a Cloudflare edge IP ---------- */
{
  log('the fallback origin is a hostname on our own zone',
    domainService.fallbackOrigin === 'fallback.didwaghana.com', domainService.fallbackOrigin);
  log('the fallback origin is not an IP address',
    !/^\d{1,3}(\.\d{1,3}){3}$/.test(domainService.fallbackOrigin));
}

/* ---------- The records the merchant is told to create ---------- */
{
  const records = dnsRecordsFor();
  log('exactly two records are instructed', records.length === 2);
  log('the first record is a CNAME at the root', records[0].type === 'CNAME' && records[0].host === '@');
  log('the second record is a CNAME at www', records[1].type === 'CNAME' && records[1].host === 'www');
  log('both records point at the fallback origin',
    records.every((r) => r.pointsTo === 'fallback.didwaghana.com'));
  log('no record is ever an A record', records.every((r) => r.type !== 'A'));
  log('ALIAS/ANAME is offered for registrars that forbid a root CNAME',
    /ALIAS or ANAME/.test(ROOT_CNAME_NOTE) && /point the CNAME to www/.test(ROOT_CNAME_NOTE));
}

/* ---------- The payload the API actually returns ---------- */
{
  const res = await domainService.connectExistingDomain({ storeId: 'test', domainName: 'MyBrand.com' });
  const dns = res.dnsTarget;

  log('the connect response carries the record list', Array.isArray(dns.records) && dns.records.length === 2);
  log('the connect response no longer advertises an A record', !('aRecord' in dns));
  log('the connect response points at the fallback origin',
    dns.fallbackOrigin === 'fallback.didwaghana.com' && dns.cnameRecord === 'fallback.didwaghana.com');
  log('the connect response carries the registrar note', dns.note === ROOT_CNAME_NOTE);

  const serialised = JSON.stringify(res);
  log('nothing in the response mentions the prohibited IP', !serialised.includes('104.16'));
  log('nothing in the response tells a merchant to use a Vercel CNAME', !/vercel/i.test(serialised));
}

/* ---------- What the table actually renders ---------- */
{
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  const { dnsRows, DNS_HELPER_NOTE } = await vite.ssrLoadModule('/src/pages/DomainManager.jsx');
  await vite.close();

  const payload = (await domainService.connectExistingDomain({ storeId: 't', domainName: 'x.com' })).dnsTarget;
  const rows = dnsRows(payload);

  log('the table renders exactly two rows', rows.length === 2, JSON.stringify(rows));
  log('row 1 is CNAME / @ / fallback.didwaghana.com',
    rows[0]?.type === 'CNAME' && rows[0]?.host === '@' && rows[0]?.pointsTo === 'fallback.didwaghana.com');
  log('row 2 is CNAME / www / fallback.didwaghana.com',
    rows[1]?.type === 'CNAME' && rows[1]?.host === 'www' && rows[1]?.pointsTo === 'fallback.didwaghana.com');
  log('no A row is ever rendered', rows.every((r) => r.type !== 'A'));
  log('the table note matches the API note exactly (no drift)', DNS_HELPER_NOTE === ROOT_CNAME_NOTE);

  /* An A row injected by an older payload must be dropped, not shown. */
  const polluted = dnsRows({
    records: [
      { type: 'A', host: '@', pointsTo: '104.16.0.1' },
      { type: 'CNAME', host: 'www', pointsTo: 'fallback.didwaghana.com' },
    ],
  });
  log('an A record in a legacy payload is dropped',
    polluted.length > 0 && polluted.every((r) => r.type !== 'A'), JSON.stringify(polluted));

  /* Older payloads only sent cnameRecord / fallbackOrigin. */
  const legacy = dnsRows({ cnameRecord: 'fallback.didwaghana.com' });
  log('an older payload still renders both CNAME rows',
    legacy.length === 2 && legacy.every((r) => r.type === 'CNAME' && r.pointsTo === 'fallback.didwaghana.com'));

  let threw = null;
  try { dnsRows(null); } catch (err) { threw = err; }
  log('a missing payload degrades instead of throwing', threw === null);
}

/* ---------- The component cannot reintroduce an A record ---------- */
{
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'DomainManager.jsx'), 'utf8');
  // Comments deliberately quote the IP we refuse to emit (and explain why), so
  // they are stripped before the scan: this guard is about rendered code.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  log('the component never reads dnsTarget.aRecord', !code.includes('aRecord'));
  log('the component never hard-codes 104.16.0.1', !code.includes('104.16.0.1'));
  log('the component never points a record at a Cloudflare edge IP', !/104\.1[6-9]\.\d+/.test(code));
  log('the component never tells a merchant to use a Vercel CNAME', !/vercel-dns/i.test(code));
}

/* ---------- "connected but Store Not Found": the www/apex mismatch ---------- */
// The regression this guards: a merchant connected a domain and got the branded
// Store Not Found page. Two spellings of one domain were stored and compared
// literally, so whichever form the merchant typed, the other 404'd.
{
  log('a www-prefixed input is canonicalised to the apex', svc.canonicalDomain('www.mybrand.com') === 'mybrand.com');
  log('case is normalised', svc.canonicalDomain('MyBrand.COM') === 'mybrand.com');
  log('a scheme and path are stripped', svc.canonicalDomain('https://www.mybrand.com/') === 'mybrand.com');
  log('a port is stripped', svc.canonicalDomain('mybrand.com:443') === 'mybrand.com');
  log('a real subdomain is NOT stripped', svc.canonicalDomain('shop.mybrand.com') === 'shop.mybrand.com');
  log('the www sibling is derivable', svc.wwwVariantOf('www.mybrand.com') === 'www.mybrand.com');
  log('the service is what normalises, not each caller', !/function cleanDomain/.test(svcSource));

  // The resolver must serve the apex and its www. spelling from one row.
  const apexStore = { id: 's1', name: 'A', subdomain_slug: 'a', custom_domain: 'pentvarsconnect.com', status: 'ACTIVE' };
  const resolveWith = async (host, row) => {
    const q = async (sql, params) => {
      if (!/custom_domain/.test(sql)) return { rows: [] };
      const wants = (Array.isArray(params[0]) ? params[0] : [params[0]]).map((v) => String(v).toLowerCase());
      return { rows: wants.includes(row.custom_domain) ? [row] : [] };
    };
    const req = { headers: { host, accept: 'text/html' }, path: '/' };
    const res = { status() { return this; }, json() { return this; } };
    await resolveTenantStore(req, res, () => {}, { query: q });
    return req.tenantStore?.id || null;
  };

  for (const host of ['pentvarsconnect.com', 'www.pentvarsconnect.com', 'WWW.PentVarsConnect.com']) {
    log(`an apex row serves ${host}`, await resolveWith(host, apexStore) === 's1');
  }
  // A row saved before normalisation must keep working after a deploy.
  const legacy = { ...apexStore, id: 's2', custom_domain: 'www.legacybrand.com' };
  log('a legacy www-prefixed row still resolves (apex host)', await resolveWith('legacybrand.com', legacy) === 's2');
  log('a legacy www-prefixed row still resolves (www host)', await resolveWith('www.legacybrand.com', legacy) === 's2');
  log('a host owned by nobody is still unresolved', await resolveWith('nobody.com', apexStore) === null);
  log('the resolver widens the lookup instead of rewriting the host', /ANY \(\$1::text\[\]\)/.test(mwSource));
  log('the resolver still excludes suspended stores', /status <> 'SUSPENDED'/.test(mwSource));

  // Both hostnames we instruct must actually be provisioned.
  log('the www hostname is registered with Cloudflare', /registerWwwVariant/.test(svcSource) && /wwwVariantOf\(apex\)/.test(svcSource));
  log('a failed www registration never fails the apex', /wwwRegistered: false/.test(svcSource));
  log('ownership checks are case-insensitive', !/WHERE custom_domain = \$1/.test(routesSource));
  log('ownership checks cover the www. spelling', /domainCandidates/.test(routesSource));

  // Every other place that looks a store up by host had the same literal
  // comparison, and each 404'd a domain the resolver had already matched.
  const orderSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'orderRoutes.js'), 'utf8');
  const themeSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'themeRoutes.js'), 'utf8');
  // Strip comments first: this guard is about SQL that ships, and the fix's
  // explanatory comments quote the old broken comparison on purpose.
  // Only a COMPARISON counts - `SET custom_domain = $2` is an assignment and is
  // correct; it was `WHERE custom_domain = $1` that broke.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  log('no case-sensitive custom_domain COMPARISON survives anywhere',
    [routesSource, orderSrc, themeSrc].every((s) => !/WHERE[^;]*?(^|[^_])custom_domain = \$/im.test(strip(s))));
  log('the storefront catalogue matches both spellings', /LOWER\(custom_domain\) = ANY/.test(routesSource));
  log('the storefront catalogue is case-insensitive', /LOWER\(subdomain_slug\) = LOWER/.test(routesSource));
  log('the public theme lookup normalises the slug', /canonicalDomain\(slug\)/.test(themeSrc));
  log('the checkout lookup normalises the slug', /canonicalDomain\(b\.slug\)/.test(orderSrc));
  log('the checkout lookup covers the www. spelling', /`www\.\$\{key\}`/.test(orderSrc));
  log('the theme lookup covers the www. spelling', /`www\.\$\{storeKey\}`/.test(themeSrc));
  log('every affected route imports the shared normaliser',
    /domainService\.js/.test(themeSrc) && /domainService\.js/.test(orderSrc));
}

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====\n`);
process.exit(fail === 0 ? 0 : 1);

