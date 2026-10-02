/**
 * services/contactMessages.js
 * Persistence and shape for contact-form submissions, shared by the public
 * endpoints that WRITE and the seller/admin endpoints that READ.
 *
 * Validation lives here so the two public forms cannot drift apart in what they
 * accept or in how they report a bad submission.
 */
import { query } from '../config/database.js';

const MAX = { name: 120, email: 254, phone: 32, topic: 120, message: 4000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/* Deliberately permissive: Ghana numbers arrive written many ways, and this
   only has to catch obvious rubbish, not validate. */
const PHONE_RE = /^[+()\d][\d\s()+-]{5,30}$/;

const trim = (v, max) => String(v ?? '').trim().slice(0, max);

/**
 * Validate a submission.
 * @returns {{ok: true, value: object} | {ok: false, error: string}}
 */
export function parseSubmission(body) {
  const name = trim(body?.name, MAX.name);
  const email = trim(body?.email, MAX.email).toLowerCase();
  const phone = trim(body?.phone, MAX.phone);
  const topic = trim(body?.topic, MAX.topic);
  const message = trim(body?.message, MAX.message);

  if (!name) return { ok: false, error: 'Please enter your name.' };
  if (!email) return { ok: false, error: 'Please enter your email address.' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
  if (phone && !PHONE_RE.test(phone)) return { ok: false, error: 'Please enter a valid phone number.' };
  if (!message) return { ok: false, error: 'Please enter a message.' };
  if (message.length < 5) return { ok: false, error: 'Your message is too short.' };

  return { ok: true, value: { name, email, phone: phone || null, topic: topic || null, message } };
}

/**
 * Store a submission.
 * @param {'platform'|'storefront'} source
 * @param {string|null} storeId owning store for storefront messages
 */
export async function saveMessage(source, storeId, value) {
  const { rows } = await query(
    `INSERT INTO contact_messages (source, store_id, name, email, phone, topic, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [source, storeId || null, value.name, value.email, value.phone, value.topic, value.message],
  );
  return rows[0];
}

/** Public shape returned to the client; hides internal timestamps and ids. */
export function publicShape(row) {
  return {
    id: row.id,
    source: row.source,
    name: row.name,
    email: row.email,
    phone: row.phone,
    topic: row.topic,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    readAt: row.read_at,
    archivedAt: row.archived_at,
    store: row.store_name === undefined ? undefined : { name: row.store_name },
  };
}

/**
 * List a seller's own messages. ALWAYS scoped by store_id - there is no caller
 * path that omits it, so a seller cannot read another store's leads by
 * manipulating the request.
 */
export async function listForStore(storeId, { status, limit = 50, offset = 0 } = {}) {
  const filters = ['store_id = $1'];
  const params = [storeId];
  if (status) { params.push(status); filters.push(`status = $${params.length}`); }
  const { rows } = await query(
    `SELECT * FROM contact_messages
      WHERE ${filters.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
  return rows;
}

/** Unread count for the nav badge. */
export async function countForStore(storeId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM contact_messages WHERE store_id = $1 AND status = 'new'`,
    [storeId],
  );
  return Number(rows[0]?.n || 0);
}

/**
 * Move one of a seller's own messages between states.
 * Scoped by store_id in the WHERE clause, so a guessed UUID belonging to another
 * store matches nothing rather than updating it.
 */
export async function setStatusForStore(storeId, id, status) {
  const { rows } = await query(
    `UPDATE contact_messages
        SET status = $3,
            read_at = CASE WHEN $3 = 'new' THEN NULL
                           WHEN read_at IS NULL THEN NOW() ELSE read_at END,
            archived_at = CASE WHEN $3 = 'archived' THEN NOW() ELSE NULL END
      WHERE id = $1 AND store_id = $2
      RETURNING *`,
    [id, storeId, status],
  );
  return rows[0] || null;
}