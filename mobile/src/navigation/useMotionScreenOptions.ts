import { useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

export function useMotionScreenOptions() {
  const reduceMotion = useReducedMotion();

  return useMemo(
    () => ({
      headerShown: false as const,
      animation: reduceMotion ? ('none' as const) : ('slide_from_right' as const),
      gestureEnabled: true,
    }),
    [reduceMotion],
  );
}
