import { MD3LightTheme, MD3DarkTheme, type MD3Theme } from 'react-native-paper';

/**
 * DiDwa Material 3 theme for React Native Paper.
 * Calm, standard M3 roles — plain surfaces, 12px radius, no glow. Light and
 * dark are both complete so every screen can follow the Paper theme directly.
 * Primary #0066FF.
 */
export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0066FF',
    onPrimary: '#FFFFFF',
    primaryContainer: '#D6E3FF',
    onPrimaryContainer: '#001B3F',
    secondary: '#44546A',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E2E8F0',
    onSecondaryContainer: '#0F172A',
    tertiary: '#0E6B4F',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#CFEEDE',
    onTertiaryContainer: '#002117',
    background: '#F7F8FA',
    onBackground: '#0F172A',
    surface: '#FFFFFF',
    onSurface: '#0F172A',
    surfaceVariant: '#EEF1F5',
    onSurfaceVariant: '#475569',
    outline: '#98A2B3',
    outlineVariant: '#E4E7EC',
    error: '#D92D20',
    onError: '#FFFFFF',
    errorContainer: '#FBDCDC',
    onErrorContainer: '#7F1D1D',
  },
  roundness: 12,
};

/** Alias so the theme context can import the light theme by name. */
export const lightTheme: MD3Theme = theme;

/* ------------------------- Status badge palette -------------------------- */

/** Chip colors for a single order status (label + container bg + fg). */
export interface StatusTone {
  label: string;
  bg: string;
  fg: string;
}

/**
 * Maps an order status to an M3 tonal-chip tone. Solid container/onContainer
 * pairs per mode so the chips hold contrast on light and dark surfaces.
 */
export function statusTone(status: string, dark = false): StatusTone {
  const u = String(status || '').toUpperCase();
  if (dark) {
    switch (u) {
      case 'PENDING':
        return { label: 'Pending', bg: '#4A3A12', fg: '#F5C86B' };
      case 'PAID':
      case 'FULFILLED':
      case 'PROCESSING':
        return { label: 'Processing', bg: '#17325C', fg: '#93BFFF' };
      case 'DELIVERED':
      case 'COMPLETED':
        return { label: 'Completed', bg: '#0E3D2E', fg: '#6EE7B7' };
      case 'CANCELLED':
        return { label: 'Cancelled', bg: '#4A1B1B', fg: '#FCA5A5' };
      default:
        return { label: status || 'Unknown', bg: '#2A3140', fg: '#A7B0C0' };
    }
  }
  switch (u) {
    case 'PENDING':
      return { label: 'Pending', bg: '#FDE8C3', fg: '#7A4A00' };
    case 'PAID':
    case 'FULFILLED':
    case 'PROCESSING':
      return { label: 'Processing', bg: '#D6E4FF', fg: '#1B4DB1' };
    case 'DELIVERED':
    case 'COMPLETED':
      return { label: 'Completed', bg: '#CFEEDE', fg: '#0B6B45' };
    case 'CANCELLED':
      return { label: 'Cancelled', bg: '#FBDCDC', fg: '#9B1C1C' };
    default:
      return { label: status || 'Unknown', bg: '#E7EAEF', fg: '#475569' };
  }
}

/* ------------------------- Category accent palette ----------------------- */

/**
 * Restrained per-category accents, only for metric icon glyphs and tiny
 * accents — never for glows or full-card borders. M3-consistent, legible on
 * both light and dark surfaces.
 */
export const ACCENT = {
  /** Revenue & Sales. */
  revenue: '#0E6B4F',
  /** Orders & Fulfillment. */
  orders: '#1B4DB1',
  /** POS & Transactions. */
  pos: '#0E7490',
  /** Inventory Alerts. */
  inventory: '#92400E',
  /** Primary Branding & Actions. */
  primary: '#0066FF',
} as const;

/* ------------------------- Dark paper theme ------------------------------ */

/**
 * MD3 dark theme built on Midnight Slate (#090D16). Complete M3 role set so
 * Paper components and every screen that follows the theme render correctly
 * in dark mode.
 */
export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  dark: true,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#8FB8FF',
    onPrimary: '#002F67',
    primaryContainer: '#0B2B66',
    onPrimaryContainer: '#D6E3FF',
    secondary: '#C3C9D4',
    onSecondary: '#263141',
    secondaryContainer: '#3A4456',
    onSecondaryContainer: '#E2E8F0',
    tertiary: '#6EE7B7',
    onTertiary: '#00382A',
    tertiaryContainer: '#0E3D2E',
    onTertiaryContainer: '#8EF0C8',
    background: '#090D16',
    onBackground: '#E6EAF0',
    surface: '#141A24',
    onSurface: '#E6EAF0',
    surfaceVariant: '#1E2634',
    onSurfaceVariant: '#9AA5B5',
    outline: '#475467',
    outlineVariant: '#273041',
    error: '#FF8A80',
    onError: '#5F1008',
    errorContainer: '#4A1B1B',
    onErrorContainer: '#FFB4A8',
  },
  roundness: 12,
};

/** Format an amount as Ghana Cedi, e.g. 250 -> "GH₵ 250.00". */
export function formatGhs(amount: number): string {
  const n = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `GH₵ ${n.toFixed(2)}`;
}
