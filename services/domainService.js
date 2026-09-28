/**
 * DiDwa - Unified Domain Acquisition Service
 * Flow A: Bring Your Own Domain (Cloudflare for SaaS custom hostnames)
 * Flow B: Buy New Domain (Openprovider + Hubtel MoMo/Card checkout)
 *
 * DRY_RUN mode activates automatically when credentials are missing,
 * returning deterministic simulated results so the full domain flow
 * remains demoable without live keys.
 */
import axios from 'axios';
import { loadPricingCatalog, resolveDomainPrice } from './domainPricing.js';

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || '';

const OPENPROVIDER_API_URL = process.env.OPENPROVIDER_API_URL || 'https://api.openprovider.eu/v1';
const OPENPROVIDER_USERNAME = process.env.OPENPROVIDER_USERNAME || '';
const OPENPROVIDER_PASSWORD = process.env.OPENPROVIDER_PASSWORD || '';

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

  if (domainDryRun) {
    console.log(`[domain:DRY_RUN] Search domains for "${cleanQuery}" across ${extensions.length} TLDs`);
    return extensions.map((ext, i) => {
      const wholesale = 120 * (i + 1);
      return {
        extension: ext,
        domain: `${cleanQuery}.${ext}`,
        available: i % 2 === 0,
        priceGhs: resolveDomainPrice(catalog.byTld.get(ext) || { wholesale_ghs: wholesale }, wholesale, markupPct),
        priceOriginal: wholesale,
        dryRun: true,
      };
    });
  }

  try {
    const domainsToCheck = extensions.map((ext) => ({ name: cleanQuery, extension: ext }));
    const { data } = await op.post('/domains/check', { domains: domainsToCheck });

    if (!data?.data?.results) throw new Error('Invalid response from Openprovider.');

    return data.data.results.map((r) => {
      const wholesale = Number(r.price?.product?.price || 0);
      const extension = r.domain?.split('.').pop() || '';
      const row = catalog.byTld.get(extension);
      return {
        extension,
        domain: r.domain || `${cleanQuery}.${extension || 'com'}`,
        available: r.status === 'active' || r.status === 'free',
        priceGhs: resolveDomainPrice(row, wholesale || undefined, markupPct),
        priceOriginal: wholesale,
      };
    });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[domain] Openprovider search failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    throw new Error('Domain search service is temporarily unavailable. Please retry.');
  }
}

export async function initializeHubtelCheckout({ amountGhs, domainName, customerPhone, customerEmail, storeId }) {
  if (!domainName || !amountGhs || !customerPhone) {
    throw new Error('Domain name, amount, and phone number are required.');
  }

  const reference = `GSD-${storeId}-${Date.now()}`;

  if (domainDryRun) {
    console.log(`[domain:DRY_RUN] Init Hubtel checkout: ${domainName} @ GHS ${amountGhs} for ${customerPhone}`);
    return {
      dryRun: true,
      checkoutUrl: `https://checkout.hubtel.com/dry-run/${reference}`,
      checkoutId: reference,
      reference,
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
        clientReference: reference,
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
      checkoutId: data?.checkoutId || data?.data?.reference || reference,
      reference,
    };
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[domain] Hubtel checkout init failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    throw new Error('Failed to initialize payment gateway. Please retry.');
  }
}

export async function handleHubtelWebhook(payload) {
  const status = payload?.Data?.Status || payload?.status || '';
  if (String(status).toLowerCase() !== 'success') {
    console.log('[domain] Hubtel webhook: non-success status ignored:', status);
    return { processed: false, reason: 'Not a successful transaction.' };
  }

  const reference = payload?.Data?.ClientReference || payload?.reference || '';
  const metadata = payload?.Data?.Metadata || payload?.metadata || {};
  const domainName = metadata.domainName || '';
  const storeId = metadata.storeId || '';

  if (!domainName || !storeId) {
    console.error('[domain] Hubtel webhook: missing domainName or storeId.', { reference });
    return { processed: false, reason: 'Missing metadata.' };
  }

  if (domainDryRun) {
    console.log(`[domain:DRY_RUN] Webhook auto-register ${domainName} for store ${storeId}`);
    return { processed: true, dryRun: true, domainName, storeId, action: 'REGISTERED' };
  }

  try {
    await op.post('/domains', {
      owner: {
        first_name: metadata.ownerName || 'Ghana',
        last_name: metadata.ownerName || 'Stores',
        email: metadata.customerEmail || `admin@${domainName}`,
      },
      name: domainName,
      period: 1,
      auto_renew: true,
    });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[domain] Openprovider registration failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
  }

  try {
    await cf.post(`/zones/${CLOUDFLARE_ZONE_ID}/custom_hostnames`, {
      hostname: domainName,
      ssl: { method: 'http', type: 'dv' },
    });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[domain] Cloudflare provision after webhook failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
  }

  return { processed: true, domainName, storeId, action: 'REGISTERED' };
}

export async function registerDomainOnOpenprovider({ domainName, ownerEmail, ownerName }) {
  if (domainDryRun) {
    console.log(`[domain:DRY_RUN] Register ${domainName} on Openprovider`);
    return { dryRun: true, domainName, orderId: `dry-op-${Date.now()}` };
  }

  try {
    const { data } = await op.post('/domains', {
      owner: {
        first_name: ownerName || 'Ghana',
        last_name: ownerName || 'Stores',
        email: ownerEmail || `admin@${domainName}`,
      },
      name: domainName,
      period: 1,
      auto_renew: true,
    });
    return { domainName, orderId: data?.data?.id || null, raw: data };
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[domain] Openprovider register failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    throw new Error('Domain registration failed. Please contact support.');
  }
}

export async function provisionCloudflareHostname(domainName) {
  if (domainDryRun) {
    console.log(`[domain:DRY_RUN] Provision Cloudflare hostname ${domainName}`);
    return { dryRun: true, hostnameId: `dry-cf-${Date.now()}` };
  }

  try {
    const { data } = await cf.post(`/zones/${CLOUDFLARE_ZONE_ID}/custom_hostnames`, {
      hostname: domainName,
      ssl: { method: 'http', type: 'dv' },
    });
    return { hostnameId: data?.result?.id, raw: data };
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[domain] Cloudflare provision failed:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    throw new Error('SSL provisioning failed. Please retry verification.');
  }
}

export default {
  connectExistingDomain,
  provisionCustomDomain,
  registerDomainOnVercel,
  verifyDomainStatus,
  searchDomains,
  initializeHubtelCheckout,
  handleHubtelWebhook,
  registerDomainOnOpenprovider,
  provisionCloudflareHostname,
  get dryRun() { return domainDryRun; },
  get platformDomain() { return PLATFORM_DOMAIN; },
  get cnameTarget() { return CNAME_TARGET; },
  get fallbackOrigin() { return FALLBACK_ORIGIN; },
  get vercelConfigured() { return vercelConfigured(); },
  dnsRecordsFor,
  ROOT_CNAME_NOTE,
};
