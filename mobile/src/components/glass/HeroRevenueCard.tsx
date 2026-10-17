import React from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlass, type GlassTokens } from './glass';
import { Sparkline } from './Sparkline';
import { useCountUp } from './useCountUp';
import { formatGhs } from '@/theme';
import { ACCENT } from '@/theme';

export type HeroRange = 7 | 30;

/**
 * Floating hero revenue card: theme-aware translucent glass panel, Electric
 * Emerald gradient (Revenue & Sales accent), glowing revenue figure (smooth
 * count-up) + animated neon micro-sparkline with a pulsing trail.
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
    <View style={styles.float(g)}>
      <LinearGradient
        colors={[g.heroStart, g.heroMid, g.heroEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero(g)}
      >
        {/* diagonal studio spotlight wash */} 
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Text style={styles.store(g)} numberOfLines={1}>
          {storeName}
        </Text>
        <Text style={styles.caption(g)}>{periodLabel} revenue</Text>
        <Text style={styles.amount(g)}>{formatGhs(animated)}</Text>
        <View style={styles.row}>
          <Sparkline values={sparkValues} stroke={ACCENT.revenue} />
          <View style={styles.toggle}>
            {([7, 30] as HeroRange[]).map((r) => (
              <Pressable
                key={r}
                accessibilityRole="button"
                accessibilityLabel={`Show last ${r} days`}
                onPress={() => onRangeChange(r)}
                style={[styles.chip(g), range === r && styles.chipActive(g)]}
              >
                <Text style={[styles.chipText(g), range === r && styles.chipTextActive(g)]}>
                  {r}d
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = {
  float: (g: GlassTokens): ViewStyle => ({
    ...g.heroShadow,
    borderRadius: g.radius,
  }),
  hero: (g: GlassTokens): ViewStyle => ({
    borderRadius: g.radius,
    borderWidth: 1,
    borderColor: g.glassBorder,
    padding: 18,
    overflow: 'hidden',
  }),
  store: (g: GlassTokens): TextStyle => ({
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  }),
  caption: (g: GlassTokens): TextStyle => ({
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 8,
  }),
  amount: (g: GlassTokens): TextStyle => ({
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(255,255,255,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    marginTop: 2,
  }),
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 } satisfies ViewStyle,
  toggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, padding: 3 } satisfies ViewStyle,
  chip: (g: GlassTokens): ViewStyle => ({
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  }),
  chipActive: (g: GlassTokens): ViewStyle => ({
    backgroundColor: 'rgba(255,255,255,0.85)',
  }),
  chipText: (g: GlassTokens): TextStyle => ({
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
  }),
  chipTextActive: (g: GlassTokens): TextStyle => ({
    color: g.emerald,
  }),
};

