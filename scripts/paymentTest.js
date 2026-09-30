/**
 * DiDwa - Store payment (BYOK) logic tests
 *
 * Covers the rules that decide what a customer may pay with, which is the part
 * of this feature that can quietly hand money to the wrong account:
 *   - a store with no keys can ONLY be COD
 *   - a gateway is offered only when it is active AND fully configured
 *   - a requested method the store cannot honour is downgraded, never obeyed
 *   - secrets never reach the client payload
 *
 * Run: npm run test:payments
 */
import assert from 'node:assert';
import {
  availableMethods, resolveMethod, toClientView, isPaystackReady, isHubtelReady,
} from '../services/storePayments.js';
import { encryptSecret, decryptSecret, maskSecret, encryptionConfigured } from '../services/secretBox.js';

process.env.PAYMENT_KEYS_ENCRYPTION_SECRET ||= 'a'.repeat(64);

let pass = 0;
let fail = 0;
function test(name, fn) {
  try {
    fn();
    pass += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    fail += 1;
    console.error(`  FAIL  ${name}\n        ${err.message}`);
  }
}

const PS = {
  activeGateway: 'PAYSTACK', enableCod: true,
  paystackPublicKey: 'pk_live_x', paystackSecretKey: 'sk_live_x',
};
const HT = {
  activeGateway: 'HUBTEL', enableCod: false,
  hubtelClientId: 'cid', hubtelClientSecret: 'csec', hubtelMerchantAccountId: 'acct',
};

console.log('\nDiDwa store payments (BYOK)\n');

/* ------------------------- No keys means COD only -------------------------- */

test('a store with no settings row is COD only', () => {
  assert.deepStrictEqual(availableMethods(null), ['COD']);
});

test('a store with no keys cannot be put on Paystack', () => {
  const s = { activeGateway: 'PAYSTACK', enableCod: true };
  assert.deepStrictEqual(availableMethods(s), ['COD']);
});

test('a half-configured Paystack store falls back to COD', () => {
  const s = { activeGateway: 'PAYSTACK', enableCod: true, paystackSecretKey: 'sk_live_x' };
  assert.strictEqual(isPaystackReady(s), false, 'secret alone is not enough');
  assert.deepStrictEqual(availableMethods(s), ['COD']);
});

test('a half-configured Hubtel store falls back to COD', () => {
  const s = { activeGateway: 'HUBTEL', enableCod: true, hubtelClientId: 'cid' };
  assert.strictEqual(isHubtelReady(s), false);
  assert.deepStrictEqual(availableMethods(s), ['COD']);
});
/* --------------------- Active gateway + configuration ---------------------- */

test('a configured Paystack store offers Paystack', () => {
  assert.ok(availableMethods(PS).includes('PAYSTACK'));
});

test('Paystack is not offered when configured but NOT active', () => {
  const s = { ...PS, activeGateway: 'COD' };
  assert.ok(!availableMethods(s).includes('PAYSTACK'));
});

test('a configured Hubtel store offers Hubtel', () => {
  assert.ok(availableMethods(HT).includes('HUBTEL'));
});

test('COD stays available alongside an online gateway when enabled', () => {
  assert.ok(availableMethods(PS).includes('COD'));
});

test('COD is omitted when disabled and a gateway is active', () => {
  assert.ok(!availableMethods(HT).includes('COD'));
});

test('COD is always available when it is the active gateway', () => {
  assert.ok(availableMethods({ activeGateway: 'COD', enableCod: false }).includes('COD'));
});

test('the result is never empty - there is always a way to pay', () => {
  for (const s of [null, {}, { activeGateway: 'COD', enableCod: false }, PS, HT]) {
    assert.ok(availableMethods(s).length > 0, 'must always offer something');
  }
});

/* --------------------------- Method resolution ----------------------------- */

test('a requested Paystack is honoured when the store can charge it', () => {
  assert.strictEqual(resolveMethod(PS, 'PAYSTACK'), 'PAYSTACK');
});

test('a requested Paystack is DOWNGRADED to COD when there are no keys', () => {
  assert.strictEqual(resolveMethod(null, 'PAYSTACK'), 'COD');
});

test('a tampered method string cannot force a gateway charge', () => {
  // A hand-rolled POST body must not pick a gateway the store cannot service,
  // which is what would break the COD-only guarantee.
  for (const bogus of ['PAYSTACK', 'HUBTEL', 'paystack', 'MOMO', 'CASH']) {
    assert.strictEqual(resolveMethod(null, bogus), 'COD');
  }
});

test('CASH is accepted as a synonym for COD', () => {
  assert.strictEqual(resolveMethod(PS, 'CASH'), 'COD');
});

test('an unknown method falls back to the first allowed method', () => {
  assert.strictEqual(resolveMethod(PS, 'BITCOIN'), 'PAYSTACK');
});

test('method resolution is case-insensitive', () => {
  assert.strictEqual(resolveMethod(PS, 'paystack'), 'PAYSTACK');
});

test('an empty request resolves to COD for a keyless store', () => {
  assert.strictEqual(resolveMethod(null, ''), 'COD');
  assert.strictEqual(resolveMethod(null, undefined), 'COD');
});

/* ----------------------------- Readiness flags ----------------------------- */

test('Paystack readiness needs BOTH keys', () => {
  assert.strictEqual(isPaystackReady(PS), true);
  assert.strictEqual(isPaystackReady({ ...PS, paystackPublicKey: null }), false);
  assert.strictEqual(isPaystackReady(null), false);
});

test('Hubtel readiness needs all THREE values', () => {
  assert.strictEqual(isHubtelReady(HT), true);
  assert.strictEqual(isHubtelReady({ ...HT, hubtelMerchantAccountId: null }), false);
  assert.strictEqual(isHubtelReady(null), false);
});

/* ------------------------------- Secret vault ------------------------------ */

test('a secret round-trips through encryption', () => {
  const sealed = encryptSecret('sk_live_roundtrip');
  assert.notStrictEqual(sealed, 'sk_live_roundtrip');
  assert.strictEqual(decryptSecret(sealed), 'sk_live_roundtrip');
});

test('two merchants can use different secrets and both recover', () => {
  const a = encryptSecret('merchant_a_secret');
  const b = encryptSecret('merchant_b_secret');
  assert.strictEqual(decryptSecret(a), 'merchant_a_secret');
  assert.strictEqual(decryptSecret(b), 'merchant_b_secret');
  assert.notStrictEqual(decryptSecret(a), decryptSecret(b));
});

test('encryption is configured in this test run', () => {
  assert.strictEqual(encryptionConfigured(), true);
});

/* --------------------------- Client-safe views ----------------------------- */

test('the client view never contains a secret value', () => {
  const view = toClientView(PS);
  assert.ok(!JSON.stringify(view).includes('sk_live_x'), 'secret must not be serialised');
  assert.ok(view.paystack.secretKeyMasked, 'a mask should be present instead');
});

test('the client view for a keyless store is COD and configured:false', () => {
  const view = toClientView(null);
  assert.strictEqual(view.configured, false);
  assert.deepStrictEqual(view.availableMethods, ['COD']);
  assert.strictEqual(view.activeGateway, 'COD');
});

test('the client view reports configured:true once keys exist', () => {
  assert.strictEqual(toClientView(PS).configured, true);
  assert.strictEqual(toClientView(HT).configured, true);
});

test('the client view exposes the public key, which is not a secret', () => {
  assert.strictEqual(toClientView(PS).paystack.publicKey, 'pk_live_x');
});

test('a mask reveals at most the last four characters', () => {
  const masked = maskSecret('sk_live_abcdefgh');
  assert.ok(masked.endsWith('efgh'));
  assert.ok(!masked.includes('sk_live'));
});

console.log(`\n${pass}/${pass + fail} payment assertions passed`);
process.exit(fail ? 1 : 0);

