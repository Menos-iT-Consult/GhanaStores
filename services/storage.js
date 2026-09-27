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
