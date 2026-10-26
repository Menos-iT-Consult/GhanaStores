// src/components/seo/SoftwareApplicationSchema.jsx
// JSON-LD SoftwareApplication schema for DiDwa product/landing pages

export default function SoftwareApplicationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    applicationCategory: 'E-commerce',
    name: 'DiDwa Digital POS',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GHS',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '42',
    },
    screenshot: 'https://didwaghana.com/dashboard-preview.png',
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
