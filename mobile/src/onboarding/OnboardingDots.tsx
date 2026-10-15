import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface Props {
  count: number;
  activeIndex: number;
  /** Active dot color; inactive dots use the same color at low opacity. */
  color?: string;
}

/**
 * Animated pagination dots for the onboarding carousel. The active dot stretches
 * into a pill and brightens; inactive dots stay small and faded. Width + opacity
 * animate with the JS driver (width is not supported by the native driver).
 */
export function OnboardingDots({ count, activeIndex, color = '#0066FF' }: Props) {
  const anims = useRef(
    Array.from({ length: count }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    anims.forEach((a, i) => {
      Animated.timing(a, {
        toValue: i === activeIndex ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  }, [activeIndex, anims]);

  return (
    <View style={styles.row}>
      {anims.map((a, i) => {
        const width = a.interpolate({ inputRange: [0, 1], outputRange: [8, 24] });
        const opacity = a.interpolate({ inputRange: [0, 1], outputRange: [0.28, 1] });
        return (
          <Animated.View
            key={i}
            accessibilityLabel={`Page ${i + 1} of ${count}`}
            style={[styles.dot, { width, backgroundColor: color, opacity }]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
});
