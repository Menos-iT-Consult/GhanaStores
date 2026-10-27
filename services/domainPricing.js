/**
 * DiDwa - Domain catalogue pricing.
 *
 * One authority for "which TLDs are offered" and "what do they cost", shared by
 * the seller search, the checkout, and the admin dashboard. The rule that makes
 * this safe is that the price is ALWAYS resolved here on the server: the
 * browser's idea of a price is display-only and is never charged.
 *
 * Precedence for a TLD's price:
 *   1. retail_ghs     - a flat advertised price the admin set. Always wins.
 *   2. wholesale_ghs  - a configured cost in GHS, marked up by markup_pct.
 *   3. a live OpenProvider quote converted using the configured USD/GHS rate.
 * Results are rounded to the nearest 5 GHS, which is what sellers expect to see.
 *
 * Reads are cached for a minute: a domain search runs once per keystroke batch
 * and must not hit the database for the whole catalogue each time, while an
 * admin's price change should still take effect almost immediately.
 */
import { query } from '../config/database.js';

const CACHE_MS = 60_000;

/** Fallbacks used only if the catalogue has not been seeded at all. */
const FALLBACK = {
  tlds: ['com'], includeAll: false, defaultMarkupPct: 25, usdToGhsRate: null,
  scaleDomainCount: 1, scaleDomainYears: 1, scaleDomainMaxUsd: null,
  scaleDomainRenewalsEnabled: true,
};

let cache = { at: 0, data: FALLBACK };

/** Prices are advertised to the nearest 5 GHS. */
export const roundTo5Ghs = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n / 5) * 5);
};

/** Force the next read to hit the database. Called after any admin change. */
export function invalidatePricingCache() {
  cache = { at: 0, data: FALLBACK };
}

/**
 * The catalogue as currently configured.
 * @returns {Promise<{tlds: object[], byTld: Map<string,object>, includeAll: boolean,
 *                    defaultMarkupPct: number, catalogued: boolean}>}
 */
export async function loadPricingCatalog({ force = false } = {}) {
  if (!force && Date.now() - cache.at < CACHE_MS) return cache.data;

  try {
    const [rows, settings] = await Promise.all([
      query('SELECT tld, label, wholesale_ghs, provider_price, provider_currency, provider_price_checked_at, markup_pct, retail_ghs, is_enabled, is_curated, scale_eligible, sort_order FROM domain_pricing ORDER BY sort_order, tld'),
      query('SELECT include_all_tlds, default_markup_pct, usd_to_ghs_rate, scale_domain_count, scale_domain_years, scale_domain_max_usd, scale_domain_renewals_enabled FROM domain_settings WHERE id = 1'),
    ]);

    const row = settings.rows[0] || {};
    // The "all TLDs" toggle widens the search to every ENABLED TLD; without it
    // only the curated set is offered.
    const includeAll = Boolean(row.include_all_tlds);
    const tlds = rows.rows.filter((entry) => entry.is_enabled && (includeAll || entry.is_curated));

    const data = {
      tlds,
      byTld: new Map(rows.rows.map((entry) => [entry.tld, entry])),
      includeAll,
      defaultMarkupPct: Number(row.default_markup_pct ?? FALLBACK.defaultMarkupPct),
      usdToGhsRate: row.usd_to_ghs_rate === null || row.usd_to_ghs_rate === undefined
        ? null : Number(row.usd_to_ghs_rate),
      scaleDomainCount: Number(row.scale_domain_count ?? FALLBACK.scaleDomainCount),
      scaleDomainYears: Number(row.scale_domain_years ?? FALLBACK.scaleDomainYears),
      scaleDomainMaxUsd: row.scale_domain_max_usd === null || row.scale_domain_max_usd === undefined
        ? null : Number(row.scale_domain_max_usd),
      scaleDomainRenewalsEnabled: row.scale_domain_renewals_enabled !== false,
      catalogued: rows.rows.length > 0,
    };
    cache = { at: Date.now(), data };
    return data;
  } catch (err) {
    // A missing table must not break domain search: fall back to the old
    // four-TLD behaviour until the schema is applied.
    if (!cache.data.catalogued) {
      console.warn('[domain-pricing] catalogue unavailable, using fallback:', err.message);
    }
    return cache.data;
  }
}

/** Convert an OpenProvider quote to GHS without treating USD as GHS. */
export function providerPriceToGhs(amount, currency, usdToGhsRate) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) return null;
  const code = String(currency || '').trim().toUpperCase();
  if (code === 'GHS') return value;
  if (code === 'USD' && Number.isFinite(Number(usdToGhsRate)) && Number(usdToGhsRate) > 0) {
    return value * Number(usdToGhsRate);
  }
  return null;
}

/**
 * The price a seller pays for one TLD.
 * @param {object|null} row        the catalogue row, if the TLD is known
 * @param {number|undefined} wholesale  the provider's price, when a search saw one
 * @param {number} defaultMarkupPct
 * @returns {number} GHS
 */
export function resolveDomainPrice(row, wholesale, defaultMarkupPct) {
  const fixed = row?.retail_ghs;
  if (fixed !== null && fixed !== undefined) return roundTo5Ghs(fixed);

  const base = row?.wholesale_ghs ?? wholesale;
  if (base === null || base === undefined || !Number.isFinite(Number(base))) {
    return null;
  }
  const markup = Number(row?.markup_pct ?? defaultMarkupPct ?? 25);
  return roundTo5Ghs(Number(base) * (1 + markup / 100));
}

/** TLD of a domain name, without the leading dot: 'shop.kwame.co.za' -> 'co.za'. */
export function tldOf(domainName) {
  const parts = String(domainName || '').toLowerCase().trim().replace(/\.$/, '').split('.');
  if (parts.length < 2) return '';
  // A two-part suffix (.co.za, .com.gh) is treated as one TLD.
  const lastTwo = parts.slice(-2).join('.');
  return ['co.za', 'com.gh', 'org.gh', 'edu.gh', 'net.za', 'web.za', 'co.ke', 'com.ng']
    .includes(lastTwo) ? lastTwo : parts[parts.length - 1];
}

/**
 * The authoritative price for a domain about to be bought, resolved on the
 * server. Throws for a TLD the platform does not sell, so a caller cannot buy
 * a domain it has not priced.
 */
export async function priceDomainForPurchase(domainName, providerQuote = null) {
  const tld = tldOf(domainName);
  if (!tld) {
    throw Object.assign(new Error('Enter a valid domain name, for example kwame.shop.'), { status: 400 });
  }
  const catalog = await loadPricingCatalog();
  const row = catalog.byTld.get(tld);
  if (!row) {
    throw Object.assign(new Error(`.${tld} is not available for purchase.`), { status: 400 });
  }
  if (!row.is_enabled) {
    throw Object.assign(new Error(`.${tld} is not currently available.`), { status: 400 });
  }
  const providerCostGhs = row.wholesale_ghs ?? providerPriceToGhs(
    providerQuote?.price,
    providerQuote?.currency,
    catalog.usdToGhsRate,
  );
  const priceGhs = resolveDomainPrice(row, providerCostGhs, catalog.defaultMarkupPct);
  if (!Number.isFinite(priceGhs) || priceGhs <= 0) {
    throw Object.assign(new Error(`Pricing for .${tld} is not configured in GHS yet.`), { status: 409 });
  }
  return { tld, priceGhs, row, providerCostGhs };
}
