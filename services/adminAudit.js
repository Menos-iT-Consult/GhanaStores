/**
 * DiDwa - Platform admin audit trail.
 *
 * The super admin can suspend a merchant, settle a payout, adjust stock or
 * change a plan, so every one of those writes is recorded here. Recording must
 * never be able to break the operation it documents, so a failed insert is
 * logged to stderr and swallowed - the business action still completes.
 */
import { query } from '../config/database.js';

/** Who is acting, taken from the verified admin token (never from the body). */
export function adminActor(req) {
  return {
    id: req?.auth?.sub || null,
    email: req?.auth?.email || null,
    name: req?.auth?.name || null,
  };
}

/**
 * Append one entry to the ledger. Never throws.
 *
 * @param {import('express').Request} req
 * @param {{ action: string, targetType?: string, targetId?: string|number|null, detail?: object }} entry
 */
export async function recordAdminAction(req, { action, targetType = null, targetId = null, detail = null }) {
  const actor = adminActor(req);
  try {
    await query(
      `INSERT INTO admin_audit_log
         (admin_id, admin_email, admin_name, action, target_type, target_id, detail, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        actor.id,
        actor.email,
        actor.name,
        String(action),
        targetType,
        targetId == null ? null : String(targetId),
        detail ? JSON.stringify(detail) : JSON.stringify({}),
        req?.ip || null,
      ],
    );
  } catch (err) {
    // The action itself already succeeded; losing its audit line must not turn
    // a successful admin operation into a 500 for the operator.
    console.error(`[audit] could not record "${action}": ${err.message}`);
  }
  return actor;
}

/** Redact secrets before they ever reach the ledger. */
export function redact(value) {
  const drop = /^(password|password_hash|token|authorization|secret|api_?key)$/i;
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redact);
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (drop.test(key)) continue;
    out[key] = redact(val);
  }
  return out;
}
