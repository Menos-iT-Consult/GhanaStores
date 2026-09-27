/**
 * DiDwa - Super admin API surface.
 *
 * Mounted at /api/admin by server.js. Split by domain so each file owns one
 * surface, instead of the single all-in-one router this replaces:
 *
 *   auth       sign-in, session, and who else can sign in (team management)
 *   overview   platform KPIs, growth, and the "needs attention" queue
 *   merchants  every tenant: search, drill-in, suspend, plan, balance
 *   orders     every order: search, detail, status, refund/void
 *   catalog    products, variants, stock corrections, restock alerts
 *   customers  every customer across tenants (read-only)
 *   payments   subscription charges and gateway health (read-only)
 *   payouts    merchant withdrawals and the review queue (read-only)
 *   logistics  rider transits (read-only)
 *   domains    domain registry and verification retries
 *   themes     the template catalog and its adoption
 *   system     database health, integration presence, runtime
 *   audit      the append-only ledger of every admin write
 *
 * Every route is requireAdmin, and every write records to admin_audit_log.
 */
import { Router } from 'express';

import authRoutes from './auth.js';
import overviewRoutes from './overview.js';
import merchantRoutes from './merchants.js';
import orderRoutes from './orders.js';
import catalogRoutes from './catalog.js';
import customerRoutes from './customers.js';
import paymentRoutes from './payments.js';
import payoutRoutes from './payouts.js';
import logisticsRoutes from './logistics.js';
import domainRoutes from './domains.js';
import themeRoutes from './themes.js';
import systemRoutes from './system.js';
import auditRoutes from './audit.js';

const router = Router();

router.use(authRoutes);
router.use(overviewRoutes);
router.use(merchantRoutes);
router.use(orderRoutes);
router.use(catalogRoutes);
router.use(customerRoutes);
router.use(paymentRoutes);
router.use(payoutRoutes);
router.use(logisticsRoutes);
router.use(domainRoutes);
router.use(themeRoutes);
router.use(systemRoutes);
router.use(auditRoutes);

/**
 * Legacy alias kept for the pre-split client: PATCH /tenants/:id/status became
 * PATCH /merchants/:id/status. Removed once no deployed client calls it.
 */
router.patch('/tenants/:id/status', (req, res, next) => {
  req.url = `/merchants/${req.params.id}/status`;
  merchantRoutes.handle(req, res, next);
});

export default router;
