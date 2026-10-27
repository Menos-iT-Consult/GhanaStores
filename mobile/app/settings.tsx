import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Appbar, Button, Card, Divider, List, Snackbar, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeBack } from '@/lib/useSafeBack';
import { useAuth } from '@/auth/AuthProvider';
import { ThemeToggle } from '@/components/glass/ThemeToggle';
import {
  getPushPermissionStatus,
  registerDeviceForPush,
  type PushRegistrationResult,
} from '@/services/pushNotifications';

type PushPermissionStatus = Awaited<ReturnType<typeof getPushPermissionStatus>>;

function registrationMessage(result: PushRegistrationResult): string {
  switch (result) {
    case 'permission-denied':
      return 'Notifications are blocked. Allow them in your device settings to receive order updates.';
    case 'unavailable':
      return 'Push notifications are available on a physical device.';
    case 'token-error':
      return 'Could not get a push token. Check your connection and try again.';
    case 'register-failed':
      return 'Could not register this device with DiDwa. Try again.';
    case 'registered':
      return 'This device is ready to receive seller notifications.';
  }
}

/**
 * Settings hub (root-level route).
 *
 * Seller settings hub. Store identity, checkout setup, and account access are
 * grouped here and follow the selected light or dark theme.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const goBack = useSafeBack('/(tabs)/dashboard');
  const { store, signOut } = useAuth();
  const { colors } = useTheme();
  const [pushPermission, setPushPermission] = useState<PushPermissionStatus | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [pushStatusError, setPushStatusError] = useState<string | null>(null);

  const refreshPushPermission = useCallback(async () => {
    try {
      setPushStatusError(null);
      setPushPermission(await getPushPermissionStatus());
    } catch (error) {
      console.error('[push] Could not read notification permission:', error);
      setPushStatusError('Could not check notification permission.');
    }
  }, []);

  useEffect(() => {
    void refreshPushPermission();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPushPermission();
    });
    return () => subscription.remove();
  }, [refreshPushPermission]);

  const enableNotifications = async () => {
    setPushBusy(true);
    setPushMessage(null);
    try {
      const result = await registerDeviceForPush({ requestPermission: true });
      setPushMessage(registrationMessage(result));
      await refreshPushPermission();
    } catch (error) {
      console.error('[push] Could not enable notifications:', error);
      setPushMessage('Could not enable notifications. Please try again.');
    } finally {
      setPushBusy(false);
    }
  };

  const openSystemSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('[push] Could not open device settings:', error);
      setPushMessage('Could not open device settings. Please enable notifications from your system settings.');
    }
  };

  const pushDescription = pushStatusError
    ? pushStatusError
    : pushPermission === 'granted'
      ? 'Enabled on this device. Receive alerts for new orders and important store updates.'
      : pushPermission === 'denied'
        ? 'Notifications are blocked by your device. Change this in system settings.'
        : pushPermission === 'unavailable'
          ? 'Push notifications require a physical device.'
          : 'Get timely alerts for new orders and important store updates.';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
          <Appbar.BackAction onPress={goBack} />
          <Appbar.Content title="Settings" />
          <ThemeToggle />
        </Appbar.Header>

        <ScrollView contentContainerStyle={styles.content}>
          <Text variant="titleMedium" style={[styles.introTitle, { color: colors.onSurface }]}>
            Run your store
          </Text>
          <Text variant="bodyMedium" style={[styles.intro, { color: colors.onSurfaceVariant }]}>
            Keep your account, checkout, and store details up to date.
          </Text>

          <Card mode="elevated" style={styles.card}>
            <List.Item
              title={store?.name || 'Your store'}
              description={`${store?.plan || 'TRIAL'} · ${store?.subdomainSlug || ''}`}
              left={(props) => <List.Icon {...props} icon="storefront-outline" color={colors.primary} />}
            />
            <Divider />
            <List.Item
              title="Store settings"
              description="Store profile, security, and subscription"
              left={(props) => <List.Icon {...props} icon="cog-outline" color={colors.primary} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push('/settings/store')}
            />
            <Divider />
            <List.Item
              title="Payment methods"
              description="Mobile Money, Paystack, Hubtel, and delivery"
              left={(props) => <List.Icon {...props} icon="credit-card-outline" color={colors.primary} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push('/settings/payments')}
            />
          </Card>

          <Card mode="elevated" style={styles.card}>
            <View style={styles.cardBody}>
              <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>
                Notifications
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                {pushDescription}
              </Text>
              {pushPermission === null && !pushStatusError ? (
                <ActivityIndicator style={styles.pushAction} color={colors.primary} />
              ) : pushPermission === 'denied' ? (
                <Button
                  mode="contained"
                  icon="cog-outline"
                  onPress={() => void openSystemSettings()}
                  style={styles.pushAction}
                >
                  Open device settings
                </Button>
              ) : pushPermission !== 'unavailable' ? (
                <Button
                  mode={pushPermission === 'granted' ? 'outlined' : 'contained'}
                  icon={pushPermission === 'granted' ? 'check' : 'bell-ring-outline'}
                  loading={pushBusy}
                  disabled={pushBusy}
                  onPress={() => void enableNotifications()}
                  style={styles.pushAction}
                >
                  {pushPermission === 'granted' ? 'Refresh this device' : 'Enable notifications'}
                </Button>
              ) : null}
              {pushStatusError ? (
                <Button onPress={() => void refreshPushPermission()} compact>
                  Check again
                </Button>
              ) : null}
            </View>
          </Card>

          <Card mode="elevated" style={styles.card}>
            <View style={styles.cardBody}>
              <Text variant="labelLarge" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
                Account access
              </Text>
              <Button
                mode="outlined"
                textColor={colors.error}
                icon="logout"
                onPress={signOut}
                style={{ marginTop: 14 }}
              >
                Sign out
              </Button>
            </View>
          </Card>
        </ScrollView>
        <Snackbar visible={Boolean(pushMessage)} onDismiss={() => setPushMessage(null)} duration={4000}>
          {pushMessage}
        </Snackbar>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  introTitle: { fontWeight: '800', marginBottom: 4 },
  intro: { marginBottom: 16 },
  card: { marginBottom: 14 },
  cardBody: { padding: 16 },
  sectionTitle: { fontWeight: '700', marginBottom: 4 },
  pushAction: { marginTop: 12, alignSelf: 'flex-start' },
});