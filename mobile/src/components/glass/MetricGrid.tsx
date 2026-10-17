import React from 'react';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { GlassCard } from './GlassCard';
import { useGlass, type GlassTokens } from './glass';
import { useCountUp } from './useCountUp';

export interface Metric {
  label: string;
  value: number;
  format: (n: number) => string;
  /** MaterialCommunityIcons name (cast to any at render — version-safe). */
  icon: string;
  /** Category accent color for the dot, icon chip border and icon. */
  accent: string;
}

/**
 * 2x2 frosted metric grid. Each metric carries its own category accent so a
 * glance tells the merchant whether they're looking at revenue, orders, POS
 * or inventory.
 */
export function MetricGrid({ metrics }: { metrics: [Metric, Metric, Metric, Metric] }) {
  const g = useGlass();
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <MetricCell metric={metrics[0]} g={g} />
        <MetricCell metric={metrics[1]} g={g} />
      </View>
      <View style={styles.row}>
        <MetricCell metric={metrics[2]} g={g} />
        <MetricCell metric={metrics[3]} g={g} />
      </View>
    </View>
  );
}

function MetricCell({ metric, g }: { metric: Metric; g: GlassTokens }) {
  const animated = useCountUp(metric.value);
  // Soft accent-tinted icon chip: accent at ~10% alpha reads as an M3
  // tonal container over either surface.
  const chipBg = metric.accent + '1A';
  return (
    <View style={styles.cell}>
      <GlassCard style={styles.card}>
        <View style={styles.top}>
          <View style={[styles.iconChip, { backgroundColor: chipBg }]}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <MaterialCommunityIcons name={metric.icon as any} size={17} color={metric.accent} />
          </View>
          <View style={[styles.dot, { backgroundColor: metric.accent }]} />
        </View>
        <Text style={styles.value(g)} numberOfLines={1}>
          {metric.format(animated)}
        </Text>
        <Text style={styles.label(g)} numberOfLines={1}>
          {metric.label}
        </Text>
      </GlassCard>
    </View>
  );
}

const styles = {
  grid: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 } satisfies ViewStyle,
  cell: { flex: 1 },
  card: { padding: 15 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 } satisfies ViewStyle,
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  dot: { width: 8, height: 8, borderRadius: 4 },
  value: (g: GlassTokens): TextStyle => ({ color: g.ink, fontSize: 19, fontWeight: '700' }),
  label: (g: GlassTokens): TextStyle => ({ color: g.muted, fontSize: 12, marginTop: 2 }),
};


