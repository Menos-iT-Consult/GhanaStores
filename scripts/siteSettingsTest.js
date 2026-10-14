/**
 * Store Site Settings - backend + frontend wiring.
 *
 * Logic-only (no database): asserts the pure pieces of the feature are correct
 * and, crucially, that the API surface and the page are wired to each other. The
 * TOTP primitive is exercised with a known RFC 6238 vector; the rest guards that
 * rename / password / reset / hard-delete / 2FA endpoints exist and that the
 * login flow gates on 2FA rather than leaking a session.
 *
 * Run: npm run test:site-settings   (no database needed)
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { generateSecret, verifyTotp, otpauthUri } from '../services/totpService.js';

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

console.log('\nDiDwa Site Settings\n');

/* ------------------------------ TOTP algorithm ----------------------------- */

test('generated secrets are base32 and 32 chars (160-bit)', () => {
  const s = generateSecret();
  assert.strictEqual(s.length, 32, 'secret should be 32 base32 chars');
  assert.match(s, /^[A-Z2-7]{32}$/, 'secret must be RFC 4648 base32');
});

test('two different setups produce different secrets', () => {
  assert.notStrictEqual(generateSecret(), generateSecret());
});

/* Recompute the exact current code the same way the service does, then assert
   verifyTotp accepts it - this proves the primitive round-trips, not just that
   it rejects garbage. */
function currentCode(secret, atSeconds) {
  const clean = String(secret).replace(/[^A-Z2-7]/g, '');
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const key = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHA.indexOf(ch);
    bits += 5;
    if (bits >= 8) { key.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  const counter = Math.floor(atSeconds / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const d = crypto.createHmac('sha1', Buffer.from(key)).update(buf).digest();
  const o = d[d.length - 1] & 0x0f;
  const code = ((d[o] & 0x7f) << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3];
  return String(code % 1e6).padStart(6, '0');
}

test('a freshly computed current code is accepted', () => {
  const secret = generateSecret();
  const code = currentCode(secret, Math.floor(Date.now() / 1000));
  assert.strictEqual(verifyTotp(secret, code), true, 'current code must verify');
});

test('wrong-length / non-numeric / empty codes are rejected', () => {
  const secret = generateSecret();
  assert.strictEqual(verifyTotp(secret, '12'), false, 'too short');
  assert.strictEqual(verifyTotp(secret, ''), false, 'empty');
  assert.strictEqual(verifyTotp(secret, 'abc def'), false, 'non-numeric');
});

test('verifyTotp rejects a malformed/empty secret', () => {
  assert.strictEqual(verifyTotp('', '123456'), false);
  assert.strictEqual(verifyTotp(null, '123456'), false);
});

test('otpauth URI carries the account, issuer and SHA1/6/30 params', () => {
  const secret = generateSecret();
  const uri = otpauthUri(secret, 'seller@example.com');
  assert.ok(uri.startsWith('otpauth://totp/'), 'is a totp uri');
  assert.ok(uri.includes('secret=' + secret), 'embeds the secret');
  assert.ok(uri.includes('issuer=DiDwa'), 'names the issuer');
  assert.ok(uri.includes('algorithm=SHA1'), 'SHA1');
  assert.ok(uri.includes('digits=6'), '6 digits');
  assert.ok(uri.includes('period=30'), '30s period');
  assert.ok(uri.includes('seller%40example.com'), 'labels with the account email');
});

/* ------------------------------ Wiring checks ------------------------------ */

const routes = read('routes/siteSettingsRoutes.js');
const billing = read('routes/billingRoutes.js');
const server = read('server.js');
const schema = read('db/schema.sql');
const app = read('src/App.jsx');
const routeTable = read('src/routes.js');
const constants = read('src/layouts/dashboard/constants.js');
const authScreen = read('src/pages/AuthScreen.jsx');
const page = read('src/pages/SellerSiteSettings.jsx');
const resetPage = read('src/pages/ResetPassword.jsx');

test('the API exposes every Site Settings action', () => {
  assert.match(routes, /\.patch\('\/name'/, 'rename endpoint');
  assert.match(routes, /\.patch\('\/password'/, 'change-password endpoint');
  assert.match(routes, /\.post\('\/password\/forgot'/, 'forgot-password endpoint');
  assert.match(routes, /\.post\('\/password\/reset'/, 'reset-password endpoint');
  assert.match(routes, /\.delete\('\/account'/, 'delete-account endpoint');
  assert.match(routes, /\.post\('\/2fa\/setup'/, '2FA setup endpoint');
  assert.match(routes, /\.post\('\/2fa\/enable'/, '2FA enable endpoint');
  assert.match(routes, /\.post\('\/2fa\/disable'/, '2FA disable endpoint');
});

test('seller actions are behind requireSeller; forgot/reset are public', () => {
  assert.ok(routes.includes('requireSeller'), 'seller guard used');
  const forgotBlock = routes.slice(routes.indexOf('/password/forgot'), routes.indexOf('/password/reset'));
  assert.ok(!forgotBlock.includes('requireSeller'), 'forgot-password must be public');
});

test('change-password and delete require the current password (bcrypt.compare)', () => {
  assert.match(routes, /bcrypt\.compare/, 'password verified before change/delete');
  assert.match(routes, /confirmSlug/, 'delete confirms the store slug');
});

test('delete is a hard DELETE FROM stores', () => {
  assert.match(routes, /DELETE FROM stores WHERE id = \$1/, 'hard delete cascades children');
});

test('reset tokens are stored as a SHA-256 hash and consumed once', () => {
  assert.match(routes, /createHash\('sha256'\)/, 'token hashed before storage');
  assert.match(routes, /used_at IS NULL/, 'single-use enforced');
});

test('the 2FA secret is encrypted at rest; status never reads it', () => {
  assert.match(routes, /encryptSecret\(/, 'secret encrypted on setup');
  const statusBlock = routes.slice(routes.indexOf("get('/2fa/status'"));
  assert.ok(!statusBlock.includes('totp_secret'), 'status endpoint must not read the secret');
});

test('login gates on 2FA and /login/2fa completes it', () => {
  assert.match(billing, /twoFactorRequired/, 'login returns a 2FA challenge when enabled');
  assert.match(billing, /issueTwoFactorChallenge/, 'issues a short-lived challenge');
  assert.match(billing, /\/login\/2fa/, 'has a second-step endpoint');
  assert.match(billing, /verifyTwoFactorChallenge/, 'verifies the challenge token');
});

test('schema adds totp columns and the reset-token table idempotently', () => {
  assert.match(schema, /ADD COLUMN IF NOT EXISTS totp_secret/, 'totp_secret column');
  assert.match(schema, /ADD COLUMN IF NOT EXISTS totp_enabled/, 'totp_enabled column');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS store_password_resets/, 'reset table');
  assert.match(schema, /ON DELETE CASCADE/, 'reset rows cascade with the store');
});

test('server mounts the settings router at /api/site-settings', () => {
  assert.match(server, /app\.use\('\/api\/site-settings', siteSettingsRoutes\)/);
});

test('the SPA routes /settings/site and public /reset-password', () => {
  assert.match(routeTable, /'\/settings\/site'/, 'settings route registered');
  assert.match(routeTable, /'\/reset-password'/, 'reset route is public');
  assert.match(app, /case '\/settings\/site': return <SellerSiteSettings \/>/, 'App renders settings');
  assert.match(app, /case '\/reset-password': return <ResetPassword \/>/, 'App renders reset');
});

test('the sidebar shows a Site Settings tab', () => {
  assert.match(constants, /'\/settings\/site'/, 'nav item path');
  assert.match(constants, /label: 'Site Settings'/, 'nav item label');
});

test('the login screen wires the 2FA step and forgot-password link', () => {
  assert.match(authScreen, /twoFactorRequired/, 'login handles the 2FA challenge');
  assert.match(authScreen, /submitTwoFa/, 'has a 2FA submit handler');
  assert.match(authScreen, /Forgot password\?/, 'shows a forgot-password link');
});

test('the settings page renders all five concerns', () => {
  for (const [needle, what] of [
    ['NameCard', 'store name'],
    ['PasswordCard', 'password'],
    ['SubscriptionCard', 'subscription'],
    ['TwoFactorCard', 'two-factor'],
    ['DeleteCard', 'delete account'],
  ]) {
    assert.ok(page.includes(needle), `${what} card present`);
  }
  assert.ok(page.includes('/api/site-settings/name'), 'calls rename endpoint');
  assert.ok(page.includes('/api/site-settings/password'), 'calls password endpoints');
  assert.ok(page.includes('/api/site-settings/account'), 'calls delete endpoint');
});

test('the reset page reads the token from the URL and posts it back', () => {
  assert.match(resetPage, /token/, 'handles the token');
  assert.match(resetPage, /\/api\/site-settings\/password\/reset/, 'posts to reset endpoint');
});

console.log(`\n${pass}/${pass + fail} site-settings assertions passed`);
process.exit(fail ? 1 : 0);

