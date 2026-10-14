import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

/** Centered spinner for screens that are loading their first data. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#0066FF" />
      <Text style={styles.text}>{label}</Text>
    </View>
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
  return (
    <View style={styles.center}>
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {message ? <Text style={styles.text}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button mode="contained" onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

/** Centered error state with a retry button. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text variant="titleMedium" style={[styles.title, { color: '#DC2626' }]}>
        Couldn’t load data
      </Text>
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <Button mode="outlined" onPress={onRetry} style={styles.button}>
          Try again
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { color: '#0F172A', fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  text: { color: '#64748B', textAlign: 'center', marginBottom: 4 },
  button: { marginTop: 16 },
});
