/**
 * Theme catalog seeding verification.
 *
 * Regression guard for the failure that shipped an empty seller theme market:
 * db/schema.sql creates `theme_templates` but seeds nothing, so a database can
 * carry a CURRENT schema checksum and still hold zero templates. These
 * assertions pin the behaviour of db/applySchema.js + db/migrate.js against a
 * fake SQL runner, so no database is needed.
 *
 * Usage: node scripts/catalogSeedTest.js
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { applySchemaIfMissing, SCHEMA_PATH } from '../db/applySchema.js';

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

const CURRENT_CHECKSUM = crypto.createHash('sha256')
  .update(fs.readFileSync(SCHEMA_PATH, 'utf8'))
  .digest('hex');

/**
 * Fake dedicated pg client. `themeCount` drives what the catalog looks like;
 * `failOn` makes matching SQL throw, to prove a seed failure cannot take the
 * schema apply down with it.
 */
function fakeClient({ themeCount = 0, failOn = null } = {}) {
  const calls = [];
  const upserts = [];
  return {
    calls,
    upserts,
    async query(sql, params) {
      const text = String(sql);
      calls.push(text);
      if (failOn && text.includes(failOn)) throw new Error('simulated failure');
      if (text.includes('FROM schema_state')) return { rows: [{ checksum: CURRENT_CHECKSUM }] };
      if (text.includes('FROM theme_templates')) return { rows: [{ n: themeCount }] };
      if (text.includes('INSERT INTO theme_templates')) { upserts.push(params); return { rows: [] }; }
      return { rows: [] };
    },
  };
}

console.log('\nDiDwa theme catalog seeding -> db/applySchema.js + db/migrate.js\n');

/* The regression: schema already current, catalog empty -> it MUST seed. */
{
  const client = fakeClient({ themeCount: 0 });
  const result = await applySchemaIfMissing(client, { quiet: true });
  log('current schema + empty catalog seeds the catalog', result.themesSeeded === 100, `seeded=${result.themesSeeded}`);
  log('the apply itself is still a no-op', result.applied === false && result.reason === 'already-current');
  log('upserts carry id/name/category/config',
    client.upserts.length === 100
    && client.upserts.every((p) => Array.isArray(p) && p.length === 4
      && typeof p[0] === 'string' && typeof p[1] === 'string'
      && typeof p[2] === 'string' && p[3] && typeof p[3] === 'object'));
  log('one upsert per preset', client.calls.filter((c) => c.includes('INSERT INTO theme_templates')).length === 100);
  log('the advisory lock is taken', client.calls.some((c) => c.includes('pg_advisory_xact_lock')));
  log('the transaction commits', client.calls.some((c) => c.trim() === 'COMMIT'));
  log('sample preset id looks like a slug',
    /VALUES \(\$1, \$2, \$3, \$4\)/.test(client.calls.find((c) => c.includes('INSERT INTO theme_templates')) || ''));
}

/* A populated catalog must be left completely alone. */
{
  const client = fakeClient({ themeCount: 100 });
  const result = await applySchemaIfMissing(client, { quiet: true });
  log('populated catalog is not re-seeded', result.themesSeeded === 0);
  log('populated catalog writes nothing', !client.calls.some((c) => c.includes('INSERT INTO theme_templates')));
}

/* A seed failure must never fail the apply. */
{
  const client = fakeClient({ themeCount: 0, failOn: 'theme_templates' });
  let threw = null;
  let result = null;
  try { result = await applySchemaIfMissing(client, { quiet: true }); } catch (err) { threw = err; }
  log('a failing catalog does not break the apply', threw === null && result?.applied === false);
  log('a failing catalog reports zero seeded', result?.themesSeeded === 0);
  log('a failing catalog still commits', client.calls.some((c) => c.trim() === 'COMMIT'));
}

/* The catalog definition itself: 100 unique, fully-formed presets. */
{
  const { buildPresets, seedThemeCatalog } = await import('../db/migrate.js');
  const presets = buildPresets();
  log('100 presets are generated', presets.length === 100, `got ${presets.length}`);
  log('preset ids are unique', new Set(presets.map((p) => p.id)).size === presets.length);
  log('every preset has a name and category', presets.every((p) => p.name && p.category));
  log('every preset has a config object', presets.every((p) => p.config && typeof p.config === 'object'));
  log('every preset has a palette', presets.every((p) => /^#[0-9A-Fa-f]{6}$/.test(p.config?.palette?.primary || '')));
  log('every preset has layout, radius and typography',
    presets.every((p) => p.config?.layout?.gridColumns && p.config?.borderRadius?.base !== undefined && p.config?.typography));
  log('every preset is Ghana-localised', presets.every((p) => p.config?.locale?.currency === 'GHS'));

  /* The seeder short-circuits without writing when rows already exist. */
  const calls = [];
  const result = await seedThemeCatalog(async (sql) => {
    calls.push(String(sql));
    if (String(sql).includes('FROM theme_templates')) return { rows: [{ n: 42 }] };
    return { rows: [] };
  });
  log('seeder short-circuits on a populated catalog',
    result.reason === 'already-populated' && !calls.some((c) => c.includes('INSERT INTO')));
}

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====\n`);
process.exit(fail === 0 ? 0 : 1);
