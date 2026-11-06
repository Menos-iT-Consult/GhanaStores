import { Router } from 'express';
import { query, withTransaction } from '../../config/database.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import { requireAdmin, uuidParam } from './helpers.js';

const router = Router();

router.get('/partners', requireAdmin, async (_req, res, next) => {
  try {
    const [summary, partners, payouts] = await Promise.all([
      query(
        `SELECT
           (SELECT COUNT(*)::int FROM partners) AS total_partners,
           (SELECT COUNT(*)::int FROM partners WHERE status = 'pending') AS pending_applications,
           (SELECT COUNT(*)::int FROM partners WHERE status = 'approved') AS approved_partners,
           (SELECT COALESCE(SUM(earned_amount_ghs), 0)
              FROM partner_ledgers WHERE status IN ('pending','available')) AS total_earned_ghs`,
      ),
      query(
        `SELECT p.id, p.full_name, p.email, p.phone, p.organization_name, p.partner_code,
                p.partner_slug, p.status, p.merchant_override_rate_percent,
                p.affiliate_override_rate_percent, p.momo_network, p.momo_number,
                p.momo_verified_name, p.momo_verified_at, p.admin_note, p.created_at,
                (SELECT COUNT(*)::int FROM partner_network n
                  WHERE n.partner_id = p.id AND n.relationship = 'merchant') AS merchant_count,
                (SELECT COUNT(*)::int FROM partner_network n
                  WHERE n.partner_id = p.id AND n.relationship = 'affiliate') AS affiliate_count,
                (SELECT COALESCE(SUM(l.earned_amount_ghs), 0) FROM partner_ledgers l
                  WHERE l.partner_id = p.id AND l.status IN ('pending','available')) AS earned_ghs
           FROM partners p
          ORDER BY CASE p.status WHEN 'pending' THEN 0 ELSE 1 END, p.created_at DESC
          LIMIT 200`,
      ),
      query(
        `SELECT p.id, p.partner_id, a.full_name, a.organization_name, p.amount_ghs,
                p.momo_network, p.momo_number, p.momo_account_name, p.status,
                p.transfer_reference, p.admin_note, p.requested_at, p.processed_at
           FROM partner_payouts p
           JOIN partners a ON a.id = p.partner_id
          ORDER BY CASE p.status WHEN 'pending' THEN 0 ELSE 1 END, p.requested_at DESC
          LIMIT 100`,
      ),
    ]);
    return res.json({
      summary: summary.rows[0],
      partners: partners.rows,
      payouts: payouts.rows,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/partners/:id/network', requireAdmin, async (req, res, next) => {
  try {
    const id = uuidParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid partner id.' });
    const [partner, merchants, affiliates] = await Promise.all([
      query(
        `SELECT id, full_name, organization_name, status
           FROM partners WHERE id = $1 LIMIT 1`,
        [id],
      ),
      query(
        `SELECT s.id, s.name, s.email, s.subdomain_slug, s.status, n.joined_at,
                (SELECT COALESCE(SUM(o.total), 0) FROM orders o
                  WHERE o.store_id = s.id AND o.payment_status = 'PAID'
                    AND o.status IN ('PAID','FULFILLED','DELIVERED')) AS paid_volume_ghs
           FROM partner_network n
           JOIN stores s ON s.id = n.merchant_id
          WHERE n.partner_id = $1 AND n.relationship = 'merchant'
          ORDER BY n.joined_at DESC
          LIMIT 100`,
        [id],
      ),
      query(
        `SELECT a.id, a.full_name, a.email, a.referral_code, a.is_active, n.joined_at,
                (SELECT COUNT(*)::int FROM referrals r WHERE r.affiliate_id = a.id) AS referred_merchants,
                (SELECT COALESCE(SUM(c.earned_amount_ghs), 0)
                   FROM affiliate_commissions c
                  WHERE c.affiliate_id = a.id AND c.status <> 'reversed') AS commission_ghs,
                COALESCE((
                  SELECT json_agg(json_build_object(
                    'id', s.id, 'name', s.name, 'status', s.status, 'joinedAt', r.referred_at
                  ) ORDER BY r.referred_at DESC)
                    FROM referrals r
                    JOIN stores s ON s.id = r.referred_store_id
                   WHERE r.affiliate_id = a.id
                ), '[]'::json) AS merchants
           FROM partner_network n
           JOIN affiliates a ON a.id = n.affiliate_id
          WHERE n.partner_id = $1 AND n.relationship = 'affiliate'
          ORDER BY n.joined_at DESC
          LIMIT 100`,
        [id],
      ),
    ]);
    if (!partner.rows[0]) return res.status(404).json({ error: 'Partner not found.' });
    return res.json({
      partner: partner.rows[0],
      merchants: merchants.rows,
      affiliates: affiliates.rows,
    });
  } catch (err) {
    return next(err);
  }
});

router.patch('/partners/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = uuidParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid partner id.' });

    const status = String(req.body?.status || '').trim().toLowerCase();
    const merchantRate = Number(req.body?.merchantOverrideRatePercent);
    const affiliateRate = Number(req.body?.affiliateOverrideRatePercent);
    const note = String(req.body?.note || '').trim();
    const reason = String(req.body?.reason || '').trim();
    if (!['approved', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Choose approved, rejected, or suspended.' });
    }
    if (!Number.isFinite(merchantRate) || merchantRate < 0 || merchantRate > 100
        || !Number.isFinite(affiliateRate) || affiliateRate < 0 || affiliateRate > 100) {
      return res.status(400).json({ error: 'Both override rates must be between 0 and 100 percent.' });
    }
    if (!reason || reason.length > 500 || note.length > 500) {
      return res.status(400).json({ error: 'A review reason is required and must be 500 characters or fewer.' });
    }

    const { rows } = await query(
      `UPDATE partners
          SET status = $2, merchant_override_rate_percent = $3,
              affiliate_override_rate_percent = $4, admin_note = $5,
              reviewed_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING id, full_name, email, organization_name, status,
                  merchant_override_rate_percent, affiliate_override_rate_percent,
                  admin_note, reviewed_at`,
      [id, status, merchantRate, affiliateRate, note || null],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Partner application not found.' });
    await recordAdminAction(req, {
      action: `partner.${status}`,
      targetType: 'partner',
      targetId: id,
      detail: {
        status,
        merchantOverrideRatePercent: merchantRate,
        affiliateOverrideRatePercent: affiliateRate,
        note: note || undefined,
        reason,
      },
    });
    return res.json({ partner: rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.patch('/partner-payouts/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = uuidParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid partner payout request id.' });
    const status = String(req.body?.status || '').trim().toLowerCase();
    const transferReference = String(req.body?.transferReference || '').trim();
    const note = String(req.body?.note || '').trim();
    if (!['paid', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be paid or rejected.' });
    }
    if (status === 'paid' && (!transferReference || transferReference.length > 120)) {
      return res.status(400).json({ error: 'Enter the completed transfer reference (maximum 120 characters).' });
    }
    if (status === 'rejected' && !note) {
      return res.status(400).json({ error: 'A reason is required when rejecting a payout.' });
    }
    if (note.length > 500) return res.status(400).json({ error: 'Note must be 500 characters or fewer.' });

    const result = await withTransaction(async ({ query: txQuery }) => {
      const { rows } = await txQuery(
        `SELECT id, partner_id, amount_ghs, status
           FROM partner_payouts WHERE id = $1 FOR UPDATE`,
        [id],
      );
      const payout = rows[0];
      if (!payout) return { error: 'Partner payout request not found.', statusCode: 404 };
      if (payout.status !== 'pending') {
        return { error: `This payout request is already ${payout.status}.`, statusCode: 409 };
      }
      const { rows: updated } = await txQuery(
        `UPDATE partner_payouts
            SET status = $2, transfer_reference = $3, admin_note = $4,
                processed_at = NOW(), processed_by_admin_id = $5
          WHERE id = $1 AND status = 'pending'
          RETURNING id, partner_id, amount_ghs, status, processed_at, transfer_reference, admin_note`,
        [
          id,
          status,
          status === 'paid' ? transferReference : null,
          note || null,
          req.auth.sub,
        ],
      );
      return { payout: updated[0] };
    });
    if (result.error) return res.status(result.statusCode).json({ error: result.error });
    await recordAdminAction(req, {
      action: status === 'paid' ? 'partner_payout.paid' : 'partner_payout.rejected',
      targetType: 'partner_payout',
      targetId: id,
      detail: {
        partnerId: result.payout.partner_id,
        amountGhs: Number(result.payout.amount_ghs),
        status,
        transferReference: status === 'paid' ? transferReference : undefined,
        note: note || undefined,
      },
    });
    return res.json({ payout: result.payout });
  } catch (err) {
    return next(err);
  }
});

export default router;
