import { Heart } from 'lucide-react';
import ProductCard from '../ProductCard.jsx';

export default function WishlistBody({ t, onNavigate, ctx }) {
  const saved = ctx.products.filter((product) => ctx.isWishlisted?.(product.id));
  return (
    <section className="p-5" aria-label="Your wishlist">
      <h1 className="flex items-center gap-2 text-lg font-extrabold">
        <Heart size={18} aria-hidden="true" /> Your wishlist
      </h1>
      <p className="mt-1 text-[11px] opacity-70">Saved on this device using a first-party cookie.</p>
      {saved.length ? (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          {saved.map((product) => (
            <ProductCard key={product.id} p={product} t={t} onNavigate={onNavigate} ctx={ctx} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-slate-200 p-6 text-center">
          <p className="text-sm font-bold">Your wishlist is empty</p>
          <p className="mt-1 text-xs opacity-70">Save products with the heart button while browsing.</p>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="mt-4 rounded-lg px-4 py-2 text-xs font-bold text-white"
            style={{ background: 'var(--primary)' }}
          >
            Browse products
          </button>
        </div>
      )}
    </section>
  );
}
