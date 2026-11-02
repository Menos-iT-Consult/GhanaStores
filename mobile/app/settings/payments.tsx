import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, Divider, Snackbar, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeBack } from '@/lib/useSafeBack';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import type { ManagedPayoutSummary, PaymentSettingsResponse } from '@/types';
import { PasswordTextInput } from '@/components/PasswordTextInput';

/**
 * Manage DiDwa Managed Payments or the store's own gateway keys. Secret keys
 * are only shown masked; blank fields keep existing credentials unchanged.
 */
export default function PaymentsSettingsScreen() {
  const goBack = useSafeBack('/settings');
  const qc = useQueryClient();
  const { colors } = useTheme();
  const [paymentMode, setPaymentMode] = useState<'MANAGED' | 'BYOK'>('MANAGED');

  const { data, isLoading, isError, error, refetch } = useQuery<PaymentSettingsResponse>({
    queryKey: ['payment-keys'],
    queryFn: endpoints.getPaymentKeys,
  });

  const [paystackPublic, setPaystackPublic] = useState('');
  const [paystackSecret, setPaystackSecret] = useState('');
  const [hubtelClientId, setHubtelClientId] = useState('');
  const [hubtelSecret, setHubtelSecret] = useState('');
  const [hubtelMerchant, setHubtelMerchant] = useState('');
  const [enableCod, setEnableCod] = useState(true);
  const [activeGateway, setActiveGateway] = useState('COD');
  const [payoutMomoNumber, setPayoutMomoNumber] = useState('');
  const [payoutMomoNetwork, setPayoutMomoNetwork] = useState('MTN');
  const [payoutMomoAccountName, setPayoutMomoAccountName] = useState('');
  const [payoutMomoVerifiedAt, setPayoutMomoVerifiedAt] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [snack, setSnack] = useState<string | null>(null);

  const payouts = useQuery<ManagedPayoutSummary>({
    queryKey: ['managed-payouts'],
    queryFn: endpoints.getManagedPayoutSummary,
    enabled: Boolean(data && paymentMode === 'MANAGED'),
  });

  const settings = data?.settings;

  // Seed the form from the server once loaded (public fields only).
  useEffect(() => {
    if (!settings) return;
    setPaystackPublic(settings.paystack.publicKey || '');
    setHubtelClientId(settings.hubtel.clientId || '');
    setHubtelMerchant(settings.hubtel.merchantAccountId || '');
    setEnableCod(settings.enableCod);
    setActiveGateway(settings.activeGateway || 'COD');
    setPaymentMode(data.paymentMode || 'MANAGED');
    setPayoutMomoNumber(data.payoutMomoNumber || '');
    setPayoutMomoNetwork(data.payoutMomoNetwork || 'MTN');
    setPayoutMomoAccountName(data.payoutMomoAccountName || '');
    setPayoutMomoVerifiedAt(data.payoutMomoVerifiedAt || null);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => endpoints.savePaymentKeys({
        paystackPublicKey: paystackPublic || undefined,
        paystackSecretKey: paystackSecret || undefined,
        hubtelClientId: hubtelClientId || undefined,
        hubtelClientSecret: hubtelSecret || undefined,
        hubtelMerchantAccountId: hubtelMerchant || undefined,
        enableCod,
        activeGateway,
        paymentMode,
        payoutMomoNumber,
        payoutMomoNetwork,
    }),
    onSuccess: (saved) => {
      setSnack('Payment settings saved.');
      setPaystackSecret('');
      setHubtelSecret('');
      setPayoutMomoNumber(saved.payoutMomoNumber || '');
      setPayoutMomoNetwork(saved.payoutMomoNetwork || 'MTN');
      setPayoutMomoAccountName(saved.payoutMomoAccountName || '');
      setPayoutMomoVerifiedAt(saved.payoutMomoVerifiedAt || null);
      qc.invalidateQueries({ queryKey: ['payment-keys'] });
      qc.invalidateQueries({ queryKey: ['managed-payouts'] });
    },
    onError: (err) => setSnack(apiErrorMessage(err, 'Could not save settings.')),
  });

  const payoutMutation = useMutation({
    mutationFn: () => endpoints.requestManagedPayout(Number(payoutAmount)),
    onSuccess: (result) => {
      setSnack(result.message || 'Payout request submitted for manual review.');
      setPayoutAmount('');
      qc.invalidateQueries({ queryKey: ['managed-payouts'] });
    },
    onError: (err) => setSnack(apiErrorMessage(err, 'Could not submit payout request.')),
  });

  if (isLoading) return <LoadingState label="Loading payment settings…" />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} onRetry={() => { void refetch(); }} />;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.BackAction onPress={goBack} />
        <Appbar.Content title="Payment methods" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card mode="elevated">
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
              Payment processing mode
            </Text>
            <Text variant="bodySmall" style={[styles.description, { color: colors.onSurfaceVariant }]}>
              Switching to BYOK does not delete your saved gateway credentials.
            </Text>
            <View style={styles.gatewayRow}>
              <Button
                mode={paymentMode === 'MANAGED' ? 'contained' : 'outlined'}
                onPress={() => setPaymentMode('MANAGED')}
                style={styles.modeButton}
                compact
              >
                DiDwa managed
              </Button>
              <Button
                mode={paymentMode === 'BYOK' ? 'contained' : 'outlined'}
                onPress={() => setPaymentMode('BYOK')}
                style={styles.modeButton}
                compact
              >
                My own keys
              </Button>
            </View>
          </View>
        </Card>

        {paymentMode === 'MANAGED' ? (
          <>
            <Card mode="elevated">
              <View style={styles.cardBody}>
                <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
                  Mobile Money payout destination
                </Text>
                <Text variant="bodySmall" style={[styles.description, { color: colors.onSurfaceVariant }]}>
                  DiDwa verifies the registered account name when you save these details.
                </Text>
                <View style={styles.gatewayRow}>
                  {[
                    ['MTN', 'MTN'],
                    ['TELECEL', 'Telecel'],
                    ['AT', 'AT Money'],
                  ].map(([network, label]) => (
                    <Button
                      key={network}
                      mode={payoutMomoNetwork === network ? 'contained' : 'outlined'}
                      onPress={() => {
                        setPayoutMomoNetwork(network);
                        setPayoutMomoAccountName('');
                        setPayoutMomoVerifiedAt(null);
                      }}
                      style={styles.networkButton}
                      compact
                    >
                      {label}
                    </Button>
                  ))}
                </View>
                <TextInput
                  label="Mobile Money number"
                  value={payoutMomoNumber}
                  onChangeText={(value) => {
                    setPayoutMomoNumber(value);
                    setPayoutMomoAccountName('');
                    setPayoutMomoVerifiedAt(null);
                  }}
                  keyboardType="phone-pad"
                  maxLength={20}
                  mode="outlined"
                  style={styles.input}
                />
                {payoutMomoAccountName ? (
                  <Text variant="bodySmall" style={[styles.verified, { color: colors.primary }]}>
                    Verified account: {payoutMomoAccountName}
                    {payoutMomoVerifiedAt ? ` · ${new Date(payoutMomoVerifiedAt).toLocaleDateString('en-GB')}` : ''}
                  </Text>
                ) : (
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    Save settings to verify this payout destination.
                  </Text>
                )}
                <Text
                  variant="bodySmall"
                  style={[
                    styles.availability,
                    {
                      backgroundColor: data?.managedPaymentsAvailable ? colors.tertiaryContainer : colors.errorContainer,
                      color: data?.managedPaymentsAvailable ? colors.onTertiaryContainer : colors.onErrorContainer,
                    },
                  ]}
                >
                  {data?.managedPaymentsAvailable
                    ? 'DiDwa Managed Payments is available for online checkout.'
                    : 'Managed online checkout is not currently enabled by the platform.'}
                </Text>
              </View>
            </Card>

            {payouts.isLoading ? (
              <Card mode="outlined"><Card.Content><Text>Loading payout balance…</Text></Card.Content></Card>
            ) : payouts.isError ? (
              <Card mode="outlined">
                <Card.Content>
                  <Text style={{ color: colors.error }}>{apiErrorMessage(payouts.error, 'Could not load managed payout details.')}</Text>
                  <Button onPress={() => { void payouts.refetch(); }}>Try again</Button>
                </Card.Content>
              </Card>
            ) : payouts.data ? (
              <Card mode="elevated">
                <View style={styles.cardBody}>
                  <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
                    Managed sales and payouts
                  </Text>
                  <View style={styles.balanceGrid}>
                    {[
                      ['Gross managed sales', payouts.data.balance.totalSalesGhs],
                      [`Platform fees (${payouts.data.platformFeePercent}%)`, payouts.data.balance.platformFeesGhs],
                      ['Net after fees', payouts.data.balance.netPayableGhs],
                      ['Paid out', payouts.data.balance.paidOutGhs],
                      ['Pending payouts', payouts.data.balance.pendingPayoutGhs],
                      ['Available', payouts.data.balance.availableGhs],
                    ].map(([label, amount]) => (
                      <View key={String(label)} style={[styles.balanceItem, { backgroundColor: colors.surfaceVariant }]}>
                        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
                        <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>
                          GHS {Number(amount).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text variant="bodySmall" style={[styles.description, { color: colors.onSurfaceVariant }]}>
                    Minimum payout: GHS {payouts.data.payout.minimumGhs.toFixed(2)}. Requests are manually reviewed.
                  </Text>
                  <TextInput
                    label="Payout amount (GHS)"
                    value={payoutAmount}
                    onChangeText={setPayoutAmount}
                    keyboardType="decimal-pad"
                    mode="outlined"
                    style={styles.input}
                  />
                  <Button
                    mode="contained"
                    icon="cash-fast"
                    onPress={() => payoutMutation.mutate()}
                    loading={payoutMutation.isPending}
                    disabled={
                      payoutMutation.isPending
                      || !payoutAmount
                      || !Number.isFinite(Number(payoutAmount))
                      || Number(payoutAmount) <= 0
                      || !payouts.data.payout.managedMode
                      || !payoutMomoAccountName
                      || !payoutMomoVerifiedAt
                      || Number(payoutAmount) < payouts.data.payout.minimumGhs
                      || Number(payoutAmount) > payouts.data.balance.availableGhs
                    }
                  >
                    Request MoMo payout
                  </Button>
                  {payouts.data.requests.length ? (
                    <View style={styles.history}>
                      <Divider />
                      <Text variant="labelLarge" style={{ color: colors.onSurface }}>Recent payout requests</Text>
                      {payouts.data.requests.slice(0, 5).map((request) => (
                        <View key={request.id} style={styles.historyRow}>
                          <View style={{ flex: 1 }}>
                            <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                              GHS {Number(request.amount_ghs).toFixed(2)} · {request.momo_network}
                            </Text>
                            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                              {new Date(request.requested_at).toLocaleDateString('en-GB')}
                            </Text>
                          </View>
                          <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
                            {request.status}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </Card>
            ) : null}
          </>
        ) : (
          <>
        <Card mode="elevated">
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Paystack</Text>
            <TextInput label="Public key" value={paystackPublic} onChangeText={setPaystackPublic} autoCapitalize="none" mode="outlined" style={styles.input} />
            <PasswordTextInput
              label={settings?.paystack.secretKeyMasked ? `Secret key (${settings.paystack.secretKeyMasked})` : 'Secret key'}
              value={paystackSecret}
              onChangeText={setPaystackSecret}
              autoCapitalize="none"
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
            <PasswordTextInput
              label={settings?.hubtel.clientSecretMasked ? `Client secret (${settings.hubtel.clientSecretMasked})` : 'Client secret'}
              value={hubtelSecret}
              onChangeText={setHubtelSecret}
              autoCapitalize="none"
              mode="outlined"
              style={styles.input}
              placeholder={settings?.hubtel.clientSecretMasked ? 'Leave blank to keep' : undefined}
            />
            <TextInput label="Merchant account ID" value={hubtelMerchant} onChangeText={setHubtelMerchant} autoCapitalize="none" mode="outlined" style={styles.input} />
          </View>
        </Card>
          </>
        )}

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
            {paymentMode === 'BYOK' ? (
              <>
                <Text variant="labelLarge" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Active gateway</Text>
                <View style={styles.gatewayRow}>
                  {['COD', 'PAYSTACK', 'HUBTEL'].map((g) => (
                    <Button key={g} mode={activeGateway === g ? 'contained' : 'outlined'} onPress={() => setActiveGateway(g)} style={styles.gatewayBtn} compact>
                      {g}
                    </Button>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        </Card>

        {data && !data.storageConfigured && paymentMode === 'BYOK' ? (
          <Text variant="bodySmall" style={[styles.warn, { backgroundColor: colors.errorContainer, color: colors.onErrorContainer }]}>
            Secure key storage isn’t configured on the server, so keys can’t be saved yet.
          </Text>
        ) : null}

        <Button
          mode="contained"
          onPress={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          disabled={saveMutation.isPending || Boolean(data && !data.storageConfigured && paymentMode === 'BYOK')}
          style={styles.save}
        >
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
  description: { marginBottom: 8 },
  input: { marginBottom: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gatewayRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  gatewayBtn: { flex: 1 },
  modeButton: { flex: 1 },
  networkButton: { flex: 1, paddingHorizontal: 0 },
  verified: { marginBottom: 8, fontWeight: '600' },
  availability: { padding: 10, borderRadius: 8, overflow: 'hidden', marginTop: 8 },
  balanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  balanceItem: { width: '47%', padding: 10, borderRadius: 8, gap: 4 },
  history: { marginTop: 16, gap: 8 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  warn: { padding: 12, borderRadius: 8 },
  save: { marginTop: 8 },
});
