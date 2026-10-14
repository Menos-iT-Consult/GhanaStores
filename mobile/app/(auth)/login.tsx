import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, Snackbar, ActivityIndicator } from 'react-native-paper';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { API_BASE_URL } from '@/api/client';

/**
 * Merchant login. Email + password; if the account has 2FA enabled the backend
 * returns a challenge and we show a second step for the authenticator code.
 */
export default function LoginScreen() {
  const { signIn, completeTwoFactor } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const [challenge, setChallenge] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secure, setSecure] = useState(true);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      const result = await signIn(email.trim(), password);
      if ('twoFactorRequired' in result && result.twoFactorRequired) {
        setChallenge(result.challenge);
      }
      // Otherwise AuthProvider has already moved us to the tabs.
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not sign in. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitCode() {
    if (!challenge) return;
    setError(null);
    setBusy(true);
    try {
      await completeTwoFactor(challenge, code.trim());
    } catch (err) {
      setError(apiErrorMessage(err, 'That code is not correct.'));
    } finally {
      setBusy(false);
    }
  }

  const twoFactor = Boolean(challenge);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.brand}>
        <Text variant="headlineMedium" style={styles.logo}>DiDwa</Text>
        <Text variant="bodyMedium" style={styles.tagline}>Seller App</Text>
      </View>

      <Card mode="elevated" style={styles.card}>
        <View style={styles.cardBody}>
          {twoFactor ? (
            <>
              <Text variant="titleLarge" style={styles.heading}>Two-factor verification</Text>
              <Text variant="bodyMedium" style={styles.subheading}>
                Enter the 6-digit code from your authenticator app.
              </Text>
              <TextInput
                label="Verification code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={8}
                mode="outlined"
                style={styles.input}
                autoFocus
              />
              <Button
                mode="contained"
                onPress={onSubmitCode}
                disabled={busy || code.trim().length < 6}
                style={styles.button}
              >
                {busy ? <ActivityIndicator color="#fff" /> : 'Verify'}
              </Button>
              <Button
                mode="text"
                onPress={() => {
                  setChallenge(null);
                  setCode('');
                }}
                style={styles.back}
              >
                Back to sign in
              </Button>
            </>
          ) : (
            <>
              <Text variant="titleLarge" style={styles.heading}>Welcome back</Text>
              <Text variant="bodyMedium" style={styles.subheading}>
                Sign in to manage your store on the go.
              </Text>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secure}
                autoCapitalize="none"
                mode="outlined"
                style={styles.input}
                right={<TextInput.Icon icon={secure ? 'eye' : 'eye-off'} onPress={() => setSecure((s) => !s)} />}
              />
              <Button
                mode="contained"
                onPress={onSubmit}
                disabled={busy || !email.trim() || !password}
                style={styles.button}
              >
                {busy ? <ActivityIndicator color="#fff" /> : 'Sign in'}
              </Button>
            </>
          )}
        </View>
      </Card>

      <Text variant="bodySmall" style={styles.footer}>
        Connected to {API_BASE_URL}
      </Text>

      <Snackbar visible={Boolean(error)} onDismiss={() => setError(null)} duration={4000}>
        {error}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24, justifyContent: 'center', flexGrow: 1 },
  brand: { alignItems: 'center', marginBottom: 24 },
  logo: { color: '#0066FF', fontWeight: '800', letterSpacing: 0.5 },
  tagline: { color: '#64748B', marginTop: 2 },
  card: { backgroundColor: '#FFFFFF' },
  cardBody: { padding: 20 },
  heading: { color: '#0F172A', fontWeight: '700' },
  subheading: { color: '#64748B', marginTop: 4, marginBottom: 16 },
  input: { marginBottom: 14 },
  button: { marginTop: 6, backgroundColor: '#0066FF' },
  back: { marginTop: 10 },
  footer: { color: '#94A3B8', textAlign: 'center', marginTop: 24 },
});
