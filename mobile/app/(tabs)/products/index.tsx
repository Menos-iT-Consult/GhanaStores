import React, { useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, View } from 'react-native';
import { Appbar, Card, FAB, Snackbar, Switch, Text, useTheme } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { formatGhs } from '@/theme';
import type { Product } from '@/types';

/**
 * Catalog list: quick stock switch on each row, tap to open the full editor
 * (price, details, image, variants), FAB to add a product.
 */
export default function ProductsScreen() {
  const qc = useQueryClient();
  const router = useRouter();
  const { colors } = useTheme();
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

  const products = data ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.Content title="Products" />
      </Appbar.Header>

      {isLoading ? (
        <LoadingState label="Loading products…" />
      ) : isError ? (
        <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products yet"
          message="Add your first product to start selling online and in the POS."
          actionLabel="Add product"
          onAction={() => router.push('/products/new')}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Card mode="elevated" onPress={() => router.push(`/products/${item.id}`)}>
              <View style={styles.cardBody}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={styles.thumbLetter}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text variant="titleMedium" style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <Text variant="bodySmall" style={styles.meta}>
                    {item.category || 'Uncategorised'} · {formatGhs(item.price)}
                  </Text>
                  <Text variant="bodySmall" style={[styles.stock, { color: item.isActive ? colors.tertiary : colors.error }]}>
                    {item.isActive ? 'In stock' : 'Sold out'}
                  </Text>
                </View>
                <Switch
                  value={item.isActive}
                  color={colors.primary}
                  onValueChange={(v) => stockMutation.mutate({ id: item.id, isActive: v })}
                />
              </View>
            </Card>
          )}
        />
      )}

      <FAB
        icon="plus"
        label="Add product"
        style={styles.fab}
        onPress={() => router.push('/products/new')}
      />

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)} duration={3000}>
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: 16, gap: 12, paddingBottom: 96 },
  cardBody: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  thumb: { width: 52, height: 52, borderRadius: 10, marginRight: 12 },
  thumbPlaceholder: { backgroundColor: '#EEF1F5', alignItems: 'center', justifyContent: 'center' },
  thumbLetter: { color: '#475569', fontWeight: '700', fontSize: 20 },
  name: { fontWeight: '700' },
  meta: { marginTop: 2 },
  stock: { marginTop: 4, fontWeight: '700' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
