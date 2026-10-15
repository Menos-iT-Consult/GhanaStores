import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, Menu, Snackbar, Text, useTheme } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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

/** Download the receipt PDF and hand it to the OS share sheet. */
async function shareReceipt(orderId: string, orderNumber: string): Promise<void> {
  const blob = await endpoints.getOrderReceiptBlob(orderId);
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      resolve(dataUrl.includes(',') ? dataUrl.split(',')[1] : '');
    };
    reader.onerror = () => reject(new Error('Could not read the receipt file.'));
    reader.readAsDataURL(blob);
  });
  if (!base64) throw new Error('The receipt came back empty.');
  const target = `${FileSystem.cacheDirectory}receipt-${orderNumber}.pdf`;
  await FileSystem.writeAsStringAsync(target, base64, { encoding: FileSystem.EncodingType.Base64 });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(target, { mimeType: 'application/pdf', dialogTitle: 'Share receipt' });
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

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
      qc.invalidateQueries({ queryKey: ['dashboard-full'] });
    },
    onError: (err) => setSnack(apiErrorMessage(err, 'Could not update order.')),
  });

  const onShareReceipt = async () => {
    if (!data) return;
    setSharing(true);
    try {
      await shareReceipt(String(id), data.order.orderNumber);
    } catch (err) {
      setSnack(apiErrorMessage(err, 'Could not share the receipt.'));
    } finally {
      setSharing(false);
    }
  };

  const order = data?.order;
  const items = data?.items ?? [];
  const msisdn = useMemo(() => toMsisdn(order?.customer?.phone || ''), [order?.customer?.phone]);

  if (isLoading) return <LoadingState label="Loading order…" />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} />;
  if (!order) return <EmptyState title="Order not found" />;

  const actions = nextActions(order.status);
  return (
    <View style={styles.root}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={`Order #${order.orderNumber}`} titleStyle={styles.title} />
        <Appbar.Action
          icon="share-variant"
          onPress={onShareReceipt}
          disabled={sharing}
          accessibilityLabel="Share receipt"
        />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <View style={styles.rowBetween}>
              <Text variant="titleMedium" style={styles.amount}>{formatGhs(order.totalAmount)}</Text>
              <StatusBadge status={order.status} />
            </View>
            <Text variant="bodySmall" style={styles.muted}>
              {order.paymentMethod} · placed {new Date(order.createdAt).toLocaleString()}
            </Text>
            <Button
              mode="contained-tonal"
              icon="file-pdf-box"
              loading={sharing}
              disabled={sharing}
              onPress={onShareReceipt}
              style={styles.receiptBtn}
            >
              Share receipt (PDF)
            </Button>
          </View>
        </Card>

        {items.length > 0 ? (
          <Card mode="elevated" style={styles.card}>
            <View style={styles.cardBody}>
              <Text variant="titleSmall" style={styles.sectionTitle}>Items</Text>
              {items.map((it, i) => (
                <View key={it.id} style={[styles.itemRow, i > 0 && styles.divider]}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text variant="bodyLarge" style={styles.itemName}>{it.productName}</Text>
                    {it.variantLabel ? <Text variant="bodySmall" style={styles.muted}>{it.variantLabel}</Text> : null}
                    <Text variant="bodySmall" style={styles.muted}>
                      {it.quantity} × {formatGhs(it.unitPrice)}
                    </Text>
                  </View>
                  <Text variant="titleSmall" style={styles.amount}>{formatGhs(it.lineTotal)}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Customer</Text>
            <Text variant="bodyLarge" style={styles.customerName}>{order.customer?.name || 'Customer'}</Text>
            <Text variant="bodyMedium" style={styles.muted}>{order.customer?.phone}</Text>
            <Text variant="bodyMedium" style={styles.muted}>{order.customer?.address}</Text>
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
                onPress={() => Linking.openURL(`https://wa.me/${msisdn}?text=${encodeURIComponent(`Hi ${order.customer?.name || ''}, about your DiDwa order #${order.orderNumber}.`)}`)}
              >
                WhatsApp
              </Button>
            </View>
          </View>
        </Card>

        {order.notes ? (
          <Card mode="elevated" style={styles.card}>
            <View style={styles.cardBody}>
              <Text variant="titleSmall" style={styles.sectionTitle}>Notes</Text>
              <Text variant="bodyMedium" style={styles.muted}>{order.notes}</Text>
            </View>
          </Card>
        ) : null}
        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Update status</Text>
            {actions.length === 0 ? (
              <Text variant="bodyMedium" style={styles.muted}>
                This order is {String(order.status).toLowerCase()} — no further actions.
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
  receiptBtn: { marginTop: 14, alignSelf: 'flex-start' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  divider: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  itemName: { color: '#0F172A', fontWeight: '600' },
});