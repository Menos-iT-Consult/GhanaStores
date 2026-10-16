import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { GLASS, GLASS_SHADOW } from './glass';

/**
 * Glass gold-amber alert banner with a gently pulsing warning icon.
 * Rendered by the screen only when lowStockCount > 0.
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
      <View style={styles.banner}>
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulse }] }]}>
          <MaterialCommunityIcons name="alert" size={20} color={GLASS.amberDark} />
        </Animated.View>
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.text}>{body}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={GLASS.amberDark} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245,158,11,0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: GLASS.radius,
    padding: 15,
    ...GLASS_SHADOW,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { color: GLASS.amberDark, fontWeight: '800', fontSize: 14 },
  text: { color: GLASS.muted, fontSize: 12.5, marginTop: 2 },
});
