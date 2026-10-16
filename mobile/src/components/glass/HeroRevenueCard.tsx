import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GLASS, HERO_SHADOW } from './glass';
import { Sparkline } from './Sparkline';
import { useCountUp } from './useCountUp';
import { formatGhs } from '@/theme';

export type HeroRange = 7 | 30;

/**
 * Floating hero revenue card: semi-transparent Deep Blue glass panel,
 * glowing white revenue figure (smooth count-up) + animated emerald
 * micro-sparkline with a pulsing neon trail.
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
  const animated = useCountUp(todayRevenue);

  return (
    <View style={styles.float}>
      <LinearGradient
        colors={[GLASS.heroStart, GLASS.heroMid, GLASS.heroEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        {/* diagonal studio spotlight wash */}
        <LinearGradient
          colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Text style={styles.store} numberOfLines={1}>
          {storeName}
        </Text>
        <Text style={styles.caption}>{periodLabel} revenue</Text>
        <Text style={styles.amount}>{formatGhs(animated)}</Text>
        <View style={styles.row}>
          <Sparkline values={sparkValues} />
          <View style={styles.toggle}>
            {([7, 30] as HeroRange[]).map((r) => (
              <Pressable
                key={r}
                accessibilityRole="button"
                accessibilityLabel={`Show last ${r} days`}
                onPress={() => onRangeChange(r)}
                style={[styles.chip, range === r && styles.chipActive]}
              >
                <Text style={[styles.chipText, range === r && styles.chipTextActive]}>
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

const styles = StyleSheet.create({
  float: {
    ...HERO_SHADOW,
    borderRadius: GLASS.radius,
  },
  hero: {
    borderRadius: GLASS.radius,
    borderWidth: 1.5,
    borderColor: GLASS.glassBorder,
    padding: 18,
    overflow: 'hidden',
  },
  store: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  caption: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 8 },
  amount: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(255,255,255,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    marginTop: 2,
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 },
  toggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, padding: 3 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  chipActive: { backgroundColor: 'rgba(255,255,255,0.9)' },
  chipText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: GLASS.blueDeep },
});
