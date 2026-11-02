export function createAiSupportNotice(contact = {}) {
  const phone = String(contact.whatsappNumber || contact.supportPhone || 'Not configured').trim();
  const email = String(contact.supportEmail || 'Not configured').trim();
  return `⚠️ Direct text queries are not supported. Only suggested options can be processed based on your store details.

For further assistance, please contact DiDwa Support:
📞 WhatsApp / Call: ${phone}
✉️ Email: ${email}`;
}

export const AI_SUPPORT_FALLBACK = createAiSupportNotice();

export function isSupportedOrderText(value) {
  const text = String(value || '').trim();
  if (!text) return false;

  const asksGeneralQuestion = /\b(?:what|why|how|who|when|where|explain|define|capital|weather|tell\s+me)\b/i.test(text);
  const hasOrderContext = /\b(?:my order|order for|place an order|i want|i need|buy|purchase|deliver(?:y)?|customer|items?)\b/i.test(text);
  if (asksGeneralQuestion && !hasOrderContext) return false;

  const hasQuantity = /(?:^|\b)\d{1,3}\s*(?:x|×)\s*[a-z]/im.test(text)
    || /(?:^|\b)\d{1,3}\s+[a-z]/im.test(text)
    || /\b[a-z][a-z0-9\s&/'-]{1,60}\s*(?:x|×)\s*\d{1,3}\b/i.test(text);
  const hasOrderField = /\b(?:customer\s+name|customer|name|delivery(?:\s+(?:location|address))?|deliver\s+to|address|location|(?:grand\s+|order\s+)?total|amount\s+due)\s*[:=-]/i.test(text);
  return hasQuantity || hasOrderField;
}

export const AI_ACTIONS = Object.freeze([
  {
    id: '[PARSE_WHATSAPP_ORDER]',
    label: 'Parse WhatsApp order',
    description: 'Extract order details from a customer message.',
    payloadSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', required: true, minLength: 1, maxLength: 5000 },
      },
      additionalProperties: false,
    },
  },
  {
    id: '[GENERATE_PRODUCT_COPY]',
    label: 'Generate product copy',
    description: 'Create English and Ghanaian Pidgin copy for a store product.',
    payloadSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string', required: true, format: 'uuid' },
      },
      additionalProperties: false,
    },
  },
  {
    id: '[CHECK_MOMO_BALANCE]',
    label: 'Check MoMo balance',
    description: 'Review managed sales, fees, and withdrawable balance.',
    payloadSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    id: '[REQUEST_PAYOUT]',
    label: 'Request MoMo payout',
    description: 'Submit a verified-wallet payout request for manual review.',
    payloadSchema: {
      type: 'object',
      properties: {
        amountGhs: { type: 'number', required: true, minimum: 0.01, maximum: 1000000 },
      },
      additionalProperties: false,
    },
  },
  {
    id: '[INVENTORY_INSIGHTS]',
    label: 'Inventory insights',
    description: 'Review stock levels, stock value, and products to restock first.',
    payloadSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    id: '[SALES_SUMMARY]',
    label: 'Sales summary',
    description: 'See recent sales trends and top-selling products.',
    payloadSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    id: '[ORDER_SUMMARY]',
    label: 'Order summary',
    description: 'Review order statuses and fulfillment backlog without buyer details.',
    payloadSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
]);

export const AI_ACTION_BY_ID = new Map(AI_ACTIONS.map((action) => [action.id, action]));
