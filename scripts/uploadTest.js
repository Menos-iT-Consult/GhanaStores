/**
 * Seller media storage verification.
 *
 * The upload path hands a browser write access to storage, so its guards are
 * the security boundary and cannot be assumed:
 *
 *  1. Key scoping. Every key is store-prefixed and random, and isOwnedKey is
 *     what stops a seller who guesses or leaks a key from attaching, confirming
 *     or overwriting another merchant's media.
 *  2. Input validation, on the declared content type and size.
 *  3. The delivery contract: one stored key must produce a correct URL for
 *     every size the platform renders (product card, logo, tab icon), and fall
 *     back to the stored absolute URL for rows that predate uploads.
 *
 * The AWS signing itself needs real credentials, so it is not exercised here;
 * that is the one manual smoke test after the env vars are set.
 *
 * Usage: node scripts/uploadTest.js   (no network, no database, no credentials)
 */
import {
  ALLOWED_TYPES, KINDS, MAX_UPLOAD_BYTES, RENDITIONS, assertUploadable, buildDeliveryUrl,
  buildObjectKey, isOwnedKey, productImageUrl, storageConfig,
} from '../services/storage.js';

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

/** Run `fn`, returning the error's HTTP status, or 0 if it did not throw. */
function statusOf(fn) {
  try { fn(); return 0; } catch (err) { return err.status || 0; }
}

const STORE_A = '2f0b1c3a-1111-2222-3333-444455556666';
const STORE_B = '9a8b7c6d-5555-4444-3333-222211110000';

/* Pretend the platform is configured, exactly as production will be. */
process.env.R2_ACCOUNT_ID = 'acct123';
process.env.R2_ACCESS_KEY_ID = 'key';
process.env.R2_SECRET_ACCESS_KEY = 'secret';
process.env.R2_BUCKET = 'didwa-media';
process.env.R2_PUBLIC_URL = 'https://media.didwaghana.com';

console.log('\nDiDwa seller media storage -> services/storage.js\n');

/* ---------- Configuration ---------- */
{
  const config = storageConfig();
  log('configuration is read from the environment', config !== null);
  log('the public base is the media subdomain',
    config?.publicBase === 'https://media.didwaghana.com', config?.publicBase);
  log('a trailing slash on the base is tolerated', (() => {
    const before = process.env.R2_PUBLIC_URL;
    process.env.R2_PUBLIC_URL = 'https://media.didwaghana.com/';
    const ok = storageConfig().publicBase === 'https://media.didwaghana.com';
    process.env.R2_PUBLIC_URL = before;
    return ok;
  })());
  log('an unconfigured platform reports null rather than throwing', (() => {
    const saved = process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCOUNT_ID;
    const ok = storageConfig() === null;
    process.env.R2_ACCOUNT_ID = saved;
    return ok;
  })());
}

/* ---------- Key generation ---------- */
{
  const key = buildObjectKey(STORE_A, 'product', 'image/png');
  log('a product key is namespaced to the store', key.startsWith(`stores/${STORE_A}/products/`), key);
  log('the extension comes from the MIME type', key.endsWith('.png'), key);
  log('logo keys live in their own folder',
    buildObjectKey(STORE_A, 'logo', 'image/jpeg').startsWith(`stores/${STORE_A}/logos/`));
  log('keys are random, not derived from the filename',
    buildObjectKey(STORE_A, 'product', 'image/png') !== buildObjectKey(STORE_A, 'product', 'image/png'));
  log('a non-UUID store id is rejected',
    statusOf(() => buildObjectKey('not-a-uuid', 'product', 'image/png')) === 400);
  log('an unsupported type is rejected',
    statusOf(() => buildObjectKey(STORE_A, 'product', 'image/gif')) === 400);
  log('an unknown kind is rejected',
    statusOf(() => buildObjectKey(STORE_A, 'passport', 'image/png')) === 400);
  log('a filename can never inject a path', !key.includes('..') && key.split('/').length === 4);
}

/* ---------- Ownership: the security boundary ---------- */
{
  const own = buildObjectKey(STORE_A, 'product', 'image/webp');
  const ownName = own.split('/').pop();
  log('a store owns its own key', isOwnedKey(own, STORE_A, 'product') === true);
  log("a store does NOT own another store's key", isOwnedKey(own, STORE_B, 'product') === false);
  log('a product key is not a logo key', isOwnedKey(own, STORE_A, 'logo') === false);
  log('a logo key is not a product key',
    isOwnedKey(buildObjectKey(STORE_A, 'logo', 'image/png'), STORE_A, 'product') === false);

  for (const [label, hostile] of [
    ['path traversal', `stores/${STORE_A}/products/../../../etc/passwd.png`],
    ['an extra path segment', `stores/${STORE_A}/products/nested/deep/x.png`],
    ['a missing folder', `stores/${STORE_A}/x.png`],
    ['a hand-chosen filename', `stores/${STORE_A}/products/evil.png`],
    ['an absolute path', '/etc/passwd'],
    ['a key with the wrong extension', `stores/${STORE_A}/products/${ownName.replace('.webp', '.sh')}`],
    ['an empty key', ''],
    ['null', null],
  ]) {
    log(`rejects ${label}`, isOwnedKey(hostile, STORE_A, 'product') === false);
  }
  log('an unknown kind is never owned', isOwnedKey(own, STORE_A, 'passport') === false);
}

/* ---------- Input validation ---------- */
{
  for (const type of Object.keys(ALLOWED_TYPES)) {
    log(`accepts ${type}`,
      statusOf(() => assertUploadable({ contentType: type, size: 1024, kind: 'product' })) === 0);
  }
  for (const [label, input, status] of [
    ['a GIF', { contentType: 'image/gif', size: 1024, kind: 'product' }, 415],
    ['an SVG', { contentType: 'image/svg+xml', size: 1024, kind: 'product' }, 415],
    ['an HTML file', { contentType: 'text/html', size: 1024, kind: 'product' }, 415],
    ['nothing at all', { contentType: '', size: 1024, kind: 'product' }, 415],
    ['an oversized file', { contentType: 'image/png', size: MAX_UPLOAD_BYTES + 1, kind: 'product' }, 413],
    ['a zero-byte file', { contentType: 'image/png', size: 0, kind: 'product' }, 400],
    ['a nonsense size', { contentType: 'image/png', size: 'huge', kind: 'product' }, 400],
    ['an unknown kind', { contentType: 'image/png', size: 1024, kind: 'passport' }, 400],
  ]) {
    const actual = statusOf(() => assertUploadable(input));
    log(`rejects ${label} with ${status}`, actual === status, `got ${actual || 'no error'}`);
  }
  log('the size limit is 5MB', MAX_UPLOAD_BYTES === 5 * 1024 * 1024);
  log('both upload kinds are declared', Boolean(KINDS.product && KINDS.logo));
}

/* ---------- Delivery URLs ---------- */
{
  const key = buildObjectKey(STORE_A, 'product', 'image/jpeg');
  const card = buildDeliveryUrl(key, RENDITIONS.productCard);
  log('a product card URL is resized on read',
    card === `https://media.didwaghana.com/cdn-cgi/image/width:640,height:640,fit:scale-down,quality:75,format:auto/${key}`,
    card);
  log('the hero rendition differs from the card', buildDeliveryUrl(key, RENDITIONS.productHero) !== card);
  log('a logo gets its own rendition', buildDeliveryUrl(key, RENDITIONS.logo).includes('width:512'));
  log('the tab icon is small', buildDeliveryUrl(key, RENDITIONS.favicon).includes('width:64'));
  log('a bare key serves the original', buildDeliveryUrl(key) === `https://media.didwaghana.com/${key}`);
  log('a leading slash on the key is tolerated',
    buildDeliveryUrl(`/${key}`) === `https://media.didwaghana.com/${key}`);
  log('no key means no URL', buildDeliveryUrl(null, RENDITIONS.logo) === null);

  log('a product image prefers the resizable key',
    productImageUrl({ imageKey: key, imageUrl: 'https://old.example/photo.jpg' }) === card);
  log('a pre-upload row still renders its stored URL',
    productImageUrl({ imageUrl: 'https://old.example/photo.jpg' }) === 'https://old.example/photo.jpg');
  log('a product with no image at all returns null', productImageUrl({ imageUrl: '' }) === null);

  /* Resizing must be switchable without a code change, for a zone where image
     resizing has not been enabled yet. */
  process.env.R2_IMAGE_RESIZE = 'off';
  log('resizing can be turned off for a zone without image resizing',
    buildDeliveryUrl(key, RENDITIONS.productCard) === `https://media.didwaghana.com/${key}`);
  delete process.env.R2_IMAGE_RESIZE;
}

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====\n`);
process.exit(fail === 0 ? 0 : 1);
