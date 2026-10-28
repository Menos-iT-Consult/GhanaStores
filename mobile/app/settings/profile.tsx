import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Appbar, Button, Card, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeBack } from '@/lib/useSafeBack';
import { useAuth } from '@/auth/AuthProvider';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import { PasswordTextInput } from '@/components/PasswordTextInput';

type ContactType = 'email' | 'phone';

export default function StoreProfileScreen() {
  const goBack = useSafeBack('/settings');
  const { colors } = useTheme();
  const qc = useQueryClient();
  const { updateStoreName, updateStoreContacts } = useAuth();
  const profile = useQuery({ queryKey: ['store-profile'], queryFn: endpoints.getStoreProfile });
  const [name, setName] = useState('');
  const [publicEmail, setPublicEmail] = useState('');
  const [publicPhone, setPublicPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPhone, setAccountPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [pendingType, setPendingType] = useState<ContactType | null>(null);
  const [pendingValue, setPendingValue] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [contactRequestBusy, setContactRequestBusy] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  useEffect(() => {
    const data = profile.data;
    if (!data) return;
    setName(data.name);
    setPublicEmail(data.publicEmail);
    setPublicPhone(data.publicPhone);
    setWhatsappNumber(data.whatsappNumber);
    setDescription(data.description);
    setAddress(data.address);
    setAccountEmail(data.email);
    setAccountPhone(data.phone);
    setLogoUrl(data.logoUrl);
  }, [profile.data]);

  const saveProfile = useMutation({
    mutationFn: () => endpoints.saveStoreProfile({
      name: name.trim(),
      publicEmail: publicEmail.trim(),
      publicPhone: publicPhone.trim(),
      whatsappNumber: whatsappNumber.trim(),
      description: description.trim(),
      address: address.trim(),
    }),
    onSuccess: async (data) => {
      await updateStoreName(data.name);
      setName(data.name);
      setSnack('Store profile saved.');
      await qc.invalidateQueries({ queryKey: ['store-profile'] });
    },
    onError: (error) => setSnack(apiErrorMessage(error, 'Could not save your store profile.')),
  });

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

  const uploadLogo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSnack('Allow photo access to choose a store logo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset) return;

      const contentType = asset.mimeType || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(contentType)) {
        setSnack('Choose a JPG, PNG, WebP, or AVIF image for your logo.');
        return;
      }
      setLogoBusy(true);
      const presign = await endpoints.presignUpload({
        kind: 'logo',
        contentType,
        size: asset.fileSize ?? 0,
      });
      const uploaded = await FileSystem.uploadAsync(presign.uploadUrl, asset.uri, {
        httpMethod: 'PUT',
        headers: { 'Content-Type': contentType },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });
      if (uploaded.status < 200 || uploaded.status >= 300) {
        throw new Error(`Logo upload failed (HTTP ${uploaded.status}).`);
      }
      const confirmed = await endpoints.confirmUpload({ kind: 'logo', key: presign.key });
      setLogoUrl(confirmed.url);
      await qc.invalidateQueries({ queryKey: ['store-profile'] });
      setSnack('Store logo updated.');
    } catch (error) {
      setSnack(apiErrorMessage(error, 'Could not upload the store logo.'));
    } finally {
      setLogoBusy(false);
    }
  };

  if (profile.isLoading) return <LoadingState label="Loading store profile…" />;
  if (profile.isError || !profile.data) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
          <Appbar.BackAction onPress={goBack} />
          <Appbar.Content title="Store profile" />
        </Appbar.Header>
        <ErrorState
          message={apiErrorMessage(profile.error, 'Could not load your store profile.')}
          onRetry={() => { void profile.refetch(); }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.BackAction onPress={goBack} />
        <Appbar.Content title="Store profile" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
          Update the information customers see on your storefront. Your store address remains unchanged.
        </Text>

        <Card mode="elevated">
          <View style={styles.cardBody}>
            <Text variant="titleMedium" style={[styles.heading, { color: colors.onSurface }]}>Brand</Text>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" />
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: colors.surfaceVariant }]}>
                <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>No logo yet</Text>
              </View>
            )}
            <Button mode="outlined" icon="image-edit-outline" loading={logoBusy} disabled={logoBusy} onPress={() => void uploadLogo()}>
              Upload store logo
            </Button>
            <TextInput label="Store name" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
            <PasswordTextInput
              label="Storefront description"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              maxLength={500}
              style={styles.input}
            />
            <TextInput
              label="Business address"
              value={address}
              onChangeText={setAddress}
              mode="outlined"
              multiline
              maxLength={240}
              style={styles.input}
            />
          </View>
        </Card>

        <Card mode="elevated">
          <View style={styles.cardBody}>
            <Text variant="titleMedium" style={[styles.heading, { color: colors.onSurface }]}>Public contact details</Text>
            <Text variant="bodySmall" style={[styles.hint, { color: colors.onSurfaceVariant }]}>
              These are shown to customers and do not change your sign-in or recovery contacts.
            </Text>
            <TextInput
              label="Public email"
              value={publicEmail}
              onChangeText={setPublicEmail}
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              label="Public phone"
              value={publicPhone}
              onChangeText={setPublicPhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              label="WhatsApp number"
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>
        </Card>

        <Button
          mode="contained"
          onPress={() => saveProfile.mutate()}
          loading={saveProfile.isPending}
          disabled={saveProfile.isPending || name.trim().length < 2}
        >
          Save store profile
        </Button>

        <Card mode="elevated">
          <View style={styles.cardBody}>
            <Text variant="titleMedium" style={[styles.heading, { color: colors.onSurface }]}>Account recovery contacts</Text>
            <Text variant="bodySmall" style={[styles.hint, { color: colors.onSurfaceVariant }]}>
              A code sent to the new email or phone is required before it becomes your account contact.
            </Text>
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
              <TextInput
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
                  style={styles.input}
                >
                  Cancel verification
                </Button>
              </>
            ) : null}
          </View>
        </Card>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
          Storefront address: {profile.data.subdomainSlug}
        </Text>
      </ScrollView>
      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)} duration={4500}>
        {snack}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 36, gap: 14 },
  cardBody: { padding: 16 },
  heading: { fontWeight: '700', marginBottom: 8 },
  hint: { marginBottom: 12 },
  input: { marginTop: 10 },
  logo: { alignSelf: 'center', width: 120, height: 120, marginBottom: 12 },
  logoPlaceholder: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
});
