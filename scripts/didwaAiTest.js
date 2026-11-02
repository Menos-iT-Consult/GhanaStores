import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AI_ACTIONS,
  AI_SUPPORT_FALLBACK,
  createAiSupportNotice,
  isSupportedOrderText,
} from '../config/didwaAiActions.js';
import { aiSellerAccessError, requireAiSeller } from '../routes/didwaAiRoutes.js';
import {
  buildSellerAiContext,
  MAX_AI_CONTEXT_BYTES,
} from '../services/didwaAiContextService.js';
import {
  generateProductCopy,
  executeAiAction,
  parseWhatsAppOrder,
  validateAiActionRequest,
} from '../services/didwaAiService.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
async function test(name, fn) {
  await fn();
  pass += 1;
  console.log(`  PASS  ${name}`);
}

console.log('\nDiDwa system-generated seller assistant\n');

await test('shared configuration defines exactly the seven approved action IDs', () => {
  assert.deepEqual(AI_ACTIONS.map(({ id }) => id), [
    '[PARSE_WHATSAPP_ORDER]',
    '[GENERATE_PRODUCT_COPY]',
    '[CHECK_MOMO_BALANCE]',
    '[REQUEST_PAYOUT]',
    '[INVENTORY_INSIGHTS]',
    '[SALES_SUMMARY]',
    '[ORDER_SUMMARY]',
  ]);
});

await test('unsupported input notice uses configured platform support contacts', () => {
  assert.equal(createAiSupportNotice({
    whatsappNumber: '+233 20 123 4567',
    supportPhone: '+233 30 765 4321',
    supportEmail: 'help@example.com',
  }), `⚠️ Direct text queries are not supported. Only suggested options can be processed based on your store details.

For further assistance, please contact DiDwa Support:
📞 WhatsApp / Call: +233 20 123 4567
✉️ Email: help@example.com`);
  assert.match(AI_SUPPORT_FALLBACK, /Not configured/);
});

await test('web and mobile order inputs reject off-script text before submitting', () => {
  assert.equal(isSupportedOrderText('What is the capital of Ghana?'), false);
  assert.equal(isSupportedOrderText('Hello, can you help with this?'), false);
  assert.equal(isSupportedOrderText('2x rice, 1x oil'), true);
  assert.equal(isSupportedOrderText('I need 2 bags of rice and 1 oil'), true);
});

await test('only action envelopes and exact action payloads are accepted', () => {
  assert.equal(validateAiActionRequest({ prompt: 'general question' }).error, AI_SUPPORT_FALLBACK);
  assert.equal(validateAiActionRequest({ action: 'general', payload: {} }).error, AI_SUPPORT_FALLBACK);
  assert.equal(validateAiActionRequest({
    action: '[CHECK_MOMO_BALANCE]',
    payload: { storeId: 'another-store' },
  }).error, AI_SUPPORT_FALLBACK);
  assert.deepEqual(validateAiActionRequest({
    action: '[CHECK_MOMO_BALANCE]',
  }), { action: '[CHECK_MOMO_BALANCE]', payload: {} });
  for (const action of ['[INVENTORY_INSIGHTS]', '[SALES_SUMMARY]', '[ORDER_SUMMARY]']) {
    assert.deepEqual(validateAiActionRequest({ action }), { action, payload: {} });
    assert.equal(validateAiActionRequest({ action, payload: { storeId: 'other-store' } }).error, AI_SUPPORT_FALLBACK);
  }
});

await test('parse action accepts only bounded text and rejects added fields', () => {
  assert.equal(validateAiActionRequest({
    action: '[PARSE_WHATSAPP_ORDER]',
    payload: { text: '2x rice', userQuestion: 'tell me a joke' },
  }).error, AI_SUPPORT_FALLBACK);
  assert.equal(validateAiActionRequest({
    action: '[PARSE_WHATSAPP_ORDER]',
    payload: { text: 'x'.repeat(5001) },
  }).error, AI_SUPPORT_FALLBACK);
  assert.equal(validateAiActionRequest({
    action: '[PARSE_WHATSAPP_ORDER]',
    payload: { text: '   ' },
  }).error, AI_SUPPORT_FALLBACK);
});

await test('product and payout payloads are validated without coercion', () => {
  assert.equal(validateAiActionRequest({
    action: '[GENERATE_PRODUCT_COPY]',
    payload: { productId: 'not-a-uuid' },
  }).error, AI_SUPPORT_FALLBACK);
  assert.equal(validateAiActionRequest({
    action: '[REQUEST_PAYOUT]',
    payload: { amountGhs: '50' },
  }).error, AI_SUPPORT_FALLBACK);
  assert.equal(validateAiActionRequest({
    action: '[REQUEST_PAYOUT]',
    payload: { amountGhs: 50.001 },
  }).error, AI_SUPPORT_FALLBACK);
  assert.equal(validateAiActionRequest({
    action: '[REQUEST_PAYOUT]',
    payload: { amountGhs: 50 },
  }).action, '[REQUEST_PAYOUT]');
});

await test('seller gate allows unverified sellers but rejects non-sellers and suspended stores', () => {
  assert.equal(aiSellerAccessError(null, null).statusCode, 403);
  assert.equal(aiSellerAccessError({ role: 'BUYER' }, { phone_verified: true }).statusCode, 403);
  assert.equal(aiSellerAccessError(
    { role: 'SELLER' },
    { phone_verified: false, status: 'SUSPENDED' },
  ).statusCode, 403);
  assert.equal(aiSellerAccessError(
    { role: 'SELLER' },
    { phone_verified: false, status: 'ACTIVE' },
  ), null);
});

await test('unauthenticated requests are rejected with 401 before store lookup', () => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let continued = false;
  requireAiSeller({ headers: {} }, response, () => { continued = true; });
  assert.equal(response.statusCode, 401);
  assert.equal(response.body.error, 'Authentication required.');
  assert.equal(continued, false);
});

await test('WhatsApp order parser extracts labeled details and flags missing fields', () => {
  const message = [
    'Customer name: Ama Mensah',
    '2 x rice',
    '1x cooking oil',
    'Deliver to: Madina, Greater Accra',
    'Total: GHS 150.50',
    'Phone: 0244123456',
  ].join('\n');
  const parsed = parseWhatsAppOrder(message);
  assert.equal(parsed.customerName, 'Ama Mensah');
  assert.deepEqual(parsed.items, [
    { name: 'rice', quantity: 2 },
    { name: 'cooking oil', quantity: 1 },
  ]);
  assert.equal(parsed.deliveryLocation, 'Madina, Greater Accra');
  assert.equal(parsed.deliveryRegion, 'Greater Accra');
  assert.equal(parsed.totalGhs, 150.5);
  assert.equal(parsed.needsReview, false);
  assert.doesNotMatch(JSON.stringify(parsed), /0244123456/);
  const inlinePhone = parseWhatsAppOrder('Name: Ama Phone: 0244123456\n2x rice');
  assert.equal(inlinePhone.customerName, 'Ama');
  assert.doesNotMatch(JSON.stringify(inlinePhone), /0244123456/);

  assert.equal(parseWhatsAppOrder('Hello, can you help with this?'), null);
  assert.equal(parseWhatsAppOrder('What is the capital of Ghana?'), null);
  assert.equal(parseWhatsAppOrder('What is the capital of Ashanti Region?'), null);
  assert.equal(parseWhatsAppOrder('What is 2x rice?'), null);
  assert.equal(parseWhatsAppOrder('2x rice at GHS 15 each').totalGhs, null);
  assert.deepEqual(parseWhatsAppOrder('I need 2 bags of rice and 1 oil')?.items, [
    { name: 'bags of rice', quantity: 2 },
    { name: 'oil', quantity: 1 },
  ]);
});

await test('off-script text submitted through the order action gets the support notice', async () => {
  const response = await executeAiAction(
    '[PARSE_WHATSAPP_ORDER]',
    { text: 'What is the capital of Ghana?' },
    { id: 'store-id' },
  );
  assert.deepEqual(response, {
    error: AI_SUPPORT_FALLBACK,
    statusCode: 400,
    supportFallback: true,
  });
});

await test('product descriptions are generated from store data with Ghana cedi pricing', () => {
  const copy = generateProductCopy({
    name: 'Brown rice',
    category: 'Groceries',
    description: 'Locally milled.',
    price: 12.5,
  }, 'Ama Foods');
  assert.match(copy.professionalEnglish, /Brown rice/);
  assert.match(copy.professionalCaption, /GH₵12\.50/);
  assert.match(copy.ghanaianPidgin, /dey available for GH₵12\.50/);
  assert.equal(copy.generation, 'system-template');
});

await test('seller context includes only allowlisted store data and public platform details', async () => {
  const queriedStoreIds = [];
  const context = await buildSellerAiContext({
    id: 'seller-store-id',
    name: 'Ama Foods',
    subdomain_slug: 'ama-foods',
    currency: 'GHS',
    email: 'seller-private@example.test',
    phone: '+233 24 999 8888',
    momo_number: '+233 24 999 7777',
  }, {
    listAiProducts: async (storeId, options) => {
      queriedStoreIds.push(storeId);
      assert.equal(options.includeDescriptions, true);
      return [{
        id: 'internal-product-id',
        name: 'Rice +233 24 111 2222',
        category: 'Groceries',
        description: 'Locally milled. Call +233 24 111 2222.',
        price: 12.5,
        privateField: 'PRODUCT_SECRET',
      }];
    },
    getInventoryInsights: async (storeId) => {
      queriedStoreIds.push(storeId);
      return {
        variantCount: 2,
        lowStockCount: 1,
        unitsInStock: 11,
        stockValueGhs: 125,
        lowStockItems: [{
          productName: 'Rice',
          variant: 'Bag: 5kg',
          quantity: 1,
          reorderLevel: 5,
          customerName: 'BUYER_SECRET',
        }],
      };
    },
    getSalesSummary: async (storeId) => {
      queriedStoreIds.push(storeId);
      return {
        last7DaysGhs: 250,
        previous7DaysGhs: 200,
        changePercent: 25,
        last30DaysGhs: 900,
        paidOrders30Days: 12,
        averageOrderValue30Days: 75,
        dailyTrend: [{ day: 'Mon', revenueGhs: 100, phone: '+233 24 111 3333' }],
        topProducts: [{ name: 'Rice', unitsSold: 20, revenueGhs: 250, address: 'BUYER_ADDRESS' }],
      };
    },
    getOrderSummary: async (storeId) => {
      queriedStoreIds.push(storeId);
      return {
        totalOrders: 20,
        pendingOver48Hours: 2,
        byStatus: [{ status: 'PENDING', count: 2, totalGhs: 150, customerName: 'BUYER_SECRET' }],
      };
    },
    getManagedPayoutContext: async (storeId) => {
      queriedStoreIds.push(storeId);
      return {
        balance: {
          totalSalesGhs: 1000,
          platformFeesGhs: 20,
          netPayableGhs: 980,
          paidOutGhs: 100,
          pendingPayoutGhs: 50,
          availableGhs: 830,
        },
        managedMode: true,
        minimumGhs: 50,
        platformFeePercent: 2,
        payoutNumber: '+233 24 111 4444',
        requests: [{ momoNumber: '+233 24 111 5555' }],
        ledger: [{ secret: 'LEDGER_SECRET' }],
      };
    },
    getPlatformPublicSettings: async () => ({
      contact: {
        supportEmail: 'support@didwaghana.com',
        supportPhone: '+233 30 123 4567',
        whatsappNumber: '+233 20 123 4567',
        businessAddress: 'Accra, Ghana',
      },
      socialLinks: { private: 'SOCIAL_SETTING' },
      whatsapp: { sellerGroupUrl: 'PRIVATE_GROUP_LINK' },
      apiKey: 'PLATFORM_SECRET',
    }),
  });

  assert.deepEqual(queriedStoreIds, Array(5).fill('seller-store-id'));
  assert.equal(context.store.name, 'Ama Foods');
  assert.equal(context.catalog.products[0].priceGhs, 12.5);
  assert.equal(context.catalog.products[0].description, 'Locally milled. Call [phone removed].');
  assert.equal(context.platform.contact.supportPhone, '+233 30 123 4567');
  assert.equal(context.platform.contact.whatsappNumber, '+233 20 123 4567');
  assert.ok(context.platform.deliveryRegions.includes('Greater Accra'));
  assert.equal(context.managedPayments.availableGhs, 830);
  assert.equal(Object.hasOwn(context.store, 'id'), false);

  const serialized = JSON.stringify(context);
  for (const excluded of [
    'seller-private@example.test',
    '+233 24 999 8888',
    '+233 24 999 7777',
    'BUYER_SECRET',
    'BUYER_ADDRESS',
    'PRODUCT_SECRET',
    'LEDGER_SECRET',
    'PLATFORM_SECRET',
    'PRIVATE_GROUP_LINK',
    '+233 24 111 4444',
    '+233 24 111 5555',
    'SOCIAL_SETTING',
  ]) {
    assert.doesNotMatch(serialized, new RegExp(excluded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

await test('seller context bounds product counts, text fields, and total serialized size', async () => {
  const context = await buildSellerAiContext(
    { id: 'bounded-store', name: 'Store', currency: 'GHS' },
    {
      listAiProducts: async () => Array.from({ length: 250 }, (_, index) => ({
        name: `Product ${index} `.repeat(200),
        category: 'Category '.repeat(100),
        description: 'Description '.repeat(1000),
        price: 1,
      })),
      getInventoryInsights: async () => ({
        lowStockItems: Array.from({ length: 30 }, () => ({
          productName: 'Product '.repeat(200),
          variant: 'Variant '.repeat(100),
          quantity: 1,
          reorderLevel: 10,
        })),
      }),
      getSalesSummary: async () => ({
        topProducts: Array.from({ length: 20 }, () => ({
          name: 'Top Product '.repeat(100),
          unitsSold: 10,
          revenueGhs: 100,
        })),
      }),
      getOrderSummary: async () => ({}),
      getManagedPayoutContext: async () => ({}),
      getPlatformPublicSettings: async () => ({}),
    },
  );
  assert.ok(context.catalog.products.length <= 30);
  assert.ok(context.truncated);
  assert.ok(Buffer.byteLength(JSON.stringify(context), 'utf8') <= MAX_AI_CONTEXT_BYTES);
});

await test('gateway requires seller authentication and scopes product lookup to that seller', () => {
  const routes = fs.readFileSync(path.join(ROOT, 'routes', 'didwaAiRoutes.js'), 'utf8');
  const service = fs.readFileSync(path.join(ROOT, 'services', 'didwaAiService.js'), 'utf8');
  const auth = fs.readFileSync(path.join(ROOT, 'middleware', 'authMiddleware.js'), 'utf8');
  const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  const managedPayments = fs.readFileSync(path.join(ROOT, 'services', 'managedPayoutService.js'), 'utf8');
  const contextService = fs.readFileSync(path.join(ROOT, 'services', 'didwaAiContextService.js'), 'utf8');
  assert.match(routes, /router\.post\('\/gateway', requireAiSeller/);
  assert.match(routes, /requireSeller\(req, res/);
  assert.doesNotMatch(routes, /phone_verified/);
  assert.match(auth, /export function requireSeller/);
  assert.match(server, /app\.use\('\/api\/ai', didwaAiLimiter\)/);
  assert.match(server, /app\.use\('\/api\/ai', didwaAiRoutes\)/);
  assert.match(service, /WHERE id = \$1 AND store_id = \$2 AND is_active = TRUE/);
  assert.match(service, /requestManagedPayout\(store\.id, payload\.amountGhs\)/);
  assert.match(service, /FROM generate_series\([\s\S]*AS days\(day\)/);
  assert.match(service, /type: 'inventory'/);
  assert.match(service, /type: 'sales'/);
  assert.match(service, /type: 'orders'/);
  const inventoryService = service.slice(
    service.indexOf('export async function getInventoryInsights'),
    service.indexOf('export async function getSalesSummary'),
  );
  const salesService = service.slice(
    service.indexOf('export async function getSalesSummary'),
    service.indexOf('export async function getOrderSummary'),
  );
  const orderService = service.slice(
    service.indexOf('export async function getOrderSummary'),
    service.indexOf('export async function executeAiAction'),
  );
  assert.match(inventoryService, /v\.store_id = \$1/);
  assert.match(salesService, /WHERE store_id = \$1/);
  assert.match(salesService, /oi\.store_id = \$1/);
  assert.match(orderService, /WHERE store_id = \$1/);
  assert.doesNotMatch(orderService, /customer|phone|address/i);
  assert.match(contextService, /loadProducts\(store\.id/);
  assert.match(contextService, /loadInventory\(store\.id/);
  assert.match(contextService, /loadSales\(store\.id/);
  assert.match(contextService, /loadOrders\(store\.id/);
  assert.match(routes, /router\.get\('\/products'/);
  assert.doesNotMatch(routes, /context/i);
  const payoutContext = managedPayments.slice(
    managedPayments.indexOf('export async function getManagedPayoutContext'),
    managedPayments.indexOf('export async function requestManagedPayout'),
  );
  assert.match(payoutContext, /WHERE store_id = \$1/);
  assert.doesNotMatch(payoutContext, /momo_number|momo_account_name|transfer_reference/i);
  assert.doesNotMatch(service, /gemini|generativeai/i);
});

console.log(`\n${pass} DiDwa AI assertions passed`);
