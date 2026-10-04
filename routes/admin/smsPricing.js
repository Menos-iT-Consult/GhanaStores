/**
 * DiDwa - Super admin pricing for prepaid platform SMS.
 *
 *   GET   /api/admin/sms-pricing   the single-row settings + volume summary
 *   PATCH /api/admin/sms-pricing   price per segment, minimum, kill switch
 *
 * Modelled directly on routes/admin/pricing.js (domain pricing): the number set
 * here is what a real merchant is charged by POST /api/billing's sibling
 * /api/sms-packs/buy, so every edit asks for a reason and lands in the audit log.
 *
 * There is deliberately NO seeded default price. The row ships with
 * price_per_segment NULL and purchases disabled, and resolveSegmentOffer fails
 * closed while it is unset. A hard-coded default would silently become a real
 * charged price that nobody deliberately chose - see sms_settings in
 * db/schema.sql.
 */
import { Router } from 'express';
import { query, withTransaction } from '../../config/database.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import { getSmsSettings } from '../../services/smsQuota.js';
import { requireAdmin } from './helpers.js';

const router = Router();

const reasonProblem = (reason) =>
  (String(reason || '').trim() ? null : 'A reason is required for an SMS pricing change.');

/* --------------------------------- Read ----------------------------------- */

// Injected dependencies. Defaults to the real implementations, so production
// behaves identically, but a test can swap `deps.query` to drive the REAL
// handler against fake rows. The alternative - patching the exported `query`
// on config/database.js - is impossible, because an ES module namespace is
// frozen and `Object.defineProperty` throws "Cannot redefine property".
const deps = { query, withTransaction, getSmsSettings };

// Split from the route so the tests can execute the REAL logic against a
// stubbed database. An earlier version of this file was verified by
// re-implementing its queries inside the test script, and that passed while
// this handler was throwing a 500 on every request: a copy proves nothing about
// the code that ships.
async function pricingPayload() {
  const { query: runQuery, getSmsSettings: readSettings } = deps;

  // THREE promises, so destructure three names. This previously bound only
  // [settings, volume], which made `volume` the first query's RESULT OBJECT
  // rather than an array of results - so `volume[1]` was undefined and the
  // `.rows` read threw a 500 on every load. Named bindings, one per promise,
  // so a count or order mistake is impossible to miss here.
  const [settings, liability, payments] = await Promise.all([
    readSettings(),
    // How much prepaid liability is outstanding. Prepaid segments carry over
    // forever, so this total never fully drains - it is the number to watch if
    // the mNotify wholesale price ever rises.
    // Aliases are QUOTED on purpose: pg lowercases an unquoted identifier, so
    // `AS storesWithBalance` arrives as `storeswithbalance` and any other
    // spelling read here yields undefined. Quoting pins the exact key.
    runQuery(
      `SELECT COALESCE(SUM(segments), 0)::int AS outstanding,
              COUNT(*) FILTER (WHERE segments > 0)::int AS "storesWithBalance"
         FROM store_sms_balance`,
    ),
    runQuery(
      `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(segments), 0)::int AS segments
         FROM sms_pack_payments GROUP BY status`,
    ),
  ]);
  const byStatus = Object.fromEntries(payments.rows.map((r) => [r.status, r]));

  return {
    settings,
    volume: {
      outstanding: liability.rows[0]?.outstanding ?? 0,
      storesWithBalance: liability.rows[0]?.storesWithBalance ?? 0,
      payments: {
        pending: byStatus.PENDING?.count ?? 0,
        paid: byStatus.PAID?.count ?? 0,
        failed: byStatus.FAILED?.count ?? 0,
      },
      segmentsSold: byStatus.PAID?.segments ?? 0,
    },
  };
}

router.get('/sms-pricing', requireAdmin, async (_req, res, next) => {
  try {
    res.json(await pricingPayload());
  } catch (err) { next(err); }
});

/* ------------------------------- Test seam -------------------------------- */
// Exported so the suite can run the REAL payload builder against a stubbed
// database, rather than a re-implementation of it in the test script.
export const __payloadForTests = pricingPayload;
// The dependency seam the test swaps. Kept next to the payload builder so the
// two are obviously a pair.
export const __depsForTests = deps;

/* --------------------------------- Write ---------------------------------- */

router.patch('/sms-pricing', requireAdmin, async (req, res, next) => {
  try {
    const problem = reasonProblem(req.body?.reason);
    if (problem) return res.status(400).json({ error: problem });

    const before = await getSmsSettings();
    const updates = [];
    const params = [];
    const detail = { from: {} };

    // null is a real, meaningful value: "unset the price", which closes purchases.
    if (req.body?.pricePerSegment !== undefined) {
      const raw = req.body.pricePerSegment;
      if (raw === null || raw === '') {
        params.push(null);
        detail.from.pricePerSegment = before.pricePerSegment;
        detail.pricePerSegment = null;
      } else {
        const price = Number(raw);
        // Six decimals, matching NUMERIC(10,6): a per-segment price in pesewas
        // is small, and a 2dp column would round a real price to zero.
        if (!Number.isFinite(price) || price <= 0 || price > 1000) {
          return res.status(400).json({ error: 'The price per segment must be greater than 0 and at most GHS 1,000. Leave it empty to close purchases.' });
        }
        params.push(price);
        detail.from.pricePerSegment = before.pricePerSegment;
        detail.pricePerSegment = price;
      }
      updates.push(`price_per_segment = $${params.length}`);
    }

    if (req.body?.minPurchase !== undefined) {
      const min = Number.parseInt(req.body.minPurchase, 10);
      if (!Number.isFinite(min) || min < 1 || min > 1_000_000) {
        return res.status(400).json({ error: 'The minimum purchase must be a whole number of segments between 1 and 1,000,000.' });
      }
      params.push(min);
      updates.push(`min_purchase = $${params.length}`);
      detail.from.minPurchase = before.minPurchase;
      detail.minPurchase = min;
    }

    if (req.body?.isPurchasesEnabled !== undefined) {
      params.push(Boolean(req.body.isPurchasesEnabled));
      updates.push(`is_purchases_enabled = $${params.length}`);
      detail.from.isPurchasesEnabled = before.isPurchasesEnabled;
      detail.isPurchasesEnabled = Boolean(req.body.isPurchasesEnabled);
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'Nothing to change.' });
    }

    updates.push('updated_at = NOW()');
    // The row ships with id = 1 and may not exist yet on a fresh database.
    await withTransaction(async (t) => {
      await t.query('INSERT INTO sms_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING');
      await t.query(`UPDATE sms_settings SET ${updates.join(', ')} WHERE id = 1`, params);
    });

    await recordAdminAction(req, {
      action: 'sms_pricing.update',
      targetType: 'sms_settings',
      targetId: '1',
      detail,
    });
    res.json({ settings: await getSmsSettings() });
  } catch (err) { next(err); }
});

export default router;