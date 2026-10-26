// src/lib/seo.js
// DiDwa - SEO constants, meta content, and keyword strategy

export const SITE_NAME = 'DiDwa';
export const SITE_URL = 'https://didwaghana.com';

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
    title: 'DiDwa – Online Store Builder in Ghana | E-commerce Platform for Ghanaian Businesses',
    titleLength: 79,
    description:
      'Build and manage your Ghanaian online store with DiDwa. All-in-one e-commerce platform and digital POS for retail businesses. Accept Mobile Money, manage inventory, and grow sales across Accra and Kumasi. Start free today.',
    descriptionLength: 163,
    h1: 'Build Your Online Store in Ghana with DiDwa',
    h2s: [
      'The All-in-One E-commerce Platform for Ghanaian Merchants',
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
      'Frequently Asked Questions (Ghana E-commerce)',
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

export const ROBOTS_TXT = `# DiDwa - didwaghana.com
# Robots Exclusion Protocol

User-agent: *
Allow: /
Allow: /blog/
Allow: /pricing
Allow: /features
Allow: /about
Allow: /contact
Allow: /developer-guide
Allow: /stores/

# Protect private admin and dashboard routes
Disallow: /admin/
Disallow: /dashboard/
Disallow: /pos/
Disallow: /settings/
Disallow: /api/
Disallow: /_next/
Disallow: /private/

# Sitemap location
Sitemap: https://didwaghana.com/sitemap.xml`;
