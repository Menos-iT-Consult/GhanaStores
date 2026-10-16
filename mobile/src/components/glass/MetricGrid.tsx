import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { GlassCard } from './GlassCard';
import { GLASS } from './glass';
import { useCountUp } from './useCountUp';

export interface Metric {
  label: string;
  value: number;
  format: (n: number) => string;
  /** MaterialCommunityIcons name (cast to any at render — version-safe). */
  icon: string;
  dot: string;
}

/**
 * 2x2 frosted metric grid with smooth dynamic counter animations
 * and emerald/blue/amber status dots.
 */
export function MetricGrid({ metrics }: { metrics: [Metric, Metric, Metric, Metric] }) {
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <MetricCell metric={metrics[0]} />
        <MetricCell metric={metrics[1]} />
      </View>
      <View style={styles.row}>
        <MetricCell metric={metrics[2]} />
        <MetricCell metric={metrics[3]} />
      </View>
    </View>
  );
}

function MetricCell({ metric }: { metric: Metric }) {
  const animated = useCountUp(metric.value);
  return (
    <View style={styles.cell}>
      <GlassCard style={styles.card}>
        <View style={styles.top}>
          <View style={styles.iconChip}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <MaterialCommunityIcons name={metric.icon as any} size={17} color={GLASS.blue} />
          </View>
          <View style={[styles.dot, { backgroundColor: metric.dot }]} />
        </View>
        <Text style={styles.value} numberOfLines={1}>
          {metric.format(animated)}
        </Text>
        <Text style={styles.label} numberOfLines={1}>
          {metric.label}
        </Text>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  cell: { flex: 1 },
  card: { padding: 15 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,102,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  value: { color: GLASS.ink, fontSize: 19, fontWeight: '800' },
  label: { color: GLASS.muted, fontSize: 12, marginTop: 2 },
});
