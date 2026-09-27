/**
 * Which state the theme market grid is in.
 *
 * "No themes published" and "your filters excluded everything" look identical
 * in the UI but have completely different fixes, so they are modelled
 * separately. Kept in a plain module (no JSX) so it can be unit-tested.
 */

/**
 * @param {object} state
 * @param {boolean} state.loading      - the catalog request is still in flight
 * @param {string}  state.error        - the catalog request failed
 * @param {number}  state.catalogSize  - templates returned by the API
 * @param {number}  state.visibleCount - templates left after search + filters
 * @returns {'loading'|'error'|'no-catalog'|'no-matches'|'ok'}
 */
export function themeGridState({ loading = false, error = '', catalogSize = 0, visibleCount = 0 } = {}) {
  if (error) return 'error';
  if (loading) return 'loading';
  if (!catalogSize) return 'no-catalog';
  if (!visibleCount) return 'no-matches';
  return 'ok';
}
