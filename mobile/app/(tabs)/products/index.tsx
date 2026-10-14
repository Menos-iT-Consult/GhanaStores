import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, Dialog, Portal, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { formatGhs } from '@/theme';
import type { Product } from '@/types';

export default function ProductsScreen() {
  const qc = useQueryClient();
  const { colors } = useTheme();

  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [priceDraft, setPriceDraft] = useState('');
  const [snack, setSnack] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['products'],
    queryFn: endpoints.getProducts,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['products'] });

  // Optimistic stock toggle: flip locally, roll back on failure.
  const stockMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => endpoints.toggleProductStock(id, isActive),
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: ['products'] });
      const prev = qc.getQueryData<Product[]>(['products']);
      qc.setQueryData<Product[]>(['products'], (old: Product[] | undefined) =>
        old?.map((p: Product) => (p.id === id ? { ...p, isActive } : p)),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['products'], ctx.prev);
      setSnack(apiErrorMessage(err, 'Could not update stock.'));
    },
    onSettled: () => invalidate(),
  });

  const priceMutation = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) => endpoints.updateProductPrice(id, price),
    onSuccess: (saved) => {
      setSnack(`${saved.name} price updated.`);
      setEditProduct(null);
      invalidate();
    },
    onError: (err) => setSnack(apiErrorMessage(err, 'Could not update price.')),
  });

  const openPrice = (p: Product) => {
    setEditProduct(p);
    setPriceDraft(String(p.price));
  };

  const savePrice = () => {
    if (!editProduct) return;
    const price = Number(priceDraft);
    if (!Number.isFinite(price) || price < 0) {
      setSnack('Enter a valid price.');
      return;
    }
    priceMutation.mutate({ id: editProduct.id, price });
  };

  const products = data ?? [];

  return (
    <View style={styles.root}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.Content title="Products" titleStyle={styles.title} />
      </Appbar.Header>

      {isLoading ? (
        <LoadingState label="Loading products…" />
      ) : isError ? (
        <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />
      ) : products.length === 0 ? (
        <EmptyState title="No products yet" message="Add products in your dashboard and they’ll show here." />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Card mode="elevated" style={styles.card}>
              <View style={styles.cardBody}>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text variant="titleMedium" style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text variant="bodySmall" style={styles.meta}>
                      {item.category || 'Uncategorised'} · {formatGhs(item.price)}
                    </Text>
                  </View>
                  <Switch value={item.isActive} color="#0066FF" onValueChange={(v) => stockMutation.mutate({ id: item.id, isActive: v })} />
                </View>
                <View style={styles.actionsRow}>
                  <Text variant="labelMedium" style={[styles.stock, { color: item.isActive ? '#16A34A' : '#DC2626' }]}>
                    {item.isActive ? 'In stock' : 'Sold out'}
                  </Text>
                  <Button mode="text" compact onPress={() => openPrice(item)}>Edit price</Button>
                </View>
              </View>
            </Card>
          )}
        />
      )}

      <Portal>
        <Dialog visible={Boolean(editProduct)} onDismiss={() => setEditProduct(null)}>
          <Dialog.Title>Edit price</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.meta}>{editProduct?.name}</Text>
            <TextInput label="Price (GHS)" value={priceDraft} onChangeText={setPriceDraft} keyboardType="decimal-pad" mode="outlined" style={{ marginTop: 12 }} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditProduct(null)}>Cancel</Button>
            <Button mode="contained" onPress={savePrice} loading={priceMutation.isPending}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  title: { color: '#0F172A', fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#FFFFFF' },
  cardBody: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: '#0F172A', fontWeight: '700' },
  meta: { color: '#64748B', marginTop: 2 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  stock: { fontWeight: '700' },
});
