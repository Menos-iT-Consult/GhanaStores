/**
 * DiDwa - Super admin API (shared list helpers).
 *
 * The super admin oversees every tenant, so its list endpoints need real
 * paging, search and sorting: the previous /admin/overview returned EVERY
 * store, EVERY domain and 250 transactions in one response, which cannot scale
 * past a few hundred merchants. Every list route here shares this parser.
 *
 * Sort columns are whitelisted per endpoint and passed through as an
 * identifier, never interpolated from raw input; search terms are escaped so a
 * `%` or `_` in a query string is matched literally.
 */
import { query } from '../../config/database.js';
import { requireAdmin } from '../../middleware/authMiddleware.js';

export { requireAdmin };

/** Escape LIKE wildcards so user input cannot turn into a pattern match. */
const escapeLike = (term) => term.replace(/[\\%_]/g, (c) => `\\${c}`);

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Parse ?q&page&limit&sort&dir into a safe query plan.
 * @param {import('express').Request} req
 * @param {{defaultLimit?: number, maxLimit?: number, sorts?: Record<string,string>}} options
 *        `sorts` maps a client-facing key to a SQL ORDER BY expression.
 */
export function readListQuery(req, { defaultLimit = 25, maxLimit = 100, sorts = {} } = {}) {
  const limit = clampInt(req.query.limit, defaultLimit, 1, maxLimit);
  const page = clampInt(req.query.page, 1, 1, 1000000);
  const q = String(req.query.q || '').trim().slice(0, 120);
  const sortKey = sorts[req.query.sort] ? String(req.query.sort) : Object.keys(sorts)[0] || null;
  const dir = String(req.query.dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return {
    limit,
    page,
    offset: (page - 1) * limit,
    term: q,
    search: q ? `%${escapeLike(q)}%` : null,
    orderBy: sortKey ? `${sorts[sortKey]} ${dir}` : null,
    sortKey,
    dir: dir.toLowerCase(),
  };
}

/**
 * Run a count + page query built from the SAME params, so a row can never be
 * counted under one filter and returned under another.
 */
export async function paged({ countSql, rowsSql, params = [], page, limit, offset }) {
  const [count, rows] = await Promise.all([query(countSql, params), query(rowsSql, params)]);
  const total = Number(count.rows[0]?.total || 0);
  return {
    rows: rows.rows,
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** Standard list envelope sent to the admin UI. */
export function listResponse(res, result, key = 'rows') {
  res.json({
    [key]: result.rows,
    page: result.page,
    limit: result.limit,
    total: result.total,
    pages: result.pages,
  });
}

/** Uppercase a query-string enum, or '' when absent/not allowed. */
export function enumFilter(value, allowed) {
  const v = String(value || '').trim().toUpperCase();
  return allowed.includes(v) ? v : '';
}

/** A UUID query param, or '' when missing/malformed (avoids 500s from pg). */
export function uuidParam(value) {
  const v = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v : '';
}
