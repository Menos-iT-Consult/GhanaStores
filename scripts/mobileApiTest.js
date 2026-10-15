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

/* ----------------------------- v1.1 expansion ------------------------------- */
test('v1.1 endpoints exist: dashboard, analytics, POS, catalog, customers, receipt', () => {
  const src = read('routes/mobileRoutes.js');
  for (const route of [
    "router.get('/dashboard/full'",
    "router.get('/analytics/top'",
    "router.post('/pos/sales'",
    "router.get('/pos/loyalty/:phone'",
    "router.post('/products'",
    "router.put('/products/:id'",
    "router.post('/uploads/presign'",
    "router.post('/uploads/confirm'",
    "router.get('/customers'",
    "router.get('/orders/:id/receipt'",
  ]) {
    assert.ok(src.includes(route), `missing ${route}`);
  }
});

test('every mobile v1 route sits behind authenticateMobileToken', () => {
  const routeLines = read('routes/mobileRoutes.js')
    .split(/\r?\n/)
    .filter((l) => /^router\.(get|post|patch|put|delete)\(/.test(l));
  assert.ok(routeLines.length >= 19, `expected the full route set, saw ${routeLines.length}`);
  const unprotected = routeLines.filter((l) => !l.includes('authenticateMobileToken'));
  assert.deepEqual(unprotected, [], `routes missing auth: ${unprotected.join(' | ')}`);
});

test('v1.1 wraps the shared engines instead of duplicating logic', () => {
  const src = read('routes/mobileRoutes.js');
  assert.ok(src.includes("import { getDashboardFull, getTopProducts } from './analyticsRoutes.js'"));
  assert.ok(/import \{[\s\S]*?adjustVariantStockHandler[\s\S]*?\} from '\.\/inventoryRoutes\.js'/.test(src));
  assert.ok(src.includes("import { presignHandler, confirmHandler } from './uploadRoutes.js'"));
  assert.ok(src.includes("import { loyaltyLookupHandler } from './posRoutes.js'"));
  assert.ok(src.includes("import { runPosSale } from '../services/posSaleService.js'"));
  assert.ok(src.includes("import { streamOrderPdf } from './whatsappInvoiceRoutes.js'"));

  const analytics = read('routes/analyticsRoutes.js');
  assert.ok(analytics.includes('export async function getDashboardFull'));
  assert.ok(analytics.includes('export async function getTopProducts'));
  const inventory = read('routes/inventoryRoutes.js');
  assert.ok(inventory.includes('export async function createProductForStore'));
  assert.ok(inventory.includes('export async function updateProductForStore'));
  assert.ok(inventory.includes('export async function adjustVariantStockHandler'));
  // PWA keeps its own thin wrapper over the extracted handler.
  assert.ok(inventory.includes("router.patch('/variants/:id/stock', requireSeller, adjustVariantStockHandler)"));
  // Mobile mounts the identical handler behind its own auth.
  assert.ok(src.includes("router.patch('/variants/:id/stock', authenticateMobileToken, adjustVariantStockHandler)"));
  const uploads = read('routes/uploadRoutes.js');
  assert.ok(uploads.includes('export async function presignHandler'));
  assert.ok(uploads.includes('export async function confirmHandler'));
  const pos = read('routes/posRoutes.js');
  assert.ok(pos.includes('export async function loyaltyLookupHandler'));
  // PWA routes stay mounted as thin wrappers over the same symbols.
  assert.ok(pos.includes("router.post('/sales', requireActiveSeller"));
  assert.ok(analytics.includes('router.get(\'/dashboard/full\'') === false ||
            analytics.includes('getDashboardFull('), 'PWA dashboard must call the shared engine');
});

test('POS sale route is idempotency-ready and operationally gated', () => {
  const src = read('routes/mobileRoutes.js');
  const posLine = src.split(/\r?\n/).find((l) => l.includes("router.post('/pos/sales'"));
  assert.ok(posLine, 'pos sales route missing');
  assert.ok(posLine.includes('requireOperationalStore'), 'operational/billing gate missing');
  assert.ok(src.includes('await runPosSale({'), 'must delegate to the shared sale engine');

  const svc = read('services/posSaleService.js');
  assert.ok(svc.includes('export async function runPosSale'));
  assert.ok(svc.includes('idempotencyKey'), 'sale replay guard missing');
  assert.ok(svc.includes('client_reference'), 'saleId must land in orders.client_reference');
});

test('order detail ships line items and the receipt stream is shared', () => {
  const src = read('routes/mobileRoutes.js');
  assert.ok(src.includes('FROM order_items'), 'order items not fetched with the order');
  assert.ok(src.includes('lineTotal: Number(i.line_total)'), 'items not shaped for the app');
  const wa = read('routes/whatsappInvoiceRoutes.js');
  assert.ok(wa.includes('export async function streamOrderPdf'), 'receipt stream not exported');
});

test('customers feed is store-scoped, searchable and paginated', () => {
  const src = read('routes/mobileRoutes.js');
  assert.ok(src.includes('FROM customers c'), 'customers query missing');
  assert.ok(src.includes('c.store_id = $1'), 'customers must be store-scoped');
  assert.ok(src.includes('ILIKE'), 'phone/name search missing');
  assert.ok(src.includes('OFFSET $'), 'pagination missing');
});

/* ---------------------------------- Report -------------------------------- */
if (failed > 0) {
  console.log(`\n${passed} passed, ${failed} FAILED`);
  process.exit(1);
}
console.log(`\nAll ${passed} checks passed.`);

