/**
 * DiDwa - Per-store payment gateway service (BYOK).
 *
 * The platform holds no customer funds. Every charge is made with the
 * merchant's OWN gateway credentials, so the money moves customer -> merchant
 * account directly and DiDwa never has to hold, reconcile, or pay out a balance.
 *
 * Three consequences that shape this module:
 *
 * 1. Credentials are per-store and must never leak across tenants. Every read
 *    is scoped by store_id, and the resolved secrets are the ONLY place a
 *    plaintext key exists in memory - callers get gateways already bound to
 *    them rather than the keys themselves.
 * 2. A store with no keys is COD-only. `availableMethods` never advertises a
 *    gateway that could not actually be charged, so checkout cannot accept a
 *    card payment that fails at the gateway.
 * 3. Gateway calls are idempotent-by-reference: we always send our own order
 *    number as the reference, so a webhook can be matched back to exactly one
 *    order and a retried charge cannot double-charge a customer.
 */
import crypto from 'node:crypto';
import axios from 'axios';
import { query } from '../config/database.js';
import { decryptSecret, encryptSecret, maskSecret } from './secretBox.js';

export const GATEWAYS = ['PAYSTACK', 'HUBTEL', 'COD'];

const PAYSTACK_BASE = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
const HUBTEL_BASE = process.env.HUBTEL_BASE_URL || 'https://api-txn.hubtel.com';

/** Constant-time compare that never throws on a length mismatch. */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** The plain shape a gateway client is built from, per store. */
function decryptRow(row) {
  if (!row) return null;
  return {
    storeId: row.store_id,
    paystackPublicKey: decryptSecret(row.paystack_public_key),
    paystackSecretKey: decryptSecret(row.paystack_secret_key),
    hubtelClientId: decryptSecret(row.hubtel_client_id),
    hubtelClientSecret: decryptSecret(row.hubtel_client_secret),
    hubtelMerchantAccountId: decryptSecret(row.hubtel_merchant_account_id),
    enableCod: row.enable_cod !== false,
    activeGateway: row.active_gateway || 'COD',
  };
}

/** Raw settings row for one store, or null. Never exposes another store. */
export async function getSettingsRow(storeId) {
  const { rows } = await query('SELECT * FROM payment_settings WHERE store_id = $1', [storeId]);
  return rows[0] || null;
}

/** Decrypted settings for one store, or null when the store has no row yet. */
export async function getSettings(storeId) {
  return decryptRow(await getSettingsRow(storeId));
}

export function isPaystackReady(s) {
  return Boolean(s && s.paystackSecretKey && s.paystackPublicKey);
}

export function isHubtelReady(s) {
  return Boolean(s && s.hubtelClientId && s.hubtelClientSecret && s.hubtelMerchantAccountId);
}

/** Persist settings, encrypting every secret. Callers validate the gateway first. */
export async function saveSettings(storeId, input) {
  const sealed = {
    pub: encryptSecret(input.paystackPublicKey),
    sec: encryptSecret(input.paystackSecretKey),
    cid: encryptSecret(input.hubtelClientId),
    csec: encryptSecret(input.hubtelClientSecret),
    acct: encryptSecret(input.hubtelMerchantAccountId),
  };

  const { rows } = await query(
    `INSERT INTO payment_settings
       (store_id, paystack_public_key, paystack_secret_key,
        hubtel_client_id, hubtel_client_secret, hubtel_merchant_account_id,
        enable_cod, active_gateway, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (store_id) DO UPDATE SET
       paystack_public_key        = EXCLUDED.paystack_public_key,
       paystack_secret_key        = EXCLUDED.paystack_secret_key,
       hubtel_client_id           = EXCLUDED.hubtel_client_id,
       hubtel_client_secret       = EXCLUDED.hubtel_client_secret,
       hubtel_merchant_account_id = EXCLUDED.hubtel_merchant_account_id,
       enable_cod                 = EXCLUDED.enable_cod,
       active_gateway             = EXCLUDED.active_gateway,
       updated_at                 = NOW()
     RETURNING *`,
    [storeId, sealed.pub, sealed.sec, sealed.cid, sealed.csec, sealed.acct,
      input.enableCod !== false, input.activeGateway || 'COD'],
  );
  return decryptRow(rows[0]);
}

/**
 * Settings shaped for the merchant UI: presence flags plus a mask, never the
 * secret itself. The public key is not a secret (Paystack publishes it in the
 * checkout script) so it is returned in full for display.
 */
export function toClientView(settings) {
  if (!settings) {
    return {
      configured: false,
      enableCod: true,
      activeGateway: 'COD',
      paystack: { configured: false, publicKey: '', secretKeyMasked: null },
      hubtel: { configured: false, clientId: '', clientSecretMasked: null, merchantAccountId: '' },
      availableMethods: availableMethods(null),
    };
  }
  return {
    configured: isPaystackReady(settings) || isHubtelReady(settings),
    enableCod: settings.enableCod,
    activeGateway: settings.activeGateway,
    paystack: {
      configured: isPaystackReady(settings),
      publicKey: settings.paystackPublicKey || '',
      secretKeyMasked: maskSecret(settings.paystackSecretKey),
    },
    hubtel: {
      configured: isHubtelReady(settings),
      clientId: settings.hubtelClientId || '',
      clientSecretMasked: maskSecret(settings.hubtelClientSecret),
      merchantAccountId: settings.hubtelMerchantAccountId || '',
    },
    availableMethods: availableMethods(settings),
  };
}

/**
 * The payment methods a store may legitimately offer right now.
 *
 * A gateway appears only when it is BOTH the active one AND fully configured.
 * COD appears when it is the active gateway, or when COD is enabled - so a
 * merchant running online payments can still keep cash as an option, and a
 * merchant with no keys at all gets COD.
 */
export function availableMethods(settings) {
  if (!settings) return ['COD'];
  const methods = [];
  if (settings.activeGateway === 'PAYSTACK' && isPaystackReady(settings)) methods.push('PAYSTACK');
  if (settings.activeGateway === 'HUBTEL' && isHubtelReady(settings)) methods.push('HUBTEL');
  if (settings.enableCod || settings.activeGateway === 'COD') methods.push('COD');
  return methods.length ? methods : ['COD'];
}

/** The order payment_method value for a requested method, or null if not allowed. */
export function resolveMethod(settings, requested) {
  const allowed = availableMethods(settings);
  const want = String(requested || '').trim().toUpperCase();
  if (allowed.includes(want)) return want;
  // Cash is the same real-world option as COD; accept the legacy spelling.
  if (want === 'CASH' && allowed.includes('COD')) return 'COD';
  // No usable preference: fall back to the first allowed method, which is COD
  // for any store without working keys.
  return allowed[0] || 'COD';
}

/* ------------------------------ Gateway clients ----------------------------- */

const HUBTEL_CHANNELS = { MTN: 'mtn-gh', VODAFONE: 'vodafone-gh', AT: 'airteltigo-gh' };
function hubtelChannel(network) {
  return HUBTEL_CHANNELS[String(network || 'MTN').toUpperCase()] || HUBTEL_CHANNELS.MTN;
}

/** Per-store Paystack client. Auth is the merchant's own secret key. */
export function paystackClient(settings) {
  const key = settings.paystackSecretKey;
  return {
    gateway: 'PAYSTACK',
    publicKey: settings.paystackPublicKey,
    async initializeTransaction({ reference, amount, email, callbackUrl }) {
      const { data } = await axios.post(
        `${PAYSTACK_BASE}/transaction/initialize`,
        {
          reference,
          amount: Math.round(Number(amount) * 100), // Paystack works in pesewas
          currency: 'GHS',
          email: email || undefined,
          callback_url: callbackUrl || undefined,
        },
        { headers: { Authorization: `Bearer ${key}` }, timeout: 20_000 },
      );
      return {
        success: data?.status === true,
        reference,
        // access_code is what the inline JS hands back to finalize the charge.
        authorizationUrl: data?.data?.authorization_url || null,
        accessCode: data?.data?.access_code || null,
        message: data?.message || null,
      };
    },
    /**
     * Paystack signs webhooks with HMAC-SHA512 over the RAW body using the
     * store's secret key. A body parsed by express.json() has been re-serialised
     * and will not hash identically, so the raw body is mandatory here.
     */
    verifyWebhook(rawBody, signature) {
      const expected = crypto.createHmac('sha512', key).update(rawBody || '').digest('hex');
      const a = Buffer.from(String(signature || ''));
      const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    },
  };
}

/** Per-store Hubtel client. Auth is the merchant's own client id/secret. */
export function hubtelClient(settings) {
  const secret = settings.hubtelClientSecret;
  const auth = { username: settings.hubtelClientId, password: secret };
  const merchantAccount = settings.hubtelMerchantAccountId;
  return {
    gateway: 'HUBTEL',
    clientId: settings.hubtelClientId,
    async requestPayment({ reference, amount, msisdn, network, description, callbackUrl }) {
      const { data } = await axios.post(
        `${HUBTEL_BASE}/v1/merchantaccount/merchants/${encodeURIComponent(merchantAccount)}/receive/mobilemoney`,
        {
          CustomerMsisdn: msisdn,
          Amount: Number(amount).toFixed(2),
          Channel: hubtelChannel(network),
          Description: description || 'Payment',
          ClientReference: reference,
          CallbackUrl: callbackUrl || undefined,
        },
        { auth, headers: { 'Content-Type': 'application/json' }, timeout: 20_000 },
      );
      const code = String(data?.ResponseCode ?? data?.responseCode ?? '');
      return {
        success: code === '0000' || String(data?.Status ?? '').toLowerCase() === 'success',
        reference,
        transactionId: data?.TransactionId || data?.transactionId || null,
        message: data?.Message || data?.message || null,
      };
    },
    /**
     * Re-query Hubtel for a transaction's real status.
     *
     * Hubtel does NOT sign its callbacks: `callbackUrl` is a plain POST with no
     * HMAC header, so an unsigned payload is self-asserted and proves nothing.
     * The documented way to confirm a Mobile Money payment is to ask Hubtel
     * directly, authenticated with THIS merchant's client id/secret. That is what
     * makes an unsigned callback safe to act on.
     *
     * @returns {Promise<{success:boolean, amount:number|null, reference:string|null,
     *   transactionId:string|null, message:string|null}>}
     */
    async verifyTransaction({ transactionId, reference }) {
      const base = `${HUBTEL_BASE}/v1/merchantaccount/merchants/${encodeURIComponent(merchantAccount)}/checktransactionstatus`;
      // Hubtel keys this endpoint on the transaction id; the reference is the
      // fallback for merchants whose callback arrived without one.
      const target = transactionId ? `${base}/${encodeURIComponent(transactionId)}` : null;
      if (!target) {
        return { success: false, amount: null, reference, transactionId: null, message: 'No transaction id to verify.' };
      }
      const { data } = await axios.get(target, { auth, timeout: 20_000 });
      const d = data?.Data || data?.data || {};
      const code = String(data?.ResponseCode ?? data?.responseCode ?? d?.ResponseCode ?? '');
      const status = String(d?.Status ?? data?.Status ?? data?.status ?? '').toLowerCase();
      const settled = code === '0000' || status === 'success' || status === 'successful';
      const amount = Number(d?.Amount ?? data?.Amount ?? d?.ChargedAmount ?? NaN);
      return {
        success: settled,
        amount: Number.isFinite(amount) ? amount : null,
        reference: d?.ClientReference ?? d?.Reference ?? reference ?? null,
        transactionId: d?.TransactionId ?? transactionId,
        message: d?.Message ?? data?.Message ?? null,
      };
    },
    /** Optional defence in depth: honoured if Hubtel ever starts signing. */
    verifyWebhook(rawBody, signature) {
      const hex = crypto.createHmac('sha256', secret).update(rawBody || '').digest('hex');
      const b64 = crypto.createHmac('sha256', secret).update(rawBody || '').digest('base64');
      return safeEqual(signature, hex) || safeEqual(signature, b64);
    },
  };
}
/* ------------------------------ Charge dispatch ----------------------------- */

/**
 * Charge a customer for an order using the store's configured gateway.
 *
 * COD is NOT a gateway: it is resolved here and returned with
 * `requiresCharge: false` so the caller records the order as pending delivery
 * without any gateway being initialised.
 *
 * @param {string} storeId
 * @param {{reference:string, amount:number, method:string, email?:string,
 *          msisdn?:string, network?:string, description?:string,
 *          callbackUrl?:string}} args
 */
export async function chargeStorePayment(storeId, args) {
  const settings = await getSettings(storeId);
  const method = resolveMethod(settings, args.method);

  if (method === 'COD') {
    return {
      method: 'COD',
      requiresCharge: false,
      success: true,
      // Nothing to verify: no money moved, so the seller collects on delivery.
      orderStatus: 'PENDING',
      paymentStatus: 'PENDING',
    };
  }

  const client = method === 'PAYSTACK' ? paystackClient(settings) : hubtelClient(settings);
  const result = method === 'PAYSTACK'
    ? await client.initializeTransaction(args)
    : await client.requestPayment(args);

  // Both gateways settle asynchronously: the customer authorises first, then the
  // webhook confirms the money arrived. Never mark an order paid on the
  // initialise response alone.
  return { ...result, method, requiresCharge: true, paymentStatus: 'PENDING' };
}

export default {
  GATEWAYS,
  getSettings,
  getSettingsRow,
  saveSettings,
  toClientView,
  availableMethods,
  resolveMethod,
  chargeStorePayment,
  paystackClient,
  hubtelClient,
  isPaystackReady,
  isHubtelReady,
};

