// src/components/seo/OrganizationSchema.jsx
// JSON-LD Organization schema for DiDwa homepage

export default function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'DiDwa',
    url: 'https://didwaghana.com',
    logo: 'https://didwaghana.com/logo.png',
    sameAs: [
      'https://twitter.com/didwaapp',
      'https://linkedin.com/company/didwaapp',
      'https://instagram.com/didwaapp',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+233596218018',
      contactType: 'customer service',
      areaServed: 'GH',
      availableLanguage: ['en', 'tw', 'ga', 'ee'],
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'PU-Sowutuom, Accra, Ghana',
      addressLocality: 'Accra',
      addressRegion: 'Greater Accra',
      postalCode: '00233',
      addressCountry: 'GH',
    },
    foundingDate: '2026',
    founder: {
      '@type': 'Person',
      name: 'Matthew Essoun Minnah',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
