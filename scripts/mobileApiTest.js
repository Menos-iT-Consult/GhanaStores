/**
 * DiDwa - Mobile App API test (logic + wiring; no DB required).
 *
 * Verifies the pure helpers (filter mapping, token validation, JWT claims) and
 * that the routes, schema, server mounts and push integrations are wired
 * exactly as the mobile contract expects. Mirrors the other scripts/*Test.js
 * suite: fast, deterministic, no live Postgres needed.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';

import { orderFilterToStatuses } from '../routes/mobileRoutes.js';
import { isExpoPushToken } from '../routes/mobileDeviceRoutes.js';
import { EXPO_PUSH_URL, sendMerchantPushNotification } from '../services/pushService.js';
import { issueMobileAccessToken, authenticateMobileToken } from '../middleware/authMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok   - ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL - ${name}\n         ${err.message}`);
  }
}

console.log('DiDwa Mobile App API\n');

/* --------------------------------- Helpers -------------------------------- */
test('order filters map to canonical statuses (case-insensitive)', () => {
  assert.deepEqual(orderFilterToStatuses('pending'), ['PENDING']);
  assert.deepEqual(orderFilterToStatuses('dispatched'), ['PAID', 'FULFILLED']);
  assert.deepEqual(orderFilterToStatuses('completed'), ['DELIVERED']);
  assert.equal(orderFilterToStatuses('all'), null);
  assert.deepEqual(orderFilterToStatuses('PENDING'), ['PENDING']);
  assert.equal(orderFilterToStatuses(undefined), null);
  assert.equal(orderFilterToStatuses('bogus'), null);
});

test('expo push token validation accepts only Expo tokens', () => {
  assert.equal(isExpoPushToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'), true);
  assert.equal(isExpoPushToken('ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]'), true);
  assert.equal(isExpoPushToken('  ExponentPushToken[abc]  '), true);
  assert.equal(isExpoPushToken('nope'), false);
  assert.equal(isExpoPushToken(''), false);
  assert.equal(isExpoPushToken(null), false);
});

test('mobile access token carries { userId, storeId, role } + typ tag', () => {
  const token = issueMobileAccessToken({ id: 'store-123', email: 'a@b.c' });
  const decoded = jwt.decode(token);
  assert.equal(decoded.sub, 'store-123');
  assert.equal(decoded.userId, 'store-123');
  assert.equal(decoded.storeId, 'store-123');
  assert.equal(decoded.role, 'SELLER');
  assert.equal(decoded.typ, 'mobile-access');
});

test('auth middleware + push service export the expected symbols', () => {
  assert.equal(typeof authenticateMobileToken, 'function');
  assert.equal(typeof sendMerchantPushNotification, 'function');
  assert.equal(EXPO_PUSH_URL, 'https://exp.host/--/api/v2/push/send');
});

/* ---------------------------------- Wiring -------------------------------- */
test('schema defines device + refresh token tables (cascade)', () => {
  const schema = read('db/schema.sql');
  assert.ok(schema.includes('CREATE TABLE IF NOT EXISTS device_tokens'));
  assert.ok(schema.includes('CREATE TABLE IF NOT EXISTS mobile_refresh_tokens'));
  assert.ok(schema.includes('expo_push_token'));
  assert.ok(schema.includes("CHECK (platform IN ('ios','android'))"));
  assert.ok(schema.includes('REFERENCES stores(id) ON DELETE CASCADE'));
});

test('server mounts the three mobile routers', () => {
  const server = read('server.js');
  assert.ok(server.includes("app.use('/api/mobile/auth'"));
  assert.ok(server.includes("app.use('/api/mobile/devices'"));
  assert.ok(server.includes("app.use('/api/mobile/v1'"));
  assert.ok(server.includes('mobileAuthRoutes'));
  assert.ok(server.includes('mobileDeviceRoutes'));
  assert.ok(server.includes('mobileRoutes'));
});

test('mobile auth routes expose login / 2fa / refresh / logout', () => {
  const src = read('routes/mobileAuthRoutes.js');
  assert.ok(src.includes("router.post('/login'"));
  assert.ok(src.includes("router.post('/login/2fa'"));
  assert.ok(src.includes("router.post('/refresh'"));
  assert.ok(src.includes("router.post('/logout'"));
  assert.ok(src.includes('hashToken'));          // refresh tokens hashed at rest
  assert.ok(src.includes('revoked_at = NOW()')); // single-use rotation
});

test('mobile v1 routes expose the required endpoints', () => {
  const src = read('routes/mobileRoutes.js');
  for (const route of [
    "router.get('/dashboard/stats'",
    "router.get('/orders'",
    "router.patch('/orders/:id/status'",
    "router.get('/products'",
    "router.patch('/products/:id/stock'",
    "router.get('/settings/payment-keys'",
    "router.post('/settings/payment-keys'",
  ]) {
    assert.ok(src.includes(route), `missing ${route}`);
  }
});

test('device routes register + unregister the expo token', () => {
  const src = read('routes/mobileDeviceRoutes.js');
  assert.ok(src.includes("router.post('/register'"));
  assert.ok(src.includes("router.delete('/unregister'"));
  assert.ok(src.includes('ON CONFLICT (expo_push_token)'));
});

test('push notifications wired into order creation + payment webhooks', () => {
  const orders = read('routes/orderRoutes.js');
  assert.ok(orders.includes("from '../services/pushService.js'"));
  assert.ok(orders.includes('sendMerchantPushNotification('));
  assert.ok(orders.includes("title: 'New Order'"));

  const webhooks = read('services/paymentWebhooks.js');
  assert.ok(webhooks.includes("from './pushService.js'"));
  assert.ok(webhooks.includes('sendMerchantPushNotification('));
  assert.ok(webhooks.includes("title: 'Payment received'"));
});

/* ---------------------------------- Report -------------------------------- */
if (failed > 0) {
  console.log(`\n${passed} passed, ${failed} FAILED`);
  process.exit(1);
}
console.log(`\nAll ${passed} checks passed.`);

