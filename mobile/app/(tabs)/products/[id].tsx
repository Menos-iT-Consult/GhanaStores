import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Dialog,
  IconButton,
  Portal,
  Snackbar,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeBack } from '@/lib/useSafeBack';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { LoadingState, ErrorState } from '@/components/ScreenState';
import type { Product, ProductVariant } from '@/types';

const DEFAULT_VARIANT = { optionName: 'Default', optionValue: 'Standard' };


/**
 * Create / edit a product. Images go presign -> PUT to R2 -> confirm, exactly
 * like the PWA flow. Existing products get per-option stock adjustment; a new
 * product starts with one option whose opening stock is set here.
 */
export default function ProductEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const goBack = useSafeBack('/products');
  const router = useRouter();
  const { colors } = useTheme();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [openingStock, setOpeningStock] = useState('0');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [stockDialog, setStockDialog] = useState<ProductVariant | null>(null);
  const [stockValue, setStockValue] = useState('');
  const [snack, setSnack] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // The list endpoint is the source of truth for one product (no GET /:id).
  const listQuery = useQuery({ queryKey: ['products'], queryFn: endpoints.getProducts });
  const product: Product | undefined = listQuery.data?.find((p) => p.id === id);

  useEffect(() => {
    if (isNew || loaded || !product) return;
    setName(product.name);
    setCategory(product.category || '');
    setPrice(String(product.price));
    setIsActive(product.isActive);
    setImageUrl(product.imageUrl);
    setLoaded(true);
  }, [isNew, loaded, product]);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setSnack('Allow photo access to upload a product image.');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      const asset = picked.assets?.[0];
      if (!picked.canceled && asset) {
        setSavingImage(true);
        const contentType = asset.mimeType || 'image/jpeg';
        const size = asset.fileSize ?? 0;
        const presign = await endpoints.presignUpload({ kind: 'product', contentType, size });
        const put = await FileSystem.uploadAsync(presign.uploadUrl, asset.uri, {
          httpMethod: 'PUT',
          headers: { 'Content-Type': contentType },
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        });
        if (put.status !== 200) throw new Error(`Upload failed (HTTP ${put.status}).`);
        const confirmed = await endpoints.confirmUpload(
          isNew ? { kind: 'product', key: presign.key } : { kind: 'product', key: presign.key, productId: String(id) },
        );
        setImageUrl(confirmed.url);
        setImageKey(confirmed.key);
        setSnack('Image uploaded.');
      }
    } catch (err) {
      setSnack(apiErrorMessage(err, 'Could not upload the image.'));
    } finally {
      setSavingImage(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const priceNum = Number(price);
      if (!name.trim()) throw new Error('Product name is required.');
      if (!Number.isFinite(priceNum) || priceNum < 0) throw new Error('Enter a valid price.');
      if (isNew) {
        const stock = Math.max(0, parseInt(openingStock, 10) || 0);
        return endpoints.createProduct({
          name: name.trim(),
          category: category.trim() || 'General',
          description: description.trim(),
          price: priceNum,
          isActive,
          ...(imageUrl && imageKey ? { imageUrl, imageKey } : {}),
          variants: [{ ...DEFAULT_VARIANT, stockQuantity: stock }],
        });
      }
      return endpoints.updateProduct(String(id), {
        name: name.trim(),
        category: category.trim() || 'General',
        description: description.trim(),
        price: priceNum,
        isActive,
      });
    },
    onSuccess: (res) => {
      setSnack(res.message);
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard-full'] });
      router.back();
    },
    onError: (err) => setSnack(apiErrorMessage(err, 'Could not save the product.')),
  });

  const stockMutation = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      endpoints.adjustVariantStock(variantId, { quantity }),
    onSuccess: () => {
      setSnack('Stock updated.');
      setStockDialog(null);
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => setSnack(apiErrorMessage(err, 'Could not update stock.')),
  });

  if (!isNew && listQuery.isLoading) return <LoadingState label="Loading product…" />;
  if (!isNew && !product) {
    return <ErrorState message={listQuery.isError ? apiErrorMessage(listQuery.error) : 'Product not found.'} onRetry={listQuery.refetch} />;
  }
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.BackAction onPress={goBack} />
        <Appbar.Content title={isNew ? 'Add product' : 'Edit product'} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Card mode="elevated" style={styles.card}>
          <View style={styles.imageRow}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Text style={styles.thumbLetter}>?</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text variant="titleSmall" style={[styles.label, { color: colors.onSurface }]}>Photo</Text>
              <Text variant="bodySmall" style={[styles.muted, { color: colors.onSurfaceVariant }]}>Shown on your storefront and in POS search.</Text>
              <Button mode="outlined" compact icon="image-plus" loading={savingImage} disabled={savingImage} onPress={pickImage} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                {imageUrl ? 'Replace image' : 'Upload image'}
              </Button>
            </View>
          </View>
        </Card>

        <Card mode="elevated" style={styles.card}>
          <View style={styles.formBody}>
            <TextInput mode="outlined" label="Name *" value={name} onChangeText={setName} style={styles.input} />
            <TextInput mode="outlined" label="Category" value={category} onChangeText={setCategory} placeholder="e.g. Beverages" style={styles.input} />
            <TextInput mode="outlined" label="Description" value={description} onChangeText={setDescription} multiline numberOfLines={3} style={styles.input} />
            <TextInput mode="outlined" label="Price (GHS) *" value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={styles.input} />
            {isNew ? (
              <TextInput mode="outlined" label="Opening stock" value={openingStock} onChangeText={setOpeningStock} keyboardType="number-pad" style={styles.input} />
            ) : null}
            <View style={styles.activeRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge" style={[styles.label, { color: colors.onSurface }]}>Available for sale</Text>
                <Text variant="bodySmall" style={[styles.muted, { color: colors.onSurfaceVariant }]}>Off = hidden and marked sold out everywhere.</Text>
              </View>
              <Switch value={isActive} onValueChange={setIsActive} color={colors.primary} />
            </View>
          </View>
        </Card>

        {!isNew && product ? (
          <Card mode="elevated" style={styles.card}>
            <View style={styles.formBody}>
              <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>Stock by option</Text>
              {(product.variants ?? []).filter((v) => v.id).map((v, i) => (
                <View key={v.id} style={[styles.variantRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.outlineVariant }]}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge" style={[styles.label, { color: colors.onSurface }]}>{v.optionValue}</Text>
                    <Text variant="bodySmall" style={[styles.muted, { color: Number(v.stockQuantity) <= 5 ? colors.error : colors.onSurfaceVariant }]}>
                      {v.stockQuantity} in stock
                    </Text>
                  </View>
                  <IconButton
                    icon="minus-circle-outline"
                    onPress={() => stockMutation.mutate({ variantId: v.id, quantity: Math.max(0, Number(v.stockQuantity) - 1) })}
                    disabled={stockMutation.isPending}
                    accessibilityLabel="Decrease stock"
                  />
                  <IconButton
                    icon="plus-circle-outline"
                    onPress={() => stockMutation.mutate({ variantId: v.id, quantity: Number(v.stockQuantity) + 1 })}
                    disabled={stockMutation.isPending}
                    accessibilityLabel="Increase stock"
                  />
                  <Button compact mode="outlined" onPress={() => { setStockDialog(v); setStockValue(String(v.stockQuantity)); }}>Set</Button>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <Button mode="contained" icon="content-save" loading={saveMutation.isPending} disabled={saveMutation.isPending} onPress={() => saveMutation.mutate()} style={styles.saveBtn}>
          {isNew ? 'Add product' : 'Save changes'}
        </Button>
      </ScrollView>
      <Portal>
        <Dialog visible={Boolean(stockDialog)} onDismiss={() => setStockDialog(null)}>
          <Dialog.Title>Set stock — {stockDialog?.optionValue}</Dialog.Title>
          <Dialog.Content>
            <TextInput mode="outlined" label="Quantity" value={stockValue} onChangeText={setStockValue} keyboardType="number-pad" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStockDialog(null)}>Cancel</Button>
            <Button
              mode="contained"
              loading={stockMutation.isPending}
              onPress={() => {
                if (stockDialog) {
                  stockMutation.mutate({
                    variantId: stockDialog.id,
                    quantity: Math.max(0, parseInt(stockValue, 10) || 0),
                  });
                }
              }}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)} duration={3000}>
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 14 },
  formBody: { padding: 16 },
  label: { fontWeight: '600' },
  muted: { marginTop: 2 },
  input: { marginBottom: 12 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  activeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  saveBtn: { marginTop: 4 },
  imageRow: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  image: { width: 84, height: 84, borderRadius: 12, marginRight: 16 },
  imagePlaceholder: { backgroundColor: '#EEF1F5', alignItems: 'center', justifyContent: 'center' },
  thumbLetter: { color: '#94A3B8', fontSize: 28, fontWeight: '700' },
  variantRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
});