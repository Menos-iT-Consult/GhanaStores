import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_LOCK_KEY = 'didwa.biometric_lock';

/**
 * Check whether the device supports biometric authentication (hardware + enrolled).
 */
export async function checkBiometricSupport(): Promise<boolean> {
  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Authenticate the user with biometrics (Face ID / Touch ID / Fingerprint).
 *
 * `disableDeviceFallback: true` means the device passcode CANNOT be used to
 * bypass the app lock — biometrics is the only local unlock path. If the user
 * cancels or biometrics fails, we return `false` and the caller can offer the
 * password login screen instead.
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access DiDwa Seller',
      cancelLabel: 'Cancel',
      disableDeviceFallback: true,
    });
    return result.success === true;
  } catch {
    return false;
  }
}

/**
 * Persist the biometric lock preference to SecureStore.
 */
export async function setBiometricLockPreference(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_LOCK_KEY, enabled ? '1' : '0');
}

/**
 * Read the biometric lock preference from SecureStore. Defaults to `false`.
 */
export async function isBiometricLockEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_LOCK_KEY);
  return value === '1';
}

/**
 * Clear the biometric lock preference (e.g. on sign-out).
 */
export async function clearBiometricLockPreference(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_LOCK_KEY).catch(() => undefined);
}

/**
 * Platform-appropriate biometric type label for UI subtitles.
 */
export async function biometricTypeLabel(): Promise<string> {
  const type = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (Platform.OS === 'ios') {
    return 'Face ID / Touch ID';
  }
  if (type.includes((LocalAuthentication.AuthenticationType as any).BIOMETRICS)) {
    return 'Fingerprint / Face Unlock';
  }
  return 'Biometrics';
}