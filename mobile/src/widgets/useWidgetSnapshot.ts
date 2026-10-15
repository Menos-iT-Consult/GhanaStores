import React from 'react';
import { readWidgetSnapshot, type WidgetSnapshot } from './snapshot';

/**
 * Reactive view of the widget snapshot. Polls AsyncStorage on an interval so
 * in-app glance widgets stay fresh even when dashboard queries update the
 * snapshot from another screen. Defensive defaults: never throws, never null.
 */
export function useWidgetSnapshot(pollMs = 30_000): WidgetSnapshot & { refreshedAt: number } {
  const [snapshot, setSnapshot] = React.useState<WidgetSnapshot | null>(null);

  const load = React.useCallback(() => {
    readWidgetSnapshot()
      .then(setSnapshot)
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  return React.useMemo(
    () => ({
      ...(snapshot ?? {
        version: 1 as const,
        updatedAt: new Date(0).toISOString(),
        storeName: null,
        todayRevenue: 0,
        weekRevenue: 0,
        paidOrders: 0,
        pendingOrders: 0,
        lowStockCount: 0,
        transitCash: 0,
        recentOrders: [],
      }),
      refreshedAt: Date.now(),
    }),
    [snapshot],
  );
}
