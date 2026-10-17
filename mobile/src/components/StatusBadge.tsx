import React from 'react';
import { Chip } from 'react-native-paper';
import { statusTone } from '@/theme';
import { useThemeMode } from '@/theme/ThemeContext';

/** Colour-coded status pill with solid tonal colours per light/dark mode. */
export function StatusBadge({ status }: { status: string }) {
  const { isDark } = useThemeMode();
  const tone = statusTone(status, isDark);
  return (
    <Chip
      compact
      style={{ backgroundColor: tone.bg, alignSelf: 'flex-start' }}
      textStyle={{ color: tone.fg, fontSize: 12, fontWeight: '700', lineHeight: 18 }}
    >
      {tone.label}
    </Chip>
  );
}
