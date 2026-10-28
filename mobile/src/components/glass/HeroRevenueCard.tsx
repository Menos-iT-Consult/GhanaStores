import React, { useState } from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useGlass, type GlassTokens } from './glass';
import { useCountUp } from './useCountUp';
import { formatGhs } from '@/theme';

/**
 * Revenue summary content with a selectable rolling 7- or 30-day period.
 */
export function HeroRevenueCard({
  storeName,
  revenue7Days,
  revenue30Days,
}: {
  storeName: string;
  revenue7Days: number;
  revenue30Days: number;
}) {
  const g = useGlass();
  const [period, setPeriod] = useState<7 | 30>(7);
  const revenue = period === 7 ? revenue7Days : revenue30Days;
  const animated = useCountUp(revenue);

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.store(g)} numberOfLines={1}>
          {storeName}
        </Text>
        <View style={[styles.toggle, { backgroundColor: g.glassBorder }]}>
          {([7, 30] as const).map((days) => (
            <Pressable
              key={days}
              accessibilityRole="button"
              accessibilityState={{ selected: period === days }}
              accessibilityLabel={`Show revenue for ${days} days`}
              onPress={() => setPeriod(days)}
              style={[
                styles.toggleOption,
                period === days && { backgroundColor: g.card },
              ]}
            >
              <Text style={[styles.toggleText(g), period === days && { color: g.ink }]}>
                {days} days
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Text style={styles.caption(g)}>Revenue · last {period} days</Text>
      <Text style={styles.amount(g)}>{formatGhs(animated)}</Text>
    </View>
  );
}

const styles = {
  content: { flex: 1, justifyContent: 'center' } satisfies ViewStyle,
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 } satisfies ViewStyle,
  toggle: { flexDirection: 'row', padding: 3, borderRadius: 12 } satisfies ViewStyle,
  toggleOption: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9 } satisfies ViewStyle,
  store: (g: GlassTokens): TextStyle => ({ color: g.muted, fontSize: 13, fontWeight: '600' }),
  toggleText: (g: GlassTokens): TextStyle => ({ color: g.muted, fontSize: 11, fontWeight: '700' }),
  caption: (g: GlassTokens): TextStyle => ({ color: g.muted, fontSize: 12, marginTop: 14 }),
  amount: (g: GlassTokens): TextStyle => ({
    color: g.ink,
    fontSize: 32,
    fontWeight: '700',
    marginTop: 2,
  }),
};
