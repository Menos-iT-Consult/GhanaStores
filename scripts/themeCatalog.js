/**
 * Curated storefront theme catalog.
 *
 * IDs retain the original category/palette/layout/radius keys so existing
 * merchant selections remain valid. Design identity is now authored separately
 * from those compatibility keys.
 */
export const RETAIL_CATEGORIES = [
  { key: 'fashion', label: 'Fashion & Apparel', focus: 'apparel' },
  { key: 'electronics', label: 'Electronics & Gadgets', focus: 'tech' },
  { key: 'beauty', label: 'Beauty & Cosmetics', focus: 'beauty' },
  { key: 'marketplace', label: 'General Marketplace', focus: 'general' },
  { key: 'groceries', label: 'Groceries & Supermarket', focus: 'groceries' },
];

export const PALETTES = [
  { key: 'midnight_noir', name: 'Midnight Noir', tag: 'Dark', primary: '#0B1120', secondary: '#0F172A', accent: '#FFD700', background: '#FFFFFF', textPrimary: '#0B1120', textSecondary: '#475569' },
  { key: 'golden_hour', name: 'Golden Hour', tag: 'Warm Amber', primary: '#78350F', secondary: '#92400E', accent: '#F59E0B', background: '#FFFBEB', textPrimary: '#451A03', textSecondary: '#78350F' },
  { key: 'jade_district', name: 'Jade District', tag: 'Tech Green', primary: '#064E35', secondary: '#065F4E', accent: '#10B981', background: '#ECFDF5', textPrimary: '#064E35', textSecondary: '#065F4E' },
  { key: 'azure_mist', name: 'Azure Mist', tag: 'Minimal Blue', primary: '#0C4A6E', secondary: '#0EA5E9', accent: '#0EA5E9', background: '#F0F9FF', textPrimary: '#0C4A6E', textSecondary: '#334159' },
  { key: 'coral_blush', name: 'Coral Blush', tag: 'Pastel Red', primary: '#7F1D1D', secondary: '#B91C1C', accent: '#F87171', background: '#FEF2F2', textPrimary: '#450A0A', textSecondary: '#7F1D1D' },
];

export const LAYOUTS = [
  { key: 'dense_hero_bordered', cols: 3, hero: true, card: 'bordered', gridGap: '1rem' },
  { key: 'spacious_hero_minimal', cols: 4, hero: true, card: 'minimal', gridGap: '1.25rem' },
  { key: 'compact_nohero_card', cols: 3, hero: false, card: 'compact', gridGap: '0.75rem' },
  { key: 'wide_nohero_list', cols: 4, hero: false, card: 'minimal', gridGap: '1rem' },
];

export const BORDER_RADII = [
  { key: 'crisp', label: 'Crisp', rem: '0rem' },
  { key: 'subtle', label: 'Subtle', rem: '0.375rem' },
  { key: 'rounded', label: 'Rounded', rem: '0.75rem' },
  { key: 'extra_rounded', label: 'Extra Rounded', rem: '1.5rem' },
];

export const LEGACY_THEME_COUNT = RETAIL_CATEGORIES.length * PALETTES.length * LAYOUTS.length;

export const CURATED_THEME_SELECTIONS = {
  fashion: [0, 4, 9, 13, 16],
  electronics: [0, 5, 12, 16, 19],
  beauty: [2, 8, 13, 14, 18],
  marketplace: [3, 6, 10, 16, 19],
  groceries: [1, 3, 7, 14, 19],
};

const CURATED_DESIGN_OVERRIDES = {
  electronics: {
    0: { label: 'Precision Circuit Catalog', header: 'catalog' },
    16: { label: 'Dual-Panel Tech Showcase', hero: 'dual', productPresentation: 'wide_cards' },
  },
  beauty: {
    13: { label: 'Framed Botanical Journal', hero: 'framed' },
  },
  marketplace: {
    16: { label: 'Market Search Gallery', header: 'catalog', hero: 'search_first', productPresentation: 'gallery' },
    19: { label: 'Neighborhood Campaign Market', header: 'editorial', hero: 'full_bleed', productPresentation: 'asymmetric' },
  },
  groceries: {
    3: { label: 'Framed Market Stand', header: 'catalog', hero: 'framed', productPresentation: 'catalog' },
    14: { label: 'Fresh Counter List', header: 'ticker', hero: 'banner', productPresentation: 'list' },
    19: { label: 'Pantry Finder', header: 'catalog', hero: 'centered', productPresentation: 'produce' },
  },
};

const CURATED_MOBILE_MENU_IDS = new Set([
  'fashion-midnight_noir-dense_hero_bordered-crisp',
  'fashion-azure_mist-spacious_hero_minimal-subtle',
  'electronics-midnight_noir-dense_hero_bordered-crisp',
  'electronics-azure_mist-dense_hero_bordered-crisp',
  'electronics-coral_blush-wide_nohero_list-extra_rounded',
  'beauty-jade_district-dense_hero_bordered-crisp',
  'marketplace-midnight_noir-wide_nohero_list-extra_rounded',
  'marketplace-coral_blush-dense_hero_bordered-crisp',
  'groceries-midnight_noir-spacious_hero_minimal-subtle',
  'groceries-golden_hour-wide_nohero_list-extra_rounded',
]);

export const TOTAL_PRESETS = RETAIL_CATEGORIES.length * 5;

export const CONVERSION_TUNING = {
  fashion: { freeShippingThresholdGHS: 80, ctaText: 'Shop Now', urgency: 'Trending' },
  electronics: { freeShippingThresholdGHS: 200, ctaText: 'Get Yours', urgency: 'Hot Deals' },
  beauty: { freeShippingThresholdGHS: 120, ctaText: 'Discover', urgency: "Today's Picks" },
  marketplace: { freeShippingThresholdGHS: 150, ctaText: 'View All', urgency: 'Best Sellers' },
  groceries: { freeShippingThresholdGHS: 100, ctaText: 'Order Now', urgency: 'Delivery in 60 min' },
};

const CATEGORY_NAMES = {
  fashion: ['Accra Atelier', 'Kente House', 'The Ankara Edit', 'Sunday Best', 'Nkrumah Street', 'Thread & Loom', 'Studio Adinkra', 'Coastal Wardrobe', 'The Modiste', 'Osu Collective', 'Golden Stitch', 'Heritage Wear', 'Market Day Style', 'The Tailor Room', 'Palmwine Prints', 'New Look Accra', 'Woven Stories', 'The Style Quarter', 'North Star Cloth', 'Everyday Ghana'],
  electronics: ['Circuit Lab', 'Volt & Vibe', 'The Gadget Dock', 'Signal House', 'Pixel Market', 'Accra Audio Co.', 'Power District', 'NextWave Tech', 'Device Depot', 'The Smart Shelf', 'Bright Circuit', 'Mobile Foundry', 'Tech Junction', 'Urban Digital', 'The Charging Point', 'Future Foundry', 'Sound & Silicon', 'Gadget Republic', 'Everyday Electric', 'The Device Room'],
  beauty: ['Shea & Silk', 'Glow Ritual', 'The Beauty Bar', 'Adwoa Botanics', 'Soft Focus', 'Cocoa Bloom', 'Skin Ceremony', 'The Scent Studio', 'Radiant Roots', 'Petal & Clay', 'Golden Hour Beauty', 'Bare & Bold', 'Nubian Glow', 'Botanical Muse', 'The Vanity Edit', 'Pure Shea House', 'Blush Market', 'Kindred Skin', 'Dewdrop Studio', 'The Glow Garden'],
  marketplace: ['The Accra Market', 'Good Finds Ghana', 'Common Ground', 'The Makers Yard', 'Open Market Co.', 'Everyday Finds', 'The Local Edit', 'Market & Main', 'The Neighbourhood', 'Made Around Here', 'The Trading Post', 'City Market House', 'Gather Ghana', 'The Goods Exchange', 'One Good Shop', 'The Corner Store', 'Market Street', 'The Curated Shelf', 'Homegrown Goods', 'The Daily Market'],
  groceries: ['Fresh Basket', 'Market Morning', 'Harvest House', 'The Pantry Cart', 'Fresh & Ready', 'Green Basket Co.', 'Daily Provisions', 'The Market Table', 'Good Food Accra', 'Neighbourhood Grocer', 'Farm Gate', 'Kitchen Market', 'The Fresh Stop', 'Harvest & Home', 'Accra Pantry', 'The Grocery Run', 'Root & Basket', 'Good Day Groceries', 'Market Lane Fresh', 'The Provision Room'],
};

const DESIGN_DIRECTIONS = [
  { id: 'editorial-split', label: 'Editorial Split', hero: 'split', grid: 'asymmetric', header: 'editorial', font: 'Playfair Display', sections: ['hero', 'categories', 'products-grid', 'social-proof', 'cta-banner', 'footer'] },
  { id: 'full-bleed-campaign', label: 'Full-Bleed Campaign', hero: 'full_bleed', grid: 'wide_cards', header: 'overlay', font: 'Outfit', sections: ['hero', 'urgency', 'products-grid', 'categories', 'cta-banner', 'footer'] },
  { id: 'quiet-gallery', label: 'Quiet Gallery', hero: 'centered', grid: 'gallery', header: 'minimal', font: 'Plus Jakarta Sans', sections: ['hero', 'products-grid', 'social-proof', 'categories', 'footer'] },
  { id: 'market-stall', label: 'Market Stall', hero: 'compact', grid: 'dense', header: 'utility', font: 'Inter', sections: ['urgency', 'hero', 'categories', 'products-grid', 'cta-banner', 'footer'] },
  { id: 'magazine-mosaic', label: 'Magazine Mosaic', hero: 'editorial', grid: 'masonry', header: 'editorial', font: 'Playfair Display', sections: ['hero', 'social-proof', 'categories', 'products-grid', 'cta-banner', 'footer'] },
  { id: 'modern-utility', label: 'Modern Utility', hero: 'dual', grid: 'spec_cards', header: 'utility', font: 'Outfit', sections: ['urgency', 'hero', 'products-grid', 'categories', 'social-proof', 'footer'] },
  { id: 'heritage-craft', label: 'Heritage Craft', hero: 'framed', grid: 'woven', header: 'heritage', font: 'Playfair Display', sections: ['hero', 'categories', 'social-proof', 'products-grid', 'cta-banner', 'footer'] },
  { id: 'express-counter', label: 'Express Counter', hero: 'banner', grid: 'list', header: 'ticker', font: 'Inter', sections: ['urgency', 'hero', 'products-grid', 'cta-banner', 'categories', 'footer'] },
  { id: 'soft-boutique', label: 'Soft Boutique', hero: 'centered', grid: 'soft_cards', header: 'floating', font: 'Plus Jakarta Sans', sections: ['hero', 'categories', 'products-grid', 'social-proof', 'footer'] },
  { id: 'bold-type', label: 'Bold Type', hero: 'typographic', grid: 'poster', header: 'bold', font: 'Outfit', sections: ['hero', 'products-grid', 'urgency', 'categories', 'cta-banner', 'footer'] },
  { id: 'coastal-air', label: 'Coastal Air', hero: 'split_reverse', grid: 'wide_cards', header: 'minimal', font: 'Inter', sections: ['hero', 'categories', 'products-grid', 'social-proof', 'footer'] },
  { id: 'night-market', label: 'Night Market', hero: 'dark', grid: 'dark_cards', header: 'overlay', font: 'Outfit', sections: ['urgency', 'hero', 'products-grid', 'social-proof', 'cta-banner', 'footer'] },
  { id: 'catalog-classic', label: 'Catalog Classic', hero: 'search_first', grid: 'catalog', header: 'catalog', font: 'Inter', sections: ['hero', 'categories', 'products-grid', 'cta-banner', 'footer'] },
  { id: 'artisan-journal', label: 'Artisan Journal', hero: 'story', grid: 'editorial_cards', header: 'heritage', font: 'Playfair Display', sections: ['hero', 'social-proof', 'products-grid', 'categories', 'cta-banner', 'footer'] },
  { id: 'fresh-pickup', label: 'Fresh Pickup', hero: 'compact', grid: 'produce', header: 'utility', font: 'Plus Jakarta Sans', sections: ['urgency', 'categories', 'hero', 'products-grid', 'cta-banner', 'footer'] },
  { id: 'studio-frame', label: 'Studio Frame', hero: 'framed', grid: 'gallery', header: 'floating', font: 'Plus Jakarta Sans', sections: ['hero', 'products-grid', 'categories', 'social-proof', 'footer'] },
  { id: 'street-poster', label: 'Street Poster', hero: 'typographic', grid: 'poster', header: 'bold', font: 'Outfit', sections: ['urgency', 'hero', 'categories', 'products-grid', 'cta-banner', 'footer'] },
  { id: 'clean-commerce', label: 'Clean Commerce', hero: 'centered', grid: 'catalog', header: 'catalog', font: 'Inter', sections: ['hero', 'products-grid', 'categories', 'social-proof', 'footer'] },
  { id: 'sunset-showcase', label: 'Sunset Showcase', hero: 'full_bleed', grid: 'masonry', header: 'overlay', font: 'Playfair Display', sections: ['hero', 'categories', 'products-grid', 'cta-banner', 'social-proof', 'footer'] },
  { id: 'one-page-market', label: 'One-Page Market', hero: 'banner', grid: 'list', header: 'ticker', font: 'Outfit', sections: ['urgency', 'hero', 'categories', 'products-grid', 'social-proof', 'footer'] },
];

const CATEGORY_COPY = {
  fashion: ['Wear your story', 'Considered pieces, made for the way you move.', 'A closer look at the collection.'],
  electronics: ['Make room for better', 'Thoughtful tech, ready for everyday life.', 'Find the right gear for your setup.'],
  beauty: ['A ritual of your own', 'Feel-good essentials for every shade and season.', 'Find your new daily favourite.'],
  marketplace: ['Good things, close to home', 'A considered collection from independent Ghanaian sellers.', 'Find something worth keeping.'],
  groceries: ['Fresh finds for today', 'Market favourites, picked fresh and brought to your door.', 'Stock your kitchen with the good stuff.'],
};

const CATEGORY_INDEX = Object.fromEntries(RETAIL_CATEGORIES.map((item, index) => [item.key, index]));

function heroCopy(category) {
  const copy = {
    fashion: ['Express Your Style', 'Handpicked looks for every Ghanaian closet.'],
    electronics: ['Powered by Ghana', 'Latest gadgets, local prices, fast delivery.'],
    beauty: ['Glow Your Way', 'Beauty that speaks to every skin tone.'],
    marketplace: ['One Market, Many Talents', 'From vibrant craft markets to boutique textiles - all in one place.'],
    groceries: ['Groceries at Your Door', 'Fresh from market, delivered same-day nationwide.'],
  };
  return copy[category] || ['Welcome', 'Shop our curated collection.'];
}

function buildConfig(category, palette, layout, border, design, ordinal, themeName) {
  const conv = CONVERSION_TUNING[category.key];
  const [legacyTitle, legacySubtitle] = heroCopy(category.key);
  const [title, subtitle, productHeading] = CATEGORY_COPY[category.key];
  const isDark = palette.background !== '#FFFFFF';
  return {
    version: 2,
    locale: { currency: 'GHS', currencySymbol: '₵', languageTag: 'en-GH', phonePrefix: '233', dateFormat: 'DD/MM/YYYY' },
    palette: { ...palette, isDark },
    layout: {
      gridColumns: layout.cols, heroBanner: layout.hero, heroHeight: '560px',
      cardStyle: layout.card, gridGap: layout.gridGap, productCardRounded: border.rem,
      showProductImages: true, showDiscountBadge: true, stickyHeader: true,
    },
    borderRadius: { base: border.rem, name: border.label, buttons: layout.card === 'compact' ? '0.375rem' : border.rem },
    typography: { headingFont: `${design.font}, system-ui, sans-serif`, bodyFont: 'Inter, system-ui, sans-serif', baseFontSize: 16, headingScale: 1.25, buttonWeight: 600 },
    hero: { enabled: true, title, subtitle, callToAction: conv.ctaText, legacyTitle, legacySubtitle, bgGradient: `${palette.primary}12, ${palette.background}`, overlay: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' },
    design: {
      version: 1,
      ordinal,
      name: `${themeName} · ${design.label}`,
      description: `${themeName} is a ${design.label.toLowerCase()} storefront for ${category.label.toLowerCase()}, with a ${design.hero.replaceAll('_', ' ')} opening and ${design.grid.replaceAll('_', ' ')} product presentation.`,
      tags: [category.key, design.id.replaceAll('-', ' '), design.grid.replaceAll('_', ' ')],
      composition: `${category.key}-${themeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      profile: design.id,
      header: design.header,
      hero: design.hero,
      productPresentation: design.grid,
      sectionOrder: design.sections,
    },
    home_content: { featured_heading: productHeading, view_all_label: 'View collection', hero_button_label: conv.ctaText },
    sections: design.sections.map((key, index) => ({
      key, enabled: true, order: index + 1,
      ...(key === 'categories' || key === 'products-grid' ? { columns: layout.cols } : {}),
      ...(key === 'urgency' ? { text: `${conv.urgency} · Shipping nationwide` } : {}),
      ...(key === 'cta-banner' ? { text: `Free delivery on orders over ₵${conv.freeShippingThresholdGHS}` } : {}),
    })),
    conversion: {
      currency: 'GHS', freeShippingThresholdGHS: conv.freeShippingThresholdGHS,
      codEnabled: true, momoEnabled: true, mobileMoneyProviders: ['MTN MoMo', 'Vodafone Cash', 'AirtelTigo'],
      whatsappFab: true, whatsappCountryCode: '233', urgencyTicker: conv.urgency,
      lowStockBadge: true, mobileOptimized: true,
      trustBadges: [{ label: 'GH Secured', icon: 'shield' }, { label: '24-Hr Delivery', icon: 'clock' }, { label: 'Cash or MoMo', icon: 'wallet' }],
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

export function buildLegacyPresets() {
  const presets = [];
  let globalIndex = 0;
  for (let ci = 0; ci < RETAIL_CATEGORIES.length; ci++) {
    const category = RETAIL_CATEGORIES[ci];
    for (let pi = 0; pi < PALETTES.length; pi++) {
      const palette = PALETTES[pi];
      for (let li = 0; li < LAYOUTS.length; li++) {
        const layout = LAYOUTS[li];
        const ordinal = globalIndex++;
        const border = BORDER_RADII[ordinal % BORDER_RADII.length];
        const design = DESIGN_DIRECTIONS[ordinal % DESIGN_DIRECTIONS.length];
        const id = `${category.key}-${palette.key}-${layout.key}-${border.key}`;
        const name = CATEGORY_NAMES[category.key][ordinal % CATEGORY_NAMES[category.key].length];
        const config = buildConfig(category, palette, layout, border, design, ordinal + 1, name);
        config.themeId = id;
        presets.push({ id, name, category: category.key, config });
      }
    }
  }
  return presets;
}

export function buildPresets() {
  const selectedIds = new Set();
  for (let categoryIndex = 0; categoryIndex < RETAIL_CATEGORIES.length; categoryIndex++) {
    const category = RETAIL_CATEGORIES[categoryIndex];
    for (const localIndex of CURATED_THEME_SELECTIONS[category.key] || []) {
      const palette = PALETTES[Math.floor(localIndex / LAYOUTS.length)];
      const layout = LAYOUTS[localIndex % LAYOUTS.length];
      const border = BORDER_RADII[(categoryIndex * PALETTES.length * LAYOUTS.length + localIndex) % BORDER_RADII.length];
      selectedIds.add(`${category.key}-${palette.key}-${layout.key}-${border.key}`);
    }
  }
  return buildLegacyPresets()
    .filter((theme) => selectedIds.has(theme.id))
    .map((theme) => {
      const localIndex = (theme.config.design.ordinal - 1) % (PALETTES.length * LAYOUTS.length);
      const override = CURATED_DESIGN_OVERRIDES[theme.category]?.[localIndex];
      const design = override ? {
        ...theme.config.design,
        ...override,
        name: `${theme.name} · ${override.label}`,
        description: `${theme.name} is a ${override.label.toLowerCase()} storefront for ${RETAIL_CATEGORIES.find((category) => category.key === theme.category).label.toLowerCase()}, with a ${override.hero || theme.config.design.hero} opening and ${(override.productPresentation || theme.config.design.productPresentation).replaceAll('_', ' ')} product presentation.`,
        tags: [theme.category, override.label.toLowerCase(), (override.productPresentation || theme.config.design.productPresentation).replaceAll('_', ' ')],
      } : theme.config.design;
      return {
        ...theme,
        config: {
          ...theme.config,
          design: {
            ...design,
            mobileMenu: CURATED_MOBILE_MENU_IDS.has(theme.id),
          },
        },
      };
    });
}

function themeMatchScore(source, candidate) {
  const sourceLayout = source.config.layout;
  const candidateLayout = candidate.config.layout;
  let score = source.category === candidate.category ? 1000 : 0;
  if (source.config.design.profile === candidate.config.design.profile) score += 100;
  if (sourceLayout.gridColumns === candidateLayout.gridColumns) score += 12;
  if (sourceLayout.heroBanner === candidateLayout.heroBanner) score += 8;
  if (sourceLayout.cardStyle === candidateLayout.cardStyle) score += 6;
  if (source.config.palette.key === candidate.config.palette.key) score += 20;
  if (source.config.borderRadius.name === candidate.config.borderRadius.name) score += 2;
  return score;
}

/**
 * Stable mapping for every generated legacy ID. Retired IDs map to the closest
 * curated theme in the same retail category; selected IDs map to themselves.
 */
export function buildThemeIdMigrationMap() {
  const legacyThemes = buildLegacyPresets();
  const curatedThemes = buildPresets();
  return Object.fromEntries(legacyThemes.map((legacyTheme) => {
    if (curatedThemes.some((theme) => theme.id === legacyTheme.id)) {
      return [legacyTheme.id, legacyTheme.id];
    }
    const candidates = curatedThemes
      .filter((theme) => theme.category === legacyTheme.category)
      .sort((a, b) => themeMatchScore(legacyTheme, b) - themeMatchScore(legacyTheme, a)
        || a.id.localeCompare(b.id));
    return [legacyTheme.id, candidates[0].id];
  }));
}
