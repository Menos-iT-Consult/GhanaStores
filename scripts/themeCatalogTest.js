/**
 * Curated theme catalog contract and preview verification.
 * Usage: node scripts/themeCatalogTest.js (no database connection).
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { buildPresets as buildSourcePresets } from './themeCatalog.js';
import { buildPresets as buildMigrationPresets } from '../db/migrate.js';

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

const presets = buildSourcePresets();
const migrated = buildMigrationPresets();
const ids = new Set(presets.map(({ id }) => id));
const names = new Set(presets.map(({ name }) => name));
const compositions = new Set(presets.map(({ config }) => config.design?.composition));
const categories = new Set(presets.map(({ category }) => category));
const routeSource = readFileSync('routes/themeRoutes.js', 'utf8');
const compositionsByCategory = new Map();
const storefrontRendererSource = readFileSync('src/components/storefront/templates/StorefrontRenderer.jsx', 'utf8');
for (const theme of presets) {
  if (!compositionsByCategory.has(theme.category)) compositionsByCategory.set(theme.category, new Set());
  compositionsByCategory.get(theme.category).add(theme.config.design?.composition);
}

log('catalog contains exactly 100 themes', presets.length === 100, String(presets.length));
log('all theme IDs are unique', ids.size === presets.length, `${ids.size} unique ids`);
log('all display names are unique', names.size === presets.length, `${names.size} unique names`);
log('all themes have unique composition identities', compositions.size === presets.length, `${compositions.size} unique compositions`);
log('catalog has five retail categories', categories.size === 5, [...categories].join(', '));
log('every category spans all 20 layout profiles', [...compositionsByCategory.values()].every((set) => set.size === 20));
log('no numbered placeholder names remain', presets.every(({ name }) => !/^Theme\s+\d+$/i.test(name)));
log('every theme has an actionable design description', presets.every(({ config }) => config.design?.description?.length > 30));
log('every theme has a non-empty display tag set', presets.every(({ config }) => Array.isArray(config.design?.tags) && config.design.tags.length >= 2));
log('all theme configs preserve stable original IDs', presets.every(({ id, config }) => config.themeId === id));
log('first and last legacy theme IDs remain unchanged',
  ids.has('fashion-midnight_noir-dense_hero_bordered-crisp')
  && ids.has('groceries-coral_blush-wide_nohero_list-extra_rounded'));
log('database migration and frontend consume the same catalog', JSON.stringify(presets) === JSON.stringify(migrated));
log('API catalog overlays curated themes without replacing saved rows',
  routeSource.includes('CURATED_THEMES.map')
  && routeSource.includes('CURATED_THEME_BY_ID.has(row.id)'));
log('public storefronts resolve the current curated config by existing active ID',
  routeSource.includes('CURATED_THEME_BY_ID.get(store.theme_id)')
  && routeSource.includes('CURATED_THEME_BY_ID.get(row?.theme_id)'));
log('demo uses the same curated theme as the marketplace',
  routeSource.includes('CURATED_THEME_BY_ID.get(req.params.templateId)'));
log('live storefront rendering does not load generated per-theme wrapper modules',
  !storefrontRendererSource.includes('resolveComponent(')
  && storefrontRendererSource.includes('RegisteredCuratedThemeHome'));

const vite = await createServer({
  configFile: 'vite.config.js',
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});
let ThemePreview;
try {
  ({ ThemePreview } = await vite.ssrLoadModule('/src/theme/preview.jsx'));
  const { default: Storefront } = await vite.ssrLoadModule('/src/components/storefront/Storefront.jsx');
  const { templateToCustomizerTokens } = await vite.ssrLoadModule('/src/theme/config.js');
  const { THEME_BY_ID } = await vite.ssrLoadModule('/src/components/storefront/templates/themeComponents/themeData.js');
  const themeWithMissingEntryId = 'marketplace-midnight_noir-dense_hero_bordered-crisp';
  const themeWithMissingEntry = THEME_BY_ID[themeWithMissingEntryId];
  delete THEME_BY_ID[themeWithMissingEntryId];
  const { THEME_COMPONENT_REGISTRY } = await vite.ssrLoadModule('/src/components/storefront/templates/themeComponents/themeRegistry.js');
  THEME_BY_ID[themeWithMissingEntryId] = themeWithMissingEntry;
  let previewsRendered = true;
  let liveStorefrontsRendered = true;
  let liveSectionOrdersRendered = true;
  let registeredThemesRendered = true;
  let runtimeOverridesApplied = true;
  let missingCatalogFallbackRendered = false;
  let responsiveTiersRendered = true;
  let registeredThemeFailure = '';
  let missingCatalogFallbackDetails = '';
  for (const theme of presets) {
    try {
      const html = renderToString(React.createElement(ThemePreview, { config: theme.config }));
      if (!html.includes(`data-gs-composition="${theme.config.design.composition}"`)) {
        previewsRendered = false;
        break;
      }
      const tokens = templateToCustomizerTokens(theme);
      const RegisteredTheme = THEME_COMPONENT_REGISTRY[theme.id];
      if (!RegisteredTheme || RegisteredTheme.themeName !== theme.name) {
        registeredThemesRendered = false;
        registeredThemeFailure = `theme=${theme.id}, registered=${RegisteredTheme?.themeName || 'missing'}, expected=${theme.name}`;
        break;
      }
      const merchantTokens = {
        ...tokens,
        colors: { ...tokens.colors, primary: '#123456' },
        branding: { ...tokens.branding, site_title: 'Merchant storefront' },
        theme_design: theme.id === themeWithMissingEntryId ? theme.config.design : {},
        theme_id: '',
        theme_category: '',
      };
      const registeredHtml = renderToString(React.createElement(RegisteredTheme, {
        config: merchantTokens,
        viewportWidth: 390,
        page: 'home',
      }));
      if (!registeredHtml.includes(`data-gs-theme="${theme.id}"`)
        || !registeredHtml.includes(`data-gs-composition="${theme.config.design.composition}"`)
        || !registeredHtml.includes(`data-gs-profile="${theme.config.design.profile}"`)) {
        registeredThemesRendered = false;
        registeredThemeFailure = `theme=${theme.id}, identity=${registeredHtml.includes(`data-gs-theme="${theme.id}"`)}, composition=${registeredHtml.includes(`data-gs-composition="${theme.config.design.composition}"`)}, profile=${registeredHtml.includes(`data-gs-profile="${theme.config.design.profile}"`)}`;
        break;
      }
      if (!registeredHtml.includes('Merchant storefront')
        || !/--primary:\s*#123456/.test(registeredHtml)) {
        runtimeOverridesApplied = false;
        break;
      }
      if (theme.id === themeWithMissingEntryId) {
        missingCatalogFallbackRendered = registeredHtml.includes(`data-gs-theme="${theme.id}"`)
          && registeredHtml.includes(`data-gs-composition="${theme.config.design.composition}"`)
          && registeredHtml.includes('Merchant storefront');
        missingCatalogFallbackDetails = `identity=${registeredHtml.includes(`data-gs-theme="${theme.id}"`)}, composition=${registeredHtml.includes(`data-gs-composition="${theme.config.design.composition}"`)}, merchant=${registeredHtml.includes('Merchant storefront')}`;
      }
      for (const [viewportWidth, expectedDevice] of [
        [320, 'mobile'],
        [390, 'mobile'],
        [768, 'tablet'],
        [1280, 'desktop'],
      ]) {
        const storefrontHtml = renderToString(React.createElement(Storefront, {
          config: tokens,
          viewportWidth,
          page: 'home',
        }));
        if (!storefrontHtml.includes(`data-gs-composition="${theme.config.design.composition}"`)
          || !storefrontHtml.includes(`data-device="${expectedDevice}"`)) {
          liveStorefrontsRendered = false;
          responsiveTiersRendered = false;
          break;
        }
        if (viewportWidth === 1280) {
          const renderedOrder = [...storefrontHtml.matchAll(/data-gs-home-section="([^"]+)"/g)]
            .map((match) => match[1]);
          const expectedOrder = theme.config.design.sectionOrder.filter((section) => section !== 'footer');
          if (renderedOrder.join('|') !== expectedOrder.join('|')) {
            liveSectionOrdersRendered = false;
            break;
          }
        }
      }
      if (!liveStorefrontsRendered || !liveSectionOrdersRendered) break;
    } catch {
      previewsRendered = false;
      liveStorefrontsRendered = false;
      liveSectionOrdersRendered = false;
      break;
    }
  }
  log('all 100 theme previews render with their composition identity', previewsRendered);
  log('all themes render as live storefronts at mobile, tablet and desktop widths', liveStorefrontsRendered);
  log('all themes receive the correct measured width tier at 320, 390, 768 and 1280px', responsiveTiersRendered);
  log('each live storefront respects its authored home-section order', liveSectionOrdersRendered);
  log('all 100 registered theme components render their catalog identity', registeredThemesRendered, registeredThemeFailure);
  log('registered themes preserve merchant customizer overrides', runtimeOverridesApplied);
  log('a missing catalog entry falls back to active storefront config without crashing', missingCatalogFallbackRendered, missingCatalogFallbackDetails);
} finally {
  await vite.close();
}

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====`);
process.exit(fail === 0 ? 0 : 1);
