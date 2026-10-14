import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Appbar, Card, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { formatGhs } from '@/theme';
import type { Order, OrderFilter } from '@/types';

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'dispatched', label: 'Processing' },
  { value: 'completed', label: 'Delivered' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<OrderFilter>('all');

  const { data, isLoading, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['orders', filter],
      initialPageParam: 1,
      queryFn: ({ pageParam }) => endpoints.getOrders({ filter, page: pageParam, limit: 20 }),
      getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    });

  const orders: Order[] = data?.pages.flatMap((p) => p.orders) ?? [];

  return (
    <View style={styles.root}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.Content title="Orders" titleStyle={styles.title} />
      </Appbar.Header>

      <View style={styles.filters}>
        <SegmentedButtons
          value={filter}
          onValueChange={(v) => setFilter(v as OrderFilter)}
          buttons={FILTERS.map((f) => ({ value: f.value, label: f.label }))}
          density="small"
        />
      </View>

      {isLoading ? (
        <LoadingState label="Loading orders…" />
      ) : isError ? (
        <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders yet" message="Orders placed on your store will appear here." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          renderItem={({ item }) => (
            <Card mode="elevated" style={styles.card} onPress={() => router.push(`/orders/${item.id}`)}>
              <View style={styles.cardBody}>
                <View style={styles.row}>
                  <Text variant="titleMedium" style={styles.orderNumber}>
                    #{item.orderNumber}
                  </Text>
                  <Text variant="titleMedium" style={styles.amount}>
                    {formatGhs(item.totalAmount)}
                  </Text>
                </View>
                <View style={[styles.row, { marginTop: 6 }]}>
                  <Text variant="bodyMedium" style={styles.customer} numberOfLines={1}>
                    {item.customer?.name || 'Customer'}
                  </Text>
                  <StatusBadge status={item.status} />
                </View>
              </View>
            </Card>
          )}
          ListFooterComponent={
            isFetchingNextPage ? (
              <Text style={styles.footer}>{' '}</Text>
            ) : (
              <View />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  title: { color: '#0F172A', fontWeight: '700' },
  filters: { paddingHorizontal: 16, paddingVertical: 10 },
  list: { padding: 16, paddingTop: 4, gap: 12 },
  card: { backgroundColor: '#FFFFFF' },
  cardBody: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderNumber: { color: '#0F172A', fontWeight: '700' },
  amount: { color: '#0066FF', fontWeight: '700' },
  customer: { color: '#64748B', flex: 1, marginRight: 12 },
  footer: { padding: 16, color: '#94A3B8', textAlign: 'center' },
});
