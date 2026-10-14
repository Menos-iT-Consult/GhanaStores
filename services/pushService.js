/**
 * DiDwa - Merchant push notifications (Expo).
 *
 * Sellers run the DiDwa Seller mobile app (iOS/Android) built on Expo. When
 * something needs a merchant's attention instantly - a new order, a completed
 * payment, a status change, a renewed subscription - this is the one place that
 * turns that event into a device notification.
 *
 * Design rules, mirroring smsService / low-stock alerts:
 *   - Fire-and-forget: a push hiccup must NEVER turn a committed order or a
 *     settled payment into a 500. sendMerchantPushNotification catches everything
 *     and returns a result object rather than throwing.
 *   - Tenant-scoped: only the push tokens registered for THIS store are used.
 *   - Best effort: Expo returns per-message tickets (ok / error); errors are
 *     logged, never propagated, so a bad or revoked token cannot break a sale.
 */
import axios from 'axios';
import { query } from '../config/database.js';

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification to every device registered for a store.
 *
 * @param {object} args
 * @param {string} args.storeId  tenant to notify
 * @param {string} args.title    notification title
 * @param {string} args.body     notification body
 * @param {object} [args.data]   arbitrary deep-link payload (order ids, etc.)
 * @returns {Promise<{sent:number, error?:string}>} count of messages dispatched
 */
export async function sendMerchantPushNotification({ storeId, title, body, data }) {
  try {
    if (!storeId || !title || !body) return { sent: 0 };

    const { rows } = await query(
      'SELECT expo_push_token FROM device_tokens WHERE store_id = $1',
      [storeId],
    );
    if (rows.length === 0) return { sent: 0 };

    // Expo accepts a single message object or an array of message objects; we
    // always send the array form so one call reaches every logged-in device.
    const messages = rows.map((r) => ({
      to: r.expo_push_token,
      sound: 'default',
      title: String(title),
      body: String(body),
      data: data || {},
    }));

    await axios.post(EXPO_PUSH_URL, messages, {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      timeout: 10_000,
    });
    return { sent: rows.length };
  } catch (err) {
    console.error(
      `[push] failed to notify store ${storeId}:`,
      err?.response?.data || err?.message || err,
    );
    return { sent: 0, error: err?.message || 'push_failed' };
  }
}
