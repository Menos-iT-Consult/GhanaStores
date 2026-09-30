/**
 * components/storefront/mappers.js
 * Shape a public-catalog row into what the storefront paints.
 *
 * The storefront API returns a product with nested variants; the cards want one
 * price, one image and a total stock figure, and the detail page wants the
 * variants. Demo products (price/img/stock, no variants) pass through the same
 * function so the customizer preview and the live shop share one code path.
 */

/**
 * @param {object} row A public-catalog product row.
 * @returns {object} The flattened display product the storefront renders.
 */
export function toDisplayProduct(row) {
  const variants = (row.variants || []).map((v) => ({
    id: v.id,
    label: [v.optionName, v.optionValue].filter(Boolean).join(' ') || 'Option',
    price: Number(v.price ?? 0),
    stock: Number(v.stockQuantity ?? 0),
    inStock: v.inStock !== false && Number(v.stockQuantity ?? 0) > 0,
  }));

  if (!variants.length) {
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      category: row.category || '',
      img: row.img || row.image_url || '',
      price: Number(row.price ?? 0),
      stock: Number(row.stock ?? 0),
      createdAt: row.created_at ?? row.createdAt ?? null,
      variants: [],
    };
  }

  const priced = variants.filter((v) => v.price > 0);
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category || '',
    img: row.image_url || '',
    price: priced.length ? Math.min(...priced.map((v) => v.price)) : 0,
    stock: variants.reduce((sum, v) => sum + v.stock, 0),
    createdAt: row.created_at ?? row.createdAt ?? null,
    variants,
  };
}