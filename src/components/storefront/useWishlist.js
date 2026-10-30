import { useEffect, useState } from 'react';

const COOKIE_NAME = 'gs_storefront_wishlist';
const MAX_ITEMS = 40;
const MAX_COOKIE_LENGTH = 3500;

function readWishlistCookie() {
  if (typeof document === 'undefined') return [];
  const entry = document.cookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!entry) return [];
  try {
    const value = JSON.parse(decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)));
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id) => typeof id === 'string' || typeof id === 'number')
      .map(String))].slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeWishlistCookie(ids) {
  if (typeof document === 'undefined') return;
  let saved = ids.slice(0, MAX_ITEMS);
  let value = encodeURIComponent(JSON.stringify(saved));
  while (value.length > MAX_COOKIE_LENGTH && saved.length) {
    saved = saved.slice(0, -1);
    value = encodeURIComponent(JSON.stringify(saved));
  }
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = saved.length
    ? `${COOKIE_NAME}=${value}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`
    : `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}

export function useWishlist(enabled) {
  const [ids, setIds] = useState(() => (enabled ? readWishlistCookie() : []));

  useEffect(() => {
    if (enabled) writeWishlistCookie(ids);
  }, [enabled, ids]);

  function toggle(productId) {
    if (!enabled || productId == null) return;
    const id = String(productId);
    setIds((current) => current.includes(id)
      ? current.filter((savedId) => savedId !== id)
      : [...current, id].slice(-MAX_ITEMS));
  }

  return {
    ids,
    isSaved: (productId) => ids.includes(String(productId)),
    toggle,
    remove: (productId) => setIds((current) => current.filter((id) => id !== String(productId))),
  };
}
