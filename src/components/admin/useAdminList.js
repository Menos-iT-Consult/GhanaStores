/**
 * DiDwa - Super admin list hook.
 *
 * Eight of the admin pages are the same screen with a different endpoint: a
 * search box, some filters, a paged table and the four states that actually
 * matter (loading, error, empty, populated). This hook owns all of that once,
 * so a new admin list page is a URL and a column definition rather than a
 * re-implementation of paging, debouncing and race handling.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminApi } from '../../api.js';

/** Build `?a=1&b=2`, dropping empty values so filters stay out of the URL. */
export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === '' || value === null || value === undefined) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * @param {string} path   e.g. '/api/admin/merchants'
 * @param {{params?: object, limit?: number}} options
 */
export function useAdminList(path, { params = {}, limit = 25 } = {}) {
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');          // debounced
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);
  const live = useRef(true);

  // Debounce so typing a store name does not fire a query per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(term.trim()), 300);
    return () => clearTimeout(timer);
  }, [term]);

  // A new search or filter must return to page 1, or the operator lands on an
  // empty page of results that no longer exist.
  const filterKey = JSON.stringify(filters);
  useEffect(() => { setPage(1); }, [query, filterKey]);

  const rowsKey = params.rowsKey || 'rows';
  const paramKey = JSON.stringify({ ...params, rowsKey: null });
  useEffect(() => {
    live.current = true;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const url = `${path}${buildQuery({ ...JSON.parse(paramKey), q: query, page, limit })}`;
        const result = await adminApi.get(url);
        if (!live.current) return;
        setData({ ...result, rows: Array.isArray(result?.[rowsKey]) ? result[rowsKey] : [] });
      } catch (err) {
        if (live.current) setError(err.message);
      } finally {
        if (live.current) setLoading(false);
      }
    })();
    return () => { live.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramKey, query, page, limit, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setFilter = useCallback((key, value) => {
    setFilters((current) => {
      const next = { ...current };
      // An empty value is the same as "no filter", so drop the key entirely.
      if (value === '' || value === null || value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  }, []);

  const state = useMemo(() => ({
    rows: data.rows,
    total: data.total,
    pages: data.pages,
    page: data.page,
    term,
    setTerm,
    filters,
    setFilter,
    setPage,
    loading,
    error,
    reload,
    isEmpty: !loading && !error && data.rows.length === 0,
    isFiltered: Boolean(query) || Object.keys(filters).length > 0,
  }), [data, term, filters, loading, error, reload, query]);

  return state;
}

export default useAdminList;
