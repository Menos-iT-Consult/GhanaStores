import React from 'react';
import { Stack } from 'expo-router';
import { useMotionScreenOptions } from '@/navigation/useMotionScreenOptions';

export default function AuthLayout() {
  const screenOptions = useMotionScreenOptions();
  return <Stack screenOptions={screenOptions} />;
}
