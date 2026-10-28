import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native';
import { useGlass, type GlassTokens } from './glass';
import { HeroRevenueCard } from './HeroRevenueCard';
import { TrendWidget } from '@/components/widgets/TrendWidget';
import { formatGhs } from '@/theme';

const CARD_COUNT = 3;
const AUTO_SCROLL_INTERVAL = 6000;

/**
 * Automatically rotating revenue, sales snapshot, and trend cards. Swiping
 * left or right remains available for manual browsing.
 */
export function RevenueCarousel({
  storeName,
  revenue7Days,
  revenue30Days,
  snapshot,
  trendPoints,
}: {
  storeName: string;
  revenue7Days: number;
  revenue30Days: number;
  snapshot: {
    revenueThisWeek: number;
    paidOrders: number;
    averageOrderValue: number;
    lifetimeRevenue: number;
  };
  trendPoints: { month: string; revenue: number }[];
}) {
  const g = useGlass();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activePage, setActivePage] = useState(0);
  const cardWidth = Math.max(0, width - 32);

  useEffect(() => {
    const timer = setInterval(() => {
      const nextPage = (activePage + 1) % CARD_COUNT;
      scrollRef.current?.scrollTo({ x: nextPage * cardWidth, animated: true });
      setActivePage(nextPage);
    }, AUTO_SCROLL_INTERVAL);
    return () => clearInterval(timer);
  }, [activePage, cardWidth]);

  const pageLabels = ['Revenue', 'Sales snapshot', 'Revenue trend'];

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={(event) => {
          const page = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
          setActivePage(Math.min(CARD_COUNT - 1, Math.max(0, page)));
        }}
        contentContainerStyle={styles.row}
        accessibilityLabel="Revenue, sales snapshot, and revenue trend"
      >
        <View style={[styles.cardWrap, { width: cardWidth }]}>
          <View style={styles.card(g, true)}>
            <HeroRevenueCard
              storeName={storeName}
              revenue7Days={revenue7Days}
              revenue30Days={revenue30Days}
            />
          </View>
        </View>

        <View style={[styles.cardWrap, { width: cardWidth }]}>
          <View style={styles.card(g)}>
            <SalesSnapshot snapshot={snapshot} g={g} />
          </View>
        </View>

        <View style={[styles.cardWrap, { width: cardWidth }]}>
          <View style={styles.card(g)}>
            <TrendWidget points={trendPoints} />
          </View>
        </View>
      </ScrollView>
      <View style={styles.indicatorRow} accessibilityLabel={`Card ${activePage + 1} of ${CARD_COUNT}`}>
        {pageLabels.map((_, page) => (
          <View
            key={page}
            style={[
              styles.indicator,
              { backgroundColor: page === activePage ? g.blue : g.glassBorder },
            ]}
          />
        ))}
        <Text style={[styles.indicatorLabel, { color: g.muted }]}>
          {pageLabels[activePage]}
        </Text>
      </View>
    </View>
  );
}

function SalesSnapshot({
  snapshot,
  g,
}: {
  snapshot: {
    revenueThisWeek: number;
    paidOrders: number;
    averageOrderValue: number;
    lifetimeRevenue: number;
  };
  g: GlassTokens;
}) {
  const metrics = [
    { label: 'Revenue this week', value: formatGhs(snapshot.revenueThisWeek) },
    { label: 'Paid orders', value: String(Math.round(snapshot.paidOrders)) },
    { label: 'Average order', value: formatGhs(snapshot.averageOrderValue) },
    { label: 'Lifetime revenue', value: formatGhs(snapshot.lifetimeRevenue) },
  ];

  return (
    <View style={styles.snapshot}>
      <Text style={[styles.snapshotTitle, { color: g.ink }]}>Sales snapshot</Text>
      <View style={styles.snapshotGrid}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text
              style={[styles.metricValue, { color: g.ink }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {metric.value}
            </Text>
            <Text style={[styles.metricLabel, { color: g.muted }]} numberOfLines={1}>
              {metric.label}
            </Text>
          </View>
        ))}
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
  card: (g: GlassTokens, highlighted = false): ViewStyle => ({
    height: 190,
    padding: 16,
    borderRadius: g.radius,
    borderWidth: 1,
    borderColor: highlighted ? 'transparent' : g.glassBorder,
    backgroundColor: highlighted ? g.blueFill : g.card,
    ...g.shadow,
  }),
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
  snapshot: { flex: 1, justifyContent: 'center' } satisfies ViewStyle,
  snapshotTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 } satisfies TextStyle,
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 } satisfies ViewStyle,
  metric: { width: '50%', paddingRight: 8 } satisfies ViewStyle,
  metricValue: { fontSize: 17, fontWeight: '700' } satisfies TextStyle,
  metricLabel: { fontSize: 11, marginTop: 3 } satisfies TextStyle,
};