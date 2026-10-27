import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useThemeMode } from '@/theme/ThemeContext';

/**
 * Bottom tab navigator for the signed-in merchant, ordered:
 * Home · Products · POS · Orders · Customers.
 * Settings lives behind the gear icon on the Home header.
 *
 * The bar is a floating translucent "liquid glass" capsule in the spirit of
 * Telegram's iOS tab bar: blurred rounded slab with a spring-driven highlight
 * pill that glides between tabs while the focused icon pops as it lands.
 * expo-blur + Reanimated (native driver) keep switches at 60fps.
 */

type TabIcon = keyof typeof MaterialCommunityIcons.glyphMap;

/** Fixed, verified MaterialCommunityIcons glyphs — one per tab route. */
const TAB_ICONS: Record<string, TabIcon> = {
  dashboard: 'home-outline',
  products: 'package-variant-closed',
  pos: 'cash-register',
  orders: 'receipt',
  customers: 'account-group-outline',
};

/** Shared spring feel for the pill glide and the icon pop. */
const PILL_SPRING = { damping: 18, stiffness: 190, mass: 0.9 };

interface TabButtonProps {
  routeName: string;
  routeKey: string;
  label: string;
  index: number;
  focused: boolean;
  progress: SharedValue<number>;
  activeColor: string;
  inactiveColor: string;
  reduceMotion: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

/** One tab: icon + label. Scales up while the pill is landing on it. */
function TabButton({
  routeName,
  routeKey,
  label,
  index,
  focused,
  progress,
  activeColor,
  inactiveColor,
  reduceMotion,
  onPress,
  onLongPress,
}: TabButtonProps) {
  const iconStyle = useAnimatedStyle(() => {
    const focus = Math.max(0, 1 - Math.abs(progress.value - index));
    return { transform: [{ scale: reduceMotion ? 1 : 1 + 0.14 * focus }] };
  });

  const color = focused ? activeColor : inactiveColor;

  return (
    <Pressable
      key={routeKey}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <Animated.View style={iconStyle}>
        <MaterialCommunityIcons name={TAB_ICONS[routeName] ?? 'circle-outline'} size={23} color={color} />
      </Animated.View>
      <Text numberOfLines={1} style={[styles.tabLabel, { color, fontWeight: focused ? '700' : '600' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Floating glass bar: blurred capsule + animated highlight pill + tab buttons. */
function LiquidTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { isDark } = useThemeMode();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [capsuleWidth, setCapsuleWidth] = useState(0);

  const progress = useSharedValue(state.index);
  useEffect(() => {
    progress.value = reduceMotion ? state.index : withSpring(state.index, PILL_SPRING);
  }, [state.index, progress, reduceMotion]);

  const tabWidth = capsuleWidth / Math.max(1, state.routes.length);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * tabWidth + 6 }],
  }));

  return (
    <View style={[styles.barArea, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: colors.background }]}>
      <View
        style={[
          styles.capsule,
          {
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
            shadowOpacity: isDark ? 0.35 : 0.1,
          },
        ]}
        onLayout={(e) => setCapsuleWidth(e.nativeEvent.layout.width)}
      >
        {/* The glass itself: blur + translucent tint so glyphs stay legible. */}
        <BlurView
          intensity={45}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
          {...(Platform.OS === 'android' ? { experimentalBlurMethod: 'dimezisBlurView' as const } : {})}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(20,26,36,0.66)' : 'rgba(255,255,255,0.66)' },
          ]}
        />

        {/* Spring-highlight pill gliding under the focused tab. */}
        {tabWidth > 0 ? (
          <Animated.View
            style={[
              styles.pill,
              {
                width: tabWidth - 12,
                backgroundColor: isDark ? 'rgba(143,184,255,0.18)' : 'rgba(0,102,255,0.10)',
              },
              pillStyle,
            ]}
          />
        ) : null}

        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const descriptor = descriptors[route.key];
            const label = String(descriptor?.options.title ?? route.name);
            const focused = state.index === index;
            return (
              <TabButton
                key={route.key}
                routeKey={route.key}
                routeName={route.name}
                label={label}
                index={index}
                focused={focused}
                progress={progress}
                activeColor={colors.primary}
                inactiveColor={colors.onSurfaceVariant}
                reduceMotion={reduceMotion}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <LiquidTabBar {...props} />}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Home' }} />
      <Tabs.Screen name="products" options={{ title: 'Products' }} />
      <Tabs.Screen name="pos" options={{ title: 'POS' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen name="customers" options={{ title: 'Customers' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barArea: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  capsule: {
    height: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  pill: {
    position: 'absolute',
    left: 0,
    top: 8,
    height: 40,
    borderRadius: 20,
  },
  tabsRow: {
    flexDirection: 'row',
    flex: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.1,
  },
});
