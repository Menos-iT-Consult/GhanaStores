const NEWSLETTER_TOKEN = /\{\{\s*(name|store)\s*\}\}/gi;

export function personalizeNewsletterContent(content, customer = {}) {
  const values = {
    name: String(customer.name || '').trim() || 'there',
    store: String(customer.store_name || '').trim() || 'our store',
  };
  return String(content || '').replace(NEWSLETTER_TOKEN, (_match, token) => (
    values[token.toLowerCase()]
  ));
}
