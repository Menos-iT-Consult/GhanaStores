/**
 * Glass design tokens for the hyper-modern DiDwa dashboard.
 * Deep Brand Blue #0066FF / Electric Emerald #10B981 / Amber Gold #F59E0B
 * on a Soft Slate #F8FAFC mesh. Zero new deps — faked frost via layered
 * translucent fills + 1.5px glowing borders (expo-blur deferred to Phase 2).
 */

export const GLASS = {
  blue: '#0066FF',
  blueDeep: '#1D4ED8',
  blueDark: '#0A2540',
  emerald: '#10B981',
  emeraldDark: '#065F46',
  amber: '#F59E0B',
  amberDark: '#92400E',
  slate: '#F8FAFC',
  ink: '#0F172A',
  muted: '#64748B',
  faint: '#94A3B8',
  cardFill: 'rgba(255,255,255,0.62)',
  cardFillStrong: 'rgba(255,255,255,0.78)',
  blueFill: 'rgba(0,102,255,0.14)',
  glassBorder: 'rgba(255,255,255,0.4)',
  heroStart: '#1D4ED8',
  heroMid: '#0066FF',
  heroEnd: '#00B2FF',
  radius: 22,
} as const;

export const GLASS_SHADOW = {
  shadowColor: '#0A2540',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.16,
  shadowRadius: 24,
  elevation: 8,
} as const;

export const HERO_SHADOW = {
  shadowColor: '#0066FF',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.35,
  shadowRadius: 32,
  elevation: 12,
} as const;
