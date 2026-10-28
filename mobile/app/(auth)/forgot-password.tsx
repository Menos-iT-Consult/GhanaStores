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

export default function ForgotPasswordScreen() {
  const { email: routeEmail } = useLocalSearchParams<{ email?: string | string[] }>();
  const router = useRouter();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const offset = useSharedValue(reduceMotion ? 0 : 12);
  const [email, setEmail] = useState(typeof routeEmail === 'string' ? routeEmail : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (typeof routeEmail === 'string') setEmail(routeEmail);
  }, [routeEmail]);

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
    const normalizedEmail = email.trim();
    setError(null);
    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }

    setBusy(true);
    try {
      await api.post('/api/site-settings/password/forgot', { email: normalizedEmail });
      setSent(true);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not send reset link. Please try again.'));
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
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
              entranceStyle,
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryContainer }]}>
              <IconButton
                icon={sent ? 'email-check-outline' : 'email-lock-outline'}
                iconColor={colors.primary}
                size={30}
                accessibilityLabel={sent ? 'Reset email sent' : 'Reset password'}
              />
            </View>
            <Text variant="headlineSmall" style={[styles.title, { color: colors.onSurface }]}>
              {sent ? 'Check your email' : 'Reset your password'}
            </Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              {sent
                ? 'If an account exists for that address, a password reset link is on its way.'
                : 'Enter the email address connected to your DiDwa store and we’ll send you a reset link.'}
            </Text>

            {sent ? (
              <Button
                mode="contained"
                onPress={() => router.replace('/(auth)/login')}
                style={styles.action}
              >
                Back to sign in
              </Button>
            ) : (
              <>
                <TextInput
                  label="Email address"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="send"
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
                  disabled={busy || !email.trim()}
                  style={styles.action}
                >
                  Send reset link
                </Button>
                <Button onPress={() => router.replace('/(auth)/login')} style={styles.back}>
                  Back to sign in
                </Button>
              </>
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
