import React from 'react';
import { View, type TextStyle, type ViewStyle } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { formatGhs } from '@/theme';
import { GlassCard } from '@/components/glass/GlassCard';
import { useGlass, type GlassTokens } from '@/components/glass/glass';
import { ACCENT } from '@/theme';
import type { WidgetSnapshotOrder } from '@/widgets/snapshot';

/** Latest orders + pending count, dark glass card, deep-link into the orders tab. */
export function OrdersWidget({
  orders,
  pendingOrders,
  onSeeAll,
}: {
  orders: WidgetSnapshotOrder[];
  pendingOrders: number;
  onSeeAll?: () => void;
}) {
  const g = useGlass();
  return (
    <GlassCard style={styles.card(g)}>
      <View style={styles.head}>
        <Text variant="titleSmall" style={styles.title(g)}>
          Orders{pendingOrders > 0 ? ` · ${pendingOrders} pending` : ''}
        </Text>
        {onSeeAll ? (
          <IconButton
            icon="arrow-right"
            size={20}
            iconColor={ACCENT.primary}
            onPress={onSeeAll}
            accessibilityLabel="See all orders"
          />
        ) : null}
      </View>
      {orders.length === 0 ? (
        <Text variant="bodyMedium" style={styles.muted(g)}>
          New orders will appear here.
        </Text>
      ) : (
        orders.slice(0, 3).map((o, i) => (
          <View key={o.id} style={[styles.row, i > 0 && styles.divider(g)]}>
            <View style={styles.main}>
              <Text variant="bodyMedium" style={styles.name(g)} numberOfLines={1}>
                #{o.orderNumber} · {o.customerName}
              </Text>
              <Text variant="bodySmall" style={styles.status(g)}>
                {o.status}
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.total(g)}>
              {formatGhs(o.total)}
            </Text>
          </View>
        ))
      )}
    </GlassCard>
  );
}

const styles = {
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 } satisfies ViewStyle,
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 } satisfies ViewStyle,
  divider: (g: GlassTokens): ViewStyle => ({ borderTopWidth: 1, borderTopColor: g.glassBorder }),
  main: { flex: 1, marginRight: 10 } satisfies ViewStyle,
  title: (g: GlassTokens): TextStyle => ({ color: g.ink, fontWeight: '700' }),
  muted: (g: GlassTokens): TextStyle => ({ color: g.muted }),
  name: (g: GlassTokens): TextStyle => ({ color: g.ink, fontWeight: '600' }),
  status: (g: GlassTokens): TextStyle => ({ color: g.muted, fontWeight: '600' }),
  total: (g: GlassTokens): TextStyle => ({ color: g.ink, fontWeight: '700' }),
  card: (g: GlassTokens): ViewStyle => ({ marginTop: 12, padding: 16 }),
};

