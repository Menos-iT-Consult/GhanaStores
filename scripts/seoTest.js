import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSitemapXml,
  getStorefrontOrigin,
  PLATFORM_PUBLIC_PATHS,
} from '../routes/seoRoutes.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

assert.deepEqual(PLATFORM_PUBLIC_PATHS, [
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
assert.equal(getStorefrontOrigin({ subdomain_slug: 'kofi-shop' }, 'didwaghana.com'),
  'https://kofi-shop.didwaghana.com');
assert.equal(getStorefrontOrigin({
  subdomain_slug: 'kofi-shop',
  custom_domain: 'Shop.Example.com',
}, 'didwaghana.com'), 'https://shop.example.com');
assert.equal(getStorefrontOrigin({ subdomain_slug: '../bad' }, 'didwaghana.com'), '');

const xml = buildSitemapXml([
  { url: 'https://didwaghana.com/?a=1&b=2', lastmod: '2026-10-27T12:00:00Z' },
  { url: 'https://shop.example.com/product/one', lastmod: 'not-a-date' },
]);
assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(xml, /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
assert.match(xml, /<loc>https:\/\/didwaghana\.com\/\?a=1&amp;b=2<\/loc>/);
assert.match(xml, /<lastmod>2026-10-27T12:00:00\.000Z<\/lastmod>/);
assert.doesNotMatch(xml, /<lastmod>not-a-date<\/lastmod>/);
assert.match(xml, /<\/urlset>$/);

const liveRoute = read('routes/seoRoutes.js');
assert.match(liveRoute, /SELECT subdomain_slug, created_at/);
assert.match(liveRoute, /NULLIF\(BTRIM\(custom_domain\), ''\) IS NULL/);
assert.match(liveRoute, /SELECT id, updated_at[\s\S]*FROM products[\s\S]*is_active = TRUE/);
assert.match(liveRoute, /router\.get\(\['\/sitemap\.xml', '\/api\/sitemap\.xml'\]/);
assert.match(liveRoute, /Disallow: \/affiliate\/dashboard/);

const vercel = JSON.parse(read('vercel.json'));
assert.ok(vercel.rewrites.some((rewrite) =>
  rewrite.source === '/sitemap.xml' && rewrite.destination === '/api/sitemap.xml'));
assert.ok(vercel.rewrites.some((rewrite) =>
  rewrite.source === '/robots.txt' && rewrite.destination === '/api/robots.txt'));

const app = read('src/App.jsx');
assert.match(app, /noindex, nofollow/);
assert.match(app, /INDEXABLE_PUBLIC_ROUTES\.has\(route\)/);
const index = read('index.html');
assert.match(index, /<link rel="canonical" href="https:\/\/didwaghana\.com\/" \/>/);
assert.match(index, /<div id="root">\s*<main[^>]*>[\s\S]*?<h1\b[^>]*>Online Store Builder in Ghana &amp; POS \| DiDwa<\/h1>/);
assert.ok(index.indexOf('<h1') < index.indexOf('<script type="module" src="/src/main.jsx"></script>'));
assert.ok('Online Store Builder in Ghana & POS | DiDwa'.length <= 150);
assert.match(read('src/lib/seo.js'), /descriptionLength: 138/);
const softwareSchema = read('src/components/seo/SoftwareApplicationSchema.jsx');
assert.doesNotMatch(softwareSchema, /aggregateRating|reviewCount|ratingValue/);
assert.match(read('src/pages/LiveStorefront.jsx'), /canonical=\{canonical\}/);

console.log('All SEO checks passed.');
