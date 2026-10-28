/**
 * DiDwa - Neon PostgreSQL Connection Pool
 * Row-Level Multi-Tenancy: every tenant table carries store_id and every
 * query is scoped through helpers in this module.
 */
import pg from 'pg';
import dotenv from 'dotenv';
import { applySchemaIfMissing } from '../db/applySchema.js';

dotenv.config();

/**
 * Return the raw DATABASE_URL environment variable (trimmed), or an empty
 * string when it is not set. Callers use this so the truthy check below also
 * keeps its early-exit behaviour for Vercel-only deployments.
 */
function getRawDatabaseUrl() {
  return String(process.env.DATABASE_URL || '').trim();
}

/**
 * Normalize a Neon/Postgres connection string before it is passed to
 * pg.Pool, pg.Client, or the @vercel/postgres createPool/Client.
 *
 * Behaviour:
 * 1. If the URL contains `sslmode=require` (case-insensitive), replace it
 *    with `sslmode=verify-full` in place.
 * 2. If the URL has no `sslmode=` parameter at all, append
 *    `?sslmode=verify-full` (no query string) or `&sslmode=verify-full`
 *    (already a query string) to the end of the URL.
 * 3. If `sslmode=verify-full` or any other value than `require` is present,
 *    the URL is returned unchanged.
 *
 * This is a pure string transformation. It never modifies the query text,
 * parameter bindings, or schema, so existing database models and queries are
 * unaffected. It works in both Node.js and Vercel serverless environments.
 */
function normalizeDatabaseUrl(rawUrl) {
  const url = rawUrl || getRawDatabaseUrl();

  if (!url) {
    return '';
  }

  // Detect an existing `sslmode=` parameter (beginning of string or after ? or &).
  const existing = url.match(/(?:^|[?&])sslmode=([^&]*)/i);

  if (existing) {
    const current = existing[1].toLowerCase();

    if (current === 'require') {
      // Replace the first occurrence of "sslmode=require" (case-insensitive).
      return url.replace(/sslmode=require/i, 'sslmode=verify-full');
    }

    if (current === 'verify-full') {
      // Already the correct value.
      return url;
    }

    // Any other sslmode value (verify-ca, prefer, etc.) is left untouched.
    return url;
  }

  // No sslmode parameter -> append ?sslmode=verify-full or &sslmode=verify-full.
  const hasQuery = url.includes('?');
  return url + (hasQuery ? '&sslmode=verify-full' : '?sslmode=verify-full');
}

// Neon requires TLS. Detect a Neon endpoint, or allow explicit override.
const connectionString = getRawDatabaseUrl();
const ON_VERCEL = Boolean(process.env.VERCEL);

// A serverless function with no DATABASE_URL must fail loudly. Silently falling
// back to localhost:5432 produced `connect ECONNREFUSED 127.0.0.1:5432` and an
// opaque 500 on every route instead of an actionable configuration error.
if (!connectionString && ON_VERCEL) {
  throw new Error(
    'DATABASE_URL is not set. Add it in Vercel -> Project Settings -> Environment '
    + 'Variables (use the Neon pooled connection string) and redeploy.',
  );
}
if (!connectionString) {
  const hasLocalPgSettings = Boolean(
    process.env.PGHOST || process.env.PGUSER || process.env.PGPASSWORD || process.env.PGDATABASE,
  );
  if (!hasLocalPgSettings) {
    throw new Error(
      'DATABASE_URL is not set and no local PostgreSQL variables were provided. '
      + 'Set DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE before starting the app.',
    );
  }
  console.warn(
    '[db] DATABASE_URL is not set; using local PostgreSQL settings from PGHOST/PGUSER/PGDATABASE.',
  );
}

const normalizedConnectionString = normalizeDatabaseUrl(connectionString);

export const pool = new pg.Pool({
  connectionString: normalizedConnectionString || undefined,
  host: connectionString ? undefined : process.env.PGHOST || 'localhost',
  port: connectionString ? undefined : Number(process.env.PGPORT || 5432),
  user: connectionString ? undefined : process.env.PGUSER || 'postgres',
  password: connectionString ? undefined : process.env.PGPASSWORD || 'postgres',
  database: connectionString ? undefined : process.env.PGDATABASE || 'didwa',
  max: Number(process.env.PGPOOL_MAX || (process.env.VERCEL ? 3 : 10)),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  ssl: (process.env.PGSSL ?? '').toLowerCase() === 'true' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

/**
 * Ensures the schema exists exactly once per process, then never again.
 *
 * This is what makes a fresh deployment self-healing: the first query on a cold
 * serverless instance applies db/schema.sql, so `npm run db:init` is no longer a
 * required manual step. The promise is memoised, so warm instances do no work.
 * Failure is recorded and rethrown so the caller still sees the real error.
 */
let schemaPromise = null;
let schemaState = 'unchecked';

export async function ensureSchema() {
  if (!connectionString) return { applied: false, reason: 'no-database-url' };
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    // A dedicated client is required: the advisory lock is transaction-scoped
    // and must be acquired and released on the SAME connection. Using
    // pool.query() per statement would spread them across connections.
    const client = await pool.connect();
    try {
      const result = await applySchemaIfMissing(client, { quiet: true });
      schemaState = result.applied ? 'applied' : 'current';
      if (result.applied) {
        console.log(`[db] schema applied automatically (${result.statements} statements).`);
      }
      return result;
    } catch (err) {
      schemaState = 'failed';
      schemaPromise = null; // allow a later request to retry
      console.error('[db] automatic schema application failed:', err.message);
      throw err;
    } finally {
      client.release();
    }
  })();

  return schemaPromise;
}

export function getSchemaState() {
  return schemaState;
}

/** Parameterized single query. Never interpolate user input into `text`. */
export async function query(text, params = []) {
  await ensureSchema();
  return pool.query(text, params);
}

/**
 * Run `fn` inside a dedicated client transaction.
 * fn receives a tagged t.query(t, client). Commits on resolve,
 * rolls back on throw, always releases the client.
 */
export async function withTransaction(fn) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const t = {
      client,
      query: (text, params = []) => client.query(text, params),
    };
    const result = await fn(t);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* noop */ }
    throw err;
  } finally {
    client.release();
  }
}

/** Health probe used by /health and startup checks. */
export async function pingDb() {
  const { rows } = await pool.query('SELECT NOW() AS now');
  return rows[0];
}

/** Postgres SQLSTATE for "relation does not exist" (undefined table). */
export const UNDEFINED_TABLE = '42P01';

/** True when a Postgres error means the schema has not been applied yet. */
export function isMissingSchemaError(err) {
  return err && (err.code === UNDEFINED_TABLE || /does not exist/i.test(err.message || ''));
}

/**
 * Confirms the schema is present by touching the tenants table. A reachable
 * database with no tables is a distinct (and very common) misconfiguration:
 * DATABASE_URL is set but `npm run db:init` was never run against it.
 */
export async function assertSchema() {
  const { rows } = await pool.query('SELECT 1 FROM stores LIMIT 1');
  return rows.length >= 0;
}
export default {
  pool, query, withTransaction, pingDb, assertSchema,
  isMissingSchemaError, ensureSchema, getSchemaState,
};
