import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image as RNImage } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const ICON_SIZE = 120;
const SPLASH_BG = '#F8FAFC';

/**
 * Full-screen loading screen shown while auth + onboarding state resolve.
 * Displays the DiDwa app icon with a subtle, reduced-motion-aware float.
 *
 * `onReady` fires AFTER the first paint (via useEffect) so the native splash
 * is only hidden once this overlay is actually on screen — prevents the
 * cold-launch blank flash that occurred when it was invoked synchronously
 * during render.
 */
export function DidwaLottieSplash({ onReady }: { onReady?: () => void }): React.JSX.Element {
  const fired = useRef(false);
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }

    progress.value = withSequence(
      withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }),
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 850, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.99, { duration: 850, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [progress, reduceMotion]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0.55, Math.min(1, progress.value * 1.5)),
    transform: [
      { scale: progress.value < 1 ? 0.88 + progress.value * 0.12 : progress.value },
      { translateY: progress.value > 1 ? -Math.min(5, (progress.value - 1) * 120) : 0 },
    ],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={iconStyle}>
        <RNImage
          source={require('../../assets/icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
});
