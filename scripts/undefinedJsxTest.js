/**
 * Undefined JSX component guard.
 *
 * A capitalised JSX tag that is neither imported nor defined in the file is not a
 * build error - Vite and Rollup both compile `<Check />` happily - it is a
 * ReferenceError the moment that component renders, in the browser, for the
 * user. That is how the whole welcome page died once already: an icon was
 * dropped from a lucide-react import while editing the file, the production
 * build still passed, every existing suite still passed, and www.didwaghana.com
 * showed "This page ran into a problem" on load.
 *
 * So this is a source scan, checked at commit time like the retired-schema
 * guard, because the failure mode it prevents is invisible to both the compiler
 * and the test runner.
 *
 * It resolves the ways a tag can legitimately be bound:
 *   - named imports          import { Check } from 'lucide-react'
 *   - default imports        import PlanGrid from './PlanGrid.jsx'
 *   - mixed imports          import PlanGrid, { CycleToggle } from './PlanGrid.jsx'
 *   - namespace imports      import * as Icons from './icons.jsx'
 *   - local declarations     const X = ... / function X() {} / class X {}
 *   - destructured with rename, e.g. a prop: { Icon: Wallet }
 *   - destructured as props:  function C({ Icon }) { return <Icon /> }
 *
 * Usage: node scripts/undefinedJsxTest.js   (no database needed)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

/** Every .js/.jsx file under src, recursively. */
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.jsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const add = (set, name) => { if (name) set.add(name); };

/** Every identifier a capitalised JSX tag could legitimately be bound to. */
function boundNames(source) {
  const bound = new Set();

  // import { a, b as c } from '...'  and the mixed form
  // `import PlanGrid, { CycleToggle } from '...'`, which is how PlanGrid is
  // consumed. The optional leading default must be allowed or the brace group
  // is skipped and CycleToggle looks undefined.
  for (const m of source.matchAll(/import\s+(?:[A-Za-z_$][\w$]*\s*,\s*)?\{([^}]*)\}\s*from/g)) {
    for (const raw of m[1].split(',')) {
      const part = raw.trim();
      if (!part) continue;
      add(bound, (part.split(/\s+as\s+/).pop() || '').trim());
    }
  }

  // import Default from '...'   and   import * as NS from '...'
  for (const m of source.matchAll(/import\s+([A-Za-z_$][\w$]*)\s*from/g)) add(bound, m[1]);
  for (const m of source.matchAll(/import\s+\*\s*as\s+([A-Za-z_$][\w$]*)\s*from/g)) add(bound, m[1]);
  // import Default, * as NS from '...'  /  import Default, { a } from '...'
  for (const m of source.matchAll(/import\s+([A-Za-z_$][\w$]*)\s*,/g)) add(bound, m[1]);

  // Local declarations, including component functions.
  for (const m of source.matchAll(/(?:const|let|var|function|class)\s+([A-Z][\w$]*)/g)) add(bound, m[1]);

  // Destructured with rename: { Icon: Wallet } binds Icon.
  for (const m of source.matchAll(/([A-Z][\w$]*)\s*:\s*[A-Za-z_$][\w$]*/g)) add(bound, m[1]);
  // Destructured as props: function C({ Icon, icon }) - lower case included so a
  // component may be passed either way, matching how the codebase already does it.
  for (const m of source.matchAll(/\{([^{}]*)\}\s*\)\s*(?:=>|\{)/g)) {
    for (const raw of m[1].split(',')) {
      const part = raw.trim().split(/[:=]/)[0].replace(/\.\.\./, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(part)) add(bound, part);
    }
  }
  // Props on a component: ({ icon: Icon })
  for (const m of source.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*([A-Z][\w$]*)/g)) add(bound, m[2]);

  // Array destructuring, e.g. socials.map(([on, Icon, label]) => ...). These bind
  // a real component from data rows, so <Icon /> resolves at render time.
  for (const m of source.matchAll(/\(\s*\[([^\]]*)\]\s*\)\s*=>/g)) {
    for (const raw of m[1].split(',')) {
      const part = raw.trim().split(/[:=]/)[0].replace(/\.\.\./, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(part)) add(bound, part);
    }
  }
  // Destructured with rename inside an array: ([kind, Icon]) / ({ a: Icon })
  for (const m of source.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*([A-Z][\w$]*)/g)) add(bound, m[1]);

  return bound;
}

console.log('\nDiDwa undefined JSX component guard\n');

const files = walk(path.join(ROOT, 'src'));
log('found the source files to scan', files.length > 0, `${files.length} files`);

const offenders = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const bound = boundNames(source);
  // Remove import statements, so an imported name is not also read as a usage site.
  const body = source.replace(/import[\s\S]*?from\s*['"][^'"]*['"];?/g, ' ');
  for (const m of body.matchAll(/<([A-Z][\w$]*)/g)) {
    if (!bound.has(m[1])) offenders.push(`${path.relative(ROOT, file)}: <${m[1]}>`);
  }
}

log('every capitalised JSX tag is imported or defined',
  offenders.length === 0,
  offenders.length ? [...new Set(offenders)].join(', ') : `${files.length} files clean`);

/* The concrete regression, so the exact symbol cannot silently go missing again. */
const welcome = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'WelcomePage.jsx'), 'utf8');
log('the welcome page still renders its trust-badge Check icons',
  /<Check\b/.test(welcome) && /import\s*\{[^}]*\bCheck\b[^}]*\}\s*from\s*'lucide-react'/.test(welcome));

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====\n`);
process.exit(fail === 0 ? 0 : 1);
