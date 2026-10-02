/**
 * DiDwa - Custom Subdomain & Custom Domain Routing
 * MODULE 7:
 *  - Host-header middleware maps incoming requests to a tenant via
 *    stores.custom_domain OR stores.subdomain_slug.
 *  - Sellers attach custom domains; DNS (CNAME) instructions and dynamic
 *    SSL provisioning guidance (Caddy on-demand TLS) are returned inline.
 *  - Exposes the standard ACME/Caddy "ask" endpoint used to decide whether
 *    a certificate should be issued on demand.
 */
import { Router } from 'express';
import { promises as dns } from 'node:dns';
import { query } from '../config/database.js';
import { requireSeller } from '../middleware/authMiddleware.js';
import { adminDomain, resolveTenantStore, platformDomain } from '../middleware/domainMiddleware.js';
import { RENDITIONS, buildDeliveryUrl, productImageUrl } from '../services/storage.js';
import { priceDomainForPurchase } from '../services/domainPricing.js';
import * as domainService from '../services/domainService.js';

/** Lowercase, strip scheme/path/whitespace - the canonical form of a domain. */
function cleanDomainName(value) {
  return String(value || '')
    .toLowerCase().trim()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .replace(/\.$/, '');
}

const router = Router();

// Backward-compatible re-export: the resolution logic now lives in
// middleware/domainMiddleware.js (per the module spec).
export const resolveStoreFromHost = resolveTenantStore;

// Shares the Host classifier's apex resolution (PLATFORM_DOMAIN -> ROOT_DOMAIN
// -> platform default) so seller-facing DNS instructions never degrade to a
// bare `cname.` when the environment variable is missing.
const PLATFORM_DOMAIN = platformDomain();
const ROOT_DOMAIN = (process.env.ROOT_DOMAIN || 'localhost:5173').split(':')[0];
// Falls back to a subdomain OF THE PLATFORM DOMAIN so white-label deploys
// only need to set PLATFORM_DOMAIN (override with an explicit CNAME_TARGET).
const CNAME_TARGET = process.env.CNAME_TARGET || `cname.${PLATFORM_DOMAIN}`;
/* Sellers point BOTH their root and www at the Cloudflare for SaaS fallback
   origin - a hostname this platform owns. The record contract itself lives in
   services/domainService.js so the instructions the UI renders, the payload the
   API returns and the target the verifier accepts cannot drift apart. An A
   record to a Cloudflare edge IP is what produced Error 1000 ("DNS points to
   prohibited IP"), so nothing in the platform emits one any more. */
const FALLBACK_ORIGIN = domainService.fallbackOrigin;
const DNS_RECORDS = domainService.dnsRecordsFor(FALLBACK_ORIGIN);
const ROOT_CNAME_NOTE = domainService.ROOT_CNAME_NOTE;
// Vercel's DNS targets. Vercel now issues a project-specific CNAME such as
// `01c53a14e266ef4f.vercel-dns-017.com`; `cname.vercel-dns.com` is the legacy
// target and still works. Every shape must be recognised, otherwise custom-domain
// verification rejects domains that Vercel has told the seller to point here.
const VERCEL_CNAME = 'cname.vercel-dns.com';
/** True when a resolved CNAME target belongs to Vercel's DNS estate. */
function isVercelCnameTarget(host) {
  const h = String(host || '').toLowerCase().replace(/\.$/, '');
  if (!h) return false;
  if (h === VERCEL_CNAME || h.endsWith(`.${VERCEL_CNAME}`)) return true;
  // Project-scoped targets: <hash>.vercel-dns-NNN[.cname.vercel-dns.com]
  if (/^(?:[a-z0-9-]+\.)*vercel-dns-\d{2,4}\.(com|net)$/.test(h)) return true;
  if (h.endsWith('.vercel-dns.com')) return true;
  return false;
}

/**
 * True when a resolved CNAME target is a host this platform actually tells
 * merchants to use: the Cloudflare for SaaS fallback origin, the self-hosted
 * CNAME_TARGET, or a Vercel target (kept so a deployment that is still
 * instructed by Vercel keeps verifying).
 */
function isPlatformDnsTarget(host) {
  const h = String(host || '').toLowerCase().replace(/\.$/, '');
  if (!h) return false;
  return h === FALLBACK_ORIGIN
    || h === String(CNAME_TARGET).toLowerCase()
    || isVercelCnameTarget(h);
}
const VERCEL_APEX_IPS = new Set(['76.76.21.21', '76.76.21.22', '76.76.21.61', '76.76.21.98', '76.76.21.241', '76.76.21.242']);
// Cloudflare returns its anycast edge addresses when a record is orange-clouded,
// so a proxied record cannot be matched to a real target by IP alone.
const CNAME_PROXY_IP_RANGES = ['104.16.', '104.17.', '104.18.', '104.19.', '104.20.', '104.21.', '104.22.', '104.24.', '172.64.', '173.245.', '103.21.', '103.22.', '103.31.', '141.101.', '190.93.240.'];

const DOMAIN_RE = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i;

function normalizeDomain(value) {
  // Delegates to the service so the value stored, the value compared and the
  // host the resolver matches on can never disagree - that disagreement is what
  // produced a connected domain that rendered "Store Not Found".
  return domainService.canonicalDomain(value);
}

/** The apex plus its www. spelling - the two forms one domain can be stored as. */
function domainCandidates(value) {
  const apex = normalizeDomain(value);
  return apex ? [apex, `www.${apex}`] : [''];
}

function domainUrl(domain) {
  return domain ? `https://${domain}` : null;
}

/* ------------------------------ Public resolution ---------------------------- */
// Lets the SPA ask "who owns the domain I am browsing?" (storefront header).
router.get('/resolve', async (req, res, next) => {
  try {
    if (!req.tenantStore) {
      return res.json({
        tenant: null,
        platformDomain: req.platformDomain,
        // The admin host is platform traffic, not a tenant, so it answers here.
        isAdminHost: Boolean(req.isAdminHost),
        adminDomain: adminDomain(),
        ...req.tenantInfo,
      });
    }
    const s = req.tenantStore;
    /* The active theme's template config, fetched HERE rather than left to the
       client's separate /api/store/theme/public call. That call only finishes
       after this response, so a storefront that waits for it has nothing to
       paint in between - the browser showed a blank screen before the splash.
       Returning the same two layers this endpoint already returns them in
       (template tokens, seller overrides) means resolveStorefrontTheme consumes
       them unchanged. Best-effort: a theme lookup failure must not fail host
       resolution, it just falls back to the schema defaults.
       A store with no active theme costs no query at all. */
    const template = s.active_theme_id
      ? await query(
        'SELECT name, config FROM theme_templates WHERE id = $1 LIMIT 1',
        [s.active_theme_id],
      ).then((r) => ({ name: r.rows[0]?.name || '', config: r.rows[0]?.config || {} })).catch(() => ({ name: '', config: {} }))
      : { name: '', config: {} };
    res.json({
      platformDomain: req.platformDomain,
      tenant: {
        id: s.id,
        name: s.name,
        subdomainSlug: s.subdomain_slug,
        customDomain: s.custom_domain,
        whatsappNumber: s.whatsapp_number,
        phone: s.phone,
        currency: s.currency,
        // Pre-resized URLs, so the client can set the browser tab icon before
        // the theme (and therefore the storefront render) has finished loading.
        logoUrl: buildDeliveryUrl(s.logo_url, RENDITIONS.logo),
        faviconUrl: buildDeliveryUrl(s.logo_url, RENDITIONS.favicon),
        /* Same shape as GET /api/store/theme/public, so the storefront can paint
           its splash in the seller's colours the instant this lands. */
        theme: {
          name: template.name,
          templateConfig: template.config || {},
          overrides: s.custom_theme_config || {},
        },
      },
      // A tenant host is never the admin host, but the client still needs the
      // canonical admin URL to redirect /admin to.
      isAdminHost: Boolean(req.isAdminHost),
      adminDomain: adminDomain(),
      ...req.tenantInfo,
    });
  } catch (err) {
    next(err);
  }
});

/* --------------------- Public storefront catalog by slug --------------------- */
router.get('/storefront/:slug/products', async (req, res, next) => {
  try {
    // Matched on the same candidates the resolver uses (slug, or the apex and
    // its www. spelling). A case-sensitive `custom_domain = $1` here 404'd the
    // catalogue for a store the host resolver had just successfully matched,
    // which rendered as an empty shop on a perfectly working domain.
    const key = normalizeDomain(req.params.slug);
    const s = await query(
      `SELECT id, name, subdomain_slug, whatsapp_number, phone, momo_number, currency, status
         FROM stores
        WHERE LOWER(subdomain_slug) = LOWER($1)
           OR LOWER(custom_domain) = ANY ($2::text[])
        LIMIT 1`,
      [key, domainCandidates(key)],
    );
    const store = s.rows[0];
    if (!store || store.status === 'SUSPENDED') {
      return res.status(404).json({ error: 'Storefront not found.' });
    }
    const products = await query(
      `SELECT p.id, p.name, p.description, p.category, p.image_url, p.image_key,
              COALESCE(json_agg(json_build_object(
                'id', v.id, 'optionName', v.option_name, 'optionValue', v.option_value,
                'price', COALESCE(v.price_override, p.price),
                'stockQuantity', v.stock_quantity
              ) ORDER BY v.option_name, v.option_value)
              FILTER (WHERE v.id IS NOT NULL), '[]') AS variants
         FROM products p
         LEFT JOIN product_variants v ON v.product_id = p.id
        WHERE p.store_id = $1 AND p.is_active = TRUE
        GROUP BY p.id
        ORDER BY p.created_at DESC`,
      [store.id],
    );
    res.json({
      store: {
        name: store.name, slug: store.subdomain_slug, currency: store.currency,
        whatsappNumber: store.whatsapp_number, momoNumber: store.momo_number,
      },
      products: products.rows.map((p) => ({
        ...p,
        // The storefront renders `img` in preference to image_url (see
        // toDisplayProduct), so a resized-on-read URL wins here while image_url
        // stays the absolute original for anything needing the full size.
        img: productImageUrl({ imageKey: p.image_key, imageUrl: p.image_url }),
        variants: p.variants.map((v) => ({ ...v, inStock: Number(v.stockQuantity) > 0 })),
      })),
    });
  } catch (err) {
    next(err);
  }
});

/* --------------------- Seller: view own domain configuration ----------------- */
router.get('/my', requireSeller, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT subdomain_slug, custom_domain FROM stores WHERE id = $1',
      [req.auth.sub],
    );
    const store = rows[0];
    // Never emit a literal "undefined" host: the subdomain is only renderable
    // when PLATFORM_DOMAIN is actually configured on this instance.
    const platformHost = PLATFORM_DOMAIN.replace(/:\d+$/, '');
    const subdomainHost = store.subdomain_slug && platformHost
      ? `${store.subdomain_slug}.${platformHost}`
      : null;
    res.json({
      subdomain: subdomainHost,
      subdomainSlug: store.subdomain_slug,
      customDomain: store.custom_domain,
      dns: {
        // The two records a merchant creates, exactly as the table shows them.
        records: DNS_RECORDS,
        fallbackOrigin: FALLBACK_ORIGIN,
        target: FALLBACK_ORIGIN,
        ttl: 3600,
        note: ROOT_CNAME_NOTE,
      },
      ssl: {
        mode: 'Automatic (Caddy on-demand TLS / NGINX certbot)',
        note: 'SSL is provisioned automatically once your CNAME resolves. Allow up to 10 minutes.',
      },
      caddyfile: [
        `${CNAME_TARGET}:443 {`,
        '  tls {',
        `    ask http://localhost:${process.env.PORT || 4000}/api/domains/caddy-ask`,
        '  }',
        '}',
      ].join('\n'),
    });
  } catch (err) {
    next(err);
  }
});

/* ---------------------- Seller: attach a custom domain ----------------------- */
router.put('/my', requireSeller, async (req, res, next) => {
  try {
    const domain = normalizeDomain(req.body?.customDomain);
    if (!domain) {
      // Clearing the domain.
      await query('UPDATE stores SET custom_domain = NULL WHERE id = $1', [req.auth.sub]);
      return res.json({ message: 'Custom domain removed.', customDomain: null });
    }
    if (!DOMAIN_RE.test(domain)) {
      return res.status(400).json({ error: 'Enter a valid domain, e.g. shop.mybrand.com' });
    }
    return res.status(400).json({ error: 'Configure and verify the domain through /api/domains/connect-existing and /api/domains/verify-status before attaching it.' });
  } catch (err) {
    next(err);
  }
});

/* ----------- Verify DNS (CNAME/apex) and assign a custom domain ----------- */
// Real DNS verification: resolves live CNAME + A records and only persists
// the domain once it demonstrably points at Vercel (or the self-hosted
// CNAME target). Prevents the storefront from silently 404ing on an
// unattached domain.
router.post('/verify', requireSeller, async (req, res, next) => {
  try {
    const domain = normalizeDomain(req.body?.customDomain);
    if (!domain) return res.status(400).json({ error: 'customDomain is required.' });
    if (!DOMAIN_RE.test(domain)) {
      return res.status(400).json({ error: 'Enter a valid domain, e.g. shop.mybrand.com' });
    }
    if (domain.endsWith(`.${PLATFORM_DOMAIN}`)) {
      return res.status(400).json({ error: 'Platform subdomains are generated automatically. Use the subdomain field.' });
    }

    /* ---- Live DNS lookups (each wrapped: a lookup failure is just "not detected") ---- */
    let cnameRecords = [];
    try { cnameRecords = (await dns.resolveCname(domain)).map((r) => r.toLowerCase().replace(/\.$/, '')); } catch { /* none */ }

    let aRecords = [];
    try { aRecords = await dns.resolve4(domain); } catch { /* none */ }

    /* A target can appear as the fallback origin CNAME we instruct, as the
       self-hosted CNAME_TARGET, as a Vercel target (project-scoped CNAME or the
       legacy cname.vercel-dns.com), or as an ALIAS. */
    const cnameOk = cnameRecords.some(isPlatformDnsTarget);
    const apexOk = aRecords.some((ip) => VERCEL_APEX_IPS.has(ip));
    // A CNAME to the fallback origin resolves to Cloudflare's anycast addresses,
    // which hide the real target - so the proxied shape is the EXPECTED shape
    // here, not a fallback. Accepting it is what lets a correctly configured
    // merchant pass verification at all.
    const cloudflareProxied = aRecords.some((ip) =>
      CNAME_PROXY_IP_RANGES.some((range) => ip.startsWith(range)));
    const platformIsVercel = isVercelCnameTarget(CNAME_TARGET);
    const platformIsCloudflare = FALLBACK_ORIGIN.endsWith(`.${PLATFORM_DOMAIN}`)
      || String(CNAME_TARGET).toLowerCase().endsWith(`.${PLATFORM_DOMAIN}`);
    const pointsAtPlatform = cnameOk || apexOk
      || (cloudflareProxied && (platformIsVercel || platformIsCloudflare));

    const records = {
      cname: cnameRecords,
      a: aRecords,
      match: cnameOk ? 'cname' : (apexOk ? 'apex' : (cloudflareProxied ? 'cloudflare_proxied' : null)),
    };

    if (!pointsAtPlatform) {
      return res.status(400).json({
        verified: false,
        error: 'DNS record not detected yet. Point your domain at DiDwa, then retry.',
        records,
        instructions: {
          // The same two records the table shows - no A record, ever.
          records: DNS_RECORDS,
          fallbackOrigin: FALLBACK_ORIGIN,
          note: ROOT_CNAME_NOTE,
          ttl: '3600 seconds (provisioning can take a few minutes).',
        },
      });
    }

    // Records verified - make sure no other tenant owns the domain. LOWER() on
    // both sides: a plain `=` is case-sensitive, so a store that saved
    // "MyBrand.com" would slip past this check and two stores would end up
    // fighting over one hostname.
    const taken = await query(
      'SELECT 1 FROM stores WHERE LOWER(custom_domain) = LOWER($1) AND id <> $2 LIMIT 1',
      [domain, req.auth.sub],
    );
    if (taken.rows.length > 0) {
      return res.status(409).json({ error: 'This domain is already connected to another store.' });
    }
    // Canonical (lowercase apex) so the resolver's LOWER() comparison matches.
    await query('UPDATE stores SET custom_domain = $2 WHERE id = $1', [req.auth.sub, domain]);

    return res.json({
      verified: true,
      customDomain: domain,
      records,
      message: 'Domain verified and connected. SSL is provisioned automatically by Cloudflare for SaaS.',
    });
  } catch (err) {
    next(err);
  }
});

/* ------------- Caddy on-demand TLS "ask" endpoint (infra hook) --------------- */
// Caddy calls this before issuing a certificate for an unknown domain.
router.get('/caddy-ask', async (req, res) => {
  try {
    const domain = normalizeDomain(req.query.domain);
    if (!DOMAIN_RE.test(domain)) return res.sendStatus(403);
    const { rows } = await query(
      'SELECT 1 FROM stores WHERE LOWER(custom_domain) = $1 LIMIT 1',
      [domain],
    );
    // 200 -> issue cert ; non-200 -> refuse.
    return res.sendStatus(rows.length > 0 ? 204 : 403);
  } catch {
    return res.sendStatus(503);
  }
});

/* =========================================================================
 * Unified Domain Acquisition Routes (Flow A + Flow B)
 * ========================================================================= */

/* --- Flow A: Connect Existing Domain (BYOD) --- */

router.post('/connect-existing', requireSeller, async (req, res, next) => {
  try {
    const domainName = normalizeDomain(req.body?.domainName);
    if (!domainName) {
      return res.status(400).json({ error: 'domainName is required.' });
    }
    if (!DOMAIN_RE.test(domainName)) {
      return res.status(400).json({ error: 'Enter a valid domain name, e.g. mybrand.com' });
    }

    const result = await domainService.connectExistingDomain({
      storeId: req.auth.sub,
      domainName,
    });

    await query(
      `INSERT INTO store_domains (store_id, domain_name, provider, status, custom_hostname_id, dns_target_a, dns_target_cname, verification_errors)
       VALUES ($1, $2, 'EXTERNAL', $3, $4, $5, $6, $7)
       ON CONFLICT (LOWER(domain_name)) DO UPDATE SET
         status = EXCLUDED.status,
         custom_hostname_id = EXCLUDED.custom_hostname_id,
         updated_at = NOW()
       RETURNING id`,
      [
        req.auth.sub,
        result.domainName,
        result.status,
        result.customHostnameId || null,
        result.dnsTarget?.aRecord || null,
        result.dnsTarget?.cnameRecord || null,
        JSON.stringify(result.verificationErrors || []),
      ],
    );

    return res.json({
      success: true,
      domainName: result.domainName,
      status: result.status,
      customHostnameId: result.customHostnameId,
      dnsTarget: result.dnsTarget,
      verificationErrors: result.verificationErrors,
      dryRun: result.dryRun || false,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Add a custom domain (BYOD): provision with Vercel + Cloudflare, then persist.
 *
 * This is the merchant-facing entry point for the full automatic flow. It is a
 * superset of /connect-existing, which registers only the Cloudflare hostname.
 *
 * The domain is persisted with status PENDING_DNS: nothing is ACTIVE until the
 * merchant points their DNS at the fallback origin and /verify-status confirms
 * it. Attaching it to stores.custom_domain happens in /verify, deliberately -
 * claiming a domain before it resolves would let one merchant squat a hostname
 * and point a half-built storefront at it.
 */
router.post('/add', requireSeller, async (req, res, next) => {
  let provisioned = null;
  try {
    const domainName = normalizeDomain(req.body?.domainName ?? req.body?.domain);
    if (!domainName) {
      return res.status(400).json({ error: 'domainName is required.' });
    }
    if (!DOMAIN_RE.test(domainName)) {
      return res.status(400).json({ error: 'Enter a valid domain name, e.g. mybrand.com' });
    }

    // A hostname may belong to exactly one storefront, ever. Both the apex and
    // its www. spelling are checked: a merchant who typed `www.mybrand.com`
    // would otherwise slip past a check that only knows the apex form and
    // silently re-point a domain another store is already serving.
    const { rows: claimed } = await query(
      `SELECT store_id FROM store_domains
        WHERE LOWER(domain_name) = ANY ($1::text[])`,
      [domainCandidates(domainName)],
    );
    if (claimed.length && claimed[0].store_id !== req.auth.sub) {
      return res.status(409).json({ error: 'That domain is already connected to another store.' });
    }

    provisioned = await domainService.provisionCustomDomain(domainName, req.auth.sub);

    // The status enum is UPPER_CASE and CHECK-constrained in the schema, so
    // 'pending_dns' from the API contract would be rejected by Postgres.
    const status = String(provisioned.status || 'PENDING_DNS').toUpperCase();

    await query(
      `INSERT INTO store_domains (store_id, domain_name, provider, status, custom_hostname_id, ssl_status, dns_target_cname, verification_errors)
       VALUES ($1, $2, 'EXTERNAL', $3, $4, $5, $6, $7)
       ON CONFLICT (LOWER(domain_name)) DO UPDATE SET
         store_id = EXCLUDED.store_id,
         status = EXCLUDED.status,
         custom_hostname_id = EXCLUDED.custom_hostname_id,
         ssl_status = EXCLUDED.ssl_status,
         verification_errors = EXCLUDED.verification_errors,
         updated_at = NOW()
       WHERE store_domains.store_id = EXCLUDED.store_id`,
      [
        req.auth.sub,
        provisioned.domainName,
        status,
        provisioned.customHostnameId || null,
        provisioned.cloudflare?.sslStatus || 'pending',
        FALLBACK_ORIGIN,
        JSON.stringify(provisioned.verificationErrors || []),
      ],
    );

    // The `value` key is what the dashboard's DNS table renders; `pointsTo` is
    // the historical name the other domain endpoints emit. Both are sent so no
    // consumer has to be updated in the same deploy as this endpoint.
    const dnsRecords = DNS_RECORDS.map((r) => ({ ...r, value: r.pointsTo }));

    return res.status(201).json({
      success: true,
      domain: provisioned.domainName,
      domainName: provisioned.domainName,
      status,
      // Lowercase alias matching the documented response contract.
      statusLower: status.toLowerCase(),
      dnsRecords,
      dnsTarget: {
        fallbackOrigin: FALLBACK_ORIGIN,
        target: FALLBACK_ORIGIN,
        ttl: 3600,
        records: DNS_RECORDS,
        note: ROOT_CNAME_NOTE,
      },
      ssl: {
        status: provisioned.cloudflare?.sslStatus || 'pending',
        note: 'SSL is issued automatically once your DNS points at us. This can take up to 15 minutes.',
      },
      customHostnameId: provisioned.customHostnameId || null,
      vercel: provisioned.vercel || null,
      verificationErrors: provisioned.verificationErrors || [],
      nextStep: `Point both DNS records at ${FALLBACK_ORIGIN}, then confirm from the Domain page.`,
      dryRun: provisioned.dryRun || false,
    });
  } catch (err) {
    // The service already rolls back the Vercel leg when Cloudflare fails. Here
    // we only have to report it: the normalized middleware turns this into a
    // safe message plus a reference id, and logs the provider detail.
    next(err);
  }
});

/* --- Flow A: Verify Status & List --- */

router.get('/verify-status', requireSeller, async (req, res, next) => {
  try {
    const domainName = normalizeDomain(req.query.domain);
    if (!domainName) {
      return res.status(400).json({ error: 'domain query parameter is required.' });
    }

    const result = await domainService.verifyDomainStatus(domainName);

    if (result.status) {
      await query(
        `UPDATE store_domains SET status = $1, ssl_status = $2, verification_errors = $3, updated_at = NOW()
         WHERE store_id = $4 AND LOWER(domain_name) = LOWER($5)`,
        [
          result.status,
          result.ssl?.status || null,
          JSON.stringify(result.verificationErrors || []),
          req.auth.sub,
          result.domainName,
        ],
      );
      if (result.status === 'ACTIVE') {
        // Never steal a domain already attached to a different tenant. LOWER()
        // on both sides so a differently-cased row cannot be bypassed.
        const taken = await query(
          'SELECT 1 FROM stores WHERE LOWER(custom_domain) = LOWER($1) AND id <> $2 LIMIT 1',
          [result.domainName, req.auth.sub],
        );
        if (taken.rows.length === 0) {
          await query('UPDATE stores SET custom_domain = LOWER($1) WHERE id = $2', [result.domainName, req.auth.sub]);
        }
      }
    }

    return res.json({
      domainName: result.domainName,
      status: result.status,
      ssl: result.ssl || null,
      verificationErrors: result.verificationErrors || [],
      dryRun: result.dryRun || false,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/list', requireSeller, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, domain_name, provider, status, ssl_status, custom_hostname_id,
              dns_target_a, dns_target_cname, price_paid_ghs, registered_at, created_at, updated_at
         FROM store_domains
        WHERE store_id = $1
        ORDER BY created_at DESC`,
      [req.auth.sub],
    );
    return res.json({ domains: rows });
  } catch (err) {
    next(err);
  }
});

/* --- Flow B: Buy New Domain (Openprovider + Hubtel) --- */

router.get('/search', requireSeller, async (req, res, next) => {
  try {
    const queryParam = String(req.query.query || '').trim();
    if (!queryParam) {
      return res.status(400).json({ error: 'query parameter is required.' });
    }
    const results = await domainService.searchDomains(queryParam);
    return res.json({ query: queryParam, results });
  } catch (err) {
    next(err);
  }
});

router.post('/buy/initialize-hubtel', requireSeller, async (req, res, next) => {
  try {
    const { domainName, customerPhone, customerEmail } = req.body || {};
    if (!domainName || !customerPhone) {
      return res.status(400).json({ error: 'domainName and customerPhone are required.' });
    }
    /* The price is resolved HERE, from the platform's own catalogue - never from
       the request body. Taking amountGhs from the client let any seller POST 1 and
       buy a .com for a single cedi. A value sent by the browser is ignored. */
    const clean = cleanDomainName(domainName);
    let priced;
    try {
      priced = await priceDomainForPurchase(clean);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
    const amountGhs = priced.priceGhs;

    const result = await domainService.initializeHubtelCheckout({
      amountGhs,
      domainName: clean,
      customerPhone,
      customerEmail: customerEmail || req.store?.email || '',
      storeId: req.auth.sub,
    });

    // Pre-create store_domains record with pending status
    await query(
      `INSERT INTO store_domains (store_id, domain_name, provider, status, purchase_reference)
       VALUES ($1, $2, 'PURCHASED', 'PENDING_DNS', $3)
       ON CONFLICT (LOWER(domain_name)) DO NOTHING`,
      [req.auth.sub, clean, result.reference],
    );

    return res.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      checkoutId: result.checkoutId,
      reference: result.reference,
      // The price actually charged, resolved server-side. Echoed so the seller
      // can see what they were billed even if their search result was stale.
      amountGhs,
      tld: priced.tld,
      dryRun: result.dryRun || false,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
export { router as domainRouter };

/** Standalone webhook router — mounted at /api/webhooks in server.js */
import { Router as WebhookRouter } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { normalizeGhPhone } from '../utils/helpers.js';
import {
  handlePaystackWebhook,
  handleHubtelWebhook,
  findOrderByReference,
} from '../services/paymentWebhooks.js';

export const webhookRouter = WebhookRouter();

/**
 * Constant-time string compare that never throws on length mismatch.
 */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Authenticate a gateway webhook call.
 *
 * The domain/payment webhook can mark a purchased domain ACTIVE and attach it
 * to a store, so an unauthenticated endpoint would let anyone claim a domain.
 * Accepted proofs, in order:
 *   1. HMAC-SHA256 of the raw request body in `x-hubtel-signature` /
 *      `x-webhook-signature` (hex or base64), keyed by HUBTEL_WEBHOOK_SECRET.
 *   2. The shared secret itself in `x-webhook-secret` or `?secret=`.
 *   3. `Authorization: Bearer <HUBTEL_WEBHOOK_SECRET>`.
 *
 * When HUBTEL_WEBHOOK_SECRET is unset the request is refused in production and
 * accepted with a loud warning in development (so local simulators still work).
 */
function verifyWebhook(req) {
  const secret = process.env.HUBTEL_WEBHOOK_SECRET || '';
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, reason: 'HUBTEL_WEBHOOK_SECRET is not configured.' };
    }
    console.warn('[webhook] HUBTEL_WEBHOOK_SECRET is not set - accepting unverified webhook (development only).');
    return { ok: true, insecure: true };
  }

  const rawBody = req.rawBody
    ? (Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(String(req.rawBody)))
    : Buffer.from(JSON.stringify(req.body || {}));

  const signature = String(
    req.get('x-hubtel-signature') || req.get('x-webhook-signature') || '',
  ).trim();
  if (signature) {
    const hex = createHmac('sha256', secret).update(rawBody).digest('hex');
    const b64 = createHmac('sha256', secret).update(rawBody).digest('base64');
    if (safeEqual(signature, hex) || safeEqual(signature, b64)) return { ok: true };
    return { ok: false, reason: 'Signature mismatch.' };
  }

  const provided = String(req.get('x-webhook-secret') || req.query?.secret || '').trim()
    || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (provided && safeEqual(provided, secret)) return { ok: true };

  return { ok: false, reason: 'Missing or invalid webhook credentials.' };
}

/**
 * POST /api/webhooks/paystack
 *
 * Net-new endpoint. Paystack is a per-store BYOK gateway, so there is no
 * platform-wide secret here: the store is resolved from data.reference and the
 * signature is checked with that store's own secret key.
 */
webhookRouter.post('/paystack', async (req, res) => {
  try {
    const result = await handlePaystackWebhook(
      req.rawBody ?? JSON.stringify(req.body || {}),
      req.get('x-paystack-signature') || '',
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    // Always 200: a non-2xx makes Paystack retry the same event forever, and a
    // retry storm on a handler that already logged is worse than one lost event.
    console.error('[payment-webhook] paystack handler error:', err.message);
    return res.status(200).json({ received: true, processed: false });
  }
});

/**
 * POST /api/webhooks/hubtel
 *
 * Serves two callers on one path, disambiguated by whether the payload carries
 * a ClientReference that matches a DiDwa order:
 *   - a STORE ORDER payment  -> per-store BYOK handling, signed with that
 *     merchant's own client secret (handleHubtelWebhook).
 *   - a PLATFORM DOMAIN purchase -> the pre-existing flow below, signed with
 *     the platform-wide HUBTEL_WEBHOOK_SECRET.
 * The order lookup runs first so domain provisioning keeps working unchanged.
 */
webhookRouter.post('/hubtel', async (req, res) => {
  // Resolve which flow this belongs to BEFORE the try below. Deciding inside a
  // try means an error in the order flow silently falls through to the platform
  // domain flow, where the same reference means something else entirely.
  let isOrderFlow = false;
  try {
    const orderRef = req.body?.ClientReference ?? req.body?.clientReference
      ?? req.body?.Reference ?? req.body?.reference;
    isOrderFlow = Boolean(orderRef) && Boolean(await findOrderByReference(orderRef));
  } catch (err) {
    console.error('[webhook] hubtel order lookup failed:', err.message);
    return res.status(202).json({ received: true, processed: false, reason: 'Lookup unavailable.' });
  }

  if (isOrderFlow) {
    // Guarded separately: never let a throw here be reinterpreted as a domain
    // purchase callback.
    let result;
    try {
      result = await handleHubtelWebhook(
        req.body || {},
        req.get('x-hubtel-signature') || req.get('x-webhook-signature') || null,
        req.rawBody ?? null,
      );
    } catch (err) {
      console.error('[payment-webhook] hubtel handler error:', err.message);
      return res.status(202).json({ received: true, processed: false, reason: 'Handler error.' });
    }
    return res.status(result.status).json(result.body);
  }

  try {
    const auth = verifyWebhook(req);
    if (!auth.ok) {
      console.warn('[webhook] rejected Unverified Hubtel webhook:', auth.reason);
      return res.status(401).json({ received: false, error: auth.reason });
    }

    const result = await domainService.handleHubtelWebhook(req.body || {});

    if (result.processed && result.domainName) {
      /* Guard: a successfully paid purchase may only activate the domain for a
         store that actually created the pending purchase, and the domain must
         stay exclusively owned (stores.custom_domain is UNIQUE). */
      const owned = await query(
        `SELECT 1 FROM store_domains
          WHERE store_id = $1 AND LOWER(domain_name) = LOWER($2)
            AND provider = 'PURCHASED'
          LIMIT 1`,
        [result.storeId, result.domainName],
      );
      if (!owned.rows[0]) {
        console.warn('[webhook] no pending purchase for', result.domainName, '-> ignoring');
        return res.json({ received: true, processed: false, reason: 'unknown_purchase' });
      }

      await query(
        `UPDATE store_domains SET status = 'ACTIVE', registered_at = NOW(), updated_at = NOW()
          WHERE store_id = $1 AND LOWER(domain_name) = LOWER($2)`,
        [result.storeId, result.domainName],
      );

      // Never steal a domain already attached to a different tenant. LOWER() on
      // both sides: this is the only ownership check on the purchase path, so a
      // case-sensitive comparison here let a differently-cased row through.
      const taken = await query(
        'SELECT 1 FROM stores WHERE LOWER(custom_domain) = LOWER($1) AND id <> $2 LIMIT 1',
        [result.domainName, result.storeId],
      );
      if (taken.rows[0]) {
        console.warn('[webhook] domain already attached to another store:', result.domainName);
        return res.json({ received: true, processed: false, reason: 'domain_taken' });
      }
      await query(
        `UPDATE stores SET custom_domain = LOWER($1) WHERE id = $2`,
        [String(result.domainName).toLowerCase().trim(), result.storeId],
      );
    }

    return res.json({ received: true, processed: result.processed });
  } catch (err) {
    console.error('[domain] webhook handler error:', err.message);
    return res.status(200).json({ received: true, processed: false });
  }
});
