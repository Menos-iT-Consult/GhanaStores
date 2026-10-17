import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

/**
 * Quiet micro-sparkline: a soft accent trail under a solid accent line with
 * a small dot at the latest value. Pure react-native-svg (already a dep) —
 * no chart lib needed, so the old BarChart native crash vector is gone.
 */
export function Sparkline({
  values,
  width = 170,
  height = 52,
  stroke = '#0066FF',
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
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
        {/* soft accent trail */}
        <Polyline
          points={pts}
          fill="none"
          stroke={stroke}
          strokeOpacity={0.2}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* crisp accent line */}
        <Polyline
          points={pts}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={lastX} cy={lastY} r={4} fill={stroke} opacity={0.25} />
        <Circle cx={lastX} cy={lastY} r={2.5} fill={stroke} />
      </Svg>
    </View>
  );
}
