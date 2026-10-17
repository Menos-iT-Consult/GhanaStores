import React from 'react';
import { Tabs } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useThemeMode } from '@/theme/ThemeContext';
import { ACCENT } from '@/theme';

/**
 * Bottom tab navigator for the signed-in merchant:
 * Home · Orders · POS (centre, the register) · Products · Customers.
 * Settings lives behind the gear icon on the Home header.
 */
export default function TabsLayout() {
  const { isDark } = useThemeMode();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#7CAFFF' : ACCENT.primary,
        tabBarInactiveTintColor: isDark ? '#64748B' : '#94A3B8',
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(12,17,26,0.95)' : 'rgba(248,250,252,0.82)',
          borderTopWidth: 1.5,
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.4)',
          elevation: 12,
          shadowColor: isDark ? '#000000' : '#0A2540',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: isDark ? 0.5 : 0.1,
          shadowRadius: 20,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="receipt" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: 'POS',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cash-register" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="package-variant-closed" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
