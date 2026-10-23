import React, { useCallback, useEffect, useState } from 'react';
import { List, Switch } from 'react-native-paper';
import { Platform } from 'react-native';
import {
  biometricTypeLabel,
  checkBiometricSupport,
  isBiometricLockEnabled,
  setBiometricLockPreference,
} from '@/services/biometricService';

/**
 * Settings row: "Require Biometrics on Open".
 *
 * Hidden entirely when the device has no biometrics hardware or no enrolled
 * biometrics. Toggling persists the preference to SecureStore via
 * `didwa.biometric_lock`.
 */
export function BiometricLockSetting(): React.ReactNode {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('Biometrics');

  const refresh = useCallback(async () => {
    const supported = await checkBiometricSupport();
    setSupported(supported);
    if (supported) {
      const enabled = await isBiometricLockEnabled();
      setEnabled(enabled);
      setLabel(await biometricTypeLabel());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading || supported === false || supported === null) {
    return null;
  }

  const handleToggle = async (value: boolean) => {
    await setBiometricLockPreference(value);
    setEnabled(value);
  };

  return (
    <List.Item
      title="Require Biometrics on Open"
      description={`Lock when backgrounded — unlock with ${label}`}
      left={(props) => (
        <List.Icon {...props} icon={Platform.OS === 'ios' ? 'face-id' : 'fingerprint'} />
      )}
      right={(props) => <Switch {...props} value={enabled} onValueChange={handleToggle} />}
    />
  );
}