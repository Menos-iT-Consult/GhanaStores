import { Router } from 'express';
import { query, withTransaction } from '../../config/database.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import { getAffiliateProgramSettings, affiliateProgramSettingDefinitions } from '../../services/affiliateProgramSettings.js';
import { requireAdmin, uuidParam } from './helpers.js';
import { notifyAffiliateById } from '../../services/affiliateNotifications.js';

const router = Router();

router.get('/affiliates', requireAdmin, async (_req, res, next) => {
  try {
    const [summary, affiliates] = await Promise.all([
      query(
        `SELECT
           (SELECT COUNT(*)::int FROM affiliates) AS total_affiliates,
           (SELECT COUNT(*)::int FROM affiliates WHERE is_active = TRUE) AS active_affiliates,
           (SELECT COUNT(*)::int FROM referrals) AS total_referrals,
           (SELECT COALESCE(SUM(earned_amount_ghs), 0)
              FROM affiliate_commissions WHERE status IN ('pending', 'paid')) AS total_commissions`,
      ),
      query(
        `SELECT a.id, a.referral_code, a.full_name, a.email, a.is_active, a.created_at,
                (SELECT COUNT(*)::int FROM referrals r WHERE r.affiliate_id = a.id) AS referral_count,
                (SELECT COALESCE(SUM(c.earned_amount_ghs), 0)
                   FROM affiliate_commissions c
                  WHERE c.affiliate_id = a.id AND c.status IN ('pending', 'paid')) AS commissions_earned,
                (SELECT COALESCE(SUM(p.amount_ghs), 0)
                   FROM affiliate_payouts p
                  WHERE p.affiliate_id = a.id AND p.status = 'pending') AS pending_payouts
           FROM affiliates a
          ORDER BY a.created_at DESC
          LIMIT 100`,
      ),
    ]);
    res.json({
      summary: summary.rows[0],
      affiliates: affiliates.rows,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/affiliate-payouts', requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.id, p.affiliate_id, a.full_name, a.email,
              p.amount_ghs, p.momo_network, p.momo_number, a.momo_verified_name,
              p.status, p.requested_at, p.processed_at, p.admin_note
         FROM affiliate_payouts p
         JOIN affiliates a ON a.id = p.affiliate_id
        ORDER BY p.requested_at DESC
        LIMIT 100`,
    );
    res.json({ payouts: rows });
  } catch (err) {
    next(err);
  }
});

router.patch('/affiliate-payouts/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = uuidParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid affiliate payout request id.' });

    const status = String(req.body?.status || '').trim().toLowerCase();
    if (!['paid', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be paid or rejected.' });
    }
    const transferReference = String(req.body?.transferReference || '').trim();
    const note = String(req.body?.note || '').trim();
    if (status === 'paid' && (!transferReference || transferReference.length > 120)) {
      return res.status(400).json({ error: 'Enter the completed transfer reference (maximum 120 characters).' });
    }
    if (status === 'rejected' && !note) {
      return res.status(400).json({ error: 'A reason is required when rejecting a payout.' });
    }
    if (note.length > 500) return res.status(400).json({ error: 'Note must be 500 characters or fewer.' });

    const result = await withTransaction(async ({ query: txQuery }) => {
      const { rows } = await txQuery(
        `SELECT id, affiliate_id, amount_ghs, status
           FROM affiliate_payouts
          WHERE id = $1
          FOR UPDATE`,
        [id],
      );
      const payout = rows[0];
      if (!payout) return { error: 'Affiliate payout request not found.', statusCode: 404 };
      if (payout.status !== 'pending') {
        return { error: `This payout request is already ${payout.status}.`, statusCode: 409 };
      }

      const adminNote = status === 'paid'
        ? [`Transfer reference: ${transferReference}`, note].filter(Boolean).join('\n')
        : note;
      const { rows: updated } = await txQuery(
        `UPDATE affiliate_payouts
            SET status = $2, processed_at = NOW(), admin_note = $3
          WHERE id = $1 AND status = 'pending'
          RETURNING id, affiliate_id, amount_ghs, status, processed_at, admin_note`,
        [id, status, adminNote],
      );
      return { payout: updated[0] };
    });

    if (result.error) return res.status(result.statusCode).json({ error: result.error });
    const payout = result.payout;
    await recordAdminAction(req, {
      action: status === 'paid' ? 'affiliate_payout.paid' : 'affiliate_payout.rejected',
      targetType: 'affiliate_payout',
      targetId: id,
      detail: {
        affiliateId: payout.affiliate_id,
        amountGhs: Number(payout.amount_ghs),
        status,
        transferReference: status === 'paid' ? transferReference : undefined,
        note: note || undefined,
      },
    });
    void notifyAffiliateById(payout.affiliate_id, `payout-${status}`, {
      amountGhs: payout.amount_ghs,
      note: status === 'rejected' ? note : undefined,
    });
    res.json({ payout });
  } catch (err) {
    next(err);
  }
});

router.get('/affiliate-program', requireAdmin, async (_req, res, next) => {
  try {
    res.json({ settings: await getAffiliateProgramSettings() });
  } catch (err) {
    next(err);
  }
});

router.patch('/affiliate-program', requireAdmin, async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'A reason is required for an affiliate program settings change.' });

    const current = await getAffiliateProgramSettings();
    const nextSettings = {
      commissionRatePercent: Number(req.body?.commissionRatePercent),
      minimumPayoutGhs: Number(req.body?.minimumPayoutGhs),
      attributionDays: Number(req.body?.attributionDays),
      payoutProcessingMinDays: Number(req.body?.payoutProcessingMinDays),
      payoutProcessingMaxDays: Number(req.body?.payoutProcessingMaxDays),
    };

    if (!Number.isFinite(nextSettings.commissionRatePercent)
      || nextSettings.commissionRatePercent < 0 || nextSettings.commissionRatePercent > 100) {
      return res.status(400).json({ error: 'Commission rate must be between 0 and 100 percent.' });
    }
    if (!Number.isFinite(nextSettings.minimumPayoutGhs)
      || nextSettings.minimumPayoutGhs < 0 || nextSettings.minimumPayoutGhs > 1_000_000) {
      return res.status(400).json({ error: 'Minimum payout must be between GHS 0 and GHS 1,000,000.' });
    }
    if (!Number.isInteger(nextSettings.attributionDays)
      || nextSettings.attributionDays < 1 || nextSettings.attributionDays > 3650) {
      return res.status(400).json({ error: 'Attribution duration must be between 1 and 3,650 days.' });
    }
    if (!Number.isInteger(nextSettings.payoutProcessingMinDays)
      || nextSettings.payoutProcessingMinDays < 0 || nextSettings.payoutProcessingMinDays > 365
      || !Number.isInteger(nextSettings.payoutProcessingMaxDays)
      || nextSettings.payoutProcessingMaxDays < nextSettings.payoutProcessingMinDays
      || nextSettings.payoutProcessingMaxDays > 365) {
      return res.status(400).json({ error: 'Payout processing days must be whole numbers from 0 to 365, with the maximum no lower than the minimum.' });
    }

    await withTransaction(async ({ query: txQuery }) => {
      for (const [name, { key, description }] of Object.entries(affiliateProgramSettingDefinitions)) {
        await txQuery(
          `INSERT INTO system_settings (setting_key, setting_value, description)
           VALUES ($1, $2, $3)
           ON CONFLICT (setting_key) DO UPDATE
             SET setting_value = EXCLUDED.setting_value,
                 description = EXCLUDED.description,
                 updated_at = NOW()`,
          [key, String(nextSettings[name]), description],
        );
      }
    });

    await recordAdminAction(req, {
      action: 'affiliate_program.settings',
      targetType: 'system_settings',
      detail: { from: current, to: nextSettings, reason },
    });
    res.json({ settings: await getAffiliateProgramSettings() });
  } catch (err) {
    next(err);
  }
});

export default router;
