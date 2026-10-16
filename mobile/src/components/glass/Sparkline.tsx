import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

/**
 * Animated micro-sparkline: emerald neon trail with a looping pulse dot
 * riding at the latest value. Pure react-native-svg (already a dep) —
 * no chart lib needed, so the old BarChart native crash vector is gone.
 */
export function Sparkline({
  values,
  width = 170,
  height = 52,
  stroke = '#10B981',
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const safe = values.length > 1 ? values : [0, 0];
  const max = Math.max(...safe, 1);
  const min = Math.min(...safe, 0);
  const span = max - min || 1;
  const stepX = width / (safe.length - 1);
  const pts = safe
    .map((v, i) => {
      const x = Math.round(i * stepX);
      const y = Math.round(height - 6 - ((v - min) / span) * (height - 12));
      return `${x},${y}`;
    })
    .join(' ');
  const lastX = (safe.length - 1) * stepX;
  const lastY = height - 6 - ((safe[safe.length - 1] - min) / span) * (height - 12);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* soft neon trail */}
        <Polyline
          points={pts}
          fill="none"
          stroke={stroke}
          strokeOpacity={0.3}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* bright core line */}
        <Polyline
          points={pts}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.9}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={lastX} cy={lastY} r={6} fill={stroke} opacity={0.35} />
        <Circle cx={lastX} cy={lastY} r={3} fill="#FFFFFF" />
      </Svg>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.dot,
          { left: lastX - 9, top: lastY - 9, opacity: pulse, borderColor: stroke },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
});
