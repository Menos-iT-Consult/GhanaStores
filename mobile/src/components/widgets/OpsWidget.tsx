import React from 'react';
import { View, type TextStyle, type ViewStyle } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { formatGhs } from '@/theme';
import { GlassCard } from '@/components/glass/GlassCard';
import { useGlass, type GlassTokens } from '@/components/glass/glass';
import { ACCENT } from '@/theme';

/** Low-stock alert + rider cash. Dark glass card, amber border when action is needed. */
export function OpsWidget({
  lowStockCount,
  transitCash,
  onRestock,
}: {
  lowStockCount: number;
  transitCash: number;
  onRestock?: () => void;
}) {
  const g = useGlass();
  const allGood = lowStockCount === 0;
  return (
    <GlassCard
      style={[styles.card(g), !allGood && styles.alert(g)]}
    >
      <View style={styles.head}>
        <Text variant="titleSmall" style={styles.title(g)}>
          {allGood ? 'All stocked up ✓' : `${lowStockCount} variant${lowStockCount === 1 ? '' : 's'} low on stock`}
        </Text>
        {!allGood && onRestock ? (
          <IconButton
            icon="arrow-right"
            size={20}
            iconColor={ACCENT.inventory}
            onPress={onRestock}
            accessibilityLabel="Review low stock"
          />
        ) : null}
      </View>
      <Text variant="bodySmall" style={styles.muted(g)}>
        Rider cash in transit: {formatGhs(transitCash)}
      </Text>
    </GlassCard>
  );
}

const styles = {
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 } satisfies ViewStyle,
  card: (g: GlassTokens): ViewStyle => ({ marginTop: 12, padding: 16 }),
  alert: (g: GlassTokens): ViewStyle => ({ borderColor: 'rgba(245,158,11,0.45)', borderWidth: 1 }),
  title: (g: GlassTokens): TextStyle => ({ color: g.ink, fontWeight: '700' }),
  muted: (g: GlassTokens): TextStyle => ({ color: g.muted }),
};

