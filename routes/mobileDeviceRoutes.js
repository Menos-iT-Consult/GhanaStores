/**
 * DiDwa - Mobile App Push Device Tokens (/api/mobile/devices)
 *
 * Registers and unregisters the merchant's Expo push token so the dispatch
 * service (services/pushService.js) can reach their phone. Auth is the mobile
 * bearer token; the store is taken from the token, never the body, so a device
 * can only ever be attached to the signed-in merchant's own store.
 */
import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticateMobileToken } from '../middleware/authMiddleware.js';

const router = Router();

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  orders: true,
  payments: true,
  stock: true,
  account: true,
});

export function isNotificationPreferences(value) {
  return value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).every((key) => typeof value[key] === 'boolean');
}

/** Expo push tokens are always `ExponentPushToken[...]` or `ExpoPushToken[...]`. */
export function isExpoPushToken(t) {
  const s = typeof t === 'string' ? t.trim() : '';
  return s.startsWith('ExponentPushToken[') || s.startsWith('ExpoPushToken[');
}

/* --------------------------------- Register -------------------------------- */
// Save (or re-assign) the merchant's push token. A device keeps its alert
// preferences when it re-registers for the same owner; moving it to a new owner
// starts with the default preferences.
router.post('/register', authenticateMobileToken, async (req, res, next) => {
  try {
    const { token, platform } = req.body || {};
    const plat = String(platform || '').toLowerCase();

    if (!isExpoPushToken(token)) {
      return res.status(400).json({ error: 'A valid Expo push token is required.' });
    }
    if (!['ios', 'android'].includes(plat)) {
      return res.status(400).json({ error: "Platform must be 'ios' or 'android'." });
    }

    await query(
      `INSERT INTO device_tokens (store_id, user_id, expo_push_token, platform, last_seen_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (expo_push_token) DO UPDATE SET
         store_id     = EXCLUDED.store_id,
         user_id      = EXCLUDED.user_id,
         platform     = EXCLUDED.platform,
         notification_preferences = CASE
           WHEN device_tokens.store_id = EXCLUDED.store_id
            AND device_tokens.user_id IS NOT DISTINCT FROM EXCLUDED.user_id
           THEN device_tokens.notification_preferences
           ELSE '{"orders":true,"payments":true,"stock":true,"account":true}'::jsonb
         END,
         last_seen_at = NOW()`,
      [req.storeId, req.user.id, token.trim(), plat],
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------- Unregister ------------------------------- */
// Remove the token on logout. Scoped to the store so a device can only be
// removed from the merchant who owns it.
router.delete('/unregister', authenticateMobileToken, async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (!isExpoPushToken(token)) {
      return res.status(400).json({ error: 'A valid Expo push token is required.' });
    }

    await query(
      'DELETE FROM device_tokens WHERE expo_push_token = $1 AND store_id = $2',
      [token.trim(), req.storeId],
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* -------------------------- Per-device preferences ------------------------- */
router.get('/preferences', authenticateMobileToken, async (req, res, next) => {
  try {
    const token = String(req.query?.token || '').trim();
    if (!isExpoPushToken(token)) {
      return res.status(400).json({ error: 'A valid Expo push token is required.' });
    }

    const { rows } = await query(
      `SELECT notification_preferences
         FROM device_tokens
        WHERE expo_push_token = $1 AND store_id = $2 AND user_id = $3
        LIMIT 1`,
      [token, req.storeId, req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'This device is not registered for notifications.' });
    res.json({ preferences: rows[0].notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES });
  } catch (err) {
    next(err);
  }
});

router.put('/preferences', authenticateMobileToken, async (req, res, next) => {
  try {
    const token = String(req.body?.token || '').trim();
    const preferences = req.body?.preferences;
    if (!isExpoPushToken(token)) {
      return res.status(400).json({ error: 'A valid Expo push token is required.' });
    }
    if (!isNotificationPreferences(preferences)) {
      return res.status(400).json({ error: 'All notification categories must be enabled or disabled.' });
    }

    const { rows } = await query(
      `UPDATE device_tokens
          SET notification_preferences = $4::jsonb, last_seen_at = NOW()
        WHERE expo_push_token = $1 AND store_id = $2 AND user_id = $3
        RETURNING notification_preferences`,
      [token, req.storeId, req.user.id, JSON.stringify(preferences)],
    );
    if (!rows[0]) return res.status(404).json({ error: 'This device is not registered for notifications.' });
    res.json({ preferences: rows[0].notification_preferences });
  } catch (err) {
    next(err);
  }
});

export default router;
