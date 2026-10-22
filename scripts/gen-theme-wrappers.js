/**
 * scripts/gen-theme-wrappers.js
 * Generates 100 per-theme wrapper components (Theme01.jsx .. Theme100.jsx)
 * in themeComponents/Themes/. Each wrapper imports BaseThemeComponent with
 * its theme's config hardcoded, giving every theme its own component file.
 * Run: node scripts/gen-theme-wrappers.js
 */
import { writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = pathToFileURL(join(__dirname, '..', 'src', 'components', 'storefront', 'templates', 'themeComponents', 'themeData.js'));
const OUT_DIR = join(__dirname, '..', 'src', 'components', 'storefront', 'templates', 'themeComponents', 'Themes');

/* Clear existing wrappers */
if (existsSync(OUT_DIR)) {
  for (const f of readdirSync(OUT_DIR)) unlinkSync(join(OUT_DIR, f));
} else {
  mkdirSync(OUT_DIR, { recursive: true });
}

const { THEME_DATA } = await import(DATA_PATH.href);

function componentName(index) {
  return `Theme${String(index).padStart(2, '0')}`;
}

for (let i = 0; i < THEME_DATA.length; i++) {
  const theme = THEME_DATA[i];
  const name = componentName(i + 1);
  const content = `/**
 * components/storefront/templates/themeComponents/Themes/${name}.jsx
 * Per-theme component for ${theme.name} (${theme.id}).
 * Auto-generated - DO NOT EDIT BY HAND. Regenerate with:
 *   node scripts/gen-theme-wrappers.js
 */
import BaseThemeComponent from '../BaseThemeComponent.jsx';
import { THEME_DATA } from '../themeData.js';

const CONFIG = THEME_DATA.find((t) => t.id === ${JSON.stringify(theme.id)}).config;

export default function ${name}({
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
  return (
    <BaseThemeComponent
      config={CONFIG}
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
  writeFileSync(join(OUT_DIR, `${name}.jsx`), content);
}
console.log(`Generated ${THEME_DATA.length} theme wrapper components in ${OUT_DIR}/`);