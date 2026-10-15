import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { widgetCard, widgetMuted, widgetTitle } from './styles';

/** CSS-style mini bars for the 6-month revenue trend. No chart dep needed. */
export function TrendWidget({ points }: { points: { month: string; revenue: number }[] }) {
  const recent = points.slice(-6);
  const values = recent.map((p) => Math.max(0, Number(p?.revenue) || 0));
  const max = Math.max(...values, 1);
  const empty = values.every((v) => v === 0);
  return (
    <Card mode="elevated" style={widgetCard.card}>
      <Text variant="titleSmall" style={widgetTitle}>
        Revenue trend
      </Text>
      {empty ? (
        <Text variant="bodyMedium" style={widgetMuted}>
          No paid sales yet — your trend will appear here.
        </Text>
      ) : (
        <View style={styles.bars}>
          {recent.map((p, i) => (
            <View key={`${p.month}-${i}`} style={styles.col}>
              <View style={[styles.bar, { height: Math.max(4, Math.round((values[i] / max) * 64)) }]} />
              <Text variant="labelSmall" style={styles.label} numberOfLines={1}>
                {String(p.month ?? '').slice(0, 3)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12, height: 96 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 18, borderRadius: 4, backgroundColor: '#0066FF' },
  label: { marginTop: 6, color: '#94A3B8' },
});
