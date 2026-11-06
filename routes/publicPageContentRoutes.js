import { Router } from 'express';
import { getPublicPageContent, PUBLIC_PAGE_SLUGS } from '../services/publicPageContent.js';

const router = Router();

router.get('/public-pages/:slug(*)', async (req, res, next) => {
  try {
    const raw = String(req.params.slug || '').trim();
    const slug = !raw || raw === 'home' ? '/' : `/${raw.replace(/^\/+/, '').replace(/\/$/, '')}`;
    if (!PUBLIC_PAGE_SLUGS.includes(slug)) return res.status(404).json({ error: 'Public page not found.' });
    res.json({ slug, content: await getPublicPageContent(slug) });
  } catch (err) {
    next(err);
  }
});

export default router;
