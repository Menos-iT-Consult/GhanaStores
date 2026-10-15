import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Lightweight pulsing placeholder blocks. The app prefers skeletons over a
 * centered spinner for first paint so the layout doesn't jump when data lands.
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

  return <Animated.View style={[styles.block, style, { opacity }]} />;
}

/** A single placeholder block (stat card, list row, chart area…). */
export function SkeletonBlock({ height = 16, width, style }: { height?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  return <Pulse style={[{ height }, width != null ? { width } : null, style]} />;
}

/** A stat-card-sized skeleton (two per row, matching the StatCard grid). */
export function StatCardSkeleton() {
  return (
    <View style={styles.statRow}>
      <Pulse style={styles.statCard} />
      <Pulse style={styles.statCard} />
    </View>
  );
}

/** A list-row skeleton used under section headers. */
export function RowSkeleton() {
  return (
    <View style={styles.row}>
      <Pulse style={styles.rowIcon} />
      <View style={styles.rowBody}>
        <Pulse style={[styles.rowLine, { width: '70%' }]} />
        <Pulse style={[styles.rowLine, { marginTop: 6, width: '45%' }]} />
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
  block: { backgroundColor: '#E2E8F0', borderRadius: 10 },
  statRow: { flexDirection: 'row', marginHorizontal: -6 },
  statCard: { flex: 1, height: 92, margin: 6 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10 },
  rowIcon: { width: 38, height: 38, borderRadius: 19, marginRight: 12 },
  rowBody: { flex: 1 },
  rowLine: { height: 12, borderRadius: 6 },
});
