import { Heart } from 'lucide-react';

export default function WishlistButton({ product, ctx, className = '' }) {
  if (!ctx?.wishlistEnabled || typeof ctx.toggleWishlist !== 'function') return null;
  const saved = Boolean(ctx.isWishlisted?.(product.id));
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        ctx.toggleWishlist(product.id);
      }}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
      aria-pressed={saved}
      className={`grid h-9 w-9 place-items-center rounded-full border border-white/60 bg-white/95 text-rose-600 shadow-md transition hover:scale-105 ${className}`}
    >
      <Heart size={17} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  );
}
