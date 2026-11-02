import { Router } from 'express';
import { requireSeller } from '../middleware/authMiddleware.js';
import { getManagedPayoutSummary, requestManagedPayout } from '../services/managedPayoutService.js';

const router = Router();

router.get('/seller/payouts', requireSeller, async (req, res, next) => {
  try {
    res.json(await getManagedPayoutSummary(req.auth.sub));
  } catch (err) {
    next(err);
  }
});

router.post('/seller/payouts', requireSeller, async (req, res, next) => {
  try {
    const result = await requestManagedPayout(req.auth.sub, req.body?.amountGhs);
    if (result.error) return res.status(result.statusCode).json({ error: result.error });
    res.status(201).json({
      request: result.request,
      availableGhs: result.availableGhs,
      message: 'Payout request submitted for manual review.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
