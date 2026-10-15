import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';

/**
 * Consistent section title used across the dashboard and POS screens, with an
 * optional trailing action (e.g. "See all").
 */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <TouchableRipple onPress={onAction} borderless>
          <Text variant="labelLarge" style={styles.action}>
            {actionLabel}
          </Text>
        </TouchableRipple>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  title: { color: '#0F172A', fontWeight: '700' },
  action: { color: '#0066FF', paddingHorizontal: 8, paddingVertical: 4 },
});
