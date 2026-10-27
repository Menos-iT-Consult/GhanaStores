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
 *   - History: every attempt is also mirrored into merchant_notifications (the
 *     app's Notifications screen); recording + retention pruning are themselves
 *     fire-and-forget so a failing history table can never break a sale either.
 */
import axios from 'axios';
import { query } from '../config/database.js';

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_SIZE = 100;

export function chunkExpoMessages(messages, batchSize = EXPO_BATCH_SIZE) {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError('batchSize must be a positive integer');
  }
  const chunks = [];
  for (let index = 0; index < messages.length; index += batchSize) {
    chunks.push(messages.slice(index, index + batchSize));
  }
  return chunks;
}

export function summarizeExpoTickets(tokens, tickets) {
  const acceptedTokens = [];
  const invalidTokens = [];
  let failed = 0;

  tokens.forEach((token, index) => {
    const ticket = tickets[index];
    if (ticket?.status === 'ok') {
      acceptedTokens.push(token);
      return;
    }

    failed += 1;
    if (ticket?.details?.error === 'DeviceNotRegistered') invalidTokens.push(token);
  });

  return { acceptedTokens, invalidTokens, failed };
}

/**
 * Send a push notification to every device registered for a store.
 *
 * @param {object} args
 * @param {string} args.storeId  tenant to notify
 * @param {string} args.title    notification title
 * @param {string} args.body     notification body
 * @param {object} [args.data]   arbitrary deep-link payload (order ids, etc.)
 * @returns {Promise<{sent:number, failed:number, error?:string}>} Expo-accepted and failed messages
 */
/** Days of history kept per store in merchant_notifications (pruned on dispatch). */
const NOTIFICATION_RETENTION_DAYS = 180;

/**
 * Persist one push attempt into the Notifications history feed, then prune the
 * store's feed to the retention window (piggy-backed on dispatch, so no extra
 * scheduler is needed). Callers never await this beyond a `.catch` — a failing
 * history table must never surface as an error anywhere.
 *
 * @param {object} args
 * @param {string} args.storeId
 * @param {string} args.title
 * @param {string} args.body
 * @param {object} [args.data]
 * @param {number} args.sent devices Expo accepted (not a delivery receipt)
 */
async function recordNotification({ storeId, title, body, data, sent }) {
  await query(
    `INSERT INTO merchant_notifications (store_id, title, body, type, data, sent_count)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [
      storeId,
      String(title),
      String(body),
      data && data.type ? String(data.type) : null,
      JSON.stringify(data && typeof data === 'object' ? data : {}),
      Number(sent) || 0,
    ],
  );
  await query(
    `DELETE FROM merchant_notifications
      WHERE store_id = $1
        AND created_at < NOW() - ($2 || ' days')::interval`,
    [storeId, String(NOTIFICATION_RETENTION_DAYS)],
  );
}

export async function sendMerchantPushNotification({ storeId, title, body, data }) {
  // Nothing valid to say -> nothing dispatched, nothing recorded (unchanged).
  if (!storeId || !title || !body) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  let pushError;
  try {
    const { rows } = await query(
      'SELECT expo_push_token, platform FROM device_tokens WHERE store_id = $1',
      [storeId],
    );


    if (rows.length > 0) {
      const messages = rows.map((r) => ({
        to: r.expo_push_token,
        sound: 'default',
        title: String(title),
        body: String(body),
        data: data || {},
        // Android decides visibility by channel. Since Expo's FCM V1 migration a
        // message with no channelId is dropped into an auto-created fallback
        // channel (fcm_fallback_notification_channel) which is often silent, so
        // the notification arrives but is never seen. Target the high-importance
        // 'orders' channel the client creates on permission grant. Ignored on iOS.
        ...(r.platform === 'android' ? { channelId: 'orders' } : {}),
      }));

      const invalidTokens = [];
      let offset = 0;
      for (const batch of chunkExpoMessages(messages)) {
        const batchTokens = rows.slice(offset, offset + batch.length).map((row) => row.expo_push_token);
        offset += batch.length;
        try {
          const response = await axios.post(EXPO_PUSH_URL, batch, {
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            timeout: 10_000,
          });
          const tickets = Array.isArray(response.data?.data) ? response.data.data : [];
          const summary = summarizeExpoTickets(batchTokens, tickets);
          sent += summary.acceptedTokens.length;
          failed += Math.max(batch.length - summary.acceptedTokens.length, summary.failed);
          invalidTokens.push(...summary.invalidTokens);
          if (summary.failed > 0) {
            pushError = 'expo_ticket_error';
            console.warn(`[push] Expo rejected ${summary.failed} message(s) for store ${storeId}.`);
          }
        } catch (err) {
          failed += batch.length;
          pushError = err?.message || 'push_failed';
          console.error(
            `[push] failed to notify store ${storeId}:`,
            err?.response?.data || err?.message || err,
          );
        }
      }

      if (invalidTokens.length > 0) {
        await query(
          'DELETE FROM device_tokens WHERE expo_push_token = ANY($1::text[])',
          [invalidTokens],
        ).catch((err) => {
          console.warn('[push] could not remove unregistered device tokens:', err?.message || err);
        });
      }
    }
  } catch (err) {
    pushError = err?.message || 'push_failed';
    console.error(
      `[push] failed to notify store ${storeId}:`,
      err?.response?.data || err?.message || err,
    );
  }

  // History: recorded even when zero devices were registered — the event still
  // happened and the merchant should find it in the app's inbox on next login.
  // Fire-and-forget so history can never reject the caller's flow.
  await recordNotification({ storeId, title, body, data, sent }).catch((err) =>
    console.warn('[push] could not record notification history:', err?.message || err),
  );

  return pushError ? { sent, failed, error: pushError } : { sent, failed };
}
