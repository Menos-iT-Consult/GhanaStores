import AsyncStorage from '@react-native-async-storage/async-storage';

/** AsyncStorage flag marking that the welcome/onboarding carousel has been seen. */
export const ONBOARDED_KEY = 'didwa.onboarded.v1';

/** True once the merchant has finished (or skipped) onboarding. Safe on read errors. */
export async function hasOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDED_KEY)) === 'true';
  } catch {
    // If storage is unavailable, fall back to showing onboarding again (harmless).
    return false;
  }
}

/** Persist that onboarding is complete. Best-effort — never throws to the caller. */
export async function setOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
  } catch {
    // Non-fatal: the user can still navigate; worst case onboarding shows once more.
  }
}
