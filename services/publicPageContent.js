import { query } from '../config/database.js';

export const PUBLIC_PAGE_SLUGS = Object.freeze([
  '/', '/features', '/how-it-works', '/pricing', '/about', '/contact',
  '/affiliate-program', '/terms', '/privacy',
]);

export const DEFAULT_PUBLIC_PAGE_CONTENT = Object.freeze({
  '/': {
    eyebrow: 'Commerce built for Ghanaian shops',
    title: 'Sell in-store & online.',
    titleAccent: 'Manage every sale with DiDwa.',
    description: 'Bring in-person sales, inventory, online orders and your storefront into one seller workspace. Use guided DiDwa AI actions based on your store data.',
    primaryLabel: 'Start your free trial',
    primaryHref: '/login',
    secondaryLabel: 'See how it works',
    secondaryHref: '/how-it-works',
    mediaType: 'image',
    mediaUrl: '/iphone-shot.png',
    posterUrl: '/iphone-shot.png',
    mediaAlt: 'DiDwa seller dashboard shown on a mobile device',
    mediaCaption: 'Products, stock, orders and sales in one workspace',
    sectionEyebrow: 'Built around the way you sell',
    sectionTitle: 'One login. Every tool your shop needs.',
    seoTitle: 'Online Store Builder in Ghana & POS | DiDwa',
    seoDescription: 'Manage in-person and online sales, stock, orders, and storefront themes with DiDwa. Get guided seller AI tools and managed payout requests.',
    ogImage: '/didwa-logo.jpg',
  },
  '/features': {
    eyebrow: 'Features',
    title: 'Everything a Ghanaian shop needs, in one login.',
    description: 'Built for merchants who sell across the counter, over the phone and online at the same time.',
  },
  '/how-it-works': {
    eyebrow: 'How it works',
    title: 'Set up your store in three steps.',
    description: 'Create your account, stock your catalog and choose your payment setup, then manage sales and orders from one seller workspace.',
  },
  '/pricing': {
    eyebrow: 'Pricing',
    title: 'One login. Every tool. Pay as you grow.',
    description: 'Start free for 14 days with no card. When you are ready, pick a plan and pay by Mobile Money.',
  },
  '/about': {
    eyebrow: 'About DiDwa',
    title: 'Built for Ghanaian commerce.',
    description: 'A practical commerce platform for the merchants who keep Ghana trading.',
  },
  '/contact': {
    eyebrow: 'Contact',
    title: 'Talk to the DiDwa team.',
    description: 'Questions about plans, payments, storefronts or account access? Send us a message.',
  },
  '/affiliate-program': {
    eyebrow: 'Affiliate program',
    title: 'Grow with DiDwa.',
    description: 'Introduce merchants to DiDwa and earn recurring commission on eligible referred stores.',
  },
  '/terms': {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    description: 'The terms governing use of the DiDwa platform.',
  },
  '/privacy': {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    description: 'How DiDwa collects, uses and protects information.',
  },
});

export function settingKeyForSlug(slug, state = 'published') {
  if (!PUBLIC_PAGE_SLUGS.includes(slug)) throw new Error('Unknown public page.');
  const slugKey = slug === '/' ? 'home' : slug.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '_');
  return `public_page_${slugKey}_${state}`;
}

function normalizeContent(slug, value) {
  const fallback = DEFAULT_PUBLIC_PAGE_CONTENT[slug] || {};
  const input = value && typeof value === 'object' ? value : {};
  const stringFields = [
    'eyebrow', 'title', 'titleAccent', 'description', 'primaryLabel', 'primaryHref',
    'secondaryLabel', 'secondaryHref', 'mediaType', 'mediaUrl', 'posterUrl',
    'mediaAlt', 'mediaCaption', 'sectionEyebrow', 'sectionTitle', 'seoTitle',
    'seoDescription', 'ogImage',
  ];
  const normalized = {};
  for (const field of stringFields) {
    normalized[field] = String(input[field] ?? fallback[field] ?? '').trim().slice(0, field.includes('description') ? 300 : 500);
  }
  normalized.mediaType = ['image', 'video'].includes(normalized.mediaType) ? normalized.mediaType : 'image';
  for (const field of ['mediaUrl', 'posterUrl', 'ogImage']) {
    const url = normalized[field];
    if (url && !url.startsWith('/') && !/^https:\/\//i.test(url)) return { error: `${field} must be an HTTPS URL or a root-relative path.` };
  }
  return { content: normalized };
}

export async function getPublicPageContent(slug, runQuery = query) {
  const { rows } = await runQuery(
    'SELECT setting_value FROM system_settings WHERE setting_key = $1 LIMIT 1',
    [settingKeyForSlug(slug, 'published')],
  );
  let stored = null;
  if (rows[0]?.setting_value) {
    try { stored = JSON.parse(rows[0].setting_value); } catch { stored = null; }
  }
  const normalized = normalizeContent(slug, stored);
  return normalized.error ? normalizeContent(slug, null).content : normalized.content;
}

export async function getPublicPageEditorState(slug, runQuery = query) {
  const keys = [settingKeyForSlug(slug, 'draft'), settingKeyForSlug(slug, 'published')];
  const { rows } = await runQuery(
    'SELECT setting_key, setting_value FROM system_settings WHERE setting_key = ANY($1::text[])',
    [keys],
  );
  const values = new Map(rows.map((row) => [row.setting_key, row.setting_value]));
  const parse = (key) => {
    try { return JSON.parse(values.get(key) || 'null'); } catch { return null; }
  };
  const draft = parse(keys[0]);
  const published = parse(keys[1]);
  return {
    draft: normalizeContent(slug, draft).content,
    published: normalizeContent(slug, published).content,
    fallback: DEFAULT_PUBLIC_PAGE_CONTENT[slug] || {},
  };
}

export function validatePublicPageContent(slug, value) {
  if (!PUBLIC_PAGE_SLUGS.includes(slug)) return { error: 'Unknown public page.' };
  return normalizeContent(slug, value);
}

export async function savePublicPageContent(slug, value, state, runQuery) {
  const result = validatePublicPageContent(slug, value);
  if (result.error) return result;
  await runQuery(
    `INSERT INTO system_settings (setting_key, setting_value, description)
     VALUES ($1, $2::text, $3)
     ON CONFLICT (setting_key) DO UPDATE
       SET setting_value = EXCLUDED.setting_value, description = EXCLUDED.description, updated_at = NOW()`,
    [
      settingKeyForSlug(slug, state),
      JSON.stringify(result.content),
      `Admin-managed ${slug === '/' ? 'welcome' : slug} public page ${state} content`,
    ],
  );
  return { content: result.content };
}
