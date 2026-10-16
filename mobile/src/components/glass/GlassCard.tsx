import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GLASS, GLASS_SHADOW } from './glass';

export type GlassVariant = 'light' | 'blue' | 'amber';

const FILLS: Record<GlassVariant, string> = {
  light: GLASS.cardFill,
  blue: GLASS.blueFill,
  amber: 'rgba(245,158,11,0.16)',
};

/**
 * Translucent frosted card: 22px radius, 1.5px glowing white border,
 * soft directional floating shadow. Faked frost (layered translucent fill)
 * so no new native deps are needed — expo-blur is a Phase 2 upgrade.
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
  return (
    <View style={[styles.base, { backgroundColor: FILLS[variant] }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: GLASS.radius,
    borderWidth: 1.5,
    borderColor: GLASS.glassBorder,
    ...GLASS_SHADOW,
  },
});
