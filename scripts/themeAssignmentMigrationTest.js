/**
 * Legacy theme assignment migration plan verification.
 * Usage: node scripts/themeAssignmentMigrationTest.js (no database connection).
 */
import { buildPresets, buildThemeIdMigrationMap } from './themeCatalog.js';
import {
  planThemeAssignmentMigration,
  runThemeAssignmentMigration,
} from './migrateThemeAssignments.js';

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

const curated = buildPresets();
const idMap = buildThemeIdMigrationMap();
const retiredId = 'fashion-golden_hour-spacious_hero_minimal-subtle';
const selectedId = curated[0].id;
const merchantOverrides = {
  colors: { primary: '#123456' },
  branding: { site_title: 'My Shop' },
};
const rows = [
  { id: 'store-retired', active_theme_id: retiredId, custom_theme_config: merchantOverrides },
  { id: 'store-curated', active_theme_id: selectedId, custom_theme_config: {} },
  { id: 'store-unknown', active_theme_id: 'handmade-theme-id', custom_theme_config: {} },
];
const plan = planThemeAssignmentMigration(rows, idMap);

log('retired assignments map to a selected catalog ID',
  plan.updates.length === 1 && curated.some(({ id }) => id === plan.updates[0].toThemeId),
  plan.updates[0]?.toThemeId);
log('selected assignments are left unchanged',
  plan.unchanged.length === 1 && plan.unchanged[0].themeId === selectedId);
log('unknown assignments are surfaced instead of guessed',
  plan.unresolved.length === 1 && plan.unresolved[0].themeId === 'handmade-theme-id');
log('planning does not mutate merchant theme overrides',
  JSON.stringify(rows[0].custom_theme_config) === JSON.stringify(merchantOverrides));
log('planning does not mutate source store assignments',
  rows[0].active_theme_id === retiredId && rows[1].active_theme_id === selectedId);

let applyRequiresExplicitConfirmation = false;
try {
  await runThemeAssignmentMigration(['--apply']);
} catch (error) {
  applyRequiresExplicitConfirmation = error.message.includes('--confirm-theme-assignment-migration');
}
log('database writes require an explicit confirmation flag', applyRequiresExplicitConfirmation);

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====`);
process.exit(fail === 0 ? 0 : 1);
