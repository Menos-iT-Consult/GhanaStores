import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, Menu, Snackbar, Text, useTheme } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { formatGhs } from '@/theme';
import type { OrderStatus } from '@/types';

/** E.164-ish MSISDN (no leading +/0) for tel: and wa.me links. */
function toMsisdn(raw: string): string {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits.slice(1);
  if (digits.startsWith('233')) return digits;
  if (digits.startsWith('0')) return `233${digits.slice(1)}`;
  return digits;
}

/** Sensible next statuses given the current one (mirrors the order lifecycle). */
function nextActions(status: string): { label: string; status: OrderStatus }[] {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING':
      return [{ label: 'Mark as paid', status: 'PAID' }, { label: 'Cancel order', status: 'CANCELLED' }];
    case 'PAID':
      return [{ label: 'Mark processing', status: 'FULFILLED' }, { label: 'Cancel order', status: 'CANCELLED' }];
    case 'FULFILLED':
      return [{ label: 'Mark delivered', status: 'DELIVERED' }, { label: 'Cancel order', status: 'CANCELLED' }];
    default:
      return [];
  }
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => endpoints.getOrder(id as string),
    enabled: Boolean(id),
  });

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => endpoints.updateOrderStatus(id as string, status),
    onSuccess: (res) => {
      setSnack(res.message || 'Order updated.');
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err) => setSnack(apiErrorMessage(err, 'Could not update order.')),
  });

  const msisdn = useMemo(() => toMsisdn(data?.customer?.phone || ''), [data?.customer?.phone]);

  if (isLoading) return <LoadingState label="Loading order…" />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} />;
  if (!data) return <EmptyState title="Order not found" />;

  const actions = nextActions(data.status);

  return (
    <View style={styles.root}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={`Order #${data.orderNumber}`} titleStyle={styles.title} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <View style={styles.rowBetween}>
              <Text variant="titleMedium" style={styles.amount}>{formatGhs(data.totalAmount)}</Text>
              <StatusBadge status={data.status} />
            </View>
            <Text variant="bodySmall" style={styles.muted}>
              Placed {new Date(data.createdAt).toLocaleString()} · {data.paymentMethod}
            </Text>
            {data.paymentStatus ? (
              <Text variant="bodySmall" style={styles.muted}>Payment: {data.paymentStatus}</Text>
            ) : null}
          </View>
        </Card>

        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Customer</Text>
            <Text variant="bodyLarge" style={styles.customerName}>{data.customer?.name || 'Customer'}</Text>
            <Text variant="bodyMedium" style={styles.muted}>{data.customer?.phone}</Text>
            <Text variant="bodyMedium" style={styles.muted}>{data.customer?.address}</Text>
            <View style={styles.contactRow}>
              <Button mode="contained" icon="phone" style={[styles.contactBtn, { flex: 1 }]} disabled={!msisdn} onPress={() => Linking.openURL(`tel:${msisdn}`)}>
                Call
              </Button>
              <Button
                mode="contained-tonal"
                icon="whatsapp"
                style={[styles.contactBtn, { flex: 1, backgroundColor: '#DCFCE7' }]}
                textColor="#166534"
                disabled={!msisdn}
                onPress={() => Linking.openURL(`https://wa.me/${msisdn}?text=${encodeURIComponent(`Hi ${data.customer?.name || ''}, about your DiDwa order #${data.orderNumber}.`)}`)}
              >
                WhatsApp
              </Button>
            </View>
          </View>
        </Card>

        {data.notes ? (
          <Card mode="elevated" style={styles.card}>
            <View style={styles.cardBody}>
              <Text variant="titleSmall" style={styles.sectionTitle}>Notes</Text>
              <Text variant="bodyMedium" style={styles.muted}>{data.notes}</Text>
            </View>
          </Card>
        ) : null}

        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Update status</Text>
            {actions.length === 0 ? (
              <Text variant="bodyMedium" style={styles.muted}>
                This order is {String(data.status).toLowerCase()} — no further actions.
              </Text>
            ) : (
              <Menu
                visible={menuOpen}
                onDismiss={() => setMenuOpen(false)}
                anchor={
                  <Button mode="outlined" icon="swap-vertical" onPress={() => setMenuOpen(true)} loading={statusMutation.isPending}>
                    Change status
                  </Button>
                }
              >
                {actions.map((a) => (
                  <Menu.Item key={a.status} title={a.label} onPress={() => { setMenuOpen(false); statusMutation.mutate(a.status); }} />
                ))}
              </Menu>
            )}
          </View>
        </Card>
      </ScrollView>

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)} duration={3500}>
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  title: { color: '#0F172A', fontWeight: '700' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF' },
  cardBody: { padding: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount: { color: '#0066FF', fontWeight: '800' },
  muted: { color: '#64748B', marginTop: 4 },
  sectionTitle: { color: '#0F172A', fontWeight: '700', marginBottom: 8 },
  customerName: { color: '#0F172A', fontWeight: '600' },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  contactBtn: { backgroundColor: '#0066FF' },
});
