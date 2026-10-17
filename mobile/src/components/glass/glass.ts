/**
 * Glass design tokens for the hyper-modern DiDwa dashboard.
 * Two palettes (light / dark) built on the brand accents:
 *   Deep Blue #0066FF · Electric Emerald #10B981 · Vibrant Purple #8B5CF6 ·
 *   Electric Cyan #06B6D4 · Amber Gold #F59E0B
 *
 * Dark canvas: Midnight Slate #090D16 · Dark slate cards rgba(15,23,42,0.80)
 * · 20px rounded corners · 1px color-tinted glowing borders · soft floating
 * shadows. Faked frost via layered translucent fills (expo-blur Phase 2).
 */

import { useThemeMode } from '@/theme/ThemeContext';
import { ACCENT } from '@/theme';

export type GlassMode = 'light' | 'dark';

export interface GlassTokens {
  /** Brand accents */
  blue: string;
  emerald: string;
  purple: string;
  cyan: string;
  amber: string;
  /** Surface colors */
  slate: string;      // canvas background
  card: string;       // translucent card fill
  cardStrong: string; // slightly more opaque card fill
  ink: string;        // primary text
  muted: string;      // secondary text
  faint: string;      // tertiary text / dividers
  /** Borders & glows */
  glassBorder: string;   // 1px border
  blueFill: string;      // blue-tinted fill for chips
  /** Hero gradient stops */
  heroStart: string;
  heroMid: string;
  heroEnd: string;
  /** Layout */
  radius: number;
  /** Shadows */
  shadow: object;
  heroShadow: object;
}

const LIGHT: GlassTokens = {
  blue: '#0066FF',
  emerald: '#10B981',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  amber: '#F59E0B',
  slate: '#F8FAFC',
  card: 'rgba(255,255,255,0.62)',
  cardStrong: 'rgba(255,255,255,0.78)',
  ink: '#0F172A',
  muted: '#64748B',
  faint: '#94A3B8',
  glassBorder: 'rgba(255,255,255,0.4)',
  blueFill: 'rgba(0,102,255,0.14)',
  heroStart: '#1D4ED8',
  heroMid: '#0066FF',
  heroEnd: '#00B2FF',
  radius: 22,
  shadow: {
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  heroShadow: {
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 12,
  },
};

const DARK: GlassTokens = {
  blue: '#0066FF',
  emerald: '#10B981',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  amber: '#F59E0B',
  slate: '#090D16',
  card: 'rgba(15,23,42,0.80)',
  cardStrong: 'rgba(15,23,42,0.92)',
  ink: '#F8FAFC',
  muted: '#94A3B8',
  faint: '#475569',
  glassBorder: 'rgba(255,255,255,0.10)',
  blueFill: 'rgba(0,102,255,0.20)',
  heroStart: '#0E7490',
  heroMid: '#0066FF',
  heroEnd: '#06B6D4',
  radius: 20,
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 12,
  },
  heroShadow: {
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 40,
    elevation: 16,
  },
};

export function glassTokens(mode: GlassMode): GlassTokens {
  return mode === 'dark' ? DARK : LIGHT;
}

/**
 * Hook returning the theme-aware glass tokens for the current light/dark
 * mode. Components should use this instead of importing GLASS directly so
 * the theme toggle instantly re-styles the whole surface.
 */
export function useGlass(): GlassTokens {
  const { isDark } = useThemeMode();
  return glassTokens(isDark ? 'dark' : 'light');
}

/** Legacy light-mode token bundle (kept for any consumers not yet migrated). */
export const GLASS: GlassTokens = LIGHT;

/** Backward-compatible shadow bundles. */
export const GLASS_SHADOW: object = LIGHT.shadow;
export const HERO_SHADOW: object = LIGHT.heroShadow;

export { ACCENT };

