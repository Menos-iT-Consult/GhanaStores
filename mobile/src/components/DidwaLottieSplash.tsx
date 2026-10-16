import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { theme } from '@/theme';

// diDwa splash animation (512x512, self-contained — no external assets).
// `require` resolves at build time through Metro; no path rewrites needed.
const DidwaSplashAnimation = require('../../assets/lottie/didwa-splash.json');

/**
 * Full-screen loading screen shown while auth + onboarding state resolve
 * (replaces the old ActivityIndicator). Plays the diDwa logo animation once:
 *
 * - `autoPlay={false}` + manual `play()` after mount, so playback starts once
 *   React has committed and the native splash is about to hide.
 * - `loop={false}` so it holds on the final frame instead of repeating.
 * - Background matches the native splash (`#F8FAFC`) so there's no visible
 *   seam between the native cover and the animation.
 * - `position: 'absolute'` fills the viewport without affecting layout.
 *
 * The native splash (app.json `splash`) is removed via `SplashScreen.hideAsync`
 * once auth + onboarding state is known, revealing this animation underneath.
 * When state resolves, the root navigator swaps to the real stack.
 */
export function DidwaLottieSplash(): React.JSX.Element {
  const animationRef = useRef<LottieView | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      animationRef.current?.play();
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LottieView
        ref={animationRef}
        source={DidwaSplashAnimation}
        autoPlay={false}
        loop={false}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onAnimationFinish={() => undefined}
      />
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
  },
});
