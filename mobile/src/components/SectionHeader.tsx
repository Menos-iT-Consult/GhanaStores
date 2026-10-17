import React from 'react';
import { View, type TextStyle, type ViewStyle } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';
import { useGlass, type GlassTokens } from '@/components/glass/glass';
import { ACCENT } from '@/theme';

/**
 * Consistent section title used across the dashboard and POS screens, with an
 * optional trailing action (e.g. "See all"). Theme-aware ink / primary colors.
 */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const g = useGlass();
  return (
    <View style={styles.row}>
      <Text variant="titleMedium" style={styles.title(g)}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <TouchableRipple onPress={onAction} borderless>
          <Text variant="labelLarge" style={styles.action(g)}>
            {actionLabel}
          </Text>
        </TouchableRipple>
      ) : null}
    </View>
  );
}

const styles = {
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  } satisfies ViewStyle,
  title: (g: GlassTokens): TextStyle => ({ color: g.ink, fontWeight: '700' }),
  action: (g: GlassTokens): TextStyle => ({ color: ACCENT.primary, paddingHorizontal: 8, paddingVertical: 4 }),
};

