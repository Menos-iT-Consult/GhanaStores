import React from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import { useThemeMode } from '@/theme/ThemeContext';

/**
 * Light/dark toggle button (sun / moon). Tapping runs a spring rotation and
 * persists the choice. Coloured from the Paper theme so it reads correctly
 * as a standard M3 icon button on either surface.
 */
export function ThemeToggle() {
  const { isDark, toggleTheme, toggleAnim } = useThemeMode();
  const { colors } = useTheme();

  const iconName = isDark ? 'weather-sunny' : 'moon-waning-crescent';
  // Rotate 180deg over the spring so the icon spins on toggle.
  const rotate = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <TouchableOpacity
      accessibilityRole="switch"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      accessibilityState={{ checked: isDark }}
      onPress={toggleTheme}
      style={styles.container}
    >
      <Animated.View style={[styles.ring, { transform: [{ rotate }], borderColor: colors.outline }]}>
        <MaterialCommunityIcons name={iconName} size={20} color={colors.onSurface} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { marginLeft: 10 },
  ring: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
});
