import { getPlatformPublicSettings } from './platformPublicSettings.js';
import { getManagedPayoutContext } from './managedPayoutService.js';
import {
  GHANA_REGIONS,
  getInventoryInsights,
  getOrderSummary,
  getSalesSummary,
  listAiProducts,
} from './didwaAiService.js';

export const MAX_AI_CONTEXT_BYTES = 16 * 1024;
const MAX_PRODUCTS = 30;
const MAX_PRODUCT_DESCRIPTION_LENGTH = 400;
const PHONE_PATTERN = /(?:\+233|00233|0)(?:[\s().-]*\d){9}/g;
const SUPPORTED_MOMO_WALLETS = Object.freeze(['MTN MoMo', 'Telecel Cash', 'AT Money']);

function safeText(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(PHONE_PATTERN, '[phone removed]')
    .trim()
    .slice(0, maxLength);
}

function boundedText(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function publicContact(contact = {}) {
  return {
    supportEmail: boundedText(contact.supportEmail, 254),
    supportPhone: boundedText(contact.supportPhone, 32),
    whatsappNumber: boundedText(contact.whatsappNumber, 32),
    businessAddress: boundedText(contact.businessAddress, 300),
  };
}

function trimToContextLimit(context) {
  const size = () => Buffer.byteLength(JSON.stringify(context), 'utf8');
  if (size() <= MAX_AI_CONTEXT_BYTES) return context;

  context.truncated = true;
  while (context.catalog.products.length && size() > MAX_AI_CONTEXT_BYTES) {
    context.catalog.products.pop();
  }
  while (context.inventory.lowStockItems.length && size() > MAX_AI_CONTEXT_BYTES) {
    context.inventory.lowStockItems.pop();
  }
  while (context.sales.topProducts.length && size() > MAX_AI_CONTEXT_BYTES) {
    context.sales.topProducts.pop();
  }
  if (size() > MAX_AI_CONTEXT_BYTES) {
    throw new Error('DiDwa AI context exceeded its configured size limit.');
  }
  return context;
}

export async function buildSellerAiContext(store, sources = {}) {
  if (!store?.id) throw new TypeError('An authenticated seller store is required to build DiDwa AI context.');

  const loadProducts = sources.listAiProducts || listAiProducts;
  const loadInventory = sources.getInventoryInsights || getInventoryInsights;
  const loadSales = sources.getSalesSummary || getSalesSummary;
  const loadOrders = sources.getOrderSummary || getOrderSummary;
  const loadPayout = sources.getManagedPayoutContext || getManagedPayoutContext;
  const loadPlatformSettings = sources.getPlatformPublicSettings || getPlatformPublicSettings;

  const [products, inventory, sales, orders, payoutSummary, platformSettings] = await Promise.all([
    loadProducts(store.id, { includeDescriptions: true }),
    loadInventory(store.id),
    loadSales(store.id),
    loadOrders(store.id),
    loadPayout(store.id),
    loadPlatformSettings(),
  ]);
  const balance = payoutSummary?.balance || {};

  const context = {
    schemaVersion: 1,
    store: {
      name: safeText(store.name, 120),
      slug: safeText(store.subdomain_slug, 80),
      currency: safeText(store.currency || 'GHS', 8),
    },
    platform: {
      currency: 'GHS',
      contact: publicContact(platformSettings?.contact),
      deliveryRegions: GHANA_REGIONS,
      supportedMomoWallets: SUPPORTED_MOMO_WALLETS,
      managedPaymentFeePercent: safeNumber(payoutSummary?.platformFeePercent),
      minimumManagedPayoutGhs: safeNumber(payoutSummary?.minimumGhs),
    },
    catalog: {
      products: (Array.isArray(products) ? products : []).slice(0, MAX_PRODUCTS).map((product) => ({
        name: safeText(product.name, 120),
        category: safeText(product.category || 'General', 80),
        description: safeText(product.description, MAX_PRODUCT_DESCRIPTION_LENGTH),
        priceGhs: safeNumber(product.price),
      })),
      truncated: (Array.isArray(products) ? products.length : 0) > MAX_PRODUCTS,
    },
    inventory: {
      variantCount: safeNumber(inventory?.variantCount),
      lowStockCount: safeNumber(inventory?.lowStockCount),
      unitsInStock: safeNumber(inventory?.unitsInStock),
      stockValueGhs: safeNumber(inventory?.stockValueGhs),
      lowStockItems: (Array.isArray(inventory?.lowStockItems) ? inventory.lowStockItems : [])
        .slice(0, 10)
        .map((item) => ({
          productName: safeText(item.productName, 120),
          variant: safeText(item.variant, 80),
          quantity: safeNumber(item.quantity),
          reorderLevel: safeNumber(item.reorderLevel),
        })),
    },
    sales: {
      last7DaysGhs: safeNumber(sales?.last7DaysGhs),
      previous7DaysGhs: safeNumber(sales?.previous7DaysGhs),
      changePercent: sales?.changePercent === null || sales?.changePercent === undefined
        ? null : safeNumber(sales.changePercent),
      last30DaysGhs: safeNumber(sales?.last30DaysGhs),
      paidOrders30Days: safeNumber(sales?.paidOrders30Days),
      averageOrderValue30Days: safeNumber(sales?.averageOrderValue30Days),
      dailyTrend: (Array.isArray(sales?.dailyTrend) ? sales.dailyTrend : []).slice(0, 7).map((day) => ({
        day: safeText(day.day, 12),
        revenueGhs: safeNumber(day.revenueGhs),
      })),
      topProducts: (Array.isArray(sales?.topProducts) ? sales.topProducts : []).slice(0, 5).map((product) => ({
        name: safeText(product.name, 140),
        unitsSold: safeNumber(product.unitsSold),
        revenueGhs: safeNumber(product.revenueGhs),
      })),
    },
    orders: {
      totalOrders: safeNumber(orders?.totalOrders),
      pendingOver48Hours: safeNumber(orders?.pendingOver48Hours),
      byStatus: (Array.isArray(orders?.byStatus) ? orders.byStatus : []).slice(0, 8).map((item) => ({
        status: safeText(item.status, 32),
        count: safeNumber(item.count),
        totalGhs: safeNumber(item.totalGhs),
      })),
    },
    managedPayments: {
      enabled: payoutSummary?.managedMode === true,
      totalSalesGhs: safeNumber(balance.totalSalesGhs),
      platformFeesGhs: safeNumber(balance.platformFeesGhs),
      netPayableGhs: safeNumber(balance.netPayableGhs),
      paidOutGhs: safeNumber(balance.paidOutGhs),
      pendingPayoutGhs: safeNumber(balance.pendingPayoutGhs),
      availableGhs: safeNumber(balance.availableGhs),
    },
  };

  return trimToContextLimit(context);
}
