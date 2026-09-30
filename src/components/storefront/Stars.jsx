/**
 * components/storefront/Stars.jsx
 * The static five-star rating row shown on the product page.
 */
import { Star } from 'lucide-react';

/**
 * @param {object} props
 * @param {string} [props.label] The accessible label for the star row.
 */
export default function Stars({ label = 'Rated 4.8 out of 5' }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={12} className="text-amber-400" fill="currentColor" aria-hidden="true" />)}
    </span>
  );
}