/**
 * scripts/gen-theme-data.js
 * Generates themeComponents/themeData.js from the same 5x5x4 matrix used by
 * db/migrate.js, so frontend and DB catalog share one source of truth.
 * Run: node scripts/gen-theme-data.js
 */
import { writeFileSync } from 'fs';

const RETAIL_CATEGORIES = [
  { key: 'fashion', label: 'Fashion & Apparel', focus: 'apparel' },
  { key: 'electronics', label: 'Electronics & Gadgets', focus: 'tech' },
  { key: 'beauty', label: 'Beauty & Cosmetics', focus: 'beauty' },
  { key: 'marketplace', label: 'General Marketplace', focus: 'general' },
  { key: 'groceries', label: 'Groceries & Supermarket', focus: 'groceries' },
];

const PALETTES = [
  { key: 'midnight_noir', name: 'Midnight Noir', tag: 'Dark', primary: '#0B1120', secondary: '#0F172A', accent: '#FFD700', background: '#FFFFFF', textPrimary: '#0B1120', textSecondary: '#475569' },
  { key: 'golden_hour', name: 'Golden Hour', tag: 'Warm Amber', primary: '#78350F', secondary: '#92400E', accent: '#F59E0B', background: '#FFFBEB', textPrimary: '#451A03', textSecondary: '#78350F' },
  { key: 'jade_district', name: 'Jade District', tag: 'Tech Green', primary: '#064E35', secondary: '#065F4E', accent: '#10B981', background: '#ECFDF5', textPrimary: '#064E35', textSecondary: '#065F4E' },
  { key: 'azure_mist', name: 'Azure Mist', tag: 'Minimal Blue', primary: '#0C4A6E', secondary: '#0EA5E9', accent: '#0EA5E9', background: '#F0F9FF', textPrimary: '#0C4A6E', textSecondary: '#334159' },
  { key: 'coral_blush', name: 'Coral Blush', tag: 'Pastel Red', primary: '#7F1D1D', secondary: '#B91C1C', accent: '#F87171', background: '#FEF2F2', textPrimary: '#450A0A', textSecondary: '#7F1D1D' },
];

const LAYOUTS = [
  { key: 'dense_hero_bordered', cols: 3, hero: true, card: 'bordered', gridGap: '1rem' },
  { key: 'spacious_hero_minimal', cols: 4, hero: true, card: 'minimal', gridGap: '1.25rem' },
  { key: 'compact_nohero_card', cols: 3, hero: false, card: 'compact', gridGap: '0.75rem' },
  { key: 'wide_nohero_list', cols: 4, hero: false, card: 'minimal', gridGap: '1rem' },
];

const BORDER_RADII = [
  { key: 'crisp', label: 'Crisp', rem: '0rem' },
  { key: 'subtle', label: 'Subtle', rem: '0.375rem' },
  { key: 'rounded', label: 'Rounded', rem: '0.75rem' },
  { key: 'extra_rounded', label: 'Extra Rounded', rem: '1.5rem' },
];

const CONVERSION_TUNING = {
  fashion: { freeShippingThresholdGHS: 80, ctaText: 'Shop Now', urgency: 'Trending' },
  electronics: { freeShippingThresholdGHS: 200, ctaText: 'Get Yours', urgency: 'Hot Deals' },
  beauty: { freeShippingThresholdGHS: 120, ctaText: 'Discover', urgency: "Today's Picks" },
  marketplace: { freeShippingThresholdGHS: 150, ctaText: 'View All', urgency: 'Best Sellers' },
  groceries: { freeShippingThresholdGHS: 100, ctaText: 'Order Now', urgency: 'Delivery in 60 min' },
};

function heroCopy(categoryFocus) {
  const copy = {
    apparel: ['Express Your Style', 'Handpicked looks for every Ghanaian closet.'],
    tech: ['Powered by Ghana', 'Latest gadgets, local prices, fast delivery.'],
    beauty: ['Glow Your Way', 'Beauty that speaks to every skin tone.'],
    general: ['One Market, Many Talents', 'From vibrant craft markets to boutique textiles - all in one place.'],
    groceries: ['Groceries at Your Door', 'Fresh from market, delivered same-day nationwide.'],
  };
  return copy[categoryFocus] || ['Welcome', 'Shop our curated collection.'];
}

function buildConfig(category, palette, layout, border) {
  const conv = CONVERSION_TUNING[category.focus] || CONVERSION_TUNING.marketplace;
  const [heroTitle, heroSub] = heroCopy(category.focus);
  const isDark = palette.background !== '#FFFFFF';
  return {
    version: 1,
    generatedAt: '2026-10-21T00:00:00.000Z',
    locale: {
      currency: 'GHS',
      currencySymbol: '₵',
      languageTag: 'en-GH',
      phonePrefix: '233',
      dateFormat: 'DD/MM/YYYY',
    },
    palette: {
      name: palette.name,
      tag: palette.tag,
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
      background: palette.background,
      textPrimary: palette.textPrimary,
      textSecondary: palette.textSecondary,
      isDark,
    },
    layout: {
      gridColumns: layout.cols,
      heroBanner: layout.hero,
      heroHeight: layout.hero ? '560px' : '0px',
      cardStyle: layout.card,
      gridGap: layout.gridGap,
      productCardRounded: border.rem,
      showProductImages: true,
      showDiscountBadge: true,
      stickyHeader: true,
    },
    borderRadius: {
      base: border.rem,
      name: border.label,
      buttons: layout.card === 'compact' ? '0.375rem' : border.rem,
    },
    typography: {
      headingFont: 'Poppins, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      baseFontSize: 16,
      headingScale: 1.25,
      buttonWeight: 600,
    },
    hero: {
      enabled: layout.hero,
      title: heroTitle,
      subtitle: heroSub,
      callToAction: conv.ctaText,
      bgGradient: `${palette.primary}05, ${palette.background}`,
      overlay: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    },
    sections: [
      { key: 'hero', enabled: layout.hero, order: 1 },
      { key: 'urgency', enabled: true, order: 2, text: `${conv.urgency} · Shipping nationwide` },
      { key: 'categories', enabled: true, order: 3, columns: layout.cols },
      { key: 'products-grid', enabled: true, order: 4, columns: layout.cols },
      { key: 'social-proof', enabled: true, order: 5, source: 'ratings' },
      { key: 'cta-banner', enabled: true, order: 6, text: `Free delivery on orders over ₵${conv.freeShippingThresholdGHS}` },
      { key: 'footer', enabled: true, order: 7 },
    ],
    conversion: {
      currency: 'GHS',
      freeShippingThresholdGHS: conv.freeShippingThresholdGHS,
      codEnabled: true,
      momoEnabled: true,
      mobileMoneyProviders: ['MTN MoMo', 'Vodafone Cash', 'AirtelTigo'],
      whatsappFab: true,
      whatsappCountryCode: '233',
      urgencyTicker: conv.urgency,
      lowStockBadge: true,
      mobileOptimized: true,
      trustBadges: [
        { label: 'GH Secured', icon: 'shield' },
        { label: '24-Hr Delivery', icon: 'clock' },
        { label: 'Cash or MoMo', icon: 'wallet' },
      ],
    },
    paymentBadges: ['MTN MoMo', 'Vodafone Cash', 'AirtelTigo', 'Cash on Delivery'],
    seo: {
      titleTemplate: `%s | ${category.label} Store`,
      defaultTitle: `${category.label} — DiDwa`,
      defaultDescription: `Discover the best ${category.label.toLowerCase()} in Ghana. Fast delivery, GHS prices, MoMo accepted.`,
      ogImage: `/api/og?title=${encodeURIComponent(category.label)}`,
    },
  };
}

const presets = [];
let globalIndex = 0;
for (let ci = 0; ci < RETAIL_CATEGORIES.length; ci++) {
  const category = RETAIL_CATEGORIES[ci];
  for (let pi = 0; pi < PALETTES.length; pi++) {
    const palette = PALETTES[pi];
    for (let li = 0; li < LAYOUTS.length; li++) {
      const layout = LAYOUTS[li];
      const border = BORDER_RADII[globalIndex % BORDER_RADII.length];
      globalIndex++;
      const id = `${category.key}-${palette.key}-${layout.key}-${border.key}`;
      const name = `Theme ${String(globalIndex).padStart(2, '0')}`;
      const config = buildConfig(category, palette, layout, border);
      config.themeId = id;
      presets.push({ id, name, category: category.key, config });
    }
  }
}

function escapeJsString(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

const lines = [];
lines.push('/**');
lines.push(' * themeComponents/themeData.js');
lines.push(' * Auto-generated from the 5x5x4 theme matrix (see scripts/gen-theme-data.js).');
lines.push(' * All 100 theme presets with full configs, idempotently stable IDs.');
lines.push(' * DO NOT EDIT BY HAND - regenerate with: node scripts/gen-theme-data.js');
lines.push(' */');
lines.push('');
lines.push('export const THEME_DATA = [');
for (const p of presets) {
  lines.push('  {');
  lines.push(`    id: ${JSON.stringify(p.id)},`);
  lines.push(`    name: ${JSON.stringify(p.name)},`);
  lines.push(`    category: ${JSON.stringify(p.category)},`);
  lines.push('    config: ' + JSON.stringify(p.config, null, 4).replace(/^/gm, '      ').replace(/\n\s*$/, '\n    ') + ',');
  lines.push('  },');
}
lines.push('];');
lines.push('');
lines.push('export const THEME_BY_ID = Object.fromEntries(THEME_DATA.map(t => [t.id, t]));');
lines.push('');

writeFileSync(
  'src/components/storefront/templates/themeComponents/themeData.js',
  lines.join('\n') + '\n'
);
console.log(`Generated themeData.js with ${presets.length} themes.`);