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
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isExpoPushToken,
  isNotificationPreferences,
} from '../routes/mobileDeviceRoutes.js';
import {
  chunkExpoMessages,
  EXPO_PUSH_URL,
  notificationCategory,
  shouldSendPushNotification,
  sendMerchantPushNotification,
  summarizeExpoTickets,
} from '../services/pushService.js';
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

test('notification preferences validate and map delivery types to categories', () => {
  assert.deepEqual(DEFAULT_NOTIFICATION_PREFERENCES, {
    orders: true,
    payments: true,
    stock: true,
    account: true,
  });
  assert.equal(isNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES), true);
  assert.equal(isNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, orders: 'yes' }), false);
  assert.equal(isNotificationPreferences([]), false);
  assert.equal(notificationCategory('order_created'), 'orders');
  assert.equal(notificationCategory('order_status'), 'orders');
  assert.equal(notificationCategory('payment_received'), 'payments');
  assert.equal(notificationCategory('low_stock'), 'stock');
  assert.equal(notificationCategory('security'), 'account');
  const ordersMuted = { ...DEFAULT_NOTIFICATION_PREFERENCES, orders: false };
  assert.equal(shouldSendPushNotification(ordersMuted, 'order_created'), false);
  assert.equal(shouldSendPushNotification(ordersMuted, 'payment_received'), true);
  assert.equal(shouldSendPushNotification(DEFAULT_NOTIFICATION_PREFERENCES, 'low_stock'), true);
});

test('Expo push sends are batched and per-device tickets are accounted for', () => {
  const messages = Array.from({ length: 205 }, (_, i) => ({ to: `token-${i}` }));
  assert.deepEqual(chunkExpoMessages(messages).map((batch) => batch.length), [100, 100, 5]);
  assert.deepEqual(chunkExpoMessages([]), []);
  assert.throws(() => chunkExpoMessages(messages, 0), RangeError);

  const summary = summarizeExpoTickets(
    ['valid-token', 'revoked-token', 'rejected-token'],
    [
      { status: 'ok', id: 'ticket-1' },
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
      { status: 'error', details: { error: 'MessageTooBig' } },
    ],
  );
  assert.deepEqual(summary, {
    acceptedTokens: ['valid-token'],
    invalidTokens: ['revoked-token'],
    failed: 2,
  });
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
  assert.ok(src.includes("router.get('/preferences', authenticateMobileToken"));
  assert.ok(src.includes("router.put('/preferences', authenticateMobileToken"));
  assert.ok(src.includes('notification_preferences = $4::jsonb'));
  const schema = read('db/schema.sql');
  assert.ok(schema.includes('notification_preferences JSONB NOT NULL'));
  const settings = read('mobile/app/settings.tsx');
  assert.ok(settings.includes('Alerts on this device'));
  assert.ok(settings.includes('saveDeviceNotificationPreferences'));
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

test('store profile editing and verified account-contact routes are wired', () => {
  const routes = read('routes/siteSettingsRoutes.js');
  const profile = read('mobile/app/settings/profile.tsx');
  const settings = read('mobile/app/settings.tsx');
  assert.ok(routes.includes("router.get('/profile', requireSeller"));
  assert.ok(routes.includes("router.patch('/profile', requireSeller"));
  assert.ok(routes.includes("router.post('/profile/contact/request', requireSeller"));
  assert.ok(routes.includes("router.post('/profile/contact/verify', requireSeller"));
  assert.ok(routes.includes("phone_verified = CASE WHEN $2 = 'phone' THEN TRUE"));
  assert.ok(routes.includes('pending_contact_attempts'));
  assert.ok(profile.includes('requestAccountContactChange'));
  assert.ok(profile.includes('verifyAccountContactChange'));
  assert.ok(profile.includes("confirmUpload({ kind: 'logo'"));
  assert.ok(settings.includes("router.push('/settings/profile')"));
  assert.ok(read('db/schema.sql').includes('ADD COLUMN IF NOT EXISTS store_description'));
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
  assert.ok(inventory.includes("Product category is required."));
  assert.ok(inventory.includes('const category = String(b.category || \'\').trim()'));
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

test('dashboard pending count is store-wide, not derived from recent orders', () => {
  const analytics = read('routes/analyticsRoutes.js');
  assert.match(
    analytics,
    /SELECT COUNT\(\*\)::int FROM orders\s+WHERE store_id = \$1 AND status = 'PENDING'/,
    'dashboard needs an aggregate count of every pending order for this store',
  );
  assert.ok(analytics.includes('pendingOrderCount: ops.rows[0].pending_order_count'));

  const dashboard = read('mobile/app/(tabs)/dashboard/index.tsx');
  assert.ok(dashboard.includes('const pendingOrders = safeOps.pendingOrderCount'));
  assert.ok(!dashboard.includes('const pendingOrders = safeOrders.filter'), 'pending metric must not be inferred from the recent-order sample');
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

/* ------------------------- Notifications + push parity ---------------------- */
test('schema defines the merchant notifications history table', () => {
  const schema = read('db/schema.sql');
  assert.ok(schema.includes('CREATE TABLE IF NOT EXISTS merchant_notifications'));
  assert.ok(schema.includes('merchant_notifications_store_idx'));
  assert.ok(schema.includes('merchant_notifications_unread_idx'));
  assert.ok(/read_at\s+TIMESTAMPTZ/.test(schema), 'read_at column missing');
});

test('push dispatch records history + prunes to 180 days', () => {
  const push = read('services/pushService.js');
  assert.ok(push.includes('INSERT INTO merchant_notifications'), 'every push must be recorded');
  assert.ok(push.includes('NOTIFICATION_RETENTION_DAYS = 180'), 'retention window missing');
  assert.ok(push.includes('recordNotification'), 'history helper missing');
});

test('notifications endpoints are authenticated and store-scoped', () => {
  const src = read('routes/mobileRoutes.js');
  assert.ok(src.includes("router.get('/notifications', authenticateMobileToken"));
  assert.ok(src.includes("router.get('/notifications/unread-count', authenticateMobileToken"));
  assert.ok(src.includes("router.post('/notifications/read-all', authenticateMobileToken"));
  assert.ok(src.includes("router.post('/notifications/:id/read', authenticateMobileToken"));
  assert.ok(src.includes('merchant_notifications WHERE store_id'), 'feed must be store-scoped');
});

test('push tap handling covers cold starts, token refresh, and permission settings', () => {
  const root = read('mobile/app/_layout.tsx');
  assert.ok(root.includes('getLastNotificationTap()'), 'cold-start notification response must be read');
  assert.ok(root.includes('addNotificationResponseListener(handleNotificationTap)'), 'tap listener must be mounted independently of auth');
  assert.ok(root.includes('pendingNotificationRoute'), 'tap destination must wait until the signed-in route is ready');
  assert.ok(root.includes('addPushTokenRefreshListener()'), 'native token rotation must trigger re-registration');

  const push = read('mobile/src/services/pushNotifications.ts');
  assert.ok(push.includes('getExpoPushTokenAsync'), 'registered token must be an Expo token');
  assert.ok(push.includes('Device.isDevice'), 'push setup must tolerate simulators');
  assert.ok(
    push.includes("result === 'permission-denied' ? registerDeviceForPush(options) : result"),
    'explicit permission requests must not be swallowed by a concurrent silent registration',
  );
  assert.ok(push.includes("console.warn('[push] device unregister failed:'"), 'unregister failures must be logged');

  const settings = read('mobile/app/settings.tsx');
  assert.ok(settings.includes('Enable notifications'), 'seller can opt into push from Settings');
  assert.ok(settings.includes('Linking.openSettings()'), 'blocked permission has a recovery action');

  const service = read('services/pushService.js');
  assert.ok(service.includes('summarizeExpoTickets'), 'Expo ticket-level delivery results must be checked');
  assert.ok(service.includes('DeviceNotRegistered'), 'revoked tokens must be cleaned up');
});

test('every SMS/email trigger also fires a merchant push', () => {
  const cron = read('jobs/billingCron.js');
  assert.ok(cron.includes('function notifyPush('), 'billing cron push helper missing');
  assert.ok((cron.match(/notifyPush\(store,/g) || []).length >= 5, 'all 5 billing loops must push');
  const billing = read('routes/billingRoutes.js');
  assert.ok(billing.includes('sendMerchantPushNotification'), 'signup welcome must push');
  assert.ok(billing.includes("type: 'welcome'"));
  const inventory = read('routes/inventoryRoutes.js');
  assert.ok(inventory.includes('sendMerchantPushNotification'), 'low stock must push');
  assert.ok(inventory.includes("type: 'low_stock'"));
  const site = read('routes/siteSettingsRoutes.js');
  assert.ok(site.includes('sendMerchantPushNotification'), 'password reset must push');
  assert.ok(site.includes("type: 'security'"));
  const contact = read('routes/contactRoutes.js');
  assert.ok(contact.includes('sendMerchantPushNotification'), 'contact message must push');
  assert.ok(contact.includes("type: 'contact_message'"));
  // Order checkout already pushes alongside its customer SMS — untouched.
  const orders = read('routes/orderRoutes.js');
  assert.ok(orders.includes('sendMerchantPushNotification'));
});

test('theme keeps Paper cards at the 12px M3 radius (roundness x3)', () => {
  const theme = read('mobile/src/theme.ts');
  assert.equal((theme.match(/roundness: 4/g) || []).length, 2, 'light + dark must both be roundness 4');
  assert.ok(!theme.includes('roundness: 12'), 'roundness 12 renders 36px Paper cards');
});

test('root layout always mounts the stack behind the splash overlay', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'mobile', 'app', 'index.tsx')), 'root index route required');
  const layout = read('mobile/app/_layout.tsx');
  assert.ok(layout.includes('usePathname'), 'entry redirect must be pathname-gated');
  assert.ok(layout.includes('name="notifications"'), 'notifications screen must be registered');
  assert.ok(!layout.includes('return <DidwaLottieSplash />'), 'stack must never be swapped out for the splash');
  const screen = read('mobile/app/notifications/index.tsx');
  assert.ok(screen.includes('endpoints.getNotifications'));
  assert.ok(screen.includes('markAllNotificationsRead'));
});

test('successful password and 2FA login navigate directly to the seller dashboard', () => {
  const login = read('mobile/app/(auth)/login.tsx');
  assert.ok(login.includes("router.replace('/(tabs)/dashboard')"), 'login must route successful auth directly to dashboard');
  assert.ok(login.includes('await signIn(email.trim(), password)'), 'password login is wired');
  assert.ok(login.includes('await completeTwoFactor(challenge, code.trim())'), '2FA completion is wired');
  assert.ok(login.includes('Opening your store'), 'show a clear redirect-in-progress state');

  const root = read('mobile/app/_layout.tsx');
  assert.ok(root.includes("segments[0] === '(auth)'"), 'root auth-group redirect remains as a fallback guard');
  assert.ok(root.includes("router.replace('/(tabs)/dashboard')"), 'signed-in users must leave auth routes');
});

test('dashboard header order is ThemeToggle, bell, gear', () => {
  const dash = read('mobile/app/(tabs)/dashboard/index.tsx');
  const themeIdx = dash.indexOf('<ThemeToggle');
  const bellIdx = dash.indexOf('<NotificationBell');
  const gearIdx = dash.indexOf('icon="cog');
  assert.ok(themeIdx >= 0 && bellIdx > themeIdx && gearIdx > bellIdx,
    'header order must be ThemeToggle → Notification → Settings');
});

/* ---------------------------------- Report -------------------------------- */
if (failed > 0) {
  console.log(`\n${passed} passed, ${failed} FAILED`);
  process.exit(1);
}
console.log(`\nAll ${passed} checks passed.`);
