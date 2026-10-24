import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  authenticateWithBiometrics,
  biometricTypeLabel,
  checkBiometricSupport,
  isBiometricLockEnabled,
} from '@/services/biometricService';

/**
 * Full-screen biometric lock overlay.
 *
 * Props:
 *   - `isLocked` — when true, overlay is visible.
 *   - `onUnlock` — called when biometric authentication succeeds.
 *
 * Behavior:
 *   - Auto-triggers biometric authentication on mount (only if biometric lock is enabled).
 *   - On success → calls `onUnlock`.
 *   - On cancel/failure → stays locked; offers "Sign in with password" link.
 */
export function AppLockOverlay({
  isLocked,
  onUnlock,
}: {
  isLocked: boolean;
  onUnlock: () => void;
}): React.ReactNode {
  const router = useRouter();
  const { colors } = useTheme();
  const [authenticating, setAuthenticating] = useState(false);
  const [label, setLabel] = useState('Biometrics');

  const attemptUnlock = useCallback(async () => {
    // Safety check: biometrics is for app lock only — if not enabled, redirect to password login.
    const enabled = await isBiometricLockEnabled();
    if (!enabled) {
      router.replace('/(auth)/login');
      return;
    }

    const supported = await checkBiometricSupport();
    if (!supported) {
      router.replace('/(auth)/login');
      return;
    }

    setAuthenticating(true);
    try {
      const success = await authenticateWithBiometrics();
      if (success) {
        onUnlock();
      }
    } finally {
      setAuthenticating(false);
    }
  }, [onUnlock, router]);

  useEffect(() => {
    void biometricTypeLabel().then(setLabel);
    if (isLocked) {
      void attemptUnlock();
    }
  }, [isLocked, attemptUnlock]);

  if (!isLocked) return null;

  const icon = Platform.OS === 'ios' ? (
    <MaterialCommunityIcons name="lock" size={64} color={colors.primary} />
  ) : (
    <MaterialCommunityIcons name="fingerprint" size={64} color={colors.primary} />
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>{icon}</View>
        <Text variant="titleLarge" style={styles.title}>
          DiDwa Seller is locked
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Unlock with {label} to continue
        </Text>
        <View style={styles.buttonRow}>
          <Button
            mode="contained"
            onPress={attemptUnlock}
            loading={authenticating}
            disabled={authenticating}
          >
            Unlock
          </Button>
        </View>
        <Text
          variant="bodySmall"
          style={styles.link}
          onPress={() => router.replace('/(auth)/login')}
        >
          Sign in with password instead
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 24,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    width: '100%',
    marginBottom: 16,
  },
  link: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
});