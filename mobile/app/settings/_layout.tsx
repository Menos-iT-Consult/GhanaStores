import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, Text, useTheme } from 'react-native-paper';
import { useSafeBack } from '@/lib/useSafeBack';

/**
 * Back-aware appbar used by every screen that lives inside a real stack
 * (Settings and the fallback fallback screen). Falls back to a no-op
 * (transparent wide header) when there is no previous entry to return to.
 */
export function SafeBackHeader({ title }: { title: string }) {
  const goBack = useSafeBack('/');
  return (
    <Appbar.Header mode="small" style={{ backgroundColor: useTheme().colors.background }}>
      <Appbar.BackAction onPress={goBack} />
      <Appbar.Content title={title} />
    </Appbar.Header>
  );
}

/**
 * Header for the settings group — no back action, the layout owns the stack.
 */
export function SettingsHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.Content title={title} />
      </Appbar.Header>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});


