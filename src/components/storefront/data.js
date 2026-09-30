/**
 * components/storefront/data.js
 * Static data for the storefront: the demo catalogue the theme customizer paints
 * when no real products are passed, and the customer-facing payment labels.
 *
 * DEMO_PRODUCTS is the raw seed; DEMO_CATALOG is that same seed run through
 * toDisplayProduct, so the preview exercises the live rendering path.
 */
import { toDisplayProduct } from './mappers.js';

/**
 * Customer-facing names for the payment rails a store owner can configure under
 * /settings/payments. The keys match the orders.payment_method CHECK constraint;
 * the storefront shows only the owner's chosen rail, never a picker.
 */
export const PAYMENT_LABELS = {
  COD: 'Cash on Delivery',
  PAYSTACK: 'Card',
  HUBTEL: 'Mobile Money',
};

export const DEMO_PRODUCTS = [
  { id: 1, name: 'Kente Cloth Scarf', price: 180, img: 'https://picsum.photos/seed/kente/400/300', stock: 3 },
  { id: 2, name: 'Ankara Print Dress', price: 250, img: 'https://picsum.photos/seed/ankara/400/300', stock: 12 },
  { id: 3, name: 'Shea Butter 250g', price: 45, img: 'https://picsum.photos/seed/shea/400/300', stock: 7 },
  { id: 4, name: 'Bolga Basket', price: 110, img: 'https://picsum.photos/seed/bolga/400/300', stock: 2 },
  { id: 5, name: 'Solar Power Bank', price: 280, img: 'https://picsum.photos/seed/solar/400/300', stock: 9 },
  { id: 6, name: 'Adinkra Wall Art', price: 210, img: 'https://picsum.photos/seed/adinkra/400/300', stock: 5 },
];

/** The demo catalogue, run through the same mapper the live shop uses. */
export const DEMO_CATALOG = DEMO_PRODUCTS.map(toDisplayProduct);

/** Demo cart lines, shaped exactly like the live ones the storefront passes in. */
export const CART_ITEMS = DEMO_CATALOG.slice(0, 2).map((p) => ({
  id: p.id, name: p.name, label: '', price: p.price, quantity: 1, img: p.img, stock: p.stock,
}));