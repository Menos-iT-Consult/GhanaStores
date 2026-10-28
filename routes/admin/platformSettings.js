import { Router } from 'express';
import { query, withTransaction } from '../../config/database.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import {
  getPlatformPublicSettings,
  platformPublicSettingsValues,
  validatePlatformPublicSettings,
} from '../../services/platformPublicSettings.js';
import { requireAdmin } from './helpers.js';

const router = Router();

router.get('/platform-settings', requireAdmin, async (_req, res, next) => {
  try {
    res.json({ settings: await getPlatformPublicSettings() });
  } catch (err) {
    next(err);
  }
});

router.patch('/platform-settings', requireAdmin, async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'A reason is required for platform settings changes.' });
    if (reason.length > 500) return res.status(400).json({ error: 'Reason must be 500 characters or fewer.' });

    const result = validatePlatformPublicSettings(req.body?.settings);
    if (result.error) return res.status(400).json({ error: result.error });

    const before = await getPlatformPublicSettings();
    const settings = result.settings;
    await withTransaction(async ({ query: txQuery }) => {
      for (const setting of platformPublicSettingsValues(settings)) {
        await txQuery(
          `INSERT INTO system_settings (setting_key, setting_value, description)
           VALUES ($1, $2, $3)
           ON CONFLICT (setting_key) DO UPDATE
             SET setting_value = EXCLUDED.setting_value,
                 description = EXCLUDED.description,
                 updated_at = NOW()`,
          [setting.key, setting.value, setting.description],
        );
      }
    });

    await recordAdminAction(req, {
      action: 'platform.public_settings',
      targetType: 'system_settings',
      detail: { from: before, to: settings, reason },
    });
    res.json({ settings: await getPlatformPublicSettings(query) });
  } catch (err) {
    next(err);
  }
});

export default router;
