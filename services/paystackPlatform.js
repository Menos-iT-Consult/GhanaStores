/**
 * DiDwa - Platform-level Paystack service (Fallback 2 for platform payments).
 *
 * Subscription, prepaid SMS segments, domain purchases and managed store orders
 * are PLATFORM-level payments (money moves customer -> DiDwa), charged with the platform's own
 * gateway credentials - never a merchant's BYOK keys (that model lives in
 * storePayments.js). The rail order for these flows is:
 *
 *   1. MTN MoMo API          - primary, where the flow has a MoMo leg
 *   2. Hubtel hosted checkout - Fallback 1
 *   3. Paystack hosted payment page - Fallback 2 (this module)
 *
 * Paystack is only reached when the Hubtel checkout could NOT be created, so
 * an absent configuration here is not an error: paystackPlatformReady() is
 * false and callers fall through to their existing failure path (a 402).
 * There is deliberately NO dry-run mode - a simulated success would silently
 * skip a real gateway the platform simply has not configured.
 *
 * Confirmation arrives on POST /api/webhooks/paystack, signed by Paystack as
 * an HMAC-SHA512 over the exact bytes it sent, keyed by PAYSTACK_SECRET_KEY
 * (the same env var this module authenticates with, so the two can never
 * drift apart).
 */
import crypto from 'node:crypto';
import axios from 'axios';

const PAYSTACK_BASE = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
const SECRET = process.env.PAYSTACK_SECRET_KEY || '';

/** True when the platform has a Paystack secret to charge and sign with. */
export function paystackPlatformReady() {
  return Boolean(SECRET);
}

/** Constant-time compare that never throws on a length mismatch. */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify a Paystack callback against the PLATFORM secret. Paystack signs the
 * raw body with HMAC-SHA512 and sends the digest in `x-paystack-signature`.
 * @param {Buffer|string} rawBody exact bytes received - the HMAC covers them
 * @param {string} signature value of the x-paystack-signature header
 */
export function verifyPlatformSignature(rawBody, signature) {
  const sig = String(signature || '').trim();
  if (!sig || !SECRET) return false;
  const buf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody ?? ''));
  const expected = crypto.createHmac('sha512', SECRET).update(buf).digest('hex');
  return safeEqual(sig, expected);
}

/**
 * Which platform payment flow a reference belongs to, by prefix. Order numbers
 * are GS-YYMMDD-XXXX (a digit follows the prefix), subscription attempts
 * GS-SUB-, SMS packs GS-SMS- and domain purchases GSD-..., so a prefix test is
 * unambiguous - a callback can never be reinterpreted as a different flow.
 *
 * @param {string} reference
 * @returns {'subscription'|'sms'|'domain'|'managed-order'|null}
 */
export function platformReferenceKind(reference) {
  const ref = String(reference || '');
  if (ref.startsWith('GS-SUB-')) return 'subscription';
  if (ref.startsWith('GS-SMS-')) return 'sms';
  if (ref.startsWith('GS-MGD-')) return 'managed-order';
  if (ref.startsWith('GSD-')) return 'domain';
  return null;
}


/**
 * Initialise a Paystack hosted payment page (transaction/initialize). The
 * caller redirects the browser to the returned `checkoutUrl` and the payer
 * completes the payment by card, bank transfer or any MoMo network. Money
 * settles later via the signed webhook, so this NEVER activates anything by
 * itself - it only opens the payment page.
 *
 * @param {object} args
 * @param {number} args.amountGhs     amount in Ghana Cedis (converted to kobo)
 * @param {string} args.email         payer email (Paystack requires one)
 * @param {string} args.reference     our business reference (GS-SUB-... etc.)
 * @param {string} [args.callbackUrl] where the browser lands after paying
 * @param {object} [args.metadata]    echoed back on the webhook callback
 * @returns {Promise<{checkoutUrl: string, checkoutId: string, reference: string}>}
 *   throws an Error with a seller-safe message on failure or when the platform
 *   key is missing.
 */
export async function initPaystackCheckout({ amountGhs, email, reference, callbackUrl, metadata = {} }) {
  // Kobo: Paystack charges the minor unit. Rounding here keeps the payment row
  // and the collection amount in agreement.
  const amount = Math.round(Number(amountGhs) * 100);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('A payment amount greater than zero is required.');
  }
  if (!reference) {
    throw new Error('A payment reference is required.');
  }
  if (!paystackPlatformReady()) {
    throw new Error('Paystack is not configured on this platform.');
  }

  try {
    const { data } = await axios.post(
      `${PAYSTACK_BASE}/transaction/initialize`,
      {
        email: String(email || '').trim() || 'no-reply@didwaghana.com',
        amount,
        reference,
        currency: 'GHS',
        callback_url: callbackUrl || undefined,
        metadata,
      },
      {
        headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
        timeout: 20_000,
      },
    );
    const checkoutUrl = data?.data?.authorization_url;
    if (!checkoutUrl) {
      // A 200 without a URL is still a failure - handing the caller `undefined`
      // would redirect the seller to a blank page.
      console.error('[paystack] initialize returned no authorization_url:', JSON.stringify(data).slice(0, 400));
      throw new Error('The payment page could not be created. Please try again.');
    }
    return {
      checkoutUrl,
      checkoutId: data?.data?.access_code || data?.data?.reference || reference,
      reference: data?.data?.reference || reference,
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'The payment page could not be created. Please try again.') throw err;
    const detail = err.response?.data || err.message;
    console.error('[paystack] initialize failed:', typeof detail === 'object' ? JSON.stringify(detail).slice(0, 400) : String(detail).slice(0, 400));
    throw new Error('The payment gateway is unavailable right now. Please try again in a moment.');
  }
}

const MOMO_NETWORK_ALIASES = {
  MTN: ['MTN', 'MTN MOBILE MONEY', 'MTN MOMO'],
  VODAFONE: ['VODAFONE', 'VODAFONE CASH', 'TELECEL', 'TELECEL CASH'],
  AT: ['AIRTELTIGO', 'AIRTEL TIGO', 'AIRTELTIGO MONEY', 'AT MONEY'],
};

function normalizedNetworkName(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Resolve a Ghana MoMo number through Paystack's bank account resolution API.
 * The bank directory is queried per request so provider codes are not guessed
 * or hard-coded. No transfer recipient is created by this operation.
 */
export async function resolvePaystackMomoAccountName({ network, phone }) {
  const providerSecret = process.env.PAYSTACK_SECRET_KEY || '';
  if (!providerSecret) {
    const error = new Error('Paystack name verification is not configured.');
    error.status = 503;
    throw error;
  }
  if (!Object.hasOwn(MOMO_NETWORK_ALIASES, network)) {
    const error = new Error('Select a supported Ghana Mobile Money network.');
    error.status = 400;
    throw error;
  }

  const headers = {
    Authorization: `Bearer ${providerSecret}`,
    'Content-Type': 'application/json',
  };
  const baseUrl = process.env.PAYSTACK_BASE_URL || PAYSTACK_BASE;
  const localNumber = `0${String(phone).replace(/\D/g, '').replace(/^233/, '')}`;
  let banks;
  try {
    const response = await axios.get(`${baseUrl}/bank`, {
      headers,
      params: { country: 'ghana', currency: 'GHS', type: 'mobile_money' },
      timeout: 20_000,
    });
    banks = response.data?.data;
  } catch (err) {
    console.error('[paystack] Ghana MoMo directory lookup failed:', err.response?.status || err.code || 'request_failed');
    const error = new Error('Paystack could not load its Ghana Mobile Money network directory.');
    error.status = 502;
    throw error;
  }

  const aliases = MOMO_NETWORK_ALIASES[network].map(normalizedNetworkName);
  const bank = Array.isArray(banks)
    ? banks.find((entry) => aliases.includes(normalizedNetworkName(entry.name)))
    : null;
  if (!bank?.code) {
    const error = new Error('Paystack does not offer name verification for this Mobile Money network.');
    error.status = 422;
    throw error;
  }

  try {
    const response = await axios.get(`${baseUrl}/bank/resolve`, {
      headers,
      params: { account_number: localNumber, bank_code: bank.code },
      timeout: 20_000,
    });
    const accountName = String(response.data?.data?.account_name || '').trim();
    if (!response.data?.status || !accountName) {
      const error = new Error('Paystack did not return a verified account name for this number.');
      error.status = 422;
      throw error;
    }
    return { accountName, bankName: String(bank.name) };
  } catch (err) {
    if (err.status) throw err;
    console.error('[paystack] Ghana MoMo account resolution failed:', err.response?.status || err.code || 'request_failed');
    const error = new Error('Paystack could not verify this Mobile Money number. Check the network and number, then try again.');
    error.status = err.response?.status === 400 ? 422 : 502;
    throw error;
  }
}

export default {
  paystackPlatformReady,
  verifyPlatformSignature,
  platformReferenceKind,
  initPaystackCheckout,
  resolvePaystackMomoAccountName,
};
