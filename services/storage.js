/**
 * DiDwa - Seller media storage (Cloudflare R2).
 *
 * Uploads are PRESIGNED and go straight from the browser to R2: the bytes never
 * pass through the app server, so there is no body-size ceiling here and the
 * serverless function is not a bandwidth bottleneck. The server's jobs are to
 * decide the key, sign the PUT, and then verify what actually landed.
 *
 *   1. POST /api/uploads/presign  -> key + short-lived signed PUT URL
 *   2. browser PUTs the bytes to R2
 *   3. POST /api/uploads/confirm  -> HeadObject verifies size/type, then persist
 *
 * The key is generated SERVER SIDE and scoped to the caller's store, so a seller
 * cannot sign a URL that overwrites another merchant's media. Delivery is by
 * Cloudflare Image Resizing on read (media.<ROOT_DOMAIN>/cdn-cgi/image/...), so
 * one stored key serves a 128px thumbnail and a 1200px hero without the server
 * ever running an image through a processor.
 */
import crypto from 'node:crypto';
import { S3Client, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Presigned URLs are deliberately short-lived: they are write access. */
export const PRESIGN_TTL_SECONDS = 900;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Only formats a browser renders cheaply AND Cloudflare can re-encode are
 * accepted. The extension is derived from the MIME type, never from the
 * filename, so a hostile name cannot pick the stored path.
 */
export const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export const KINDS = { product: 'products', logo: 'logos' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const stripTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

/** R2 configuration from the environment, or null when unconfigured. */
export function storageConfig() {
  const accountId = String(process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucket = String(process.env.R2_BUCKET || '').trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    accountId,
    bucket,
    // The custom domain the bucket is served from. Image resizing rewrites
    // requests to this host, so it must be a Cloudflare-proxied zone.
    publicBase: stripTrailingSlash(process.env.R2_PUBLIC_URL) || `https://${accountId}.r2.dev`,
    // Resizing needs image resizing enabled on the zone. If it is off (or not
    // configured), delivery falls back to the plain URL rather than 404ing.
    resize: String(process.env.R2_IMAGE_RESIZE || '').toLowerCase() !== 'off',
  };
}

export const isConfigured = () => storageConfig() !== null;

/* ------------------------------- Bucket CORS -------------------------------
 * A presigned PUT is signed HERE but sent by the merchant's BROWSER, so it goes
 * to <account>.r2.cloudflarestorage.com - a different origin from the storefront,
 * the seller dashboard, or a shop's own domain. The browser therefore sends an
 * OPTIONS preflight first, and R2 answers one with no Access-Control-Allow-Origin
 * header unless the bucket carries a matching CORS rule. Without the rule the PUT
 * is never attempted at all: the seller sees "Upload failed. Check your
 * connection and try again." and the browser console shows a blocked XHR.
 *
 * The policy lives in code (and is applied by `npm run r2:cors -- --apply`)
 * rather than in a dashboard someone has to remember, because a missing rule
 * disables the whole upload feature with no server-side error to notice.
 *
 * `*` is the default origin because the origin is NOT what grants write access -
 * the signature is. A URL can only be obtained by a signed-in seller
 * (POST /api/uploads/presign) and expires in 15 minutes, so allowing any origin
 * to USE a signed URL gives nobody a way to OBTAIN one. Sellers also reach their
 * dashboard through custom domains that no fixed list can enumerate in advance.
 * Set R2_ALLOWED_ORIGINS to narrow it when that is preferred.
 */
export const CORS_ALLOWED_METHODS = ['PUT', 'GET', 'HEAD'];
export const CORS_ALLOWED_HEADERS = ['*'];
export const CORS_EXPOSE_HEADERS = ['ETag'];
export const CORS_MAX_AGE_SECONDS = 3600;

/**
 * R2 rejects a policy with malformed origins, so a bad value is caught here
 * instead of silently leaving the bucket unprotected. R2 accepts `*`, or an
 * origin pattern (`scheme://host[:port]`) containing at most ONE wildcard, which
 * may span dots: `https://*.didwaghana.com` matches `https://a.b.didwaghana.com`
 * but not the bare apex. A path component and a wildcard port are never valid.
 */
export function isValidCorsOrigin(pattern) {
  const value = String(pattern || '').trim();
  if (!value) return false;
  if (value === '*') return true;
  const match = /^(https?):\/\/([^/?#]+)$/.exec(value);
  if (!match) return false;
  const host = match[2];
  if ((host.match(/\*/g) || []).length > 1) return false;
  const [hostname, port] = host.split(':');
  if (port && (port.includes('*') || !/^\d+$/.test(port))) return false;
  if (!hostname || hostname.startsWith('.') || hostname.endsWith('.')) return false;
  return /^[a-z0-9.*-]+$/i.test(hostname);
}

/** Origins the bucket must accept for browser uploads to work at all. */
export function corsOrigins() {
  const configured = String(process.env.R2_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const origins = configured.length ? configured : ['*'];
  const invalid = origins.filter((origin) => !isValidCorsOrigin(origin));
  if (invalid.length) {
    throw Object.assign(
      new Error(`R2_ALLOWED_ORIGINS has ${invalid.length} invalid origin(s): ${invalid.join(', ')}. `
        + 'Each entry must be "*" or an origin like https://shop.example.com - no path, at most one "*".'),
      { status: 500 },
    );
  }
  return origins;
}

/** The CORS rule set for the bucket, in the shape the S3 API (and R2) uses. */
export function corsRules() {
  return [{
    AllowedHeaders: [...CORS_ALLOWED_HEADERS],
    AllowedMethods: [...CORS_ALLOWED_METHODS],
    AllowedOrigins: corsOrigins(),
    ExposeHeaders: [...CORS_EXPOSE_HEADERS],
    MaxAgeSeconds: CORS_MAX_AGE_SECONDS,
  }];
}

/** The S3 endpoint browsers PUT to - the origin a bucket CORS rule must cover. */
export function storageEndpoint() {
  const config = storageConfig();
  return config ? `https://${config.accountId}.r2.cloudflarestorage.com` : null;
}

let cachedClient = null;
let cachedKey = '';
function client() {
  const config = storageConfig();
  if (!config) throw Object.assign(new Error('Image uploads are not configured on this server.'), { status: 503 });
  if (!cachedClient || cachedKey !== config.accountId) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: String(process.env.R2_ACCESS_KEY_ID).trim(),
        secretAccessKey: String(process.env.R2_SECRET_ACCESS_KEY).trim(),
      },
      // The SDK default is WHEN_SUPPORTED, which - for a PRESIGNED PUT - computes
      // a CRC32 of the EMPTY body at signing time and bakes it into the URL
      // (x-amz-sdk-checksum-algorithm=CRC32 & x-amz-checksum-crc32=AAAAAA==).
      // The browser then uploads real bytes, R2 validates them against that
      // pinned checksum and rejects the object, so no merchant image could ever
      // be stored through a signed URL. WHEN_REQUIRED leaves the checksum out of
      // the URL, which is what makes the signature usable by a browser.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
    cachedKey = config.accountId;
  }
  return { s3: cachedClient, config };
}

/** The object key for a new upload. Store-scoped, random, extension from MIME. */
export function buildObjectKey(storeId, kind, contentType) {
  if (!UUID.test(String(storeId || ''))) {
    throw Object.assign(new Error('Invalid store id.'), { status: 400 });
  }
  const folder = KINDS[kind];
  const extension = ALLOWED_TYPES[contentType];
  if (!folder) throw Object.assign(new Error(`Unknown upload kind "${kind}".`), { status: 400 });
  if (!extension) throw Object.assign(new Error('Unsupported image type.'), { status: 400 });
  return `stores/${storeId}/${folder}/${crypto.randomUUID()}.${extension}`;
}

/**
 * True only for a key this store may write, of this kind. Everything else -
 * another store's folder, a traversal attempt, extra path segments, an
 * unexpected extension - is rejected. Presign AND confirm both rely on this, so
 * a leaked presign URL cannot be pointed at foreign media.
 */
export function isOwnedKey(key, storeId, kind) {
  const folder = KINDS[kind];
  if (!folder) return false;
  const extensions = Object.values(ALLOWED_TYPES).join('|');
  const expected = new RegExp(`^stores/${String(storeId).toLowerCase()}/${folder}/[0-9a-f-]{36}\\.(?:${extensions})$`);
  return expected.test(String(key || '').toLowerCase());
}

/** Validate what the browser claims it is about to send. */
export function assertUploadable({ contentType, size, kind }) {
  if (!KINDS[kind]) throw Object.assign(new Error('Unknown upload kind.'), { status: 400 });
  const extension = ALLOWED_TYPES[contentType];
  if (!extension) {
    throw Object.assign(
      new Error(`Images must be JPEG, PNG, WebP or AVIF (received ${contentType || 'nothing'}).`),
      { status: 415 },
    );
  }
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    throw Object.assign(new Error('Choose a file to upload.'), { status: 400 });
  }
  if (bytes > MAX_UPLOAD_BYTES) {
    throw Object.assign(
      new Error(`Images must be ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB or smaller.`),
      { status: 413 },
    );
  }
  return { extension, bytes };
}

/** Absolute URL for a stored key, optionally resized by Cloudflare on read. */
export function buildDeliveryUrl(key, { width, height, quality = 75, fit = 'scale-down', format = 'auto' } = {}) {
  const config = storageConfig();
  if (!config || !key) return null;
  const path = String(key).replace(/^\/+/, '');
  const wantsResize = config.resize && (width || height);
  if (!wantsResize) return `${config.publicBase}/${path}`;
  const options = [
    width ? `width:${Math.round(Number(width))}` : '',
    height ? `height:${Math.round(Number(height))}` : '',
    `fit:${fit}`,
    `quality:${quality}`,
    `format:${format}`,
  ].filter(Boolean).join(',');
  return `${config.publicBase}/cdn-cgi/image/${options}/${path}`;
}

/** The sizes the platform actually renders, so no page pulls a full original. */
export const RENDITIONS = {
  productCard: { width: 640, height: 640 },
  productHero: { width: 1200, height: 1200 },
  logo: { width: 512, height: 512 },
  favicon: { width: 64, height: 64 },
};

/**
 * Delivery URL for a product image: prefers the resizable key, and falls back
 * to whatever absolute URL is already stored - which is how rows that predate
 * uploads, and externally hosted images, keep rendering.
 */
export function productImageUrl({ imageKey, imageUrl }, rendition = RENDITIONS.productCard) {
  return buildDeliveryUrl(imageKey, rendition) || imageUrl || null;
}

/** Sign a PUT for one key. The caller must already have validated the input. */
export async function presignUpload({ key, contentType }) {
  const { s3, config } = client();
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    // Signed in, so the browser MUST send exactly this Content-Type on the PUT;
    // the uploader component sets it verbatim.
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: PRESIGN_TTL_SECONDS });
}

/**
 * What actually landed in the bucket. A presigned URL is a promise, not a
 * guarantee: size and type are re-checked here, so a seller cannot sign a 2GB
 * payload (or an .html file renamed .png) and have it saved as a product photo.
 */
export async function headObject(key) {
  const { s3, config } = client();
  try {
    const result = await s3.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
    return {
      exists: true,
      size: Number(result.ContentLength || 0),
      contentType: String(result.ContentType || ''),
    };
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') {
      return { exists: false, size: 0, contentType: '' };
    }
    throw err;
  }
}

/** Best-effort cleanup, so a stored row never ends up pointing at nothing. */
export async function deleteObject(key) {
  const { s3, config } = client();
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
  } catch (err) {
    console.warn(`[storage] could not delete ${key}: ${err.message}`);
  }
}
