import { QueryClient } from '@tanstack/react-query';

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
