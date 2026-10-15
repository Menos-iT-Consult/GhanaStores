import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, IconButton, Text } from 'react-native-paper';
import { formatGhs } from '@/theme';
import { widgetCard, widgetMuted, widgetTitle } from './styles';

/** Low-stock alert + rider cash. Amber border when action is needed. */
export function OpsWidget({
  lowStockCount,
  transitCash,
  onRestock,
}: {
  lowStockCount: number;
  transitCash: number;
  onRestock?: () => void;
}) {
  const allGood = lowStockCount === 0;
  return (
    <Card mode="elevated" style={[widgetCard.card, !allGood && widgetCard.alert]}>
      <View style={styles.head}>
        <Text variant="titleSmall" style={widgetTitle}>
          {allGood ? 'All stocked up ✓' : `${lowStockCount} variant${lowStockCount === 1 ? '' : 's'} low on stock`}
        </Text>
        {!allGood && onRestock ? (
          <IconButton icon="arrow-right" size={20} onPress={onRestock} accessibilityLabel="Review low stock" />
        ) : null}
      </View>
      <Text variant="bodySmall" style={widgetMuted}>
        Rider cash in transit: {formatGhs(transitCash)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
});
