import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, Divider, Snackbar, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeBack } from '@/lib/useSafeBack';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import type { PaymentSettings } from '@/types';

/** Manage the store's own (BYOK) gateway keys + Cash on Delivery, exactly like the PWA's /settings/payments. Secret keys are only ever shown masked; a blank field means "keep the currently stored value" (the backend merges it). */
export default function PaymentsSettingsScreen() {
  const goBack = useSafeBack('/settings');
  const qc = useQueryClient();
  const { colors } = useTheme();

  const { data, isLoading, isError, error } = useQuery({
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
  const [snack, setSnack] = useState<string | null>(null);

  const settings: PaymentSettings | undefined = data?.settings;

  useEffect(() => {
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