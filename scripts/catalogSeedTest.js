/**
 * Catalog seeding verification (theme presets + domain pricing TLDs).
 *
 * Regression guard for the failures that shipped an empty seller theme market
 * and an unpriced domain catalogue: db/schema.sql creates `theme_templates` and
 * `domain_pricing` but seeds neither, so a database can carry a CURRENT schema
 * checksum and still hold zero templates and zero priced TLDs. These assertions
 * pin the behaviour of db/applySchema.js + db/migrate.js + db/domainCatalog.js
 * against a fake SQL runner, so no database is needed.
 *
 * The domain catalogue assertions also pin the fix for a 65-second cold start:
 * the whole TLD catalogue must go out as ONE multi-row statement, never as one
 * round trip per TLD.
 *
 * Usage: node scripts/catalogSeedTest.js
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { applySchemaIfMissing, schemaChecksum, SCHEMA_PATH } from '../db/applySchema.js';
import { buildDomainPricingRows } from '../db/domainCatalog.js';

/** Size of the real TLD catalogue, so no assertion hardcodes 346. */
const CATALOGUE_SIZE = buildDomainPricingRows().length;

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

const RAW_SCHEMA = fs.readFileSync(SCHEMA_PATH, 'utf8');

/* What the database holds. Git stores schema.sql with LF, and a Windows
   checkout writes CRLF, so the stored checksum was recorded from the LF bytes.
   The app must still recognise that as "already current" - when it hashed the
   raw bytes instead, every boot on Windows re-applied the entire schema. */
const CURRENT_CHECKSUM = crypto.createHash('sha256')
  .update(RAW_SCHEMA.replace(/\r\n/g, '\n'))
  .digest('hex');

/**
 * Fake dedicated pg client.
 *
 * `themeCount` / `domainCount` are how many rows a catalogue already holds:
 * 0 means a fresh database, so the batch INSERT reports every row as inserted -
 * exactly what `ON CONFLICT (tld) DO NOTHING` does on PostgreSQL. `failOn`
 * makes matching SQL throw, to prove a seed failure cannot take the schema
 * apply down with it.
 */
function fakeClient({ themeCount = 0, domainCount = 0, failOn = null } = {}) {
  const calls = [];
  const upserts = [];
  const pricingUpserts = [];
  return {
    calls,
    upserts,
    pricingUpserts,
    async query(sql, params) {
      const text = String(sql);
      calls.push(text);
      if (failOn && text.includes(failOn)) throw new Error('simulated failure');
      if (text.includes('FROM schema_state')) return { rows: [{ checksum: CURRENT_CHECKSUM }] };
      if (text.includes('FROM theme_templates')) return { rows: [{ n: themeCount }] };
      if (text.includes('INSERT INTO theme_templates')) {
        upserts.push(params);
        return { rows: [], rowCount: 1 };
      }
      if (text.includes('INSERT INTO domain_pricing')) {
        pricingUpserts.push(params);
        return { rows: [], rowCount: domainCount === 0 ? params.length / 4 : 0 };
      }
      return { rows: [] };
    },
  };
}

console.log('\nDiDwa catalog seeding -> db/applySchema.js + db/migrate.js + db/domainCatalog.js\n');

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

/* The TLD catalogue: the whole catalogue in ONE statement, counted honestly. */
{
  const client = fakeClient({ themeCount: 100, domainCount: 0 });
  const result = await applySchemaIfMissing(client, { quiet: true });
  const batch = client.calls.filter((c) => c.includes('INSERT INTO domain_pricing'));
  log('a fresh TLD catalogue is seeded', result.domainsSeeded === CATALOGUE_SIZE,
    `seeded=${result.domainsSeeded}/${CATALOGUE_SIZE}`);
  log('the whole catalogue is ONE round trip', batch.length === 1, `${batch.length} statement(s)`);
  log('every TLD is a parameterised tuple',
    client.pricingUpserts.length === 1
    && Array.isArray(client.pricingUpserts[0])
    && client.pricingUpserts[0].length === CATALOGUE_SIZE * 4,
    `${client.pricingUpserts[0]?.length ?? 0} parameters`);
  log('the batch has a placeholder per column',
    (batch[0]?.match(/\$[0-9]+/g) || []).length === CATALOGUE_SIZE * 4);
  log('the batch never overwrites an existing price',
    /ON CONFLICT \(tld\) DO NOTHING/.test(batch[0] || ''));
  log('the settings row is created',
    client.calls.some((c) => c.includes('INSERT INTO domain_settings')));
  log('the two catalogues are reported separately',
    result.themesSeeded === 0 && result.domainsSeeded === CATALOGUE_SIZE,
    `themes=${result.themesSeeded} domains=${result.domainsSeeded}`);
}

/* A populated TLD catalogue adds nothing, but stays replayable. */
{
  const client = fakeClient({ themeCount: 100, domainCount: CATALOGUE_SIZE });
  const result = await applySchemaIfMissing(client, { quiet: true });
  log('a populated TLD catalogue reports nothing seeded', result.domainsSeeded === 0,
    `seeded=${result.domainsSeeded}`);
  log('a populated TLD catalogue is still one idempotent statement',
    client.calls.filter((c) => c.includes('INSERT INTO domain_pricing')).length === 1);
  log('a warm database reports nothing at all',
    result.themesSeeded === 0 && result.domainsSeeded === 0);
}

/* A failing TLD catalogue must not take the apply, or the themes, down. */
{
  const client = fakeClient({ themeCount: 0, failOn: 'domain_pricing' });
  let threw = null;
  let result = null;
  try { result = await applySchemaIfMissing(client, { quiet: true }); } catch (err) { threw = err; }
  log('a failing TLD catalogue does not break the apply', threw === null && result?.applied === false);
  log('a failing TLD catalogue reports zero seeded', result?.domainsSeeded === 0);
  log('themes still seed when the TLD catalogue fails', result?.themesSeeded === 100,
    `themes=${result?.themesSeeded}`);
}


/* The schema checksum must ignore how the checkout wrote the file. */
{
  const lf = RAW_SCHEMA.replace(/\r\n/g, '\n');
  const crlf = lf.replace(/\n/g, '\r\n');
  log('a CRLF checkout hashes like the committed LF file',
    schemaChecksum(crlf) === schemaChecksum(lf));
  log('the worktree file hashes to the stored checksum',
    schemaChecksum(RAW_SCHEMA) === CURRENT_CHECKSUM);
  log('a genuinely different schema hashes differently',
    schemaChecksum(`${lf}\n-- extra\n`) !== CURRENT_CHECKSUM);

  /* THE REGRESSION: hashing raw bytes made a Windows checkout disagree with the
     checksum the LF file had recorded, so every boot re-applied the whole
     schema - ~150ms per statement against Neon. */
  const client = fakeClient({ themeCount: 100, domainCount: CATALOGUE_SIZE });
  const result = await applySchemaIfMissing(client, { quiet: true });
  log('a CRLF checkout does not re-apply the schema',
    result.applied === false && result.statements === 0 && result.reason === 'already-current');
  log('a CRLF checkout replays no DDL',
    !client.calls.some((c) => /CREATE TABLE IF NOT EXISTS stores/i.test(c)),
    `${client.calls.length} statements issued`);
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
