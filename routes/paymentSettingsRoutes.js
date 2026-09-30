/**
 * DiDwa - Merchant Payment Settings (BYOK)
 *
 * GET    /api/payment-settings              -> masked settings for the signed-in store
 * PUT    /api/payment-settings              -> save keys / COD toggle / active gateway
 * POST   /api/payment-settings/test         -> validate credentials BEFORE saving
 *
 * Security notes:
 *  - Every route is requireSeller-scoped to req.store, so a merchant can only
 *    ever read or write their own store's keys.
 *  - Secrets are write-only. GET returns masks and presence flags, never a
 *    value; the UI re-sends a secret only when the merchant actually typed one.
 *  - The test endpoint pings the gateway with the CANDIDATE credentials before
 *    they are saved, so a store cannot go live advertising a gateway that
 *    rejects its own keys.
 */
import { Router } from 'express';
import axios from 'axios';
import { requireSeller } from '../middleware/authMiddleware.js';
import {
  GATEWAYS, getSettings, saveSettings, toClientView,
  isPaystackReady, isHubtelReady,
} from '../services/storePayments.js';
import { encryptionConfigured } from '../services/secretBox.js';

const router = Router();

/** Trim, and treat an empty string as "merchant left this blank". */
const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? null : String(v).trim() || null);

function parseBody(b = {}) {
  return {
    paystackPublicKey: str(b.paystackPublicKey),
    paystackSecretKey: str(b.paystackSecretKey),
    hubtelClientId: str(b.hubtelClientId),
    hubtelClientSecret: str(b.hubtelClientSecret),
    hubtelMerchantAccountId: str(b.hubtelMerchantAccountId),
    enableCod: b.enableCod !== false && b.enableCod !== 'false',
    activeGateway: String(b.activeGateway || 'COD').toUpperCase(),
  };
}

/**
 * Merge the submitted fields over the stored ones. A blank secret means
 * "keep what is already saved" - the UI sends a mask back in that case, and
 * overwriting a real key with a mask would brick the store's checkout.
 */
async function mergeWithStored(storeId, input) {
  const stored = (await getSettings(storeId)) || {};
  const pick = (incoming, existing) => (incoming == null ? existing || null : incoming);
  return {
    paystackPublicKey: pick(input.paystackPublicKey, stored.paystackPublicKey),
    paystackSecretKey: pick(input.paystackSecretKey, stored.paystackSecretKey),
    hubtelClientId: pick(input.hubtelClientId, stored.hubtelClientId),
    hubtelClientSecret: pick(input.hubtelClientSecret, stored.hubtelClientSecret),
    hubtelMerchantAccountId: pick(input.hubtelMerchantAccountId, stored.hubtelMerchantAccountId),
    enableCod: input.enableCod,
    activeGateway: input.activeGateway,
  };
}

/* ---------------------------------- Read ----------------------------------- */

router.get('/', requireSeller, async (req, res, next) => {
  try {
    const settings = await getSettings(req.store.id);
    res.json({
      // A store with no row is not an error: it is simply COD-only, which is
      // the correct default for a merchant who has not connected keys yet.
      settings: toClientView(settings),
      storageConfigured: encryptionConfigured(),
    });
  } catch (err) { next(err); }
});

/* ------------------------- Validate before saving -------------------------- */

/** Translate a Paystack failure into something a merchant can act on. */
function paystackErrorMessage(err) {
  const status = err?.response?.status;
  const body = err?.response?.data;
  if (status === 401) return 'Paystack rejected the secret key. Check it was copied in full.';
  if (status === 403) return 'That Paystack key is not permitted to use this endpoint.';
  if (err?.code === 'ECONNABORTED') return 'Paystack did not respond in time. Try again.';
  return body?.message || 'Could not reach Paystack. Check your connection and try again.';
}

/** Paystack: a GET against the account endpoint is a cheap authenticated ping. */
async function pingPaystack(publicKey, secretKey) {
  if (!isPaystackReady({ paystackPublicKey: publicKey, paystackSecretKey: secretKey })) {
    return { valid: false, message: 'Both a public key and a secret key are required.' };
  }
  try {
    const { data } = await axios.get('https://api.paystack.co/account', {
      headers: { Authorization: `Bearer ${secretKey}` },
      timeout: 15_000,
    });
    if (data?.status === true) {
      return { valid: true, message: `Connected to ${data?.data?.business_name || 'your Paystack account'}.` };
    }
    return { valid: false, message: data?.message || 'Paystack rejected these keys.' };
  } catch (err) {
    return { valid: false, message: paystackErrorMessage(err) };
  }
}

/** Hubtel: verify by fetching the merchant account the keys should grant. */
async function pingHubtel({ hubtelClientId, hubtelClientSecret, hubtelMerchantAccountId }) {
  if (!isHubtelReady({ hubtelClientId, hubtelClientSecret, hubtelMerchantAccountId })) {
    return { valid: false, message: 'Client ID, client secret and merchant account ID are all required.' };
  }
  try {
    const base = process.env.HUBTEL_BASE_URL || 'https://api-txn.hubtel.com';
    await axios.get(
      `${base}/v1/merchantaccount/merchants/${encodeURIComponent(hubtelMerchantAccountId)}/verify`,
      { auth: { username: hubtelClientId, password: hubtelClientSecret }, timeout: 15_000 },
    );
    return { valid: true, message: 'Hubtel credentials verified.' };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) return 'Hubtel rejected the client ID or secret.';
    if (status === 404) return 'Hubtel has no merchant account with that ID.';
    if (err?.code === 'ECONNABORTED') return 'Hubtel did not respond in time. Try again.';
    return 'Could not reach Hubtel. Check your connection and try again.';
  }
}

router.post('/test', requireSeller, async (req, res, next) => {
  try {
    if (!encryptionConfigured()) {
      return res.status(503).json({
        error: 'Payment key storage is not configured on this server.',
        code: 'PAYMENT_KEYS_NOT_CONFIGURED',
      });
    }
    // Test the CANDIDATE credentials (submitted + stored), not the saved ones,
    // so the merchant validates the key they are about to save.
    const merged = await mergeWithStored(req.store.id, parseBody(req.body));
    const gateway = merged.activeGateway;

    let result;
    if (gateway === 'PAYSTACK') {
      result = await pingPaystack(merged.paystackPublicKey, merged.paystackSecretKey);
    } else if (gateway === 'HUBTEL') {
      result = await pingHubtel(merged);
    } else {
      return res.json({ valid: true, gateway: 'COD', message: 'Cash on Delivery needs no credentials.' });
    }

    res.json({ ...result, gateway });
  } catch (err) { next(err); }
});
/* ---------------------------------- Save ----------------------------------- */

router.put('/', requireSeller, async (req, res, next) => {
  try {
    // Fail closed: without a master key we must not write, rather than store a
    // gateway secret in a form we cannot protect or read back.
    if (!encryptionConfigured()) {
      return res.status(503).json({
        error: 'Payment key storage is not configured on this server, so keys cannot be saved.',
        code: 'PAYMENT_KEYS_NOT_CONFIGURED',
      });
    }

    const merged = await mergeWithStored(req.store.id, parseBody(req.body));

    if (!GATEWAYS.includes(merged.activeGateway)) {
      return res.status(400).json({ error: `activeGateway must be one of ${GATEWAYS.join(', ')}.` });
    }
    // A gateway with missing keys is rejected here (and by a DB CHECK) so a
    // store can never advertise a payment option that cannot be charged.
    if (merged.activeGateway === 'PAYSTACK' && !isPaystackReady(merged)) {
      return res.status(400).json({ error: 'Add both a Paystack public key and secret key before selecting Paystack.' });
    }
    if (merged.activeGateway === 'HUBTEL' && !isHubtelReady(merged)) {
      return res.status(400).json({ error: 'Add the Hubtel client ID, client secret and merchant account ID before selecting Hubtel.' });
    }
    if (!merged.enableCod && merged.activeGateway === 'COD') {
      return res.status(400).json({ error: 'Cash on Delivery is your active gateway, so it cannot also be disabled.' });
    }

    const saved = await saveSettings(req.store.id, merged);
    // Deliberately NOT written to admin_audit_log: that ledger is keyed to an
    // authenticated ADMIN actor, and a merchant changing their own gateway keys
    // is not an admin action. The log line carries presence flags only - never
    // a key value.
    console.log(
      `[payment-settings] store=${req.store.id} gateway=${saved.activeGateway} `
      + `paystack=${isPaystackReady(saved)} hubtel=${isHubtelReady(saved)}`,
    );

    res.json({ settings: toClientView(saved) });
  } catch (err) { next(err); }
});

export default router;
