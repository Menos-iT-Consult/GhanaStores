/**
 * Reserved merchant-slug validation.
 *
 * Guards the boundary between "a slug a seller may register" and "a SYSTEM PATH
 * that belongs to the platform". A seller squats on admin / billing / dashboard /
 * paystack and the shop either looks official while resolving to a storefront,
 * or (for the few the host classifier also reserves) is silently dead. This
 * asserts the reserved list is enforced on every slug the seller could choose.
 *
 * Matching rules under test (chosen so squatting is blocked without punishing
 * ordinary shop names):
 *   - exact          : slug IS a reserved word                     -> admin
 *   - leading segment: first hyphen-segment is reserved            -> admin-shop,
 *                      news-today blocked; myblog, apparel, newspaper, codebase OK
 *   - multi-word     : a reserved phrase blocks longer slugs       -> reset-password-x
 *   - raw prefixes   : anything front-running "didwa" or "api-"    -> didwastore,
 *                      api-gateway blocked
 *
 * Run: npm run test:reserved-slugs   (no database needed)
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { subdomainProblem, RESERVED_SLUGS, RESERVED_PREFIXES } from '../services/subdomainSlug.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let pass = 0;
let fail = 0;
function test(name, fn) {
  try {
    fn();
    pass += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    fail += 1;
    console.error(`  FAIL  ${name}\n        ${err.message}`);
  }
}

console.log('\nDiDwa reserved slug validation\n');

/* ----------------------------- Exact matches ----------------------------- */

test('a core system path is reserved', () => {
  for (const slug of ['admin', 'api', 'www', 'app', 'affiliate', 'billing', 'dashboard', 'login', 'paystack', 'hubtel']) {
    assert.strictEqual(subdomainProblem(slug), 'reserved', `"${slug}" should be reserved`);
  }
});

test('every entry in RESERVED_SLUGS that is itself a valid slug is refused', () => {
  for (const word of RESERVED_SLUGS) {
    // Skip entries that can never be a real slug (dots, <3 chars): those are
    // inert as exact matches but still block via the prefix rule, tested below.
    if (word.includes('.') || word.length < 3) continue;
    assert.strictEqual(subdomainProblem(word), 'reserved', `"${word}" should be reserved`);
  }
});

/* --------------------------- Leading-segment rule ------------------------ */

test('a reserved word as the leading segment is refused', () => {
  for (const slug of ['admin-shop', 'news-today', 'billing-help', 'v1-store', 'sso-login']) {
    assert.strictEqual(subdomainProblem(slug), 'reserved', `"${slug}" should be reserved`);
  }
});

test('a reserved word NOT in the leading position is allowed', () => {
  for (const slug of ['my-admin', 'shop-news', 'kofi-billing', 'the-app']) {
    assert.strictEqual(subdomainProblem(slug), null, `"${slug}" should be allowed`);
  }
});

/* ------------------- No false positives on ordinary words ---------------- */

test('an ordinary word that merely STARTS with the same letters is allowed', () => {
  // "cod"/"app"/"pay"/"news"/"blog"/"login" are reserved, but these real words
  // are not: none is exactly a reserved word, and none has a leading hyphen
  // segment equal to one ("payment-pro" WOULD be reserved - tested separately).
  for (const slug of ['myblog', 'apparel', 'newspaper', 'codebase', 'jobshub', 'paymentx', 'loginx']) {
    assert.strictEqual(subdomainProblem(slug), null, `"${slug}" should be allowed`);
  }
});

test('a plainly valid shop slug is allowed', () => {
  for (const slug of ['accra-beauty', 'kofi-store', 'abc', 'shop123', 'ghana-foods']) {
    assert.strictEqual(subdomainProblem(slug), null, `"${slug}" should be allowed`);
  }
});

/* ------------------------------ Multi-word ------------------------------- */

test('a multi-word reserved phrase blocks slugs built on it', () => {
  for (const slug of ['reset-password', 'reset-password-here', 'custom-domains', 'privacy-policy-x']) {
    assert.strictEqual(subdomainProblem(slug), 'reserved', `"${slug}" should be reserved`);
  }
});

/* --------------------------- Raw brand prefixes -------------------------- */

test('anything front-running the brand or API namespace is refused', () => {
  for (const slug of ['didwa', 'didwastore', 'didwa-shop', 'api-gateway', 'api-v2']) {
    assert.strictEqual(subdomainProblem(slug), 'reserved', `"${slug}" should be reserved`);
  }
});

test('the reserved prefixes are exactly didwa and api-', () => {
  assert.deepStrictEqual([...RESERVED_PREFIXES].sort(), ['api-', 'didwa']);
});

/* ------------------------- The invalid rule still wins ------------------- */

test('a malformed slug is invalid regardless of meaning', () => {
  assert.strictEqual(subdomainProblem('ab'), 'invalid');        // too short
  assert.strictEqual(subdomainProblem('has space'), 'invalid');
  assert.strictEqual(subdomainProblem('-leading'), 'invalid');
  assert.strictEqual(subdomainProblem('UPPER_OK'), 'invalid');  // must be lowercase
});

/* ------------------------------ Case-insensitive ------------------------- */

test('matching is case-insensitive and trims whitespace', () => {
  assert.strictEqual(subdomainProblem('  ADMIN  '), 'reserved');
  assert.strictEqual(subdomainProblem('Admin-Shop'), 'reserved');
});

/* -------------------------- The guard is wired in ------------------------ */
// A green availability tick must never disagree with the registration verdict,
// so every path that accepts a seller slug must go through subdomainProblem.

test('the registration route, availability endpoint and signup field all call subdomainProblem', () => {
  assert.ok(read('routes/billingRoutes.js').includes('subdomainProblem('), 'billingRoutes.js must validate the slug');
  assert.ok(read('routes/domainRoutes.js').includes('subdomainProblem('), 'the availability endpoint must use the same rule');
  assert.ok(read('src/components/SubdomainField.jsx').includes('subdomainProblem('), 'the signup field must use the same rule');
});

console.log(`\n${pass}/${pass + fail} reserved-slug assertions passed`);
process.exit(fail ? 1 : 0);
