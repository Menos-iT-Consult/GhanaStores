import React, { useEffect, useRef, useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { queryClient } from '@/queryClient';
import { theme } from '@/theme';
import { addNotificationResponseListener, registerDeviceForPush, routeForNotification } from '@/services/pushNotifications';
import { hasOnboarded } from '@/onboarding/onboarded';
import { DidwaLottieSplash } from '@/components/DidwaLottieSplash';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Gate the whole app on auth: not ready -> Lottie splash, signed in -> tabs, else login. */
function RootNavigator() {
  const { status } = useAuth();
  const router = useRouter();
  const bootstrapped = useRef(false);
  // null = still checking whether onboarding has been seen on this device.
  const [onboarded, setOnboardedState] = useState<boolean | null>(null);

  useEffect(() => {
    hasOnboarded()
      .then(setOnboardedState)
      .catch(() => setOnboardedState(false));
  }, []);

  // Keep the native splash up until both auth and onboarding state are known,
  // so we never flash the wrong first screen.
  useEffect(() => {
    if (status === 'loading' || onboarded === null || bootstrapped.current) return;
    bootstrapped.current = true;
    SplashScreen.hideAsync().catch(() => undefined);
  }, [status, onboarded]);

  // Route the initial stack: signed in -> tabs; otherwise welcome (new device) or login.
  useEffect(() => {
    if (status === 'loading' || onboarded === null) return;
    if (status === 'signedIn') router.replace('/(tabs)/dashboard');
    if (status === 'signedOut') router.replace(onboarded ? '/(auth)/login' : '/(auth)/welcome');
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

  if (status === 'loading' || onboarded === null) {
    return <DidwaLottieSplash />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
