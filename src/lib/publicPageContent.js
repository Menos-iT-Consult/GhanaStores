import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

export const PUBLIC_PAGE_FALLBACKS = {
  '/': {
    eyebrow: 'Commerce built for Ghanaian shops',
    title: 'Sell in-store & online.',
    titleAccent: 'Manage every sale with DiDwa.',
    description: 'Bring in-person sales, inventory, online orders and your storefront into one seller workspace. Use guided DiDwa AI actions based on your store data.',
    primaryLabel: 'Start your free trial',
    primaryHref: '/login',
    secondaryLabel: 'See how it works',
    secondaryHref: '/how-it-works',
    mediaType: 'image',
    mediaUrl: '/iphone-shot.png',
    posterUrl: '/iphone-shot.png',
    mediaAlt: 'DiDwa seller dashboard shown on a mobile device',
    mediaCaption: 'Products, stock, orders and sales in one workspace',
    sectionEyebrow: 'Built around the way you sell',
    sectionTitle: 'One login. Every tool your shop needs.',
    seoTitle: 'Online Store Builder in Ghana & POS | DiDwa',
    seoDescription: 'Manage in-person and online sales, stock, orders, and storefront themes with DiDwa. Get guided seller AI tools and managed payout requests.',
    ogImage: '/didwa-logo.jpg',
  },
};
const EMPTY_PUBLIC_PAGE = Object.freeze({});

export function usePublicPageContent(slug) {
  const fallback = PUBLIC_PAGE_FALLBACKS[slug] || EMPTY_PUBLIC_PAGE;
  const [content, setContent] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const key = slug === '/' ? 'home' : slug.replace(/^\//, '');
      const result = await api.get(`/api/public-pages/${encodeURIComponent(key)}`);
      setContent({ ...fallback, ...(result.content || {}) });
    } catch {
      setContent(fallback);
    } finally {
      setLoading(false);
    }
  }, [fallback, slug]);
  useEffect(() => { void load(); }, [load]);
  return { content, loading, reload: load };
}
