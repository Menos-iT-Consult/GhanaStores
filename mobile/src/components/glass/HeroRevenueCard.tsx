import React from 'react';
import { Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useGlass, type GlassTokens } from './glass';
import { useCountUp } from './useCountUp';
import { formatGhs } from '@/theme';

/**
 * Hero revenue card: a flat M3 filled card (primaryContainer) showing the
 * store name, period label, and animated revenue figure.
 */
export function HeroRevenueCard({
  storeName,
  revenue,
  periodLabel,
}: {
  storeName: string;
  revenue: number;
  periodLabel: string;
}) {
  const g = useGlass();
  const animated = useCountUp(revenue);

  return (
    <View style={styles.card(g)}>
      <Text style={styles.store(g)} numberOfLines={1}>
        {storeName}
      </Text>
      <Text style={styles.caption(g)}>{periodLabel} revenue</Text>
      <Text style={styles.amount(g)}>{formatGhs(animated)}</Text>
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
};
