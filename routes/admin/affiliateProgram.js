import { Router } from 'express';
import { withTransaction } from '../../config/database.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import { getAffiliateProgramSettings, affiliateProgramSettingDefinitions } from '../../services/affiliateProgramSettings.js';
import { requireAdmin } from './helpers.js';

const router = Router();

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
