/**
 * components/storefront/pages/ShopBody.jsx
 * The catalog page: breadcrumb, search field, sort control, category tabs and
 * the product grid.
 *
 * Filtering and sorting live in ./catalog.js as pure functions; this component
 * only owns the two pieces of view state (query, sort, category) and renders
 * the result. There is no pagination: the storefront API returns the whole
 * catalog, so a page-number strip would have been decoration that led nowhere.
 */
import { useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import ProductCard from '../ProductCard.jsx';
import { SORT_OPTIONS, categoriesOf, filterProducts, sortProducts } from '../catalog.js';

/**
 * @param {object} props
 * @param {object} props.t Render tokens from useTokens.
 * @param {Function} props.onNavigate Page navigation callback.
 * @param {object} props.ctx Preview context (products).
 */
export default function ShopBody({ t, onNavigate, ctx }) {
  const { c, gridColumns } = t;
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState('featured');
  const [term, setTerm] = useState('');
  const cats = categoriesOf(ctx.products);
  const list = sortProducts(filterProducts(ctx.products, { category: cat, term }), sort);
  const hasQuery = term.trim().length > 0;
  const total = ctx.products.length;
  const sc = c.shop_content || {};

  /* Two different empty states: a store with nothing in it is a different
     problem from a shopper whose search matched nothing, and they need
     different words and a different way out. */
  const empty = !total
    ? { title: sc.empty_body || 'This store has no products available yet.', hint: sc.empty_hint || 'Check back soon.' }
    : hasQuery || cat !== 'All'
      ? {
          title: sc.no_match_body
            ? (hasQuery ? sc.no_match_body.replace('{query}', term.trim()) : `No products in ${cat}.`)
            : (hasQuery ? `No products match "${term.trim()}".` : `No products in ${cat}.`),
          hint: sc.no_match_hint || 'Try a different search or browse everything.',
        }
      : null;

  return (
    <section className="p-5" aria-label="Shop catalog">
      <nav className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide opacity-60" aria-label="Breadcrumb">
        <span>Home</span> <ChevronRight size={10} aria-hidden="true" /> <span>Shop</span>
      </nav>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-extrabold">{cat === 'All' ? (sc.heading_all || 'All Products') : cat} <span className="text-xs font-bold opacity-50">({list.length})</span></h1>
        <div className="flex items-center gap-2">
          <label className="relative flex items-center">
            <Search size={13} className="pointer-events-none absolute left-2 opacity-60" aria-hidden="true" />
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={sc.search_placeholder || 'Search products'}
              aria-label="Search products"
              className="w-36 rounded-md border py-1 pl-7 pr-6 text-[11px] font-semibold outline-none focus:border-current"
              style={{ borderColor: 'rgba(148,163,184,.4)', background: 'var(--surface)', color: 'var(--text)' }}
            />
            {hasQuery ? (
              <button type="button" onClick={() => setTerm('')} aria-label="Clear search" className="absolute right-1.5 opacity-60 hover:opacity-100">
                <X size={12} aria-hidden="true" />
              </button>
            ) : null}
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort products"
            className="rounded-md border px-2 py-1 text-[11px] font-semibold"
            style={{ borderColor: 'rgba(148,163,184,.4)', background: 'var(--surface)', color: 'var(--text)' }}
          >
            {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Categories">
        {cats.map((x) => (
          <button
            key={x}
            type="button"
            role="tab"
            aria-selected={cat === x}
            onClick={() => setCat(x)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${cat === x ? 'text-white' : ''}`}
            style={cat === x ? { background: 'var(--primary)' } : { background: 'var(--surface)', color: 'var(--text)' }}
          >
            {x}
          </button>
        ))}
      </div>
      {empty ? (
        <div className="rounded-lg border border-dashed p-8 text-center" style={{ borderColor: 'rgba(148,163,184,.4)' }}>
          <p className="text-xs font-bold">{empty.title}</p>
          <p className="mt-1 text-[11px] font-semibold opacity-70">{empty.hint}</p>
          {(hasQuery || cat !== 'All') && total ? (
            <button
              type="button"
              onClick={() => { setTerm(''); setCat('All'); }}
              className="mt-3 rounded-lg border px-3 py-1.5 text-[11px] font-bold"
              style={{ borderColor: 'rgba(148,163,184,.5)' }}
            >
              {(sc.clear_filters_label || 'Clear filters')}
            </button>
          ) : null}
        </div>
      ) : null}
      {list.length ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(gridColumns, 4)}, minmax(0,1fr))` }}>
          {list.map((p) => <ProductCard key={p.id} p={p} t={t} onNavigate={onNavigate} ctx={ctx} />)}
        </div>
      ) : null}
    </section>
  );
}