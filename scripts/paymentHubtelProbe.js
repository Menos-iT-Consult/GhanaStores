/**
 * Fail-closed proof for the Hubtel webhook path.
 *
 * Hubtel does NOT sign its callbacks, so an unsigned "success" payload is a
 * self-asserted claim. Before the fix these were accepted and marked the order
 * PAID - a free-order attack. Now the handler must go to Hubtel's own status API
 * and only settle when Hubtel confirms the payment.
 *
 * Driven over HTTP so the request runs in the server process, which holds the
 * encryption key for the store's stored credentials.
 *
 * Run: node scripts/paymentHubtelProbe.js
 */
import 'dotenv/config';
import pg from 'pg';

const BASE = process.env.PROBE_BASE || 'http://localhost:4000';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const order = (await client.query(
  `SELECT order_number, status, payment_status, total
     FROM orders WHERE payment_method = 'HUBTEL' ORDER BY created_at DESC LIMIT 1`,
)).rows[0];
if (!order) {
  console.log('no HUBTEL order to probe - run: node scripts/checkoutProbe.js <slug> HUBTEL');
  process.exit(1);
}
const ref = order.order_number;
console.log(`order : ${ref}  total ${order.total}  ${order.status}/${order.payment_status}\n`);

const attempt = async (label, payload, signature = null) => {
  const before = (await client.query(
    'SELECT payment_status FROM orders WHERE order_number = $1', [ref],
  )).rows[0].payment_status;
  const res = await fetch(`${BASE}/api/webhooks/hubtel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(signature ? { 'x-hubtel-signature': signature } : {}) },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  const after = (await client.query(
    'SELECT payment_status FROM orders WHERE order_number = $1', [ref],
  )).rows[0].payment_status;
  const settled = after === 'PAID' && before !== 'PAID';
  console.log(`${settled ? 'BREACH' : 'ok    '}  ${label}\n          -> ${res.status} ${body.slice(0, 120)}`);
  return settled;
};

const claim = {
  ClientReference: ref,
  Status: 'Success',
  ResponseCode: '0000',
  Amount: Number(order.total),
};

let breached = false;
breached ||= await attempt('unsigned success payload (free-order attack)', { ...claim, TransactionId: 'TXN-FAKE-1' });
breached ||= await attempt('unsigned success, no transaction id to verify', { ...claim });
breached ||= await attempt('forged signature header', { ...claim, TransactionId: 'TXN-FAKE-2' }, 'deadbeef'.repeat(16));

const final = (await client.query(
  'SELECT payment_status FROM orders WHERE order_number = $1', [ref],
)).rows[0].payment_status;
console.log(`\norder is still ${final}; no forged callback settled it.`);
console.log(`VERDICT: ${breached ? 'FREE ORDER ACCEPTED - VULNERABLE' : 'fail-closed'}`);
await client.end();
process.exit(breached ? 1 : 0);
