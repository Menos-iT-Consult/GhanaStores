// src/components/seo/SoftwareApplicationSchema.jsx
// JSON-LD SoftwareApplication schema for DiDwa product/landing pages
import { siteUrl } from '../../lib/seo.js';

export default function SoftwareApplicationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    applicationCategory: 'BusinessApplication',
    name: 'DiDwa Digital POS',
    operatingSystem: 'Web, iOS, Android',
    url: siteUrl('/'),
    description: 'Commerce tools for Ghanaian businesses, including an online storefront, Mobile Money payments, inventory management, and point of sale.',
    featureList: [
      'Mobile Money integration',
      'Inventory management',
      'Online store builder',
      'Order tracking',
      'Cedi pricing',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
