import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useGlass, type GlassTokens } from './glass';

/**
 * Glass amber alert banner (low inventory) with a gently pulsing warning icon.
 * Dark-slate fill with an amber-tinted border; rendered only when lowStockCount > 0.
 */
export function AlertBanner({
  title,
  body,
  onPress,
}: {
  title: string;
  body: string;
  onPress: () => void;
}) {
  const g = useGlass();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 850, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      <View style={styles.banner(g)}>
        <Animated.View style={[styles.iconWrap(g), { transform: [{ scale: pulse }] }]}>
          <MaterialCommunityIcons name="alert" size={20} color={g.amber} />
        </Animated.View>
        <View style={styles.body}>
          <Text style={styles.title(g)}>{title}</Text>
          <Text style={styles.text(g)}>{body}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={g.muted} />
      </View>
    </Pressable>
  );
}

const styles = {
  banner: (g: GlassTokens): ViewStyle => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: g.card,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    borderRadius: g.radius,
    padding: 15,
    ...g.shadow,
  }),
  iconWrap: (g: GlassTokens): ViewStyle => ({
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(245,158,11,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  body: { flex: 1 },
  title: (g: GlassTokens): TextStyle => ({ color: g.amber, fontWeight: '800', fontSize: 14 }),
  text: (g: GlassTokens): TextStyle => ({ color: g.muted, fontSize: 12.5, marginTop: 2 }),
};

