/**
 * DiDwa - Domain catalogue (which TLDs exist, and the default seed).
 *
 * Curated TLDs are what a seller sees by default; the extended list is searched
 * only when an administrator flips "include all TLDs". That keeps the default
 * search fast and cheap while making the full catalogue one click away.
 */

/** Offered by default, ordered so the strongest options appear first. */
export const CURATED_TLDS = [
  'com', 'co.za', 'africa', 'online', 'shop', 'store', 'co', 'io', 'net', 'org',
  'com.gh', 'org.gh', 'app', 'tech', 'site', 'digital', 'space', 'live', 'world', 'today',
  'gg', 'pro', 'design', 'studio', 'biz', 'info', 'blog', 'news', 'social', 'link',
  'click', 'email', 'cloud', 'host', 'page', 'name', 'art', 'food', 'cafe', 'fashion',
];

/** Known but not searched by default; reachable with the "all TLDs" toggle. */
export const EXTENDED_TLDS = [
  'academy', 'accountant', 'accountants', 'actor', 'agency', 'airforce', 'amsterdam',
  'apartments', 'archi', 'army', 'associates', 'attorney', 'auction', 'audio', 'auto',
  'baby', 'band', 'bank', 'bar', 'bargains', 'beer', 'berlin', 'best', 'bet', 'bid',
  'bike', 'bio', 'black', 'boutique', 'box', 'bridge', 'build', 'builders', 'business',
  'buzz', 'cab', 'camera', 'camp', 'capital', 'car', 'cards', 'care', 'career', 'careers',
  'cash', 'casino', 'catering', 'center', 'ceo', 'charity', 'chat', 'cheap', 'church',
  'city', 'claims', 'cleaning', 'clinic', 'clothing', 'club', 'coach', 'codes', 'coffee',
  'college', 'community', 'company', 'computer', 'condos', 'construction', 'consulting',
  'contractors', 'cooking', 'cool', 'country', 'coupons', 'credit', 'cricket', 'cruises',
  'dance', 'date', 'dating', 'deals', 'degree', 'delivery', 'dental', 'dev', 'diamonds',
  'direct', 'directory', 'discount', 'doctor', 'dog', 'domains', 'download', 'eco',
  'earth', 'education', 'energy', 'engineer', 'engineering', 'enterprises', 'equipment',
  'estate', 'events', 'exchange', 'expert', 'exposed', 'express', 'fail', 'faith',
  'family', 'fan', 'farm', 'film', 'finance', 'financial', 'fish', 'fishing', 'fit',
  'fitness', 'flights', 'florist', 'flowers', 'football', 'forsale', 'foundation', 'fund',
  'furniture', 'futbol', 'fyi', 'gallery', 'game', 'games', 'garden', 'gift', 'gifts',
  'gives', 'glass', 'global', 'gold', 'golf', 'graphics', 'green', 'group', 'guide',
  'guru', 'health', 'help', 'hiphop', 'hockey', 'holdings', 'holiday', 'house', 'how',
  'icu', 'immo', 'industries', 'ink', 'institute', 'insurance', 'international',
  'investments', 'irish', 'jewelry', 'juegos', 'kim', 'kitchen', 'land', 'law', 'lawyer',
  'lease', 'legal', 'lighting', 'limited', 'limo', 'loan', 'loans', 'lol', 'love', 'ltda',
  'luxury', 'management', 'market', 'marketing', 'mba', 'media', 'memorial', 'menu',
  'moda', 'money', 'monster', 'mortgage', 'movie', 'music', 'ninja', 'observer', 'one',
  'ooo', 'organic', 'partners', 'parts', 'party', 'pet', 'photo', 'photography', 'pics',
  'pictures', 'pink', 'pizza', 'place', 'plumbing', 'plus', 'poker', 'press',
  'productions', 'properties', 'property', 'pub', 'racing', 'realty', 'recipes', 'rehab',
  'rent', 'rentals', 'repair', 'report', 'rest', 'restaurant', 'review', 'reviews',
  'rich', 'rip', 'rocks', 'rodeo', 'run', 'sale', 'salon', 'sarl', 'school', 'schule',
  'science', 'services', 'shoes', 'shopping', 'show', 'singles', 'ski', 'soccer',
  'software', 'solar', 'solutions', 'sport', 'stream', 'study', 'style', 'supplies',
  'supply', 'support', 'surf', 'surgery', 'systems', 'tattoo', 'tax', 'taxi', 'team',
  'technology', 'tennis', 'theater', 'tickets', 'tips', 'tires', 'tools', 'tours', 'town',
  'toys', 'trade', 'trading', 'training', 'tube', 'university', 'vacations', 'vegas',
  'ventures', 'vet', 'viajes', 'video', 'villas', 'vin', 'vip', 'vision', 'vodka', 'vote',
  'voting', 'voyage', 'watch', 'webcam', 'website', 'wedding', 'wiki', 'win', 'wine',
  'work', 'works', 'wtf', 'xyz', 'yoga', 'zone',
];

/**
 * The seed rows. `wholesale_ghs` is deliberately left NULL for every TLD: the
 * platform does not know the provider's cost until it searches, so a cached
 * cost is written back only once a search has actually seen one. Prices
 * therefore start as "provider price + markup", which is the honest default.
 */
export function buildDomainPricingRows() {
  const rows = [];
  CURATED_TLDS.forEach((tld, index) => {
    rows.push({ tld, label: null, isCurated: true, sortOrder: index + 1 });
  });
  EXTENDED_TLDS.forEach((tld, index) => {
    // Deduplicate: a TLD present in both arrays stays curated.
    if (rows.some((row) => row.tld === tld)) return;
    rows.push({ tld, label: null, isCurated: false, sortOrder: 500 + index });
  });
  return rows;
}

const PRICING_UPSERT_SQL = `
  INSERT INTO domain_pricing (tld, label, is_curated, sort_order)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (tld) DO NOTHING
`;

/**
 * Insert any TLD that is missing. Existing rows are NEVER updated, so an
 * administrator's price, markup and enable/disable choices survive every
 * deploy - only newly listed TLDs are added.
 *
 * @param {(sql: string, params?: any[]) => Promise<any>} exec
 * @returns {Promise<{seeded: number, total: number}>}
 */
export async function seedDomainPricing(exec) {
  const rows = buildDomainPricingRows();
  for (const row of rows) {
    await exec(PRICING_UPSERT_SQL, [row.tld, row.label, row.isCurated, row.sortOrder]);
  }
  // The settings row must exist even if a deployment predates this table.
  await exec('INSERT INTO domain_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING');
  return { seeded: rows.length, total: rows.length };
}
