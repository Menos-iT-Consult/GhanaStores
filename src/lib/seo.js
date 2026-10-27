// src/lib/seo.js
// DiDwa - SEO constants, meta content, and keyword strategy

import { getPlatformDomain } from '../config.js';

export const SITE_NAME = 'DiDwa';
export const INDEXABLE_PUBLIC_ROUTES = new Set([
  '/',
  '/pricing',
  '/features',
  '/how-it-works',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/affiliate-program',
]);

export function siteUrl(path = '') {
  const host = String(getPlatformDomain() || 'didwaghana.com')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .split(':')[0];
  const suffix = path ? `/${String(path).replace(/^\/+/, '')}` : '';
  return `https://${host}${suffix}`;
}

export const PRIMARY_KEYWORDS = [
  'online store builder in Ghana',
  'e-commerce platform for Ghanaian businesses',
  'digital POS for retail in Ghana',
  'Ghana online shop setup',
  'MOMO payment integration Ghana',
];

export const SECONDARY_KEYWORDS = [
  'sell online Ghana Accra Kumasi',
  'mobile money POS Ghana',
  'Ghana SME e-commerce',
  'cedi payment gateway',
  'Ghana retail inventory management',
];

export const META_CONTENT = {
  homepage: {
    title: 'Online Store Builder in Ghana & POS | DiDwa',
    titleLength: 43,
    description:
      'Run your Ghanaian shop online and in-store with DiDwa. Accept Mobile Money, manage inventory and orders, and launch your own online store.',
    descriptionLength: 138,
    h1: 'Sell in-store and online with DiDwa',
    h2s: [
      'The All-in-One Commerce Platform for Ghanaian Merchants',
      'Accept Mobile Money & Card Payments',
      'Digital POS Built for Ghanaian Retail',
      'Inventory Management for Local Shops',
      'Why Ghanaian Sellers Choose DiDwa',
      'Local Support & Cedi Pricing',
      'Subdomain & Custom Domain Setup',
      'Mobile-First Storefront Design',
      'Start Selling Online in 3 Steps',
      'Step 1: Register Your Store',
      'Step 2: Add Products & Set Prices',
      'Step 3: Go Live & Accept Orders',
      'Frequently Asked Questions',
    ],
  },
  merchantLanding: {
    title: 'Merchant Dashboard – Manage Your Ghana Online Store | DiDwa POS',
    titleLength: 60,
    description:
      "Run your Ghanaian retail business from one dashboard. DiDwa's digital POS helps you track inventory, process Mobile Money payments, and manage orders across Accra, Kumasi, and beyond.",
    descriptionLength: 159,
    h1: 'Manage Your Ghana Online Store from One Dashboard',
    h2s: [
      'Digital POS Built for Ghanaian Retail',
      'Accept Mobile Money & Card Payments',
      'Track Inventory in Real-Time',
      'Manage Orders Across Accra and Kumasi',
      'Subdomain & Custom Domain Setup',
      'Start Selling Online in Minutes',
    ],
  },
  pricing: {
    title: 'E-commerce Platform Pricing Ghana | DiDwa Plans for SMEs',
    titleLength: 68,
    description:
      'Transparent pricing for Ghanaian businesses. Choose the DiDwa plan that fits your store. No hidden fees. Pay in cedis. Start selling online today.',
    descriptionLength: 148,
    h1: 'Simple, Transparent Pricing for Ghanaian Merchants',
    h2s: [
      'Plans Built for Ghanaian SMEs',
      'No Hidden Fees, Pay in Cedis',
      'Mobile Money Included',
      'Start Free, Upgrade When You Grow',
    ],
  },
};

export const FAQ_CONTENT = [
  {
    q: 'What is the best e-commerce platform in Ghana?',
    a: 'DiDwa is built specifically for Ghanaian merchants, with Mobile Money integration, cedi pricing, and local support.',
  },
  {
    q: 'Can I sell online in Ghana with DiDwa?',
    a: 'Yes. DiDwa lets you build an online store, list products, accept payments via MOMO and cards, and manage orders from one dashboard.',
  },
  {
    q: 'Does DiDwa support Mobile Money payments?',
    a: 'Yes. DiDwa integrates with MTN MoMo, Vodafone Cash, and AirtelTigo Money for Ghanaian customers.',
  },
];
