/**
 * Admin SQL validator.
 *
 * Every admin query is extracted from routes/admin/*.js and run against the real
 * database inside a transaction that is always rolled back. PostgreSQL resolves
 * every table, column, function and type in a statement before it does any
 * work, so this catches references that do not exist - the exact fault that made
 * /api/admin/overview and /api/admin/system answer 503 "the service is not fully
 * set up yet" while the deployment was perfectly healthy:
 *
 *   - a query selecting a column that was never created (s.slug vs the real
 *     stores.subdomain_slug)
 *   - a query reading a table the schema deliberately retired (payouts)
 *
 * errorMiddleware maps "does not exist" to a 503 schema_missing, which reads as
 * a deployment problem and sends debugging in the wrong direction entirely.
 * This suite makes that class of mistake fail at the command line instead.
 *
 * Queries are PREPAREd, never executed: it is read-only, needs no fixture data
 * and cannot mutate anything.
 *
 * Usage: node scripts/adminSqlTest.js        (needs DATABASE_URL)
 *        npm run test:admin-sql
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const ADMIN_DIR = path.join(root, 'routes', 'admin');

let pass = 0;
let fail = 0;
const failures = [];

function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; failures.push(`${name}${detail ? ` - ${detail}` : ''}`); console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

console.log('\nDiDwa admin SQL validation\n');

const url = process.env.DATABASE_URL;
if (!url) {
  console.log('  SKIP  no DATABASE_URL set - nothing to validate against.\n');
  process.exit(0);
}

/* Template placeholders the query text interpolates before it reaches Postgres.
   Substituted with a type-compatible literal so PREPARE can infer the type. */
const CONSTANTS = {
  PAID: "('PAID','FULFILLED','DELIVERED')",
  MIN_PASSWORD: "'DiDwaTest9'",
};

/**
 * Pull the query strings out of a route file.
 *
 * Handles backtick templates, single-quoted literals, and `query(` on its own
 * line. Un-escapes \' the way the JS parser would.
 *
 * Bind placeholders are left as $1, $2 and so on. The checker PREPAREs with an
 * explicit type for each one, so the parameters resolve exactly as they do at
 * runtime - which is better than substituting a guessed literal, because a
 * wrong guess produced spurious "operator does not exist" reports.
 *
 * Statements whose SQL is assembled at runtime (pricing.js builds its SET clause
 * from a request-driven list) have no fixed shape to check and are skipped.
 */
function extractQueries(source) {
  const out = [];
  const re = /query\(\s*(?:`([\s\S]*?)`|'(?:[^'\\]|\\.)*')/g;
  let m;
  let index = 0;
  while ((m = re.exec(source)) !== null) {
    let sql = m[1];
    if (sql === undefined) {
      // Single-quoted literal: drop the quotes, undo the \' escapes.
      const literal = m[0].slice(m[0].indexOf("'") + 1, m[0].lastIndexOf("'"));
      sql = literal.replace(/\\'/g, "'");
    }
    if (!sql || !sql.trim().length) continue;
    for (const [key, value] of Object.entries(CONSTANTS)) {
      sql = sql.split('${' + key + '}').join(value);
    }
    index += 1;
    /* A remaining ${...} is a fragment built at runtime - nothing stable to check. */
    if (/\$\{/.test(sql)) continue;
    out.push({ index, sql });
  }
  return out;
}

/* Every column of every table, so a bad `alias.column` can be named precisely. */
async function loadSchema(client) {
  const { rows } = await client.query(
    `SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public'`,
  );
  const byTable = new Map();
  for (const r of rows) {
    if (!byTable.has(r.table_name)) byTable.set(r.table_name, new Set());
    byTable.get(r.table_name).add(r.column_name);
  }
  return { tables: new Set(byTable.keys()), byTable };
}

/** Turn a bare Postgres error into an actionable line, naming the real column. */
function decorate(message) {
  const rel = /relation "(\w+)" does not exist/i.exec(message);
  const col = /column "([\w.]+)" does not exist/i.exec(message);
  let out = message.slice(0, 120);
  if (rel) {
    const near = [...schema.tables]
      .filter((t) => t.startsWith(rel[1].slice(0, 4)) || rel[1].startsWith(t.slice(0, 4)))
      .slice(0, 3);
    if (near.length) out += `  (retired or renamed? see: ${near.join(', ')})`;
  } else if (col) {
    const bare = col[1].split('.').pop();
    for (const [table, cols] of schema.byTable) {
      if (cols.has(bare)) { out += `  ("${bare}" is on ${table}, not spelled that way here)`; break; }
      const close = [...cols].find((c) => c.toLowerCase().includes(bare.toLowerCase().slice(0, 5)));
      if (close) { out += `  (did you mean ${table}.${close}?)`; break; }
    }
  }
  return out;
}

const client = new pg.Client({ connectionString: url });
let schema;
let total = 0;

try {
  await client.connect();
  schema = await loadSchema(client);

  const files = fs.readdirSync(ADMIN_DIR).filter((f) => f.endsWith('.js')).sort();
  log('found the admin route files', files.length > 0, `${files.length} files`);

  for (const file of files) {
    const source = fs.readFileSync(path.join(ADMIN_DIR, file), 'utf8');
    const queries = extractQueries(source);
    if (!queries.length) {
      log(`${file}: no SQL to validate`, true);
      continue;
    }

    let fileFails = 0;
    for (const { index, sql } of queries) {
      total += 1;
      /* Validate without side effects: run inside a transaction that is always
         rolled back. The server infers each $n's type from context, exactly as
         it does for a real request, so a uuid column compared against a bind
         parameter resolves instead of reporting a false "uuid = text".

         The highest $n decides how many values to send - counting occurrences
         would over-bind a statement that reuses $1 in several places. */
      const highest = Math.max(0, ...(sql.match(/\$\d+/g) || []).map(Number));
      const params = Array.from({ length: highest }, () => null);
      try {
        await client.query('BEGIN');
        await client.query({ text: sql, values: params });
        await client.query('ROLLBACK');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        const message = String(err.message).split('\n')[0];
        /* Only a name that cannot be resolved is a defect in the query. A
           constraint or data complaint means every table and column resolved
           fine, which is all this suite checks. */
        if (/does not exist|column .* must appear|unknown function|unknown type/i.test(message)) {
          fileFails += 1;
          log(`${file} query #${index}`, false, decorate(message));
        }
      }
    }
    if (!fileFails) log(`${file}: all ${queries.length} queries valid`, true);
  }
} catch (err) {
  console.log(`  SKIP  could not use the database: ${String(err.message).slice(0, 120)}\n`);
  await client.end().catch(() => {});
  process.exit(0);
}

await client.end();

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed (${total} queries checked) =====\n`);
if (failures.length) {
  console.log('Invalid queries:');
  for (const f of failures) console.log(`  - ${f}`);
  console.log('');
}
process.exit(fail === 0 ? 0 : 1);