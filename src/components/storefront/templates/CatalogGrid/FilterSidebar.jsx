/**
 * components/storefront/templates/CatalogGrid/FilterSidebar.jsx
 * Left filter rail: price range, categories, rating, availability.
 * Collapses to a drawer on mobile/tablet.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import GlassCard from '../../templates/shared/GlassCard.jsx';

/**
 * @typedef {object} CatalogFilters
 * @property {string} category
 * @property {number|null} maxPrice
 * @property {boolean} inStockOnly
 */

/**
 * @param {object} props
 * @param {object} props.t Render tokens from useTokens.
 * @param {string[]} props.categories Category keys.
 * @param {CatalogFilters} props.filters
 * @param {Function} props.onChange Patch filters.
 */
export default function FilterSidebar({ t, categories, filters, onChange }) {
  const { compact, narrow } = t;
  const [open, setOpen] = useState(false);
  const drawer = compact || narrow;
  const body = (
    <div className="space-y-4 p-4">
      <div>
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.25em] text-white/50">Category</p>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => onChange({ category: x })}
              aria-pressed={filters.category === x}
              className="rounded-full px-2.5 py-1 text-[11px] font-bold transition"
              style={filters.category === x ? { background: 'var(--primary)', color: '#fff' } : { background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.75)' }}
            >
              {x}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.25em] text-white/50">Max price (GHS)</p>
        <input
          type="number"
          min={0}
          value={filters.maxPrice ?? ''}
          onChange={(e) => onChange({ maxPrice: e.target.value === '' ? null : Number(e.target.value) })}
          placeholder="No limit"
          aria-label="Maximum price"
          className="w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white outline-none placeholder:text-white/35"
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-white/80">
        <input
          type="checkbox"
          checked={Boolean(filters.inStockOnly)}
          onChange={(e) => onChange({ inStockOnly: e.target.checked })}
          className="h-3.5 w-3.5 accent-current"
        />
        In stock only
      </label>
      <button
        type="button"
        onClick={() => onChange({ category: 'All', maxPrice: null, inStockOnly: false })}
        className="w-full rounded-md border border-white/15 px-2 py-1.5 text-[11px] font-bold text-white/70 transition hover:bg-white/5"
      >
        Clear filters
      </button>
    </div>
  );
  if (!drawer) {
    return (
      <GlassCard className="w-56 shrink-0 self-start" tint="rgba(148,163,184,.14)">
        <p className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/70">
          <SlidersHorizontal size={12} aria-hidden="true" /> Filters
        </p>
        {body}
      </GlassCard>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/80"
      >
        <SlidersHorizontal size={13} aria-hidden="true" /> Filters
      </button>
      {open ? (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Filter products">
          <button type="button" aria-label="Close filters" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/60" />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] overflow-y-auto" style={{ background: 'rgba(9,13,22,.95)', borderRight: '1px solid rgba(255,255,255,.12)' }}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/70">Filters</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1.5 text-white/70 hover:bg-white/10">
                <X size={15} aria-hidden="true" />
              </button>
            </div>
            {body}
          </div>
        </div>
      ) : null}
    </>
  );
}
