/**
 * DiDwa - Unified Domain Acquisition Service
 * Flow A: Bring Your Own Domain (Cloudflare for SaaS custom hostnames)
 * Flow B: Buy New Domain (Openprovider + Hubtel MoMo/Card checkout)
 *
 * The OpenProvider search and registration paths always require live provider
 * credentials. Dry-run behavior is limited to separately configured demo flows.
 */
import axios from 'axios';
import {
  loadPricingCatalog, providerPriceToGhs, resolveDomainPrice, tldOf,
} from './domainPricing.js';
import { verifyHubtelTransaction } from './hubtelService.js';

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || '';

const OPENPROVIDER_API_URL = process.env.OPENPROVIDER_API_URL || 'https://api.openprovider.eu/v1';
const OPENPROVIDER_USERNAME = process.env.OPENPROVIDER_USERNAME || '';
const OPENPROVIDER_PASSWORD = process.env.OPENPROVIDER_PASSWORD || '';
const OPENPROVIDER_OWNER_HANDLE = process.env.OPENPROVIDER_OWNER_HANDLE || '';
const OPENPROVIDER_ADMIN_HANDLE = process.env.OPENPROVIDER_ADMIN_HANDLE || OPENPROVIDER_OWNER_HANDLE;
const OPENPROVIDER_TECH_HANDLE = process.env.OPENPROVIDER_TECH_HANDLE || OPENPROVIDER_OWNER_HANDLE;
const OPENPROVIDER_BILLING_HANDLE = process.env.OPENPROVIDER_BILLING_HANDLE || OPENPROVIDER_OWNER_HANDLE;

const HUBTEL_CLIENT_ID = process.env.HUBTEL_CLIENT_ID || '';
const HUBTEL_CLIENT_SECRET = process.env.HUBTEL_CLIENT_SECRET || '';
const HUBTEL_BASE_URL = process.env.HUBTEL_CHECKOUT_BASE_URL || 'https://api.hubtel.com';
const HUBTEL_CALLBACK_URL = process.env.HUBTEL_CALLBACK_URL || '';
/* v13 is the oldest API version Vercel still serves. v10 (the number usually
   quoted in tutorials) is retired and answers 404, which reads exactly like a
   bad project id - so a "successful" rollout on v10 silently provisions nothing. */
const VERCEL_API_VERSION = process.env.VERCEL_API_VERSION || '13';
const PLATFORM_DOMAIN = (process.env.PLATFORM_DOMAIN || 'didwaghana.com').replace(/^https?:\/\//, '');
/* Self-hosted deployments terminate TLS with Caddy and hand sellers this host;
   the Cloudflare for SaaS flow below uses the fallback origin instead. */
const CNAME_TARGET = process.env.CNAME_TARGET || `cname.${PLATFORM_DOMAIN}`;

/**
 * The Cloudflare for SaaS fallback origin: a plain hostname on our own zone that
 * every merchant CNAME (root and www) points at.
 *
 * This replaced an A record to 104.16.0.1, which Cloudflare refuses with Error
 * 1000 ("DNS points to prohibited IP") because that is a proxied edge address
 * rather than a real origin. A CNAME - or ALIAS/ANAME where a registrar forbids
 * a root CNAME - to this host is the shape Cloudflare for SaaS expects, so it is
 * the only record shape this platform ever instructs.
 */
const FALLBACK_ORIGIN = String(process.env.DOMAIN_FALLBACK_ORIGIN || `fallback.${PLATFORM_DOMAIN}`)
  .replace(/^https?:\/\//i, '')
  .replace(/\/+$/, '')
  .toLowerCase();

/** Shown under the DNS table: the one registrar caveat that actually blocks people. */
export const ROOT_CNAME_NOTE = 'Note: If your registrar (e.g. GoDaddy, Namecheap) does not allow CNAME records on the root (@) domain, choose ALIAS or ANAME as the record type, or point the CNAME to www.';

/**
 * The records a merchant must create, in table order. Both are CNAMEs to the
 * fallback origin: there is deliberately no A record anywhere in this payload.
 */
export function dnsRecordsFor(target = FALLBACK_ORIGIN) {
  const pointsTo = String(target || FALLBACK_ORIGIN).trim().toLowerCase();
  return [
    { type: 'CNAME', host: '@', pointsTo },
    { type: 'CNAME', host: 'www', pointsTo },
  ];
}

/** The `dnsTarget` block every connect response carries (and the UI renders). */
function dnsTargetBlock() {
  return {
    fallbackOrigin: FALLBACK_ORIGIN,
    // Back-compat alias: the UI used to ask for `cnameRecord`.
    cnameRecord: FALLBACK_ORIGIN,
    records: dnsRecordsFor(),
    note: ROOT_CNAME_NOTE,
  };
}
/* Pricing now lives in the domain_pricing table and is resolved by
 * services/domainPricing.js. DOMAIN_MARGIN is read only as a LAST RESORT, for
 * the case where the catalogue has not been seeded - once the table exists it is
 * the authority, and an admin can change a price without a deploy. */
const LEGACY_DOMAIN_MARGIN = Number(process.env.DOMAIN_MARGIN || 1.25);

export const domainDryRun = !(
  CLOUDFLARE_API_TOKEN && CLOUDFLARE_ZONE_ID &&
  OPENPROVIDER_USERNAME && OPENPROVIDER_PASSWORD &&
  HUBTEL_CLIENT_ID && HUBTEL_CLIENT_SECRET
);

export const openproviderConfigured = Boolean(OPENPROVIDER_USERNAME && OPENPROVIDER_PASSWORD);
export const openproviderContactConfigured = Boolean(
  OPENPROVIDER_OWNER_HANDLE && OPENPROVIDER_ADMIN_HANDLE
  && OPENPROVIDER_TECH_HANDLE && OPENPROVIDER_BILLING_HANDLE,
);
export const cloudflareConfigured = Boolean(CLOUDFLARE_API_TOKEN && CLOUDFLARE_ZONE_ID);

const cf = axios.create({
  baseURL: 'https://api.cloudflare.com/client/v4',
  timeout: 25_000,
  headers: {
    Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

/* -------------------------------------------------------------------------
 * Vercel (the fallback origin's host)
 *
 * Registered on the project so the Edge Network will complete an SSL
 * handshake for the hostname. Without it, Cloudflare's origin fetch to
 * Vercel fails the handshake and the storefront shows Error 525 - which is
 * indistinguishable, from the browser, from the domain being broken.
 * ------------------------------------------------------------------------- */
const VERCEL_AUTH_TOKEN = process.env.VERCEL_AUTH_TOKEN || '';
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || '';
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || '';

const vc = axios.create({
  baseURL: `https://api.vercel.com/v${VERCEL_API_VERSION}`,
  timeout: 25_000,
  headers: {
    Authorization: `Bearer ${VERCEL_AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// Vercel scopes every project call to a team when one is configured, via
// ?teamId=. Without it a token belonging to a team 404s on its own projects.
vc.interceptors.request.use((config) => {
  if (VERCEL_TEAM_ID) config.params = { ...config.params, teamId: VERCEL_TEAM_ID };
  return config;
});

/** Vercel is optional: without it the platform still provisions via Cloudflare. */
function vercelConfigured() {
  return Boolean(VERCEL_AUTH_TOKEN && VERCEL_PROJECT_ID);
}

let _opToken = null;
let _opTokenExpiry = 0;

async function getOpenproviderToken() {
  if (_opToken && Date.now() < _opTokenExpiry) return _opToken;
  const { data } = await axios.post(`${OPENPROVIDER_API_URL}/auth/login`, {
    ip: '0.0.0.0',
    username: OPENPROVIDER_USERNAME,
    password: OPENPROVIDER_PASSWORD,
  });
  _opToken = data?.data?.token || '';
  _opTokenExpiry = Date.now() + 3500_000;
  return _opToken;
}

const op = axios.create({
  baseURL: OPENPROVIDER_API_URL,
  timeout: 25_000,
  headers: { 'Content-Type': 'application/json' },
});

op.interceptors.request.use(async (config) => {
  const token = await getOpenproviderToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Canonical form of a merchant domain: lowercase, no scheme, no path, and no
 * leading `www.`.
 *
 * The www stripping is the fix for "connected, but Store Not Found".
 *
 * The DNS table we instruct merchants to follow points BOTH `@` and `www` at the
 * fallback origin, so both hostnames are expected to reach this platform. We
 * used to store whatever the merchant typed, which produced two failures:
 *
 *   - typed `www.mybrand.com` (the input placeholder invites exactly that):
 *     the apex `mybrand.com` - the address most visitors actually type - did
 *     not match the stored value and 404'd.
 *   - typed `mybrand.com`: the apex worked but `www.mybrand.com` 404'd.
 *
 * Storing the apex makes one canonical answer, and the www variant is served by
 * a second Cloudflare custom hostname rather than by storing a second row.
 */
export function canonicalDomain(value) {
  return String(value || '')
    .toLowerCase().trim()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
    .replace(/\.+$/, '')
    .replace(/^www\./, '');
}

/** The www sibling of an apex domain, used to register the second hostname. */
export function wwwVariantOf(value) {
  const apex = canonicalDomain(value);
  return apex ? `www.${apex}` : '';
}


/* =========================================================================
 * Flow A: Bring Your Own Domain (BYOD)
 * ========================================================================= */

/**
 * Register the `www.` sibling of an already-provisioned apex hostname.
 *
 * We instruct merchants to point BOTH `@` and `www` at the fallback origin, so
 * both hostnames are expected to serve. Cloudflare matches a custom hostname
 * literally, so without this the www hostname is proxied to the fallback origin
 * and then answered with "Storefront not found" - the exact symptom merchants
 * report, on a domain that is connected and verified.
 *
 * Best effort by design: the apex is the canonical address and is what
 * `stores.custom_domain` holds, so a www that Cloudflare refuses must not fail
 * an otherwise good provisioning. The apex still serves.
 */
async function registerWwwVariant(apex, storeId) {
  const www = wwwVariantOf(apex);
  if (!www || domainDryRun) return {};
  try {
    const { data } = await cf.post(`/zones/${CLOUDFLARE_ZONE_ID}/custom_hostnames`, {
      hostname: www,
      ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } },
    });
    return { wwwCustomHostnameId: data?.result?.id || null, wwwRegistered: Boolean(data?.success) };
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.warn(`[domain] could not register the www hostname for ${apex} (store ${storeId}):`,
      typeof detail === 'object' ? JSON.stringify(detail) : detail);
    return { wwwRegistered: false };
  }
}

export async function connectExistingDomain({ storeId, domainName }) {
  const clean = canonicalDomain(domainName);
  if (!clean) throw new Error('Domain name is required.');

  if (domainDryRun) {
    console.log(`[domain:DRY_RUN] Connect existing domain ${clean} for store ${storeId}`);
    return {
      dryRun: true,
      domainName: clean,
      status: 'PENDING_DNS',
      provider: 'EXTERNAL',
      customHostnameId: `dry-hostname-${Date.now()}`,
      verificationErrors: [],
      dnsTarget: dnsTargetBlock(),
    };
  }

  let cfResult;
  try {
    const { data } = await cf.post(`/zones/${CLOUDFLARE_ZONE_ID}/custom_hostnames`, {
      hostname: clean,
      // `http` = Cloudflare validates over HTTP once the CNAME resolves, which
      // is the only workable method here: the merchant's DNS is not set up yet.
      // `dv` = domain-validated DV cert. min_tls_version 1.2 is the floor
      // Cloudflare's edge enforces on a custom hostname.
      ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } },
    });
    cfResult = data;
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[domain] Cloudflare custom_hostname create failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    throw new Error('Failed to provision SSL hostname on Cloudflare. Please verify domain ownership and retry.');
  }

  if (!cfResult?.success) {
    const errors = cfResult?.errors?.map((e) => e.message).join('; ') || 'Unknown Cloudflare error.';
    throw new Error(`Cloudflare provisioning failed: ${errors}`);
  }

  const hostname = cfResult.result;
  return {
    domainName: clean,
    status: 'PENDING_DNS',
    provider: 'EXTERNAL',
    customHostnameId: hostname.id,
    verificationErrors: hostname.ssl?.validation_errors || [],
    dnsTarget: dnsTargetBlock(),
    ...(await registerWwwVariant(clean, storeId)),
  };
}

/**
 * Register the hostname on the Vercel project.
 *
 * Idempotent: Vercel answers 409 once the domain exists, which is success for
 * our purposes, so a retried provisioning does not fail on its own leftovers.
 */
export async function registerDomainOnVercel(domainName) {
  const clean = canonicalDomain(domainName);
  if (!vercelConfigured()) {
    console.warn('[domain] VERCEL_AUTH_TOKEN/VERCEL_PROJECT_ID unset; skipping the Vercel leg.');
    return { skipped: true, reason: 'not_configured' };
  }

  try {
    const { data } = await vc.post(`/projects/${VERCEL_PROJECT_ID}/domains`, { name: clean });
    return { domainId: data?.domain?.name || clean, raw: data };
  } catch (err) {
    // Already registered: the desired end state is already true.
    if (err.response?.status === 409 || err.response?.status === 400) {
      console.log(`[domain] ${clean} already on the Vercel project; treating as provisioned.`);
      return { domainId: clean, alreadyPresent: true };
    }
    const detail = err.response?.data || err.message;
    console.error('[domain] Vercel domain registration failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    throw new Error('We could not register your domain with our hosting provider. Please try again.');
  }
}

/** Best-effort removal, used to roll back a half-finished provisioning. */
async function removeDomainFromVercel(domainName) {
  if (!vercelConfigured()) return;
  try {
    await vc.delete(`/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(canonicalDomain(domainName))}`);
  } catch (err) {
    // Rollback is advisory: log loudly but never mask the original failure.
    console.error('[domain] rollback: could not remove the Vercel domain:', err.message);
  }
}

/** Best-effort removal of the Cloudflare custom hostname. */
async function removeCloudflareHostname(customHostnameId) {
  if (!customHostnameId || domainDryRun) return;
  try {
    await cf.delete(`/zones/${CLOUDFLARE_ZONE_ID}/custom_hostnames/${customHostnameId}`);
  } catch (err) {
    console.error('[domain] rollback: could not remove the Cloudflare hostname:', err.message);
  }
}

/**
 * Full BYOD provisioning: Vercel first, then Cloudflare, with a compensating
 * delete if the second leg fails.
 *
 * Order matters. Vercel is the cheap, idempotent leg and its failure is
 * unrecoverable for the merchant (no cert can be issued), so it runs first and
 * aborts the sequence. Cloudflare is the authoritative registrar, so if it fails
 * after Vercel succeeded we remove the Vercel entry again: a half-provisioned
 * domain that silently serves somebody else's storefront is worse than none.
 */
export async function provisionCustomDomain(domainName, storeId) {
  const clean = canonicalDomain(domainName);
  if (!clean) throw new Error('Domain name is required.');

  if (domainDryRun) {
    console.log(`[domain:DRY_RUN] Provision ${clean} for store ${storeId}`);
    return {
      dryRun: true,
      domainName: clean,
      storeId,
      status: 'PENDING_DNS',
      vercel: { dryRun: true },
      cloudflare: { dryRun: true, customHostnameId: `dry-hostname-${Date.now()}` },
      dnsTarget: dnsTargetBlock(),
      verificationErrors: [],
    };
  }

  // A. Vercel: the Edge Network must accept the hostname.
  const vercel = await registerDomainOnVercel(clean);

  // B. Cloudflare for SaaS: the authoritative custom hostname + DV cert.
  let cloudflare;
  try {
    cloudflare = await connectExistingDomain({ storeId, domainName: clean });
  } catch (err) {
    // Compensating action: do not leave the Vercel entry behind.
    await removeDomainFromVercel(clean);
    throw err;
  }

  return {
    domainName: clean,
    storeId,
    status: cloudflare.status || 'PENDING_DNS',
    vercel,
    cloudflare: {
      customHostnameId: cloudflare.customHostnameId,
      // Cloudflare issues the cert asynchronously, so it is never "active" yet
      // at this point. Surfacing 'pending' is the honest answer, and
      // /verify-status is what later reports the real outcome.
      sslStatus: 'pending',
    },
    customHostnameId: cloudflare.customHostnameId,
    verificationErrors: cloudflare.verificationErrors || [],
    dnsTarget: cloudflare.dnsTarget || dnsTargetBlock(),
  };
}

export async function verifyDomainStatus(domainName) {
  const clean = canonicalDomain(domainName);

  if (domainDryRun) {
    console.log(`[domain:DRY_RUN] Verify status for ${clean}`);
    return { domainName: clean, status: 'ACTIVE', dryRun: true };
  }

  try {
    const { data } = await cf.get(`/zones/${CLOUDFLARE_ZONE_ID}/custom_hostnames`, {
      params: { hostname: clean },
    });

    if (!data?.success || !data.result?.length) {
      return { domainName: clean, status: 'PENDING_DNS', error: 'Hostname not found in Cloudflare.' };
    }

    const hostname = data.result[0];
    const sslStatus = hostname.ssl?.status || 'pending';

    let status = 'PENDING_DNS';
    if (sslStatus === 'active' || sslStatus === 'validated') status = 'ACTIVE';
    else if (sslStatus === 'pending_validation') status = 'PENDING_DNS';
    else if (sslStatus === 'deleted') status = 'FAILED';

    return {
      domainName: clean,
      status,
      customHostnameId: hostname.id,
      ssl: { status: sslStatus, method: hostname.ssl?.method },
      verificationErrors: hostname.ssl?.validation_errors || [],
    };
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[domain] Cloudflare verify failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    throw new Error('Unable to query Cloudflare verification status.');
  }
}

/* =========================================================================
 * Flow B: Buy New Domain (Openprovider + Hubtel)
 * ========================================================================= */

export async function searchDomains(query) {
  const cleanQuery = String(query || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
  if (!cleanQuery || cleanQuery.length < 2) {
    throw new Error('Enter at least 2 characters to search.');
  }

  /* The TLD list is the platform's, not a hardcoded constant: it comes from
     domain_pricing, honouring each TLD's enabled/curated flags and the admin's
     "include all TLDs" switch. */
  const catalog = await loadPricingCatalog();
  const legacyFallback = [{ tld: 'com', is_enabled: true, is_curated: true }];
  const offered = catalog.catalogued ? catalog.tlds : legacyFallback;
  const extensions = offered.map((entry) => entry.tld);
  const markupPct = catalog.defaultMarkupPct ?? ((LEGACY_DOMAIN_MARGIN - 1) * 100);

  if (!openproviderConfigured) {
    throw Object.assign(new Error('OpenProvider domain search is not configured.'), { status: 503 });
  }

  try {
    const domainsToCheck = extensions.map((ext) => ({ name: cleanQuery, extension: ext }));
    const { data } = await op.post('/domains/check', { domains: domainsToCheck });

    if (!data?.data?.results) throw new Error('Invalid response from Openprovider.');

    return data.data.results.map((r) => {
      const extension = extensions.find((tld) => String(r.domain || '').toLowerCase().endsWith(`.${tld}`))
        || r.domain?.split('.').pop() || '';
      const row = catalog.byTld.get(extension);
      const quote = r.price?.reseller || r.price?.product || null;
      const providerCostGhs = row?.wholesale_ghs ?? providerPriceToGhs(
        quote?.price,
        quote?.currency,
        catalog.usdToGhsRate,
      );
      const priceGhs = resolveDomainPrice(row, providerCostGhs, markupPct);
      return {
        extension,
        domain: r.domain || `${cleanQuery}.${extension || 'com'}`,
        available: String(r.status).toLowerCase() === 'free' && !r.is_premium,
        premium: Boolean(r.is_premium),
        priceGhs,
        priceConfigured: Number.isFinite(priceGhs) && priceGhs > 0,
        providerPrice: quote?.price ?? null,
        providerCurrency: quote?.currency || null,
      };
    });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[domain] Openprovider search failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    throw new Error('Domain search service is temporarily unavailable. Please retry.');
  }
}

function splitDomain(domainName) {
  const clean = String(domainName || '').trim().toLowerCase();
  const tld = tldOf(clean);
  const labels = clean.split('.');
  if (!tld || clean.length > 253 || labels.some((label) => (
    label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  ))) {
    throw Object.assign(new Error('Enter a valid domain name.'), { status: 400 });
  }
  return { name: clean.slice(0, -(tld.length + 1)), extension: tld };
}

function providerQuote(result) {
  const quote = result?.price?.reseller || result?.price?.product || null;
  return {
    price: quote?.price === undefined ? null : Number(quote.price),
    currency: quote?.currency ? String(quote.currency).toUpperCase() : null,
    isPremium: Boolean(result?.is_premium),
    status: String(result?.status || '').toLowerCase(),
  };
}

export async function checkOpenproviderDomain(domainName) {
  if (!openproviderConfigured) {
    throw Object.assign(new Error('OpenProvider domain search is not configured.'), { status: 503 });
  }
  const domain = splitDomain(domainName);
  try {
    const { data } = await op.post('/domains/check', { domains: [domain] });
    const result = data?.data?.results?.[0];
    if (!result) throw new Error('Invalid response from OpenProvider.');
    return { ...providerQuote(result), domain: result.domain || domainName };
  } catch (err) {
    if (err.status) throw err;
    const detail = err.response?.data || err.message;
    console.error('[domain] OpenProvider availability check failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    throw Object.assign(new Error('Domain availability could not be verified with OpenProvider.'), { status: 503 });
  }
}

export async function fetchOpenproviderTldPrices(tlds) {
  if (!openproviderConfigured) {
    throw Object.assign(new Error('OpenProvider pricing is not configured.'), { status: 503 });
  }
  const results = [];
  const distinct = [...new Set((tlds || []).map((tld) => String(tld).toLowerCase()).filter(Boolean))];
  const probeName = `didwa${Date.now().toString(36)}`;
  for (let offset = 0; offset < distinct.length; offset += 40) {
    const batch = distinct.slice(offset, offset + 40);
    try {
      const { data } = await op.post('/domains/check', {
        domains: batch.map((extension) => ({ name: probeName, extension })),
      });
      if (!Array.isArray(data?.data?.results)) throw new Error('Invalid response from OpenProvider.');
      for (const result of data.data.results) {
        const tld = batch.find((extension) => String(result.domain || '').toLowerCase().endsWith(`.${extension}`));
        if (!tld) continue;
        const quote = providerQuote(result);
        results.push({ tld, price: quote.price, currency: quote.currency });
      }
    } catch (err) {
      const detail = err.response?.data || err.message;
      console.error('[domain] OpenProvider price refresh failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
      throw Object.assign(new Error('OpenProvider pricing is temporarily unavailable.'), { status: 503 });
    }
  }
  return results;
}

export async function initializeHubtelCheckout({ amountGhs, domainName, customerPhone, customerEmail, storeId, reference }) {
  if (!domainName || !amountGhs || !customerPhone) {
    throw new Error('Domain name, amount, and phone number are required.');
  }

  // Callers may pin the reference (an idempotent retry reuses the SAME one, so
  // a second checkout session cannot strand a second pending purchase behind a
  // second reference). Without one, a timestamp keeps each session unique.
  const checkoutRef = String(reference || '').trim() || `GSD-${storeId}-${Date.now()}`;

  if (domainDryRun) {
    console.log(`[domain:DRY_RUN] Init Hubtel checkout: ${domainName} @ GHS ${amountGhs} for ${customerPhone}`);
    return {
      dryRun: true,
      checkoutUrl: `https://checkout.hubtel.com/dry-run/${checkoutRef}`,
      checkoutId: checkoutRef,
      reference: checkoutRef,
    };
  }

  try {
    const { data } = await axios.post(
      `${HUBTEL_BASE_URL}/v2/pos/onlinecheckout/items/initiate`,
      {
        totalAmount: Number(amountGhs).toFixed(2),
        description: `Domain registration: ${domainName}`,
        callbackUrl: HUBTEL_CALLBACK_URL || undefined,
        merchantAccountNumber: process.env.HUBTEL_MERCHANT_ACCOUNT || undefined,
        cancellationUrl: `${process.env.CLIENT_URL || 'https://didwaghana.com'}/domains`,
        returnUrl: `${process.env.CLIENT_URL || 'https://didwaghana.com'}/domains`,
        clientReference: checkoutRef,
        items: [{
          name: domainName,
          quantity: 1,
          unitPrice: Number(amountGhs).toFixed(2),
          totalPrice: Number(amountGhs).toFixed(2),
        }],
        metadata: { storeId, domainName, customerEmail, customerPhone },
      },
      {
        auth: { username: HUBTEL_CLIENT_ID, password: HUBTEL_CLIENT_SECRET },
        headers: { 'Content-Type': 'application/json' },
        timeout: 25_000,
      },
    );

    return {
      checkoutUrl: data?.checkoutUrl || data?.data?.checkoutUrl || data?.response?.checkoutUrl,
      checkoutId: data?.checkoutId || data?.data?.reference || checkoutRef,
      reference: checkoutRef,
    };
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[domain] Hubtel checkout init failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    throw new Error('Failed to initialize payment gateway. Please retry.');
  }
}

/**
 * Register the domain with Openprovider and provision its Cloudflare hostname
 * + SSL after a purchase payment is CONFIRMED. Extracted from the Hubtel
 * webhook handler so the Paystack Fallback 2 callback (routes/domainRoutes.js)
 * performs exactly the same side effects - a second implementation here is how
 * the two confirmation paths would drift apart.
 *
 * The caller owns the payment guards (replay, amount, pending-row ownership);
 * this function only does the registrar + CDN work.
 *
 * @param {{domainName: string, storeId: string, metadata?: object}} args
 * @returns {Promise<{processed: boolean, dryRun?: boolean, domainName, storeId, action: string}>}
 */
export async function fulfilDomainPurchase({
  domainName, storeId, metadata = {}, providerDomainId = null, onRegistered = null,
  periodYears = 1, autoRenew = true,
}) {
  const registration = providerDomainId
    ? { providerDomainId: String(providerDomainId) }
    : await registerDomainOnOpenprovider({
      domainName,
      ownerEmail: metadata.customerEmail,
      ownerName: metadata.ownerName,
      periodYears,
      autoRenew,
    });
  if (!providerDomainId && typeof onRegistered === 'function') await onRegistered(registration);
  const provisioned = await provisionCloudflareHostname(domainName);
  return {
    processed: true,
    domainName,
    storeId,
    action: 'REGISTERED',
    providerDomainId: registration.providerDomainId,
    hostnameId: provisioned.hostnameId,
  };
}

export async function handleHubtelWebhook(payload, options = {}) {
  const status = payload?.Data?.Status || payload?.status || '';
  if (String(status).toLowerCase() !== 'success') {
    console.log('[domain] Hubtel webhook: non-success status ignored:', status);
    return { processed: false, reason: 'Not a successful transaction.' };
  }

  const reference = payload?.Data?.ClientReference || payload?.reference || '';
  const transactionId = payload?.Data?.TransactionId ?? payload?.TransactionId ?? null;
  const metadata = payload?.Data?.Metadata || payload?.metadata || {};
  const domainName = metadata.domainName || '';
  const storeId = metadata.storeId || '';

  if (!domainName || !storeId) {
    console.error('[domain] Hubtel webhook: missing domainName or storeId.', { reference });
    return { processed: false, reason: 'Missing metadata.' };
  }

  const verified = await verifyHubtelTransaction({ transactionId, reference });
  if (!verified.success) {
    console.warn(`[domain] Hubtel webhook ${reference} rejected: ${verified.message || 'Hubtel verification failed'}`);
    return { processed: false, reason: 'Transaction not confirmed by Hubtel.' };
  }

  return fulfilDomainPurchase({ domainName, storeId, metadata, ...options });
}

export async function registerDomainOnOpenprovider({
  domainName, periodYears = 1, autoRenew = false,
}) {
  if (!openproviderConfigured) {
    throw Object.assign(new Error('OpenProvider registration is not configured.'), { status: 503 });
  }
  if (!openproviderContactConfigured) {
    throw Object.assign(new Error('OpenProvider contact handles are not configured.'), { status: 503 });
  }
  const domain = splitDomain(domainName);
  try {
    const { data } = await op.post('/domains', {
      domain,
      owner_handle: OPENPROVIDER_OWNER_HANDLE,
      admin_handle: OPENPROVIDER_ADMIN_HANDLE,
      tech_handle: OPENPROVIDER_TECH_HANDLE,
      billing_handle: OPENPROVIDER_BILLING_HANDLE,
      period: periodYears,
      autorenew: autoRenew ? 'on' : 'off',
    });
    const providerDomainId = data?.data?.id;
    if (Number(data?.code) !== 0 || !providerDomainId) {
      throw new Error('OpenProvider did not confirm the domain registration.');
    }
    return { domainName, providerDomainId: String(providerDomainId), raw: data };
  } catch (err) {
    try {
      const { data } = await op.get('/domains', {
        params: {
          'domain.name': domain.name,
          'domain.extension': domain.extension,
          limit: 10,
        },
      });
      const results = Array.isArray(data?.data?.results) ? data.data.results : [];
      const existing = results.find((item) => {
        const name = item?.domain?.name ?? item?.name;
        const extension = item?.domain?.extension ?? item?.extension;
        return String(name || '').toLowerCase() === domain.name.toLowerCase()
          && String(extension || '').toLowerCase() === domain.extension.toLowerCase()
          && item?.id;
      });
      if (existing) {
        return { domainName, providerDomainId: String(existing.id), raw: data };
      }
    } catch (lookupErr) {
      console.error('[domain] Openprovider registration recovery lookup failed:', lookupErr.response?.status || lookupErr.message);
    }
    console.error('[domain] Openprovider register failed:', err.response?.status || err.message);
    throw Object.assign(new Error('Domain registration failed. Please retry or contact support.'), { status: 503 });
  }
}

export async function provisionCloudflareHostname(domainName) {
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ZONE_ID) {
    throw Object.assign(new Error('Cloudflare domain provisioning is not configured.'), { status: 503 });
  }

  try {
    const { data } = await cf.post(`/zones/${CLOUDFLARE_ZONE_ID}/custom_hostnames`, {
      hostname: domainName,
      ssl: { method: 'http', type: 'dv' },
    });
    if (data?.success !== true || !data?.result?.id) {
      throw new Error('Cloudflare did not confirm the custom hostname.');
    }
    return { hostnameId: data?.result?.id, raw: data };
  } catch (err) {
    try {
      const { data } = await cf.get(`/zones/${CLOUDFLARE_ZONE_ID}/custom_hostnames`, {
        params: { hostname: domainName },
      });
      const existing = (Array.isArray(data?.result) ? data.result : []).find(
        (item) => String(item?.hostname || '').toLowerCase() === domainName.toLowerCase() && item?.id,
      );
      if (existing) return { hostnameId: existing.id, raw: data };
    } catch (lookupErr) {
      console.error('[domain] Cloudflare hostname recovery lookup failed:', lookupErr.response?.status || lookupErr.message);
    }
    console.error('[domain] Cloudflare provision failed:', err.response?.status || err.message);
    throw new Error('SSL provisioning failed. Please retry verification.');
  }
}

export async function renewDomainOnOpenprovider({ providerDomainId, domainName, periodYears = 1 }) {
  if (!openproviderConfigured) {
    throw Object.assign(new Error('OpenProvider renewal is not configured.'), { status: 503 });
  }
  const domain = splitDomain(domainName);
  try {
    const { data } = await op.post(`/domains/${encodeURIComponent(providerDomainId)}/renew`, {
      id: Number(providerDomainId),
      domain,
      period: periodYears,
    });
    if (Number(data?.code) !== 0) throw new Error('OpenProvider did not confirm the domain renewal.');
    return { renewed: true };
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[domain] OpenProvider renewal failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    throw Object.assign(new Error('Domain renewal failed. Please retry or contact support.'), { status: 503 });
  }
}

export default {
  connectExistingDomain,
  provisionCustomDomain,
  registerDomainOnVercel,
  verifyDomainStatus,
  searchDomains,
  checkOpenproviderDomain,
  fetchOpenproviderTldPrices,
  initializeHubtelCheckout,
  handleHubtelWebhook,
  fulfilDomainPurchase,
  registerDomainOnOpenprovider,
  provisionCloudflareHostname,
  renewDomainOnOpenprovider,
  get openproviderConfigured() { return openproviderConfigured; },
  get openproviderContactConfigured() { return openproviderContactConfigured; },
  get cloudflareConfigured() { return cloudflareConfigured; },
  get dryRun() { return domainDryRun; },
  get platformDomain() { return PLATFORM_DOMAIN; },
  get cnameTarget() { return CNAME_TARGET; },
  get fallbackOrigin() { return FALLBACK_ORIGIN; },
  get vercelConfigured() { return vercelConfigured(); },
  dnsRecordsFor,
  ROOT_CNAME_NOTE,
};
