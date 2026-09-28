/**
 * DiDwa - Cloudflare R2 bucket CORS policy + browser upload-path diagnostic.
 *
 * Seller images are PUT straight from the browser to
 * <account>.r2.cloudflarestorage.com, which is a DIFFERENT origin from the
 * storefront, the seller dashboard, and every shop's own domain. The browser
 * therefore has to clear a CORS preflight before the PUT is sent, and R2 only
 * answers a preflight with Access-Control-Allow-Origin when the bucket carries a
 * matching CORS rule. With no rule the upload fails before leaving the page:
 *
 *   Access to XMLHttpRequest at 'https://<bucket>.<account>.r2.cloudflarestorage.com/...'
 *   from origin 'https://www.didwaghana.com' has been blocked by CORS policy:
 *   Response to preflight request doesn't pass access control check:
 *   No 'Access-Control-Allow-Origin' header is present on the requested resource.
 *
 * Usage:
 *   node scripts/r2Cors.js                      # diagnose (default)
 *   node scripts/r2Cors.js --show               # print the bucket's policy
 *   node scripts/r2Cors.js --apply              # write the policy the app needs
 *   node scripts/r2Cors.js --origins=https://didwaghana.com,https://*.didwaghana.com
 *
 * The diagnostic signs a real PUT with the same code the API uses, sends the
 * OPTIONS preflight a browser would send, and then performs the PUT/DELETE round
 * trip - so the policy is verifiable from a terminal instead of a browser
 * console. The probe object is removed again and never lives under a store
 * prefix, so no merchant ever sees it.
 */
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import {
  DeleteObjectCommand, GetBucketCorsCommand, PutBucketCorsCommand, S3Client,
} from '@aws-sdk/client-s3';
import {
  PRESIGN_TTL_SECONDS, corsRules, presignUpload, storageConfig, storageEndpoint,
} from '../services/storage.js';

dotenv.config();

/* --------------------------------- Arguments -------------------------------- */
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const option = (name) => {
  const inline = argv.find((value) => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : null;
};

// `--origins` is applied to the environment BEFORE the policy is built, so the
// same code path signs and applies exactly what a deployment would.
const requestedOrigins = option('origins');
if (requestedOrigins) process.env.R2_ALLOWED_ORIGINS = requestedOrigins;

const config = storageConfig();
if (!config) {
  console.error('R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,');
  console.error('R2_SECRET_ACCESS_KEY and R2_BUCKET in .env first.');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: storageEndpoint(),
  credentials: {
    accessKeyId: String(process.env.R2_ACCESS_KEY_ID).trim(),
    secretAccessKey: String(process.env.R2_SECRET_ACCESS_KEY).trim(),
  },
});

let failures = 0;
function report(name, ok, detail = '') {
  if (ok) console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`);
  else { failures += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

/* --------------------------------- Policy I/O ------------------------------- */
/** The policy currently on the bucket. R2 answers 404/NoSuchCORSConfiguration. */
async function currentPolicy() {
  try {
    const { CORSRules } = await client.send(new GetBucketCorsCommand({ Bucket: config.bucket }));
    return { present: true, rules: CORSRules || [] };
  } catch (err) {
    const missing = err?.name === 'NoSuchCORSConfiguration'
      || err?.$metadata?.httpStatusCode === 404;
    if (missing) return { present: false, rules: [] };
    throw err;
  }
}

/* R2 may echo the rule back in a different key order, so the comparison is on a
   normalised projection rather than on raw JSON. */
function normalizeRules(rules) {
  return JSON.stringify((rules || []).map((rule) => ({
    AllowedOrigins: [...(rule.AllowedOrigins || [])].sort(),
    AllowedMethods: [...(rule.AllowedMethods || [])].sort(),
    AllowedHeaders: [...(rule.AllowedHeaders || [])].sort(),
    ExposeHeaders: [...(rule.ExposeHeaders || [])].sort(),
    MaxAgeSeconds: Number(rule.MaxAgeSeconds || 0),
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}

async function show() {
  const policy = await currentPolicy();
  if (!policy.present) {
    console.log(`Bucket "${config.bucket}" has NO CORS policy - browser uploads cannot work.`);
    console.log('Fix it with:  npm run r2:cors -- --apply\n');
    return policy;
  }
  console.log(`Bucket "${config.bucket}" CORS policy:`);
  console.log(`${JSON.stringify(policy.rules, null, 2)}\n`);
  return policy;
}

async function apply() {
  const rules = corsRules();
  console.log(`Applying to bucket "${config.bucket}":\n${JSON.stringify(rules, null, 2)}\n`);
  try {
    await client.send(new PutBucketCorsCommand({
      Bucket: config.bucket,
      CORSConfiguration: { CORSRules: rules },
    }));
  } catch (err) {
    console.error(`Could not write the policy through the S3 API: ${err.name} - ${err.message}`);
    console.error('\nEither paste the JSON above into Cloudflare dashboard ->');
    console.error(`R2 -> ${config.bucket} -> Settings -> CORS Policy,\n`);
    console.error('or use a token with R2 admin rights: npx wrangler r2 bucket cors put');
    // The instructions above are the report; the caller decides the exit code,
    // because process.exit() while HTTP sockets are still open trips a libuv
    // assertion on Windows.
    throw Object.assign(new Error('the bucket CORS policy could not be written'), { reported: true });
  }

  const after = await currentPolicy();
  const applied = after.present && normalizeRules(after.rules) === normalizeRules(rules);
  report('the policy is stored on the bucket', applied);
  if (!applied) {
    console.log(`Stored rules: ${JSON.stringify(after.rules)}`);
    console.log('Propagation can take up to ~30 seconds.');
  }
  console.log('\nRe-run "npm run r2:cors" to confirm the browser preflight now passes.\n');
  return applied;
}

/* -------------------------- Browser-path diagnostics ------------------------ */
/** A 1x1 transparent PNG: the smallest real image that survives a HEAD check. */
const PROBE_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
);

/** An origin a browser would really send, so the preflight is representative. */
function probeOrigin() {
  const origins = corsRules()[0].AllowedOrigins;
  if (origins.includes('*')) return process.env.R2_CHECK_ORIGIN || 'https://www.didwaghana.com';
  const concrete = origins.find((origin) => !origin.includes('*'));
  return concrete || origins[0].replace('*', 'probe');
}

async function check() {
  const origin = probeOrigin();
  const policy = await show();

  report('the bucket has a CORS policy', policy.present,
    policy.present ? '' : 'without one every preflight is refused');

  const probeKey = `diagnostics/cors-probe-${crypto.randomUUID()}.png`;
  console.log(`Signing a probe PUT as origin ${origin} ...`);
  const uploadUrl = await presignUpload({ key: probeKey, contentType: 'image/png' });
  const signed = new URL(uploadUrl);

  /* A signed URL is only usable by a browser if it contains nothing the browser
     cannot reproduce: a pinned checksum (the SDK's WHEN_SUPPORTED default) makes
     R2 reject the real bytes. */
  const checksumParams = [...signed.searchParams.keys()].filter((key) => /checksum/i.test(key));
  report('the signed URL carries no body checksum', checksumParams.length === 0,
    checksumParams.join(', ') || 'the browser can send the bytes as-is');
  report('the signature expires in 15 minutes',
    signed.searchParams.get('X-Amz-Expires') === String(PRESIGN_TTL_SECONDS));

  // Exactly what a browser sends before a cross-origin PUT: no body, plus the
  // Origin, the method and the headers it intends to use.
  const preflight = await fetch(uploadUrl, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  const allowOrigin = preflight.headers.get('access-control-allow-origin');
  const allowMethods = preflight.headers.get('access-control-allow-methods');
  report('the preflight returns Access-Control-Allow-Origin', Boolean(allowOrigin),
    allowOrigin
      ? `${preflight.status} allow-origin=${allowOrigin}${allowMethods ? `, methods=${allowMethods}` : ''}`
      : `${preflight.status} - the browser blocks the PUT here`);

  let uploaded = false;
  try {
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png', Origin: origin },
      body: PROBE_BYTES,
    });
    uploaded = put.ok;
    const body = put.ok ? '' : String(await put.text()).slice(0, 300);
    report('the signed PUT stores the object', put.ok, put.ok ? `HTTP ${put.status}` : `HTTP ${put.status} ${body}`);
  } finally {
    // Always clean up: a diagnostic must not leave objects in the bucket.
    if (uploaded) {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: probeKey })).catch(() => {});
      console.log('  (probe object deleted)');
    }
  }
}

/* ----------------------------------- Main ----------------------------------- */
console.log(`\nDiDwa media storage -> ${storageEndpoint()} (bucket ${config.bucket})\n`);
let exitCode = 0;
try {
  if (flag('apply')) {
    exitCode = (await apply()) ? 0 : 1;
  } else if (flag('show')) {
    await show();
  } else {
    await check();
    if (failures) {
      exitCode = 1;
      console.log('\nFailing checks mean merchant uploads are broken in the browser.');
      console.log('Apply the policy with:  npm run r2:cors -- --apply\n');
    }
  }
} catch (err) {
  exitCode = 1;
  if (!err?.reported) console.error(`\nr2:cors failed: ${err.message}`);
  if (err?.name === 'AccessDenied' || err?.name === 'SignatureDoesNotMatch') {
    console.error('The R2 access key cannot read or write bucket configuration.');
    console.error('Create an "Admin Read & Write" token, or set the policy in the dashboard.');
  }
}

// Release the keep-alive sockets and let Node exit on its own: process.exit()
// with a request still in flight trips a libuv assertion on Windows.
await client.destroy();
console.log(`\n===== RESULT: ${exitCode === 0 ? 'all checks passed' : 'checks failed'} =====\n`);
process.exitCode = exitCode;
