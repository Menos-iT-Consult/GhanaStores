import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, Divider, Snackbar, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '@/lib/useSafeBack';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import type { PaymentSettings } from '@/types';

/**
 * Manage the store's own (BYOK) gateway keys + Cash on Delivery, exactly like the PWA's /settings/payments.
 * Secret keys are only ever shown masked; a blank field means "keep the currently stored value"
 * (the backend merges it).
 */
export default function StoreSettingsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const goBack = useSafeBack('/settings');
  const qc = useQueryClient();
  const { colors } = useTheme();

  const { data, isLoading, isError, error } = useQuery<{ settings: PaymentSettings; storageConfigured: boolean }>({
    queryKey: ['payment-keys'],
    queryFn: endpoints.getPaymentKeys,
  });

  const [paystackPublic, setPaystackPublic] = React.useState('');
  const [paystackSecret, setPaystackSecret] = React.useState('');
  const [hubtelClientId, setHubtelClientId] = React.useState('');
  const [hubtelSecret, setHubtelSecret] = React.useState('');
  const [hubtelMerchant, setHubtelMerchant] = React.useState('');
  const [enableCod, setEnableCod] = React.useState(true);
  const [activeGateway, setActiveGateway] = React.useState('COD');
  const [snack, setSnack] = React.useState<string | null>(null);

  const settings: PaymentSettings | undefined = data?.settings;

  // Seed the form from the server once loaded (public fields only).
  React.useEffect(() => {
    if (!settings) return;
    setPaystackPublic(settings.paystack.publicKey || '');
    setHubtelClientId(settings.hubtel.clientId || '');
    setHubtelMerchant(settings.hubtel.merchantAccountId || '');
    setEnableCod(settings.enableCod);
    setActiveGateway(settings.activeGateway || 'COD');
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () =>
      endpoints.savePaymentKeys({
        paystackPublicKey: paystackPublic || undefined,
        paystackSecretKey: paystackSecret || undefined,
        hubtelClientId: hubtelClientId || undefined,
        hubtelClientSecret: hubtelSecret || undefined,
        hubtelMerchantAccountId: hubtelMerchant || undefined,
        enableCod,
        activeGateway,
      }),
    onSuccess: () => {
      setSnack('Payment settings saved.');
      setPaystackSecret('');
      setHubtelSecret('');
      qc.invalidateQueries({ queryKey: ['payment-keys'] });
    },
    onError: (err) => setSnack(apiErrorMessage(err, 'Could not save settings.')),
  });

  if (isLoading) return <LoadingState label="Loading payment settings…" />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} />;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.BackAction onPress={goBack} />
        <Appbar.Content title="Payment methods" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>

        <Card mode="elevated">
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Paystack</Text>
            <TextInput
              label="Public key"
              value={paystackPublic}
              onChangeText={setPaystackPublic}
              autoCapitalize="none"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label={settings?.paystack.secretKeyMasked ? `Secret (${settings.paystack.secretKeyMasked})` : 'Secret key'}
              value={paystackSecret}
              onChangeText={setPaystackSecret}
              autoCapitalize="none"
              secureTextEntry
              mode="outlined"
              style={styles.input}
              placeholder={settings?.paystack.secretKeyMasked ? 'Leave blank to keep' : undefined}
            />
          </View>
        </Card>

        <Card mode="elevated">
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Hubtel</Text>
            <TextInput label="Client ID" value={hubtelClientId} onChangeText={setHubtelClientId} autoCapitalize="none" mode="outlined" style={styles.input} />
            <TextInput
              label={settings?.hubtel.clientSecretMasked ? `Client secret (${settings.hubtel.clientSecretMasked})` : 'Client secret'}
              value={hubtelSecret}
              onChangeText={setHubtelSecret}
              autoCapitalize="none"
              secureTextEntry
              mode="outlined"
              style={styles.input}
              placeholder={settings?.hubtel.clientSecretMasked ? 'Leave blank to keep' : undefined}
            />
            <TextInput label="Merchant account ID" value={hubtelMerchant} onChangeText={setHubtelMerchant} autoCapitalize="none" mode="outlined" style={styles.input} />
          </View>
        </Card>

        <Card mode="elevated">
          <View style={styles.cardBody}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Cash on Delivery</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Let customers pay when the order arrives.</Text>
              </View>
              <Switch value={enableCod} onValueChange={setEnableCod} color={colors.primary} />
            </View>
            <Divider style={{ marginVertical: 12 }} />
            <Text variant="labelLarge" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Active gateway</Text>
            <View style={styles.gatewayRow}>
              {['COD', 'PAYSTACK', 'HUBTEL'].map((g) => (
                <Button key={g} mode={activeGateway === g ? 'contained' : 'outlined'} onPress={() => setActiveGateway(g)} style={styles.gatewayBtn} compact>
                  {g}
                </Button>
              ))}
            </View>
          </View>
        </Card>

        {data && !data.storageConfigured ? (
          <Text variant="bodySmall" style={[styles.warn, { backgroundColor: colors.errorContainer, color: colors.onErrorContainer }]}>
            Secure key storage isn’t configured on the server, so keys can’t be saved yet.
          </Text>
        ) : null}

        <Button mode="contained" onPress={() => saveMutation.mutate()} loading={saveMutation.isPending} style={styles.save}>
          Save changes
        </Button>
      </ScrollView>

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)} duration={3500}>
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  cardBody: { padding: 16 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  input: { marginBottom: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gatewayRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  gatewayBtn: { flex: 1 },
  warn: { padding: 12, borderRadius: 8 },
  save: { marginTop: 8 },
});
