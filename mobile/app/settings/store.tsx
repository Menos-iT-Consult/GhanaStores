import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';

/**
 * Store site settings — the mobile twin of the PWA's /settings/site page
 * (src/pages/SellerSiteSettings.jsx). Five independent cards so a mistake in
 * one can never affect another:
 *   1. Store name   - display name only; the slug (address) never changes
 *   2. Password     - change requires the CURRENT password
 *   3. Two-factor   - TOTP setup (QR), enable/disable with a live code
 *   4. Subscription - plan + status from the session meta
 *   5. Delete account - typed slug + password, irreversible (server cascades)
 */
export default function StoreSettingsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const { store, signOut, updateStoreName } = useAuth();
  const [snack, setSnack] = useState<string | null>(null);

  const fail = (err: unknown, fallback: string) => setSnack(apiErrorMessage(err, fallback));

  /* ------------------------------ 1 · Store name ------------------------- */
  const [name, setName] = useState(store?.name ?? '');
  const rename = useMutation({
    mutationFn: () => endpoints.renameStore(name.trim()),
    onSuccess: async (res) => {
      await updateStoreName(res.name);
      setSnack('Store name updated.');
    },
    onError: (err) => fail(err, 'Could not rename the store.'),
  });

  /* ------------------------------- 2 · Password -------------------------- */
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

  /* ------------------------------ 3 · Two-factor ------------------------- */
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

  /* ---------------------------- 5 · Delete account ----------------------- */
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
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Store settings" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 1 · Store name — display only, slug never changes. */}
        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Store name</Text>
            <Text variant="bodySmall" style={[styles.hint, { color: colors.onSurfaceVariant }]}>
              Display name only — your address {slug} never changes.
            </Text>
            <TextInput label="Store name" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
            <Button
              mode="contained"
              onPress={() => rename.mutate()}
              loading={rename.isPending}
              disabled={!name.trim() || name.trim() === store?.name}
            >
              Save name
            </Button>
          </View>
        </Card>

        {/* 2 · Password — current password required, like the web page. */}
        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Change password</Text>
            <TextInput
              label="Current password"
              value={currentPw}
              onChangeText={setCurrentPw}
              mode="outlined"
              secureTextEntry
              style={styles.input}
            />
            <TextInput
              label="New password (at least 8 characters)"
              value={newPw}
              onChangeText={setNewPw}
              mode="outlined"
              secureTextEntry
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

        {/* 3 · Two-factor — QR setup, then a live code to enable/disable. */}
        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
              Two-factor authentication
            </Text>
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
          </View>
        </Card>

        {/* 4 · Subscription — read-only from the session meta. */}
        <Card mode="elevated" style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Subscription</Text>
            <MetaRow label="Plan" value={store?.plan || 'TRIAL'} />
            <MetaRow label="Status" value={store?.status || 'ACTIVE'} />
            <MetaRow label="Store address" value={slug} last />
          </View>
        </Card>

        {/* 5 · Delete account — armed confirm with typed slug + password. */}
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
                <TextInput
                  label="Current password"
                  value={deletePw}
                  onChangeText={setDeletePw}
                  mode="outlined"
                  secureTextEntry
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

