/**
 * Theme market + customizer publish/unsaved-changes verification.
 *
 * Three regressions this guards:
 *
 *  1. THEME CARDS. The market drew generic grey skeletons over the palette, so
 *     two templates differing in hero copy, font, radius and section order were
 *     visually identical. The preview must render the template's REAL config.
 *
 *  2. PUBLISH WITHOUT CUSTOMISING. `useThemeDraft` normalised the draft against
 *     the schema defaults, so publishing an untouched draft shipped ~60 default
 *     tokens as overrides. The storefront layers template -> overrides, so those
 *     defaults overrode the theme the seller had just applied. Publishing must
 *     send only the seller's actual deltas - i.e. {} for an untouched draft.
 *
 *  3. UNSAVED CHANGES. There was no guard at all, and the draft was persisted
 *     to localStorage forever, so edits were silently kept and could not be
 *     deliberately discarded. The router must cancel navigation while dirty.
 *
 * Usage: node scripts/themeMarketTest.js   (no server, no database)
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

/**
 * Read a source file with comments stripped.
 *
 * Necessary because several of these assertions are "X must no longer appear",
 * and the fixes are DOCUMENTED in the very files that no longer contain them -
 * a comment saying "the market no longer fabricates themeRating()" would
 * otherwise make the guard fail on correct code. Mirrors the approach in
 * scripts/domainDnsTest.js.
 */
function readCode(relPath) {
  return readFileSync(resolve(relPath), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { diffThemeTokens, THEME_BASELINE_KEY } = await vite.ssrLoadModule('/src/layouts/dashboard/useThemeDraft.js');
const { DEFAULT_CUSTOM_THEME_CONFIG, normalizeCustomThemeConfig } = await vite.ssrLoadModule('/src/theme/config.js');
const { ThemePreview, ThemeThumb, orderedSections } = await vite.ssrLoadModule('/src/theme/preview.jsx');
await vite.close();

console.log('\nDiDwa theme market + customizer publishing -> src/theme/preview.jsx, useThemeDraft.js\n');

/* ---------- 1. The preview renders the template's real config ---------- */
{
  const config = {
    palette: { primary: '#0B1120', secondary: '#1E293B', accent: '#FFD700', background: '#FFFFFF', textPrimary: '#0F172A', textSecondary: '#64748B' },
    layout: { gridColumns: 4, heroBanner: true, cardStyle: 'minimal', gridGap: '1rem', productCardRounded: '1.5rem' },
    borderRadius: { base: '1.5rem', name: 'Extra Rounded' },
    typography: { headingFont: 'Poppins, sans-serif', bodyFont: 'Inter, sans-serif', headingScale: 1.25 },
    hero: { enabled: true, title: 'Powered by Ghana', subtitle: 'Latest gadgets, local prices.', callToAction: 'Get Yours' },
    conversion: { urgencyTicker: 'Hot Deals', freeShippingThresholdGHS: 200 },
    sections: [
      { key: 'hero', enabled: true, order: 1 },
      { key: 'products-grid', enabled: true, order: 4, columns: 4 },
      { key: 'footer', enabled: true, order: 7 },
    ],
    paymentBadges: ['MTN MoMo', 'Cash on Delivery'],
  };

  const order = orderedSections(config);
  log('sections render in the template\'s own order', JSON.stringify(order) === '["hero","products-grid","footer"]', order.join(' > '));

  const heroOff = orderedSections({ ...config, sections: config.sections.map((s) => (s.key === 'hero' ? { ...s, enabled: false } : s)) });
  log('a disabled section is dropped', !heroOff.includes('hero'), heroOff.join(' > '));

  log('the preview module exports both surfaces', typeof ThemePreview === 'function' && typeof ThemeThumb === 'function');
  log('a config with no sections still previews every part', orderedSections({ palette: {} }).length >= 6, `${orderedSections({ palette: {} }).length} sections`);
}


/* ---------- 2. Publishing only the seller's deltas ---------- */
{
  const baseline = normalizeCustomThemeConfig({});
  const untouched = normalizeCustomThemeConfig({});

  const empty = diffThemeTokens(untouched, baseline);
  log('an untouched draft publishes NOTHING', JSON.stringify(empty) === '{}', JSON.stringify(empty));

  /* This is the exact bug: publishing with no edits used to send the whole
     default-populated draft, which outranked the template's own palette. */
  log('publishing untouched does not ship default colours', empty.colors === undefined);

  const edited = { ...untouched, colors: { ...untouched.colors, primary: '#FF0055' } };
  const partial = diffThemeTokens(edited, baseline);
  log('a single colour edit is published', partial.colors?.primary === '#FF0055');
  log('untouched token groups are NOT published', partial.branding === undefined && partial.footer === undefined);
  log('sibling colours survive the edit', partial.colors.accent === undefined && partial.colors.background === undefined);

  /* Arrays are whole values, so an edit to one is a real edit to the group. */
  const withBullets = { ...untouched, product_page: { ...untouched.product_page, feature_bullets: ['Only one bullet'] } };
  const arrDiff = diffThemeTokens(withBullets, baseline);
  log('an edited array is published whole', JSON.stringify(arrDiff.product_page?.feature_bullets) === '["Only one bullet"]');

  /* Returning to the baseline is "not dirty" again - publishing must clear it. */
  log('reverting an edit clears the diff', JSON.stringify(diffThemeTokens(baseline, baseline)) === '{}');

  const noBaseline = diffThemeTokens(untouched, null);
  log('with no baseline everything is treated as an edit', noBaseline.colors?.primary === DEFAULT_CUSTOM_THEME_CONFIG.colors.primary);

  log('the publish baseline has its own storage key', typeof THEME_BASELINE_KEY === 'string' && THEME_BASELINE_KEY !== 'gs_custom_theme', THEME_BASELINE_KEY);

/* ---------- 3. Unsaved-changes guard ---------- */
{
  const routerSrc = readCode('src/router.js');
  log('the router exposes a navigation guard', /export function setNavigationGuard/.test(routerSrc));
  log('navigate consults the guard before pushing history', /navigationGuard && navigationGuard\(next\) === false/.test(routerSrc));
  log('the guard is consulted BEFORE the URL changes', routerSrc.indexOf('navigationGuard(') < routerSrc.indexOf('pushState'));

  const guardSrc = readCode('src/layouts/dashboard/useUnsavedChanges.js');
  log('a beforeunload guard covers refresh and close', /beforeunload/.test(guardSrc));
  log('the guard is removed when there is nothing to lose', /if \(!isDirty\) return undefined/.test(guardSrc));
  /* The router is pushState/popstate based, so a hashchange listener would be
     dead code that silently never fires. */
  log('the guard does not rely on hashchange (this router has no hashes)', !/hashchange/.test(guardSrc));

  const draftSrc = readCode('src/layouts/dashboard/useThemeDraft.js');
  log('the draft can be discarded back to the published state', /onDiscardChanges/.test(draftSrc));
  log('publishing moves the baseline so the warning clears', /setBaseline\(customTheme\)/.test(draftSrc));

  const layoutSrc = readCode('src/layouts/DashboardLayout.jsx');
  log('the dashboard installs the unsaved-changes guard', /useUnsavedChanges\(/.test(layoutSrc));
  /* A dirty draft must not block navigation to the rest of the dashboard. */
  log('the guard only applies while the customizer is open', /isDirty && isCustomizerOpen/.test(layoutSrc));

  /* The fake social proof the cards used to display. */
  const marketSrc = readCode('src/pages/SellerThemeMarketplace.jsx');
  log('the market no longer fabricates star ratings', !/themeRating/.test(marketSrc));
  log('the market no longer fabricates review counts', !/themeReviews/.test(marketSrc));
  log('the market renders the real theme preview', /ThemeThumb config=\{cfg\}/.test(marketSrc));
  log('the market offers a full expanded preview', /ThemePreview config=\{cfg\}/.test(marketSrc));
}

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====`);
process.exit(fail ? 1 : 0);

}
