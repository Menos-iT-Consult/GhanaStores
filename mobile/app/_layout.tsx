import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { queryClient } from '@/queryClient';
import { theme } from '@/theme';
import { addNotificationResponseListener, registerDeviceForPush, routeForNotification } from '@/services/pushNotifications';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Gate the whole app on auth: not ready -> spinner, signed in -> tabs, else login. */
function RootNavigator() {
  const { status } = useAuth();
  const router = useRouter();
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (status === 'loading' || bootstrapped.current) return;
    bootstrapped.current = true;
    SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  // Route the initial stack based on auth once we know.
  useEffect(() => {
    if (status === 'signedIn') router.replace('/(tabs)/dashboard');
    if (status === 'signedOut') router.replace('/(auth)/login');
  }, [status, router]);

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

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    );
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
