import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

function StateContainer({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const offset = useSharedValue(reduceMotion ? 0 : 6);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withTiming(1, { duration: 220 });
    offset.value = withTiming(0, { duration: 220 });
  }, [opacity, offset, reduceMotion]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));

  return <Animated.View style={[styles.center, entranceStyle]}>{children}</Animated.View>;
}

/** Centered spinner for screens that are loading their first data. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <StateContainer>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.onSurfaceVariant }]}>{label}</Text>
    </StateContainer>
  );
}

/** Centered empty state with an optional call to action. */
export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <StateContainer>
      <Text variant="titleMedium" style={[styles.title, { color: colors.onSurface }]}>
        {title}
      </Text>
      {message ? <Text style={[styles.text, { color: colors.onSurfaceVariant }]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button mode="contained" onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      ) : null}
    </StateContainer>
  );
}

/** Centered error state with a retry button. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <StateContainer>
      <Text variant="titleMedium" style={[styles.title, { color: colors.error }]}>
        Couldn’t load data
      </Text>
      <Text style={[styles.text, { color: colors.onSurfaceVariant }]}>{message}</Text>
      {onRetry ? (
        <Button mode="outlined" onPress={onRetry} style={styles.button}>
          Try again
        </Button>
      ) : null}
    </StateContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  text: { textAlign: 'center', marginBottom: 4 },
  button: { marginTop: 16 },
});
