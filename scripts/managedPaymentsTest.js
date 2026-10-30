import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_MANAGED_PAYMENT_POLICY,
  getManagedPaymentPolicy,
  managedOrderAmounts,
  normalizeMomoNetwork,
  validateManagedPaymentPolicy,
} from '../services/managedPaymentSettings.js';
import { normalizeGhPhone } from '../utils/helpers.js';
import { platformReferenceKind } from '../services/paystackPlatform.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
async function test(name, fn) {
  await fn();
  pass += 1;
  console.log(`  PASS  ${name}`);
}

console.log('\nDiDwa managed payments and payouts\n');

await test('default fee and payout minimum match the selected launch policy', () => {
  assert.equal(DEFAULT_MANAGED_PAYMENT_POLICY.feePercent, 2);
  assert.equal(DEFAULT_MANAGED_PAYMENT_POLICY.minimumPayoutGhs, 50);
});

await test('admin-managed fee and threshold are validated and rounded to cents', () => {
  const result = validateManagedPaymentPolicy({
    enabled: true,
    feePercent: 2.345,
    minimumPayoutGhs: 50.129,
  });
  assert.deepEqual(result.settings, {
    enabled: true,
    feePercent: 2.35,
    minimumPayoutGhs: 50.13,
  });
  assert.ok(validateManagedPaymentPolicy({ enabled: true, feePercent: 20.01, minimumPayoutGhs: 50 }).error);
  assert.ok(validateManagedPaymentPolicy({ enabled: true, feePercent: 2, minimumPayoutGhs: 0 }).error);
  assert.ok(validateManagedPaymentPolicy({ enabled: 'true', feePercent: 2, minimumPayoutGhs: 50 }).error);
});

await test('policy reads from settings without requiring a database connection', async () => {
  const settings = new Map([
    ['managed_payments_enabled', 'false'],
    ['managed_payments_fee_percent', '1.75'],
    ['managed_payout_minimum_ghs', '75'],
  ]);
  const policy = await getManagedPaymentPolicy(async (_sql, params) => ({
    rows: params[0]
      .filter((key) => settings.has(key))
      .map((setting_key) => ({ setting_key, setting_value: settings.get(setting_key) })),
  }));
  assert.equal(policy.enabled, false);
  assert.equal(policy.feePercent, 1.75);
  assert.equal(policy.minimumPayoutGhs, 75);
});

await test('managed order math rounds gross, fee, and net to pesewas', () => {
  assert.deepEqual(managedOrderAmounts(100, 2), { gross: 100, fee: 2, net: 98 });
  assert.deepEqual(managedOrderAmounts(34.99, 2), { gross: 34.99, fee: 0.7, net: 34.29 });
  assert.deepEqual(managedOrderAmounts(0.01, 20), { gross: 0.01, fee: 0, net: 0.01 });
});

await test('payout network aliases normalize to canonical supported names', () => {
  assert.equal(normalizeMomoNetwork('MTN'), 'MTN');
  assert.equal(normalizeMomoNetwork('Vodafone Cash'), 'TELECEL');
  assert.equal(normalizeMomoNetwork('AirtelTigo'), 'AT');
  assert.equal(normalizeMomoNetwork('invalid'), null);
});

await test('MoMo destination validation accepts Ghana numbers and rejects malformed input', () => {
  assert.equal(normalizeGhPhone('0244123456'), '233244123456');
  assert.equal(normalizeGhPhone('+233 24 412 3456'), '233244123456');
  assert.equal(normalizeGhPhone('123'), null);
});

await test('managed Paystack references have a dedicated platform webhook prefix', () => {
  assert.equal(platformReferenceKind('GS-MGD-GS-260101-1234'), 'managed-order');
  assert.equal(platformReferenceKind('GS-SUB-abc'), 'subscription');
});

const schema = fs.readFileSync(path.join(ROOT, 'db', 'schema.sql'), 'utf8');
const checkout = fs.readFileSync(path.join(ROOT, 'routes', 'orderRoutes.js'), 'utf8');
const webhook = fs.readFileSync(path.join(ROOT, 'services', 'paymentWebhooks.js'), 'utf8');
const payouts = fs.readFileSync(path.join(ROOT, 'routes', 'managedPayoutRoutes.js'), 'utf8');
const paymentSettings = fs.readFileSync(path.join(ROOT, 'routes', 'paymentSettingsRoutes.js'), 'utf8');
const paystack = fs.readFileSync(path.join(ROOT, 'services', 'paystackPlatform.js'), 'utf8');
await test('schema enables managed mode for existing/new stores without backfilling sales', () => {
  assert.match(schema, /ADD COLUMN IF NOT EXISTS use_managed_payments BOOLEAN NOT NULL DEFAULT TRUE/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS store_managed_ledger/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS store_payout_requests/);
  assert.match(schema, /payout_momo_account_name TEXT/);
  assert.match(schema, /ADD COLUMN IF NOT EXISTS momo_account_name TEXT/);
  assert.doesNotMatch(schema, /INSERT INTO store_managed_ledger/);
});
await test('managed checkout snapshots processor and fee, while webhook verifies exact amount and credits once', () => {
  assert.match(checkout, /payment_processor/);
  assert.match(checkout, /initPaystackCheckout/);
  assert.match(webhook, /verifyPlatformSignature/);
  assert.match(webhook, /Math\.abs\(amount - Number\(order\.total\)\) > 0\.01/);
  assert.match(webhook, /ON CONFLICT \(external_reference\) DO NOTHING/);
});
await test('payout requests reserve balance and manual payout processing is ledger-backed', () => {
  assert.match(payouts, /FOR UPDATE/);
  assert.match(payouts, /status = 'pending'/);
  assert.match(payouts, /payout_momo_account_name/);
  assert.match(payouts, /momo_account_name/);
  assert.match(paymentSettings, /resolvePaystackMomoAccountName/);
  assert.match(paystack, /TELECEL: \['VODAFONE', 'VODAFONE CASH', 'TELECEL', 'TELECEL CASH'\]/);
});
await test('public order tracking accepts an order number or a store-scoped checkout phone', () => {
  assert.match(checkout, /router\.get\('\/public\/orders\/track'/);
  assert.match(checkout, /normalizeGhPhone\(phone\)/);
  assert.match(checkout, /WHERE o\.store_id = \$1/);
  assert.match(checkout, /RIGHT\(regexp_replace\(o\.customer_phone, '\[\^0-9\]', '', 'g'\), 9\)/);
  assert.match(checkout, /router\.get\('\/public\/orders\/:orderIdOrNumber'/);
  assert.match(checkout, /o\.order_number = \$1 OR o\.id::text = \$1/);
  assert.doesNotMatch(checkout, /Enter the Ghana phone number used at checkout/);
});

console.log(`\n${pass} managed payment assertions passed`);
