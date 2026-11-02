import {
  AI_ACTION_BY_ID,
  AI_SUPPORT_FALLBACK,
  isSupportedOrderText,
} from '../config/didwaAiActions.js';
import { query } from '../config/database.js';
import { getManagedPayoutSummary, requestManagedPayout } from './managedPayoutService.js';

export const GHANA_REGIONS = Object.freeze([
  'Ahafo',
  'Ashanti',
  'Bono East',
  'Bono',
  'Central',
  'Eastern',
  'Greater Accra',
  'North East',
  'Northern',
  'Oti',
  'Savannah',
  'Upper East',
  'Upper West',
  'Volta',
  'Western North',
  'Western',
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONEY_PATTERN = /(?:GHS|GH₵|GH¢|GHC|₵)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:GHS|GH₵|GH¢|GHC|₵)/i;
const ITEM_LABEL_PATTERN = /\b(?:customer|name|phone|mobile|total|amount|delivery|deliver|address|location|region|payment|order)\b/i;

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, allowedKeys) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function redactPhoneNumbers(value) {
  return value.replace(/(?:\+233|00233|0)(?:[\s().-]*\d){9}/g, '').trim();
}

function cleanTemplateField(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function validateAiActionRequest(body) {
  if (!isPlainObject(body) || !hasExactKeys(body, ['action', 'payload'])) {
    return { error: AI_SUPPORT_FALLBACK };
  }

  const action = AI_ACTION_BY_ID.get(body.action);
  if (!action) return { error: AI_SUPPORT_FALLBACK };

  const payload = body.payload === undefined ? {} : body.payload;
  if (!isPlainObject(payload)) return { error: AI_SUPPORT_FALLBACK };

  const schema = action.payloadSchema;
  const allowedKeys = Object.keys(schema.properties);
  if (!hasExactKeys(payload, allowedKeys)) return { error: AI_SUPPORT_FALLBACK };

  for (const [key, property] of Object.entries(schema.properties)) {
    const value = payload[key];
    if (value === undefined) {
      if (property.required) return { error: AI_SUPPORT_FALLBACK };
      continue;
    }

    if (property.type === 'string') {
      if (typeof value !== 'string') return { error: AI_SUPPORT_FALLBACK };
      const trimmed = value.trim();
      if (property.required && trimmed.length < property.minLength) {
        return { error: AI_SUPPORT_FALLBACK };
      }
      if (trimmed.length > property.maxLength) return { error: AI_SUPPORT_FALLBACK };
      if (property.format === 'uuid' && !UUID_PATTERN.test(trimmed)) {
        return { error: AI_SUPPORT_FALLBACK };
      }
    } else if (property.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)
          || value < property.minimum || value > property.maximum
          || Math.abs(value * 100 - Math.round(value * 100)) > 0.00001) {
        return { error: AI_SUPPORT_FALLBACK };
      }
    }
  }

  return { action: action.id, payload };
}

function parseCustomerName(text) {
  const match = text.match(/(?:customer\s+name|customer|name)\s*[:=-]\s*([^\n,;]+)/i);
  const name = match?.[1]?.replace(/\b(?:phone|mobile|whatsapp)\s*[:=-].*$/i, '');
  return name ? redactPhoneNumbers(name).slice(0, 120) || null : null;
}

function parseDeliveryLocation(text) {
  const match = text.match(/(?:delivery\s*(?:location|address)?|deliver\s+to|address|location)\s*[:=-]\s*([^\n;]+)/i);
  const location = match?.[1]?.replace(/\b(?:phone|mobile|whatsapp)\s*[:=-].*$/i, '');
  return location
    ? redactPhoneNumbers(location).replace(/[,.]+$/, '').slice(0, 240) || null
    : null;
}

function parseOrderItems(text) {
  const items = [];
  const segments = text.split(/[\n,;]+|\s+and\s+(?=\d{1,3}\s*(?:x|×)?\s)/i);

  for (const segment of segments) {
    const line = segment.trim().replace(/^[\s>*-]+/, '');
    if (!line || ITEM_LABEL_PATTERN.test(line)) continue;

    let match = line.match(/^(\d{1,3})\s*(?:x|×)\s*(.+)$/i);
    let quantity;
    let name;

    if (match) {
      quantity = Number(match[1]);
      name = match[2];
    } else {
      match = line.match(/^.*?\b(\d{1,3})\s*(?:x|×)\s*(.+)$/i);
      if (match) {
        quantity = Number(match[1]);
        name = match[2];
      } else {
        match = line.match(/^(.+?)\s*(?:x|×)\s*(\d{1,3})$/i);
      }
      if (match) {
        if (quantity === undefined) {
          name = match[1];
          quantity = Number(match[2]);
        }
      } else {
        match = line.match(/^(\d{1,3})\s+(.+)$/);
        if (match) {
          quantity = Number(match[1]);
          name = match[2];
        } else {
          match = line.match(/^.*?\b(\d{1,3})\s+(.+)$/);
          if (!match) continue;
          quantity = Number(match[1]);
          name = match[2];
        }
      }
    }

    name = name
      .replace(/\s+(?:at|for)\s+(?:GHS|GH₵|GH¢|GHC|₵)?\s*[\d,]+(?:\.\d{1,2})?.*$/i, '')
      .replace(/\s*(?:GHS|GH₵|GH¢|GHC|₵)\s*[\d,]+(?:\.\d{1,2})?/gi, '')
      .replace(/[.!?]+$/, '')
      .trim()
      .slice(0, 120);
    if (/[a-z]/i.test(name) && quantity > 0 && quantity <= 999) items.push({ name, quantity });
    if (items.length >= 30) break;
  }

  return items;
}

function parseOrderTotal(text) {
  const totalLine = text.match(
    /(?:grand\s+total|order\s+total|total|amount\s+due)[ \t]*(?::|=|-|\bis\b)?[ \t]*([^\r\n]+)/i,
  );
  const match = totalLine?.[1]?.match(MONEY_PATTERN);
  if (!match) return null;
  const amount = Number((match[1] || match[2]).replace(/,/g, ''));
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

function parseGhanaRegion(text) {
  const lower = text.toLocaleLowerCase('en-GH');
  return [...GHANA_REGIONS]
    .sort((a, b) => b.length - a.length)
    .find((region) => new RegExp(`(^|[^a-z])${region.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').toLowerCase()}(?=$|[^a-z])`, 'i').test(lower))
    || null;
}

export function parseWhatsAppOrder(text) {
  if (!isSupportedOrderText(text)) return null;

  const customerName = parseCustomerName(text);
  const items = parseOrderItems(text);
  const deliveryLocation = parseDeliveryLocation(text);
  const deliveryRegion = parseGhanaRegion(text);
  const totalGhs = parseOrderTotal(text);
  if (!customerName && items.length === 0 && !deliveryLocation && totalGhs === null) {
    return null;
  }
  const reviewNotes = [];

  if (items.length === 0) reviewNotes.push('No item quantities were confidently identified. Check the original message.');
  if (!deliveryRegion) reviewNotes.push('No Ghanaian delivery region was identified.');
  if (totalGhs === null) reviewNotes.push('No GHS total was identified.');

  return {
    customerName,
    items,
    deliveryLocation,
    deliveryRegion,
    totalGhs,
    currency: 'GHS',
    needsReview: reviewNotes.length > 0,
    reviewNotes,
  };
}

function formatGhs(value) {
  return `GH₵${Number(value).toFixed(2)}`;
}

export function generateProductCopy(product, storeName) {
  const name = cleanTemplateField(product.name, 120);
  const category = cleanTemplateField(product.category, 80);
  const description = cleanTemplateField(product.description, 500);
  const price = formatGhs(Number(product.price));
  const productDescription = description ? ` ${description}` : '';
  const store = cleanTemplateField(storeName || 'your DiDwa store', 120);

  return {
    productName: name,
    category,
    priceGhs: Number(product.price),
    currency: 'GHS',
    professionalEnglish: `${name}.${productDescription} Price: ${price}. Available from ${store}.`,
    professionalCaption: `Shop ${name} for ${price}.${productDescription} Order from ${store}.`,
    ghanaianPidgin: `${name} dey available for ${price}. Send your order to ${store}.`,
    generation: 'system-template',
  };
}

async function getProductCopy(productId, store) {
  const { rows } = await query(
    `SELECT id, name, description, category, price
       FROM products
      WHERE id = $1 AND store_id = $2 AND is_active = TRUE
      LIMIT 1`,
    [productId, store.id],
  );
  if (!rows[0]) return { error: 'That active product could not be found in your store.', statusCode: 404 };
  return { result: generateProductCopy(rows[0], store.name) };
}

export async function listAiProducts(storeId, { includeDescriptions = false } = {}) {
  const descriptionColumn = includeDescriptions
    ? "LEFT(COALESCE(description, ''), 600)"
    : "''::text";
  const { rows } = await query(
    `SELECT id, name, category, price, ${descriptionColumn} AS description
       FROM products
      WHERE store_id = $1 AND is_active = TRUE
      ORDER BY created_at DESC
      LIMIT $2`,
    [storeId, includeDescriptions ? 40 : 200],
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category || 'General',
    ...(includeDescriptions ? { description: row.description || '' } : {}),
    price: Number(row.price),
  }));
}

export async function getInventoryInsights(storeId) {
  const [summaryResult, lowStockResult] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS variant_count,
              COUNT(*) FILTER (WHERE v.stock_quantity <= v.low_stock_threshold)::int AS low_stock_count,
              COALESCE(SUM(v.stock_quantity), 0)::int AS units_in_stock,
              COALESCE(SUM(v.stock_quantity * COALESCE(v.price_override, p.price)), 0)::numeric(14,2)
                AS stock_value_ghs
         FROM product_variants v
         JOIN products p ON p.id = v.product_id AND p.store_id = v.store_id
        WHERE v.store_id = $1 AND p.is_active = TRUE`,
      [storeId],
    ),
    query(
      `SELECT p.name AS product_name, v.option_name, v.option_value,
              v.stock_quantity, v.low_stock_threshold,
              COALESCE(v.price_override, p.price) AS unit_price
         FROM product_variants v
         JOIN products p ON p.id = v.product_id AND p.store_id = v.store_id
        WHERE v.store_id = $1 AND p.is_active = TRUE
          AND v.stock_quantity <= v.low_stock_threshold
        ORDER BY (v.low_stock_threshold - v.stock_quantity) DESC,
                 v.stock_quantity ASC, p.name ASC
        LIMIT 10`,
      [storeId],
    ),
  ]);
  const summary = summaryResult.rows[0] || {};
  return {
    type: 'inventory',
    variantCount: Number(summary.variant_count || 0),
    lowStockCount: Number(summary.low_stock_count || 0),
    unitsInStock: Number(summary.units_in_stock || 0),
    stockValueGhs: Number(summary.stock_value_ghs || 0),
    lowStockItems: lowStockResult.rows.map((row) => ({
      productName: row.product_name,
      variant: [row.option_name, row.option_value].filter(Boolean).join(': '),
      quantity: Number(row.stock_quantity),
      reorderLevel: Number(row.low_stock_threshold),
      unitPriceGhs: Number(row.unit_price),
    })),
    currency: 'GHS',
  };
}

export async function getSalesSummary(storeId) {
  const [summaryResult, productResult, trendResult] = await Promise.all([
    query(
      `SELECT
         COALESCE(SUM(total) FILTER (
           WHERE status IN ('PAID','FULFILLED','DELIVERED')
             AND created_at >= NOW() - INTERVAL '7 days'), 0)::numeric(14,2) AS last_7_days_ghs,
         COALESCE(SUM(total) FILTER (
           WHERE status IN ('PAID','FULFILLED','DELIVERED')
             AND created_at >= NOW() - INTERVAL '14 days'
             AND created_at < NOW() - INTERVAL '7 days'), 0)::numeric(14,2) AS previous_7_days_ghs,
         COALESCE(SUM(total) FILTER (
           WHERE status IN ('PAID','FULFILLED','DELIVERED')
             AND created_at >= NOW() - INTERVAL '30 days'), 0)::numeric(14,2) AS last_30_days_ghs,
         COUNT(*) FILTER (
           WHERE status IN ('PAID','FULFILLED','DELIVERED')
             AND created_at >= NOW() - INTERVAL '30 days')::int AS paid_orders_30_days
       FROM orders WHERE store_id = $1`,
      [storeId],
    ),
    query(
      `SELECT oi.product_name,
              COALESCE(oi.variant_label, '') AS variant_label,
              SUM(oi.quantity)::int AS units_sold,
              SUM(oi.line_total)::numeric(14,2) AS revenue_ghs
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id AND o.store_id = oi.store_id
        WHERE oi.store_id = $1
          AND o.status IN ('PAID','FULFILLED','DELIVERED')
          AND o.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY oi.product_name, oi.variant_label
        ORDER BY revenue_ghs DESC
        LIMIT 5`,
      [storeId],
    ),
    query(
      `SELECT to_char(day, 'Dy') AS day,
              COALESCE(SUM(o.total) FILTER (
                WHERE o.status IN ('PAID','FULFILLED','DELIVERED')), 0)::numeric(14,2) AS revenue_ghs
         FROM generate_series(
                date_trunc('day', NOW()) - INTERVAL '6 days',
                date_trunc('day', NOW()),
                INTERVAL '1 day') AS days(day)
         LEFT JOIN orders o ON o.store_id = $1
                           AND o.created_at >= day
                           AND o.created_at < day + INTERVAL '1 day'
        GROUP BY day
        ORDER BY day`,
      [storeId],
    ),
  ]);
  const summary = summaryResult.rows[0] || {};
  const last7DaysGhs = Number(summary.last_7_days_ghs || 0);
  const previous7DaysGhs = Number(summary.previous_7_days_ghs || 0);
  return {
    type: 'sales',
    last7DaysGhs,
    previous7DaysGhs,
    changePercent: previous7DaysGhs > 0
      ? Math.round(((last7DaysGhs - previous7DaysGhs) / previous7DaysGhs) * 1000) / 10
      : null,
    last30DaysGhs: Number(summary.last_30_days_ghs || 0),
    paidOrders30Days: Number(summary.paid_orders_30_days || 0),
    averageOrderValue30Days: Number(summary.paid_orders_30_days) > 0
      ? Math.round((Number(summary.last_30_days_ghs || 0) / Number(summary.paid_orders_30_days)) * 100) / 100
      : 0,
    dailyTrend: trendResult.rows.map((row) => ({
      day: row.day,
      revenueGhs: Number(row.revenue_ghs || 0),
    })),
    topProducts: productResult.rows.map((row) => ({
      name: row.variant_label ? `${row.product_name} (${row.variant_label})` : row.product_name,
      unitsSold: Number(row.units_sold || 0),
      revenueGhs: Number(row.revenue_ghs || 0),
    })),
    currency: 'GHS',
  };
}

export async function getOrderSummary(storeId) {
  const { rows } = await query(
    `SELECT status, COUNT(*)::int AS order_count,
            COALESCE(SUM(total), 0)::numeric(14,2) AS total_ghs,
            COUNT(*) FILTER (
              WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '48 hours')::int
              AS pending_over_48_hours
       FROM orders
      WHERE store_id = $1
      GROUP BY status`,
    [storeId],
  );
  const statuses = ['PENDING', 'PAID', 'FULFILLED', 'DELIVERED', 'CANCELLED'];
  const byStatus = statuses.map((status) => {
    const row = rows.find((item) => item.status === status);
    return {
      status,
      count: Number(row?.order_count || 0),
      totalGhs: Number(row?.total_ghs || 0),
    };
  });
  return {
    type: 'orders',
    totalOrders: byStatus.reduce((total, item) => total + item.count, 0),
    pendingOver48Hours: Number(rows.find((row) => row.status === 'PENDING')?.pending_over_48_hours || 0),
    byStatus,
    currency: 'GHS',
  };
}

export async function executeAiAction(action, payload, store) {
  switch (action) {
    case '[PARSE_WHATSAPP_ORDER]': {
      const result = parseWhatsAppOrder(payload.text);
      return result
        ? { result }
        : { error: AI_SUPPORT_FALLBACK, statusCode: 400, supportFallback: true };
    }
    case '[GENERATE_PRODUCT_COPY]':
      return getProductCopy(payload.productId, store);
    case '[CHECK_MOMO_BALANCE]': {
      const summary = await getManagedPayoutSummary(store.id);
      return {
        result: {
          ...summary.balance,
          managedPaymentsEnabled: summary.payout.managedMode,
          platformFeePercent: summary.platformFeePercent,
          currency: 'GHS',
          supportedWallets: ['MTN MoMo', 'Telecel Cash', 'AT Money'],
        },
      };
    }
    case '[REQUEST_PAYOUT]': {
      const payout = await requestManagedPayout(store.id, payload.amountGhs);
      if (payout.error) return payout;
      return {
        result: {
          request: payout.request,
          availableGhs: payout.availableGhs,
          message: 'Payout request submitted for manual review.',
        },
      };
    }
    case '[INVENTORY_INSIGHTS]':
      return { result: await getInventoryInsights(store.id) };
    case '[SALES_SUMMARY]':
      return { result: await getSalesSummary(store.id) };
    case '[ORDER_SUMMARY]':
      return { result: await getOrderSummary(store.id) };
    default:
      return { error: AI_SUPPORT_FALLBACK, statusCode: 400, supportFallback: true };
  }
}
