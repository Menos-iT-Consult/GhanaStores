import { useCallback } from 'react';
import { useRouter } from 'expo-router';

/**
 * Back navigation that can never land on a blank screen.
 *
 * Several screens are reachable without history — deep-links from a push tap
 * (`routeForNotification` -> `router.push`) or entry redirects
 * (`router.replace`) — where `router.back()` pops to nothing and renders an
 * empty navigator. This helper goes back when history exists and replaces to
 * a sane fallback otherwise.
 */
export function useSafeBack(fallback: string = '/(tabs)/dashboard'): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback as never);
  }, [router, fallback]);
}
