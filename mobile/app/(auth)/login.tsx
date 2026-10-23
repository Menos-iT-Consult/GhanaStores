import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Snackbar, Text, TextInput, ActivityIndicator as PaperActivityIndicator, useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  type SharedValue,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { authenticateWithBiometrics } from '@/services/biometricService';
import { api, apiErrorMessage } from '@/api/client';

/**
 * DiDwa Seller — premium dark-themed login screen.
 *
 * Design: deep matte charcoal/slate background (#0B0F19), single refined
 * accent (#2563EB blue), frosted card surface (#1E293B) with subtle drop
 * shadows. All animations are native-driven via react-native-reanimated v3.
 *
 * Auth behaviour (email/password + 2FA) is unchanged from the previous
 * implementation; only the presentation layer is redesigned.
 */

const WEB_APP_URL = 'https://didwaghana.com';
const SIGNUP_URL = `${WEB_APP_URL}/login`;
const RESET_URL = `${WEB_APP_URL}/reset-password`;

const ACCENT = '#2563EB';
const CARD_BG = '#1E293B';
const BORDER = '#334155';
const BG_COLOR = '#0B0F19';
const INPUT_BG = '#0F172A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = '#94A3B8';

function openExternal(url: string) {
  Linking.openURL(url).catch(() => undefined);
}

export default function LoginScreen() {
  const { signIn, completeTwoFactor } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secure, setSecure] = useState(true);
  const [emailFocused, setEmailFocused] = useState(false);

/* Forgot password modal states */
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleForgotPassword = () => {
    setResetModalVisible(true);
    setResetEmail(email);
  };
  const [passwordFocused, setPasswordFocused] = useState(false);

  /* --------------------------------- Entrance animations --------------------------------- */

  const brandScale = useSharedValue(0);
  const brandOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(20);
  const footerOpacity = useSharedValue(0);
  const footerTranslateY = useSharedValue(20);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    // 1 · Brand icon: fade in + slide up from -25
    brandScale.value = withSpring(1, { damping: 22, stiffness: 180 });
    brandOpacity.value = withTiming(1, { duration: 700 });

    // 2 · Card: fade in + scale 0.97 → 1
    cardScale.value = withDelay(150, withSpring(1, { damping: 22, stiffness: 180 }));
    cardOpacity.value = withDelay(150, withTiming(1, { duration: 700 }));

    // 3 · Form fields: slide up + fade (sequential spring)
    formOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    formTranslateY.value = withDelay(300, withTiming(0, { duration: 600 }));

    // Footer: slide up + fade
    footerOpacity.value = withDelay(450, withTiming(1, { duration: 600 }));
    footerTranslateY.value = withDelay(450, withTiming(0, { duration: 600 }));
  }, []);

  const brandAnim = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [
      { scale: brandScale.value },
      { translateY: brandOpacity.interpolate({ inputRange: [0, 1], outputRange: [-25, 0] }) as number },
    ],
  }));

  const cardAnim = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const formAnim = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const footerAnim = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
    transform: [{ translateY: footerTranslateY.value }],
  }));

  const buttonAnim = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const onButtonPressIn = () => {
    buttonScale.value = withSpring(0.98, { damping: 18, stiffness: 120 });
  };

  const onButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 18, stiffness: 120 });
  };

  /* --------------------------------- Auth --------------------------------- */

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      const result = await signIn(email.trim(), password);
      if ('twoFactorRequired' in result && result.twoFactorRequired) {
        setChallenge(result.challenge);
      }
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

  async function sendReset() {
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.');
      return;
    }
    setResetError(null);
    setResetBusy(true);
    try {
      await api.post('/api/site-settings/password/forgot', { email: resetEmail.trim() });
      setResetSent(true);
      setResetEmail('');
    } catch (err) {
      setResetError(apiErrorMessage(err, 'Could not send reset link. Please try again.'));
    } finally {
      setResetBusy(false);
    }
  }

  async function onBiometricLogin() {
    setBusy(true);
    try {
      const success = await authenticateWithBiometrics();
      if (success) {
        router.replace('/(tabs)/dashboard');
      }
    } catch {
      setError('Biometric authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  const twoFactor = Boolean(challenge);
  const isFormValid = email.trim().length > 0 && password.length > 0;
  const isCodeValid = code.length >= 6;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.root}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Brand header */}
          <Animated.View style={[styles.brand, brandAnim]}>
            <View style={styles.logoWrap}>
              <MaterialCommunityIcons name="store" size={56} color={ACCENT} />
            </View>
            <Text style={styles.appName}>DiDwa</Text>
            <Text style={styles.appSubtitle}>Seller App</Text>
          </Animated.View>

          {/* Login card */}
          <Animated.View style={[styles.cardWrap, cardAnim]}>
            <View style={[styles.card, { backgroundColor: CARD_BG }]}>
              <View style={styles.cardBody}>
                <Text style={styles.heading}>Welcome back 👋</Text>
                <Text style={styles.subheading}>Sign in to manage your store on the go.</Text>

                {!twoFactor ? (
                  <>
                    {/* Email input */}
                    <View style={styles.inputWrap}>
                      <MaterialCommunityIcons
                        name="email-outline"
                        size={20}
                        color={emailFocused ? ACCENT : TEXT_MUTED}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        returnKeyType="next"
                        style={[styles.input, emailFocused ? styles.inputFocused : null]}
                        placeholderTextColor="#64748B"
                        selectionColor={ACCENT}
                        underlineColorAndroid="transparent"
                      />
                    </View>

                    {/* Password input */}
                    <View style={styles.inputWrap}>
                      <MaterialCommunityIcons
                        name={secure ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={passwordFocused ? ACCENT : TEXT_MUTED}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        secureTextEntry={secure}
                        autoCapitalize="none"
                        returnKeyType="done"
                        style={[styles.input, passwordFocused ? styles.inputFocused : null]}
                        placeholderTextColor="#64748B"
                        selectionColor={ACCENT}
                        underlineColorAndroid="transparent"
                      />
                      <Pressable
                        onPress={() => setSecure((s) => !s)}
                        hitSlop={12}
                        style={styles.eyeWrap}
                      >
                        <MaterialCommunityIcons
                          name={secure ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={TEXT_MUTED}
                        />
                      </Pressable>
                    </View>

                    <Pressable onPress={() => setResetModalVisible(true)} hitSlop={12} style={styles.forgotWrap} disabled={false}>
                      <Text style={styles.forgotText}>Forgot password?</Text>
                    </Pressable>

                    {/* Sign in button */}
                    <Pressable
                      onPressIn={onButtonPressIn}
                      onPressOut={onButtonPressOut}
                      onPress={onSubmit}
                      disabled={busy || !isFormValid}
                      style={[
                        styles.button,
                        { backgroundColor: busy || !isFormValid ? '#475569' : ACCENT },
                      ]}
                    >
                      <Animated.View style={buttonAnim}>
                        {busy ? (
                          <PaperActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.buttonText}>Sign in</Text>
                        )}
                      </Animated.View>
                    </Pressable>

                    {/* Biometric login button */}
                    <Pressable
                      onPressIn={onButtonPressIn}
                      onPressOut={onButtonPressOut}
                      onPress={onBiometricLogin}
                      disabled={busy}
                      style={styles.biometricButton}
                    >
                      <View style={styles.biometricRow}>
                        <MaterialCommunityIcons name="fingerprint" size={18} color={TEXT_MUTED} />
                        <Text style={styles.biometricText}>Biometric Login</Text>
                      </View>
                    </Pressable>
                  </>
                ) : (
                  <>
                    {/* 2FA verification step */}
                    <View style={styles.inputWrap}>
                      <MaterialCommunityIcons
                        name="lock-outline"
                        size={20}
                        color={TEXT_MUTED}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        label="Verification code"
                        value={code}
                        onChangeText={setCode}
                        autoCapitalize="none"
                        keyboardType="numeric"
                        maxLength={6}
                        style={styles.input}
                        placeholderTextColor="#64748B"
                        selectionColor={ACCENT}
                        underlineColorAndroid="transparent"
                      />
                    </View>

                    <Pressable
                      onPressIn={onButtonPressIn}
                      onPressOut={onButtonPressOut}
                      onPress={onSubmitCode}
                      disabled={busy || !isCodeValid}
                      style={[
                        styles.button,
                        { backgroundColor: busy || !isCodeValid ? '#475569' : ACCENT },
                      ]}
                    >
                      <Animated.View style={buttonAnim}>
                        {busy ? (
                          <PaperActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.buttonText}>Verify</Text>
                        )}
                      </Animated.View>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Footer */}
          <Animated.View style={[styles.footer, footerAnim]}>
            <Text style={styles.footerText}>No account yet?</Text>
            <Pressable onPress={() => openExternal(SIGNUP_URL)} hitSlop={12}>
              <Text style={styles.footerLink}>Create one on DiDwa Web</Text>
            </Pressable>
          </Animated.View>

          {/* Forgot password modal */}
          <Modal visible={resetModalVisible} onDismiss={() => setResetModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  {!resetSent ? (
                    <>
                      <Text style={styles.modalTitle}>Forgot password?</Text>
                      <Text style={styles.modalSubtitle}>
                        Enter your email and we'll send a reset link.
                      </Text>
                      <View style={styles.inputWrap}>
                        <MaterialCommunityIcons
                          name="email-outline"
                          size={20}
                          color={TEXT_MUTED}
                          style={styles.inputIcon}
                        />
                        <TextInput
                          label="Email"
                          value={resetEmail}
                          onChangeText={setResetEmail}
                          autoCapitalize="none"
                          autoComplete="email"
                          keyboardType="email-address"
                          returnKeyType="done"
                          style={[styles.modalInput, { borderColor: resetError ? '#EF4444' : BORDER }]}
                          placeholderTextColor="#64748B"
                          selectionColor={ACCENT}
                          underlineColorAndroid="transparent"
                        />
                      </View>
                      {resetError && (
                        <Text style={styles.resetErrorText}>{resetError}</Text>
                      )}
                      <Pressable
                        onPress={sendReset}
                        disabled={resetBusy}
                        style={[
                          styles.button,
                          {
                            backgroundColor: resetBusy || !resetEmail.trim()
                              ? '#475569'
                              : ACCENT,
                          },
                        ]}
                      >
                        <Text style={styles.buttonText}>
                          {resetBusy ? 'Sending...' : 'Send reset link'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setResetModalVisible(false)}
                        hitSlop={12}
                        style={styles.cancelWrap}
                      >
                        <Text style={styles.cancelText}>Cancel</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Text style={styles.modalTitle}>Reset link sent</Text>
                      <Text style={styles.modalSubtitle}>
                        Check your inbox for a link to reset your password.
                      </Text>
                      <Pressable
                        onPress={() => setResetModalVisible(false)}
                        style={styles.button}
                      >
                        <Text style={styles.buttonText}>Done</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            </View>
          </Modal>

          <Snackbar visible={Boolean(error)} onDismiss={() => setError(null)} duration={4000}>
            {error}
          </Snackbar>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  root: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 15,
    color: TEXT_MUTED,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  cardWrap: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
    overflow: 'hidden',
  },
  cardBody: {
    padding: 32,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  subheading: {
    fontSize: 15,
    color: TEXT_MUTED,
    marginBottom: 28,
    lineHeight: 22,
  },
  inputWrap: {
    position: 'relative',
    marginBottom: 18,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 16,
  },
  input: {
    width: '100%',
    height: 54,
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '500',
    paddingLeft: 52,
    paddingRight: 16,
    paddingVertical: 16,
  },
  inputFocused: {
    borderColor: ACCENT,
  },
  eyeWrap: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 6,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
  },
  button: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    overflow: 'hidden',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  biometricButton: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    backgroundColor: 'transparent',
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  biometricText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    fontSize: 15,
    color: TEXT_MUTED,
    marginRight: 6,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '700',
    color: ACCENT,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: 300,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalInput: {
    width: '100%',
    height: 50,
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT_PRIMARY,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resetErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  cancelWrap: {
    alignSelf: 'flex-end',
  },
  cancelText: {
    color: TEXT_MUTED,
    fontSize: 14,
    marginRight: 8,
  },
});






