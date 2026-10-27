import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { queryClient } from '@/queryClient';
import { ThemeProvider, useThemeMode } from '@/theme/ThemeContext';
import {
  addNotificationResponseListener,
  addPushTokenRefreshListener,
  clearLastNotificationTap,
  getLastNotificationTap,
  registerDeviceForPush,
  routeForNotification,
} from '@/services/pushNotifications';
import { hasOnboarded } from '@/onboarding/onboarded';
import { DidwaLottieSplash } from '@/components/DidwaLottieSplash';
import { AppLockOverlay } from '@/components/AppLockOverlay';
import { isBiometricLockEnabled } from '@/services/biometricService';
import { useMotionScreenOptions } from '@/navigation/useMotionScreenOptions';

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
  const screenOptions = useMotionScreenOptions();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const splashHidden = useRef(false);
  const prevStatus = useRef(status);
  const lastHandledNotificationId = useRef<string | null>(null);
  const [splashPainted, setSplashPainted] = useState(false);
  const [pendingNotificationRoute, setPendingNotificationRoute] = useState<string | null>(null);
  // null = still checking whether onboarding has been seen on this device.
  const [onboarded, setOnboardedState] = useState<boolean | null>(null);
  // App lock state
  const [isLocked, setIsLocked] = useState(false);
  const [lockChecked, setLockChecked] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    hasOnboarded()
      .then(setOnboardedState)
      .catch(() => setOnboardedState(false));
  }, []);

  /* ----------------------------- App lock ----------------------------- */

  // Cold start: check the biometric lock preference once auth is known.
  useEffect(() => {
    let active = true;
    if (status === 'loading') return () => { active = false; };
    if (status === 'signedOut') {
      setIsLocked(false);
      setLockChecked(true);
      return () => { active = false; };
    }

    setLockChecked(false);
    const checkLock = async () => {
      try {
        const enabled = await isBiometricLockEnabled();
        if (active && enabled) setIsLocked(true);
      } catch (error) {
        console.error('[mobile-auth] Could not read the app-lock preference:', error);
      } finally {
        if (active) setLockChecked(true);
      }
    };
    void checkLock();
    return () => { active = false; };
  }, [status]);

  // Foreground transition: re-lock when the app returns from background/inactive.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      const wasBackgrounded = appStateRef.current.match(/inactive|background/);
      if (wasBackgrounded && nextState === 'active' && status === 'signedIn') {
        try {
          if (await isBiometricLockEnabled()) setIsLocked(true);
        } catch (error) {
          console.error('[mobile-auth] Could not check the app-lock preference:', error);
        }
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [status]);

  const ready = status !== 'loading' && onboarded !== null && lockChecked;
  // Keep the splash up while boot is unresolved AND until the entry route has
  // been replaced, so the real destination is mounted before it lifts.
  const showSplash = !ready || pathname === '/' || !splashPainted;

  const hideNativeSplash = useCallback(() => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  // Hide the native splash only after the custom splash has painted and the
  // entry redirect has mounted its destination. This avoids revealing the
  // intentionally empty root route during cold startup.
  useEffect(() => {
    if (ready && pathname !== '/' && splashPainted) hideNativeSplash();
  }, [ready, pathname, splashPainted, hideNativeSplash]);

  // Entry redirect from the root index route: signed in -> dashboard; otherwise
  // welcome (new device) or login. Never fires off `/`, so a mid-session auth
  // change cannot yank the user out of the screen they are on.
  useEffect(() => {
    if (!ready || pathname !== '/') return;
    if (status === 'signedIn') router.replace('/(tabs)/dashboard');
    if (status === 'signedOut') router.replace(onboarded ? '/(auth)/login' : '/(auth)/welcome');
  }, [ready, pathname, status, onboarded, router]);

  // Expo URL pathnames omit route-group names. Use route segments to detect
  // the auth group so successful login and 2FA always leave the auth screens.
  useEffect(() => {
    if (status !== 'signedIn' || !ready) return;
    if (segments[0] === '(auth)') router.replace('/(tabs)/dashboard');
  }, [status, ready, segments, router]);

  // Mid-session sign-out (explicit, or a hard 401) leaves whatever screen is
  // open — the entry route is long gone by then.
  useEffect(() => {
    if (prevStatus.current === 'signedIn' && status === 'signedOut') {
      router.replace(onboarded ? '/(auth)/login' : '/(auth)/welcome');
    }
    prevStatus.current = status;
  }, [status, onboarded, router]);

  const handleNotificationTap = useCallback((tap: { id: string; data: Record<string, unknown> }) => {
    if (lastHandledNotificationId.current === tap.id) return;
    lastHandledNotificationId.current = tap.id;
    const route = routeForNotification(tap.data);
    setPendingNotificationRoute(route);
    if (!route) {
      clearLastNotificationTap().catch((error) =>
        console.warn('[push] Could not clear an unsupported notification response:', error),
      );
    }
  }, []);

  // Subscribe before auth resolves so a cold-start notification tap is not
  // lost. Keep its route queued until the signed-in destination is mounted.
  useEffect(() => {
    const sub = addNotificationResponseListener(handleNotificationTap);
    getLastNotificationTap()
      .then((tap) => {
        if (tap) handleNotificationTap(tap);
      })
      .catch((error) => console.error('[push] Could not read the launch notification:', error));
    return () => sub.remove();
  }, [handleNotificationTap]);

  useEffect(() => {
    const route = pendingNotificationRoute;
    if (!route || status !== 'signedIn' || !ready || pathname === '/' || isLocked) return;
    setPendingNotificationRoute(null);
    router.push(route as never);
    clearLastNotificationTap().catch((error) =>
      console.warn('[push] Could not clear the handled notification response:', error),
    );
  }, [pendingNotificationRoute, status, ready, pathname, isLocked, router]);

  // Register on sign-in without interrupting the seller with an unexpected
  // permission prompt. Permission can be enabled explicitly from Settings.
  useEffect(() => {
    if (status !== 'signedIn') return;
    registerDeviceForPush().catch((error) =>
      console.warn('[push] Could not register this device:', error),
    );
    const tokenSub = addPushTokenRefreshListener();
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        registerDeviceForPush().catch((error) =>
          console.warn('[push] Could not refresh this device registration:', error),
        );
      }
    });
    return () => {
      tokenSub.remove();
      appStateSub.remove();
    };
  }, [status]);

  const markSplashPainted = useCallback(() => {
    setSplashPainted(true);
    if (ready && pathname !== '/') hideNativeSplash();
  }, [ready, pathname, hideNativeSplash]);

  return (
    <>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="+not-found" />
      </Stack>
      {isLocked ? (
        <AppLockOverlay
          isLocked={true}
          onUnlock={() => setIsLocked(false)}
        />
      ) : null}
      {showSplash ? (
        <View style={StyleSheet.absoluteFill}>
          <DidwaLottieSplash onReady={markSplashPainted} />
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
