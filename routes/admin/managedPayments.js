import { Router } from 'express';
import { query, withTransaction } from '../../config/database.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import {
  getManagedPaymentPolicy, MANAGED_PAYMENT_SETTING_DEFINITIONS, validateManagedPaymentPolicy,
} from '../../services/managedPaymentSettings.js';
import { requireAdmin, readListQuery, paged, enumFilter, uuidParam } from './helpers.js';

const router = Router();

router.get('/managed-payment-settings', requireAdmin, async (_req, res, next) => {
  try {
    res.json({ settings: await getManagedPaymentPolicy() });
  } catch (err) {
    next(err);
  }
});

router.patch('/managed-payment-settings', requireAdmin, async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason || reason.length > 500) {
      return res.status(400).json({ error: 'A reason of 1–500 characters is required.' });
    }
    const result = validateManagedPaymentPolicy(req.body?.settings);
    if (result.error) return res.status(400).json({ error: result.error });

    const before = await getManagedPaymentPolicy();
    const settings = result.settings;
    const values = {
      enabled: String(settings.enabled),
      feePercent: settings.feePercent.toFixed(2),
      minimumPayoutGhs: settings.minimumPayoutGhs.toFixed(2),
    };
    await withTransaction(async ({ query: txQuery }) => {
      for (const [name, definition] of Object.entries(MANAGED_PAYMENT_SETTING_DEFINITIONS)) {
        await txQuery(
          `INSERT INTO system_settings (setting_key, setting_value, description)
           VALUES ($1, $2, $3)
           ON CONFLICT (setting_key) DO UPDATE
             SET setting_value = EXCLUDED.setting_value,
                 description = EXCLUDED.description,
                 updated_at = NOW()`,
          [definition.key, values[name], definition.description],
        );
      }
    });

    await recordAdminAction(req, {
      action: 'managed_payments.settings',
      targetType: 'system_settings',
      detail: { from: before, to: settings, reason },
    });
    res.json({ settings: await getManagedPaymentPolicy() });
  } catch (err) {
    next(err);
  }
});

router.get('/managed-payouts', requireAdmin, async (req, res, next) => {
  try {
    const plan = readListQuery(req, {
      defaultLimit: 25,
      maxLimit: 100,
      sorts: {
        requested: 'pr.requested_at',
        amount: 'pr.amount_ghs',
        status: 'pr.status',
        store: 's.name',
      },
    });
    const status = enumFilter(req.query.status, ['PENDING', 'PAID', 'REJECTED']);
    const filters = [];
    const params = [];
    if (status) {
      params.push(status.toLowerCase());
      filters.push(`pr.status = $${params.length}`);
    }
    if (plan.search) {
      params.push(plan.search);
      filters.push(`(s.name ILIKE $${params.length} OR pr.momo_number ILIKE $${params.length}
                 OR pr.transfer_reference ILIKE $${params.length})`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const from = 'FROM store_payout_requests pr JOIN stores s ON s.id = pr.store_id';
    const [result, summary] = await Promise.all([
      paged({
        countSql: `SELECT COUNT(*)::int AS total ${from} ${where}`,
        rowsSql: `SELECT pr.id, pr.store_id, s.name AS store_name, s.email AS store_email,
                         pr.amount_ghs, pr.momo_number, pr.momo_network,
                         pr.momo_account_name, pr.status,
                         pr.transfer_reference, pr.admin_note, pr.requested_at, pr.processed_at
                    ${from} ${where}
                   ORDER BY ${plan.orderBy} NULLS LAST
                   LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        params,
        page: plan.page,
        limit: plan.limit,
        offset: plan.offset,
      }),
      query(`SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount_ghs), 0) AS amount_ghs
               FROM store_payout_requests GROUP BY status`),
    ]);
    const counts = Object.fromEntries(summary.rows.map((row) => [row.status, {
      count: row.count,
      amountGhs: Number(row.amount_ghs),
    }]));
    res.json({ ...result, requests: result.rows, summary: counts });
  } catch (err) {
    next(err);
  }
});

router.patch('/managed-payouts/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = uuidParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid payout request id.' });

    const status = String(req.body?.status || '').trim().toLowerCase();
    if (!['paid', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be paid or rejected.' });
    }
    const transferReference = String(req.body?.transferReference || '').trim();
    const note = String(req.body?.note || '').trim();
    if (status === 'paid' && (!transferReference || transferReference.length > 120)) {
      return res.status(400).json({ error: 'Enter the completed transfer reference (maximum 120 characters).' });
    }
    if (status === 'rejected' && !note) {
      return res.status(400).json({ error: 'A reason is required when rejecting a payout.' });
    }
    if (note.length > 500) return res.status(400).json({ error: 'Note must be 500 characters or fewer.' });

    const payout = await withTransaction(async ({ query: txQuery }) => {
      const { rows } = await txQuery(
        `SELECT id, store_id, amount_ghs, status
           FROM store_payout_requests WHERE id = $1 FOR UPDATE`,
        [id],
      );
      const request = rows[0];
      if (!request) return { error: 'Payout request not found.', statusCode: 404 };
      if (request.status !== 'pending') {
        return { error: `This payout request is already ${request.status}.`, statusCode: 409 };
      }

      if (status === 'paid') {
        await txQuery(
          `INSERT INTO store_managed_balances (store_id)
           VALUES ($1) ON CONFLICT (store_id) DO NOTHING`,
          [request.store_id],
        );
        const { rows: balanceRows } = await txQuery(
          `SELECT net_payable_ghs, paid_out_ghs
             FROM store_managed_balances WHERE store_id = $1 FOR UPDATE`,
          [request.store_id],
        );
        const { rows: pendingRows } = await txQuery(
          `SELECT COALESCE(SUM(amount_ghs), 0) AS reserved
             FROM store_payout_requests
            WHERE store_id = $1 AND status = 'pending' AND id <> $2`,
          [request.store_id, request.id],
        );
        const available = Number(balanceRows[0]?.net_payable_ghs || 0)
          - Number(balanceRows[0]?.paid_out_ghs || 0)
          - Number(pendingRows[0]?.reserved || 0);
        if (Number(request.amount_ghs) > available + 0.001) {
          return {
            error: 'The available balance has changed; this payout cannot be marked paid.',
            statusCode: 409,
          };
        }
        await txQuery(
          `UPDATE store_managed_balances
              SET paid_out_ghs = paid_out_ghs + $2, updated_at = NOW()
            WHERE store_id = $1`,
          [request.store_id, request.amount_ghs],
        );
        await txQuery(
          `INSERT INTO store_managed_ledger
             (store_id, entry_type, net_amount_ghs, external_reference)
           VALUES ($1, 'PAYOUT', $2, $3)`,
          [request.store_id, -Number(request.amount_ghs), `payout:${request.id}`],
        );
      }

      const updated = await txQuery(
        `UPDATE store_payout_requests
            SET status = $2, transfer_reference = $3, admin_note = $4,
                processed_at = NOW(), processed_by_admin_id = $5
          WHERE id = $1
          RETURNING id, store_id, amount_ghs, status, transfer_reference, admin_note,
                    requested_at, processed_at`,
        [request.id, status, status === 'paid' ? transferReference : null, note || null, req.auth?.sub || null],
      );
      return { request: updated.rows[0] };
    });

    if (payout.error) return res.status(payout.statusCode).json({ error: payout.error });
    await recordAdminAction(req, {
      action: status === 'paid' ? 'managed_payout.paid' : 'managed_payout.rejected',
      targetType: 'store_payout_request',
      targetId: id,
      detail: {
        storeId: payout.request.store_id,
        amountGhs: Number(payout.request.amount_ghs),
        transferReference: payout.request.transfer_reference,
        note,
      },
    });
    res.json({ request: payout.request });
  } catch (err) {
    next(err);
  }
});

export default router;
