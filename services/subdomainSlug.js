/**
 * services/subdomainSlug.js
 * One definition of "is this a slug a seller may have?", shared by the signup
 * availability check and the registration itself.
 *
 * These live together deliberately. The availability endpoint and the register
 * handler used to be free to disagree, which is how a seller ends up shown a
 * green tick and then rejected - or worse, shown a red cross for a slug that
 * would have been accepted. Both call validateSubdomain.
 */
import { slugifyStoreName } from '../utils/helpers.js';

/**
 * Labels that always belong to the platform.
 *
 * Mirrors RESERVED_SUBDOMAINS in middleware/domainMiddleware.js, which is where
 * host classification decides that e.g. admin.<apex> is platform traffic rather
 * than a tenant. Nothing stopped a seller REGISTERING one of these: the column
 * CHECK only enforces the character pattern, so "admin" was accepted and then
 * silently dead, because classifyHost routed that host to the admin app and the
 * seller's storefront never resolved. Rejecting them at signup is what closes
 * that trap.
 */
export const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api', 'admin']);

/**
 * The character rule, matching the column constraint exactly:
 *   subdomain_slug TEXT NOT NULL UNIQUE CHECK (subdomain_slug ~ '^[a-z0-9][a-z0-9-]{2,39}$')
 * Kept as a string (not a RegExp) because it is shared verbatim with SQL.
 */
export const SLUG_PATTERN = '^[a-z0-9][a-z0-9-]{2,39}$';
const SLUG_RE = new RegExp(SLUG_PATTERN);

/** Lowercase, strip anything unusable, collapse separators. Mirrors slugifyStoreName. */
export function normalizeSubdomain(value) {
  return slugifyStoreName(value);
}

/**
 * Why a slug cannot be used, or null when it is well-formed.
 * 'invalid'  - fails the character/length rule
 * 'reserved' - a platform label (admin, api, www, app)
 */
export function subdomainProblem(slug) {
  const value = String(slug || '').trim().toLowerCase();
  if (!SLUG_RE.test(value)) return 'invalid';
  if (RESERVED_SUBDOMAINS.has(value)) return 'reserved';
  return null;
}

/** Human text for each problem, shown under the signup field. */
export const SUBDOMAIN_MESSAGES = {
  invalid: 'Use 3-40 characters: lowercase letters, numbers and hyphens, starting with a letter or number.',
  reserved: 'That address is reserved by the platform. Please choose another.',
  taken: 'That address is already taken. Try another one.',
};