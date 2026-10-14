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

/* -------------------------------- Errors --------------------------------- */

/** Standard error body returned by the API. */
export interface ApiErrorBody {
  error: string;
  code?: string;
}
