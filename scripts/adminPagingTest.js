/**
 * Admin list-paging guard.
 *
 * Every admin list endpoint funnels through `paged()` in routes/admin/helpers.js.
 * That helper runs a COUNT and a page query side by side, and the two need
 * DIFFERENT parameter lists:
 *
 *   countSql  - the filters only
 *   rowsSql   - the filters, then LIMIT and OFFSET
 *
 * Passing the same full array to both made Postgres reject the bind with
 * SQLSTATE 08P01 ("bind message supplies N parameters, but prepared statement
 * requires M"), which surfaces to the operator as a 500 "Something went wrong on
 * our side" on EVERY paginated admin list page - merchants, orders, catalog,
 * customers, domains, riders, payments, themes, team and audit.
 *
 * This suite checks the contract from both sides:
 *   1. `paged()` appends LIMIT/OFFSET to the rows query only.
 *   2. No call site passes row bindings itself.
 *
 * Usage: node scripts/adminPagingTest.js   (no server and no database needed)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const ADMIN_DIR = path.join(root, 'routes', 'admin');

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

/* Read a file relative to the project root, not to this script's directory. */
const readRepo = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const read = (f) => readRepo(path.join('routes', 'admin', f));
const files = fs.readdirSync(ADMIN_DIR).filter((f) => f.endsWith('.js'));

console.log('\nDiDwa admin paging contract\n');

/* ---------- The helper must split the parameter lists ---------- */
const helpers = read('helpers.js');

log('paged() appends limit and offset for the rows query',
  /\[\.\.\.params,\s*limit,\s*offset\]/.test(helpers));
log('paged() gives countSql the filters alone',
  /query\(countSql,\s*params\)/.test(helpers));
log('paged() does not send the full array to both queries',
  !/query\(countSql,\s*params\),\s*query\(rowsSql,\s*params\)\)/.test(helpers));
log('paged() is the shared list helper',
  /export async function paged/.test(helpers));

/* ---------- No call site may pre-append the row bindings ---------- */
const offenders = [];
let callSites = 0;
for (const file of files) {
  const source = read(file);
  /* Each `paged({` call, matched lazily to its own closing brace. A lazy
     [\s\S]*? would otherwise run past one call into the next. */
  const calls = source.match(/paged\(\{[\s\S]*?\n\s*\}\)/g) || [];
  for (const call of calls) {
    callSites += 1;
    /* Any `plan.limit` / `plan.offset` in the arguments means the caller is
       binding the rows itself, which is what double-counts against countSql.
       The `page:`/`limit:`/`offset:` shorthand properties are expected here. */
    const args = call.replace(/\b(page|limit|offset):\s*plan\.[a-z]+,?/g, '');
    if (/plan\.limit/.test(args) || /plan\.offset/.test(args)) offenders.push(file);
  }
}
log('every paged() call site was inspected', callSites >= 10, `${callSites} call sites`);
log('no call site passes limit/offset itself', offenders.length === 0, offenders.join(', '));

/* The old call shape must be gone from the tree entirely. */
const anyOldShape = files.filter((f) => /params:\s*\[\.\.\.params,\s*plan\.limit/.test(read(f)));
log('the old `params: [...params, plan.limit, plan.offset]` shape is gone',
  anyOldShape.length === 0, anyOldShape.join(', '));

/* ---------- The 08P01 failure mode stays visible in the logs ---------- */
log('errorMiddleware still maps an unhandled fault to a generic 500',
  /GENERIC_5XX/.test(readRepo(path.join('middleware', 'errorMiddleware.js'))));

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====\n`);
process.exit(fail === 0 ? 0 : 1);