import React from 'react';
import { Stack } from 'expo-router';
import { useMotionScreenOptions } from '@/navigation/useMotionScreenOptions';

export default function DashboardLayout() {
  const screenOptions = useMotionScreenOptions();
  return <Stack screenOptions={screenOptions} />;
}