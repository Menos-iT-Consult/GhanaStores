/**
 * Retired-schema guard.
 *
 * db/schema.sql renames tables and columns it retires to *_retired_* rather than
 * dropping them, because payout history is a financial record. The runtime code
 * must stop reading them entirely - a stale `FROM payouts` raises
 * "relation does not exist", which errorMiddleware maps to a 503
 * schema_missing, and the affected page reports "The service is not fully set
 * up yet" even though the deployment is perfectly healthy.
 *
 * That is exactly how /api/admin/overview broke: it still joined the retired
 * payouts table, so the entire platform overview 503'd.
 *
 * This suite is pure source scanning - no server, no database - so it runs in
 * CI and catches the mistake at commit time rather than at page load.
 *
 * Usage: node scripts/retiredSchemaTest.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

/** Every .js/.jsx file under a directory, recursively. */
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Strip comments so a table named in prose is not mistaken for a query. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/* Tables and columns that db/schema.sql retires. Anything reading these at
   runtime is a bug, because the schema deliberately no longer creates them. */
const RETIRED = [
  { kind: 'table',  name: 'payouts' },
  { kind: 'column', name: 'available_balance' },
  { kind: 'column', name: 'pending_balance' },
];

console.log('\nDiDwa retired-schema guard\n');

/* Server-side query files are the ones that can actually 503. */
const SCAN_DIRS = ['routes', 'services', 'middleware', 'jobs', 'db'];
const files = SCAN_DIRS
  .filter((d) => fs.existsSync(path.join(root, d)))
  .flatMap((d) => walk(path.join(root, d)));

log('found the query directories to scan', files.length > 0, `${files.length} files`);

for (const { kind, name } of RETIRED) {
  // A retired table is referenced as `payouts` in a FROM/JOIN; the guard ignores
  // `payouts_retired`, which is the intentional, harmless name.
  const pattern = kind === 'table'
    ? new RegExp(`\\b(FROM|JOIN|INTO|UPDATE)\\s+${name}\\b`, 'gi')
    : new RegExp(`\\b${name}\\b(?!_retired)`, 'g');

  const offenders = [];
  for (const file of files) {
    const rel = path.relative(root, file);
    /* db/ owns the retirement itself, so it is expected to name them. */
    if (rel.startsWith('db' + path.sep)) continue;
    const source = stripComments(fs.readFileSync(file, 'utf8'));
    if (pattern.test(source)) offenders.push(rel);
    pattern.lastIndex = 0;
  }

  log(`no runtime code reads the retired ${kind} "${name}"`,
    offenders.length === 0, offenders.join(', '));
}

/* The overview page specifically: this is the exact 503 that was reported. */
const overview = fs.readFileSync(path.join(root, 'routes', 'admin', 'overview.js'), 'utf8');
log('the admin overview no longer joins the payouts table',
  !/\b(FROM|JOIN)\s+payouts\b/i.test(stripComments(overview)));

const overviewPage = fs.readFileSync(
  path.join(root, 'src', 'pages', 'admin', 'AdminOverview.jsx'), 'utf8');
log('the overview page has no dead payout_review style',
  !overviewPage.includes('payout_review'));

/* The 503 sentence a merchant sees when this regresses. */
const errors = fs.readFileSync(path.join(root, 'middleware', 'errorMiddleware.js'), 'utf8');
log('schema faults still surface as a retryable 503',
  /status:\s*503[\s\S]{0,200}schema_missing/.test(errors));

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====\n`);
process.exit(fail === 0 ? 0 : 1);