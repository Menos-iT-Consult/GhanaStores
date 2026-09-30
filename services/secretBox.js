/**
 * DiDwa - AES-256-GCM encryption for merchant gateway secrets (BYOK).
 *
 * Merchant-supplied Paystack/Hubtel API keys are the highest-sensitivity
 * credentials on the platform: whoever holds the secret key can charge cards
 * and move money out of the merchant's account. They must be recoverable (the
 * checkout charge needs the plaintext), so bcrypt is not an option - it is a
 * one-way hash. Hence authenticated encryption at rest.
 *
 * Envelope format, one base64 segment each:
 *   v1:<iv>:<authTag>:<ciphertext>
 *
 * The version prefix is checked on decrypt so the scheme can be rotated later
 * without guessing at old rows.
 *
 * FAIL CLOSED, per the security decision for this feature: if the master key is
 * missing, encrypt() throws instead of falling back to plaintext. A silent
 * plaintext fallback is the exact failure this module exists to prevent, so
 * saving a key without the secret configured is an error the operator must fix,
 * not something we paper over.
 */
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;      // 96-bit nonce, the GCM-recommended size
const VERSION = 'v1';
const SEPARATOR = ':';

/** Human-readable instructions, reused by every error this module throws. */
export const SETUP_HELP =
  'Set PAYMENT_KEYS_ENCRYPTION_SECRET to a random 32-byte hex string '
  + '(node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))") '
  + 'and restart the server.';

let cachedKey = null;

/**
 * Resolve the 32-byte master key, or null when unconfigured.
 * Memoised so the parse happens once, but a bad length still throws per call
 * so a misconfiguration is reported by whoever triggers it.
 */
function masterKey() {
  if (cachedKey) return cachedKey;
  const raw = String(process.env.PAYMENT_KEYS_ENCRYPTION_SECRET || '').trim();
  if (!raw) return null;

  // Accept 64 hex chars, or any other string long enough to stretch to 32 bytes.
  // Hex is the documented form, but refusing a base64/UUID-style value would
  // just push operators into pasting something weaker.
  const key = /^[0-9a-f]{64}$/i.test(raw)
    ? Buffer.from(raw, 'hex')
    : crypto.createHash('sha256').update(raw, 'utf8').digest();
  if (key.length !== 32) throw new Error('PAYMENT_KEYS_ENCRYPTION_SECRET must decode to 32 bytes.');
  cachedKey = key;
  return key;
}

/** True when the platform is configured to store gateway secrets. */
export function encryptionConfigured() {
  return Boolean(String(process.env.PAYMENT_KEYS_ENCRYPTION_SECRET || '').trim());
}

/** A distinguishable error so routes can return 503 rather than a generic 500. */
export function encryptionMissingError() {
  const err = new Error(
    'Payment key storage is not configured on this server. ' + SETUP_HELP,
  );
  err.status = 503;
  err.code = 'PAYMENT_KEYS_NOT_CONFIGURED';
  return err;
}

/**
 * Encrypt a secret for storage. Returns null for empty input so callers can
 * store "merchant cleared this field" without a special case.
 * @throws when the master key is not configured.
 */
export function encryptSecret(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;
  const value = String(plaintext).trim();
  if (!value) return null;

  const key = masterKey();
  if (!key) throw encryptionMissingError();

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(SEPARATOR);
}

/**
 * Decrypt a stored secret. Returns null for null/empty input.
 * @throws when the value is malformed, or when it was sealed with a different
 * master key - a wrong key fails the GCM auth tag rather than returning garbage.
 */
export function decryptSecret(envelope) {
  if (envelope === null || envelope === undefined) return null;
  const raw = String(envelope).trim();
  if (!raw) return null;

  const key = masterKey();
  if (!key) throw encryptionMissingError();

  const parts = raw.split(SEPARATOR);
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Stored payment secret is malformed or was written by an older scheme.');
  }

  const iv = Buffer.from(parts[1], 'base64');
  const authTag = Buffer.from(parts[2], 'base64');
  const ciphertext = Buffer.from(parts[3], 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    // Distinguish "sealed with another key" from generic corruption: this is a
    // configuration problem, and the operator needs to know that specifically.
    throw new Error(
      'Could not decrypt a stored payment secret. PAYMENT_KEYS_ENCRYPTION_SECRET '
      + 'does not match the one this secret was saved with. ' + SETUP_HELP,
    );
  }
}

/**
 * Mask a secret for display: never return the value, and never return so much
 * of it that it narrows a brute-force search meaningfully. Shows only the last
 * 4 characters so a merchant can tell two keys apart.
 */
export function maskSecret(secret) {
  if (!secret) return null;
  const value = String(secret);
  if (value.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(12, value.length - 4))}${value.slice(-4)}`;
}

export default { encryptSecret, decryptSecret, maskSecret, encryptionConfigured, SETUP_HELP };

/* Direct execution: crypto behaviour, including the failure paths that only
   ever show up in production. Run: node services/secretBox.js */
if (process.argv[1] && process.argv[1].endsWith('secretBox.js')) {
  const KEY = 'a'.repeat(64);
  const checks = [];
  const check = (name, cond) => checks.push([name, !!cond]);

  // Fail closed with no key configured.
  const savedKey = process.env.PAYMENT_KEYS_ENCRYPTION_SECRET;
  delete process.env.PAYMENT_KEYS_ENCRYPTION_SECRET;
  let threw = null;
  try { encryptSecret('sk_live_x'); } catch (e) { threw = e; }
  check('no key configured throws (never plaintext)', threw && threw.code === 'PAYMENT_KEYS_NOT_CONFIGURED');
  check('encryptionConfigured() is false without a key', encryptionConfigured() === false);
  process.env.PAYMENT_KEYS_ENCRYPTION_SECRET = KEY;
  // Re-import-free reset: the memoised key must not survive a key change.
  cachedKey = null;

  const sealed = encryptSecret('sk_live_abc123');
  check('ciphertext is versioned envelope', /^v1:[^:]+:[^:]+:[^:]+$/.test(sealed));
  check('plaintext is absent from ciphertext', !sealed.includes('sk_live_abc123'));
  check('round-trips exactly', decryptSecret(sealed) === 'sk_live_abc123');

  const again = encryptSecret('sk_live_abc123');
  check('nonce makes repeat seals differ', again !== sealed);
  check('both seals still decrypt', decryptSecret(again) === 'sk_live_abc123');

  // Tamper detection: GCM auth tag must reject a flipped ciphertext byte.
  const seg = sealed.split(':');
  const raw = Buffer.from(seg[3], 'base64');
  raw[0] ^= 0xff;
  let tamperErr = null;
  try { decryptSecret([seg[0], seg[1], seg[2], raw.toString('base64')].join(':')); }
  catch (e) { tamperErr = e; }
  check('tampered ciphertext is rejected', !!tamperErr);

  // A different master key must fail loudly, not return garbage.
  process.env.PAYMENT_KEYS_ENCRYPTION_SECRET = 'b'.repeat(64);
  cachedKey = null;
  let wrongErr = null;
  try { decryptSecret(sealed); } catch (e) { wrongErr = e; }
  check('wrong master key is detected', !!wrongErr && /does not match/.test(wrongErr.message));

  process.env.PAYMENT_KEYS_ENCRYPTION_SECRET = KEY;
  cachedKey = null;
  check('empty input encrypts to null', encryptSecret('') === null && encryptSecret(null) === null);
  check('null envelope decrypts to null', decryptSecret(null) === null);
  check('malformed envelope is rejected', (() => {
    try { decryptSecret('not-an-envelope'); return false; } catch { return true; }
  })());
  const longSecret = 'sk_live_abcdefghijkl';
  const masked = maskSecret(longSecret);
  check('mask reveals only the last 4 characters',
    masked.endsWith('abcdefghijkl'.slice(-4)) && !masked.includes('sk_live'));
  check('mask never echoes the secret prefix', !maskSecret('sk_live_abcdef').includes('sk_live'));
  check('mask of short value is fully hidden', maskSecret('abc') === '••••');
  check('mask of null is null', maskSecret(null) === null);

  if (savedKey !== undefined) process.env.PAYMENT_KEYS_ENCRYPTION_SECRET = savedKey;
  let fail = 0;
  for (const [name, ok] of checks) {
    if (!ok) fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  }
  console.log(`\n${checks.length - fail}/${checks.length} secretBox assertions passed`);
  process.exit(fail ? 1 : 0);
}
