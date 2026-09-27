/**
 * DiDwa - Seller media upload routes.
 *
 *   POST   /api/uploads/presign  validate the request, generate a store-scoped
 *                               key and return a short-lived signed PUT URL
 *   POST   /api/uploads/confirm  verify what actually reached R2, then persist it
 *                               onto the product (imageKey + imageUrl) or the
 *                               store (logo)
 *   GET    /api/uploads/logo     current logo + whether uploads are available
 *   DELETE /api/uploads/logo     clear the logo
 *
 * The browser uploads the bytes directly to R2; this router never receives them.
 * Every route requires a seller token, and every key is checked against the
 * CALLER'S store on both presign and confirm, so a signed URL cannot be pointed
 * at another merchant's media.
 */
import { Router } from 'express';
import { query, withTransaction } from '../config/database.js';
import { requireSeller } from '../middleware/authMiddleware.js';
import {
  KINDS, MAX_UPLOAD_BYTES, RENDITIONS, assertUploadable, buildDeliveryUrl, buildObjectKey,
  deleteObject, headObject, isConfigured, isOwnedKey, presignUpload,
} from '../services/storage.js';

const router = Router();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Refuse early and clearly when the platform has no bucket configured. */
function storageUnavailable() {
  if (isConfigured()) return null;
  return { status: 503, error: 'Image uploads are not configured on this server yet.' };
}

/* --------------------------------- Presign --------------------------------- */
router.post('/presign', requireSeller, async (req, res, next) => {
  try {
    const unavailable = storageUnavailable();
    if (unavailable) return res.status(unavailable.status).json({ error: unavailable.error });

    const kind = String(req.body?.kind || '').trim();
    const contentType = String(req.body?.contentType || '').trim().toLowerCase();

    // Throws a 4xx with a seller-readable message for the wrong type/size.
    assertUploadable({ contentType, size: req.body?.size, kind });

    const key = buildObjectKey(req.auth.sub, kind, contentType);
    const uploadUrl = await presignUpload({ key, contentType });

    res.json({
      key,
      uploadUrl,
      contentType,
      maxBytes: MAX_UPLOAD_BYTES,
      // The seller can compare this against the file they picked; the server
      // re-checks the real size on confirm.
      hint: 'PUT the file bytes to uploadUrl with this exact Content-Type, then call /confirm.',
    });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------- Confirm --------------------------------- */
router.post('/confirm', requireSeller, async (req, res, next) => {
  try {
    const unavailable = storageUnavailable();
    if (unavailable) return res.status(unavailable.status).json({ error: unavailable.error });

    const kind = String(req.body?.kind || '').trim();
    const key = String(req.body?.key || '').trim();
    if (!isOwnedKey(key, req.auth.sub, kind)) {
      return res.status(403).json({ error: 'That upload does not belong to this store.' });
    }

    // A presigned URL is a promise, not a guarantee: re-check the object.
    const object = await headObject(key);
    if (!object.exists) {
      return res.status(409).json({ error: 'The upload did not reach storage. Please try again.' });
    }
    if (!object.size || object.size > MAX_UPLOAD_BYTES) {
      await deleteObject(key);
      return res.status(413).json({
        error: `That file is ${Math.round(object.size / 1024)}KB, which is outside the allowed size.`,
      });
    }
    // The browser's Content-Type is signed, but a crafted PUT could still claim
    // anything, so the type storage actually recorded is what we trust.
    if (!object.contentType.toLowerCase().startsWith('image/')) {
      await deleteObject(key);
      return res.status(415).json({ error: 'That file is not an image.' });
    }

    const rawUrl = buildDeliveryUrl(key);
    const deliveryUrl = buildDeliveryUrl(key, kind === 'logo' ? RENDITIONS.logo : RENDITIONS.productCard);

    if (kind === 'logo') {
      /* logo_url holds the R2 KEY (like products.image_key) so a delivery URL
         can be resized on read; the theme config gets the absolute URL because
         the storefront renderer consumes it as a plain <img src>. */
      const store = await query(
        `UPDATE stores
            SET logo_url = $2,
                custom_theme_config = jsonb_set(
                  jsonb_set(COALESCE(custom_theme_config, '{}'::jsonb), '{branding}', '{}'::jsonb, true),
                  '{branding,logo_url}', to_jsonb($3::text), true)
          WHERE id = $1
       RETURNING id, name, logo_url`,
        [req.auth.sub, key, rawUrl],
      );
      if (!store.rows[0]) return res.status(404).json({ error: 'Store not found.' });
      return res.json({
        kind,
        key,
        url: deliveryUrl,
        rawUrl,
        store: { id: store.rows[0].id, name: store.rows[0].name, logoKey: store.rows[0].logo_url },
      });
    }

    /* Product photo. The WHERE clause is also the ownership check - a product
       belonging to another store updates zero rows. */
    const productId = String(req.body?.productId || '').trim();
    if (!productId) {
      /* Staged: the seller picked the image BEFORE the product existed (the
         catalog form uploads first, then creates). The object is verified and
         returned so the client can pass the key through with the create call;
         nothing is written yet, and a product that is never created leaves an
         unreferenced object behind - swept by the bucket lifecycle rule. */
      return res.json({ kind, key, url: deliveryUrl, rawUrl, staged: true });
    }
    if (!UUID.test(productId)) {
      await deleteObject(key);
      return res.status(400).json({ error: 'A product id is required to attach an image.' });
    }
    const updated = await query(
      `UPDATE products SET image_key = $3, image_url = $4
        WHERE id = $1 AND store_id = $2
     RETURNING id, name, image_key, image_url`,
      [productId, req.auth.sub, key, rawUrl],
    );
    if (!updated.rows[0]) {
      // Nothing was attached, so the object is orphaned - remove it rather
      // than letting storage fill with unreferenced images.
      await deleteObject(key);
      return res.status(404).json({ error: 'Product not found for this store.' });
    }

    return res.json({
      kind,
      key,
      url: deliveryUrl,
      rawUrl,
      product: {
        id: updated.rows[0].id,
        name: updated.rows[0].name,
        imageKey: updated.rows[0].image_key,
        imageUrl: updated.rows[0].image_url,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------- Logo ----------------------------------- */
/** Current logo + whether uploads are available, so the settings page can
 *  explain an unavailable control instead of showing a broken one. */
router.get('/logo', requireSeller, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, name, subdomain_slug, logo_url FROM stores WHERE id = $1 LIMIT 1',
      [req.auth.sub],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Store not found.' });
    res.json({
      configured: isConfigured(),
      maxBytes: MAX_UPLOAD_BYTES,
      kinds: Object.keys(KINDS),
      // logo_url is the R2 key, so the rendition is derived here rather than
      // being baked into a stored URL.
      logoUrl: buildDeliveryUrl(rows[0].logo_url, RENDITIONS.logo),
      faviconUrl: buildDeliveryUrl(rows[0].logo_url, RENDITIONS.favicon),
      logoKey: rows[0].logo_url,
      store: { id: rows[0].id, name: rows[0].name, subdomainSlug: rows[0].subdomain_slug },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Clear the logo and restore the DiDwa mark in the storefront header. The R2
 * object is intentionally left in place: an accidental removal should be
 * recoverable, and it is not reachable from any user-facing URL once the row
 * no longer points at it.
 */
router.delete('/logo', requireSeller, async (req, res, next) => {
  try {
    await withTransaction(async (t) => {
      await t.query(
        `UPDATE stores
            SET logo_url = NULL,
                custom_theme_config = jsonb_set(
                  COALESCE(custom_theme_config, '{}'::jsonb), '{branding,logo_url}', '""'::jsonb, true)
          WHERE id = $1`,
        [req.auth.sub],
      );
    });
    res.json({ removed: true });
  } catch (err) {
    next(err);
  }
});

export default router;
