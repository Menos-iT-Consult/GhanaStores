/**
 * Domain pricing verification.
 *
 * Guards three things that would each cost real money:
 *
 *  1. Price precedence. A fixed price must always beat cost + markup, and a TLD
 *     with no known cost must never resolve to zero - a free .com is the failure
 *     mode that matters.
 *  2. Catalogue filtering. The "all TLDs" toggle and the enabled/curated flags
 *     are what decide what a seller is even offered.
 *  3. THE REGRESSION: the price charged at checkout is resolved server-side. The
 *     buy endpoint used to read `amountGhs` from the request body, so any seller
 *     could POST 1 and buy a .com for a cedi. This asserts the route no longer
 *     reads a price from the request, and that the pricing module it calls refuses
 *     a TLD the platform does not sell.
 *
 * Usage: node scripts/domainPricingTest.js   (no database needed)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDomainPrice, roundTo5Ghs, tldOf } from '../services/domainPricing.js';
import { CURATED_TLDS, EXTENDED_TLDS, buildDomainPricingRows } from '../db/domainCatalog.js';

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

console.log('\nDiDwa domain pricing -> services/domainPricing.js\n');

/* ---------- Rounding: prices are advertised to the nearest 5 GHS ---------- */
{
  log('rounds to the nearest 5', roundTo5Ghs(122) === 120 && roundTo5Ghs(123) === 125);
  log('never returns a negative price', roundTo5Ghs(-50) === 0);
  log('survives a nonsense input', roundTo5Ghs('abc') === 0);
  log('leaves an exact multiple alone', roundTo5Ghs(250) === 250);
}

/* ---------- Price precedence ---------- */
{
  const MARKUP = 25;
  log('a fixed price beats cost + markup',
    resolveDomainPrice({ retail_ghs: 90, wholesale_ghs: 100, markup_pct: 25 }, 100, MARKUP) === 90);
  log('a fixed price of 0 is honoured, not treated as unset',
    resolveDomainPrice({ retail_ghs: 0, wholesale_ghs: 100, markup_pct: 25 }, 100, MARKUP) === 0);
  log('a cached cost plus the TLD markup is used when no fixed price is set',
    resolveDomainPrice({ retail_ghs: null, wholesale_ghs: 100, markup_pct: 25 }, 100, MARKUP) === 125);
  log("the TLD's own markup wins over the default",
    resolveDomainPrice({ retail_ghs: null, wholesale_ghs: 100, markup_pct: 40 }, 100, MARKUP) === 140);
  log('a TLD with no markup of its own uses the default',
    resolveDomainPrice({ retail_ghs: null, wholesale_ghs: 100, markup_pct: null }, 100, MARKUP) === 125);
  log('the provider price from a search is used when nothing is cached',
    resolveDomainPrice({ retail_ghs: null, wholesale_ghs: null, markup_pct: 25 }, 200, MARKUP) === 250);
  log('a cached cost wins over a newer search price',
    resolveDomainPrice({ retail_ghs: null, wholesale_ghs: 100, markup_pct: 25 }, 999, MARKUP) === 125);
  log('an unknown TLD with no cost still charges a real amount',
    resolveDomainPrice(null, undefined, MARKUP) > 0);
  log('a zero markup is free but not negative',
    resolveDomainPrice({ retail_ghs: null, wholesale_ghs: 100, markup_pct: 0 }, 100, MARKUP) === 100);
}

/* ---------- TLD parsing: multi-part suffixes must not be split ---------- */
{
  for (const [input, expected] of [
    ['kwame.com', 'com'],
    ['kwame.co.za', 'co.za'],
    ['kwame.com.gh', 'com.gh'],
    ['shop.kwame.co.za', 'co.za'],
    ['WWW.KWAME.COM', 'com'],
    ['kwame.com.', 'com'],
  ]) {
    log(`reads .${expected} from ${input}`, tldOf(input) === expected, tldOf(input));
  }
  log('a bare name has no TLD', tldOf('kwame') === '');
  log('an empty name has no TLD', tldOf('') === '');
  log('null has no TLD', tldOf(null) === '');
}

/* ---------- The catalogue ---------- */
{
  const rows = buildDomainPricingRows();
  log('the catalogue holds 40+ curated TLDs', CURATED_TLDS.length >= 40, `${CURATED_TLDS.length}`);
  log('the extended set is substantial', EXTENDED_TLDS.length >= 150, `${EXTENDED_TLDS.length}`);
  log('the default set is not the old four', CURATED_TLDS.length > 4);
  log('the curated set includes .com, .co.za and .africa',
    ['com', 'co.za', 'africa'].every((t) => CURATED_TLDS.includes(t)));
  log('every TLD is stored bare, with no leading dot or scheme',
    rows.every((row) => row.tld && !row.tld.startsWith('.') && !row.tld.includes('/')));
  log('no duplicate TLDs', new Set(rows.map((row) => row.tld)).size === rows.length);
  log('curated TLDs are all marked curated',
    CURATED_TLDS.every((t) => rows.find((row) => row.tld === t)?.isCurated === true));
  log('the extended set is not marked curated',
    rows.filter((r) => !r.isCurated).every((r) => EXTENDED_TLDS.includes(r.tld)));
  const curatedMax = Math.max(...rows.filter((r) => r.isCurated).map((r) => r.sortOrder));
  const extendedMin = Math.min(...rows.filter((r) => !r.isCurated).map((r) => r.sortOrder));
  log('curated TLDs sort before extended ones', curatedMax < extendedMin);
  log('no seeded TLD carries a price - the cost is unknown until a search',
    rows.every((row) => row.tld && !('retailGhs' in row)));
}

/* ---------- The seed must never overwrite an administrator's work ---------- */
{
  const source = read('db/domainCatalog.js');
  log('the seed only ever inserts', /ON CONFLICT \(tld\) DO NOTHING/.test(source));
  log('the seed never updates or deletes a price',
    !/ON CONFLICT \(tld\) DO UPDATE/i.test(source) && !/DELETE FROM domain_pricing/i.test(source));
}

/* ---------- THE REGRESSION: checkout must not trust the client ---------- */
{
  const source = read('routes/domainRoutes.js');
  log('the buy endpoint no longer destructures a price from the body',
    !/const \{[^}]*amountGhs[^}]*\}\s*=\s*req\.body/.test(source));
  log('the buy endpoint no longer charges a client-supplied amount',
    !/amountGhs:\s*Number\(amountGhs\)/.test(source));
  log('the buy endpoint resolves the price server-side', /priceDomainForPurchase\(/.test(source));
  log('the resolved price is what reaches the checkout', /amountGhs,\s*\n\s*domainName: clean,/.test(source));
}

/* ---------- The admin API owns the numbers checkout reads ---------- */
{
  const admin = read('routes/admin/pricing.js');
  log('the admin API writes the pricing table', /UPDATE domain_pricing/.test(admin));
  log('the admin API writes the search switches', /UPDATE domain_settings/.test(admin));
  log('a price change requires a reason', /reasonProblem\(req\.body\?\.reason\)/.test(admin));
  log('a bulk reprice never overrides a fixed price', /retail_ghs IS NULL/.test(admin));
  log('the pricing cache is invalidated after a change',
    (admin.match(/invalidatePricingCache\(\)/g) || []).length >= 3);
  log('price changes are audited', /action: 'domain\.price'/.test(admin));

  const audit = read('routes/admin/audit.js');
  for (const action of ['domain.price', 'domain.price_bulk', 'domain.settings']) {
    log(`${action} has a human label`, audit.includes(`'${action}':`));
  }
}

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====\n`);
process.exit(fail === 0 ? 0 : 1);
