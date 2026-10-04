/**
 * DiDwa - Super admin subscription plan catalogue.
 *
 * What each plan costs and what it includes. Every number here is what the
 * public /pricing page advertises and what the seller's upgrade flow charges, so
 * these writes are audited exactly like domain pricing: an operator changing a
 * price is changing what real sellers are billed.
 *
 *   GET   /api/admin/plans          the catalogue (enabled and disabled)
 *   PATCH /api/admin/plans/:id      one plan's prices / copy / flags
 *
 * Disabling a plan takes it off sale but never touches the tenants already on it
 * - the FK from stores.plan means a plan in use cannot be deleted, and this API
 * deliberately has no delete at all.
 */
import { Router } from 'express';
import { query } from '../../config/database.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import { invalidatePlanCache, loadPlanCatalog } from '../../services/planCatalog.js';
import { requireAdmin } from './helpers.js';

const router = Router();

const reasonProblem = (reason) =>
  (String(reason || '').trim() ? null : 'A reason is required for a plan pricing change.');

/** A plan id is a slug and is never interpolated into SQL unvalidated. */
function cleanPlanId(value) {
  const id = String(value || '').trim().toLowerCase();
  return /^[a-z][a-z0-9-]{1,31}$/.test(id) ? id : null;
}

/* -------------------------------- Catalogue ------------------------------- */
router.get('/plans', requireAdmin, async (_req, res, next) => {
  try {
    const { plans } = await loadPlanCatalog({ force: true });
    // How many tenants sit on each plan, so an operator can see the blast radius
    // of a price change or a disable before they make it.
    const { rows } = await query(
      'SELECT plan, COUNT(*)::int AS stores FROM stores GROUP BY plan',
    );
    const storesByPlan = new Map(rows.map((row) => [row.plan, row.stores]));

    res.json({
      currency: 'GHS',
      plans: plans.map((plan) => ({ ...plan, storesOnPlan: storesByPlan.get(plan.id) ?? 0 })),
      summary: {
        total: plans.length,
        enabled: plans.filter((p) => p.isEnabled).length,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ One plan --------------------------------- */
router.patch('/plans/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = cleanPlanId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid plan id.' });
    const problem = reasonProblem(req.body?.reason);
    if (problem) return res.status(400).json({ error: problem });

    const { byId } = await loadPlanCatalog({ force: true });
    const current = byId.get(id);
    if (!current) return res.status(404).json({ error: 'Plan not found.' });

    const updates = [];
    const params = [];
    const detail = { from: {} };

    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name || name.length > 80) {
        return res.status(400).json({ error: 'The plan name must be 1-80 characters.' });
      }
      params.push(name);
      updates.push(`name = $${params.length}`);
      detail.from.name = current.name;
      detail.name = name;
    }

    if (req.body?.tagline !== undefined) {
      const tagline = String(req.body.tagline).trim().slice(0, 160) || null;
      params.push(tagline);
      updates.push(`tagline = $${params.length}`);
      detail.from.tagline = current.tagline;
      detail.tagline = tagline;
    }

    /* Prices are coerced and range-checked here; the client value is never
       trusted and an unparseable number is rejected rather than stored as 0. */
    for (const [field, column] of [['monthlyPriceGhs', 'monthly_price_ghs'], ['yearlyPriceGhs', 'yearly_price_ghs']]) {
      if (req.body?.[field] === undefined) continue;
      const price = Number(req.body[field]);
      if (!Number.isFinite(price) || price < 0 || price > 1_000_000) {
        return res.status(400).json({ error: 'Prices must be a number of GHS between 0 and 1,000,000.' });
      }
      params.push(price);
      updates.push(`${column} = $${params.length}`);
      detail.from[field] = field === 'monthlyPriceGhs' ? current.monthlyPriceGhs : current.yearlyPriceGhs;
      detail[field] = price;
    }

    // A yearly price above 12 monthly payments is a typo that would overcharge
    // every yearly buyer, so the schema CHECK is mirrored with a clear message.
    const monthly = req.body?.monthlyPriceGhs !== undefined ? Number(req.body.monthlyPriceGhs) : current.monthlyPriceGhs;
    const yearly = req.body?.yearlyPriceGhs !== undefined ? Number(req.body.yearlyPriceGhs) : current.yearlyPriceGhs;
    if (Number.isFinite(monthly) && Number.isFinite(yearly) && yearly > monthly * 12) {
      return res.status(400).json({ error: 'The yearly price cannot be more than 12 months of the monthly price.' });
    }

    if (req.body?.maxProducts !== undefined) {
      const max = Number.parseInt(req.body.maxProducts, 10);
      if (!Number.isFinite(max) || max < 0 || max > 10_000_000) {
        return res.status(400).json({ error: 'The product limit must be a whole number of 0 or more.' });
      }
      params.push(max);
      updates.push(`max_products = $${params.length}`);
      detail.from.maxProducts = current.maxProducts;
      detail.maxProducts = max;
    }

    // Free platform SMS segments per period. 0 is legal and meaningful: it
    // means "no free allowance", not "no platform SMS" - a Starter store may
    // still buy prepaid segments (see services/smsQuota.js).
    if (req.body?.smsMonthlySegments !== undefined) {
      const segments = Number.parseInt(req.body.smsMonthlySegments, 10);
      if (!Number.isFinite(segments) || segments < 0 || segments > 1_000_000) {
        return res.status(400).json({ error: 'The SMS allowance must be a whole number of segments between 0 and 1,000,000.' });
      }
      params.push(segments);
      updates.push(`sms_monthly_segments = $${params.length}`);
      detail.from.smsMonthlySegments = current.smsMonthlySegments;
      detail.smsMonthlySegments = segments;
    }

    if (req.body?.features !== undefined) {
      if (!Array.isArray(req.body.features)) {
        return res.status(400).json({ error: 'Features must be a list of strings.' });
      }
      const features = req.body.features
        .map((line) => String(line).trim().slice(0, 120))
        .filter(Boolean)
        .slice(0, 24);
      params.push(features);
      updates.push(`features = $${params.length}`);
      detail.from.features = current.features;
      detail.features = features;
    }

    if (req.body?.isEnabled !== undefined) {
      params.push(Boolean(req.body.isEnabled));
      updates.push(`is_enabled = $${params.length}`);
      detail.from.isEnabled = current.isEnabled;
      detail.isEnabled = Boolean(req.body.isEnabled);
    }

    if (req.body?.sortOrder !== undefined) {
      const order = Number.parseInt(req.body.sortOrder, 10);
      if (!Number.isFinite(order) || order < 0 || order > 99999) {
        return res.status(400).json({ error: 'Sort order must be a whole number.' });
      }
      params.push(order);
      updates.push(`sort_order = $${params.length}`);
      detail.from.sortOrder = current.sortOrder;
      detail.sortOrder = order;
    }

    if (!updates.length) return res.status(400).json({ error: 'Nothing to update.' });

    params.push(id);
    const { rows } = await query(
      `UPDATE plans SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${params.length} RETURNING *`,
      params,
    );
    invalidatePlanCache();

    detail.reason = String(req.body.reason).trim().slice(0, 500);
    await recordAdminAction(req, { action: 'plan.price', targetType: 'plans', targetId: id, detail });

    const { rows: count } = await query('SELECT COUNT(*)::int AS n FROM stores WHERE plan = $1', [id]);
    const plan = rows[0];
    res.json({
      plan: {
        id: plan.id,
        name: plan.name,
        tagline: plan.tagline,
        monthlyPriceGhs: Number(plan.monthly_price_ghs),
        yearlyPriceGhs: Number(plan.yearly_price_ghs),
        features: plan.features,
        maxProducts: Number(plan.max_products),
        isEnabled: Boolean(plan.is_enabled),
        sortOrder: Number(plan.sort_order),
        updatedAt: plan.updated_at,
        storesOnPlan: count[0]?.n ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

