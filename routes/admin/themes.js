/**
 * DiDwa - Super admin theme catalog oversight.
 *
 * The catalog is what every seller's storefront is built from, so the platform
 * can see adoption (which merchant runs which template) and curate the catalog's
 * labels. It deliberately does NOT edit a template's `config` JSON here: that
 * would change the live rendering of every store using it with no review step.
 */
import { Router } from 'express';
import { query } from '../../config/database.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import { requireAdmin, readListQuery, listResponse, paged, uuidParam } from './helpers.js';

const router = Router();

router.get('/themes', requireAdmin, async (req, res, next) => {
  try {
    const plan = readListQuery(req, {
      defaultLimit: 25,
      sorts: {
        /* Numeric, for the same reason as the catalogue query: a lexical sort
        on "Theme NN" places "Theme 100" before "Theme 11". The CASE, not a
        NULLIF, is what makes a non-numeric name safe - regexp_replace returns
        its input unchanged on no-match, which would abort the cast. */
        name: "CASE WHEN t.name ~ '^Theme [0-9]+$' THEN regexp_replace(t.name, '^Theme ([0-9]+)$', '\\1')::int END",
        category: 't.category',
        adoption: 'stores_using',
        created: 't.created_at',
      },
    });
    const category = String(req.query.category || '').trim();
    const filters = [];
    const params = [];

    if (plan.search) {
      params.push(plan.search);
      filters.push(`(t.id ILIKE $${params.length} OR t.name ILIKE $${params.length}
                 OR t.category ILIKE $${params.length})`);
    }
    if (category) { params.push(category); filters.push(`t.category = $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const result = await paged({
      countSql: `SELECT COUNT(*)::int AS total FROM theme_templates t ${where}`,
      rowsSql: `SELECT t.id, t.name, t.category, t.created_at,
                       (SELECT COUNT(*) FROM stores s WHERE s.active_theme_id = t.id)::int AS stores_using
                  FROM theme_templates t ${where}
                 ORDER BY ${plan.orderBy} NULLS LAST
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      params,
      page: plan.page,
      limit: plan.limit,
      offset: plan.offset,
    });
    listResponse(res, { ...result, rows: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      storesUsing: Number(row.stores_using || 0),
      createdAt: row.created_at,
    })) }, 'themes');
  } catch (err) {
    next(err);
  }
});

/** Categories + adoption, for the filter chips. */
router.get('/themes/categories', requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT category, COUNT(*)::int AS templates,
              (SELECT COUNT(*) FROM stores s JOIN theme_templates t2 ON t2.id = s.active_theme_id
                WHERE t2.category = t.category)::int AS adoption
         FROM theme_templates t GROUP BY category ORDER BY category`,
    );
    res.json({ categories: rows });
  } catch (err) {
    next(err);
  }
});

/** Who is using which template - the adoption view. */
router.get('/themes/usage', requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.id, s.name, s.status, s.plan, s.subdomain_slug,
              s.active_theme_id, t.name AS theme_name, t.category
         FROM stores s LEFT JOIN theme_templates t ON t.id = s.active_theme_id
        ORDER BY (s.active_theme_id IS NULL) DESC, s.name`,
    );
    res.json({
      merchants: rows.map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        plan: row.plan,
        slug: row.subdomain_slug,
        themeId: row.active_theme_id,
        themeName: row.theme_name,
        category: row.category,
        onDefaultTheme: !row.active_theme_id,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/** Curation: rename a template or move it between categories. */
router.patch('/themes/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id || id.length > 100) return res.status(400).json({ error: 'Invalid template id.' });

    const { rows: before } = await query(
      'SELECT id, name, category FROM theme_templates WHERE id = $1 LIMIT 1',
      [id],
    );
    if (!before[0]) return res.status(404).json({ error: 'Template not found.' });

    const updates = [];
    const params = [];
    const detail = {};
    if (req.body?.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name || name.length > 100) return res.status(400).json({ error: 'Name must be 1-100 characters.' });
      params.push(name);
      updates.push(`name = $${params.length}`);
      detail.name = { from: before[0].name, to: name };
    }
    if (req.body?.category !== undefined) {
      const category = String(req.body.category || '').trim();
      if (!category || category.length > 50) return res.status(400).json({ error: 'Category must be 1-50 characters.' });
      params.push(category);
      updates.push(`category = $${params.length}`);
      detail.category = { from: before[0].category, to: category };
    }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update.' });

    params.push(id);
    const { rows } = await query(
      `UPDATE theme_templates SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING id, name, category`,
      params,
    );
    await recordAdminAction(req, {
      action: 'theme.update',
      targetType: 'theme',
      targetId: id,
      detail,
    });
    res.json({ theme: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
