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

/* ------------------------- Status badge palette -------------------------- */

export interface StatusTone {
  label: string;
  bg: string;
  fg: string;
}

/**
 * Maps an order status to a chip tone. Pending -> amber, Processing/Paid ->
 * blue, Delivered/Completed -> green, Cancelled -> red.
 */
export function statusTone(status: string): StatusTone {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING':
      return { label: 'Pending', bg: '#FEF3C7', fg: '#92400E' };
    case 'PAID':
    case 'FULFILLED':
    case 'PROCESSING':
      return { label: 'Processing', bg: '#DBEAFE', fg: '#1E40AF' };
    case 'DELIVERED':
    case 'COMPLETED':
      return { label: 'Completed', bg: '#DCFCE7', fg: '#166534' };
    case 'CANCELLED':
      return { label: 'Cancelled', bg: '#FEE2E2', fg: '#991B1B' };
    default:
      return { label: status || 'Unknown', bg: '#E2E8F0', fg: '#334155' };
  }
}

/** Format an amount as Ghana Cedi, e.g. 250 -> "GH₵ 250.00". */
export function formatGhs(amount: number): string {
  const n = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `GH₵ ${n.toFixed(2)}`;
}
