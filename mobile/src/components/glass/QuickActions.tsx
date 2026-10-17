import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useGlass, type GlassTokens } from './glass';
import { ACCENT } from '@/theme';

export interface QuickAction {
  label: string;
  /** MaterialCommunityIcons name (cast to any at render — version-safe). */
  icon: string;
  /** Optional accent color for the icon; defaults to primary Deep Blue. */
  color?: string;
  onPress: () => void;
}

/**
 * Floating glass action chips with a fluid 3D press-lift (scale spring).
 * Dark-mode pills are translucent dark slate with tinted borders; icons pick
 * up the action's category accent (POS & Transactions -> Electric Cyan).
 */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  const g = useGlass();
  return (
    <>
      {actions.map((a) => (
        <Pill key={a.label} action={a} g={g} />
      ))}
    </>
  );
}

function Pill({ action, g }: { action: QuickAction; g: GlassTokens }) {
  const scale = useRef(new Animated.Value(1)).current;
  const iconColor = action.color ?? g.blue;

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        onPress={action.onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[styles.pill(g), { borderColor: g.glassBorder }]}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <MaterialCommunityIcons name={action.icon as any} size={18} color={iconColor} />
        <Text style={styles.label(g)} numberOfLines={1}>
          {action.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = {
  pill: (g: GlassTokens): ViewStyle => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: g.card,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 10,
    ...g.shadow,
  }),
  label: (g: GlassTokens): TextStyle => ({ color: g.ink, fontSize: 12.5, fontWeight: '700' }),
};

