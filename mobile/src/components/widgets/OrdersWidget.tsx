import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, IconButton, Text } from 'react-native-paper';
import { formatGhs } from '@/theme';
import { widgetCard, widgetMuted, widgetTitle } from './styles';
import type { WidgetSnapshotOrder } from '@/widgets/snapshot';

/** Latest orders + pending count, with a deep-link into the orders tab. */
export function OrdersWidget({
  orders,
  pendingOrders,
  onSeeAll,
}: {
  orders: WidgetSnapshotOrder[];
  pendingOrders: number;
  onSeeAll?: () => void;
}) {
  return (
    <Card mode="elevated" style={widgetCard.card}>
      <View style={styles.head}>
        <Text variant="titleSmall" style={widgetTitle}>
          Orders{pendingOrders > 0 ? ` · ${pendingOrders} pending` : ''}
        </Text>
        {onSeeAll ? <IconButton icon="arrow-right" size={20} onPress={onSeeAll} accessibilityLabel="See all orders" /> : null}
      </View>
      {orders.length === 0 ? (
        <Text variant="bodyMedium" style={widgetMuted}>
          New orders will appear here.
        </Text>
      ) : (
        orders.slice(0, 3).map((o, i) => (
          <View key={o.id} style={[styles.row, i > 0 && styles.divider]}>
            <View style={styles.main}>
              <Text variant="bodyMedium" style={styles.name} numberOfLines={1}>
                #{o.orderNumber} · {o.customerName}
              </Text>
              <Text variant="bodySmall" style={widgetMuted}>
                {o.status}
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.total}>
              {formatGhs(o.total)}
            </Text>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  divider: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  main: { flex: 1, marginRight: 10 },
  name: { color: '#0F172A', fontWeight: '600' },
  total: { color: '#0F172A', fontWeight: '700' },
});
