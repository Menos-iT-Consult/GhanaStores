import { Router } from 'express';
import { createAiSupportNotice } from '../config/didwaAiActions.js';
import { requireSeller } from '../middleware/authMiddleware.js';
import { executeAiAction, listAiProducts, validateAiActionRequest } from '../services/didwaAiService.js';
import { getPlatformPublicSettings } from '../services/platformPublicSettings.js';

const router = Router();

export function aiSellerAccessError(auth, store) {
  if (auth?.role !== 'SELLER') return { statusCode: 403, error: 'Seller access required.' };
  if (store?.status === 'SUSPENDED') {
    return { statusCode: 403, error: 'Suspended stores cannot use DiDwa AI.' };
  }
  return null;
}

export function requireAiSeller(req, res, next) {
  requireSeller(req, res, (err) => {
    if (err) return next(err);
    const accessError = aiSellerAccessError(req.auth, req.store);
    if (accessError) return res.status(accessError.statusCode).json({ error: accessError.error });
    return next();
  });
}

async function supportNotice() {
  const settings = await getPlatformPublicSettings();
  return createAiSupportNotice(settings.contact);
}

router.get('/products', requireAiSeller, async (req, res, next) => {
  try {
    res.json({ products: await listAiProducts(req.store.id) });
  } catch (err) {
    next(err);
  }
});

router.post('/gateway', requireAiSeller, async (req, res, next) => {
  try {
    const validated = validateAiActionRequest(req.body);
    if (validated.error) return res.status(400).json({ error: await supportNotice() });

    const outcome = await executeAiAction(validated.action, validated.payload, req.store);
    if (outcome.error) {
      const error = outcome.supportFallback ? await supportNotice() : outcome.error;
      return res.status(outcome.statusCode || 400).json({ error });
    }
    return res.json({ action: validated.action, result: outcome.result });
  } catch (err) {
    next(err);
  }
});

export default router;
