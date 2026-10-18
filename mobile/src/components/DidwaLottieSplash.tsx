import React, { useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

// diDwa splash animation (512x512). NOTE: the JSON embeds a ~100KB base64
// JPEG (1254x1254 photo asset) — first-frame decode is the dominant cold-start
// cost, so this component is tuned for cheap first paint:
// - fixed 260px centered frame (no full-screen `cover` GPU upscale)
// - HARDWARE render mode + autoPlay (no delayed manual play timer)
// - `onReady` fires on first decoded frame so the host can hide the native
//   splash exactly when pixels exist, instead of on overlay onLayout.
// `require` resolves at build time through Metro; no path rewrites needed.
const DidwaSplashAnimation = require('../../assets/lottie/didwa-splash.json');

const FRAME_SIZE = 260;
const SPLASH_BG = '#F8FAFC';

/**
 * Full-screen loading screen shown while auth + onboarding state resolve.
 * Plays the diDwa logo animation once and holds the final frame.
 */
export function DidwaLottieSplash({ onReady }: { onReady?: () => void }): React.JSX.Element {
  const fired = useRef(false);
  const fireReady = useCallback(() => {
    if (fired.current) return;
    fired.current = true;
    onReady?.();
  }, [onReady]);

  return (
    <View style={styles.container}>
      <LottieView
        source={DidwaSplashAnimation}
        autoPlay
        loop={false}
        renderMode="HARDWARE"
        style={styles.frame}
        onAnimationLoaded={fireReady}
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
    backgroundColor: SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
  },
});

