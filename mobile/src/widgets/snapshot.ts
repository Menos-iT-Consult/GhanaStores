import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Shared widget snapshot — the bridge between the app and every home-screen
 * widget surface.
 *
 * - The app writes a snapshot whenever the dashboard data refreshes
 *   (see `writeWidgetSnapshot`).
 * - The Android widget task handler reads it when the OS asks for a widget
 *   update (cold-render path, no network/auth needed inside the widget).
 * - The future iOS WidgetKit extension (Phase B, needs SDK 56 `expo-widgets`)
 *   will read this same key through the shared App Group.
 *
 * Shape is intentionally small and JSON-serializable: keep it under a few KB.
 */

export interface WidgetSnapshotOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
}

export interface WidgetSnapshot {
  version: 1;
  updatedAt: string;
  storeName: string | null;
  todayRevenue: number;
  weekRevenue: number;
  paidOrders: number;
  pendingOrders: number;
  lowStockCount: number;
  transitCash: number;
  recentOrders: WidgetSnapshotOrder[];
}

const KEY = 'didwa.widget_snapshot.v1';

export const EMPTY_SNAPSHOT: WidgetSnapshot = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  storeName: null,
  todayRevenue: 0,
  weekRevenue: 0,
  paidOrders: 0,
  pendingOrders: 0,
  lowStockCount: 0,
  transitCash: 0,
  recentOrders: [],
};

export async function writeWidgetSnapshot(patch: Omit<WidgetSnapshot, 'version' | 'updatedAt'>): Promise<void> {
  const snapshot: WidgetSnapshot = { ...patch, version: 1, updatedAt: new Date().toISOString() };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* widget snapshot is best-effort: never break the app for it */
  }
}

export async function readWidgetSnapshot(): Promise<WidgetSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY_SNAPSHOT;
    const parsed = JSON.parse(raw) as Partial<WidgetSnapshot>;
    if (parsed?.version !== 1) return EMPTY_SNAPSHOT;
    return { ...EMPTY_SNAPSHOT, ...parsed, version: 1 };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

export async function clearWidgetSnapshot(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
