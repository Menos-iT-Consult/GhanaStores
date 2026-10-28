import { api } from './client';
import type {
  ConfirmResult,
  CustomersPage,
  DashboardFull,
  DashboardStats,
  DeviceNotificationPreferences,
  LoginResult,
  LoyaltyLookup,
  NotificationsPage,
  Order,
  OrderDetail,
  OrdersPage,
  OrderFilter,
  OrderStatus,
  PaymentKeysPayload,
  PaymentSettings,
  PosSalePayload,
  PosSaleResult,
  PresignResult,
  Product,
  ProductUpsertPayload,
  ProductUpsertResult,
  StoreProfile,
  TopProductsPayload,
} from '@/types';

/**
 * Typed wrappers over the DiDwa mobile API. Every call here is authenticated by
 * the bearer token installed in the axios client (except login/2fa/refresh).
 */

/* --------------------------------- Auth ---------------------------------- */

export function login(email: string, password: string) {
  return api.post<LoginResult>('/api/mobile/auth/login', { email, password }).then((r) => r.data);
}

export function loginTwoFactor(challenge: string, code: string) {
  return api.post<LoginResult>('/api/mobile/auth/login/2fa', { challenge, code }).then((r) => r.data);
}

export function logout(refreshToken: string) {
  return api.post('/api/mobile/auth/logout', { refreshToken }).catch(() => undefined);
}

/* ------------------------------- Dashboard ------------------------------- */

export function getDashboardStats() {
  return api.get<DashboardStats>('/api/mobile/v1/dashboard/stats').then((r) => r.data);
}

/* --------------------------------- Orders -------------------------------- */

export function getOrders(params?: { filter?: OrderFilter; page?: number; limit?: number }) {
  return api
    .get<OrdersPage>('/api/mobile/v1/orders', {
      params: { filter: params?.filter ?? 'all', page: params?.page ?? 1, limit: params?.limit ?? 20 },
    })
    .then((r) => r.data);
}

export function getOrder(id: string) {
  return api.get<OrderDetail>(`/api/mobile/v1/orders/${id}`).then((r) => r.data);
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  return api
    .patch<{ message: string }>(`/api/mobile/v1/orders/${id}/status`, { status })
    .then((r) => r.data);
}

/* -------------------------------- Products ------------------------------- */

export function getProducts() {
  return api.get<{ products: Product[] }>('/api/mobile/v1/products').then((r) => r.data.products);
}

export function toggleProductStock(id: string, isActive: boolean) {
  return api
    .patch<{ product: { id: string; name: string; isActive: boolean } }>(`/api/mobile/v1/products/${id}/stock`, {
      is_active: isActive,
    })
    .then((r) => r.data.product);
}

export function updateProductPrice(id: string, price: number) {
  return api
    .patch<{ product: { id: string; name: string; price: number } }>(`/api/mobile/v1/products/${id}/price`, {
      price,
    })
    .then((r) => r.data.product);
}

/* ---------------------------- Payment settings --------------------------- */

export function getPaymentKeys() {
  return api
    .get<{ settings: PaymentSettings; storageConfigured: boolean }>('/api/mobile/v1/settings/payment-keys')
    .then((r) => r.data);
}

export function savePaymentKeys(payload: PaymentKeysPayload) {
  return api
    .post<{ settings: PaymentSettings }>('/api/mobile/v1/settings/payment-keys', payload)
    .then((r) => r.data.settings);
}

/* ------------------------------- Push devices ---------------------------- */

export function registerDevice(token: string, platform: 'ios' | 'android') {
  return api.post('/api/mobile/devices/register', { token, platform }).then((r) => r.data);
}

export function unregisterDevice(token: string) {
  return api.delete('/api/mobile/devices/unregister', { data: { token } }).then((r) => r.data);
}

export function getDeviceNotificationPreferences(token: string) {
  return api
    .get<{ preferences: DeviceNotificationPreferences }>('/api/mobile/devices/preferences', { params: { token } })
    .then((r) => r.data.preferences);
}

export function saveDeviceNotificationPreferences(token: string, preferences: DeviceNotificationPreferences) {
  return api
    .put<{ preferences: DeviceNotificationPreferences }>('/api/mobile/devices/preferences', { token, preferences })
    .then((r) => r.data.preferences);
}

/* ------------------------------- Notifications ----------------------------- */

/** Server-backed push history for the Notifications screen (newest first). */
export function getNotifications(page = 1, limit = 20) {
  return api
    .get<NotificationsPage>('/api/mobile/v1/notifications', { params: { page, limit } })
    .then((r) => r.data);
}

/** Unread badge for the dashboard bell (cheap single count). */
export function getUnreadNotificationCount() {
  return api.get<{ unread: number }>('/api/mobile/v1/notifications/unread-count').then((r) => r.data);
}

/** Idempotent single read; 404 if the id belongs to another store. */
export function markNotificationRead(id: string) {
  return api
    .post<{ ok: boolean; read: boolean }>(`/api/mobile/v1/notifications/${id}/read`)
    .then((r) => r.data);
}

/** Bulk "mark all as read" for the signed-in store. */
export function markAllNotificationsRead() {
  return api
    .post<{ ok: boolean; updated: number }>('/api/mobile/v1/notifications/read-all')
    .then((r) => r.data);
}

/* ============================ v1.1 (command center) ======================== */

/* ------------------------------- Dashboard -------------------------------- */

/** Full command-center payload: KPIs, 6-month trend, recent orders, ops counters. */
export function getDashboardFull() {
  return api.get<DashboardFull>('/api/mobile/v1/dashboard/full').then((r) => r.data);
}

/** Top sellers by revenue for the dashboard leaderboard. */
export function getTopProducts(limit = 8) {
  return api
    .get<TopProductsPayload>('/api/mobile/v1/analytics/top', { params: { limit } })
    .then((r) => r.data);
}

/* ---------------------------------- POS ----------------------------------- */

/**
 * Ring up (or replay) an in-store sale. The app generates `saleId` per cart;
 * sending the same id again returns the original order instead of recording a
 * duplicate — this is what makes the offline outbox safe to flush.
 */
export function createPosSale(payload: PosSalePayload) {
  return api.post<PosSaleResult>('/api/mobile/v1/pos/sales', payload).then((r) => r.data);
}

/** Loyalty balance + max redeemable value for a (normalized) phone number. */
export function getLoyalty(phone: string) {
  return api.get<LoyaltyLookup>(`/api/mobile/v1/pos/loyalty/${encodeURIComponent(phone)}`).then((r) => r.data);
}

/* -------------------------------- Customers -------------------------------- */

export function getCustomers(params?: { q?: string; page?: number; limit?: number }) {
  return api
    .get<CustomersPage>('/api/mobile/v1/customers', {
      params: { q: params?.q ?? '', page: params?.page ?? 1, limit: params?.limit ?? 20 },
    })
    .then((r) => r.data);
}

/* ------------------------------- Catalog write ----------------------------- */

/** Create a product (+ default variants) via the shared inventory writer. */
export function createProduct(payload: ProductUpsertPayload) {
  return api.post<ProductUpsertResult>('/api/mobile/v1/products', payload).then((r) => r.data);
}

export function updateProduct(id: string, payload: ProductUpsertPayload) {
  return api.put<ProductUpsertResult>(`/api/mobile/v1/products/${id}`, payload).then((r) => r.data);
}

/** Adjust a variant's stock (delta +/- or absolute quantity). */
export function adjustVariantStock(variantId: string, body: { delta?: number; quantity?: number }) {
  return api
    .patch<{ message: string; variant: { id: string; stockQuantity: number } }>(
      `/api/mobile/v1/variants/${variantId}/stock`,
      body,
    )
    .then((r) => r.data);
}

/* ------------------------------ Image upload ------------------------------- */

/** Ask the server for a short-lived signed PUT URL for one picked image. */
export function presignUpload(body: { kind: string; contentType: string; size: number }) {
  return api.post<PresignResult>('/api/mobile/v1/uploads/presign', body).then((r) => r.data);
}

/**
 * Verify the upload reached R2. Pass `productId` to attach immediately, or
 * omit it to stage the key for a product that hasn't been created yet.
 */
export function confirmUpload(body: { kind: string; key: string; productId?: string }) {
  return api.post<ConfirmResult>('/api/mobile/v1/uploads/confirm', body).then((r) => r.data);
}

/** Download the QR-verified receipt PDF as a Blob (for expo-sharing). */
export async function getOrderReceiptBlob(id: string) {
  const res = await api.get(`/api/mobile/v1/orders/${id}/receipt`, { responseType: 'blob' });
  return res.data as Blob;
}

/* ========================= Store site settings (parity) ==================== */
// Mirrors the PWA's /settings/site cards (routes/siteSettingsRoutes.js). The
// mobile access token is a role-SELLER JWT with sub = store id, so the same
// requireSeller middleware accepts it as-is — no extra mobile routes needed.

export interface TwoFactorSetup {
  success: boolean;
  secret: string;
  otpauthUri: string;
  qrDataUrl: string;
}

export interface TwoFactorMessage {
  success: boolean;
  enabled?: boolean;
  message?: string;
}

/** Display-name only — the subdomain slug (store address) never changes. */
export function renameStore(name: string) {
  return api
    .patch<{ success: boolean; name: string }>('/api/site-settings/name', { name })
    .then((r) => r.data);
}

export function getStoreProfile() {
  return api.get<StoreProfile>('/api/site-settings/profile').then((r) => r.data);
}

export function saveStoreProfile(profile: Pick<
  StoreProfile,
  'name' | 'publicEmail' | 'publicPhone' | 'whatsappNumber' | 'description' | 'address'
>) {
  return api.patch<StoreProfile>('/api/site-settings/profile', profile).then((r) => r.data);
}

export function requestAccountContactChange(type: 'email' | 'phone', value: string, currentPassword: string) {
  return api
    .post<{ success: boolean; type: 'email' | 'phone'; message: string }>(
      '/api/site-settings/profile/contact/request',
      { type, value, currentPassword },
    )
    .then((r) => r.data);
}

export function verifyAccountContactChange(type: 'email' | 'phone', code: string) {
  return api
    .post<{ success: boolean; email: string; phone: string; phoneVerified: boolean }>(
      '/api/site-settings/profile/contact/verify',
      { type, code },
    )
    .then((r) => r.data);
}

/** Requires the CURRENT password, exactly like the web settings page. */
export function changePassword(currentPassword: string, newPassword: string) {
  return api
    .patch<{ success: boolean; message?: string }>('/api/site-settings/password', {
      currentPassword,
      newPassword,
    })
    .then((r) => r.data);
}

export function getTwoFactorStatus() {
  return api.get<{ enabled: boolean }>('/api/site-settings/2fa/status').then((r) => r.data);
}

/** Stage a TOTP secret (encrypted at rest) and get the QR payload back. */
export function setupTwoFactor() {
  return api.post<TwoFactorSetup>('/api/site-settings/2fa/setup').then((r) => r.data);
}

export function enableTwoFactor(code: string) {
  return api.post<TwoFactorMessage>('/api/site-settings/2fa/enable', { code }).then((r) => r.data);
}

export function disableTwoFactor(code: string) {
  return api.post<TwoFactorMessage>('/api/site-settings/2fa/disable', { code }).then((r) => r.data);
}

/** Irreversible hard delete: typed slug + password, server cascades everything. */
export function deleteAccount(confirmSlug: string, password: string) {
  return api
    .delete<{ success: boolean }>('/api/site-settings/account', { data: { confirmSlug, password } })
    .then((r) => r.data);
}
