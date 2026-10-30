/**
 * scripts/gen-theme-wrappers.js
 * Generates catalog-connected per-theme components for the curated catalog.
 * Existing generated wrappers are refreshed from the catalog; files without
 * the generated marker are treated as bespoke and are never overwritten.
 * Run: node scripts/gen-theme-wrappers.js
 */
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
  unlinkSync,
} from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = pathToFileURL(join(__dirname, '..', 'src', 'components', 'storefront', 'templates', 'themeComponents', 'themeData.js'));
const OUT_DIR = join(__dirname, '..', 'src', 'components', 'storefront', 'templates', 'themeComponents', 'Themes');

function componentName(index) {
  return `Theme${String(index).padStart(2, '0')}`;
}

function isGeneratedWrapper(content) {
  return content.includes('AUTO-GENERATED THEME WRAPPER')
    || content.includes('Auto-generated - DO NOT EDIT BY HAND.');
}

export function generateThemeWrappers(themeData, outDir) {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < themeData.length; i++) {
    const theme = themeData[i];
    const name = componentName(i + 1);
    const outputPath = join(outDir, `${name}.jsx`);
    if (existsSync(outputPath)) {
      const current = readFileSync(outputPath, 'utf8');
      if (!isGeneratedWrapper(current)) continue;
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

const THEME_ID = ${JSON.stringify(theme.id)};
const THEME_CATEGORY = ${JSON.stringify(theme.category)};
const THEME = THEME_BY_ID[THEME_ID];
const BASE_CONFIG = THEME ? templateToCustomizerTokens({
  id: THEME.id,
  name: THEME.name,
  category: THEME.category,
  config: THEME.config,
}) : null;

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
  const config = BASE_CONFIG
    ? activeConfig
      ? {
        ...normalizeCustomThemeConfig(mergeThemeConfig(BASE_CONFIG, activeConfig)),
        theme_design: BASE_CONFIG.theme_design,
        theme_id: THEME_ID,
        theme_category: THEME_CATEGORY,
      }
      : BASE_CONFIG
    : normalizeCustomThemeConfig({
      ...activeConfig,
      theme_id: activeConfig?.theme_id || THEME_ID,
      theme_category: activeConfig?.theme_category || THEME_CATEGORY,
    });
  if (!BASE_CONFIG) {
    console.error(\`[storefront] Catalog entry missing for \${THEME_ID}; rendering with available storefront config.\`);
  }
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

  let removed = 0;
  for (const filename of readdirSync(outDir)) {
    const match = /^Theme(\d+)\.jsx$/.exec(filename);
    if (!match || Number(match[1]) <= themeData.length) continue;
    const outputPath = join(outDir, filename);
    if (isGeneratedWrapper(readFileSync(outputPath, 'utf8'))) {
      unlinkSync(outputPath);
      removed += 1;
    }
  }
  return removed;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const { THEME_DATA } = await import(DATA_PATH.href);
  const removed = generateThemeWrappers(THEME_DATA, OUT_DIR);
  console.log(`Generated ${THEME_DATA.length} catalog-connected theme components in ${OUT_DIR}/. Removed ${removed} retired generated wrappers.`);
}