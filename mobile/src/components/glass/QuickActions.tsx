import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { GLASS } from './glass';

export interface QuickAction {
  label: string;
  /** MaterialCommunityIcons name (cast to any at render — version-safe). */
  icon: string;
  onPress: () => void;
}

/**
 * Floating glass action chips with a fluid 3D press-lift (scale spring).
 * Routes are passed in so the screen keeps its navigation logic.
 */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <>
      {actions.map((a) => (
        <Pill key={a.label} action={a} />
      ))}
    </>
  );
}

function Pill({ action }: { action: QuickAction }) {
  const scale = useRef(new Animated.Value(1)).current;

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
        style={styles.pill}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <MaterialCommunityIcons name={action.icon as any} size={18} color={GLASS.blue} />
        <Text style={styles.label} numberOfLines={1}>
          {action.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1.5,
    borderColor: GLASS.glassBorder,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 10,
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  label: { color: GLASS.ink, fontSize: 12.5, fontWeight: '700' },
});
