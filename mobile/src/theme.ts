import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

/**
 * DiDwa brand theme for React Native Paper (MD3).
 * Primary #0066FF / Secondary #1E293B, background #F8FAFC.
 */
export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0066FF',
    onPrimary: '#FFFFFF',
    primaryContainer: '#DCEBFF',
    onPrimaryContainer: '#0A2540',
    secondary: '#1E293B',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E2E8F0',
    onSecondaryContainer: '#0F172A',
    background: '#F8FAFC',
    onBackground: '#0F172A',
    surface: '#FFFFFF',
    onSurface: '#0F172A',
    surfaceVariant: '#EEF2F7',
    onSurfaceVariant: '#475569',
    outline: '#CBD5E1',
    outlineVariant: '#E2E8F0',
    error: '#DC2626',
    onError: '#FFFFFF',
    errorContainer: '#FEE2E2',
  },
  roundness: 12,
};

/** Alias so the theme context can import the light theme by name. */
export const lightTheme: MD3Theme = theme;

/* ------------------------- Status badge palette -------------------------- */

/** Chip colors for a single order status (label + translucent bg + fg). */
export interface StatusTone {
  label: string;
  bg: string;
  fg: string;
}

/**
 * Maps an order status to a chip tone.
 * Pending -> amber, Paid/Processing/Fulfilled -> blue, Delivered/Completed ->
 * emerald, Cancelled -> red. Translucent fills so the chips read on both
 * light and dark glass canvases.
 */
export function statusTone(status: string): StatusTone {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING':
      return { label: 'Pending', bg: 'rgba(245,158,11,0.22)', fg: '#FBBF24' };
    case 'PAID':
    case 'FULFILLED':
    case 'PROCESSING':
      return { label: 'Processing', bg: 'rgba(59,130,246,0.22)', fg: '#60A5FA' };
    case 'DELIVERED':
    case 'COMPLETED':
      return { label: 'Completed', bg: 'rgba(16,185,129,0.22)', fg: '#34D399' };
    case 'CANCELLED':
      return { label: 'Cancelled', bg: 'rgba(239,68,68,0.22)', fg: '#FCA5A5' };
    default:
      return { label: status || 'Unknown', bg: 'rgba(148,163,184,0.15)', fg: '#CBD5E1' };
  }
}

/* ------------------------- Multi-color accent palette --------------------- */

/**
 * Category-specific accent colors for high-contrast data scanning across the
 * dark glass dashboard. Each section of the dashboard picks its accent so a
 * glance tells the merchant what kind of number they're looking at.
 */
export const ACCENT = {
  /** Revenue & Sales — Electric Emerald. */
  revenue: '#10B981',
  /** Orders & Fulfillment — Vibrant Purple. */
  orders: '#8B5CF6',
  /** POS & Transactions — Electric Cyan. */
  pos: '#06B6D4',
  /** Inventory Alerts — Amber Gold. */
  inventory: '#F59E0B',
  /** Primary Branding & Actions — Deep Blue. */
  primary: '#0066FF',
} as const;

/* ------------------------- Dark paper theme ------------------------------ */

/**
 * MD3 dark theme built on Midnight Slate (#090D16). Paper components
 * (Snackbar, Chip, TouchableRipple) fall back to these colors; the custom
 * glass components use the tokens in @/components/glass/glass.
 */
export const darkTheme: MD3Theme = {
  ...MD3LightTheme,
  dark: true,
  colors: {
    ...MD3LightTheme.colors,
    primary: ACCENT.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: 'rgba(0,102,255,0.18)',
    onPrimaryContainer: '#FFFFFF',
    secondary: ACCENT.orders,
    onSecondary: '#FFFFFF',
    secondaryContainer: 'rgba(139,92,246,0.18)',
    onSecondaryContainer: '#FFFFFF',
    background: '#090D16',
    onBackground: '#F8FAFC',
    surface: '#0F172A',
    onSurface: '#F8FAFC',
    surfaceVariant: '#1E293B',
    onSurfaceVariant: '#94A3B8',
    outline: '#334155',
    outlineVariant: '#1E293B',
    error: '#DC2626',
    onError: '#FFFFFF',
    errorContainer: 'rgba(239,68,68,0.18)',
    onErrorContainer: '#FCA5A5',
  },
  roundness: 20,
};

/** Format an amount as Ghana Cedi, e.g. 250 -> "GH₵ 250.00". */
export function formatGhs(amount: number): string {
  const n = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `GH₵ ${n.toFixed(2)}`;
}
