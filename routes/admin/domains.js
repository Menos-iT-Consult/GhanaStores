/**
 * DiDwa - Super admin domain registry (provisioning across every tenant).
 *
 * GET /domains/:id/retry is carried over from the pre-split admin router
 * unchanged - it re-runs the Cloudflare verification and writes the result back
 * - with one addition: the retry is recorded, because a repeated verification
 * push is exactly the kind of operator action an audit trail exists for.
 */
import { Router } from 'express';
import { query } from '../../config/database.js';
import { verifyDomainStatus } from '../../services/domainService.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import { requireAdmin, readListQuery, listResponse, paged, enumFilter } from './helpers.js';

const router = Router();

const DOMAIN_STATUSES = ['PENDING_DNS', 'ACTIVE', 'FAILED', 'CANCELLED'];

const domainRow = (row) => ({
  id: row.id,
  storeId: row.store_id,
  storeName: row.store_name,
  slug: row.subdomain_slug,
  domainName: row.domain_name,
  provider: row.provider,
  status: row.status,
  sslStatus: row.ssl_status,
  customHostnameId: row.custom_hostname_id,
  dnsTargetA: row.dns_target_a,
  dnsTargetCname: row.dns_target_cname,
  pricePaid: row.price_paid_ghs,
  purchaseReference: row.purchase_reference,
  verificationErrors: row.verification_errors || [],
  registeredAt: row.registered_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

router.get('/domains', requireAdmin, async (req, res, next) => {
  try {
    const plan = readListQuery(req, {
      defaultLimit: 25,
      sorts: { created: 'd.created_at', status: 'd.status', name: 'd.domain_name' },
    });
    const status = enumFilter(req.query.status, DOMAIN_STATUSES);
    const filters = [];
    const params = [];

    if (plan.search) {
      params.push(plan.search);
      filters.push(`(d.domain_name ILIKE $${params.length} OR s.name ILIKE $${params.length}
                 OR s.subdomain_slug ILIKE $${params.length})`);
    }
    if (status) { params.push(status); filters.push(`d.status = $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const from = 'FROM store_domains d JOIN stores s ON s.id = d.store_id';

    const result = await paged({
      countSql: `SELECT COUNT(*)::int AS total ${from} ${where}`,
      rowsSql: `SELECT d.*, s.name AS store_name, s.subdomain_slug ${from} ${where}
                 ORDER BY ${plan.orderBy} NULLS LAST
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      params,
      page: plan.page,
      limit: plan.limit,
      offset: plan.offset,
    });
    listResponse(res, { ...result, rows: result.rows.map(domainRow) }, 'domains');
  } catch (err) {
    next(err);
  }
});

router.get('/domains/summary', requireAdmin, async (_req, res, next) => {
  try {
    const [byStatus, spend] = await Promise.all([
      query(`SELECT status, COUNT(*)::int AS count FROM store_domains GROUP BY status`),
      query(`SELECT COALESCE(SUM(price_paid_ghs), 0) AS spent,
                    COUNT(*) FILTER (WHERE provider = 'PURCHASED')::int AS purchased
               FROM store_domains`),
    ]);
    res.json({ byStatus: byStatus.rows, spend: spend.rows[0] || { spent: 0, purchased: 0 } });
  } catch (err) {
    next(err);
  }
});

/** Re-run verification for a domain that failed or was cancelled. */
router.post('/domains/:id/retry', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT id, domain_name FROM store_domains WHERE id = $1 AND status IN ('FAILED','CANCELLED') LIMIT 1",
      [req.params.id],
    );
    const domain = rows[0];
    if (!domain) return res.status(409).json({ error: 'Domain is not eligible for retry.' });

    const result = await verifyDomainStatus(domain.domain_name);
    const status = ['ACTIVE', 'PENDING_DNS', 'FAILED'].includes(result.status) ? result.status : 'FAILED';
    const { rows: updated } = await query(
      `UPDATE store_domains
          SET status = $2, ssl_status = COALESCE($3, ssl_status),
              custom_hostname_id = COALESCE($4, custom_hostname_id),
              verification_errors = COALESCE($5, verification_errors), updated_at = NOW()
        WHERE id = $1
       RETURNING id, domain_name, status, ssl_status, custom_hostname_id`,
      [
        domain.id,
        status,
        result.ssl?.status || null,
        result.customHostnameId || null,
        JSON.stringify(result.verificationErrors || []),
      ],
    );

    await recordAdminAction(req, {
      action: 'domain.retry',
      targetType: 'domain',
      targetId: domain.id,
      detail: { domain: domain.domain_name, from: 'FAILED/CANCELLED', to: status },
    });
    res.json({
      domain: updated[0],
      message: status === 'ACTIVE' ? 'Domain verified and activated.' : 'Domain verification refreshed.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
