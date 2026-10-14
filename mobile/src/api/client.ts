import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

/**
 * Axios client for the DiDwa mobile API.
 *
 * - Base URL comes from EXPO_PUBLIC_API_URL (the API origin, e.g.
 *   https://app.didwaghana.com). The mobile app never uses the storefront's
 *   host-header routing.
 * - The access token is attached as a Bearer header and kept in SecureStore.
 * - On a 401, the client transparently refreshes the access token using the
 *   rotating refresh token (single-flight, so concurrent 401s share one
 *   refresh), then retries the original request once. If the refresh fails the
 *   registered unauthorized handler fires (the app logs out).
 */

const RAW_URL = process.env.EXPO_PUBLIC_API_URL || 'https://app.didwaghana.com';
export const API_BASE_URL = RAW_URL.replace(/\/+$/, '');

const ACCESS_KEY = 'didwa.access_token';
const REFRESH_KEY = 'didwa.refresh_token';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/* ----------------------------- request: attach token --------------------- */

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/* ----------------------------- refresh (single-flight) -------------------- */

async function performRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const rt = refreshToken ?? (await SecureStore.getItemAsync(REFRESH_KEY));
      if (!rt) return null;

      const res = await axios.post(`${API_BASE_URL}/api/mobile/auth/refresh`, {
        refreshToken: rt,
      });

      const nextToken: string | undefined = res.data?.token;
      const nextRefresh: string | undefined = res.data?.refreshToken;
      if (!nextToken) return null;

      accessToken = nextToken;
      if (nextRefresh) {
        refreshToken = nextRefresh;
        await SecureStore.setItemAsync(REFRESH_KEY, nextRefresh);
      }
      await SecureStore.setItemAsync(ACCESS_KEY, nextToken);
      return nextToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/* ----------------------------- response: 401 -> refresh ------------------- */

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      original._retry = true;
      const fresh = await performRefresh();
      if (fresh) {
        original.headers.Authorization = `Bearer ${fresh}`;
        return api(original);
      }
      // Refresh could not recover the session -> force sign-out.
      unauthorizedHandler?.();
    }

    return Promise.reject(error);
  },
);

/* ----------------------------- session storage --------------------------- */

export async function storeSession(token: string, refresh: string) {
  accessToken = token;
  refreshToken = refresh;
  await SecureStore.setItemAsync(ACCESS_KEY, token);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function loadStoredSession(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  accessToken = await SecureStore.getItemAsync(ACCESS_KEY);
  refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  return { accessToken, refreshToken };
}

export async function clearSession() {
  accessToken = null;
  refreshToken = null;
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export function currentRefreshToken(): string | null {
  return refreshToken;
}

export function hasAccessToken(): boolean {
  return Boolean(accessToken);
}

/** Pull a human-readable message out of any thrown API error. */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  const data = (err as AxiosError)?.response?.data as { error?: string } | undefined;
  return data?.error || (err as Error)?.message || fallback;
}
