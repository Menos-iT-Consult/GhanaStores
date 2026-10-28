import { Router } from 'express';
import { getPlatformPublicSettings } from '../services/platformPublicSettings.js';

const router = Router();

router.get('/platform-settings/public', async (_req, res, next) => {
  try {
    res.json({ settings: await getPlatformPublicSettings() });
  } catch (err) {
    next(err);
  }
});

export default router;
