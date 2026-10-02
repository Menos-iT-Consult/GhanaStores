/**
 * DiDwa - Storefront Theme API Routes (Module: theme architecture).
 *
 *  GET /api/themes                      catalog of all seeded theme templates
 *  GET /api/store/theme/public/:slug    active theme config for a customer storefront (no auth)
 *  PUT /api/store/theme                 seller activates + customizes their store theme
 */
import { Router } from 'express';
import { query } from '../config/database.js';
import { requireSeller } from '../middleware/authMiddleware.js';
import { canonicalDomain } from '../services/domainService.js';

const router = Router();

/**
 * Recursively merge theme config with per-store overrides.
 * Nested objects merge; scalars (and nulls) from `override` win.
 */
function mergeConfig(base, override) {
  if (base == null || typeof base !== 'object') return override;
  if (override == null || typeof override !== 'object') return override;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(override || {})) {
    out[k] = mergeConfig(base[k], override[k]);
  }
  return out;
}

/* ----------------------------- Catalog (seller browsing) ------------------- */
// GET /api/themes  - all 100+ templates, sorted by category for the dashboard grid
router.get('/themes', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, category, config, created_at
         FROM theme_templates
        /* Sort on the numeric suffix, not the name. Names run "Theme 01" to
           "Theme 100", and a lexical sort puts "Theme 100" before "Theme 11"
           because '1' = '1' then '0' < '1'.
           The CASE is load-bearing: regexp_replace returns its INPUT UNCHANGED
           when the pattern does not match, so a NULLIF guard on it does nothing
           and a hand-inserted name like "Handmade" aborts the whole query with
           "invalid input syntax for type integer". CASE yields real NULL, which
           NULLS LAST then sorts after the numbered rows within its category. */
        ORDER BY category ASC,
                 CASE WHEN name ~ '^Theme [0-9]+$'
                      THEN regexp_replace(name, '^Theme ([0-9]+)$', '\\1')::int
                 END ASC NULLS LAST,
                 name ASC`,
    );
    res.json({
      themes: rows.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        config: r.config,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ Public storefront -------------------------- */
// GET /api/store/theme/public/:slug  - active theme for a customer browsing a storefront
router.get('/store/theme/public/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    // The slug a storefront sends is whichever host the customer is on, so it
    // can be the apex or its www. spelling. Normalising here is what keeps a
    // working custom domain from rendering with no theme ("Store not found for
    // this theme"), which is a blank storefront rather than a clear error.
    const storeKey = canonicalDomain(slug);
    const { rows } = await query(
      `SELECT s.name              AS store_name,
              s.subdomain_slug    AS slug,
              s.custom_domain,
              s.active_theme_id   AS theme_id,
              t.name              AS theme_name,
              t.category          AS theme_category,
              t.config            AS base_config,
              s.custom_theme_config
        FROM stores s
        LEFT JOIN theme_templates t ON t.id = s.active_theme_id
       WHERE LOWER(s.subdomain_slug) = LOWER($1)
          OR LOWER(s.custom_domain) = ANY ($2::text[])
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [storeKey, [storeKey, `www.${storeKey}`]],
    );

    const store = rows[0];
    if (!store) {
      return res.status(404).json({ error: 'Store not found for this theme.' });
    }

    const merged = mergeConfig(store.base_config || {}, store.custom_theme_config || {});
    res.json({
      storeName: store.store_name,
      slug: store.slug,
      customDomain: store.custom_domain,
      theme: {
        id: store.theme_id,
        name: store.theme_name,
        category: store.theme_category,
        config: merged,
      },
      /* The two layers are also returned UNMERGED. `theme.config` above is a
         union of the template's shape (palette/hero/seo) and the seller's
         customizer tokens (colors/branding), which is ambiguous to read: the
         storefront would fall back to schema defaults for every template key.
         Exposed separately so a client can map them explicitly - template
         tokens first, seller overrides on top, store identity last. */
      templateConfig: store.base_config || {},
      overrides: store.custom_theme_config || {},
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ Seller mutation ----------------------------- */
// PUT /api/store/theme  - seller activates a theme and/or saves custom overrides
router.put('/store/theme', requireSeller, async (req, res, next) => {
  try {
    const { active_theme_id, custom_theme_config } = req.body || {};
    const storeId = req.auth.sub;

    if (active_theme_id !== undefined && active_theme_id !== null) {
      const exists = await query('SELECT 1 FROM theme_templates WHERE id = $1', [active_theme_id]);
      if (!exists.rowCount) {
        return res.status(400).json({ error: `theme_templates id not found: ${active_theme_id}` });
      }
    }

    const setParts = [];
    const params = [];
    let idx = 1;
    if (active_theme_id !== undefined && active_theme_id !== null) {
      setParts.push(`active_theme_id = $${idx++}`);
      params.push(active_theme_id);
    }
    if (custom_theme_config !== undefined) {
      setParts.push(`custom_theme_config = $${idx++}`);
      params.push(custom_theme_config);
    }
    if (setParts.length === 0) {
      return res.status(400).json({ error: 'Provide active_theme_id and/or custom_theme_config.' });
    }
    params.push(storeId);

    await query(
      `UPDATE stores SET ${setParts.join(', ')}
        WHERE id = $${idx}
        RETURNING active_theme_id`,
      params,
    );

    // Return the effective resolved theme (base + overrides merged).
    const { rows } = await query(
      `SELECT t.id        AS theme_id,
              t.name      AS theme_name,
              t.category  AS theme_category,
              t.config    AS base_config,
              s.custom_theme_config
         FROM stores s
         LEFT JOIN theme_templates t ON t.id = s.active_theme_id
        WHERE s.id = $1`,
      [storeId],
    );
    const row = rows[0];
    const merged = mergeConfig(row?.base_config || {}, row?.custom_theme_config || {});

    res.json({
      message: 'Store theme updated.',
      activeThemeId: row?.theme_id || null,
      theme: row
        ? {
            id: row.theme_id,
            name: row.theme_name,
            category: row.theme_category,
            config: merged,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

/* --------------------------- Live demo mock catalog ------------------------ */
// Realistic Ghanaian sample inventory powering the interactive demo sandbox.
const DEMO_CATALOG = {
  fashion: [
    { name: 'Kente Cloth Scarf', price: 180, tagline: 'Handwoven artisan weave' },
    { name: 'Ankara Print Dress', price: 250, tagline: 'Bold wax-print cotton' },
    { name: 'Leather Sandals', price: 150, tagline: 'Full-grain local leather' },
    { name: 'Krobo Bead Necklace', price: 80, tagline: 'Recycled glass beads' },
    { name: "Men's Batakari Smock", price: 320, tagline: 'Northern embroidery' },
    { name: 'Bolga Basket Bag', price: 120, tagline: 'Leather-trimmed raffia' },
  ],
  electronics: [
    { name: 'Solar Power Bank 20k mAh', price: 280, tagline: 'Charges in 6h sun' },
    { name: 'Bluetooth Party Speaker', price: 190, tagline: '12h battery life' },
    { name: 'Wireless Earbuds Pro', price: 165, tagline: 'ANC + charging case' },
    { name: '4G LTE MiFi Router', price: 340, tagline: 'All-network SIM slot' },
    { name: 'LED Rechargeable Lamp', price: 95, tagline: 'Dumsor-proof backup' },
    { name: 'Phone Repair Toolkit', price: 75, tagline: '38-piece precision set' },
  ],
  beauty: [
    { name: 'Raw Shea Butter 250g', price: 45, tagline: 'Unrefined, co-op sourced' },
    { name: 'African Black Soap', price: 18, tagline: 'Plantain ash formula' },
    { name: 'Coconut Hair Oil 200ml', price: 60, tagline: 'Cold-pressed, artisan batch' },
    { name: 'Turmeric Glow Mask', price: 55, tagline: 'Brightening clay blend' },
    { name: 'Aloe Vera Gel 150ml', price: 38, tagline: '99% organic aloe' },
    { name: 'Rosewater Face Toner', price: 42, tagline: 'Alcohol-free hydrating' },
  ],
  marketplace: [
    { name: 'Carved Wooden Bowl', price: 85, tagline: 'Sese wood, artisan craft' },
    { name: 'Woven Bolga Basket', price: 110, tagline: 'Large market tote' },
    { name: 'Ceramic Mug Set of 4', price: 95, tagline: 'Kiln-fired stoneware' },
    { name: 'Adinkra Wall Art', price: 210, tagline: 'Hand-stamped symbols' },
    { name: 'Raffia Placemats x4', price: 70, tagline: 'Natural dye weaves' },
    { name: 'Beaded Keyring', price: 25, tagline: 'Assorted Adinkra charms' },
  ],
  groceries: [
    { name: 'Jasmine Rice 5kg', price: 145, tagline: 'Premium long grain' },
    { name: 'Red Palm Oil 1L', price: 48, tagline: 'Village-pressed, unrefined' },
    { name: 'Groundnut Paste 500g', price: 32, tagline: '100% roasted peanuts' },
    { name: 'Plantain Chips 100g', price: 15, tagline: 'Sea salt crunch' },
    { name: 'Fresh Beef Tomatoes 1kg', price: 22, tagline: 'Farm-fresh daily' },
    { name: 'Whole Tilapia (Frozen)', price: 65, tagline: 'Lake Volta sourced' },
  ],
};

/** Deterministic mock inventory for a theme's live demo sandbox. */
function buildSampleItems(category) {
  const base = DEMO_CATALOG[category] || DEMO_CATALOG.marketplace;
  const badges = ['Bestseller', 'New arrival', 'Low stock', 'Hot deal'];
  return base.map((item, i) => {
    const price = Number(item.price);
    return {
      id: `${category}-demo-${i + 1}`,
      name: item.name,
      tagline: item.tagline,
      price,
      compareAtPrice: Math.round(price * 1.25),
      description: `${item.name} - ${item.tagline}. Quality-checked, packed securely and available for same-day dispatch nationwide.`,
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(`${category}-${i + 1}`)}/640/420`,
      rating: Math.round((4.2 + ((i * 7) % 8) / 10) * 10) / 10,
      reviewCount: 12 + i * 9,
      badge: badges[i % badges.length],
    };
  });
}

/* ------------------------------ Public demo feed --------------------------- */
// GET /api/themes/demo/:templateId - config + mock items for the sandbox viewer
router.get('/themes/demo/:templateId', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, name, category, config FROM theme_templates WHERE id = $1',
      [req.params.templateId],
    );
    const theme = rows[0];
    if (!theme) {
      return res.status(404).json({ error: 'Theme template not found.' });
    }
    res.json({
      theme: { id: theme.id, name: theme.name, category: theme.category, config: theme.config },
      sampleItems: buildSampleItems(theme.category),
      deliveryZones: ['Greater Area', 'National Metro', 'Suburban', 'Next-day nationwide'],
      payments: ['MTN MoMo', 'Telecel Cash', 'AirtelTigo Money', 'Cash on Delivery'],
    });
  } catch (err) {
    next(err);
  }
});

/* ---------------------------- Seller current theme ------------------------- */
// GET /api/store/theme - the authenticated store's currently published theme
router.get('/store/theme', requireSeller, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.active_theme_id     AS theme_id,
              t.name                AS theme_name,
              t.category            AS theme_category,
              t.config              AS base_config,
              s.custom_theme_config
         FROM stores s
         LEFT JOIN theme_templates t ON t.id = s.active_theme_id
        WHERE s.id = $1`,
      [req.auth.sub],
    );
    const row = rows[0];
    res.json({
      activeThemeId: row?.theme_id || null,
      /* The seller's overrides, UNMERGED, alongside the merged theme below.
         theme.config is a union of the template's shape and the seller's
         customizer tokens, which is ambiguous to read - the customizer would
         fall back to schema defaults for every template key. Exposing the two
         layers separately is what lets the customizer open on
         "new template + my saved customisations" instead of overwriting the
         customisations with the new template. Same contract the public endpoint
         and the storefront resolver already use. */
      overrides: row?.custom_theme_config || {},
      theme: row && row.theme_id
        ? {
            id: row.theme_id,
            name: row.theme_name,
            category: row.theme_category,
            config: mergeConfig(row.base_config || {}, row.custom_theme_config || {}),
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
