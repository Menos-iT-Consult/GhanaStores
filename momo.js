import 'dotenv/config';
import crypto from 'node:crypto';
import axios from 'axios';

// Hosts per environment. These MUST match the environment your Subscription Key
// belongs to, or MTN answers with an opaque 401/403.
const HOSTS = {
  sandbox: 'https://sandbox.momodeveloper.mtn.com',
  production: 'https://proxy.momoapi.mtn.com',
};

/** Parse argv: first bare token = key, flags configure the rest. */
function parseArgs(argv) {
  const args = { subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY || '', env: 'sandbox', callbackHost: '' };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i += 1) {
    const a = rest[i];
    if (a === '--sandbox') args.env = 'sandbox';
    else if (a === '--production' || a === '--prod') args.env = 'production';
    else if (a === '--callback-host') { args.callbackHost = rest[i + 1]; i += 1; }
    else if (a === '--help' || a === '-h') { args.help = true; }
    else if (!a.startsWith('--')) args.subscriptionKey = a;
  }
  return args;
}

/** Derive a bare callback host (MTN rejects a URL with scheme/path here). */
function resolveCallbackHost(raw) {
  const value = raw || process.env.MTN_MOMO_CALLBACK_URL || '';
  if (!value) return 'webhook.site';
  return value.replace(/^https?:\/\//i, '').split('/')[0] || 'webhook.site';
}

/**
 * Turn an MTN/axios failure into one line a human can act on. MTN replies with
 * JSON `{ code, message }` (sometimes plain text); a wrong host answers with the
 * developer portal's HTML, which must never be shown verbatim.
 */
function describeMtnError(err) {
  const status = err.response?.status;
  const data = err.response?.data;
  const dataText = typeof data === 'string' ? data : JSON.stringify(data || '');
  const detail = (data?.message || data?.Message || (dataText ? dataText.slice(0, 300) : err.message));
  if (status === 401) return `MTN rejected the Subscription Key (HTTP 401). Confirm it is a ${args.env.toUpperCase()} key for this host.`;
  if (status === 403) return 'MTN refused the key (HTTP 403). The key likely lacks the Collections product for this environment.';
  return `MTN error${status ? ` (HTTP ${status})` : ''}: ${detail}`;
}

const args = parseArgs(process.argv);

if (args.help || !args.subscriptionKey) {
  console.log(`
MTN MoMo credential provisioning

  Usage: node momo.js <PRIMARY_SUBSCRIPTION_KEY> [--sandbox|--production] [--callback-host host]

  The key can also come from MTN_MOMO_SUBSCRIPTION_KEY in .env.
  Defaults to --sandbox. --production prints the MTN Partner Portal steps
  (live API User + Key are portal-issued, not self-serve) instead of
  calling the API.
`);
  process.exit(args.help ? 0 : 1);
}

const baseUrl = HOSTS[args.env];
const callbackHost = resolveCallbackHost(args.callbackHost);
const userId = crypto.randomUUID(); // MTN requires a UUIDv4 X-Reference-Id.

const http = axios.create({
  baseURL: baseUrl,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Production API User + Key are issued by MTN through the Partner Portal,
 * NOT via a self-serve API call. POST /v1_0/apiuser returns 404 on the
 * production host by design, so this script must never fire that request in
 * production. Instead we print the exact manual steps.
 */
function printProductionPartnerPortalGuide() {
  console.log(`
Production MoMo credentials are issued through the MTN PARTNER PORTAL,
not via a self-serve API call. POST /v1_0/apiuser returns 404 on the
production host (proxy.momoapi.mtn.com) by design - so this script will
not try. Instead:

  1. Get Partner Portal access from your MTN account manager.
     (Country-specific URL, e.g. https://mobilemoney.mtn.co.ug for Uganda;
      MTN issues your login + an OTP to a registered SIM.)

  2. Profile menu -> API Access -> "Create API User".
     In the popup choose your Account, then:
       - Provider Callback Host = a BARE domain (e.g. didwaghana.com)
         [no scheme, no path]
       - Payment Server URL = the FULL callback path
         (e.g. https://didwaghana.com/api/webhooks/hubtel)

  3. Click OK. The popup shows:
       - API User  (a UUID)  -> MTN_MOMO_COLLECTION_USER_ID
       - API Key   (secret)  -> MTN_MOMO_COLLECTION_API_KEY
     Save the API Key immediately; it is shown once.

  4. Subscription Key comes separately from the production developer portal
     (https://momoapi.mtn.com) after KYC. It MUST be a PRODUCTION
     Collections key - a sandbox key against the production URL is the
     usual cause of the opaque HTTP 401 we saw earlier.

Then paste these into .env and restart the server:

  MTN_MOMO_BASE_URL=https://proxy.momoapi.mtn.com
  MTN_MOMO_TARGET_ENVIRONMENT=mtnghana
  MTN_MOMO_SUBSCRIPTION_KEY=<production Collections key>
  MTN_MOMO_COLLECTION_USER_ID=<UUID from the popup>
  MTN_MOMO_COLLECTION_API_KEY=<API Key from the popup>
`);
}

async function main() {
  // Production API Users are NOT self-serve: POST /v1_0/apiuser 404s on the
  // production host by design. Print the Partner Portal steps and exit
  // cleanly instead of firing a doomed request.
  if (args.env === 'production') {
    printProductionPartnerPortalGuide();
    process.exit(0);
  }

  console.log(`\nProvisioning MTN MoMo ${args.env} credentials`);
  console.log(`  host:     ${baseUrl}`);
  console.log(`  api user: ${userId}`);

  // Step A: create the API User. 201 = created.
  console.log('\n[1/2] Creating API User...');
  try {
    await http.post('/v1_0/apiuser', { providerCallbackHost: callbackHost }, {
      headers: { 'X-Reference-Id': userId, 'Ocp-Apim-Subscription-Key': args.subscriptionKey },
    });
  } catch (err) {
    if (err.response?.status !== 201) {
      console.error('\nAPI User creation failed:', describeMtnError(err));
      process.exit(1);
    }
  }
  console.log('      OK - API User created.');

  // Step B: mint the API Key for that user. 201 + { apiKey } on success.
  console.log('[2/2] Generating API Key...');
  let apiKey;
  try {
    const { data } = await http.post(`/v1_0/apiuser/${userId}/apikey`, {}, {
      headers: { 'Ocp-Apim-Subscription-Key': args.subscriptionKey },
    });
    apiKey = data?.apiKey;
    if (!apiKey) throw new Error('Response contained no apiKey.');
  } catch (err) {
    console.error('\nAPI Key generation failed:', err.response ? describeMtnError(err) : err.message);
    process.exit(1);
  }
  console.log('      OK - API Key generated.');

  // Success: print the exact .env block the service reads. Nothing is written to disk.
  console.log('\n======================================================');
  console.log(' SUCCESS! Copy these exact values into your .env file:');
  console.log('======================================================\n');
  console.log(`MTN_MOMO_BASE_URL=${baseUrl}`);
  console.log(`MTN_MOMO_TARGET_ENVIRONMENT=${args.env === 'production' ? 'mtnghana' : 'sandbox'}`);
  console.log(`MTN_MOMO_SUBSCRIPTION_KEY=${args.subscriptionKey}`);
  console.log(`MTN_MOMO_COLLECTION_USER_ID=${userId}`);
  console.log(`MTN_MOMO_COLLECTION_API_KEY=${apiKey}\n`);
  console.log('Note: the Subscription Key is environment-specific. These values work only');
  console.log(`against the ${args.env} host above. Keep the API Key private.\n`);
}

main();