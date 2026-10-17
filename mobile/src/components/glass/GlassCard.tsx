import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useGlass, type GlassTokens } from './glass';

export type GlassVariant = 'light' | 'blue' | 'emerald' | 'amber';

/** M3 container fills for the accent variants. */
const VARIANT_FILL = (g: GlassTokens, variant: GlassVariant): string => {
  switch (variant) {
    case 'blue':
      return g.blueFill;
    case 'emerald':
      return g.emerald;
    case 'amber':
      return g.amber;
    case 'light':
    default:
      return g.card;
  }
};

/**
 * Standard Material card: solid surface, 12px corners, outlineVariant
 * hairline, barely-there shadow. Accent variants use a soft container fill.
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
  const tinted = variant !== 'light';
  return (
    <View
      style={[
        styles.base(g),
        {
          backgroundColor: VARIANT_FILL(g, variant),
          // Tinted variants stay flat (no border/shadow on a colored fill).
          borderColor: tinted ? 'transparent' : g.glassBorder,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = {
  base: (g: GlassTokens): ViewStyle => ({
    borderRadius: g.radius,
    borderWidth: 1,
    ...g.shadow,
  }),
};

