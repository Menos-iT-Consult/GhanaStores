/**
 * routes/contactRoutes.js
 * Contact-form capture and the SELLER inbox.
 *
 *   POST /api/contact                     the marketing /contact page
 *   POST /api/storefront/:slug/contact    "Contact seller" on a tenant storefront
 *   GET  /api/contact                     this seller's messages (requireSeller)
 *   GET  /api/contact/unread-count        nav badge
 *   PATCH /api/contact/:id                mark read / archive (own store only)
 *
 * The admin inbox is a separate file under routes/admin/.
 */
import { Router } from 'express';
import { query } from '../config/database.js';
import { requireSeller } from '../middleware/authMiddleware.js';
import { notifyNewMessage } from '../services/emailService.js';
import {
  parseSubmission, saveMessage, publicShape,
  listForStore, countForStore, setStatusForStore,
} from '../services/contactMessages.js';
import { canonicalDomain } from '../services/domainService.js';

const router = Router();

/* Basic in-process throttle. A public form with no limit is a spam relay. */
const recent = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function throttled(key) {
  const now = Date.now();
  const hits = (recent.get(key) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  if (hits.length > MAX_PER_WINDOW) {
    /* Keep the map from growing without bound on a long-running process. */
    if (recent.size > 5000) recent.clear();
    return true;
  }
  return false;
}

const ipOf = (req) => String(req.ip || req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();

/** Shared insert + notification, so both public forms behave identically. */
async function capture(req, res, source, storeId, storeName) {
  if (throttled(ipOf(req))) {
    return res.status(429).json({ error: 'Too many messages sent. Please try again later.' });
  }
  const parsed = parseSubmission(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  const saved = await saveMessage(source, storeId, parsed.value);

  /* Fire-and-forget: the message is already saved, so a mail outage must not
     turn a successful submission into an error the visitor sees. */
  const recipient = source === 'storefront'
    ? (await query('SELECT email FROM stores WHERE id = $1', [storeId])).rows[0]?.email
    : null;
  notifyNewMessage(saved, recipient, storeName).catch(() => {});

  return res.status(201).json({ ok: true, id: saved.id });
}

/* ------------------------- Public: platform contact form -------------------- */
router.post('/contact', async (req, res, next) => {
  try {
    await capture(req, res, 'platform', null, null);
  } catch (err) { next(err); }
});

/* ------------------------ Public: storefront contact seller ------------------ */
router.post('/storefront/:slug/contact', async (req, res, next) => {
  try {
    // Same canonicalisation the storefront catalogue and host resolver use, so
    // "WWW.shop.com", "shop.com" and "https://shop.com/" all reach the same store.
    const key = canonicalDomain(req.params.slug);
    const { rows } = await query(
      `SELECT id, name, status FROM stores
        WHERE LOWER(subdomain_slug) = LOWER($1)
           OR LOWER(custom_domain) = ANY ($2::text[])
        LIMIT 1`,
      [key, key ? [key, `www.${key}`] : ['']],
    );
    const store = rows[0];
    /* A suspended store must not accumulate leads nobody will read. */
    if (!store || store.status === 'SUSPENDED') {
      return res.status(404).json({ error: 'Storefront not found.' });
    }
    await capture(req, res, 'storefront', store.id, store.name);
  } catch (err) { next(err); }
});

/* ------------------------------- Seller inbox ------------------------------- */
router.get('/contact', requireSeller, async (req, res, next) => {
  try {
    const status = ['new', 'read', 'archived'].includes(req.query.status) ? req.query.status : null;
    const rows = await listForStore(req.auth.sub, { status });
    res.json({ messages: rows.map(publicShape) });
  } catch (err) { next(err); }
});

router.get('/contact/unread-count', requireSeller, async (req, res, next) => {
  try {
    res.json({ count: await countForStore(req.auth.sub) });
  } catch (err) { next(err); }
});

router.patch('/contact/:id', requireSeller, async (req, res, next) => {
  try {
    const status = String(req.body?.status || '');
    if (!['new', 'read', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Unknown status.' });
    }
    /* Scoped by store_id inside the UPDATE, so an id from another store
       updates nothing and reports not-found rather than leaking existence. */
    const row = await setStatusForStore(req.auth.sub, req.params.id, status);
    if (!row) return res.status(404).json({ error: 'Message not found.' });
    res.json({ message: publicShape(row) });
  } catch (err) { next(err); }
});

export default router;