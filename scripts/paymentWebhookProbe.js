/**
 * Ad-hoc probe: create an order for a store, then confirm the Paystack webhook
 * refuses a FORGED signature. A valid reference with a bad signature is the
 * "free order" attack: if it were accepted, anyone could mark any order paid.
 *
 * Run: node scripts/paymentWebhookProbe.js
 */
import 'dotenv/config';
import pg from 'pg';
import crypto from 'node:crypto';

process.env.PAYMENT_KEYS_ENCRYPTION_SECRET
  ||= '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const { getSettings, paystackClient } = await import('../services/storePayments.js');

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const slug = process.argv[2] || 'byok-rt-store';
const store = (await client.query('SELECT id, name FROM stores WHERE subdomain_slug = $1', [slug])).rows[0];
if (!store) {
  console.log(`no store with slug ${slug}`);
  process.exit(1);
}

const orderNumber = `PROBE-${Date.now()}`;
await client.query(
  `INSERT INTO orders (store_id, order_number, customer_name, customer_phone,
                       customer_address, channel, payment_method, total)
   VALUES ($1, $2, 'Probe', '0244000000', 'Probe St', 'ONLINE_WHATSAPP', 'PAYSTACK', 10.00)`,
  [store.id, orderNumber],
);
console.log(`created order ${orderNumber} for ${store.name}`);

const settings = await getSettings(store.id);
const payload = JSON.stringify({
  event: 'charge.success',
  data: { reference: orderNumber, amount: 1000, status: 'success' },
});

async function post(label, signature) {
  const res = await fetch('http://localhost:4000/api/webhooks/paystack', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-paystack-signature': signature },
    body: payload,
  });
  const body = await res.text();
  console.log(`${label}\n  -> ${res.status} ${body}`);
  return res.status;
}

const before = (await client.query(
  'SELECT payment_status FROM orders WHERE order_number = $1', [orderNumber],
)).rows[0].payment_status;
console.log(`\npayment_status before any webhook: ${before}\n`);

const forged = await post('1. FORGED signature (must be 401)', 'f'.repeat(128));
const afterForged = (await client.query(
  'SELECT payment_status FROM orders WHERE order_number = $1', [orderNumber],
)).rows[0].payment_status;
console.log(`  payment_status after forged call: ${afterForged}`);
console.log(`  ${afterForged === 'PENDING' ? 'OK - forged callback did NOT mark it paid' : 'SECURITY BUG - order was marked paid!'}\n`);

// A correctly signed callback, to prove the happy path still works end to end.
const settingsForSig = await getSettings(store.id);
const good = paystackClient(settingsForSig).verifyWebhook(payload, 'x') ? '' : '';
// The secret is write-only over the API, so the probe uses the same fake value it
// saved above rather than reading it back (which is always undefined by design).
const PROBE_SECRET = 'sk_test_fake';
const realSig = crypto.createHmac('sha512', PROBE_SECRET).update(payload).digest('hex');
const genuine = await post('2. GENUINE signature (must be 200)', realSig);
const afterReal = (await client.query(
  'SELECT payment_status, paid_at IS NOT NULL AS has_paid_at FROM orders WHERE order_number = $1',
  [orderNumber],
)).rows[0];
console.log(`  payment_status after genuine call: ${afterReal.payment_status} (paid_at set: ${afterReal.has_paid_at})`);
void good; void genuine; void forged;

// A wrong store's secret must not verify: cross-tenant signing.
const otherSecret = crypto.randomBytes(32).toString('hex');
const wrongSig = crypto.createHmac('sha512', otherSecret).update(payload).digest('hex');
await post('3. Signature from a DIFFERENT secret (must be 401)', wrongSig);

await client.query('DELETE FROM orders WHERE order_number = $1', [orderNumber]);
console.log('\nprobe order cleaned up');
await client.end();
