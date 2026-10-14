/**
 * DiDwa - TOTP two-factor authentication (RFC 6238).
 *
 * A time-based one-time password authenticator: the seller scans a QR code into
 * Google Authenticator / Authy / 1Password, which then shows a fresh 6-digit code
 * every 30 seconds. Login requires that code in addition to the password.
 *
 * Deliberately dependency-free (node:crypto only). The algorithm is small and
 * well-specified, and pulling in a full 2FA library to do one HMAC-SHA1 window
 * check would add a package for a function this file expresses in ~40 lines.
 *
 * Secrets are NEVER stored in plaintext: callers persist the base32 secret
 * through services/secretBox.js (AES-256-GCM) and decrypt only to verify a code.
 */
import crypto from 'node:crypto';

/* TOTP parameters (RFC 6238 with the SHA-1 defaults authenticator apps expect). */
const STEP_SECONDS = 30;
const DIGITS = 6;
const WINDOW = 1; // accept the code one step either side to absorb clock drift
const SECRET_BYTES = 20; // 160-bit key, the SHA-1 block-aligned size
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // RFC 4648

/** Generate a new base32 secret for an authenticator app. */
export function generateSecret() {
  const bytes = crypto.randomBytes(SECRET_BYTES);
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out;
}

/** Decode a base32 string (ignoring spaces and padding) into raw bytes. */
function base32Decode(secret) {
  const clean = String(secret || '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Current 30-second time step (the TOTP counter). */
function counterAt(epochSeconds) {
  return Math.floor(epochSeconds / STEP_SECONDS);
}

/** HOTP(code counter) -> zero-padded 6-digit code, per RFC 4226. */
function hotp(key, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * Verify a submitted code against the secret, accepting a small clock-drift
 * window. Constant-time comparison so a wrong code cannot be timing-probed.
 * @returns {boolean} true when the code is valid for now +/- WINDOW steps.
 */
export function verifyTotp(secret, token) {
  const submitted = String(token || '').replace(/\D/g, '');
  if (submitted.length !== DIGITS) return false;

  const key = base32Decode(secret);
  if (!key.length) return false;

  const now = Math.floor(Date.now() / 1000);
  const base = counterAt(now);
  for (let drift = -WINDOW; drift <= WINDOW; drift += 1) {
    const expected = hotp(key, base + drift);
    // Both are fixed-length digit strings, so a length-safe equal-time compare.
    if (expected.length === submitted.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(submitted))) {
      return true;
    }
  }
  return false;
}

/**
 * The `otpauth://` URI an authenticator app encodes when scanning the QR code.
 * `account` is the seller's email so their device labels the entry clearly.
 */
export function otpauthUri(secret, account, issuer = 'DiDwa') {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** PNG data URL of the QR code for the given otpauth URI (for inline <img>). */
export async function qrDataUrl(uri) {
  const { default: QRCode } = await import('qrcode');
  return QRCode.toDataURL(uri, { margin: 1, width: 240 });
}

export default { generateSecret, verifyTotp, otpauthUri, qrDataUrl };
