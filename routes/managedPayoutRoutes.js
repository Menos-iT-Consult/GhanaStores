import { Router } from 'express';
import { requireSeller } from '../middleware/authMiddleware.js';
import { query, withTransaction } from '../config/database.js';
import { normalizeGhPhone } from '../utils/helpers.js';
import { getManagedPaymentPolicy } from '../services/managedPaymentSettings.js';
import { roundGhs } from '../services/managedPaymentSettings.js';

const router = Router();

function availableBalance({ net_payable_ghs = 0, paid_out_ghs = 0, pending_ghs = 0 }) {
  return Math.max(0, roundGhs(
    Number(net_payable_ghs) - Number(paid_out_ghs) - Number(pending_ghs),
  ));
}

router.get('/seller/payouts', requireSeller, async (req, res, next) => {
  try {
    const storeId = req.auth.sub;
    const [balanceResult, requestsResult, ledgerResult, policy, storeResult] = await Promise.all([
      query(
        `SELECT COALESCE(b.total_sales_ghs, 0) AS total_sales_ghs,
                COALESCE(b.platform_fees_ghs, 0) AS platform_fees_ghs,
                COALESCE(b.net_payable_ghs, 0) AS net_payable_ghs,
                COALESCE(b.paid_out_ghs, 0) AS paid_out_ghs,
                COALESCE((SELECT SUM(amount_ghs) FROM store_payout_requests
                           WHERE store_id = $1 AND status = 'pending'), 0) AS pending_ghs
           FROM stores s
           LEFT JOIN store_managed_balances b ON b.store_id = s.id
          WHERE s.id = $1`,
        [storeId],
      ),
      query(
        `SELECT id, amount_ghs, momo_number, momo_network, status, transfer_reference,
                admin_note, requested_at, processed_at
           FROM store_payout_requests
          WHERE store_id = $1
          ORDER BY requested_at DESC
          LIMIT 100`,
        [storeId],
      ),
      query(
        `SELECT l.id, l.entry_type, l.gross_amount_ghs, l.platform_fee_ghs,
                l.net_amount_ghs, l.external_reference, l.created_at,
                o.order_number
           FROM store_managed_ledger l
           LEFT JOIN orders o ON o.id = l.order_id
          WHERE l.store_id = $1
          ORDER BY l.created_at DESC
          LIMIT 100`,
        [storeId],
      ),
      getManagedPaymentPolicy(),
      query(
        `SELECT use_managed_payments, payout_momo_number, payout_momo_network
           FROM stores WHERE id = $1`,
        [storeId],
      ),
    ]);
    const balance = balanceResult.rows[0] || {};
    const store = storeResult.rows[0] || {};
    res.json({
      balance: {
        totalSalesGhs: Number(balance.total_sales_ghs || 0),
        platformFeesGhs: Number(balance.platform_fees_ghs || 0),
        netPayableGhs: Number(balance.net_payable_ghs || 0),
        paidOutGhs: Number(balance.paid_out_ghs || 0),
        pendingPayoutGhs: Number(balance.pending_ghs || 0),
        availableGhs: availableBalance(balance),
      },
      requests: requestsResult.rows,
      ledger: ledgerResult.rows,
      payout: {
        minimumGhs: policy.minimumPayoutGhs,
        momoNumber: store.payout_momo_number || '',
        momoNetwork: store.payout_momo_network || '',
        managedMode: store.use_managed_payments !== false,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/seller/payouts', requireSeller, async (req, res, next) => {
  try {
    const amount = Number(req.body?.amountGhs);
    if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) {
      return res.status(400).json({ error: 'Enter a payout amount in GHS with up to two decimal places.' });
    }
    const policy = await getManagedPaymentPolicy();
    if (amount < policy.minimumPayoutGhs) {
      return res.status(400).json({ error: `The minimum payout request is GHS ${policy.minimumPayoutGhs.toFixed(2)}.` });
    }

    const result = await withTransaction(async ({ query: txQuery }) => {
      const { rows: stores } = await txQuery(
        `SELECT use_managed_payments, payout_momo_number, payout_momo_network
           FROM stores WHERE id = $1 FOR UPDATE`,
        [req.auth.sub],
      );
      const store = stores[0];
      if (!store) return { error: 'Store not found.', statusCode: 404 };
      if (store.use_managed_payments === false) {
        return { error: 'Switch to DiDwa Managed Payments before requesting a managed payout.', statusCode: 409 };
      }
      if (!normalizeGhPhone(store.payout_momo_number) || !store.payout_momo_network) {
        return { error: 'Save a valid Mobile Money payout destination in Payment Settings first.', statusCode: 409 };
      }

      await txQuery(
        `INSERT INTO store_managed_balances (store_id)
         VALUES ($1) ON CONFLICT (store_id) DO NOTHING`,
        [req.auth.sub],
      );
      const { rows: balances } = await txQuery(
        `SELECT total_sales_ghs, platform_fees_ghs, net_payable_ghs, paid_out_ghs
           FROM store_managed_balances WHERE store_id = $1 FOR UPDATE`,
        [req.auth.sub],
      );
      const balance = balances[0];
      const { rows: pending } = await txQuery(
        `SELECT COALESCE(SUM(amount_ghs), 0) AS amount
           FROM store_payout_requests WHERE store_id = $1 AND status = 'pending'`,
        [req.auth.sub],
      );
      const availableGhs = availableBalance({
        ...balance,
        pending_ghs: pending[0]?.amount || 0,
      });
      if (amount > availableGhs) {
        return { error: 'The requested payout exceeds your available balance.', statusCode: 409 };
      }

      const { rows: requests } = await txQuery(
        `INSERT INTO store_payout_requests
           (store_id, amount_ghs, momo_number, momo_network)
         VALUES ($1, $2, $3, $4)
         RETURNING id, amount_ghs, momo_number, momo_network, status, requested_at`,
        [req.auth.sub, roundGhs(amount), store.payout_momo_number, store.payout_momo_network],
      );
      return { request: requests[0], availableGhs: roundGhs(availableGhs - amount) };
    });

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
