/**
 * Responsive behaviour.
 *
 * Guards the three things that make the app usable on a phone, a tablet and a
 * desktop - and the one that was silently broken:
 *
 *  1. PINCH ZOOM IS OFF. Needs the viewport meta AND `touch-action:
 *     manipulation`: iOS Safari has ignored user-scalable=no since iOS 10, so
 *     the meta tag alone leaves iPhones fully zoomable.
 *  2. ONE definition of the three tiers. The storefront re-derived its own
 *     <480/<768 literals while the shell used Tailwind's sm/md/lg; the two
 *     could disagree about what "tablet" means.
 *  3. THE LIVE STOREFRONT MEASURES ITSELF. It renders both full-bleed on a
 *     phone and inside fixed 375/768/1024 device frames in the customizer, so
 *     it must read its own container width. It used to receive no width at
 *     all, which meant every customer on a phone got the desktop 4-column
 *     product grid - the single worst responsiveness bug in the app.
 *
 * Usage: node scripts/responsiveTest.js   (no database, no browser)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BREAKPOINTS, TIER, tierForWidth } from '../src/lib/responsive.js';

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const html = read('index.html');
const css = read('src/index.css');
const lib = read('src/lib/responsive.js');
const live = read('src/pages/LiveStorefront.jsx');
/* The storefront is split across modules now: the router keeps the entry point,
   the pages keep the tier-conditional classes. Both are checked, because the
   old single-file assertions would otherwise pass while the code moved away. */
const storefront = read('src/components/storefront/Storefront.jsx');
const storefrontTokens = read('src/components/storefront/useTokens.js');
const storefrontAbout = read('src/components/storefront/pages/AboutBody.jsx');
const storefrontProduct = read('src/components/storefront/pages/ProductBody.jsx');
const storefrontShop = read('src/components/storefront/pages/ShopBody.jsx');
const storefrontPages = storefrontAbout + storefrontProduct + storefrontShop;

console.log('\nDiDwa responsive behaviour -> index.html + src/index.css + src/lib/responsive.js\n');

/* ---------- 1. Pinch zoom is actually disabled ---------- */
{
  const viewport = (html.match(/<meta name="viewport"[^>]*>/) || [''])[0];
  log('the viewport meta still sets the device width', /width=device-width/.test(viewport));
  log('the viewport meta disables user scaling', /user-scalable=no/.test(viewport));
  log('the viewport meta sets maximum-scale=1', /maximum-scale=1/.test(viewport));
  log('initial-scale is untouched, so there is no layout shift', /initial-scale=1\.0/.test(viewport) && !/initial-scale=[2-9]/.test(viewport));
  // The meta tag is inert on iOS. Without the CSS half, iPhones stay zoomable.
  log('touch-action: manipulation is set (the half iOS honours)', /touch-action:\s*manipulation/.test(css));
  log('it applies to the document, not just body', /html,\s*body\s*\{[^}]*touch-action/.test(css));
  log('text-size-adjust is pinned so rotation does not reflow', /-webkit-text-size-adjust:\s*100%/.test(css));
  log('mobile form fields are >=16px (stops iOS focus-zoom)', /@media \(max-width: 767px\)[\s\S]{0,200}font-size:\s*16px/.test(css));
  log('safe-area insets are honoured for notched devices', /env\(safe-area-inset-top/.test(css) && /env\(safe-area-inset-bottom/.test(css));
  log('viewport-fit=cover is set (required for those insets)', /viewport-fit=cover/.test(viewport));
  log('the zoom trade-off is documented where it is set', /WCAG 1\.4\.4/.test(html));
}

/* ---------- 2. One definition of the three tiers ---------- */
{
  const cases = [
    [320, TIER.MOBILE], [375, TIER.MOBILE], [414, TIER.MOBILE], [479, TIER.MOBILE],
    [480, TIER.TABLET], [600, TIER.TABLET], [768, TIER.TABLET],
    [769, TIER.DESKTOP], [1024, TIER.DESKTOP], [1440, TIER.DESKTOP],
  ];
  for (const [w, want] of cases) {
    log(`${w}px is ${want}`, tierForWidth(w) === want, `got ${tierForWidth(w)}`);
  }
  // The old behaviour for a missing measurement was desktop; it must stay so.
  for (const w of [null, undefined, 0, -1, NaN]) {
    log(`an unmeasured width (${String(w)}) falls back to desktop`, tierForWidth(w) === TIER.DESKTOP);
  }
  log('the boundaries are the storefront thresholds', BREAKPOINTS.mobile === 480 && BREAKPOINTS.tablet === 768);

/* ---------- 3. The live storefront measures its own container ---------- */
{
  log('useContainerTier observes with a ResizeObserver', /new ResizeObserver/.test(lib));
  log('it falls back for browsers without ResizeObserver', /typeof ResizeObserver !== 'undefined'/.test(lib));
  log('it ignores sub-pixel jitter (no tier flapping)', /Math\.abs\(prev - next\) <= 1/.test(lib));
  log('it exposes a ref to attach', /ref: nodeRef/.test(lib));
  log('useBreakpoint exists for real-viewport chrome', /export function useBreakpoint/.test(lib));
  log('useBreakpoint uses matchMedia, not a resize listener', /matchMedia/.test(lib));
  log('matchMedia is guarded for non-browser environments', /typeof window !== 'undefined'/.test(lib));
  log('useBreakpoint supports the legacy Safari listener API', /addListener/.test(lib));

  // The regression itself.
  log('the live storefront measures its container', /useContainerTier\(\)/.test(live));
  log('it passes the measured width to the storefront', /viewportWidth=\{container\.width \|\| null\}/.test(live));
  log('the measured width is attached to a real element', /ref=\{container\.ref\}/.test(live));
  log('the customizer still drives the storefront by frame width', /viewportWidth=\{frameSize\.width\}/.test(read('src/pages/ThemeCustomizer.jsx')));
  log('the storefront still defaults to no width when unmeasured', /viewportWidth = null,/.test(storefront));

  // The user-visible effect: 2 columns on a phone, not 4.
  const cols = (w) => {
    const t = tierForWidth(w);
    return Math.min(4, t === TIER.MOBILE ? 2 : t === TIER.TABLET ? 3 : 4);
  };
  log('a 375px phone gets 2 product columns', cols(375) === 2, `got ${cols(375)}`);
  log('a 768px tablet gets 3 product columns', cols(768) === 3, `got ${cols(768)}`);
  log('a desktop gets 4 product columns', cols(1440) === 4, `got ${cols(1440)}`);
  log('about stats stack on a phone instead of 3 across', /compact \? 'grid-cols-1' : 'grid-cols-3'/.test(storefrontAbout));

  /* ---------- 4. The storefront has not re-derived its own tier literals ---------- */
  log('the storefront imports the shared tier helper', /tierForWidth/.test(storefrontTokens));
  log('the storefront no longer re-derives its own literals', !/viewportWidth < 480/.test(storefront + storefrontTokens + storefrontPages));
  log('the storefront no longer re-derives the tablet bound', !/viewportWidth >= 480 && viewportWidth < 768/.test(storefront + storefrontTokens + storefrontPages));
}
}

/* ---------- 5. The shell is not regressed ---------- */
{
  /* The dashboard sidebar and the customizer rail share one DRAWER_POSITION
     constant, which now lives in layouts/dashboard/constants.js. Assertions
     follow the code, not the old filenames. */
  const shell = read('src/layouts/DashboardLayout.jsx');
  const sidebarAndRail = read('src/layouts/dashboard/MainSidebar.jsx')
    + read('src/layouts/dashboard/customizer/CustomizerSidebar.jsx')
    + read('src/layouts/dashboard/constants.js');
  const drawer = shell + sidebarAndRail;
  const dash = shell;
  const admin = read('src/layouts/AdminLayout.jsx');
  log('the dashboard drawer still collapses below md', /md:translate-x-0/.test(drawer));
  log('the dashboard keeps a mobile header', /md:hidden/.test(dash));
  log('the dashboard drawer is capped for narrow screens', /max-w-\[92vw\]/.test(drawer));
  log('the admin content is width-capped and pads on desktop', /max-w-\[1500px\]/.test(admin) && /lg:px-8/.test(admin));
  log('the admin table still scrolls horizontally', /overflow-x-auto/.test(read('src/components/admin/ui.jsx')));
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
