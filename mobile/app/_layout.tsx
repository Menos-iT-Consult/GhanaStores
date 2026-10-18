import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { queryClient } from '@/queryClient';
import { ThemeProvider, useThemeMode } from '@/theme/ThemeContext';
import { addNotificationResponseListener, registerDeviceForPush, routeForNotification } from '@/services/pushNotifications';
import { hasOnboarded } from '@/onboarding/onboarded';
import { DidwaLottieSplash } from '@/components/DidwaLottieSplash';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * Root navigator. The Stack is ALWAYS mounted — even while auth/onboarding
 * are still resolving; the Lottie splash rides on top as an overlay instead of
 * replacing it.
 *
 * That is the cold-launch fix: previously the Stack mounted only after the
 * gate resolved, and with no `app/index.tsx` there was no initial route to
 * match, so the first render had nothing to show while the initial
 * `router.replace` raced the mount (blank screen until the app was reopened).
 * The same mid-session unmount/remount is what made the Settings gear open a
 * blank page — the navigation state the push came from had been torn down.
 *
 * Entry routing hangs off the root `index` route: while pathname is `/`, pick
 * the destination once auth + onboarding are known.
 */
function RootNavigator() {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const splashHidden = useRef(false);
  const prevStatus = useRef(status);
  // null = still checking whether onboarding has been seen on this device.
  const [onboarded, setOnboardedState] = useState<boolean | null>(null);

  useEffect(() => {
    hasOnboarded()
      .then(setOnboardedState)
      .catch(() => setOnboardedState(false));
  }, []);

  const ready = status !== 'loading' && onboarded !== null;
  // Keep the splash up while boot is unresolved AND until the entry route has
  // been replaced, so the real destination is mounted before it lifts.
  const showSplash = !ready || pathname === '/';

  // Reveal our own first frame from under the native splash (idempotent).
  const hideNativeSplash = useCallback(() => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  // Belt-and-braces: if onLayout never fires, still lift the native splash.
  useEffect(() => {
    if (ready) hideNativeSplash();
  }, [ready, hideNativeSplash]);

  // Entry redirect from the root index route: signed in -> dashboard; otherwise
  // welcome (new device) or login. Never fires off `/`, so a mid-session auth
  // change cannot yank the user out of the screen they are on.
  useEffect(() => {
    if (!ready || pathname !== '/') return;
    if (status === 'signedIn') router.replace('/(tabs)/dashboard');
    if (status === 'signedOut') router.replace(onboarded ? '/(auth)/login' : '/(auth)/welcome');
  }, [ready, pathname, status, onboarded, router]);

  // Mid-session sign-out (explicit, or a hard 401) leaves whatever screen is
  // open — the entry route is long gone by then.
  useEffect(() => {
    if (prevStatus.current === 'signedIn' && status === 'signedOut') {
      router.replace(onboarded ? '/(auth)/login' : '/(auth)/welcome');
    }
    prevStatus.current = status;
  }, [status, onboarded, router]);

  // Register for push + wire deep-links once signed in.
  useEffect(() => {
    if (status !== 'signedIn') return;
    registerDeviceForPush().catch(() => undefined);
    const sub = addNotificationResponseListener((data) => {
      const route = routeForNotification(data);
      if (route) router.push(route as never);
    });
    return () => sub.remove();
  }, [status, router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="+not-found" />
      </Stack>
      {showSplash ? (
        <View style={StyleSheet.absoluteFill} onLayout={hideNativeSplash}>
          <DidwaLottieSplash />
        </View>
      ) : null}
    </>
  );
}

/** Applies the active Paper theme (light/dark) + status-bar style to the tree. */
function ThemedProviders({ children }: { children: React.ReactNode }) {
  const { theme, isDark } = useThemeMode();
  return (
    <PaperProvider theme={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedProviders>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </ThemedProviders>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
