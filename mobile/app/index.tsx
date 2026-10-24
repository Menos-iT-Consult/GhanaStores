import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Cold-launch entry route ("/").
 *
 * Renders a clean, themed placeholder (dark background) while the root layout
 * resolves authentication + onboarding state and lifts the Lottie splash screen
 * on top of the always-mounted Stack. Guaranteeing an initial route to match
 * prevents the first render from having nothing to show (cold-launch blank
 * screen), and keeps the navigation state intact when the Settings gear is tapped.
 */
export default function RootIndexRoute(): React.JSX.Element {
  return <View style={styles.root} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
});
