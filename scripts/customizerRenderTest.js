/* Renders the customizer rail for real (react-dom/server) so a
   ReferenceError like the stranded `const t`/`const shared` bug is caught at
   test time instead of only in the browser console. */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ENTRY = resolve('src/layouts/dashboard/customizer/CustomizerSidebar.jsx');
/* Must live inside the project so the bundle's `react` imports resolve. */
const out = resolve('node_modules/.cache/gs-rail-test/rail.mjs');
mkdirSync(dirname(out), { recursive: true });

await build({
  entryPoints: [ENTRY],
  bundle: true,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  outfile: out,
  external: ['react', 'react-dom', 'react-dom/server', 'lucide-react'],
  logLevel: 'error',
});

const { default: CustomizerSidebar } = await import(pathToFileURL(out).href);
const { renderToStaticMarkup } = await import('react-dom/server');
const React = (await import('react')).default;

/* Start from the real schema defaults so the fixture can never drift from
   what the sections actually read, then override just the title. */
const { normalizeCustomThemeConfig } = await import(
  pathToFileURL(resolve('src/theme/config.js')).href
);
const theme = normalizeCustomThemeConfig({
  branding: { ...normalizeCustomThemeConfig({}).branding, site_title: 'Smoke Test Store' },
});

let html = '';
try {
  html = renderToStaticMarkup(
    React.createElement(CustomizerSidebar, {
      open: true,
      collapsed: false,
      onToggleCollapse() {},
      customTheme: theme,
      setCustomTheme() {},
      isPublishing: false,
      publishSuccess: false,
      onPublish() {},
      onBack() {},
      onResetDefaults() {},
    }),
  );
} catch (e) {
  console.log(`  FAIL  the customizer rail threw while rendering: ${e.message}`);
  console.log('\n===== RESULT: 0 passed, 1 failed =====');
  process.exit(1);
}

const checks = [
  ['renders the aside landmark', html.includes('id="gs-sidebar"')],
  ['shows the site title from the config', html.includes('Smoke Test Store')],
  ['renders the publish button', html.includes('Publish')],
  ['renders the back button', html.includes('Back to dashboard')],
  ['renders section content, not just a shell', html.includes('identity') || html.includes('Site Identity')],
];
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!ok) failed++;
}
console.log(`\n===== RESULT: ${checks.length - failed} passed, ${failed} failed =====`);
process.exit(failed ? 1 : 0);
