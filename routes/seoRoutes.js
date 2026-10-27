import { Router } from 'express';
import { query } from '../config/database.js';
import { platformDomain } from '../middleware/domainMiddleware.js';

const router = Router();

export const PLATFORM_PUBLIC_PATHS = [
  '/',
  '/pricing',
  '/features',
  '/how-it-works',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/affiliate-program',
];

const CACHE_CONTROL = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,39}$/;
const HOST_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const PRODUCT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validHost(value) {
  const host = String(value || '').trim().toLowerCase().replace(/\.$/, '');
  return HOST_PATTERN.test(host) ? host : '';
}

export function getStorefrontOrigin(store, apex = platformDomain()) {
  const customDomain = validHost(store?.custom_domain);
  if (customDomain) return `https://${customDomain}`;

  const slug = String(store?.subdomain_slug || '').trim().toLowerCase();
  const baseDomain = validHost(apex);
  if (!SLUG_PATTERN.test(slug) || !baseDomain) return '';
  return `https://${slug}.${baseDomain}`;
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function validLastmod(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function buildSitemapXml(entries) {
  const urls = entries.map(({ url, lastmod }) => {
    const date = validLastmod(lastmod);
    return `  <url>
    <loc>${xmlEscape(url)}</loc>${date ? `\n    <lastmod>${date}</lastmod>` : ''}
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

function addSitemapHeaders(res) {
  res.type('application/xml');
  res.set('Cache-Control', CACHE_CONTROL);
}

function respondWithSitemap(res, entries) {
  addSitemapHeaders(res);
  res.send(buildSitemapXml(entries));
}

async function sendPlatformSitemap(res) {
  const apex = validHost(platformDomain());
  const pages = PLATFORM_PUBLIC_PATHS.map((path) => ({
    url: `https://${apex}${path}`,
  }));
  const { rows } = await query(
    `SELECT subdomain_slug, created_at
       FROM stores
      WHERE status <> 'SUSPENDED'
         AND NULLIF(BTRIM(custom_domain), '') IS NULL
      ORDER BY created_at DESC`,
  );
  const storefronts = rows
    .filter((store) => SLUG_PATTERN.test(String(store.subdomain_slug || '').toLowerCase()))
    .map((store) => ({
      url: getStorefrontOrigin(store, apex),
      lastmod: store.created_at,
    }))
    .filter((entry) => entry.url);

  respondWithSitemap(res, [...pages, ...storefronts]);
}

async function sendStorefrontSitemap(res, store) {
  const origin = getStorefrontOrigin(store);
  if (!origin) {
    return res.status(500).type('text/plain').send('Storefront sitemap is unavailable.');
  }

  const entries = [
    { url: `${origin}/` },
    { url: `${origin}/shop` },
    { url: `${origin}/about` },
    { url: `${origin}/contact` },
  ];
  const { rows } = await query(
    `SELECT id, updated_at
       FROM products
      WHERE store_id = $1 AND is_active = TRUE
      ORDER BY updated_at DESC`,
    [store.id],
  );
  for (const product of rows) {
    if (!PRODUCT_ID_PATTERN.test(String(product.id || ''))) continue;
    entries.push({
      url: `${origin}/product/${product.id}`,
      lastmod: product.updated_at,
    });
  }

  respondWithSitemap(res, entries);
}

router.get(['/sitemap.xml', '/api/sitemap.xml'], async (req, res, next) => {
  try {
    if (req.tenantStore) return await sendStorefrontSitemap(res, req.tenantStore);
    return await sendPlatformSitemap(res);
  } catch (error) {
    next(error);
  }
});

function robotsForPlatform() {
  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /dashboard
Disallow: /login
Disallow: /pos
Disallow: /messages
Disallow: /settings
Disallow: /inventory
Disallow: /orders
Disallow: /themes
Disallow: /domains
Disallow: /developer-guide
Disallow: /reset-password
Disallow: /affiliate/login
Disallow: /affiliate/signup
Disallow: /affiliate/dashboard

Sitemap: https://${validHost(platformDomain())}/sitemap.xml`;
}

function robotsForStorefront(store) {
  const origin = getStorefrontOrigin(store);
  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /cart
Disallow: /checkout
Disallow: /track
Disallow: /tracking
Disallow: /order
Disallow: /orders

Sitemap: ${origin}/sitemap.xml`;
}

router.get(['/robots.txt', '/api/robots.txt'], (req, res) => {
  res.type('text/plain');
  res.set('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800');
  res.send(req.tenantStore ? robotsForStorefront(req.tenantStore) : robotsForPlatform());
});

export default router;
