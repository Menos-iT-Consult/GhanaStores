import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

/**
 * Lightweight pulsing placeholder blocks, tinted from the Paper theme so
 * they read on both light and dark surfaces (surfaceContainer tiers).
 */
function Pulse({ style }: { style: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[style, { opacity }]} />;
}

/** A single placeholder block (stat card, list row, chart area…). */
export function SkeletonBlock({ height = 16, width, style }: { height?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <Pulse style={[{ height }, width != null ? { width } : null, style, { backgroundColor: colors.surfaceVariant }]} />;
}

/** A stat-card-sized skeleton (two per row, matching the metric grid). */
export function StatCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={styles.statRow}>
      <Pulse style={[styles.statCard, { backgroundColor: colors.surfaceVariant }]} />
      <Pulse style={[styles.statCard, { backgroundColor: colors.surfaceVariant }]} />
    </View>
  );
}

/** A list-row skeleton used under section headers. */
export function RowSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceVariant }]}>
      <Pulse style={[styles.rowIcon, { backgroundColor: colors.surface }]} />
      <View style={styles.rowBody}>
        <Pulse style={[styles.rowLine, { width: '70%', backgroundColor: colors.surface }]} />
        <Pulse style={[styles.rowLine, { marginTop: 6, width: '45%', backgroundColor: colors.surface }]} />
      </View>
    </View>
  );
}

/** Stacked list of row skeletons (count defaults to three). */
export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', marginHorizontal: -6 },
  statCard: { flex: 1, height: 92, margin: 6, borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 10 },
  rowIcon: { width: 38, height: 38, borderRadius: 19, marginRight: 12 },
  rowBody: { flex: 1 },
  rowLine: { height: 12, borderRadius: 6 },
});

