/**
 * Seller Developer Guide verification.
 *
 * Documentation that drifts from the code is worse than none, so this suite
 * asserts the guide still matches the platform it describes:
 *   - the page is routable and the sidebar points at it
 *   - the removed Store profile page is genuinely gone (nothing links to it)
 *   - the DNS instructions are the CURRENT ones, not the A-record guidance
 *     that broke merchants before
 *   - every section id is unique, present in the registry, and has a body
 *   - the quick-start checklist reacts to store state
 *
 * Usage: node scripts/developerGuideTest.js   (no server and no database needed)
 */
import { build } from 'esbuild';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PWA_ROUTES, isKnownRoute, isPwaRoute } from '../src/routes.js';

/* sections.jsx holds JSX, which plain node cannot parse, so it is bundled the
   same way customizerRenderTest.js bundles the rail. Must live inside the
   project so its `react` imports resolve. */
const OUT = resolve('node_modules/.cache/gs-guide-test/guide.mjs');
mkdirSync(dirname(OUT), { recursive: true });
await build({
  entryPoints: [resolve('src/guide/sections.jsx')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  outfile: OUT,
  external: ['react', 'react-dom', 'react-dom/server', 'lucide-react'],
  logLevel: 'error',
});
const { SECTION_META, buildSections, quickStartItems, DNS_ROWS } =
  await import(pathToFileURL(OUT).href);

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(here, '..', rel), 'utf8');

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

console.log('\nDiDwa developer guide\n');

/* ---------- Routing ---------- */
log('the guide is routable', isKnownRoute('/developer-guide') === true);
log('the guide is auth-gated', isPwaRoute('/developer-guide') === true);
log('the guide is in the PWA table', PWA_ROUTES.includes('/developer-guide'));

const appSource = read('src/App.jsx');
log('App.jsx renders the guide',
  appSource.includes("case '/developer-guide': return <SellerDeveloperGuide />"));
log('App.jsx no longer imports the removed page',
  !appSource.includes('StoreProfile'));

const navSource = read('src/layouts/dashboard/constants.js');
log('the sidebar has a Developer Guide entry',
  navSource.includes("'/developer-guide'") && navSource.includes("'Developer Guide'"));
log('the sidebar no longer has a Store profile entry', !navSource.includes('/store-profile'));

/* Nothing anywhere may still link at the deleted route. */
for (const file of ['src/routes.js', 'src/layouts/dashboard/constants.js',
  'src/App.jsx', 'scripts/routeTest.js']) {
  log(`no /store-profile reference in ${file}`, !read(file).includes('/store-profile'));
}

/* ---------- The guide's own content ---------- */
const guideSource = read('src/guide/sections.jsx');

/* The guard that matters: the DNS instructions must be CNAME-only. A merchant
   told to create an A record gets Cloudflare Error 1000 and a dead store. */
log('the guide never tells a merchant to create an A record',
  !/points?\s+(it|the record)?\s*(at|to)\s+104\.16\.0\.1/i.test(guideSource)
  && !guideSource.includes('cname.vercel-dns'));
log('the DNS table is CNAME for both @ and www',
  DNS_ROWS.length === 2
  && DNS_ROWS.every((r) => r[1] === 'CNAME')
  && DNS_ROWS.some((r) => r[0] === '@')
  && DNS_ROWS.some((r) => r[0] === 'www'));
log('the guide warns against A records', /Do not create an A record/i.test(guideSource));
log('the guide explains the root-CNAME workaround',
  /ALIAS/i.test(guideSource) && /ANAME/i.test(guideSource));
log('the guide states both records are required',
  /Both records are required/i.test(guideSource));

/* Payment claims that must not drift. */
log('the guide does not promise payment settlement timings',
  !/same day|next day|within \d+ (hour|day)/i.test(guideSource));
log('the guide says a saved key cannot be read back',
  /write-only|cannot be read back/i.test(guideSource));
log('the guide tells merchants to test before saving', /Test connection/i.test(guideSource));
log('the guide covers every gateway it offers',
  ['Paystack', 'Hubtel', 'Cash on Delivery'].every((g) => guideSource.includes(g)));

/* ---------- Section registry integrity ---------- */
const EMPTY_CTX = {
  productCount: 0, hasTheme: false, hasLogo: false, gatewayConfigured: false,
  gatewayLabel: 'Cash on Delivery', storefrontUrl: '', customDomain: '', dnsTarget: '',
};
const sections = buildSections(EMPTY_CTX);
const ids = sections.map((s) => s.id);
const metaIds = SECTION_META.map((m) => m.id);

log('every section id is unique', new Set(ids).size === ids.length);
log('every section has a body', sections.every((s) => s && s.body));
log('every rendered section exists in the metadata',
  ids.every((id) => metaIds.includes(id)));
log('every metadata entry renders', metaIds.every((id) => ids.includes(id)));
log('the metadata and bodies are the same length', ids.length === metaIds.length);
log('the quick start leads the guide', ids[0] === 'quick-start');
log('the expected sections are all present',
  ['quick-start', 'store-setup', 'products', 'payments', 'orders', 'domains', 'pos', 'help']
    .every((id) => ids.includes(id)));
log('every section has a human label',
  SECTION_META.every((m) => typeof m.label === 'string' && m.label));
log('every section has an icon', SECTION_META.every((m) => m.icon));

/* ---------- The quick start responds to real store state ---------- */
const doneFor = (ctx) => quickStartItems(ctx).filter((i) => i.done).length;
const noneDone = doneFor(EMPTY_CTX);
const allDone = doneFor({
  ...EMPTY_CTX, productCount: 3, hasTheme: true, hasLogo: true,
  gatewayConfigured: true, storefrontUrl: 'https://x.example.com', customDomain: 'shop.example.com',
});
log('a fresh store has nothing ticked', noneDone === 0, `${noneDone} ticked`);
log('a fully configured store ticks every box', allDone === 6, `${allDone} ticked`);
log('the checklist always has six items', quickStartItems(EMPTY_CTX).length === 6);
log('a single product reads as one product, not "1s"',
  /1 product live/.test(quickStartItems({ ...EMPTY_CTX, productCount: 1 })[0].hint));

/* ---------- No emoji (project-wide rule) ---------- */
const emoji = guideSource.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);
log('the guide contains no emoji', !emoji, emoji ? emoji.join(' ') : '');

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====\n`);
process.exit(fail === 0 ? 0 : 1);
log('the guide says keys are write-only', /write-only/i.test(guideSource));
log('the guide tells merchants to test before saving', /Test connection/i.test(guideSource));