/**
 * DiDwa - Super admin catalog oversight (products, variants, stock).
 *
 * Product rows belong to merchants, so this is deliberately READ-ONLY apart from
 * stock corrections: the super admin fixes inventory and investigates listings,
 * it does not rewrite a merchant's catalogue or pricing.
 */
import { Router } from 'express';
import { query, withTransaction } from '../../config/database.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import { requireAdmin, readListQuery, listResponse, paged, uuidParam } from './helpers.js';

const router = Router();

/* --------------------------------- Products -------------------------------- */
router.get('/products', requireAdmin, async (req, res, next) => {
  try {
    const plan = readListQuery(req, {
      defaultLimit: 25,
      sorts: { created: 'p.created_at', name: 'p.name', price: 'p.price' },
    });
    const storeId = uuidParam(req.query.storeId);
    const only = String(req.query.only || '').toLowerCase();
    const filters = [];
    const params = [];

    if (plan.search) {
      params.push(plan.search);
      filters.push(`(p.name ILIKE $${params.length} OR p.category ILIKE $${params.length}
                 OR s.name ILIKE $${params.length})`);
    }
    if (storeId) { params.push(storeId); filters.push(`p.store_id = $${params.length}`); }
    if (only === 'inactive') filters.push('p.is_active = FALSE');
    if (only === 'low-stock') {
      filters.push(`EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id
                          AND v.stock_quantity <= v.low_stock_threshold)`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const from = 'FROM products p JOIN stores s ON s.id = p.store_id';
    const stock = `(SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.id)::int AS variant_count,
                  (SELECT COALESCE(SUM(v.stock_quantity), 0) FROM product_variants v
                    WHERE v.product_id = p.id) AS stock_total,
                  (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.id
                     AND v.stock_quantity <= v.low_stock_threshold)::int AS low_stock`;

    const result = await paged({
      countSql: `SELECT COUNT(*)::int AS total ${from} ${where}`,
      rowsSql: `SELECT p.id, p.store_id, s.name AS store_name, p.name, p.category, p.price,
                       p.is_active, p.image_url, p.created_at, ${stock}
                  ${from} ${where}
                 ORDER BY ${plan.orderBy} NULLS LAST
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      params,
      page: plan.page,
      limit: plan.limit,
      offset: plan.offset,
    });
    listResponse(res, {
      ...result,
      rows: result.rows.map((row) => ({
        id: row.id,
        storeId: row.store_id,
        storeName: row.store_name,
        name: row.name,
        category: row.category,
        price: row.price,
        isActive: row.is_active,
        imageUrl: row.image_url,
        variantCount: Number(row.variant_count || 0),
        stockTotal: Number(row.stock_total || 0),
        lowStock: Number(row.low_stock || 0),
        createdAt: row.created_at,
      })),
    }, 'products');
  } catch (err) {
    next(err);
  }
});

/* ---------------------------- Product + variants --------------------------- */
router.get('/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = uuidParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid product id.' });
    const [product, variants] = await Promise.all([
      query(`SELECT p.*, s.name AS store_name FROM products p
               JOIN stores s ON s.id = p.store_id WHERE p.id = $1 LIMIT 1`, [id]),
      query(`SELECT id, option_name, option_value, sku, price_override, stock_quantity,
                    low_stock_threshold, updated_at
               FROM product_variants WHERE product_id = $1 ORDER BY option_name, option_value`, [id]),
    ]);
    if (!product.rows[0]) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product: product.rows[0], variants: variants.rows });
  } catch (err) {
    next(err);
  }
});

/* --------------------------- Restock alert history -------------------------- */
router.get('/restock-alerts', requireAdmin, async (req, res, next) => {
  try {
    const plan = readListQuery(req, { defaultLimit: 25, sorts: { triggered: 'a.triggered_at' } });
    const storeId = uuidParam(req.query.storeId);
    const filters = [];
    const params = [];
    if (storeId) { params.push(storeId); filters.push(`a.store_id = $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const from = `FROM product_restock_alerts a
                  JOIN stores s ON s.id = a.store_id
                  JOIN product_variants v ON v.id = a.variant_id
                  JOIN products p ON p.id = v.product_id`;

    const result = await paged({
      countSql: `SELECT COUNT(*)::int AS total ${from} ${where}`,
      rowsSql: `SELECT a.id, a.store_id, s.name AS store_name, a.variant_id, p.name AS product_name,
                       v.option_value, a.stock_quantity, a.reorder_level, a.triggered_at
                  ${from} ${where}
                 ORDER BY ${plan.orderBy} NULLS LAST
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      params,
      page: plan.page,
      limit: plan.limit,
      offset: plan.offset,
    });
    listResponse(res, { ...result, rows: result.rows.map((row) => ({
      id: row.id,
      storeId: row.store_id,
      storeName: row.store_name,
      variantId: row.variant_id,
      productName: row.product_name,
      optionValue: row.option_value,
      stockQuantity: row.stock_quantity,
      reorderLevel: row.reorder_level,
      triggeredAt: row.triggered_at,
    })) }, 'alerts');
  } catch (err) {
    next(err);
  }
});

/* ---------------------------- Correct stock level --------------------------- */
router.patch('/variants/:id/stock', requireAdmin, async (req, res, next) => {
  try {
    const id = uuidParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid variant id.' });
    const stock = Number(req.body?.stock);
    if (!Number.isInteger(stock) || stock < 0 || stock > 10_000_000) {
      return res.status(400).json({ error: 'Stock must be a whole number between 0 and 10,000,000.' });
    }
    const reason = String(req.body?.reason || '').trim().slice(0, 500);
    if (!reason) return res.status(400).json({ error: 'A reason is required for stock corrections.' });

    const updated = await withTransaction(async (t) => {
      const { rows } = await t.query(
        `SELECT v.id, v.stock_quantity, v.option_value, p.name AS product_name,
                p.store_id, s.name AS store_name
           FROM product_variants v
           JOIN products p ON p.id = v.product_id
           JOIN stores  s ON s.id = p.store_id
          WHERE v.id = $1 FOR UPDATE OF v`,
        [id],
      );
      const variant = rows[0];
      if (!variant) return null;
      // Reset the alert flag once stock is above the threshold, so a corrected
      // line can alert again later instead of staying muted forever.
      const { rows: after } = await t.query(
        `UPDATE product_variants
            SET stock_quantity = $2,
                low_stock_alert_sent = CASE WHEN $2 > low_stock_threshold THEN FALSE
                                           ELSE low_stock_alert_sent END,
                updated_at = NOW()
          WHERE id = $1
          RETURNING id, stock_quantity, low_stock_threshold, low_stock_alert_sent`,
        [id, stock],
      );
      return { variant, after: after[0] };
    });

    if (!updated) return res.status(404).json({ error: 'Variant not found.' });

    await recordAdminAction(req, {
      action: 'catalog.stock',
      targetType: 'variant',
      targetId: id,
      detail: {
        product: updated.variant.product_name,
        option: updated.variant.option_value,
        store: updated.variant.store_name,
        from: updated.variant.stock_quantity,
        to: stock,
        reason,
      },
    });
    res.json({ variant: updated.after });
  } catch (err) {
    next(err);
  }
});

export default router;
