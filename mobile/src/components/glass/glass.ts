/**
 * Surface design tokens for the DiDwa dashboard cards.
 *
 * Kept under the historical "glass" name for API compatibility, but the
 * values are now plain Material 3 roles: solid surfaces, 12px corners, an
 * M3 outlineVariant hairline and a barely-there shadow (no glow, no
 * translucency, no gradients).
 *
 * Components should get these via useGlass() so the light/dark toggle
 * re-themes them instantly.
 */

import { useThemeMode } from '@/theme/ThemeContext';
import { ACCENT } from '@/theme';

export type GlassMode = 'light' | 'dark';

export interface GlassTokens {
  /** Category accents (muted, legible on both modes). */
  blue: string;
  emerald: string;
  purple: string;
  cyan: string;
  amber: string;
  /** Surface colors */
  slate: string;      // screen background
  card: string;       // card fill (M3 surface)
  cardStrong: string; // slightly raised card fill
  ink: string;        // primary text
  muted: string;      // secondary text
  faint: string;      // tertiary text
  /** Borders */
  glassBorder: string;   // 1px hairline (outlineVariant)
  blueFill: string;      // primaryContainer fill for chips/tiles
  /** Legacy hero stops — kept flat so nothing crashes; hero is solid now. */
  heroStart: string;
  heroMid: string;
  heroEnd: string;
  /** Layout */
  radius: number;
  /** Shadows: subtle M3 elevation only. */
  shadow: object;
  heroShadow: object;
}

const LIGHT: GlassTokens = {
  blue: '#0066FF',
  emerald: ACCENT.revenue,
  purple: '#6941C6',
  cyan: ACCENT.pos,
  amber: ACCENT.inventory,
  slate: '#F7F8FA',
  card: '#FFFFFF',
  cardStrong: '#FFFFFF',
  ink: '#0F172A',
  muted: '#475569',
  faint: '#98A2B3',
  glassBorder: '#E4E7EC',
  blueFill: '#D6E3FF',
  heroStart: '#0066FF',
  heroMid: '#0066FF',
  heroEnd: '#0066FF',
  radius: 12,
  shadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  heroShadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
};

const DARK: GlassTokens = {
  blue: '#8FB8FF',
  emerald: '#8FC7A9',
  purple: '#B9AEE2',
  cyan: '#8FC3D1',
  amber: '#D9B978',
  slate: '#090D16',
  card: '#141A24',
  cardStrong: '#1D2532',
  ink: '#E6EAF0',
  muted: '#9AA5B5',
  faint: '#64748B',
  glassBorder: '#273041',
  blueFill: '#0B2B66',
  heroStart: '#0066FF',
  heroMid: '#0066FF',
  heroEnd: '#0066FF',
  radius: 12,
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 1,
  },
  heroShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 2,
  },
};

export function glassTokens(mode: GlassMode): GlassTokens {
  return mode === 'dark' ? DARK : LIGHT;
}

/**
 * Hook returning the theme-aware surface tokens for the current light/dark
 * mode. Components should use this instead of importing GLASS directly so
 * the theme toggle instantly re-themes the whole surface.
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

