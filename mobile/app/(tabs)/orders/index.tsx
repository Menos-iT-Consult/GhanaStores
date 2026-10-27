import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Appbar, Card, SegmentedButtons, Text, useTheme } from 'react-native-paper';
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

const EMPTY_MESSAGES: Record<OrderFilter, string> = {
  all: 'Orders placed on your store will appear here.',
  pending: 'New orders that need your attention will appear here.',
  dispatched: 'Orders being processed will appear here.',
  completed: 'Delivered orders will appear here.',
};

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
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.Content title="Orders" />
        <Appbar.Action icon="refresh" onPress={() => { void refetch(); }} accessibilityLabel="Refresh orders" />
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
        <EmptyState
          title={filter === 'all' ? 'No orders yet' : `No ${FILTERS.find((item) => item.value === filter)?.label.toLowerCase()} orders`}
          message={EMPTY_MESSAGES[filter]}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={(
            <Text variant="bodySmall" style={[styles.listHint, { color: colors.onSurfaceVariant }]}>
              Showing {orders.length} of {data?.pages[0]?.total ?? orders.length} orders
            </Text>
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          renderItem={({ item }) => (
            <Card mode="elevated" onPress={() => router.push(`/orders/${item.id}`)}>
              <View style={styles.cardBody}>
                <View style={styles.row}>
                  <Text variant="titleMedium" style={[styles.orderNumber, { color: colors.onSurface }]}>
                    #{item.orderNumber}
                  </Text>
                  <Text variant="titleMedium" style={[styles.amount, { color: colors.primary }]}>
                    {formatGhs(item.totalAmount)}
                  </Text>
                </View>
                <View style={[styles.row, { marginTop: 6 }]}>
                  <Text
                    variant="bodyMedium"
                    style={[styles.customer, { color: colors.onSurfaceVariant }]}
                    numberOfLines={1}
                  >
                    {item.customer?.name || 'Customer'}
                  </Text>
                  <StatusBadge status={item.status} />
                </View>
              </View>
            </Card>
          )}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} style={styles.footerLoader} />
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
  root: { flex: 1 },
  filters: { paddingHorizontal: 16, paddingVertical: 10 },
  list: { padding: 16, paddingTop: 4, gap: 12 },
  listHint: { marginBottom: 2 },
  footerLoader: { padding: 16 },
  cardBody: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderNumber: { fontWeight: '700' },
  amount: { fontWeight: '700' },
  customer: { flex: 1, marginRight: 12 },
});
