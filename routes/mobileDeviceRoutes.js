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

/** Expo push tokens are always `ExponentPushToken[...]` or `ExpoPushToken[...]`. */
export function isExpoPushToken(t) {
  const s = typeof t === 'string' ? t.trim() : '';
  return s.startsWith('ExponentPushToken[') || s.startsWith('ExpoPushToken[');
}

/* --------------------------------- Register -------------------------------- */
// Save (or re-assign) the merchant's push token. The token is globally unique,
// so an upsert on it handles both a first registration and a re-login on a
// device that previously belonged to this same store: re-assigning store/user
// and bumping last_seen_at keeps the newest device state.
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

export default router;
