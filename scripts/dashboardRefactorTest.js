/* Static sanity pass over the dashboard refactor.
   A top-level `}` followed by more indented code means a chunk of a function
   body was stranded past its closing brace -- which esbuild accepts and the
   browser then throws as an undefined identifier at runtime. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/layouts/dashboard';
const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(jsx?|mjs)$/.test(e.name)) files.push(p);
  }
})(ROOT);

let failed = 0;
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (!/^\}\s*$/.test(line)) return;
    const after = lines.slice(i + 1).filter((l) => l.trim() !== '');
    if (after.length && /^\s+\S/.test(after[0])) {
      console.log(`  FAIL  ${file}:${i + 1} stray code after top-level brace -> ${after[0].trim()}`);
      failed++;
    }
  });
}
console.log(`\n===== RESULT: ${files.length} scanned, ${failed} failed =====`);
process.exit(failed ? 1 : 0);
