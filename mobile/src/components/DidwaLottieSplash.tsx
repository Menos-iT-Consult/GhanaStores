import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image as RNImage } from 'react-native';

const ICON_SIZE = 120;
const SPLASH_BG = '#F8FAFC';

/**
 * Full-screen loading screen shown while auth + onboarding state resolve.
 * Displays the DiDwa app icon (static, no Lottie decode overhead).
 *
 * `onReady` fires AFTER the first paint (via useEffect) so the native splash
 * is only hidden once this overlay is actually on screen — prevents the
 * cold-launch blank flash that occurred when it was invoked synchronously
 * during render.
 */
export function DidwaLottieSplash({ onReady }: { onReady?: () => void }): React.JSX.Element {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    onReady?.();
  }, [onReady]);

  return (
    <View style={styles.container}>
      <RNImage
        source={require('../../assets/icon.png')}
        style={styles.icon}
        resizeMode="contain"
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
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
});

