// src/components/seo/MetaTags.jsx
// Reusable SEO meta tag manager for DiDwa pages
// Works with Vite/React. Call once per page route.

import { useEffect } from 'react';

export default function MetaTags({
  title,
  description,
  canonical,
  ogImage,
  noindex = false,
  keywords = [],
}) {
  useEffect(() => {
    if (title) document.title = title;

    const setMeta = (name, content, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const setLink = (rel, href) => {
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // Robots
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // Description
    if (description) setMeta('description', description);

    // Keywords
    if (keywords.length) setMeta('keywords', keywords.join(', '));

    // Canonical
    if (canonical) setLink('canonical', canonical);

    // Open Graph
    setMeta('og:title', title || document.title, 'property');
    setMeta('og:description', description || '', 'property');
    setMeta('og:url', canonical || window.location.href, 'property');
    setMeta('og:type', 'website', 'property');
    if (ogImage) setMeta('og:image', ogImage, 'property');
    setMeta('og:site_name', 'DiDwa', 'property');

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image', 'name');
    setMeta('twitter:title', title || document.title, 'name');
    setMeta('twitter:description', description || '', 'name');
    if (ogImage) setMeta('twitter:image', ogImage, 'name');
  }, [title, description, canonical, ogImage, noindex, keywords]);

  return null;
}
