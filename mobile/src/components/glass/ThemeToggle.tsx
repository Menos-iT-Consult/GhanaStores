import React from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useThemeMode } from '@/theme/ThemeContext';
import { ACCENT } from '@/theme';

/**
 * Sun / Moon theme toggle. Tapping runs a spring rotation (0 -> 1 mapped to
 * the toggleAnim value) and persists the choice. Theme-aware so the icon and
 * ring read correctly on both light and dark glass.
 */
export function ThemeToggle() {
  const { isDark, toggleTheme, toggleAnim } = useThemeMode();

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
      <Animated.View style={[styles.ring, { transform: [{ rotate }] }]}>
        <MaterialCommunityIcons
          name={iconName}
          size={20}
          color={isDark ? '#FBBF24' : '#1E40AF'}
        />
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
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
});
