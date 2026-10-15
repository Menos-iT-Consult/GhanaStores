import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Offline catalog cache for the POS screen.
 *
 * The register must stay usable with no network, so the last known product
 * list is persisted to AsyncStorage. The POS screen treats the server as the
 * source of truth when reachable and falls back to this cache otherwise.
 */
const CATALOG_KEY = 'didwa.catalog.v1';

export async function loadCatalog<T>(): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(CATALOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function saveCatalog<T>(products: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CATALOG_KEY, JSON.stringify(products));
  } catch {
    /* cache is best-effort: a full disk must never break the POS */
  }
}
