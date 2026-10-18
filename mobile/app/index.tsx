import React from 'react';
import { View } from 'react-native';

/**
 * Cold-launch entry route ("/").
 *
 * Renders nothing itself: the root layout keeps the Lottie splash overlay on
 * top of the always-mounted Stack, and the root navigator replaces this route
 * with the real destination (dashboard / login / welcome) once auth and
 * onboarding are known. Its job is to guarantee the root Stack always has an
 * initial route to match — without it the first render had nothing to show and
 * the initial `router.replace` raced a blank navigator (the cold-launch blank
 * screen, and the blank page behind the Settings gear when the stack remounted).
 */
export default function RootIndexRoute(): React.JSX.Element {
  return <View />;
}
