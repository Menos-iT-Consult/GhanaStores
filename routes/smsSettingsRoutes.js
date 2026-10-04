/**
 * DiDwa - Merchant SMS Settings (BYOK) for ORDER messages.
 *
 * GET  /api/sms-settings          -> masked settings for the signed-in store
 * PUT  /api/sms-settings          -> save provider + credentials + toggle
 * POST /api/sms-settings/test     -> validate credentials BEFORE saving
 *
 * Mirrors routes/paymentSettingsRoutes.js exactly - same requireSeller
 * scoping, same write-only secrets, same "blank means keep what is saved" merge
 * rule - so the two settings pages behave identically for a merchant.
 *
 * Security notes:
 *  - Every route is requireSeller-scoped to req.store, so a merchant can only
 *    ever read or write their own credentials.
 *  - Secrets are write-only. GET returns masks and presence flags, never a value.
 *  - The test endpoint CANNOT send to an arbitrary number (see pingProvider).
 *    Without that guard it would be a free SMS relay: any seller could send
 *    fraudulent-looking messages to any Ghanaian number using DiDwa's
 *    reputation and their own quota.
 */
import { Router } from 'express';
import axios from 'axios';
import { requireSeller } from '../middleware/authMiddleware.js';
import {
  SMS_CHANNELS, getSettings, saveSettings, toClientView, isProviderReady,
} from '../services/storeSms.js';
import { SMS_PROVIDERS } from '../services/smsProviders.js';
import { encryptionConfigured } from '../services/secretBox.js';
import { getQuota, planAllowance } from '../services/smsQuota.js';

const router = Router();

/** Trim, and treat an empty string as "merchant left this blank". */
const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? null : String(v).trim() || null);

function parseBody(b = {}) {
  return {
    provider: String(b.provider || 'PLATFORM').toUpperCase(),
    enableOrderSms: b.enableOrderSms === true || b.enableOrderSms === 'true',
    apiKey: str(b.apiKey),
    senderId: str(b.senderId),
    clientId: str(b.clientId),
    clientSecret: str(b.clientSecret),
    merchantAccountId: str(b.merchantAccountId),
  };
}

/**
 * Merge submitted fields over the stored ones. A blank secret means "keep what
 * is already saved" - the UI sends a mask back in that case, and overwriting a
 * real key with a mask would silently disable a merchant's order SMS.
 */
async function mergeWithStored(storeId, input) {
  const stored = (await getSettings(storeId)) || {};
  const pick = (incoming, existing) => (incoming == null ? existing || null : incoming);
  return {
    provider: input.provider,
    enableOrderSms: input.enableOrderSms,
    apiKey: pick(input.apiKey, stored.apiKey),
    senderId: pick(input.senderId, stored.senderId),
    clientId: pick(input.clientId, stored.clientId),
    clientSecret: pick(input.clientSecret, stored.clientSecret),
    merchantAccountId: pick(input.merchantAccountId, stored.merchantAccountId),
  };
}

/** Provider field descriptors, so the UI never hardcodes the form. */
router.get('/providers', requireSeller, (_req, res) => {
  res.json({
    providers: Object.entries(SMS_PROVIDERS).map(([id, p]) => ({ id, label: p.label, docs: p.docs, fields: p.fields })),
  });
});

/* ---------------------------------- Read ---------------------------------- */

router.get('/', requireSeller, async (req, res, next) => {
  try {
    const [settings, quota, allowance] = await Promise.all([
      getSettings(req.store.id),
      // Failures here must not blank the whole page: the merchant can still edit
      // their own credentials even if the usage ledger is unreachable.
      getQuota(req.store.id).catch(() => null),
      planAllowance(req.store.id).catch(() => 0),
    ]);
    // No row is not an error: it means order SMS runs on the platform key, the
    // correct default before a merchant connects anything.
    res.json({
      settings: toClientView(settings),
      storageConfigured: encryptionConfigured(),
      planAllowance: allowance,
      quota,
      // Whether DiDwa SMS may be selected right now. A store with no plan
      // allowance can still use it once it buys prepaid segments, so this must
      // NOT be a permanent Starter lockout.
      canUsePlatform: allowance > 0 || (quota?.totalRemaining ?? 0) > 0,
    });
  } catch (err) { next(err); }
});

/* ------------------------- Validate before saving ------------------------- */

/** Translate a provider failure into something a merchant can act on. */
function providerError(providerId, err) {
  const status = err?.response?.status;
  const body = err?.response?.data;
  const label = SMS_PROVIDERS[providerId]?.label || providerId;
  if (status === 401 || status === 403) return `${label} rejected the credentials.`;
  if (status === 400) {
    const detail = typeof body?.message === 'string' ? body.message : null;
    return detail ? `${label}: ${detail.slice(0, 160)}` : `${label} rejected the request.`;
  }
  if (status === 429) return `${label} rate-limited the request. Try again shortly.`;
  if (err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT') return `${label} did not respond in time.`;
  return `Could not reach ${label}. Check your connection and try again.`;
}

/**
 * Verify candidate credentials WITHOUT sending a message to a number the
 * merchant chose. Every probe hits a read-only or account endpoint:
 *   mNotify - GET /balance/sms (validates the key)
 *   Arkesel  - POST /quick with an EMPTY `to` (validates key, delivers nothing)
 *   Hubtel  - GET /account (validates the client id/secret)
 *   PLATFORM - nothing to validate; DiDwa's own key is in use
 *
 * Note what this cannot do: a sender ID that is not approved fails at SEND
 * time, not here. So the mNotify probe says so explicitly rather than implying
 * a green tick proves delivery will work.
 */
async function pingProvider(providerId, creds) {
  if (providerId === 'PLATFORM') {
    return { valid: true, message: 'Order SMS will run on the DiDwa platform sender. No keys needed.' };
  }
  try {
    if (providerId === 'MNOTIFY') {
      const { data } = await axios.get('https://api.mnotify.com/api/balance/sms', {
        params: { key: creds.apiKey }, timeout: 15_000,
      });
      if (data?.status !== 'success') return { valid: false, message: 'mNotify did not accept the API key.' };
      return {
        valid: true,
        message: `mNotify key accepted (balance ${data?.balance ?? 'unknown'}). `
          + `Confirm "${creds.senderId}" is registered and approved on your account.`,
      };
    }
    if (providerId === 'ARKESEL') {
      await axios.post('https://sms.arkesel.com/api/v1/sms/quick', 'to=', {
        headers: { 'api-key': creds.apiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15_000,
      });
      return { valid: true, message: 'Arkesel key accepted.' };
    }
    if (providerId === 'HUBTEL') {
      await axios.get(`https://api-ecs.hubtel.com/v1/merchantaccount/${encodeURIComponent(creds.merchantAccountId)}/account`, {
        auth: { username: creds.clientId, password: creds.clientSecret },
        timeout: 15_000,
      });
      return { valid: true, message: 'Hubtel client ID and secret accepted.' };
    }
    return { valid: false, message: `Unknown provider "${providerId}".` };
  } catch (err) {
    return { valid: false, message: providerError(providerId, err) };
  }
}

router.post('/test', requireSeller, async (req, res, next) => {
  try {
    if (!encryptionConfigured()) {
      return res.status(503).json({
        error: 'SMS key storage is not configured on this server.',
        code: 'SMS_KEYS_NOT_CONFIGURED',
      });
    }
    // Test the CANDIDATE credentials (submitted + stored), not the saved ones,
    // so the merchant validates the key they are about to save.
    const merged = await mergeWithStored(req.store.id, parseBody(req.body));
    if (!SMS_CHANNELS.includes(merged.provider)) {
      return res.status(400).json({ error: `provider must be one of ${SMS_CHANNELS.join(', ')}.` });
    }
    const result = await pingProvider(merged.provider, merged);
    res.json({ ...result, provider: merged.provider });
  } catch (err) { next(err); }
});

/* ---------------------------------- Save ---------------------------------- */

router.put('/', requireSeller, async (req, res, next) => {
  try {
    // Fail closed: without a master key we must not write, rather than store a
    // credential in a form we cannot protect or read back.
    if (!encryptionConfigured()) {
      return res.status(503).json({
        error: 'SMS key storage is not configured on this server, so credentials cannot be saved.',
        code: 'SMS_KEYS_NOT_CONFIGURED',
      });
    }

    const merged = await mergeWithStored(req.store.id, parseBody(req.body));

    if (!SMS_CHANNELS.includes(merged.provider)) {
      return res.status(400).json({ error: `provider must be one of ${SMS_CHANNELS.join(', ')}.` });
    }
    // Enabling on a half-filled form would fail on every order (and on the DB
    // CHECK). Rejected here so the merchant gets a pointed message instead.
    if (merged.enableOrderSms && !isProviderReady(merged)) {
      const needed = merged.provider === 'HUBTEL'
        ? 'the client ID, client secret and merchant account ID'
        : 'an API key and sender ID';
      return res.status(400).json({ error: `Add ${needed} before enabling order SMS.` });
    }

    // Choosing DiDwa's key with nothing left to spend would advertise a rail
    // that silently drops every message. Allowed when the plan includes an
    // allowance OR the store has prepaid segments - a Starter store with a
    // carried-over balance must still be able to switch back on.
    if (merged.enableOrderSms && merged.provider === 'PLATFORM') {
      const [allowance, quota] = await Promise.all([
        planAllowance(req.store.id),
        getQuota(req.store.id).catch(() => null),
      ]);
      if (allowance <= 0 && (quota?.totalRemaining ?? 0) <= 0) {
        return res.status(400).json({
          error: 'Your plan does not include DiDwa SMS and you have no prepaid segments left. '
            + 'Buy more segments, or connect your own SMS provider instead.',
          code: 'SMS_QUOTA_EXHAUSTED',
        });
      }
    }

    const saved = await saveSettings(req.store.id, merged);
    // Deliberately NOT written to admin_audit_log: that ledger is keyed to an
    // authenticated ADMIN actor, and a merchant editing their own credentials
    // is not an admin action. The log line carries presence flags only.
    console.log(
      `[sms-settings] store=${req.store.id} provider=${saved.provider} `
      + `orderSms=${saved.enableOrderSms} ready=${isProviderReady(saved)}`,
    );

    res.json({ settings: toClientView(saved) });
  } catch (err) { next(err); }
});

export default router;
