/**
 * DiDwa - prepaid platform SMS segments.
 *
 *   GET  /api/sms-packs        -> price, minimum and the store's balance
 *   POST /api/sms-packs/buy    -> charge MoMo, credit segments
 *
 * Platform SMS is metered (services/smsQuota.js). When a store's plan allowance
 * runs out they can buy more, rather than DiDwa absorbing unbounded cost.
 *
 * This deliberately mirrors POST /api/billing/subscribe rather than inventing a
 * second pattern, because it moves the same money the same way:
 *
 *  - DiDwa holds no store balance (see services/storePayments.js). Every purchase
 *    is an immediate 2-way MoMo collection to the merchant's OWN number, never a
 *    stored credit that is debited later.
 *  - The PRICE is resolved on the server from sms_settings. An amount sent by the
 *    browser is ignored outright, so this endpoint cannot be used to buy 10,000
 *    segments for one pesewa.
 *  - A PENDING payment row is written BEFORE the gateway call, so a crash
 *    mid-collection leaves an auditable row. Segments are credited ONLY after a
 *    confirmed charge - there is no path to a balance with no payment behind it.
 *  - Idempotency: a client-supplied key means a retried tap cannot double-charge
 *    AND cannot double-credit segments. This matters more here than for a
 *    subscription, because a duplicate would silently hand out real paid value.
 */
import { Router } from 'express';
import { pool, query, withTransaction } from '../config/database.js';
import { requireSeller } from '../middleware/authMiddleware.js';
import { routeCollection } from '../services/paymentRouter.js';
import { normalizeGhPhone } from '../utils/phone.js';
import {
  creditPurchase,
  getQuota,
  getSmsSettings,
  resolveSegmentOffer,
} from '../services/smsQuota.js';

const router = Router();

/* ------------------------------ Price + balance --------------------------- */

router.get('/', requireSeller, async (req, res, next) => {
  try {
    const [settings, quota] = await Promise.all([
      getSmsSettings(),
      getQuota(req.store.id),
    ]);
    res.json({
      settings,
      quota,
      // Whether the buy form should be usable at all. pricePerSegment ships
      // NULL, so this is false until an admin has set a real price.
      canPurchase: settings.isPurchasesEnabled && settings.pricePerSegment != null,
    });
  } catch (err) { next(err); }
});
/* --------------------------------- Buy ------------------------------------ */

router.post('/buy', requireSeller, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const network = String(req.body?.network || 'MTN').toUpperCase();
    const momoNumber = normalizeGhPhone(req.body?.momoNumber || req.body?.destination);

    if (!['MTN', 'VODAFONE', 'AT'].includes(network)) {
      client.release();
      return res.status(400).json({ error: 'Network must be MTN, VODAFONE (Telecel) or AT.' });
    }
    if (!momoNumber) {
      client.release();
      return res.status(400).json({ error: 'Enter the MoMo number the segments should be paid from.' });
    }

    // Idempotency: a replayed key returns the ORIGINAL outcome instead of
    // charging - and crediting - a second time.
    const reference = `GS-SMS-${req.body?.idempotencyKey
      || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;

    const replay = await query(
      `SELECT status, segments, amount, gateway_reference, failure_reason
         FROM sms_pack_payments WHERE reference = $1`,
      [reference],
    );
    if (replay.rows[0]) {
      client.release();
      const prior = replay.rows[0];
      if (prior.status === 'PAID') {
        return res.json({
          message: `This payment was already approved - ${prior.segments} segments were added.`,
          replayed: true,
          payment: prior,
          quota: await getQuota(req.store.id),
        });
      }
      return res.status(prior.status === 'FAILED' ? 402 : 409).json({
        error: prior.failure_reason || 'A payment for this request is still in progress.',
        replayed: true,
        payment: prior,
      });
    }

    // Price and minimum resolved HERE, on the server.
    const offer = await resolveSegmentOffer(req.body?.segments);
    if (!offer.ok) {
      client.release();
      return res.status(400).json({ error: offer.error });
    }

    await client.query('BEGIN');
    const lock = await client.query(
      'SELECT id, status FROM stores WHERE id = $1 FOR UPDATE',
      [req.store.id],
    );
    const store = lock.rows[0];
    if (!store) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Store not found.' });
    }
    if (store.status === 'SUSPENDED') {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: 'Suspended accounts must contact support first.' });
    }
    await client.query('COMMIT');
    client.release();

    // Auditable PENDING row BEFORE the gateway call, so a crash mid-collection
    // leaves evidence rather than a silent loss.
    const attempt = await query(
      `INSERT INTO sms_pack_payments
          (store_id, segments, amount, momo_number, network, provider, reference, price_per_segment, status)
       VALUES ($1,$2,$3,$4,$5,'PENDING',$6,$7,'PENDING')
       RETURNING id`,
      [req.store.id, offer.segments, offer.amountGhs, momoNumber, network, reference, offer.pricePerSegment],
    );
    const attemptId = attempt.rows[0].id;

    const collected = await routeCollection({
      customerMsisdn: momoNumber,
      amount: offer.amountGhs,
      network,
      description: `DiDwa SMS ${offer.segments} segments - ${reference}`,
      clientReference: reference,
    });

    if (!collected.success) {
      await query(
        `UPDATE sms_pack_payments
            SET status = 'FAILED', provider = $2, failure_reason = $3
          WHERE id = $1`,
        [attemptId, collected.provider || 'HUBTEL', (collected.message || 'Collection declined').slice(0, 300)],
      );
      return res.status(402).json({
        error: collected.message || 'MoMo payment was not approved. No segments were added.',
        provider: collected.provider || 'HUBTEL',
      });
    }

    // Payment confirmed: close the row and credit the segments together, so a
    // crash between them cannot leave a paid row with no balance or a balance
    // with no paid row behind it.
    const credited = await withTransaction(async (t) => {
      await t.query(
        `UPDATE sms_pack_payments
            SET status = 'PAID', provider = $2, gateway_reference = $3, paid_at = NOW()
          WHERE id = $1`,
        [attemptId, collected.provider || 'HUBTEL', collected.reference || reference],
      );
      return creditPurchase(req.store.id, offer.segments, t);
    });

    res.json({
      message: `${offer.segments} segments added for GHS ${offer.amountGhs.toFixed(2)} via `
        + `${collected.provider || 'HUBTEL'}. They carry over until used.`,
      provider: collected.provider || 'HUBTEL',
      segments: offer.segments,
      amountGhs: offer.amountGhs,
      purchased: credited.purchased,
      quota: await getQuota(req.store.id),
      dryRun: Boolean(collected.dryRun),
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* noop */ }
    try { client.release(); } catch { /* noop */ }
    next(err);
  }
});

export default router;