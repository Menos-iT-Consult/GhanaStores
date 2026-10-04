/**
 * DiDwa - apply the SMS settings table, its readiness constraint, and the whole
 * platform SMS quota schema.
 *
 * Targeted rather than a full `npm run db:init`. The schema file is idempotent,
 * but re-applying all of it touches every table, and this feature only needs its
 * own tables. When a change is one feature, the blast radius should be one
 * feature.
 *
 * The DDL is extracted from db/schema.sql so there is exactly one definition of
 * each table - a hand-copied CREATE TABLE here would silently drift from the
 * schema file the next time a column is added.
 *
 * Run: node scripts/smsSettingsDbRepair.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');

// Comments are stripped before slicing. A `--` comment can contain a semicolon
// ("... a different subset;"), and splitting on the first `;` in the raw file
// would cut the CREATE TABLE in half and glue the next statement onto it.
const sqlOnly = schema.replace(/--[^\n]*/g, '');

// Pull the CREATE TABLE and the two ALTER TABLE statements, so this script can
// never disagree with db/schema.sql about columns or constraint shape.
function slice(startMarker) {
  const start = sqlOnly.indexOf(startMarker);
  if (start < 0) throw new Error(`db/schema.sql no longer contains: ${startMarker}`);
  return sqlOnly.slice(start, sqlOnly.indexOf(';', start) + 1);
}

const ddl = [
  slice('CREATE TABLE IF NOT EXISTS store_sms_settings'),
  slice('ALTER TABLE store_sms_settings DROP CONSTRAINT IF EXISTS store_sms_settings_provider_ready_check'),
  slice('ALTER TABLE store_sms_settings ADD CONSTRAINT store_sms_settings_provider_ready_check'),
  // Platform SMS quota: per-period usage, the carry-over balance, the pricing
  // switches and the prepaid-payment audit trail.
  slice('CREATE TABLE IF NOT EXISTS store_sms_usage'),
  slice('CREATE TABLE IF NOT EXISTS store_sms_balance'),
  slice('CREATE TABLE IF NOT EXISTS sms_settings'),
  slice('CREATE TABLE IF NOT EXISTS sms_pack_payments'),
  slice('CREATE UNIQUE INDEX IF NOT EXISTS sms_pack_payments_reference_idx'),
  slice('ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_sms_monthly_segments_check'),
  slice('ALTER TABLE plans ADD COLUMN IF NOT EXISTS sms_monthly_segments'),
  slice('ALTER TABLE plans ADD CONSTRAINT plans_sms_monthly_segments_check'),
  // Backfill, and only where the column is still 0 so an admin's configured
  // figure survives a re-run.
  slice("UPDATE plans SET sms_monthly_segments = 50 WHERE id = 'growth'"),
  slice("UPDATE plans SET sms_monthly_segments = 100 WHERE id = 'scale'"),
].join('\n');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * Read-only probe: run the WHOLE schema.sql in a transaction and roll it back.
 *
 * applySchema.js applies db/schema.sql inside one transaction, so a single bad
 * statement means NO schema is applied at all and every request fails. This
 * proves the file applies end to end without leaving anything behind.
 */
async function verifyFullSchemaApplies() {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  const { splitSql } = await import('../db/applySchema.js');
  const statements = splitSql(raw);
  console.log(`[sms-db] schema.sql splits into ${statements.length} statements`);

  await pool.query('BEGIN');
  try {
    for (const [i, stmt] of statements.entries()) {
      try {
        await pool.query(stmt);
      } catch (e) {
        const head = stmt.slice(0, 120).replace(/\s+/g, ' ');
        throw new Error(`statement ${i + 1}/${statements.length} failed: ${e.message}\n      SQL: ${head}...`);
      }
    }
    console.log('[sms-db] verified: the whole schema.sql applies without error');
  } finally {
    await pool.query('ROLLBACK');
  }
}

/**
 * How long does a FULL schema re-apply take, and does the checksum actually
 * short-circuit a second run?
 *
 * `/health` reports `appliedNow: true` on every single request in production,
 * which means the stored checksum never matches the file and every cold start
 * replays all ~83 statements inside the request path. That is slow enough to be
 * a plausible cause of intermittent 500s: the request is doing DDL work, not
 * just serving. This measures the real cost and confirms the no-op path works.
 */
async function measureSchemaApplyCost() {
  const { splitSql, schemaChecksum } = await import('../db/applySchema.js');
  const raw = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  const sum = schemaChecksum(raw);

  const { rows } = await pool.query('SELECT checksum, applied_at FROM schema_state WHERE id = 1');
  const stored = rows[0]?.checksum || '(no marker row)';
  console.log(`[sms-db] schema_state checksum: ${stored === sum ? 'MATCHES the file' : 'DIFFERS from the file'}`);
  if (stored !== sum) {
    console.log('[sms-db]   file:  ' + sum);
    console.log('[sms-db]   stored:' + stored);
    console.log('[sms-db]   => every cold start replays the whole DDL inside a request');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const t0 = Date.now();
    for (const stmt of splitSql(raw)) await client.query(stmt);
    const ms = Date.now() - t0;
    console.log(`[sms-db] a full schema apply takes ${ms}ms`);
    if (ms > 3000) {
      console.warn(`[sms-db] WARNING: ${ms}ms of DDL inside the request path is a 500 risk on a cold start`);
    }
    await client.query('ROLLBACK');
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* noop */ }
    throw e;
  } finally {
    client.release();
  }
}

try {
  await pool.query(ddl);
  await measureSchemaApplyCost();
  console.log('[sms-db] store_sms_settings + readiness constraint applied');
  await verifyFullSchemaApplies();

  /* ------------------------ Deployment state probe ------------------------- */
  // Which build is actually live? A 404 on a route this file adds means the
  // deployed bundle predates it, which is the difference between "my change is
  // broken in production" and "production has not received my change yet".
  console.log('[sms-db] deployment probe:');
  for (const [name, path] of [
    ['store_sms_settings (BYOK, shipped earlier)', '/api/sms-settings'],
    ['/api/sms-packs (new, this change)', '/api/sms-packs'],
  ]) {
    const base = process.env.SMOKE_BASE_URL || '';
    if (!base) {
      console.log(`[sms-db]   ${name}: skipped (set SMOKE_BASE_URL to probe a live host)`);
      continue;
    }
    try {
      const res = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15_000) });
      const body = await res.text();
      const hint = res.status === 404
        ? 'NOT DEPLOYED (route missing on the live host)'
        : res.status === 401 || res.status === 403
          ? 'deployed (auth required, as expected)'
          : `status ${res.status}`;
      console.log(`[sms-db]   ${name}: ${hint}`);
      if (res.status >= 500) console.log(`[sms-db]     body: ${body.slice(0, 200)}`);
    } catch (e) {
      console.log(`[sms-db]   ${name}: probe failed - ${e.message}`);
    }
  }

  const { rows: cols } = await pool.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'store_sms_settings' ORDER BY ordinal_position`);
  console.log('[sms-db] columns:', cols.map((c) => c.column_name).join(', '));

  const { rows: con } = await pool.query(`
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'store_sms_settings'::regclass AND contype = 'c'`);
  console.log('[sms-db] check constraints:', con.map((c) => c.conname).join(', ') || '(none)');
  if (!con.some((c) => c.conname === 'store_sms_settings_provider_ready_check')) {
    throw new Error('readiness constraint was not created');
  }

  // Prove the constraint actually bites: enabling order SMS with no credentials
  // must be rejected by the database, not merely by the service layer.
  await pool.query('BEGIN');
  try {
    await pool.query(`
      INSERT INTO store_sms_settings (store_id, provider, enable_order_sms)
      SELECT id, 'MNOTIFY', TRUE FROM stores LIMIT 1`);
    throw new Error('constraint did NOT block enabling order SMS without credentials');
  } catch (e) {
    if (!/constraint/i.test(e.message)) throw e;
    console.log('[sms-db] verified: enabling order SMS without credentials is rejected');
  } finally {
    await pool.query('ROLLBACK');
  }
  console.log('[sms-db] OK');

  /* -------------------- Platform SMS quota verification -------------------- */
  // Structural assertions for the quota schema, so a partial migration fails
  // here rather than at 2am on the first order SMS.
  const required = ['store_sms_usage', 'store_sms_balance', 'sms_settings', 'sms_pack_payments'];
  const { rows: tbls } = await pool.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_name = ANY($1::text[])`,
    [required],
  );
  const found = new Set(tbls.map((t) => t.table_name));
  const missing = required.filter((t) => !found.has(t));
  if (missing.length) throw new Error(`quota tables missing: ${missing.join(', ')}`);
  console.log('[sms-db] quota tables present:', required.join(', '));

  // plans.sms_monthly_segments must exist and be seeded.
  const { rows: col } = await pool.query(
    `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
      WHERE table_name = 'plans' AND column_name = 'sms_monthly_segments'`);
  if (!col.length) throw new Error('plans.sms_monthly_segments was not added');
  console.log('[sms-db] plans.sms_monthly_segments:', col[0].data_type, '| nullable:', col[0].is_nullable);

  const { rows: allowances } = await pool.query(
    'SELECT id, sms_monthly_segments FROM plans ORDER BY sort_order, id');
  console.log('[sms-db] plan allowances:',
    allowances.map((p) => `${p.id}=${p.sms_monthly_segments}`).join(' ') || '(no plans seeded yet)');

  // The price ships UNSET on purpose. If this ever finds a value, somebody
  // hard-coded a real charged price that nobody chose.
  const { rows: sms } = await pool.query(
    'SELECT price_per_segment, min_purchase, is_purchases_enabled FROM sms_settings WHERE id = 1');
  console.log('[sms-db] sms_settings:',
    sms.length
      ? `price=${sms[0].price_per_segment} min=${sms[0].min_purchase} enabled=${sms[0].is_purchases_enabled}`
      : '(row not created yet - created on first admin save)');
  if (sms.length && sms[0].price_per_segment != null) {
    console.warn('[sms-db] NOTE: a per-segment price is set. Purchases are charged real money at this rate.');
  }

  // A negative balance must be impossible: the CHECK is what stops a bug from
  // handing out more segments than were paid for.
  await pool.query('BEGIN');
  try {
    await pool.query(`INSERT INTO store_sms_balance (store_id, segments)
                      SELECT id, -1 FROM stores LIMIT 1`);
    throw new Error('CHECK did NOT block a negative segment balance');
  } catch (e) {
    if (!/constraint/i.test(e.message)) throw e;
    console.log('[sms-db] verified: a negative segment balance is rejected');
  } finally {
    await pool.query('ROLLBACK');
  }

  /* ------------------- Live quota behaviour, with a full restore ------------- */
  // The checks above prove the SHAPE. This proves the BEHAVIOUR against the real
  // schema: consumption order, the hard block at zero, and that a downgrade does
  // not destroy prepaid segments.
  //
  // Note this does NOT wrap everything in one transaction: smsQuota.js uses its
  // own pooled connection, so it cannot see an uncommitted plan change and
  // would resolve the OLD allowance. The original plan and the original
  // usage/balance rows are therefore captured up front and written back in the
  // finally block, so the walkthrough leaves the database exactly as it found it.
  const { rows: storeRows } = await pool.query(
    'SELECT id, plan, plan_cycle, plan_period_end FROM stores ORDER BY created_at LIMIT 1');
  const store = storeRows[0];
  if (!store) {
    console.log('[sms-db] no store rows yet - skipping the live quota walkthrough');
  } else {
    const sid = store.id;
    const { rows: usageBefore } = await pool.query(
      'SELECT period_start, period_end, plan_segments_used FROM store_sms_usage WHERE store_id = $1', [sid]);
    const { rows: balanceBefore } = await pool.query(
      'SELECT segments FROM store_sms_balance WHERE store_id = $1', [sid]);

    try {
      const { consumeSegments, creditPurchase, getQuota } =
        await import('../services/smsQuota.js');

      // Force a known plan and a known starting balance.
      await pool.query('UPDATE stores SET plan = $2 WHERE id = $1', [sid, 'scale']);
      await pool.query('DELETE FROM store_sms_usage WHERE store_id = $1', [sid]);
      await pool.query('DELETE FROM store_sms_balance WHERE store_id = $1', [sid]);

      let q = await getQuota(sid);
      if (q.allowance !== 100) throw new Error(`expected scale allowance 100, got ${q.allowance}`);
      console.log('[sms-db] live: scale allowance resolves to 100 segments');

      // Spend 30 and confirm only the free allowance moved.
      let r = await consumeSegments(sid, 30);
      if (!r.ok || r.fromAllowance !== 30 || r.fromPurchased !== 0) {
        throw new Error(`expected 30 from the allowance, got ${JSON.stringify(r)}`);
      }
      console.log('[sms-db] live: 30 segments spent from the free allowance');

      // Prepaid top-up, then prove the allowance is spent BEFORE it.
      await creditPurchase(sid, 500);
      r = await consumeSegments(sid, 80);
      if (r.fromAllowance !== 70 || r.fromPurchased !== 10) {
        throw new Error(`expected the 70-segment allowance then 10 prepaid, got ${JSON.stringify(r)}`);
      }
      console.log('[sms-db] live: the free allowance is spent before prepaid segments');

      // Exhaust the allowance, leaving only prepaid behind.
      r = await consumeSegments(sid, 10);
      if (r.fromPurchased !== 10) throw new Error('prepaid segments should cover the remainder');

      q = await getQuota(sid);
      if (q.allowanceRemaining !== 0 || q.purchased !== 480) {
        throw new Error(`expected 0 free / 480 prepaid, got ${JSON.stringify(q)}`);
      }
      console.log('[sms-db] live: allowance now 0, 480 prepaid segments remain');

      // Drain the prepaid balance, then the quota must refuse.
      await consumeSegments(sid, 480);
      q = await getQuota(sid);
      if (!q.exhausted) throw new Error('the quota should report exhausted');

      r = await consumeSegments(sid, 1);
      if (r.ok || r.reason !== 'QUOTA_EXHAUSTED') {
        throw new Error(`an exhausted quota must refuse, got ${JSON.stringify(r)}`);
      }
      console.log('[sms-db] live: an exhausted quota refuses to send (QUOTA_EXHAUSTED)');

      // Starter has no allowance, but a carried-over balance still works -
      // this is what makes a downgrade non-destructive.
      await creditPurchase(sid, 25);
      await pool.query('UPDATE stores SET plan = $2 WHERE id = $1', [sid, 'starter']);
      r = await consumeSegments(sid, 5);
      if (!r.ok || r.fromPurchased !== 5) {
        throw new Error(`prepaid segments must survive a downgrade, got ${JSON.stringify(r)}`);
      }
      console.log('[sms-db] live: prepaid segments survive a downgrade to a zero-allowance plan');
    } finally {
      // Restore exactly what was there before.
      await pool.query(
        'UPDATE stores SET plan = $2, plan_cycle = $3, plan_period_end = $4 WHERE id = $1',
        [sid, store.plan, store.plan_cycle, store.plan_period_end],
      );
      await pool.query('DELETE FROM store_sms_usage WHERE store_id = $1', [sid]);
      for (const row of usageBefore) {
        await pool.query(
          `INSERT INTO store_sms_usage (store_id, period_start, period_end, plan_segments_used)
           VALUES ($1, $2, $3, $4) ON CONFLICT (store_id, period_start) DO NOTHING`,
          [sid, row.period_start, row.period_end, row.plan_segments_used],
        );
      }
      await pool.query('DELETE FROM store_sms_balance WHERE store_id = $1', [sid]);
      for (const row of balanceBefore) {
        await pool.query(
          `INSERT INTO store_sms_balance (store_id, segments) VALUES ($1, $2)
           ON CONFLICT (store_id) DO NOTHING`,
          [sid, row.segments],
        );
      }
      console.log('[sms-db] live walkthrough finished - store plan and balances restored');

      // Prove the restore actually worked, so running this script twice is safe
      // and a future failure can never leave a tenant on the wrong plan.
      const { rows: after } = await pool.query(
        'SELECT plan, plan_cycle FROM stores WHERE id = $1', [sid]);
      if (after[0]?.plan !== store.plan || after[0]?.plan_cycle !== store.plan_cycle) {
        throw new Error(`restore failed: store is on ${after[0]?.plan}, expected ${store.plan}`);
      }
      const { rows: balAfter } = await pool.query(
        'SELECT segments FROM store_sms_balance WHERE store_id = $1', [sid]);
      const balNow = balAfter.length ? Number(balAfter[0].segments) : 0;
      const balWas = balanceBefore.length ? Number(balanceBefore[0].segments) : 0;
      if (balNow !== balWas) {
        throw new Error(`restore failed: balance is ${balNow}, expected ${balWas}`);
      }
      console.log('[sms-db] live: restore verified - plan and balance match the originals');
    }
  }
} finally {
  await pool.end();
}