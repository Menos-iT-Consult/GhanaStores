// src/components/seo/MetaTags.jsx
// Reusable SEO meta tag manager for DiDwa pages
// Works with Vite/React. Call once per page route.

import { useEffect } from 'react';

const DEFAULT_TITLE = 'Online Store Builder in Ghana & POS | DiDwa';
const DEFAULT_DESCRIPTION =
  'Run your Ghanaian shop online and in-store with DiDwa. Accept Mobile Money, manage inventory and orders, and launch your own online store.';

export default function MetaTags({
  title,
  description,
  canonical,
  ogImage,
  noindex = false,
  keywords = [],
}) {
  const keywordContent = keywords.join(', ');

  useEffect(() => {
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

    document.title = title || DEFAULT_TITLE;
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');
    setMeta('description', description || DEFAULT_DESCRIPTION);
    if (keywordContent) setMeta('keywords', keywordContent);
    else document.querySelector('meta[name="keywords"]')?.remove();
    if (canonical) setLink('canonical', canonical);
    else document.querySelector('link[rel="canonical"]')?.remove();
    if (noindex) {
      document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')
        .forEach((meta) => meta.remove());
    } else {
      setMeta('og:title', title || document.title, 'property');
      setMeta('og:description', description || DEFAULT_DESCRIPTION, 'property');
      setMeta('og:url', canonical || window.location.href, 'property');
      setMeta('og:type', 'website', 'property');
      setMeta('og:site_name', 'DiDwa', 'property');
      if (ogImage) setMeta('og:image', ogImage, 'property');
      else document.querySelector('meta[property="og:image"]')?.remove();
      setMeta('twitter:card', 'summary_large_image', 'name');
      setMeta('twitter:title', title || document.title, 'name');
      setMeta('twitter:description', description || DEFAULT_DESCRIPTION, 'name');
      if (ogImage) setMeta('twitter:image', ogImage, 'name');
      else document.querySelector('meta[name="twitter:image"]')?.remove();
    }

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('description', DEFAULT_DESCRIPTION);
      setMeta('robots', 'index, follow');
      document.querySelector('link[rel="canonical"]')?.remove();
      document.querySelector('meta[name="keywords"]')?.remove();
      document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')
        .forEach((meta) => meta.remove());
    };
  }, [title, description, canonical, ogImage, noindex, keywordContent]);

  return null;
}
