export const EMAIL_NEWSLETTER_TEMPLATES = [
  {
    id: 'welcome',
    label: 'Welcome',
    subject: 'A warm welcome from {{store}}',
    message: 'Hi {{name}},\n\nWelcome to {{store}}. We are glad you are here. Visit our storefront to explore our products, and contact us if you need help.\n\nThe {{store}} team',
  },
  {
    id: 'new-arrivals',
    label: 'New arrivals',
    subject: 'New arrivals at {{store}}',
    message: 'Hi {{name}},\n\nWe have new arrivals at {{store}}: [add product names or category]. Take a look at our storefront to see what is available.\n\nThe {{store}} team',
  },
  {
    id: 'special-offer',
    label: 'Special offer',
    subject: 'An update from {{store}}',
    message: 'Hi {{name}},\n\nWe have an offer for you: [add the confirmed offer details and end date]. Please review any terms before ordering.\n\nVisit our storefront or contact us if you have questions.\n\nThe {{store}} team',
  },
  {
    id: 'back-in-stock',
    label: 'Back in stock',
    subject: 'A product is back at {{store}}',
    message: 'Hi {{name}},\n\n[Add the product name] is back in stock at {{store}}. Stock can change, so visit our storefront to check current availability.\n\nThe {{store}} team',
  },
  {
    id: 'thank-you',
    label: 'Thank you',
    subject: 'Thank you from {{store}}',
    message: 'Hi {{name}},\n\nThank you for supporting {{store}}. We appreciate your business. If you have a question about an order, please contact us directly.\n\nThe {{store}} team',
  },
  {
    id: 'store-update',
    label: 'Store update',
    subject: 'An update from {{store}}',
    message: 'Hi {{name}},\n\nA quick update from {{store}}: [add your confirmed store news, dates, or service information].\n\nVisit our storefront or contact us if you need more information.\n\nThe {{store}} team',
  },
];

export const SMS_NEWSLETTER_TEMPLATES = [
  {
    id: 'welcome',
    label: 'Welcome',
    message: 'Hi {{name}}, welcome to {{store}}. Visit our storefront to explore our products. Contact us if you need help. - {{store}}',
  },
  {
    id: 'new-arrivals',
    label: 'New arrivals',
    message: 'Hi {{name}}, new arrivals at {{store}}: [add product names or category]. Visit our storefront to see what is available. - {{store}}',
  },
  {
    id: 'special-offer',
    label: 'Special offer',
    message: 'Hi {{name}}, {{store}} has an offer: [add confirmed offer details and end date]. Please check any terms before ordering. - {{store}}',
  },
  {
    id: 'back-in-stock',
    label: 'Back in stock',
    message: 'Hi {{name}}, [add product name] is back in stock at {{store}}. Check current availability on our storefront. - {{store}}',
  },
  {
    id: 'thank-you',
    label: 'Thank you',
    message: 'Hi {{name}}, thank you for supporting {{store}}. We appreciate your business. Contact us if you have an order question. - {{store}}',
  },
  {
    id: 'store-update',
    label: 'Store update',
    message: 'Hi {{name}}, an update from {{store}}: [add confirmed store news or service information]. Contact us with questions. - {{store}}',
  },
];
