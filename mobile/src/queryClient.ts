import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUERY_CACHE_KEY = 'didwa.query-cache.v1';

/**
 * Global React Query client. Short stale time keeps the dashboard feeling live;
 * a single automatic retry avoids hammering the API on transient failures.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export async function hydrateQueryCache(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUERY_CACHE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as Array<{ queryKey: readonly unknown[]; data: unknown; dataUpdatedAt: number }>;
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      if (!Array.isArray(entry.queryKey) || !('data' in entry)) continue;
      queryClient.setQueryData(entry.queryKey, entry.data, { updatedAt: entry.dataUpdatedAt });
    }
  } catch {
    // Cache hydration is best-effort; the live app remains usable.
  }
}

export async function clearQueryCache(): Promise<void> {
  queryClient.clear();
  await AsyncStorage.removeItem(QUERY_CACHE_KEY).catch(() => undefined);
}

queryClient.getQueryCache().subscribe(() => {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const entries = queryClient.getQueryCache().getAll()
      .filter((query) => query.state.data !== undefined)
      .map((query) => ({
        queryKey: query.queryKey,
        data: query.state.data,
        dataUpdatedAt: query.state.dataUpdatedAt,
      }));
    AsyncStorage.setItem(QUERY_CACHE_KEY, JSON.stringify(entries)).catch(() => undefined);
  }, 250);
});
