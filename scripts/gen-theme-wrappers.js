/**
 * scripts/gen-theme-wrappers.js
 * Generates catalog-connected per-theme components (Theme01.jsx .. Theme100.jsx).
 * Existing generated wrappers are refreshed from the catalog; files without
 * the generated marker are treated as bespoke and are never overwritten.
 * Run: node scripts/gen-theme-wrappers.js
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = pathToFileURL(join(__dirname, '..', 'src', 'components', 'storefront', 'templates', 'themeComponents', 'themeData.js'));
const OUT_DIR = join(__dirname, '..', 'src', 'components', 'storefront', 'templates', 'themeComponents', 'Themes');

function componentName(index) {
  return `Theme${String(index).padStart(2, '0')}`;
}

export function generateThemeWrappers(themeData, outDir) {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < themeData.length; i++) {
    const theme = themeData[i];
    const name = componentName(i + 1);
    const outputPath = join(outDir, `${name}.jsx`);
    if (existsSync(outputPath)) {
      const current = readFileSync(outputPath, 'utf8');
      if (!current.includes('AUTO-GENERATED THEME WRAPPER')
        && !current.includes('Auto-generated - DO NOT EDIT BY HAND.')) continue;
    }
    const content = `/**
 * components/storefront/templates/themeComponents/Themes/${name}.jsx
 * AUTO-GENERATED THEME WRAPPER - theme identity and design come from THEME_DATA.
 * Regenerate with:
 *   node scripts/gen-theme-wrappers.js
 */
import BaseThemeComponent from '../BaseThemeComponent.jsx';
import { THEME_BY_ID } from '../themeData.js';
import { mergeThemeConfig, normalizeCustomThemeConfig, templateToCustomizerTokens } from '../../../../../theme/config.js';

const THEME = THEME_BY_ID[${JSON.stringify(theme.id)}];
const BASE_CONFIG = templateToCustomizerTokens({
  id: THEME.id,
  name: THEME.name,
  category: THEME.category,
  config: THEME.config,
});

export default function ${name}({
  config: activeConfig = null,
  viewportWidth,
  page = 'home',
  onNavigate,
  products,
  cart,
  productId,
  onAddToCart,
  onSetQty,
  onRemove,
  checkout,
  storeSlug,
  shopShortcut,
  setShopShortcut,
}) {
  const config = activeConfig
    ? {
      ...normalizeCustomThemeConfig(mergeThemeConfig(BASE_CONFIG, activeConfig)),
      theme_design: BASE_CONFIG.theme_design,
      theme_id: THEME.id,
      theme_category: THEME.category,
    }
    : BASE_CONFIG;
  return (
    <BaseThemeComponent
      config={config}
      viewportWidth={viewportWidth}
      page={page}
      onNavigate={onNavigate}
      products={products}
      cart={cart}
      productId={productId}
      onAddToCart={onAddToCart}
      onSetQty={onSetQty}
      onRemove={onRemove}
      checkout={checkout}
      storeSlug={storeSlug}
      shopShortcut={shopShortcut}
      setShopShortcut={setShopShortcut}
    />
  );
}

${name}.displayName = '${name}';
${name}.themeId = ${JSON.stringify(theme.id)};
${name}.themeName = ${JSON.stringify(theme.name)};
${name}.category = ${JSON.stringify(theme.category)};
`;
    writeFileSync(outputPath, content);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const { THEME_DATA } = await import(DATA_PATH.href);
  generateThemeWrappers(THEME_DATA, OUT_DIR);
  console.log(`Generated ${THEME_DATA.length} catalog-connected theme components in ${OUT_DIR}/.`);
}