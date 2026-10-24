import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Button, Card, Divider, List, Snackbar, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeBack } from '@/lib/useSafeBack';
import { useAuth } from '@/auth/AuthProvider';

const BG = '#0B0F19';
const CARD_BG = '#1E293B';
const ACCENT = '#2563EB';

/**
 * Settings hub (root-level route).
 *
 * Rendered as a clean, themed template so the gear icon in the dashboard header
 * opens a stable screen instead of a blank page. Uses React Native Paper +
 * SafeAreaView on top of the matte charcoal dark theme.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const goBack = useSafeBack('/(tabs)/dashboard');
  const { store, signOut } = useAuth();
  const { colors } = useTheme();
  const [snack, setSnack] = React.useState<string | null>(null);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG }]} edges={['top', 'bottom']}>
      <View style={[styles.root, { backgroundColor: BG }]}>
        <Appbar.Header mode="small" style={{ backgroundColor: BG }}>
          <Appbar.BackAction onPress={goBack} />
          <Appbar.Content title="Settings" />
        </Appbar.Header>

        <ScrollView contentContainerStyle={styles.content}>
          <Card mode="elevated" style={[styles.card, { backgroundColor: CARD_BG }]}>
            <List.Item
              title={store?.name || 'Your store'}
              description={`${store?.plan || 'TRIAL'} · ${store?.subdomainSlug || ''}`}
              left={(props) => <List.Icon {...props} icon="storefront-outline" color={ACCENT} />}
            />
            <Divider />
            <List.Item
              title="Store settings"
              description="Name, password, two-factor, delete account"
              left={(props) => <List.Icon {...props} icon="cog-outline" color={ACCENT} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push('/settings/store')}
            />
            <Divider />
            <List.Item
              title="Payment methods"
              description="Paystack / Hubtel keys & Cash on Delivery"
              left={(props) => <List.Icon {...props} icon="credit-card-outline" color={ACCENT} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push('/settings/payments')}
            />
          </Card>

          <Card mode="elevated" style={[styles.card, { backgroundColor: CARD_BG }]}>
            <View style={styles.cardBody}>
              <Text variant="labelLarge" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
                Account
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

        <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)} duration={4500}>
          {snack}
        </Snackbar>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 14 },
  cardBody: { padding: 16 },
  sectionTitle: { fontWeight: '700', marginBottom: 4 },
});