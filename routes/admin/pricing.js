/**
 * DiDwa - Super admin domain pricing.
 *
 * The platform's domain catalogue: which TLDs are offered, whether each is
 * searched by default, and what a seller pays. Everything here writes the
 * numbers that checkout later charges, so every change is audited.
 *
 *   GET   /api/admin/domain-pricing         the catalogue + global switches
 *   PATCH /api/admin/domain-pricing         the switches (include all TLDs, default markup)
 *   PATCH /api/admin/domain-pricing/:tld    one TLD's price / flags
 *   POST  /api/admin/domain-pricing/bulk    apply a markup to many TLDs at once
 */
import { Router } from 'express';
import { query } from '../../config/database.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import { invalidatePricingCache, resolveDomainPrice } from '../../services/domainPricing.js';
import { requireAdmin } from './helpers.js';

const router = Router();

/** TLDs are stored bare: 'com', 'co.za'. A leading dot is accepted and stripped. */
function cleanTld(value) {
  const tld = String(value || '').trim().toLowerCase().replace(/^\.+/, '').replace(/[^a-z0-9.-]/g, '');
  if (!tld || tld.length > 32 || tld.includes('..')) return null;
  return tld;
}

const priceOut = (row, defaultMarkupPct) => ({
  tld: row.tld,
  label: row.label,
  wholesaleGhs: row.wholesale_ghs,
  markupPct: Number(row.markup_pct),
  retailGhs: row.retail_ghs,
  isEnabled: row.is_enabled,
  isCurated: row.is_curated,
  sortOrder: row.sort_order,
  // What a seller pays right now, given the cheapest known cost source.
  effectiveGhs: resolveDomainPrice(row, undefined, defaultMarkupPct),
  updatedAt: row.updated_at,
});

/* --------------------------------- Catalogue ------------------------------- */
router.get('/domain-pricing', requireAdmin, async (_req, res, next) => {
  try {
    const [rows, settings] = await Promise.all([
      query('SELECT * FROM domain_pricing ORDER BY sort_order, tld'),
      query('SELECT include_all_tlds, default_markup_pct, updated_at FROM domain_settings WHERE id = 1'),
    ]);
    const setting = settings.rows[0] || { include_all_tlds: false, default_markup_pct: 25 };
    const defaultMarkupPct = Number(setting.default_markup_pct);

    const tlds = rows.rows.map((row) => priceOut(row, defaultMarkupPct));
    res.json({
      settings: {
        includeAllTlds: Boolean(setting.include_all_tlds),
        defaultMarkupPct,
        updatedAt: setting.updated_at,
      },
      summary: {
        total: tlds.length,
        enabled: tlds.filter((t) => t.isEnabled).length,
        curated: tlds.filter((t) => t.isCurated && t.isEnabled).length,
        offered: setting.include_all_tlds
          ? tlds.filter((t) => t.isEnabled).length
          : tlds.filter((t) => t.isCurated && t.isEnabled).length,
        fixedPrice: tlds.filter((t) => t.retailGhs !== null).length,
      },
      tlds,
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ Global switches --------------------------- */
router.patch('/domain-pricing', requireAdmin, async (req, res, next) => {
  try {
    const updates = [];
    const params = [];
    const detail = {};

    if (req.body?.includeAllTlds !== undefined) {
      params.push(Boolean(req.body.includeAllTlds));
      updates.push(`include_all_tlds = $${params.length}`);
      detail.includeAllTlds = Boolean(req.body.includeAllTlds);
    }
    if (req.body?.defaultMarkupPct !== undefined) {
      const pct = Number(req.body.defaultMarkupPct);
      if (!Number.isFinite(pct) || pct < 0 || pct > 1000) {
        return res.status(400).json({ error: 'The default markup must be between 0 and 1000 percent.' });
      }
      params.push(pct);
      updates.push(`default_markup_pct = $${params.length}`);
      detail.defaultMarkupPct = pct;
    }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update.' });

    params.push(new Date().toISOString());
    await query(
      `UPDATE domain_settings SET ${updates.join(', ')}, updated_at = $${params.length} WHERE id = 1`,
      params,
    );
    invalidatePricingCache();

    await recordAdminAction(req, {
      action: 'domain.settings',
      targetType: 'domain_settings',
      targetId: '1',
      detail,
    });
    res.json({ updated: detail });
  } catch (err) {
    next(err);
  }
});

/** A markup change is a price change, so a reason is required, as elsewhere. */
function reasonProblem(reason) {
  if (!String(reason || '').trim()) return 'A reason is required for a domain pricing change.';
  return null;
}

/* ------------------------------ One TLD's price --------------------------- */
router.patch('/domain-pricing/:tld', requireAdmin, async (req, res, next) => {
  try {
    const tld = cleanTld(req.params.tld);
    if (!tld) return res.status(400).json({ error: 'Invalid TLD.' });
    const problem = reasonProblem(req.body?.reason);
    if (problem) return res.status(400).json({ error: problem });

    const { rows: before } = await query('SELECT * FROM domain_pricing WHERE tld = $1 LIMIT 1', [tld]);
    if (!before[0]) return res.status(404).json({ error: 'That TLD is not in the catalogue.' });
    const was = before[0];

    const updates = [];
    const params = [];
    const detail = { tld, from: {} };

    if (req.body?.isEnabled !== undefined) {
      params.push(Boolean(req.body.isEnabled));
      updates.push(`is_enabled = $${params.length}`);
      detail.from.isEnabled = was.is_enabled;
      detail.isEnabled = Boolean(req.body.isEnabled);
    }
    if (req.body?.isCurated !== undefined) {
      params.push(Boolean(req.body.isCurated));
      updates.push(`is_curated = $${params.length}`);
      detail.from.isCurated = was.is_curated;
      detail.isCurated = Boolean(req.body.isCurated);
    }
    if (req.body?.label !== undefined) {
      const label = String(req.body.label || '').trim().slice(0, 80) || null;
      params.push(label);
      updates.push(`label = $${params.length}`);
      detail.from.label = was.label;
      detail.label = label;
    }
    if (req.body?.wholesaleGhs !== undefined) {
      const value = req.body.wholesaleGhs === null ? null : Number(req.body.wholesaleGhs);
      if (value !== null && (!Number.isFinite(value) || value < 0)) {
        return res.status(400).json({ error: 'The wholesale cost must be a positive amount, or blank.' });
      }
      params.push(value);
      updates.push(`wholesale_ghs = $${params.length}`);
      detail.from.wholesaleGhs = was.wholesale_ghs;
      detail.wholesaleGhs = value;
    }
    if (req.body?.retailGhs !== undefined) {
      const value = req.body.retailGhs === null ? null : Number(req.body.retailGhs);
      if (value !== null && (!Number.isFinite(value) || value <= 0)) {
        return res.status(400).json({ error: 'A fixed price must be greater than zero, or blank for cost + markup.' });
      }
      params.push(value);
      updates.push(`retail_ghs = $${params.length}`);
      detail.from.retailGhs = was.retail_ghs;
      detail.retailGhs = value;
    }
    if (req.body?.markupPct !== undefined) {
      const pct = Number(req.body.markupPct);
      if (!Number.isFinite(pct) || pct < 0 || pct > 1000) {
        return res.status(400).json({ error: 'The markup must be between 0 and 1000 percent.' });
      }
      params.push(pct);
      updates.push(`markup_pct = $${params.length}`);
      detail.from.markupPct = Number(was.markup_pct);
      detail.markupPct = pct;
    }
    if (req.body?.sortOrder !== undefined) {
      const order = Number.parseInt(req.body.sortOrder, 10);
      if (!Number.isFinite(order) || order < 0 || order > 99999) {
        return res.status(400).json({ error: 'Sort order must be a whole number.' });
      }
      params.push(order);
      updates.push(`sort_order = $${params.length}`);
      detail.from.sortOrder = was.sort_order;
      detail.sortOrder = order;
    }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update.' });

    params.push(tld);
    const { rows } = await query(
      `UPDATE domain_pricing SET ${updates.join(', ')}, updated_at = NOW()
        WHERE tld = $${params.length} RETURNING *`,
      params,
    );
    invalidatePricingCache();

    detail.reason = String(req.body.reason).trim().slice(0, 500);
    await recordAdminAction(req, {
      action: 'domain.price',
      targetType: 'domain_pricing',
      targetId: tld,
      detail,
    });

    const { rows: settingRows } = await query(
      'SELECT default_markup_pct FROM domain_settings WHERE id = 1',
    );
    res.json({ tld: priceOut(rows[0], Number(settingRows[0]?.default_markup_pct ?? 25)) });
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------- Bulk ----------------------------------- */
/** Apply one markup to a whole group of TLDs - e.g. reprice every .co.za. */
router.post('/domain-pricing/bulk', requireAdmin, async (req, res, next) => {
  try {
    const pct = Number(req.body?.markupPct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 1000) {
      return res.status(400).json({ error: 'The markup must be between 0 and 1000 percent.' });
    }
    const problem = reasonProblem(req.body?.reason);
    if (problem) return res.status(400).json({ error: problem });

    const where = [];
    if (req.body?.scope === 'extended') where.push('is_curated = FALSE');
    else if (req.body?.scope === 'all') where.push('TRUE');
    else where.push('is_curated = TRUE');
    // A fixed price is a deliberate choice: a bulk markup must not silently
    // override one, or the admin would change prices they did not select.
    where.push('retail_ghs IS NULL');

    const { rows } = await query(
      `UPDATE domain_pricing SET markup_pct = $1, updated_at = NOW()
        WHERE ${where.join(' AND ')} RETURNING tld`,
      [pct],
    );
    invalidatePricingCache();

    await recordAdminAction(req, {
      action: 'domain.price_bulk',
      targetType: 'domain_pricing',
      detail: {
        scope: req.body?.scope || 'curated',
        markupPct: pct,
        count: rows.length,
        affected: rows.map((row) => row.tld),
        reason: String(req.body.reason).trim().slice(0, 500),
      },
    });
    res.json({ updated: rows.length, tlds: rows.map((row) => row.tld) });
  } catch (err) {
    next(err);
  }
});

export default router;
