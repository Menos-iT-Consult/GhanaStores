import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useGlass, type GlassTokens } from './glass';

export type GlassVariant = 'light' | 'blue' | 'emerald' | 'amber';

const VARIANT_FILL = (g: GlassTokens, variant: GlassVariant): string => {
  switch (variant) {
    case 'blue':
      return g.blueFill;
    case 'emerald':
      return 'rgba(16,185,129,0.16)';
    case 'amber':
      return 'rgba(245,158,11,0.16)';
    case 'light':
    default:
      return g.card;
  }
};

/**
 * Translucent frosted card: theme-aware (dark slate rgba(15,23,42,0.80) in
 * dark mode), 20px rounded corners, 1px color-tinted glowing border, soft
 * floating directional shadow. Faked frost — no new native deps.
 */
export function GlassCard({
  variant = 'light',
  style,
  children,
}: {
  variant?: GlassVariant;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const g = useGlass();
  return (
    <View
      style={[
        styles.base(g),
        { backgroundColor: VARIANT_FILL(g, variant) },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = {
  base: (g: GlassTokens) => ({
    borderRadius: g.radius,
    borderWidth: 1,
    borderColor: g.glassBorder,
    ...g.shadow,
  }),
};

