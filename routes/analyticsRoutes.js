/**
 * DiDwa - Sales Analytics Routes
 * MODULE 2: KPI aggregates (Total Revenue GHS, Paid Orders, AOV) and
 * 6-month monthly revenue trend shaped for Recharts consumption.
 */
import { Router } from 'express';
import { query } from '../config/database.js';
import { requireSeller } from '../middleware/authMiddleware.js';

const router = Router();

const PAID_STATUSES = "('PAID','FULFILLED','DELIVERED')";

/* --------------------------------- Dashboard -------------------------------- */
/**
 * Full dashboard payload. Shared by the PWA (/api/analytics/dashboard) and the
 * seller app (/api/mobile/v1/dashboard/full) so both render identical numbers.
 */
export async function getDashboardFull(storeId) {
    const [kpis, trend, recent, ops] = await Promise.all([
      // Core KPIs over paid orders.
      query(
        `SELECT COALESCE(SUM(total), 0)::numeric(14,2)   AS total_revenue,
                COUNT(*)::int                            AS paid_orders,
                CASE WHEN COUNT(*) > 0
                     THEN (SUM(total) / COUNT(*))::numeric(12,2)
                     ELSE 0 END::numeric(12,2)           AS avg_order_value,
                COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('day', NOW())), 0)::numeric(12,2) AS today_revenue,
                COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('week', NOW())), 0)::numeric(12,2) AS week_revenue,
                COALESCE(SUM(total) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'), 0)::numeric(12,2) AS revenue_7_days,
                COALESCE(SUM(total) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0)::numeric(12,2) AS revenue_30_days,
                COALESCE(SUM(points_earned), 0)::int     AS points_issued
           FROM orders
          WHERE store_id = $1 AND status IN ${PAID_STATUSES}`,
        [storeId],
      ),
      // 6-month monthly revenue trend (zero-filled).
      query(
        `WITH months AS (
            SELECT generate_series(
                     date_trunc('month', NOW()) - INTERVAL '5 months',
                     date_trunc('month', NOW()),
                     INTERVAL '1 month') AS m
         )
         SELECT to_char(m, 'Mon')                        AS month,
                to_char(m, 'YYYY-MM')                    AS month_key,
                COALESCE((SELECT SUM(o.total)
                            FROM orders o
                           WHERE o.store_id = $1
                             AND o.status IN ${PAID_STATUSES}
                             AND o.created_at >= m
                             AND o.created_at <  m + INTERVAL '1 month'), 0)::numeric(14,2) AS revenue,
                (SELECT COUNT(*) FROM orders o
                  WHERE o.store_id = $1
                    AND o.status IN ('PAID','FULFILLED','DELIVERED')
                    AND o.created_at >= m AND o.created_at < m + INTERVAL '1 month')::int AS orders
           FROM months
          ORDER BY m`,
        [storeId],
      ),
      // Recent order feed for the dashboard table.
      query(
        `SELECT id, order_number, customer_name, channel, payment_method, status,
                total, points_earned, created_at
           FROM orders
          WHERE store_id = $1
          ORDER BY created_at DESC
          LIMIT 10`,
        [storeId],
      ),
      // Operational counters: low stock, loyalty members, open rider cash.
      query(
        `SELECT
           (SELECT COUNT(*)::int FROM orders
             WHERE store_id = $1 AND status = 'PENDING')                                   AS pending_order_count,
           (SELECT COUNT(*)::int FROM product_variants
             WHERE store_id = $1 AND stock_quantity <= low_stock_threshold)              AS low_stock_count,
           (SELECT COUNT(*)::int FROM customers WHERE store_id = $1)                     AS loyalty_members,
           (SELECT COALESCE(SUM(points),0)::int FROM (
               SELECT loyalty_points AS points FROM customers WHERE store_id = $1) pts)  AS outstanding_points,
           (SELECT COALESCE(SUM(amount),0)::numeric(12,2) FROM rider_transits
             WHERE store_id = $1 AND status = 'TRANSIT')                                 AS transit_cash`,
        [storeId],
      ),
    ]);

    const k = kpis.rows[0];
    return {
      kpis: {
        totalRevenue: Number(k.total_revenue),
        paidOrders: k.paid_orders,
        averageOrderValue: Number(k.avg_order_value),
        todayRevenue: Number(k.today_revenue),
        weekRevenue: Number(k.week_revenue),
        revenue7Days: Number(k.revenue_7_days),
        revenue30Days: Number(k.revenue_30_days),
        pointsIssued: k.points_issued,
      },
      monthlyTrend: trend.rows.map((r) => ({
        month: r.month,
        revenue: Number(r.revenue),
        orders: r.orders,
      })),
      recentOrders: recent.rows.map((r) => ({
        id: r.id,
        orderNumber: r.order_number,
        customerName: r.customer_name || 'Walk-in',
        channel: r.channel,
        paymentMethod: r.payment_method,
        status: r.status,
        total: Number(r.total),
        pointsEarned: r.points_earned,
        createdAt: r.created_at,
      })),
      operations: {
        pendingOrderCount: ops.rows[0].pending_order_count,
        lowStockCount: ops.rows[0].low_stock_count,
        loyaltyMembers: ops.rows[0].loyalty_members,
        outstandingPoints: ops.rows[0].outstanding_points,
        transitCash: Number(ops.rows[0].transit_cash),
      },
      currency: 'GHS',
    };
}

/* Thin PWA route over the shared payload. */
router.get('/dashboard', requireSeller, async (req, res, next) => {
  try {
    res.json(await getDashboardFull(req.auth.sub));
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ Top sellers list ----------------------------- */
/**
 * Top sellers by revenue. Shared by the PWA and the seller app so the leaderboard
 * matches between dashboard and phone. `limit` defaults to 8 (the PWA shape).
 */
export async function getTopProducts(storeId, limit = 8) {
    const { rows } = await query(
      `SELECT oi.product_name,
              oi.variant_label,
              SUM(oi.quantity)::int                       AS units_sold,
              SUM(oi.line_total)::numeric(14,2)           AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
        WHERE oi.store_id = $1 AND o.status IN ${PAID_STATUSES}
        GROUP BY oi.product_name, oi.variant_label
        ORDER BY revenue DESC
        LIMIT $2`,
      [storeId, limit],
    );
    return {
      products: rows.map((r) => ({
        name: r.variant_label ? `${r.product_name} (${r.variant_label})` : r.product_name,
        unitsSold: r.units_sold,
        revenue: Number(r.revenue),
      })),
    };
}

/* Thin PWA route over the shared payload. */
router.get('/top-products', requireSeller, async (req, res, next) => {
  try {
    res.json(await getTopProducts(req.auth.sub));
  } catch (err) {
    next(err);
  }
});

export default router;
