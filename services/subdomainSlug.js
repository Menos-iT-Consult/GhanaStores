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
 * Words a merchant slug may never be, because they belong to the platform, its
 * apps, its payment/auth/billing flows, or infrastructure and are treated as
 * SYSTEM PATHS.
 *
 * A seller squats on "admin", "billing", "dashboard", "paystack", etc. was
 * previously only stopped for the tiny set the host classifier knew about; the
 * column CHECK enforces the character pattern but NOT the meaning, so "dashboard"
 * was accepted and then looked official while resolving to a storefront (or, for
 * the handful the classifier also reserves, was silently dead). Rejecting the
 * whole list at signup closes that trap in one place.
 *
 * Kept as a Set for O(1) exact lookups. A few entries can never equal a real slug
 * (the character rule forbids dots and is 3+ chars, so ".well-known", "sitemap.xml",
 * "v1", "v2" are inert as exact matches) but they still block "v1-shop" via the
 * prefix rule below, so they are kept to document intent.
 */
export const RESERVED_SLUGS = new Set([
  // Platform / staff surfaces
  'admin', 'superadmin', 'dashboard', 'app', 'seller', 'portal', 'console',
  'manage', 'management', 'owner', 'system', 'ops', 'status', 'health',
  'metrics', 'telemetry', 'logs', 'audit', 'internal', 'staff', 'employee',
  'backend', 'root', 'control',
  // Auth / account
  'auth', 'login', 'logout', 'signin', 'signout', 'signup', 'register', 'join',
  'account', 'profile', 'user', 'users', 'settings', 'preferences', 'security',
  'privacy', 'password', 'reset-password', 'forgot-password', 'verify',
  'activate', 'sso', 'oauth',
  // Billing / payments
  'billing', 'subscription', 'plans', 'pricing', 'upgrade', 'checkout', 'pay',
  'payment', 'paystack', 'hubtel', 'mtn', 'momo', 'card', 'bank', 'wallet',
  'payout', 'payouts', 'invoice', 'invoices', 'receipt', 'receipts',
  'transactions', 'escrow', 'cod',
  // API / infra
  'api', 'v1', 'v2', 'v3', 'graphql', 'rest', 'rpc', 'sdk', 'webhooks',
  'webhook', 'callback', 'events', 'listener', 'mobile', 'expo', 'push',
  'notifications', 'devices', 'www', 'ftp', 'smtp', 'pop', 'imap', 'mail',
  'dns', 'ns1', 'ns2', 'fallback', 'origin', 'custom-domains', 'domains',
  'cdn', 'assets', 'static', 'media', 'uploads', 'well-known', '.well-known',
  'sitemap', 'sitemap.xml', 'robots', 'robots.txt', 'favicon', 'favicon.ico',
  // Marketing / legal / docs
  'about', 'contact', 'support', 'help', 'docs', 'documentation', 'guides',
  'faq', 'terms', 'privacy-policy', 'legal', 'blog', 'news', 'press',
  'careers', 'jobs', 'features', 'integrations', 'partners', 'developers',
]);

/**
 * Prefixes the platform owns outright: any slug beginning with these is refused
 * regardless of what follows, so no seller can front-run the brand ("didwa-shop",
 * "didwaX") or shadow the API namespace ("api-gateway"). Raw prefixes, not word
 * segments, by design - "didwastore" is blocked too.
 */
export const RESERVED_PREFIXES = ['didwa', 'api-'];

/**
 * The original tiny set, kept as the authoritative list of labels the HOST
 * classifier (middleware/domainMiddleware.js) treats as platform traffic rather
 * than a tenant. It is a subset of RESERVED_SLUGS; exported for the classifier
 * and its tests to keep sharing one definition.
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
 * True when a slug collides with a reserved word or a platform-owned prefix.
 *
 * Matching rules (chosen to block squatting without punishing ordinary names):
 *   - exact:            the slug IS a reserved word            -> "admin"
 *   - leading segment:  the slug's first hyphen-segment is one -> "admin-shop",
 *                       "news-today" blocked, while "myblog", "apparel",
 *                       "newspaper", "codebase" are allowed (no false positives
 *                       from "cod"/"app"/"pay" being prefixes of real words).
 *   - multi-word entry: a reserved phrase blocks longer slugs  -> "reset-password"
 *                       built on it                          -> "reset-password-x"
 *   - raw prefixes:     anything front-running "didwa" or the API namespace
 *                       "api-" is refused ("didwastore", "api-gateway").
 */
function isReservedSlug(value) {
  if (RESERVED_PREFIXES.some((p) => value.startsWith(p))) return true;
  if (RESERVED_SLUGS.has(value)) return true;
  // The leading word-segment covers every single-word reserved entry.
  if (RESERVED_SLUGS.has(value.split('-')[0])) return true;
  // Multi-word entries ("reset-password") also block slugs that extend them.
  return MULTIWORD_RESERVED.some((word) => value.startsWith(`${word}-`));
}

/** Reserved entries that themselves contain a hyphen, precomputed once. */
const MULTIWORD_RESERVED = [...RESERVED_SLUGS].filter((w) => w.includes('-'));

/**
 * Why a slug cannot be used, or null when it is well-formed.
 * 'invalid'  - fails the character/length rule
 * 'reserved' - a system path / platform word (admin, api, www, app, billing, ...)
 */
export function subdomainProblem(slug) {
  const value = String(slug || '').trim().toLowerCase();
  if (!SLUG_RE.test(value)) return 'invalid';
  if (RESERVED_SUBDOMAINS.has(value)) return 'reserved';
  if (isReservedSlug(value)) return 'reserved';
  return null;
}

/** Human text for each problem, shown under the signup field. */
export const SUBDOMAIN_MESSAGES = {
  invalid: 'Use 3-40 characters: lowercase letters, numbers and hyphens, starting with a letter or number.',
  reserved: 'That address is reserved by the platform. Please choose another.',
  taken: 'That address is already taken. Try another one.',
};