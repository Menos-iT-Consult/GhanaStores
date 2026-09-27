/**
 * Live storefront theme resolution verification.
 *
 * The failure this guards: the public theme API merges the active template with
 * the seller's overrides into ONE object, but the two speak different shapes -
 * templates use presets (palette/hero/seo), the storefront uses tokens
 * (colors/branding/layout). Reading the merged object as tokens makes every
 * template key look unset, so a seller who activated "Midnight Noir" got the
 * schema default green on their live storefront. resolveStorefrontTheme must
 * layer template -> overrides -> store identity, in that order.
 *
 * Usage: node scripts/storefrontThemeTest.js   (no server, no database)
 */
import { createServer } from 'vite';

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { resolveStorefrontTheme } = await vite.ssrLoadModule('/src/pages/LiveStorefront.jsx');
const { DEFAULT_CUSTOM_THEME_CONFIG } = await vite.ssrLoadModule('/src/theme/config.js');
await vite.close();

const TEMPLATE_CONFIG = {
  palette: { primary: '#0B1120', secondary: '#0F172A', background: '#FFFFFF', textPrimary: '#0F172A', accent: '#FFD700' },
  layout: { gridColumns: 4 },
  borderRadius: { base: '0px' },
  typography: { font_family: "'Playfair Display', serif", headingWeight: 700, bodySize: 16 },
  hero: { subtitle: 'Luxury Ghanaian streetwear' },
  seo: { defaultTitle: 'Midnight Noir' },
};
const TENANT = { name: "Kwame's Fashion", whatsappNumber: '+233201234567' };
const RESOLVED = { storeName: "Kwame's Fashion", theme: { id: 'noir', name: 'Midnight Noir', category: 'Dark', config: TEMPLATE_CONFIG }, templateConfig: TEMPLATE_CONFIG, overrides: {} };

console.log('\nDiDwa storefront theme resolution -> src/pages/LiveStorefront.jsx\n');

/* ---------- The active template must actually paint the store ---------- */
{
  const cfg = resolveStorefrontTheme(RESOLVED, TENANT);
  log('the template palette reaches the storefront', cfg.colors.primary === '#0B1120', `primary=${cfg.colors.primary}`);
  log('the template is not falling back to schema defaults', cfg.colors.primary !== DEFAULT_CUSTOM_THEME_CONFIG.colors.primary);
  log('the template accent reaches the storefront', cfg.colors.accent === '#FFD700');
  log('the template background reaches the storefront', cfg.colors.background === '#FFFFFF');
  log('the template grid columns reach the storefront', cfg.layout.product_grid_columns === 4);
  log('the template tagline reaches the storefront', cfg.branding.tagline === 'Luxury Ghanaian streetwear');
  log('the template font reaches the storefront', String(cfg.typography.font_family).includes('Playfair'));
}

/* ---------- The real store outranks the template's demo identity ---------- */
{
  const cfg = resolveStorefrontTheme(RESOLVED, TENANT);
  log('the store name beats the template demo title', cfg.branding.site_title === "Kwame's Fashion", `title=${cfg.branding.site_title}`);
  log('the store WhatsApp number reaches the storefront', cfg.features.whatsapp_number === '+233201234567');
}

/* ---------- Seller overrides outrank the template ---------- */
{
  const cfg = resolveStorefrontTheme(
    { ...RESOLVED, overrides: { colors: { primary: '#FF0055' }, layout: { product_grid_columns: 2 } } },
    TENANT,
  );
  log('a seller colour override beats the template', cfg.colors.primary === '#FF0055', `primary=${cfg.colors.primary}`);
  log('an overridden token leaves the rest of the template intact', cfg.colors.accent === '#FFD700' && cfg.layout.border_radius === '0px');
  log('a seller grid override beats the template', cfg.layout.product_grid_columns === 2);
}
{
  const cfg = resolveStorefrontTheme({ ...RESOLVED, overrides: { branding: { site_title: 'K. Fashion GH' } } }, TENANT);
  log('a seller-typed title beats the store name', cfg.branding.site_title === 'K. Fashion GH');
}

/* ---------- Degradation: nothing must blank a real store ---------- */
{
  let threw = null;
  let cfg = null;
  try { cfg = resolveStorefrontTheme({}, null); } catch (err) { threw = err; }
  log('a missing theme degrades instead of throwing', threw === null);
  log('a missing theme paints the schema defaults', cfg?.colors?.primary === DEFAULT_CUSTOM_THEME_CONFIG.colors.primary);
  log('a missing theme keeps a generic title', cfg?.branding?.site_title === 'My DiDwa Store');
  log('a missing theme keeps the schema WhatsApp placeholder', cfg?.features?.whatsapp_number === DEFAULT_CUSTOM_THEME_CONFIG.features.whatsapp_number);
}
{
  /* Back-compat: an older API response with no `templateConfig` layer. */
  const cfg = resolveStorefrontTheme({ theme: { name: 'Midnight Noir', config: TEMPLATE_CONFIG } }, TENANT);
  log('a response without templateConfig still paints the template', cfg.colors.primary === '#0B1120');
}
{
  const cfg = resolveStorefrontTheme({ ...RESOLVED, theme: null, templateConfig: null, overrides: null }, TENANT);
  log('an empty payload still yields a usable config', cfg.colors.primary === DEFAULT_CUSTOM_THEME_CONFIG.colors.primary);
}

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====\n`);
process.exit(fail === 0 ? 0 : 1);
