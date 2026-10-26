// src/routes/seoRoutes.js
// DiDwa - SEO routes: dynamic XML sitemap and robots.txt
// Mounted at root level in server.js for /sitemap.xml and /robots.txt

import { Router } from 'express';
import { query } from '../config/database.js';

const router = Router();
const BASE_URL = 'https://didwaghana.com';

/**
 * Fetch all active merchant storefronts for dynamic sitemap inclusion.
 */
async function getAllMerchants() {
  const { rows } = await query(
    `SELECT subdomain_slug AS slug, updated_at
       FROM stores
      WHERE status <> 'SUSPENDED'
      ORDER BY updated_at DESC`,
  );
  return rows;
}

/**
 * Fetch all published blog posts for sitemap inclusion.
 * Falls back to empty array if blog_posts table does not exist yet.
 */
async function getAllBlogPosts() {
  try {
    const { rows } = await query(
      `SELECT slug, updated_at
         FROM blog_posts
        WHERE published = true
        ORDER BY updated_at DESC`,
    );
    return rows;
  } catch (err) {
    // blog_posts table may not exist yet; return empty so sitemap still builds
    return [];
  }
}

/**
 * GET /sitemap.xml
 * Returns a dynamic XML sitemap including homepage, static pages,
 * merchant storefronts, and blog posts.
 */
router.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const lastmod = new Date().toISOString();

    // Static pages
    const staticPages = [
      { path: '', changefreq: 'daily', priority: 1.0 },
      { path: '/pricing', changefreq: 'weekly', priority: 0.8 },
      { path: '/features', changefreq: 'weekly', priority: 0.8 },
      { path: '/about', changefreq: 'monthly', priority: 0.7 },
      { path: '/contact', changefreq: 'monthly', priority: 0.7 },
      { path: '/blog', changefreq: 'weekly', priority: 0.8 },
      { path: '/developer-guide', changefreq: 'monthly', priority: 0.6 },
    ].map((page) => ({
      url: `${BASE_URL}${page.path}`,
      lastmod,
      changefreq: page.changefreq,
      priority: page.priority,
    }));

    // Dynamic merchant storefronts
    const merchants = await getAllMerchants();
    const merchantPages = merchants.map((m) => ({
      url: `${BASE_URL}/stores/${m.slug}`,
      lastmod: m.updated_at || lastmod,
      changefreq: 'daily',
      priority: 0.9,
    }));

    // Blog posts
    const posts = await getAllBlogPosts();
    const blogPages = posts.map((p) => ({
      url: `${BASE_URL}/blog/${p.slug}`,
      lastmod: p.updated_at || lastmod,
      changefreq: 'weekly',
      priority: 0.7,
    }));

    const allPages = [...staticPages, ...merchantPages, ...blogPages];

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allPages
  .map(
    (entry) => `
  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join('')}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.send(sitemapXml);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /robots.txt
 * Returns robots.txt allowing public pages and blocking admin/dashboard/API routes.
 */
router.get('/robots.txt', (_req, res) => {
  const robotsTxt = `# DiDwa - didwaghana.com
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

  res.set('Content-Type', 'text/plain');
  res.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.send(robotsTxt);
});

export default router;
