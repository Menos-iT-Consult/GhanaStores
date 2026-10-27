/**
 * Shared types mirroring the DiDwa mobile API contract
 * (routes/mobileAuthRoutes.js, routes/mobileRoutes.js, routes/storePayments.js).
 */

export type Role = 'SELLER';

export interface MobileUser {
  userId: string;
  storeId: string;
  role: Role;
}

export interface StoreMeta {
  id: string;
  name: string;
  email: string;
  subdomainSlug: string;
  status: string;
  plan: string;
  currency: string;
}

export interface Session {
  token: string;
  refreshToken: string;
  expiresIn: string;
  refreshExpiresIn?: string;
  user: MobileUser;
  store: StoreMeta;
}

/** POST /api/mobile/auth/login returns this when the account has 2FA enabled. */
export interface TwoFactorChallenge {
  twoFactorRequired: true;
  challenge: string;
}

export type LoginResult = Session | TwoFactorChallenge;

export function isTwoFactorChallenge(r: LoginResult): r is TwoFactorChallenge {
  return (r as TwoFactorChallenge).twoFactorRequired === true;
}

/* ------------------------------- Orders ---------------------------------- */

export type OrderStatus = 'PENDING' | 'PAID' | 'FULFILLED' | 'DELIVERED' | 'CANCELLED';

/** Mobile order-tab vocabulary -> maps to canonical statuses server-side. */
export type OrderFilter = 'all' | 'pending' | 'dispatched' | 'completed';

export interface OrderCustomer {
  name: string;
  phone: string;
  address: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: OrderCustomer;
  totalAmount: number;
  paymentMethod: string;
  orderStatus: string;
  paymentStatus: string;
  status: OrderStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersPage {
  orders: Order[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/* ------------------------------ Dashboard -------------------------------- */

export interface DashboardStats {
  todayRevenue: number;
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  currency: string;
}

/* ------------------------------- Products -------------------------------- */

export interface ProductVariant {
  id: string;
  optionName: string;
  optionValue: string;
  priceOverride: number | null;
  stockQuantity: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  price: number;
  isActive: boolean;
  variants: ProductVariant[];
}

/* --------------------------- Payment settings ---------------------------- */

export interface PaymentSettings {
  configured: boolean;
  enableCod: boolean;
  activeGateway: string;
  paystack: {
    configured: boolean;
    publicKey: string;
    secretKeyMasked: string | null;
  };
  hubtel: {
    configured: boolean;
    clientId: string;
    clientSecretMasked: string | null;
    merchantAccountId: string;
  };
  availableMethods: string[];
}

export interface PaymentKeysPayload {
  paystackPublicKey?: string;
  paystackSecretKey?: string;
  hubtelClientId?: string;
  hubtelClientSecret?: string;
  hubtelMerchantAccountId?: string;
  enableCod: boolean;
  activeGateway: string;
}

/* ============================ v1.1 (command center) ======================== */

/* ------------------------------- Dashboard -------------------------------- */

/** One point of the 6-month zero-filled monthly revenue trend. */
export interface MonthlyTrendPoint {
  month: string;
  revenue: number;
  orders: number;
}

export interface DashboardRecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  channel: string;
  paymentMethod: string;
  status: string;
  total: number;
  pointsEarned: number;
  createdAt: string;
}

/** GET /api/mobile/v1/dashboard/full — same payload as the PWA dashboard. */
export interface DashboardFull {
  kpis: {
    totalRevenue: number;
    paidOrders: number;
    averageOrderValue: number;
    todayRevenue: number;
    weekRevenue: number;
    pointsIssued: number;
  };
  monthlyTrend: MonthlyTrendPoint[];
  recentOrders: DashboardRecentOrder[];
  operations: {
    pendingOrderCount: number;
    lowStockCount: number;
    loyaltyMembers: number;
    outstandingPoints: number;
    transitCash: number;
  };
  currency: string;
}

export interface TopProduct {
  name: string;
  unitsSold: number;
  revenue: number;
}

/** GET /api/mobile/v1/analytics/top */
export interface TopProductsPayload {
  products: TopProduct[];
}

/* ----------------------------- Notifications ------------------------------- */

/** One row of GET /api/mobile/v1/notifications (server-backed push history). */
export interface MerchantNotification {
  id: string;
  title: string;
  body: string;
  /** Payload type (order_created, low_stock, plan_past_due, …) or null. */
  type: string | null;
  /** Deep-link payload the push carried ({ type, orderId, … }). */
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

/** GET /api/mobile/v1/notifications page envelope. */
export interface NotificationsPage {
  notifications: MerchantNotification[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  unread: number;
}

/* ---------------------------- Orders: detail ------------------------------ */

/** GET /api/mobile/v1/orders/:id — the slim order plus its line items. */
export interface OrderDetail {
  order: Order;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  productName: string;
  variantLabel: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

/* ---------------------------------- POS ----------------------------------- */

export interface PosSaleItem {
  variantId: string;
  quantity: number;
}

/** POST /api/mobile/v1/pos/sales body (saleId = offline idempotency key). */
export interface PosSalePayload {
  saleId: string;
  items: PosSaleItem[];
  paymentMethod: 'CASH' | 'MOMO';
  momoNetwork?: 'MTN' | 'VODAFONE' | 'AT';
  customerPhone?: string;
  customerName?: string;
  redeemPoints?: number;
  notes?: string;
}

/** Order summary returned by the POS engine (fresh sale OR idempotent replay). */
export interface PosSaleOrder {
  id: string;
  order_number: string;
  total: number;
  subtotal: number;
  discount: number;
  discount_amount?: number;
  paymentMethod?: string;
  momoRef?: string | null;
  momoProvider?: string | null;
  pointsEarned: number;
  pointsRedeemed: number;
}

export interface PosSaleResult {
  message: string;
  order: PosSaleOrder;
}

/** GET /api/mobile/v1/pos/loyalty/:phone */
export interface LoyaltyCustomer {
  id: string;
  name: string | null;
  phone: string;
  loyalty_points: number;
  total_spent: number;
  orders_count: number;
  redeemableValueGhs: number;
}

export interface LoyaltyLookup {
  customer: LoyaltyCustomer | null;
  pointValueGhs: number;
}

/* -------------------------------- Customers -------------------------------- */

/** GET /api/mobile/v1/customers — loyalty book row. */
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyaltyPoints: number;
  totalSpent: number;
  ordersCount: number;
  lastOrderAt: string | null;
  createdAt: string;
}

export interface CustomersPage {
  customers: Customer[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/* ------------------------------- Catalog write ----------------------------- */

export interface ProductVariantInput {
  optionName?: string;
  optionValue?: string;
  sku?: string;
  priceOverride?: number | null;
  stockQuantity?: number;
  lowStockThreshold?: number;
}

/** POST/PUT /api/mobile/v1/products body. */
export interface ProductUpsertPayload {
  name?: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  imageKey?: string;
  price?: number;
  isActive?: boolean;
  variants?: ProductVariantInput[];
}

export interface ProductUpsertResult {
  message: string;
  product: { id: string; name: string; [k: string]: unknown };
}

/* ------------------------------ Image upload ------------------------------- */

/** POST /api/mobile/v1/uploads/presign */
export interface PresignResult {
  key: string;
  uploadUrl: string;
  contentType: string;
  maxBytes: number;
  hint: string;
}

/** POST /api/mobile/v1/uploads/confirm */
export interface ConfirmResult {
  kind: string;
  key: string;
  url: string;
  rawUrl: string;
  staged?: boolean;
  product?: { id: string; name: string; imageKey: string | null; imageUrl: string | null };
}

/* ----------------------------- Offline POS outbox -------------------------- */

/**
 * Local-only record of a POS sale taken offline. `saleId` is sent as the
 * server's idempotencyKey, so a replay after connectivity returns can never
 * double-record the sale.
 */
export interface PosOutboxEntry {
  saleId: string;
  createdAt: string;
  payload: Omit<PosSalePayload, 'saleId'>;
  status: 'pending' | 'failed';
  error?: string;
}

/* -------------------------------- Errors --------------------------------- */

/** Standard error body returned by the API. */
export interface ApiErrorBody {
  error: string;
  code?: string;
}
