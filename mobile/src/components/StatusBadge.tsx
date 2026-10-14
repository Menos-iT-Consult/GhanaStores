import React from 'react';
import { Chip } from 'react-native-paper';
import { statusTone } from '@/theme';

/** Colour-coded status pill (Pending amber / Processing blue / Completed green). */
export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone(status);
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
