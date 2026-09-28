/**
 * BYOD custom-domain provisioning (POST /api/domains/add).
 *
 * The provisioning path is the one place where a mistake costs a merchant a
 * working storefront, so this guards the parts that are easy to get subtly
 * wrong and expensive to debug in production:
 *
 *  1. The Vercel leg runs FIRST, and a Cloudflare failure rolls it back. The
 *     reverse order leaves a hostname registered on the Edge Network with no
 *     Cloudflare custom hostname behind it.
 *  2. Cloudflare is asked for a DV cert validated over HTTP with TLS 1.2 as
 *     the floor. `dv` + `http` is the only combination that works before the
 *     merchant has pointed their DNS anywhere.
 *  3. The status written to Postgres is PENDING_DNS. The column is
 *     CHECK-constrained to upper case, so the lower-case `pending_dns` in the
 *     response contract would be rejected by the database.
 *  4. A hostname belongs to exactly one store. Without the guard a second
 *     merchant can claim a domain that is already serving another storefront.
 *  5. A domain is never ACTIVE on add: it becomes ACTIVE only after DNS
 *     verification, so a half-built storefront is never attached to a hostname.
 *
 * Usage: node scripts/domainProvisioningTest.js   (no database, no network)
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
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const service = read('services/domainService.js');
const routes = read('routes/domainRoutes.js');
const env = read('.env.example');
const add = routes.slice(routes.indexOf("router.post('/add'"), routes.indexOf("router.get('/verify-status'"));
const fn = service.slice(service.indexOf('export async function provisionCustomDomain'));

console.log('\nDiDwa BYOD provisioning -> services/domainService.js + routes/domainRoutes.js\n');

/* ---------- 1. Ordering and rollback ---------- */
{
  const vercelAt = fn.indexOf('registerDomainOnVercel(clean)');
  const cfAt = fn.indexOf('connectExistingDomain(');
  log('provisionCustomDomain exists', vercelAt !== -1);
  log('Vercel is called before Cloudflare', vercelAt > -1 && cfAt > vercelAt, `vercel@${vercelAt} cloudflare@${cfAt}`);
  log('a Cloudflare failure rolls the Vercel leg back', /catch \(err\) \{[\s\S]{0,200}removeDomainFromVercel\(clean\)/.test(fn));
  log('the rollback rethrows the original error', /removeDomainFromVercel\(clean\);\s*throw err;/.test(fn));
  log('rollback failures cannot mask the real error', /async function removeDomainFromVercel[\s\S]{0,700}catch \(err\) \{[\s\S]{0,200}console\.error/.test(service));
  log('the Cloudflare hostname is also removable', /cf\.delete\(`\/zones\/\$\{CLOUDFLARE_ZONE_ID\}\/custom_hostnames\//.test(service));
}

/* ---------- 2. Vercel request shape ---------- */
{
  log('Vercel is called on the project domains endpoint', /vc\.post\(`\/projects\/\$\{VERCEL_PROJECT_ID\}\/domains`, \{ name: clean \}\)/.test(service));
  log('the Vercel token is a bearer header', /Authorization: `Bearer \$\{VERCEL_AUTH_TOKEN\}`/.test(service));
  log('the Vercel base URL carries the API version', /api\.vercel\.com\/v\$\{VERCEL_API_VERSION\}/.test(service));
  log('the API version is not the retired v10', !/VERCEL_API_VERSION \|\| '10'/.test(service), 'defaults to 13');
  log('a team id is sent as a query param when set', /VERCEL_TEAM_ID\) config\.params = \{ \.\.\.config\.params, teamId: VERCEL_TEAM_ID \}/.test(service));
  log('an already-registered domain is treated as success', /err\.response\?\.status === 409[\s\S]{0,200}alreadyPresent: true/.test(service));
  log('an unconfigured Vercel skips instead of failing', /skipped: true, reason: 'not_configured'/.test(service));
  log('a real Vercel failure is not swallowed', /throw new Error\('We could not register your domain with our hosting provider/.test(service));
  log('the Vercel failure message leaks no provider text', !/throw new Error\(`[^`]*\$\{err\.message/.test(service));
}

/* ---------- 3. Cloudflare request shape ---------- */
{
  const cf = service.slice(service.indexOf('export async function connectExistingDomain'));
  log('the custom hostname is created on the zone', /cf\.post\(`\/zones\/\$\{CLOUDFLARE_ZONE_ID\}\/custom_hostnames`/.test(cf));
  log('the hostname is sent', /hostname: clean/.test(cf));
  log('the cert method is http (DNS not set up yet)', /method: 'http'/.test(cf));
  log('the cert type is dv', /type: 'dv'/.test(cf));
  log('min_tls_version is 1.2', /min_tls_version: '1\.2'/.test(cf));

/* ---------- 4. The route ---------- */
{
  log('POST /api/domains/add exists', add.length > 0);
  log('it requires a seller session', /router\.post\('\/add', requireSeller/.test(routes));
  log('it calls the provisioning service', /domainService\.provisionCustomDomain\(domainName, req\.auth\.sub\)/.test(add));
  log('it persists to store_domains', /INSERT INTO store_domains/.test(add));
  log('the stored provider is EXTERNAL', /'EXTERNAL'/.test(add));
  log('the status is upper-cased for the CHECK constraint', /toUpperCase\(\)/.test(add));
  log('a success is 201', /res\.status\(201\)/.test(add));
  log('the response carries success and domain', /success: true/.test(add) && /domain: provisioned\.domainName/.test(add));
  log('the response carries dnsRecords', /dnsRecords,/.test(add));
  log('each record exposes the `value` key from the contract', /\.map\(\(r\) => \(\{ \.\.\.r, value: r\.pointsTo \}\)\)/.test(add));
  log('records point at the fallback origin', /const FALLBACK_ORIGIN = domainService\.fallbackOrigin/.test(routes));
  log('no A record is ever emitted', !/type: 'A'/.test(add));
  log('a blank domain is a 400', /res\.status\(400\)\.json\(\{ error: 'domainName is required\.' \}\)/.test(add));
  log('a malformed domain is a 400', /DOMAIN_RE\.test\(domainName\)/.test(add));
  log('errors go to the normalizing middleware', /next\(err\)/.test(add));
  log('the old attach path still refuses to bypass verification', /Configure and verify the domain through/.test(routes));
}

/* ---------- 5. One domain, one store, never ACTIVE on add ---------- */
{
  log('a domain claimed by another store is a 409', /claimed\[0\]\.store_id !== req\.auth\.sub/.test(add) && /res\.status\(409\)/.test(add));
  // The lookup is by candidate LIST now, so the guard asserts the list, not a
  // single equality. The ownership check must still be case-insensitive.
  log('the ownership check queries by lower-cased name', /LOWER\(domain_name\) = ANY \(\$1::text\[\]\)/.test(add));
  log('the ownership check covers both spellings', /domainCandidates\(domainName\)/.test(add));
  log('the upsert cannot steal a row from another store', /WHERE store_domains\.store_id = EXCLUDED\.store_id/.test(add));
  log('the domain is stored PENDING_DNS, never ACTIVE', !/status: 'ACTIVE'/.test(add) && /'PENDING_DNS'/.test(add));
  log('the domain is not attached to the store on add', !/UPDATE stores SET custom_domain/.test(add));
  log('attachment still happens only in /verify', /UPDATE stores SET custom_domain = \$2/.test(routes));
  log('dry-run mode is reported to the caller', /dryRun: provisioned\.dryRun \|\| false/.test(add));
  log('the next step is spelled out for the merchant', /nextStep:/.test(add));
}

/* ---------- 6. Environment contract ---------- */
{
  for (const key of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ZONE_ID', 'VERCEL_AUTH_TOKEN', 'VERCEL_PROJECT_ID', 'VERCEL_TEAM_ID']) {
    log(`.env.example declares ${key}`, new RegExp(`^${key}=`, 'm').test(env));
  }
  log('Vercel keys are documented as optional', /Both keys are OPTIONAL/.test(env));
  log('the Vercel API version is configurable', /^VERCEL_API_VERSION=/m.test(env));
  log('every Vercel key is read from process.env', (service.match(/process\.env\.VERCEL_[A-Z_]+/g) || []).length >= 4);
  log('no Vercel secret is hard-coded', !/Bearer [a-z0-9]{20,}/i.test(service));
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);

  log('a Cloudflare failure throws a merchant-safe message', /throw new Error\('Failed to provision SSL hostname on Cloudflare/.test(cf));
}
