import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { api, apiErrorMessage } from '@/api/client';

export default function ResetPasswordScreen() {
  const { token: routeToken } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = typeof routeToken === 'string' ? routeToken : '';
  const router = useRouter();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const offset = useSharedValue(reduceMotion ? 0 : 12);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withTiming(1, { duration: 280 });
    offset.value = withTiming(0, { duration: 280 });
  }, [opacity, offset, reduceMotion]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));

  async function submit() {
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    if (!token) {
      setError('This reset link is invalid. Request a new one.');
      return;
    }

    setBusy(true);
    try {
      await api.post('/api/site-settings/password/reset', { token, newPassword: password });
      setDone(true);
      setPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not reset your password. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outlineVariant,
              },
              entranceStyle,
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryContainer }]}>
              <IconButton
                icon={done ? 'check' : 'lock-reset'}
                iconColor={colors.primary}
                size={30}
                accessibilityLabel={done ? 'Password reset complete' : 'Reset password'}
              />
            </View>
            <Text variant="headlineSmall" style={[styles.title, { color: colors.onSurface }]}>
              {done ? 'Password updated' : 'Choose a new password'}
            </Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              {done
                ? 'Your password has been reset. You can now sign in with your new password.'
                : token
                  ? 'Create a new password for your DiDwa store account.'
                  : 'This link is missing its reset token. Request a fresh link from sign in.'}
            </Text>

            {done ? (
              <Button
                mode="contained"
                onPress={() => router.replace('/(auth)/login')}
                style={styles.action}
              >
                Back to sign in
              </Button>
            ) : token ? (
              <>
                <TextInput
                  label="New password"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  secureTextEntry={secure}
                  right={
                    <TextInput.Icon
                      icon={secure ? 'eye-off-outline' : 'eye-outline'}
                      onPress={() => setSecure((value) => !value)}
                      accessibilityLabel={secure ? 'Show password' : 'Hide password'}
                    />
                  }
                  style={styles.input}
                />
                <TextInput
                  label="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  mode="outlined"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  secureTextEntry={secure}
                  returnKeyType="done"
                  onSubmitEditing={() => void submit()}
                  style={styles.input}
                />
                {error ? (
                  <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>
                    {error}
                  </Text>
                ) : null}
                <Button
                  mode="contained"
                  onPress={() => void submit()}
                  loading={busy}
                  disabled={busy || !password || !confirmPassword}
                  style={styles.action}
                >
                  Reset password
                </Button>
                <Button onPress={() => router.replace('/(auth)/login')} style={styles.back}>
                  Back to sign in
                </Button>
              </>
            ) : (
              <Button
                mode="contained"
                onPress={() => router.replace('/(auth)/login')}
                style={styles.action}
              >
                Go to sign in
              </Button>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    elevation: 3,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontWeight: '800', textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 22 },
  input: { marginBottom: 12 },
  error: { marginVertical: 6 },
  action: { marginTop: 12 },
  back: { marginTop: 8 },
});
