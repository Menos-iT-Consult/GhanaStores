/**
 * DiDwa - Super admin contact inbox.
 *
 * The platform-level side of the contact feature: every submission from BOTH
 * forms (source = 'platform' and source = 'storefront'), across all tenants.
 * Sells the same read/unread/archive states as the seller inbox.
 */
import { Router } from 'express';
import { query } from '../../config/database.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import { publicShape } from '../../services/contactMessages.js';
import { requireAdmin, readListQuery, listResponse, paged } from './helpers.js';

const router = Router();

router.get('/contact', requireAdmin, async (req, res, next) => {
  try {
    const plan = readListQuery(req, {
      defaultLimit: 25,
      sorts: { newest: 'm.created_at', oldest: 'm.created_at ASC', name: 'm.name' },
    });

    const filters = [];
    const params = [];
    const status = ['new', 'read', 'archived'].includes(req.query.status) ? req.query.status : '';
    if (status) { params.push(status); filters.push(`m.status = $${params.length}`); }
    const source = ['platform', 'storefront'].includes(req.query.source) ? req.query.source : '';
    if (source) { params.push(source); filters.push(`m.source = $${params.length}`); }
    if (plan.search) { params.push(plan.search); filters.push(`(m.name ILIKE $${params.length} OR m.email ILIKE $${params.length} OR m.message ILIKE $${params.length})`); }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    /* The join is what lets one admin list say which merchant a storefront lead
       belongs to, without a second round trip per row. */
    const result = await paged({
      countSql: `SELECT COUNT(*)::int AS total FROM contact_messages m ${where}`,
      rowsSql: `SELECT m.*, s.name AS store_name
                  FROM contact_messages m
                  LEFT JOIN stores s ON s.id = m.store_id
                 ${where}
                ORDER BY ${plan.orderBy || 'm.created_at DESC'} NULLS LAST
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      params,
      page: plan.page,
      limit: plan.limit,
      offset: plan.offset,
    });

    listResponse(res, {
      ...result,
      rows: result.rows.map((row) => publicShape(row)),
    }, 'contact');
  } catch (err) {
    next(err);
  }
});

router.patch('/contact/:id', requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.body?.status || '');
    if (!['new', 'read', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Unknown status.' });
    }
    const before = (await query('SELECT status FROM contact_messages WHERE id = $1', [req.params.id])).rows[0];
    if (!before) return res.status(404).json({ error: 'Message not found.' });

    const { rows } = await query(
      `UPDATE contact_messages
          SET status = $2,
              read_at = CASE WHEN $2 = 'new' THEN NULL
                             WHEN read_at IS NULL THEN NOW() ELSE read_at END,
              archived_at = CASE WHEN $2 = 'archived' THEN NOW() ELSE NULL END
        WHERE id = $1
        RETURNING *, (SELECT name FROM stores WHERE id = contact_messages.store_id) AS store_name`,
      [req.params.id, status],
    );
    await recordAdminAction(req, {
      action: 'contact.update',
      targetType: 'contact_message',
      targetId: req.params.id,
      detail: { from: before.status, to: status },
    });
    res.json({ message: publicShape(rows[0]) });
  } catch (err) {
    next(err);
  }
});

export default router;