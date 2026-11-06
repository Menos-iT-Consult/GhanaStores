import { randomInt } from 'node:crypto';
import { query, withTransaction } from '../config/database.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePartnerCode() {
  return `P${Array.from({ length: 9 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')}`;
}

export async function findApprovedPartnerByCode(code) {
  const { rows } = await query(
    `SELECT id, partner_code, partner_slug, full_name, organization_name, status
       FROM partners
      WHERE status = 'approved'
        AND (UPPER(partner_code) = UPPER($1) OR LOWER(partner_slug) = LOWER($1))
      LIMIT 1`,
    [String(code || '').trim()],
  );
  return rows[0] || null;
}

export async function findApprovedPartnerBySlug(slug) {
  const { rows } = await query(
    `SELECT partner_slug, full_name, organization_name
       FROM partners
      WHERE partner_slug = LOWER($1) AND status = 'approved'
      LIMIT 1`,
    [String(slug || '').trim()],
  );
  return rows[0] || null;
}

export async function findPartnerById(id) {
  const { rows } = await query(
    `SELECT id, full_name, email, phone, organization_name, partner_code, partner_slug,
            status, merchant_override_rate_percent, affiliate_override_rate_percent,
            momo_network, momo_number, momo_verified_name, momo_verified_at, created_at
       FROM partners
      WHERE id = $1 AND status = 'approved'
      LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

export async function findPartnerByEmailForAuth(email) {
  const { rows } = await query(
    `SELECT id, email, password_hash, status
       FROM partners
      WHERE LOWER(email) = $1
      LIMIT 1`,
    [String(email || '').trim().toLowerCase()],
  );
  return rows[0] || null;
}

export async function createPartnerApplication({
  fullName, email, phone, organizationName, passwordHash,
}) {
  const slugBase = String(organizationName || fullName)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'partner';

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = attempt === 0
      ? slugBase
      : `${slugBase.slice(0, 32)}-${randomInt(1000, 10000)}`;
    try {
      const { rows } = await query(
        `INSERT INTO partners
           (full_name, email, phone, organization_name, partner_code, partner_slug, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, full_name, email, organization_name, status, created_at`,
        [fullName, email, phone, organizationName, generatePartnerCode(), slug, passwordHash],
      );
      return rows[0];
    } catch (err) {
      if (err.code !== '23505') throw err;
      const { rows } = await query(
        'SELECT 1 FROM partners WHERE LOWER(email) = $1 LIMIT 1',
        [email.toLowerCase()],
      );
      if (rows.length) {
        const conflict = new Error('A partner application already uses this email.');
        conflict.code = 'PARTNER_EMAIL_EXISTS';
        throw conflict;
      }
      if (attempt === 7) throw err;
    }
  }
  throw new Error('Could not create the partner application.');
}

export async function createPartnerPayout(partnerId, amountGhs) {
  return withTransaction(async ({ query: txQuery }) => {
    const { rows: partnerRows } = await txQuery(
      `SELECT momo_network, momo_number, momo_verified_name, momo_verified_at
         FROM partners
        WHERE id = $1 AND status = 'approved'
        FOR UPDATE`,
      [partnerId],
    );
    const partner = partnerRows[0];
    if (!partner) {
      const error = new Error('Partner account is not active.');
      error.status = 403;
      throw error;
    }
    if (!partner.momo_network || !partner.momo_number || !partner.momo_verified_at) {
      const error = new Error('Verify a Mobile Money payout account before requesting a payout.');
      error.status = 400;
      throw error;
    }
    const { rows: balanceRows } = await txQuery(
      `SELECT
         (SELECT COALESCE(SUM(earned_amount_ghs), 0)
            FROM partner_ledgers
           WHERE partner_id = $1 AND status = 'available') AS earned,
         (SELECT COALESCE(SUM(amount_ghs), 0)
            FROM partner_payouts
           WHERE partner_id = $1 AND status IN ('pending','paid')) AS reserved`,
      [partnerId],
    );
    const balance = balanceRows[0];
    const available = Math.max(0, Number(balance.earned) - Number(balance.reserved));
    if (amountGhs > available) {
      const error = new Error(`Insufficient available balance. Available: GHS ${available.toFixed(2)}.`);
      error.status = 400;
      throw error;
    }
    const { rows } = await txQuery(
      `INSERT INTO partner_payouts
         (partner_id, amount_ghs, momo_network, momo_number, momo_account_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, amount_ghs, momo_network, momo_number, status, requested_at`,
      [partnerId, amountGhs, partner.momo_network, partner.momo_number, partner.momo_verified_name],
    );
    return rows[0];
  });
}
