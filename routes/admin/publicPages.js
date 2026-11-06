import { Router } from 'express';
import { withTransaction } from '../../config/database.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import {
  PUBLIC_PAGE_SLUGS,
  getPublicPageEditorState,
  savePublicPageContent,
  validatePublicPageContent,
} from '../../services/publicPageContent.js';
import { requireAdmin } from './helpers.js';

const router = Router();

function pageSlug(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'home') return '/';
  return `/${raw.replace(/^\/+/, '').replace(/\/$/, '')}`;
}

router.get('/public-pages', requireAdmin, async (_req, res, next) => {
  try {
    const pages = [];
    for (const slug of PUBLIC_PAGE_SLUGS) {
      pages.push({ slug, ...(await getPublicPageEditorState(slug)) });
    }
    res.json({ pages });
  } catch (err) { next(err); }
});

router.get('/public-pages/:slug(*)', requireAdmin, async (req, res, next) => {
  try {
    const slug = pageSlug(req.params.slug);
    if (!PUBLIC_PAGE_SLUGS.includes(slug)) return res.status(404).json({ error: 'Public page not found.' });
    res.json({ slug, ...(await getPublicPageEditorState(slug)) });
  } catch (err) { next(err); }
});

router.put('/public-pages/:slug(*)', requireAdmin, async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'A reason is required for public page changes.' });
    const publish = req.body?.publish === true;
    const slug = pageSlug(req.params.slug);
    const result = validatePublicPageContent(slug, req.body?.content);
    if (result.error) return res.status(400).json({ error: result.error });
    const before = await getPublicPageEditorState(slug);
    await withTransaction(async ({ query: txQuery }) => {
      await savePublicPageContent(slug, req.body.content, 'draft', txQuery);
      if (publish) await savePublicPageContent(slug, req.body.content, 'published', txQuery);
    });
    await recordAdminAction(req, {
      action: publish ? 'public_pages.publish' : 'public_pages.draft',
      targetType: 'system_settings',
      detail: { slug, from: before, to: result.content, reason },
    });
    res.json({ slug, ...(await getPublicPageEditorState(slug)) });
  } catch (err) { next(err); }
});

export default router;
