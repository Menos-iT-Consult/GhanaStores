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
 *  4. The presigned-URL contract and the bucket CORS policy the browser needs.
 *     Signing is LOCAL - it needs credentials, not a network - so the signed URL
 *     can be inspected here; the live browser path is covered by `npm run r2:cors`.
 *
 * Usage: node scripts/uploadTest.js   (no network, no database, no credentials)
 */
import {
  ALLOWED_TYPES, KINDS, MAX_UPLOAD_BYTES, PRESIGN_TTL_SECONDS, RENDITIONS, assertUploadable,
  buildDeliveryUrl, buildObjectKey, corsRules, isOwnedKey, isValidCorsOrigin, presignUpload,
  productImageUrl, storageConfig,
} from '../services/storage.js';
// The browser half of delivery: it derives the unresized original so a zone
// without Cloudflare Image Transformations still renders the picture.
import { originalImageUrl } from '../src/api.js';

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
    card === `https://media.didwaghana.com/cdn-cgi/image/width=640,height=640,fit=scale-down,quality=75,format=auto/${key}`,
    card);
  /* Cloudflare parses `<key>=<value>`, comma separated: a colon form is not
     recognised and 404s, which silently breaks every image on the platform. */
  log('the resize options use key=value, never key:value',
    card.includes('width=640') && !card.includes('width:640') && !/:/.test(card.split('/cdn-cgi/image/')[1].split('/')[0]));
  log('the options are comma separated', card.split('/cdn-cgi/image/')[1].split('/')[0].split(',').length === 5);
  log('the hero rendition differs from the card', buildDeliveryUrl(key, RENDITIONS.productHero) !== card);
  log('a logo gets its own rendition', buildDeliveryUrl(key, RENDITIONS.logo).includes('width=512'));
  log('the tab icon is small', buildDeliveryUrl(key, RENDITIONS.favicon).includes('width=64'));
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

/* ---------- The presigned PUT contract ---------- */
{
  /* The bytes are PUT by the BROWSER, so the URL may only contain things a
     browser can honour. The SDK's WHEN_SUPPORTED default computes a CRC32 of the
     (empty) body at signing time and pins it into the URL, which makes the
     signature misleading to any S3-compatible store that validates it. */
  const signed = new URL(await presignUpload({
    key: buildObjectKey(STORE_A, 'product', 'image/png'),
    contentType: 'image/png',
  }));
  log('the URL is an S3 presign', signed.searchParams.get('X-Amz-Algorithm') === 'AWS4-HMAC-SHA256');
  log('the signature covers the host only', signed.searchParams.get('X-Amz-SignedHeaders') === 'host');
  log('the payload is unsigned, so the browser can stream the file',
    signed.searchParams.get('X-Amz-Content-Sha256') === 'UNSIGNED-PAYLOAD');
  log('the URL expires in 15 minutes',
    signed.searchParams.get('X-Amz-Expires') === String(PRESIGN_TTL_SECONDS));
  log('no body checksum is pinned into the URL',
    [...signed.searchParams.keys()].every((param) => !/checksum/i.test(param)),
    [...signed.searchParams.keys()].filter((param) => /checksum/i.test(param)).join(', '));
}

/* ---------- Bucket CORS (the browser half of the upload) ---------- */
{
  /* The PUT goes to <account>.r2.cloudflarestorage.com from the storefront's
     origin, so the browser only sends it after a preflight R2 answers with
     Access-Control-Allow-Origin. Without a bucket rule the whole feature is dead
     with no server-side error at all, which is why the policy is asserted here. */
  const [rule] = corsRules();
  log('the bucket needs exactly one rule', corsRules().length === 1);
  log('PUT is allowed, or no image can be uploaded', rule.AllowedMethods.includes('PUT'));
  log('uploads can be read back', rule.AllowedMethods.includes('GET') && rule.AllowedMethods.includes('HEAD'));
  log('any origin by default, because sellers reach their dashboard on their own domain',
    rule.AllowedOrigins.join() === '*');
  log('the headers the uploader sends are allowed', rule.AllowedHeaders.join() === '*');
  log('the ETag is exposed to the uploader', rule.ExposeHeaders.includes('ETag'));
  log('the preflight is cached for an hour', rule.MaxAgeSeconds === 3600);

  process.env.R2_ALLOWED_ORIGINS = 'https://*.didwaghana.com, https://didwaghana.com, http://localhost:5173';
  const narrowed = corsRules()[0].AllowedOrigins;
  log('an explicit origin list is honoured',
    narrowed.length === 3 && narrowed[1] === 'https://didwaghana.com', narrowed.join(' '));
  log('whitespace around an origin is trimmed', narrowed.every((origin) => origin === origin.trim()));
  log('a subdomain wildcard covers every storefront', narrowed[0] === 'https://*.didwaghana.com');

  process.env.R2_ALLOWED_ORIGINS = 'https://ok.example.com,https://www.didwaghana.com/';
  const badStatus = statusOf(() => corsRules());
  log('a malformed origin is refused rather than applied to the bucket', badStatus === 500, `got ${badStatus}`);
  delete process.env.R2_ALLOWED_ORIGINS;

  /* R2 accepts "*", or one wildcard per origin pattern, never a path or a
     wildcard port - a rejected pattern would leave the bucket unprotected. */
  for (const [label, origin, expected] of [
    ['the any-origin wildcard', '*', true],
    ['an https origin', 'https://shop.example.com', true],
    ['an explicit port', 'http://localhost:5173', true],
    ['a subdomain wildcard', 'https://*.didwaghana.com', true],
    ['a wildcard spanning dots', 'https://*.shop.example.com', true],
    ['two wildcards', 'https://*.*.example.com', false],
    ['a trailing slash', 'https://www.didwaghana.com/', false],
    ['a path', 'https://static.example.com/fonts/a.woff2', false],
    ['a missing scheme', 'didwaghana.com', false],
    ['a non-http scheme', 'ftp://example.com', false],
    ['a wildcard port', 'http://localhost:*', false],
    ['an empty value', '', false],
  ]) {
    log(`isValidCorsOrigin: ${label}`, isValidCorsOrigin(origin) === expected);
  }
}

/* ---------- The browser's delivery fallback ---------- */
{
  /* A rendition 404s on a zone without Image Transformations, so the <img>
     swaps to the original. Deriving it must be exact: a mangled URL would swap
     one broken image for another. */
  const rendition = 'https://media.didwaghana.com/cdn-cgi/image/width=640,height=640,fit=scale-down,quality=75,format=auto/stores/abc/products/x.png';
  log('a rendition falls back to the stored original',
    originalImageUrl(rendition) === 'https://media.didwaghana.com/stores/abc/products/x.png',
    originalImageUrl(rendition));
  log('an unresized URL is returned unchanged (the swap is a no-op)',
    originalImageUrl('https://media.didwaghana.com/stores/abc/products/x.png') === 'https://media.didwaghana.com/stores/abc/products/x.png');
  log('a foreign host is never touched',
    originalImageUrl('https://picsum.photos/seed/a/640/480') === 'https://picsum.photos/seed/a/640/480');
  log('a URL with no key is left alone',
    originalImageUrl('https://old.example/photo.jpg') === 'https://old.example/photo.jpg');
  log('an empty src stays empty', originalImageUrl('') === '' && originalImageUrl(null) === '');
  log('the fallback of a rendition matches the plain delivery URL',
    originalImageUrl(rendition) === buildDeliveryUrl('stores/abc/products/x.png'));
}

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====\n`);
process.exit(fail === 0 ? 0 : 1);
