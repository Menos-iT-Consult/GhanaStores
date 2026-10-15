import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { formatGhs } from '@/theme';
import { widgetCard, widgetMuted, widgetTitle } from './styles';

/** Three-cell KPI strip mirroring the home-screen widget content. */
export function KpiWidget({
  todayRevenue,
  weekRevenue,
  paidOrders,
}: {
  todayRevenue: number;
  weekRevenue: number;
  paidOrders: number;
}) {
  const cells = [
    { label: 'Today', value: formatGhs(todayRevenue) },
    { label: 'This week', value: formatGhs(weekRevenue) },
    { label: 'Paid orders', value: String(paidOrders) },
  ];
  return (
    <Card mode="elevated" style={widgetCard.card}>
      <View style={styles.row}>
        {cells.map((c, i) => (
          <View key={c.label} style={[styles.cell, i > 0 && styles.divider]}>
            <Text variant="labelSmall" style={styles.label}>
              {c.label.toUpperCase()}
            </Text>
            <Text variant="titleMedium" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
              {c.value}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

export function widgetMutedText(text: string) {
  return (
    <Text variant="bodyMedium" style={widgetMuted}>
      {text}
    </Text>
  );
}

export function widgetSectionTitle(title: string) {
  return (
    <Text variant="titleSmall" style={widgetTitle}>
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, paddingHorizontal: 4 },
  divider: { borderLeftWidth: 1, borderLeftColor: '#F1F5F9', paddingLeft: 12 },
  label: { color: '#64748B', letterSpacing: 0.4 },
  value: { color: '#0F172A', fontWeight: '700', marginTop: 2 },
});
