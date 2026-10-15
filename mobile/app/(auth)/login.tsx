import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Text, TextInput, Snackbar, ActivityIndicator } from 'react-native-paper';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';

/**
 * The public DiDwa web app (reserved `app` subdomain). Its `/login` route opens
 * in register/signup mode by default, so that is the "create an account" target,
 * and `/reset-password` is the public password-recovery page.
 */
const WEB_APP_URL = 'https://didwaghana.com';
const SIGNUP_URL = `${WEB_APP_URL}/login`;
const RESET_URL = `${WEB_APP_URL}/reset-password`;

function openExternal(url: string) {
  Linking.openURL(url).catch(() => undefined);
}

/**
 * Merchant login. Email + password; if the account has 2FA enabled the backend
 * returns a challenge and we show a second step for the authenticator code.
 *
 * Presentation: branded logo header, staggered fade/slide entrance, and a footer
 * that routes account creation to the DiDwa web app (accounts are created there,
 * not in the app). All auth/2FA behaviour is unchanged.
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

  // Staggered entrance: brand -> card -> footer.
  const brand = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const footer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(brand, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(card, { toValue: 1, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(footer, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [brand, card, footer]);

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

  const brandAnim = {
    opacity: brand,
    transform: [{ translateY: brand.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };
  const cardAnim = {
    opacity: card,
    transform: [{ translateY: card.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };
  const footerAnim = { opacity: footer };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.brand, brandAnim]}>
          <View style={styles.logoShadow}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="cover" />
          </View>
          <Text variant="headlineMedium" style={styles.logoWord}>DiDwa</Text>
          <Text variant="bodyMedium" style={styles.tagline}>Seller App</Text>
        </Animated.View>
        <Animated.View style={cardAnim}>
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
                    theme={inputTheme}
                    autoFocus
                  />
                  <Button
                    mode="contained"
                    onPress={onSubmitCode}
                    disabled={busy || code.trim().length < 6}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
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
                    textColor="#64748B"
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
                    theme={inputTheme}
                  />
                  <TextInput
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={secure}
                    autoCapitalize="none"
                    mode="outlined"
                    style={styles.input}
                    theme={inputTheme}
                    right={<TextInput.Icon icon={secure ? 'eye' : 'eye-off'} onPress={() => setSecure((s) => !s)} />}
                  />
                  <Pressable onPress={() => openExternal(RESET_URL)} hitSlop={8} style={styles.forgot}>
                    <Text variant="bodySmall" style={styles.forgotText}>Forgot password?</Text>
                  </Pressable>
                  <Button
                    mode="contained"
                    onPress={onSubmit}
                    disabled={busy || !email.trim() || !password}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                  >
                    {busy ? <ActivityIndicator color="#fff" /> : 'Sign in'}
                  </Button>
                </>
              )}
            </View>
          </Card>
        </Animated.View>

        <Animated.View style={[styles.signup, footerAnim]}>
          <Text variant="bodyMedium" style={styles.signupPrompt}>No account yet?</Text>
          <Pressable onPress={() => openExternal(SIGNUP_URL)} hitSlop={8} accessibilityRole="link">
            <Text variant="bodyMedium" style={styles.signupLink}>Create one on DiDwa Web</Text>
          </Pressable>
        </Animated.View>

        <Snackbar visible={Boolean(error)} onDismiss={() => setError(null)} duration={4000}>
          {error}
        </Snackbar>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Subtle brand-tinted outline + white field background for the text inputs. */
const inputTheme = {
  colors: {
    primary: '#0066FF',
    background: '#FFFFFF',
  },
  roundness: 12,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  brand: { alignItems: 'center', marginBottom: 28 },
  logoShadow: {
    shadowColor: '#0066FF',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    borderRadius: 26,
  },
  logo: { width: 96, height: 96, borderRadius: 26 },
  logoWord: { color: '#0F172A', fontWeight: '800', letterSpacing: 0.5, marginTop: 14 },
  tagline: { color: '#64748B', marginTop: 2 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20 },
  cardBody: { padding: 22 },
  heading: { color: '#0F172A', fontWeight: '700' },
  subheading: { color: '#64748B', marginTop: 4, marginBottom: 18 },
  input: { marginBottom: 14, backgroundColor: '#FFFFFF' },
  forgot: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 8 },
  forgotText: { color: '#0066FF', fontWeight: '600' },
  button: { marginTop: 6, backgroundColor: '#0066FF', borderRadius: 12 },
  buttonContent: { height: 50 },
  back: { marginTop: 10 },
  signup: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 26, flexWrap: 'wrap' },
  signupPrompt: { color: '#64748B' },
  signupLink: { color: '#0066FF', fontWeight: '700', marginLeft: 6 },
});
