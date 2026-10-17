import React from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useGlass, type GlassTokens } from './glass';
import { Sparkline } from './Sparkline';
import { useCountUp } from './useCountUp';
import { formatGhs } from '@/theme';

export type HeroRange = 7 | 30;

/**
 * Hero revenue card: a flat M3 filled card (primaryContainer) with the
 * store name, period label, animated count-up revenue figure, a quiet
 * sparkline and a small 7d/30d segmented toggle. No gradients, no glow.
 */
export function HeroRevenueCard({
  storeName,
  todayRevenue,
  range,
  onRangeChange,
  sparkValues,
  periodLabel,
}: {
  storeName: string;
  todayRevenue: number;
  range: HeroRange;
  onRangeChange: (r: HeroRange) => void;
  sparkValues: number[];
  periodLabel: string;
}) {
  const g = useGlass();
  const animated = useCountUp(todayRevenue);

  return (
    <View style={styles.card(g)}>
      <Text style={styles.store(g)} numberOfLines={1}>
        {storeName}
      </Text>
      <Text style={styles.caption(g)}>{periodLabel} revenue</Text>
      <Text style={styles.amount(g)}>{formatGhs(animated)}</Text>
      <View style={styles.row}>
        <Sparkline values={sparkValues} stroke={g.blue} />
        <View style={styles.toggle(g)}>
          {([7, 30] as HeroRange[]).map((r) => (
            <Pressable
              key={r}
              accessibilityRole="button"
              accessibilityLabel={`Show last ${r} days`}
              onPress={() => onRangeChange(r)}
              style={[styles.chip, range === r && styles.chipActive(g)]}
            >
              <Text style={[styles.chipText(g), range === r && styles.chipTextActive(g)]}>
                {r}d
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = {
  card: (g: GlassTokens): ViewStyle => ({
    backgroundColor: g.blueFill,
    borderRadius: g.radius,
    padding: 16,
  }),
  store: (g: GlassTokens): TextStyle => ({ color: g.muted, fontSize: 13, fontWeight: '600' }),
  caption: (g: GlassTokens): TextStyle => ({ color: g.muted, fontSize: 12, marginTop: 8 }),
  amount: (g: GlassTokens): TextStyle => ({
    color: g.ink,
    fontSize: 32,
    fontWeight: '700',
    marginTop: 2,
  }),
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 } satisfies ViewStyle,
  toggle: (g: GlassTokens): ViewStyle => ({
    flexDirection: 'row',
    backgroundColor: g.card,
    borderRadius: 999,
    padding: 3,
  }),
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  } satisfies ViewStyle,
  chipActive: (g: GlassTokens): ViewStyle => ({ backgroundColor: g.blueFill }),
  chipText: (g: GlassTokens): TextStyle => ({ color: g.muted, fontSize: 12, fontWeight: '600' }),
  chipTextActive: (g: GlassTokens): TextStyle => ({ color: g.blue }),
};

