/**
 * components/storefront/templates/BoutiqueEditorial/MasonryGrid.jsx
 * Asymmetric 2-column masonry grid: large imagery, hidden price until
 * hover, minimal text overlay.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { useState } from 'react';
import SafeImage from '../../../SafeImage.jsx';
import { ghs } from '../../../../api.js';
import WishlistButton from '../../WishlistButton.jsx';

/**
 * @param {object} props
 * @param {object} props.t Render tokens from useTokens.
 * @param {Array} props.products Display products.
 * @param {Function} props.onQuickView Opens the quick-view drawer for a product.
 */
export default function MasonryGrid({ t, products, onQuickView, ctx }) {
  const { compact } = t;
  const [hovered, setHovered] = useState(null);
  return (
    <div className={compact ? 'columns-1 gap-5' : 'columns-2 gap-6'} style={{ columnGap: '1.5rem' }} aria-label="Collection">
      {products.map((p, i) => {
        const hot = hovered === p.id;
        return (
          <div
            key={p.id}
            className="group relative mb-6 break-inside-avoid"
            style={{ borderRadius: 'var(--radius)', marginTop: !compact && i % 2 === 1 ? '2.5rem' : undefined }}
          >
            <button
              type="button"
              onClick={() => onQuickView(p)}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(p.id)}
              onBlur={() => setHovered(null)}
              className="relative block w-full overflow-hidden text-left"
              aria-label={`Quick view ${p.name}`}
            >
              <SafeImage
                src={p.img}
                alt={p.name}
                loading="lazy"
                className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                style={{ aspectRatio: i % 3 === 0 ? '3/4' : i % 3 === 1 ? '1/1' : '4/5' }}
              />
              <span
                className="absolute inset-x-0 bottom-0 p-4 transition-all duration-300"
                style={{ background: 'linear-gradient(to top, rgba(9,13,22,.85), transparent)', opacity: hot ? 1 : 0.92 }}
              >
                <span className="block text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">{p.category || 'Collection'}</span>
                <span className="mt-0.5 block text-base font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{p.name}</span>
                <span
                  className="mt-1.5 inline-block rounded-full px-3 py-1 text-sm font-extrabold text-white transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,.14)',
                    border: '1px solid rgba(255,255,255,.35)',
                    backdropFilter: 'blur(8px)',
                    opacity: compact || hot ? 1 : 0,
                    transform: compact || hot ? 'translateY(0)' : 'translateY(6px)',
                  }}
                >
                  {ghs(p.price)}
                </span>
              </span>
            </button>
            <WishlistButton product={p} ctx={ctx} className="absolute right-3 top-3" />
          </div>
        );
      })}
    </div>
  );
}
