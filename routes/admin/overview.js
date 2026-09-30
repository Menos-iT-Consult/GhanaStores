/**
 * DiDwa - Super admin platform overview.
 *
 * Replaces the old all-in-one /overview, which shipped EVERY tenant, EVERY
 * domain and 250 transactions on one screen. This answers the operator's four
 * real questions and nothing else: how big is the platform, is it growing, what
 * is broken, and what did the last operator do.
 */
import { Router } from 'express';
import { query } from '../../config/database.js';
import { requireAdmin } from './helpers.js';
import { ACTION_LABELS } from './audit.js';

const router = Router();

const PAID = "('PAID','FULFILLED','DELIVERED')";

router.get('/overview', requireAdmin, async (_req, res, next) => {
  try {
    const [metrics, growth, topMerchants, attention, recentAudit] = await Promise.all([
      query(`SELECT
          (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status IN ${PAID})          AS revenue,
          (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status IN ${PAID}
             AND created_at > NOW() - INTERVAL '30 days')                              AS revenue_30d,
          (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status IN ${PAID}
             AND created_at > NOW() - INTERVAL '30 days'
             AND created_at <= NOW() - INTERVAL '30 days')                             AS revenue_prev_30d,
          (SELECT COUNT(*) FROM stores)                                                 AS merchants,
          (SELECT COUNT(*) FROM stores WHERE status = 'ACTIVE')                        AS merchants_active,
          (SELECT COUNT(*) FROM stores WHERE status = 'SUSPENDED')                     AS merchants_suspended,
          (SELECT COUNT(*) FROM stores WHERE status IN ('TRIAL','PAST_DUE'))           AS merchants_at_risk,
          (SELECT COUNT(*) FROM orders)                                                AS orders,
          (SELECT COUNT(*) FROM orders WHERE status = 'PENDING')                       AS orders_open,
          (SELECT COUNT(*) FROM customers)                                             AS customers,
          (SELECT COUNT(*) FROM products)                                             AS products,
          (SELECT COUNT(*) FROM theme_templates)                                      AS themes,
          (SELECT COUNT(*) FROM store_domains WHERE status = 'ACTIVE')                AS domains_active,
          (SELECT COUNT(*) FROM store_domains WHERE status IN ('FAILED','CANCELLED'))  AS domains_broken,
          (SELECT COUNT(*) FROM subscription_payments WHERE status = 'FAILED')        AS payments_failed,
          (SELECT COUNT(*) FROM product_variants
            WHERE stock_quantity <= low_stock_threshold)                               AS variants_low_stock`),

      query(`SELECT to_char(day, 'YYYY-MM-DD') AS day, COALESCE(SUM(total), 0) AS revenue,
                    COUNT(*)::int AS orders
               FROM (SELECT created_at::date AS day, total, status FROM orders
                      WHERE created_at > NOW() - INTERVAL '30 days') d
              WHERE status IN ${PAID}
              GROUP BY day ORDER BY day`),

      query(`SELECT s.id, s.name, s.slug, s.plan, s.status,
                    COALESCE(SUM(o.total), 0) AS revenue, COUNT(o.id)::int AS orders
               FROM stores s
               JOIN orders o ON o.store_id = s.id AND o.status IN ${PAID}
              GROUP BY s.id, s.name, s.slug, s.plan, s.status
              ORDER BY revenue DESC LIMIT 10`),

      // One ranked list of "things a human should look at", worst first.
      query(`SELECT * FROM (
          SELECT 'merchant_suspended' AS kind, s.name AS label, s.id AS ref,
                 'Merchant suspended' AS note, s.created_at AS at
            FROM stores s WHERE s.status = 'SUSPENDED'
          UNION ALL
          SELECT 'merchant_past_due', s.name, s.id, 'Past due', s.created_at
            FROM stores s WHERE s.status = 'PAST_DUE'
          UNION ALL
          SELECT 'payout_review', s.name, p.id,
                 'Payout awaiting approval: ' || p.amount, p.initiated_at
            FROM payouts p JOIN stores s ON s.id = p.store_id
           WHERE p.status = 'PENDING_REVIEW'
          UNION ALL
          SELECT 'domain_failed', d.domain_name, d.id,
                 'Domain ' || d.status, d.created_at
            FROM store_domains d WHERE d.status IN ('FAILED','CANCELLED')
          UNION ALL
          SELECT 'payment_failed', s.name, sp.id,
                 'Subscription payment failed: ' || sp.failure_reason, sp.initiated_at
            FROM subscription_payments sp JOIN stores s ON s.id = sp.store_id
           WHERE sp.status = 'FAILED'
       ) attention ORDER BY at DESC LIMIT 25`),

      query(`SELECT action, admin_email, admin_name, target_type, target_id, detail, created_at
               FROM admin_audit_log ORDER BY created_at DESC LIMIT 15`),
    ]);

    const m = metrics.rows[0] || {};
    const current = Number(m.revenue_30d || 0);
    const previous = Number(m.revenue_prev_30d || 0);

    res.json({
      metrics: {
        ...m,
        // Percentage change is computed here so every dashboard surface shows
        // the same number; a null (no prior period) reads as "no comparison".
        revenueChangePct: previous > 0
          ? Number((((current - previous) / previous) * 100).toFixed(1))
          : null,
      },
      growth: growth.rows,
      topMerchants: topMerchants.rows,
      attention: attention.rows,
      recentAudit: recentAudit.rows.map((row) => ({
        ...row,
        actionLabel: ACTION_LABELS[row.action] || row.action,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
