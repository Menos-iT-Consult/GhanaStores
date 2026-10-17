import React from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useGlass, type GlassTokens } from './glass';

/**
 * M3 warning banner (low inventory): soft amber container fill, amber-tinted
 * icon chip, no pulsing/glowing. Rendered only when lowStockCount > 0.
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

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      <View style={styles.banner(g)}>
        <View style={styles.iconWrap(g)}>
          <MaterialCommunityIcons name="alert" size={20} color={g.amber} />
        </View>
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
    // Soft amber container over the current surface (reads correctly in
    // both modes because the alpha composites onto the themed background).
    backgroundColor: 'rgba(245,158,11,0.14)',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: g.radius,
    padding: 15,
  }),
  iconWrap: (g: GlassTokens): ViewStyle => ({
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(245,158,11,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  body: { flex: 1 },
  title: (g: GlassTokens): TextStyle => ({ color: g.amber, fontWeight: '700', fontSize: 14 }),
  text: (g: GlassTokens): TextStyle => ({ color: g.muted, fontSize: 12.5, marginTop: 2 }),
};

