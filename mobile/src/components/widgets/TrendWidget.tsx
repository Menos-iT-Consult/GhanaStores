import React from 'react';
import { View, type TextStyle, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useGlass, type GlassTokens } from '@/components/glass/glass';

/** Quiet mini bars for the 6-month revenue trend carousel card. */
export function TrendWidget({ points }: { points: { month: string; revenue: number }[] }) {
  const g = useGlass();
  const recent = points.slice(-6);
  const values = recent.map((p) => Math.max(0, Number(p?.revenue) || 0));
  const max = Math.max(...values, 1);
  const empty = values.every((v) => v === 0);
  return (
    <View style={styles.card}>
      <Text variant="titleSmall" style={styles.title(g)}>
        Revenue trend
      </Text>
      {empty ? (
        <Text variant="bodyMedium" style={styles.muted(g)}>
          No paid sales yet — your trend will appear here.
        </Text>
      ) : (
        <View style={styles.bars}>
          {recent.map((p, i) => (
            <View key={`${p.month}-${i}`} style={styles.col}>
              <View style={[styles.bar, { height: Math.max(4, Math.round((values[i] / max) * 64)), backgroundColor: g.emerald }]} />
              <Text variant="labelSmall" style={styles.label(g)} numberOfLines={1}>
                {String(p.month ?? '').slice(0, 3)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = {
  card: { flex: 1, justifyContent: 'center' } satisfies ViewStyle,
  bars: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12, height: 96 } satisfies ViewStyle,
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' } satisfies ViewStyle,
  bar: { width: 18, borderRadius: 4 } satisfies ViewStyle,
  label: (g: GlassTokens): TextStyle => ({ marginTop: 6, color: g.muted }),
  title: (g: GlassTokens): TextStyle => ({ color: g.ink, fontWeight: '700', textAlign: 'center' }),
  muted: (g: GlassTokens): TextStyle => ({ color: g.muted }),
};
