/**
 * components/storefront/catalog.js
 * Pure catalog querying used by the shop page: text search, category
 * filtering and sorting.
 *
 * Kept free of React and of the theme tokens so the rules can be unit tested
 * directly (scripts/storefrontRenderTest.js) rather than only being visible in
 * the rendered markup.
 */

/**
 * The sort orders the shop page offers, in the order the control lists them.
 * `featured` is deliberately not a sort at all - it preserves the order the
 * store's API returned products in.
 */
export const SORT_OPTIONS = [
  { key: 'featured', label: 'Sort: Featured' },
  { key: 'price-asc', label: 'Price: Low to High' },
  { key: 'price-desc', label: 'Price: High to Low' },
  { key: 'newest', label: 'Newest' },
];

/**
 * Does a product match a free-text query?
 *
 * Matches on name, category and description so a shopper can type "kente" or
 * "bags" or "cotton" and get the product they meant. An empty or whitespace
 * query matches everything.
 *
 * @param {object} p A display product from toDisplayProduct.
 * @param {string} term The raw query text.
 * @returns {boolean} True when the product should stay in the results.
 */
export function matchesSearch(p, term) {
  const q = String(term || '').trim().toLowerCase();
  if (!q) return true;
  return `${p.name || ''} ${p.category || ''} ${p.description || ''}`
    .toLowerCase()
    .includes(q);
}

/**
 * Filter products by category and free-text query.
 *
 * Both filters are ANDed. Category 'All' (the default) does not constrain.
 *
 * @param {Array} products The display products to filter.
 * @param {object} filters
 * @param {string} [filters.category] The selected category, or 'All'.
 * @param {string} [filters.term] The search query.
 * @returns {Array} The filtered products, in their original order.
 */
export function filterProducts(products, { category = 'All', term = '' } = {}) {
  const q = String(term || '').trim();
  return products.filter((p) => {
    if (category && category !== 'All' && p.category !== category) return false;
    return matchesSearch(p, q);
  });
}

/**
 * Sort products into a display order. Returns a new array; the input is not
 * mutated, because 'featured' must leave the store's own ordering intact.
 *
 * 'newest' sorts by createdAt descending and falls back to the incoming order
 * for products that carry no timestamp, so a catalog without dates still
 * renders a stable list instead of an arbitrary one.
 *
 * @param {Array} products The display products to sort.
 * @param {string} key One of the SORT_OPTIONS keys.
 * @returns {Array} A new, ordered array.
 */
export function sortProducts(products, key) {
  const list = [...products];
  if (key === 'price-asc') {
    return list.sort((a, b) => Number(a.price) - Number(b.price));
  }
  if (key === 'price-desc') {
    return list.sort((a, b) => Number(b.price) - Number(a.price));
  }
  if (key === 'newest') {
    return list.sort((a, b) => {
      const at = Number(a.createdAt ?? 0);
      const bt = Number(b.createdAt ?? 0);
      return bt - at;
    });
  }
  return list;
}

/**
 * The distinct categories present in a product list, ordered as they first
 * appear, with 'All' prepended.
 *
 * @param {Array} products The display products to inspect.
 * @returns {string[]} Category keys, starting with 'All'.
 */
export function categoriesOf(products) {
  return ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
}