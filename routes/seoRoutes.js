// routes/seoRoutes.js
// DiDwa - SEO Routes
// Handles sitemap.xml and robots.txt at root level

import { Router } from 'express';
const router = Router();

// Sitemap.xml
router.get('/sitemap.xml', (_req, res) => {
  res.type('xml').send('<urlset xmlns="http://www.sitemaps.org/sitemap/0.9"/><url><loc>https://didwaghana.com</loc></url></urlset>');
});

// robots.txt
router.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(`User-agent: *
Allow: /
Sitemap: https://didwaghana.com/sitemap.xml`);
});

export default router;