import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeBack } from '@/lib/useSafeBack';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { ErrorState } from '@/components/ScreenState';
import { PasswordTextInput } from '@/components/PasswordTextInput';

type ContactType = 'email' | 'phone';

/**
 * Account settings — account recovery, security, and subscription actions.
 * Customer-facing business details are edited in the Store profile.
 */
export default function StoreSettingsScreen() {
  const goBack = useSafeBack('/settings');
  const qc = useQueryClient();
  const { colors } = useTheme();
  const { store, signOut, updateStoreContacts } = useAuth();
  const [snack, setSnack] = useState<string | null>(null);
  const profile = useQuery({ queryKey: ['store-profile'], queryFn: endpoints.getStoreProfile });
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPhone, setAccountPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [pendingType, setPendingType] = useState<ContactType | null>(null);
  const [pendingValue, setPendingValue] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [contactRequestBusy, setContactRequestBusy] = useState(false);

  const fail = (err: unknown, fallback: string) => setSnack(apiErrorMessage(err, fallback));

  useEffect(() => {
    if (!profile.data) return;
    setAccountEmail(profile.data.email);
    setAccountPhone(profile.data.phone);
  }, [profile.data]);

  const requestContactChange = async (type: ContactType) => {
    const value = (type === 'email' ? accountEmail : accountPhone).trim();
    if (!value) {
      setSnack(`Enter the new account ${type} first.`);
      return;
    }
    if (!currentPassword) {
      setSnack('Enter your current password to change account contacts.');
      return;
    }
    setContactRequestBusy(true);
    try {
      const result = await endpoints.requestAccountContactChange(type, value, currentPassword);
      setPendingType(type);
      setPendingValue(value);
      setVerificationCode('');
      setCurrentPassword('');
      setSnack(result.message);
    } catch (error) {
      setSnack(apiErrorMessage(error, `Could not send a code to the new ${type}.`));
    } finally {
      setContactRequestBusy(false);
    }
  };

  const verifyContactChange = useMutation({
    mutationFn: () => {
      if (!pendingType) throw new Error('Choose an account contact to verify.');
      return endpoints.verifyAccountContactChange(pendingType, verificationCode.trim());
    },
    onSuccess: async (result) => {
      await updateStoreContacts(result.email, result.phone);
      setAccountEmail(result.email);
      setAccountPhone(result.phone);
      setPendingType(null);
      setPendingValue('');
      setVerificationCode('');
      setSnack('Account contact verified and updated.');
      await qc.invalidateQueries({ queryKey: ['store-profile'] });
    },
    onError: (error) => setSnack(apiErrorMessage(error, 'Could not verify that code.')),
  });

  /* ------------------------------- Password ------------------------------ */
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const password = useMutation({
    mutationFn: () => endpoints.changePassword(currentPw, newPw),
    onSuccess: () => {
      setSnack('Password updated.');
      setCurrentPw('');
      setNewPw('');
    },
    onError: (err) => fail(err, 'Could not update the password.'),
  });

  /* ------------------------------ Two-factor ----------------------------- */
  const twofa = useQuery({ queryKey: ['2fa-status'], queryFn: endpoints.getTwoFactorStatus });
  const [setup, setSetup] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = useState('');

  const startSetup = useMutation({
    mutationFn: endpoints.setupTwoFactor,
    onSuccess: (res) => setSetup({ secret: res.secret, qrDataUrl: res.qrDataUrl }),
    onError: (err) => fail(err, 'Could not start two-factor setup.'),
  });
  const enable2fa = useMutation({
    mutationFn: () => endpoints.enableTwoFactor(code.trim()),
    onSuccess: (res) => {
      setSnack(res.message || 'Two-factor authentication is now on.');
      setSetup(null);
      setCode('');
      qc.invalidateQueries({ queryKey: ['2fa-status'] });
    },
    onError: (err) => fail(err, 'That code is not correct. Check your app and try again.'),
  });
  const disable2fa = useMutation({
    mutationFn: () => endpoints.disableTwoFactor(code.trim()),
    onSuccess: (res) => {
      setSnack(res.message || 'Two-factor authentication is now off.');
      setCode('');
      qc.invalidateQueries({ queryKey: ['2fa-status'] });
    },
    onError: (err) => fail(err, 'That code is not correct. Check your app and try again.'),
  });

  /* ---------------------------- Delete account --------------------------- */
  const [armed, setArmed] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState('');
  const [deletePw, setDeletePw] = useState('');
  const remove = useMutation({
    mutationFn: () => endpoints.deleteAccount(confirmSlug.trim(), deletePw),
    onSuccess: () => {
      // The store is gone server-side; local sign-out clears SecureStore.
      void signOut();
    },
    onError: (err) => fail(err, 'Could not delete the account.'),
  });

  const slug = store?.subdomainSlug ?? '';
  const twofaEnabled = Boolean(twofa.data?.enabled);
  const codeValid = code.trim().length === 6;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.BackAction onPress={goBack} />
        <Appbar.Content title="Account settings" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Password — current password required, like the web page. */}
        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Change password</Text>
            <PasswordTextInput
              label="Current password"
              value={currentPw}
              onChangeText={setCurrentPw}
              mode="outlined"
              style={styles.input}
            />
            <PasswordTextInput
              label="New password (at least 8 characters)"
              value={newPw}
              onChangeText={setNewPw}
              mode="outlined"
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={() => password.mutate()}
              loading={password.isPending}
              disabled={!currentPw || newPw.length < 8}
            >
              Update password
            </Button>
          </View>
        </Card>

        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
              Account recovery contacts
            </Text>
            <Text variant="bodySmall" style={[styles.hint, { color: colors.onSurfaceVariant }]}>
              A code sent to the new email or phone is required before it becomes your account contact.
            </Text>
            {profile.isLoading ? (
              <ActivityIndicator style={styles.spaced} />
            ) : profile.isError || !profile.data ? (
              <ErrorState
                message={apiErrorMessage(profile.error, 'Could not load your account contacts.')}
                onRetry={() => { void profile.refetch(); }}
              />
            ) : (
              <>
                <TextInput
                  label="Sign-in email"
                  value={accountEmail}
                  onChangeText={setAccountEmail}
                  mode="outlined"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
                {!pendingType ? (
                  <PasswordTextInput
                    label="Current password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    mode="outlined"
                    style={styles.input}
                  />
                ) : null}
                <Button
                  mode="outlined"
                  onPress={() => void requestContactChange('email')}
                  loading={contactRequestBusy}
                  disabled={
                    Boolean(pendingType)
                    || contactRequestBusy
                    || accountEmail.trim().toLowerCase() === profile.data.email.toLowerCase()
                  }
                  style={styles.input}
                >
                  Send code to new email
                </Button>
                <TextInput
                  label="Verified account phone"
                  value={accountPhone}
                  onChangeText={setAccountPhone}
                  mode="outlined"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
                <Button
                  mode="outlined"
                  onPress={() => void requestContactChange('phone')}
                  loading={contactRequestBusy}
                  disabled={
                    Boolean(pendingType)
                    || contactRequestBusy
                    || accountPhone.trim() === profile.data.phone
                  }
                  style={styles.input}
                >
                  Send code to new phone
                </Button>
                {pendingType ? (
                  <>
                    <Text variant="bodySmall" style={[styles.hint, { color: colors.onSurfaceVariant }]}>
                      Enter the code sent to {pendingValue}.
                    </Text>
                    <TextInput
                      label="Six-digit verification code"
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      mode="outlined"
                      keyboardType="number-pad"
                      maxLength={6}
                      style={styles.input}
                    />
                    <Button
                      mode="contained"
                      onPress={() => verifyContactChange.mutate()}
                      loading={verifyContactChange.isPending}
                      disabled={verifyContactChange.isPending || verificationCode.trim().length !== 6}
                    >
                      Verify and update {pendingType}
                    </Button>
                    <Button
                      mode="text"
                      onPress={() => {
                        setPendingType(null);
                        setPendingValue('');
                        setVerificationCode('');
                      }}
                      style={styles.spaced}
                    >
                      Cancel verification
                    </Button>
                  </>
                ) : null}
              </>
            )}
          </View>
        </Card>

        {/* Two-factor — QR setup, then a live code to enable/disable. */}
        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
              Two-factor authentication
            </Text>
            {twofa.isLoading ? (
              <ActivityIndicator style={styles.spaced} />
            ) : twofa.isError ? (
              <ErrorState
                message={apiErrorMessage(twofa.error, 'Could not load two-factor status.')}
                onRetry={() => { void twofa.refetch(); }}
              />
            ) : (
              <>
                <Text variant="bodySmall" style={[styles.hint, { color: colors.onSurfaceVariant }]}>
                  {twofaEnabled
                    ? 'Two-factor is on. Enter a code from your authenticator app to turn it off.'
                    : 'Require a 6-digit code from an authenticator app when you sign in.'}
                </Text>
                {setup ? (
                  <View>
                    <Image source={{ uri: setup.qrDataUrl }} style={styles.qr} resizeMode="contain" />
                    <Text
                      variant="bodySmall"
                      style={[styles.hint, { color: colors.onSurfaceVariant, textAlign: 'center' }]}
                      selectable
                    >
                      Setup key: {setup.secret}
                    </Text>
                    <TextInput
                      label="6-digit code"
                      value={code}
                      onChangeText={setCode}
                      mode="outlined"
                      keyboardType="number-pad"
                      maxLength={6}
                      style={styles.input}
                    />
                    <Button mode="contained" onPress={() => enable2fa.mutate()} loading={enable2fa.isPending} disabled={!codeValid}>
                      Turn on two-factor
                    </Button>
                  </View>
                ) : twofaEnabled ? (
                  <View>
                    <TextInput
                      label="6-digit code"
                      value={code}
                      onChangeText={setCode}
                      mode="outlined"
                      keyboardType="number-pad"
                      maxLength={6}
                      style={styles.input}
                    />
                    <Button
                      mode="outlined"
                      textColor={colors.error}
                      onPress={() => disable2fa.mutate()}
                      loading={disable2fa.isPending}
                      disabled={!codeValid}
                    >
                      Turn off two-factor
                    </Button>
                  </View>
                ) : (
                  <Button mode="outlined" onPress={() => startSetup.mutate()} loading={startSetup.isPending} style={styles.spaced}>
                    Set up two-factor
                  </Button>
                )}
              </>
            )}
          </View>
        </Card>

        {/* Subscription — read-only from the session meta. */}
        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Subscription</Text>
            <MetaRow label="Plan" value={store?.plan || 'TRIAL'} />
            <MetaRow label="Status" value={store?.status || 'ACTIVE'} />
            <MetaRow label="Store address" value={slug} last />
          </View>
        </Card>

        {/* Delete account — armed confirm with typed slug + password. */}
        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={[styles.danger, { color: colors.error }]}>Delete account</Text>
            <Text variant="bodySmall" style={[styles.hint, { color: colors.onSurfaceVariant }]}>
              Permanently remove this store and everything in it. This cannot be undone — your storefront,
              products, orders, customers and subscription history will be erased and the address {slug} released.
            </Text>
            {!armed ? (
              <Button mode="outlined" textColor={colors.error} onPress={() => setArmed(true)} style={styles.spaced}>
                I want to delete this store
              </Button>
            ) : (
              <View>
                <TextInput
                  label={`Type your store address (${slug}) to confirm`}
                  value={confirmSlug}
                  onChangeText={setConfirmSlug}
                  mode="outlined"
                  autoCapitalize="none"
                  style={styles.input}
                />
                <PasswordTextInput
                  label="Current password"
                  value={deletePw}
                  onChangeText={setDeletePw}
                  mode="outlined"
                  style={styles.input}
                />
                <Button
                  mode="contained"
                  buttonColor={colors.error}
                  textColor={colors.onError}
                  onPress={() => remove.mutate()}
                  loading={remove.isPending}
                  disabled={confirmSlug.trim() !== slug || !deletePw}
                >
                  Permanently delete account
                </Button>
                <Button
                  mode="text"
                  onPress={() => {
                    setArmed(false);
                    setConfirmSlug('');
                    setDeletePw('');
                  }}
                  style={styles.spaced}
                >
                  Cancel
                </Button>
              </View>
            )}
          </View>
        </Card>
      </ScrollView>

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)} duration={4500}>
        {snack}
      </Snackbar>
    </View>
  );
}

/** Simple label/value row used by the subscription card. */
function MetaRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.metaRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.outlineVariant },
      ]}
    >
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="titleSmall" style={{ color: colors.onSurface }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { marginBottom: 0 },
  cardBody: { padding: 16 },
  sectionTitle: { fontWeight: '700', marginBottom: 4 },
  danger: { fontWeight: '700', marginBottom: 4 },
  hint: { marginBottom: 10 },
  input: { marginBottom: 10 },
  spaced: { marginTop: 6 },
  qr: { width: 184, height: 184, alignSelf: 'center', marginBottom: 10 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
});
