import React from 'react';
import { ScrollView, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useGlass, type GlassTokens } from './glass';
import { HeroRevenueCard, type HeroRange } from './HeroRevenueCard';
import { TrendWidget } from '@/components/widgets/TrendWidget';
import { GlassCard } from './GlassCard';

/**
 * Horizontal carousel of revenue cards: hero revenue card + revenue trend card.
 * Swipe left/right to browse between revenue overview and the 6-month trend.
 */
export function RevenueCarousel({
  storeName,
  heroRevenue,
  range,
  onRangeChange,
  sparkValues,
  heroLabel,
  trendPoints,
}: {
  storeName: string;
  heroRevenue: number;
  range: HeroRange;
  onRangeChange: (r: HeroRange) => void;
  sparkValues: number[];
  heroLabel: string;
  trendPoints: { month: string; revenue: number }[];
}) {
  const g = useGlass();
  const { width } = useWindowDimensions();

  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      contentContainerStyle={styles.row(g)}
    >
      {/* Card 1 · Hero revenue (7d / 30d) */}
      <View style={[styles.cardWrap(g), { width }]}>
        <HeroRevenueCard
          storeName={storeName}
          todayRevenue={heroRevenue}
          range={range}
          onRangeChange={onRangeChange}
          sparkValues={sparkValues}
          periodLabel={heroLabel}
        />
      </View>

      {/* Card 2 · Revenue trend (6-month bars) */}
      <View style={[styles.cardWrap(g), { width }]}>
        <GlassCard style={styles.trendCard(g)}>
          <TrendWidget points={trendPoints} />
        </GlassCard>
      </View>
    </ScrollView>
  );
}

const styles = {
  row: (g: GlassTokens): ViewStyle => ({
    paddingHorizontal: 0,
    paddingVertical: 8,
    gap: 0,
    alignItems: 'flex-start',
  }) satisfies ViewStyle,
  cardWrap: (g: GlassTokens): ViewStyle => ({
    width: '100%',
  }) satisfies ViewStyle,
  trendCard: (g: GlassTokens): ViewStyle => ({
    padding: 16,
    alignItems: 'center',
  }) satisfies ViewStyle,
};