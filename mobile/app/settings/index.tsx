import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, Divider, List, Snackbar, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeBack } from '@/lib/useSafeBack';
import { useAuth } from '@/auth/AuthProvider';
import { API_BASE_URL } from '@/api/client';
import { registerDeviceForPush, type PushRegistrationResult } from '@/services/pushNotifications';
import { BiometricLockSetting } from '@/components/BiometricLockSetting';

/** Human-readable outcome per registration result (see pushNotifications.ts). */
const PUSH_MESSAGES: Record<PushRegistrationResult, string> = {
  registered: 'Push notifications are enabled for this device.',
  'permission-denied': 'Notifications are blocked. Allow them in system settings, then try again.',
  unavailable: 'Push needs a real phone — simulators and the web cannot receive notifications.',
  'token-error': 'Could not create a push token. Check the network and try again.',
  'register-failed': 'Could not reach the server to register this device. Try again shortly.',
};

/**
 * Settings hub. The Appbar.Header handles the status-bar inset (safe mode) so
 * the page never sits under the system UI; cards route to the full site-settings
 * parity screen and the payment-keys screen.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const goBack = useSafeBack('/settings');
  const { store, signOut } = useAuth();
  const { colors } = useTheme();
  const [snack, setSnack] = React.useState<string | null>(null);

  // Registration reports exactly why it did or didn't work — no silent failures.
  const enablePush = async () => {
    const result = await registerDeviceForPush();
    setSnack(PUSH_MESSAGES[result]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.BackAction onPress={goBack} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Card mode="elevated" style={styles.card}>
          <List.Item
            title={store?.name || 'Your store'}
            description={`${store?.plan || 'TRIAL'} · ${store?.subdomainSlug || ''}`}
            left={(props) => <List.Icon {...props} icon="storefront-outline" />}
          />
          <Divider />
          <List.Item
            title="Store settings"
            description="Name, password, two-factor, delete account"
            left={(props) => <List.Icon {...props} icon="cog-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push('/settings/store')}
          />
          <Divider />
          <List.Item
            title="Payment methods"
            description="Paystack / Hubtel keys & Cash on Delivery"
            left={(props) => <List.Icon {...props} icon="credit-card-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push('/settings/payments')}
          />
          <Divider />
          <List.Item
            title="Enable push notifications"
            description="Get alerts for new orders and payments"
            left={(props) => <List.Icon {...props} icon="bell-outline" />}
            onPress={enablePush}
          />
        </Card>

        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="labelLarge" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Security</Text>
            <BiometricLockSetting />
          </View>
        </Card>

        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="labelLarge" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Account</Text>
            <Button mode="outlined" textColor={colors.error} icon="logout" onPress={signOut} style={{ marginTop: 14 }}>
              Sign out
            </Button>
          </View>
        </Card>
      </ScrollView>

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)} duration={4500}>
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 14 },
  cardBody: { padding: 16 },
  sectionTitle: { fontWeight: '700', marginBottom: 4 },
});
