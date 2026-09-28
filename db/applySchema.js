/**
 * db/applySchema.js
 * Idempotent, concurrency-safe application of db/schema.sql.
 *
 * Why this exists: the schema used to be applied by hand (`npm run db:init`).
 * That step is easy to forget on a fresh deployment, and the symptom is an
 * opaque `relation "stores" does not exist` on every request. This module lets
 * the running app apply the schema itself, so a fresh database becomes usable
 * without any manual step.
 *
 * Safety properties:
 *   - Runs inside a single transaction, so a failure leaves nothing half-applied.
 *   - Takes a Postgres advisory lock, so concurrent serverless cold starts
 *     cannot race each other into conflicting DDL.
 *   - Skips all DDL when the applied checksum matches the file, so a warm
 *     instance does no DDL work on every request and only replays the two
 *     idempotent catalogue seeds. The checksum is line-ending insensitive, so a
 *     Windows (CRLF) checkout matches a schema applied from the LF file.
 *   - The schema uses IF NOT EXISTS throughout, so re-applying is safe.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { seedThemeCatalog } from './migrate.js';
import { seedDomainPricing } from './domainCatalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

/** Stable advisory-lock key so all instances agree on the same lock. */
const LOCK_KEY = 8_147_231;

/**
 * Fail fast if another instance is mid-apply, instead of blocking the request
 * until the platform's execution limit (300s on Vercel).
 */
const LOCK_TIMEOUT_MS = 15_000;

/**
 * The schema marker table. It lives outside schema.sql so it survives future
 * schema edits - a table inside the schema could never record "this file was
 * applied", because dropping it would erase the record.
 */
const SCHEMA_STATE_DDL = `
  CREATE TABLE IF NOT EXISTS schema_state (
    id         INTEGER PRIMARY KEY DEFAULT 1,
    checksum   TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

/**
 * Split a SQL file into individual statements.
 *
 * A naive split on ';' corrupts the schema because the trial-period trigger is
 * a dollar-quoted function body containing semicolons. This splitter tracks
 * string, quoted-identifier, dollar-quote, line-comment and block-comment state
 * so only top-level semicolons terminate a statement.
 */
export function splitSql(sql) {
  const statements = [];
  let current = '';
  let i = 0;
  let dollarTag = null;

  const len = sql.length;
  while (i < len) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Line comment
    if (ch === '-' && next === '-') {
      const end = sql.indexOf('\n', i);
      i = end === -1 ? len : end;
      continue;
    }

    // Block comment
    if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? len : end + 2;
      continue;
    }

    // Dollar-quoted block ($tag$ ... $tag$)
    if (ch === '$') {
      const match = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(i));
      if (match) {
        const tag = match[0];
        if (dollarTag === null) {
          dollarTag = tag;
          current += tag;
          i += tag.length;
          continue;
        }
        if (dollarTag === tag) {
          current += tag;
          i += tag.length;
          dollarTag = null;
          continue;
        }
      }
    }

    // Single-quoted string ('' escapes)
    if (ch === "'" && dollarTag === null) {
      current += ch;
      i += 1;
      while (i < len) {
        if (sql[i] === "'" && sql[i + 1] === "'") { current += "''"; i += 2; continue; }
        current += sql[i];
        if (sql[i] === "'") { i += 1; break; }
        i += 1;
      }
      continue;
    }

    // Double-quoted identifier ("" escapes)
    if (ch === '"' && dollarTag === null) {
      current += ch;
      i += 1;
      while (i < len) {
        if (sql[i] === '"' && sql[i + 1] === '"') { current += '""'; i += 2; continue; }
        current += sql[i];
        if (sql[i] === '"') { i += 1; break; }
        i += 1;
      }
      continue;
    }

    // Top-level statement terminator
    if (ch === ';' && dollarTag === null) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

/**
 * Create the marker table if needed and record the applied schema checksum.
 *
 * Marker table lives outside schema.sql so it survives future schema edits, and
 * it must be written by EVERY applier: a manual `npm run db:init` that applies
 * schema.sql without recording the checksum leaves the marker stale, so the next
 * cold start re-runs the whole DDL instead of taking the no-op path.
 *
 * @param {(sql: string, params?: any[]) => Promise<any>} exec
 * @param {string} value - the schema checksum the app compares against
 */
export async function recordSchemaState(exec, value) {
  await exec(SCHEMA_STATE_DDL);
  await exec(
    'INSERT INTO schema_state (id, checksum, applied_at) VALUES (1, $1, NOW()) '
    + 'ON CONFLICT (id) DO UPDATE SET '
    + 'checksum = EXCLUDED.checksum, applied_at = EXCLUDED.applied_at',
    [value],
  );
}

/**
 * Hash of a schema file's CONTENT, independent of how the checkout wrote it.
 *
 * The line endings MUST be normalised. Git stores db/schema.sql with LF, but a
 * Windows checkout (core.autocrlf=true) writes CRLF, and hashing the raw bytes
 * made the same schema hash to a different value on Windows than on the Linux
 * host that originally applied it. The checksum then never matched, so every
 * boot re-ran the entire DDL instead of taking the no-op path.
 *
 * Exported so scripts/dbInit.js can record exactly the value this module
 * compares against - otherwise a manual apply leaves a stale marker behind and
 * the next boot re-applies the whole schema.
 *
 * @param {string} text
 * @returns {string} hex sha256
 */
export function schemaChecksum(text) {
  const normalized = String(text).replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Applies db/schema.sql when the stored checksum differs from the file.
 *
 * IMPORTANT: this must run on ONE dedicated pool client, not `pool.query()`.
 * `pg_advisory_lock()` is session-scoped, so acquiring it on one pooled
 * connection and releasing it on another leaks the lock permanently. Once
 * every pooled client holds a lock, all later requests block until the
 * function times out. The transaction-scoped `pg_advisory_xact_lock()` below
 * is released automatically on COMMIT/ROLLBACK, so it cannot leak.
 *
 * @param {{ query: (sql: string, params?: any[]) => Promise<any> }} client - a dedicated pg client
 * @param {{ quiet?: boolean }} [options]
 * @returns {Promise<{
 *   applied: boolean,
 *   statements: number,
 *   checksum: string,
 *   themesSeeded: number,
 *   domainsSeeded: number,
 *   reason?: string,
 * }>} `themesSeeded` and `domainsSeeded` count rows actually written, so a warm
 *   database reports 0 and 0.
 */
export async function applySchemaIfMissing(client, { quiet = true } = {}) {
  // Params MUST be forwarded: the catalog seeder runs parameterised upserts
  // through this runner, and dropping them would insert nothing.
  const exec = (sql, params) => client.query(sql, params);
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const sum = schemaChecksum(sql);

  // Marker table lives outside schema.sql so it survives future schema edits.
  // It MUST exist before the read below: a failing statement inside a
  // transaction aborts it, and every later statement in the apply would fail.
  await exec(SCHEMA_STATE_DDL);

  await exec('BEGIN');
  try {
    // Transaction-scoped lock: auto-released on commit/rollback, never leaks.
    // A short lock_timeout means a stuck holder fails fast instead of hanging
    // the request for the platform's full execution limit.
    await exec(`SET LOCAL lock_timeout = ${LOCK_TIMEOUT_MS}`);
    await exec('SELECT pg_advisory_xact_lock(' + LOCK_KEY + ')');

    let existing = null;
    try {
      const res = await exec('SELECT checksum FROM schema_state WHERE id = 1');
      existing = res?.rows?.[0]?.checksum || null;
    } catch {
      existing = null; // marker table is empty
    }

    /* The theme catalog and the domain catalogue are seeded on every apply -
       including the no-op path - because a database can carry a current schema
       and still hold zero templates or zero priced TLDs, which is exactly what
       an unseeded fresh database looks like. Each catalogue is reported
       separately, so a half-seeded database is visible in the return value and
       the two counts are never added together. */
    const seedCatalog = async () => {
      let themes = 0;
      let domains = 0;
      try {
        const result = await seedThemeCatalog(exec);
        if (result.seeded) {
          console.log(`[db] theme catalog seeded (${result.seeded} templates).`);
        }
        themes = result.seeded;
      } catch (err) {
        // Never fail the schema apply over a catalog: the app still runs, and
        // `npm run db:migrate` can seed it later.
        console.warn('[db] theme catalog not seeded:', err.message);
      }
      try {
        const pricing = await seedDomainPricing(exec);
        if (pricing.seeded) {
          console.log(`[db] domain catalogue seeded (${pricing.seeded} TLDs).`);
        }
        domains = pricing.seeded;
      } catch (err) {
        console.warn('[db] domain catalogue not seeded:', err.message);
      }
      return { themes, domains };
    };

    if (existing === sum) {
      const seeded = await seedCatalog();
      await exec('COMMIT');
      return {
        applied: false,
        statements: 0,
        checksum: sum,
        themesSeeded: seeded.themes,
        domainsSeeded: seeded.domains,
        reason: 'already-current',
      };
    }

    const statements = splitSql(sql);
    for (const statement of statements) {
      await exec(statement);
    }
    // The DDL above guarantees the tables exist, so the catalogues can be filled.
    const seeded = await seedCatalog();
    // Parameterised (never interpolated) and shared with `npm run db:init`, so
    // every applier records the marker in exactly the same form.
    await recordSchemaState(exec, sum);
    await exec('COMMIT');

    if (!quiet) {
      console.log(`[db] schema applied automatically (${statements.length} statements).`);
    }
    return {
      applied: true,
      statements: statements.length,
      checksum: sum,
      themesSeeded: seeded.themes,
      domainsSeeded: seeded.domains,
    };
  } catch (err) {
    try { await exec('ROLLBACK'); } catch { /* noop */ }
    throw err;
  }
}

export default applySchemaIfMissing;
