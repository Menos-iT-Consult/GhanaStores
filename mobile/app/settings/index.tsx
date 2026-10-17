import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, List, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { API_BASE_URL } from '@/api/client';
import { registerDeviceForPush, requestPushPermission } from '@/services/pushNotifications';

export default function SettingsScreen() {
  const router = useRouter();
  const { store, signOut } = useAuth();
  const { colors } = useTheme();

  // Ask for push permission once the merchant opens settings (a good second
  // touchpoint after the automatic attempt on login).
  const enablePush = async () => {
    const ok = await requestPushPermission();
    if (ok) await registerDeviceForPush();
  };

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={[styles.heading, { color: colors.onSurface }]}>Settings</Text>

      <Card mode="elevated" style={styles.card}>
        <List.Item
          title={store?.name || 'Your store'}
          description={`${store?.plan || 'TRIAL'} · ${store?.subdomainSlug || ''}`}
          left={(props) => <List.Icon {...props} icon="storefront-outline" />}
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
          <Text variant="labelLarge" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Account</Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Connected to {API_BASE_URL}</Text>
          <Button mode="outlined" textColor={colors.error} icon="logout" onPress={signOut} style={{ marginTop: 14 }}>
            Sign out
          </Button>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontWeight: '700', marginBottom: 14 },
  card: { marginBottom: 14 },
  cardBody: { padding: 16 },
  sectionTitle: { fontWeight: '700', marginBottom: 4 },
});
