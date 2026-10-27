import React, { useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useGlass, type GlassTokens } from './glass';
import { HeroRevenueCard } from './HeroRevenueCard';
import { TrendWidget } from '@/components/widgets/TrendWidget';
import { GlassCard } from './GlassCard';

/**
 * Horizontal carousel of revenue cards: hero revenue card + revenue trend card.
 * Swipe left/right to browse between revenue overview and the 6-month trend.
 */
export function RevenueCarousel({
  storeName,
  heroRevenue,
  heroLabel,
  trendPoints,
}: {
  storeName: string;
  heroRevenue: number;
  heroLabel: string;
  trendPoints: { month: string; revenue: number }[];
}) {
  const g = useGlass();
  const { width } = useWindowDimensions();
  const [activePage, setActivePage] = useState(0);
  const cardWidth = Math.max(0, width - 32);

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={(event) => {
          setActivePage(Math.round(event.nativeEvent.contentOffset.x / cardWidth));
        }}
        contentContainerStyle={styles.row}
        accessibilityLabel="Revenue overview and six-month trend"
      >
        <View style={[styles.cardWrap, { width: cardWidth }]}>
          <HeroRevenueCard
            storeName={storeName}
            revenue={heroRevenue}
            periodLabel={heroLabel}
          />
        </View>

        <View style={[styles.cardWrap, { width: cardWidth }]}>
          <GlassCard style={styles.trendCard(g)}>
            <TrendWidget points={trendPoints} />
          </GlassCard>
        </View>
      </ScrollView>
      <View style={styles.indicatorRow} accessibilityLabel={`Card ${activePage + 1} of 2`}>
        {[0, 1].map((page) => (
          <View
            key={page}
            style={[
              styles.indicator,
              { backgroundColor: page === activePage ? g.blue : g.glassBorder },
            ]}
          />
        ))}
        <Text style={[styles.indicatorLabel, { color: g.muted }]}>
          {activePage === 0 ? 'Today' : '6-month trend'}
        </Text>
      </View>
    </View>
  );
}

const styles = {
  row: {
    paddingVertical: 8,
    alignItems: 'flex-start',
  } satisfies ViewStyle,
  cardWrap: { paddingRight: 0 } satisfies ViewStyle,
  trendCard: (g: GlassTokens): ViewStyle => ({
    padding: 16,
    alignItems: 'center',
  }) satisfies ViewStyle,
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 18,
    marginTop: 1,
  } satisfies ViewStyle,
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } satisfies ViewStyle,
  indicatorLabel: {
    fontSize: 11,
    marginLeft: 4,
  },
};