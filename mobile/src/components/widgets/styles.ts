import { StyleSheet } from 'react-native';

/** Shared card/title/muted styles so every glance widget looks like family. */
export const widgetCard = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', marginTop: 12, padding: 16 },
  alert: { borderColor: '#FCD34D', borderWidth: 1 },
});

export const widgetTitle = { color: '#0F172A', fontWeight: '700' } as const;
export const widgetMuted = { color: '#64748B' } as const;
