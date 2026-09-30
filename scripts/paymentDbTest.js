/**
 * DiDwa - BYOK payment schema verification.
 *
 * Confirms against a real Postgres that the migration produced what the
 * application assumes:
 *   - payment_settings exists, is 1:1 on store_id
 *   - the gateway-readiness CHECK rejects a gateway with no keys
 *   - orders.payment_method accepts PAYSTACK/HUBTEL and still rejects junk
 *   - the wallet columns are renamed, not dropped (payout history is preserved)
 *
 * Run: npm run test:payments-db
 */
import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let pass = 0;
let fail = 0;
async function check(name, fn) {
  try {
    await fn();
    pass += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    fail += 1;
    console.error(`  FAIL  ${name}\n        ${err.message}`);
  }
}

console.log('\nDiDwa payment schema (BYOK)\n');

/* ------------------------------ The table ---------------------------------- */

await check('payment_settings table exists', async () => {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_name = 'payment_settings' LIMIT 1`,
  );
  if (!rows.length) throw new Error('table missing');
});

await check('store_id is the primary key (1:1 with stores)', async () => {
  // pg_constraint, not information_schema: there is no constraint_column there.
  const { rows } = await client.query(
    `SELECT a.attname AS col
       FROM pg_constraint c
       JOIN unnest(c.conkey) AS k(attnum) ON true
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
      WHERE c.conrelid = 'payment_settings'::regclass
        AND c.contype = 'p'`,
  );
  if (rows.length !== 1 || rows[0].col !== 'store_id') {
    throw new Error(`primary key is not exactly store_id (got ${rows.map((r) => r.col).join(',') || 'none'})`);
  }
});

/* Insert a real store: payment_settings.store_id is a hard FK, which is exactly
   the tenant isolation guarantee we want - a settings row cannot exist for a
   store that does not. Done on a SEPARATE connection: creating a row here
   touches a table the app's schema bootstrap may want to index on the shared
   session, and "CREATE INDEX on stores is being used by active queries" is the
   resulting conflict. */
const seeder = new pg.Client({ connectionString: process.env.DATABASE_URL });
await seeder.connect();
// A fresh email every run, and no ON CONFLICT: the expression index on
// LOWER(email) cannot be used as a conflict target while the INSERT that needs
// it is still in flight on this connection.
const storeId = (await seeder.query(
  `INSERT INTO stores (name, phone, email, password_hash, subdomain_slug)
   VALUES ('BYOK schema probe', '0200000000', $1, 'x', $2) RETURNING id`,
  [`byok-probe-${Date.now()}@schema.test`, `byok-probe-${Date.now()}`],
)).rows[0].id;
await seeder.end();

await check('a throwaway store can be created for the probe', async () => {
  if (!storeId) throw new Error('no store id was returned');
});

await check('every expected column is present', async () => {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'payment_settings'`,
  );
  const have = new Set(rows.map((r) => r.column_name));
  for (const c of [
    'store_id', 'paystack_public_key', 'paystack_secret_key', 'hubtel_client_id',
    'hubtel_client_secret', 'hubtel_merchant_account_id', 'enable_cod',
    'active_gateway', 'created_at', 'updated_at',
  ]) {
    if (!have.has(c)) throw new Error(`missing column ${c}`);
  }
});

await check('COD and enable_cod default correctly', async () => {
  await client.query('DELETE FROM payment_settings WHERE store_id = $1', [storeId]);
  const { rows } = await client.query(
    `INSERT INTO payment_settings (store_id, enable_cod, active_gateway)
     VALUES ($1, DEFAULT, DEFAULT) RETURNING enable_cod, active_gateway`,
    [storeId],
  );
  if (rows[0].active_gateway !== 'COD') throw new Error(`defaulted to ${rows[0].active_gateway}`);
  if (rows[0].enable_cod !== true) throw new Error('enable_cod did not default to true');
  await client.query('DELETE FROM payment_settings WHERE store_id = $1', [storeId]);
});

/* --------------------- Gateway readiness is enforced ----------------------- */

await check('a gateway cannot be active without its keys', async () => {
  let threw = false;
  try {
    // No secrets supplied, yet Paystack selected: the CHECK must refuse this.
    await client.query(
      `INSERT INTO payment_settings (store_id, active_gateway) VALUES ($1, 'PAYSTACK')`,
      [storeId],
    );
  } catch { threw = true; }
  if (!threw) {
    await client.query('DELETE FROM payment_settings WHERE store_id = $1', [storeId]);
    throw new Error('the database accepted Paystack with no credentials');
  }
});

await check('a fully-configured Paystack store is accepted', async () => {
  await client.query(
    `INSERT INTO payment_settings
       (store_id, paystack_public_key, paystack_secret_key, active_gateway)
     VALUES ($1, 'pk_test_x', 'sk_test_x', 'PAYSTACK')`,
    [storeId],
  );
  await client.query('DELETE FROM payment_settings WHERE store_id = $1', [storeId]);
});

await check('one store cannot have two settings rows (1:1 enforced)', async () => {
  await client.query(
    `INSERT INTO payment_settings (store_id, active_gateway) VALUES ($1, 'COD')`,
    [storeId],
  );
  let threw = false;
  try {
    await client.query(
      `INSERT INTO payment_settings (store_id, active_gateway) VALUES ($1, 'COD')`,
      [storeId],
    );
  } catch { threw = true; }
  await client.query('DELETE FROM payment_settings WHERE store_id = $1', [storeId]);
  if (!threw) throw new Error('a duplicate settings row was accepted');
});

await check('settings cannot exist for a store that does not', async () => {
  let threw = false;
  try {
    await client.query(
      `INSERT INTO payment_settings (store_id, active_gateway) VALUES (gen_random_uuid(), 'COD')`,
    );
  } catch { threw = true; }
  if (!threw) throw new Error('an orphaned settings row was accepted');
});

/* -------------------------- The widened enum ------------------------------ */

await check('orders.payment_method accepts PAYSTACK and HUBTEL', async () => {
  const def = (await client.query(
    `SELECT pg_get_constraintdef(oid) AS d FROM pg_constraint
      WHERE conrelid = 'orders'::regclass AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%payment_method%'`,
  )).rows;
  if (!def.length) throw new Error('no payment_method CHECK found');
  const d = def[0].d;
  for (const m of ['PAYSTACK', 'HUBTEL', 'COD', 'MOMO', 'CASH']) {
    if (!d.includes(`'${m}'`)) throw new Error(`${m} missing from the CHECK: ${d}`);
  }
});

await check('the payment_method CHECK still rejects an unknown value', async () => {
  const id = (await client.query('SELECT gen_random_uuid() AS id')).rows[0].id;
  let threw = false;
  try {
    await client.query(
      `INSERT INTO orders (store_id, order_number, payment_method) VALUES ($1, 'T-REJECT', 'BITCOIN')`,
      [id],
    );
  } catch { threw = true; }
  if (!threw) {
    await client.query(`DELETE FROM orders WHERE order_number = 'T-REJECT'`);
    throw new Error('an invalid payment_method was accepted');
  }
});

/* ------------------ Wallet retired, payout history preserved --------------- */

await check('wallet columns are retired, not dropped', async () => {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = 'stores' AND column_name LIKE '%balance%'`,
  );
  const names = rows.map((r) => r.column_name);
  if (!names.includes('available_balance_retired')) throw new Error('available_balance was dropped, not renamed');
  if (!names.includes('pending_balance_retired')) throw new Error('pending_balance was dropped, not renamed');
});

await check('the payout ledger survives as payouts_retired', async () => {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'payouts_retired' LIMIT 1`,
  );
  if (!rows.length) throw new Error('payout history table was dropped instead of renamed');
});

// Leave the database as we found it: this test creates a throwaway store.
await client.query('DELETE FROM stores WHERE id = $1', [storeId]);

await client.end();

console.log(`\n${pass}/${pass + fail} payment schema assertions passed`);
process.exit(fail ? 1 : 0);
