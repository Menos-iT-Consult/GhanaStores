/**
 * DiDwa - Per-store SMS provider settings (BYOK) for ORDER messages.
 *
 * The design mirrors services/storePayments.js deliberately: same secretBox,
 * same masked client view, same "blank means keep what is saved" merge rule, so
 * a merchant who learns one settings page already understands this one.
 *
 * THE ONE RULE THIS MODULE ENFORCES: merchant credentials are used for order
 * notifications ONLY. They are never consulted for the billing lifecycle or
 * low-stock alerts, which always run on the DiDwa platform key. The reason is
 * not tidiness - when a store is SUSPENDED its own credentials are exactly what
 * we cannot rely on. A suspension notice sent on a merchant's key would never
 * reach a merchant who deleted that key, emptied that balance, or whose
 * provider is down, and that store would stay suspended forever, paying
 * nothing, with no idea why. Platform-level messages must not depend on a
 * tenant being healthy.
 */
import { query } from '../config/database.js';
import { decryptSecret, encryptSecret, maskSecret } from './secretBox.js';

/** 'PLATFORM' is a real value, not a provider: it means "use the DiDwa key". */
export const SMS_CHANNELS = ['MNOTIFY', 'ARKESEL', 'HUBTEL', 'PLATFORM'];

/** Credential columns per provider, mirroring the DB CHECK constraint. */
const REQUIRED = {
  MNOTIFY: ['apiKey', 'senderId'],
  ARKESEL: ['apiKey', 'senderId'],
  HUBTEL: ['clientId', 'clientSecret', 'merchantAccountId'],
  PLATFORM: [],
};

function decryptRow(row) {
  if (!row) return null;
  return {
    storeId: row.store_id,
    provider: row.provider || 'PLATFORM',
    enableOrderSms: row.enable_order_sms === true,
    apiKey: decryptSecret(row.api_key),
    senderId: decryptSecret(row.sender_id),
    clientId: decryptSecret(row.client_id),
    clientSecret: decryptSecret(row.client_secret),
    merchantAccountId: decryptSecret(row.merchant_account_id),
  };
}

/** Raw settings row for one store, or null. Never exposes another store. */
export async function getSettingsRow(storeId) {
  const { rows } = await query('SELECT * FROM store_sms_settings WHERE store_id = $1', [storeId]);
  return rows[0] || null;
}

export async function getSettings(storeId) {
  return decryptRow(await getSettingsRow(storeId));
}

/** Are all credentials this provider needs actually present? */
export function isProviderReady(settings) {
  if (!settings) return false;
  const needed = REQUIRED[settings.provider] || [];
  return needed.every((key) => Boolean(settings[key]));
}

/** True when the order path would actually send on the merchant's own account. */
export function usesMerchantKey(settings) {
  return Boolean(settings && settings.enableOrderSms && isProviderReady(settings));
}

export async function saveSettings(storeId, input) {
  const sealed = {
    apiKey: encryptSecret(input.apiKey),
    senderId: encryptSecret(input.senderId),
    clientId: encryptSecret(input.clientId),
    clientSecret: encryptSecret(input.clientSecret),
    merchantAccountId: encryptSecret(input.merchantAccountId),
  };

  const { rows } = await query(
    `INSERT INTO store_sms_settings
       (store_id, provider, enable_order_sms, api_key, sender_id,
        client_id, client_secret, merchant_account_id, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (store_id) DO UPDATE SET
       provider            = EXCLUDED.provider,
       enable_order_sms    = EXCLUDED.enable_order_sms,
       api_key             = EXCLUDED.api_key,
       sender_id           = EXCLUDED.sender_id,
       client_id           = EXCLUDED.client_id,
       client_secret       = EXCLUDED.client_secret,
       merchant_account_id = EXCLUDED.merchant_account_id,
       updated_at          = NOW()
     RETURNING *`,
    [storeId, input.provider || 'PLATFORM', input.enableOrderSms === true,
      sealed.apiKey, sealed.senderId, sealed.clientId, sealed.clientSecret, sealed.merchantAccountId],
  );
  return decryptRow(rows[0]);
}

/**
 * Settings shaped for the merchant UI: presence flags and masks, never a
 * secret. `effectiveChannel` tells the merchant which account the message will
 * actually go out on, which is the question they really have.
 */
export function toClientView(settings) {
  const base = {
    configured: false,
    enableOrderSms: false,
    provider: 'PLATFORM',
    apiKeyMasked: null,
    senderId: '',
    clientId: '',
    clientSecretMasked: null,
    merchantAccountId: '',
    effectiveChannel: 'PLATFORM',
  };
  if (!settings) return base;
  return {
    configured: isProviderReady(settings),
    enableOrderSms: settings.enableOrderSms,
    provider: settings.provider,
    apiKeyMasked: maskSecret(settings.apiKey),
    senderId: settings.senderId || '',
    clientId: settings.clientId || '',
    clientSecretMasked: maskSecret(settings.clientSecret),
    merchantAccountId: settings.merchantAccountId || '',
    effectiveChannel: usesMerchantKey(settings) ? settings.provider : 'PLATFORM',
  };
}

/** The credential bundle handed to the provider registry. Never logged. */
export function toProviderCreds(settings) {
  return {
    apiKey: settings.apiKey,
    senderId: settings.senderId,
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    merchantAccountId: settings.merchantAccountId,
  };
}