/**
 * DiDwa - Super admin customer oversight (every customer on every tenant).
 *
 * Read-only: customers belong to merchants, and loyalty balances are the
 * merchant's ledger. The platform can see them, never edit them.
 */
import { Router } from 'express';
import { query } from '../../config/database.js';
import { requireAdmin, readListQuery, listResponse, paged, uuidParam } from './helpers.js';

const router = Router();

const customerRow = (row) => ({
  id: row.id,
  storeId: row.store_id,
  storeName: row.store_name,
  name: row.name,
  phone: row.phone,
  email: row.email,
  loyaltyPoints: row.loyalty_points,
  totalSpent: row.total_spent,
  ordersCount: row.orders_count,
  createdAt: row.created_at,
});

router.get('/customers', requireAdmin, async (req, res, next) => {
  try {
    const plan = readListQuery(req, {
      defaultLimit: 25,
      sorts: { created: 'c.created_at', spent: 'c.total_spent', orders: 'c.orders_count', name: 'c.name' },
    });
    const storeId = uuidParam(req.query.storeId);
    const filters = [];
    const params = [];

    if (plan.search) {
      params.push(plan.search);
      filters.push(`(c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length}
                 OR c.email ILIKE $${params.length} OR s.name ILIKE $${params.length})`);
    }
    if (storeId) { params.push(storeId); filters.push(`c.store_id = $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const from = 'FROM customers c JOIN stores s ON s.id = c.store_id';

    const result = await paged({
      countSql: `SELECT COUNT(*)::int AS total ${from} ${where}`,
      rowsSql: `SELECT c.id, c.store_id, s.name AS store_name, c.name, c.phone, c.email,
                       c.loyalty_points, c.total_spent, c.orders_count, c.created_at
                  ${from} ${where}
                 ORDER BY ${plan.orderBy} NULLS LAST
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      params: [...params, plan.limit, plan.offset],
      page: plan.page,
      limit: plan.limit,
      offset: plan.offset,
    });
    listResponse(res, { ...result, rows: result.rows.map(customerRow) }, 'customers');
  } catch (err) {
    next(err);
  }
});

router.get('/customers/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = uuidParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid customer id.' });
    const [customer, orders] = await Promise.all([
      query(`SELECT c.*, s.name AS store_name FROM customers c
               JOIN stores s ON s.id = c.store_id WHERE c.id = $1 LIMIT 1`, [id]),
      query(`SELECT id, order_number, status, total, created_at
               FROM orders WHERE store_id = $1
                AND (customer_id = $2 OR (customer_phone IS NOT NULL AND customer_phone = $3))
              ORDER BY created_at DESC LIMIT 25`,
        [customer.rows[0]?.store_id, id, customer.rows[0]?.phone]),
    ]);
    if (!customer.rows[0]) return res.status(404).json({ error: 'Customer not found.' });
    res.json({ customer: customerRow(customer.rows[0]), orders: orders.rows });
  } catch (err) {
    next(err);
  }
});

export default router;
