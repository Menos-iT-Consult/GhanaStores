import { api } from './client';
import type {
  DashboardStats,
  LoginResult,
  Order,
  OrdersPage,
  OrderFilter,
  OrderStatus,
  PaymentKeysPayload,
  PaymentSettings,
  Product,
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
  return api.get<{ order: Order }>(`/api/mobile/v1/orders/${id}`).then((r) => r.data.order);
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
