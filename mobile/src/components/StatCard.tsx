import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import type { ViewStyle } from 'react-native';

/** A compact metric tile used on the dashboard. */
export function StatCard({
  label,
  value,
  hint,
  style,
}: {
  label: string;
  value: string;
  hint?: string;
  style?: ViewStyle;
}) {
  return (
    <Card mode="elevated" style={[styles.card, style]}>
      <View style={styles.body}>
        <Text variant="labelMedium" style={styles.label}>
          {label}
        </Text>
        <Text variant="titleLarge" style={styles.value}>
          {value}
        </Text>
        {hint ? <Text variant="bodySmall" style={styles.hint}>{hint}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: 6, backgroundColor: '#FFFFFF' },
  body: { padding: 16 },
  label: { color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { marginTop: 4, color: '#0F172A', fontWeight: '700' },
  hint: { marginTop: 2, color: '#94A3B8' },
});
