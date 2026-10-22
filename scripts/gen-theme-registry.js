/**
 * scripts/gen-theme-registry.js
 * Generates themeComponents/themeRegistry.js mapping all 100 theme IDs to
 * their dedicated component modules.
 * Run: node scripts/gen-theme-registry.js
 */
import { writeFileSync } from 'fs';
import { pathToFileURL } from 'url';

const DATA_PATH = pathToFileURL('src/components/storefront/templates/themeComponents/themeData.js').href;
const OUT_PATH = 'src/components/storefront/templates/themeComponents/themeRegistry.js';

const { THEME_DATA } = await import(DATA_PATH);

const lines = [];
lines.push('/**');
lines.push(' * components/storefront/templates/themeComponents/themeRegistry.js');
lines.push(' * Registry mapping every theme ID to its dedicated component module.');
lines.push(' * Auto-generated - DO NOT EDIT BY HAND. Regenerate with:');
lines.push(' *   node scripts/gen-theme-registry.js');
lines.push(' */');
lines.push('');

for (let i = 0; i < THEME_DATA.length; i++) {
  const name = `Theme${String(i + 1).padStart(2, '0')}`;
  lines.push(`import ${name} from './Themes/${name}.jsx';`);
}
lines.push('');
lines.push('export const THEME_COMPONENT_REGISTRY = {');
for (let i = 0; i < THEME_DATA.length; i++) {
  const theme = THEME_DATA[i];
  const name = `Theme${String(i + 1).padStart(2, '0')}`;
  lines.push(`  ${JSON.stringify(theme.id)}: ${name},`);
}
lines.push('};');
lines.push('');

writeFileSync(OUT_PATH, lines.join('\n') + '\n');
console.log(`Generated themeRegistry.js with ${THEME_DATA.length} theme mappings.`);