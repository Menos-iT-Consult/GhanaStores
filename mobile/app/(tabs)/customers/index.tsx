import React, { useState } from 'react';
import { FlatList, Linking, RefreshControl, StyleSheet, View } from 'react-native';
import { Appbar, Card, Chip, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { useInfiniteQuery } from '@tanstack/react-query';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { formatGhs } from '@/theme';
import type { Customer } from '@/types';

/** E.164-ish MSISDN (no leading +) for tel: and wa.me links. */
function toMsisdn(raw: string): string {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits.slice(1);
  if (digits.startsWith('233')) return digits;
  if (digits.startsWith('0')) return `233${digits.slice(1)}`;
  return digits;
}

/**
 * Loyalty book: every customer who has transacted, with points balance and
 * spend history, searchable by name or phone with server-side pagination.
 */
export default function CustomersScreen() {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const { data, isLoading, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['customers', query],
      initialPageParam: 1,
      queryFn: ({ pageParam }) => endpoints.getCustomers({ q: query, page: pageParam, limit: 20 }),
      getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    });

  const customers: Customer[] = data?.pages.flatMap((p) => p.customers) ?? [];

  return (
    <View style={styles.root}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.Content title="Customers" titleStyle={styles.title} />
      </Appbar.Header>

      <View style={styles.searchRow}>
        <TextInput
          mode="outlined"
          dense
          placeholder="Search name or phone…"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setQuery(search.trim())}
          left={<TextInput.Icon icon="magnify" />}
          right={search ? <TextInput.Icon icon="close" onPress={() => { setSearch(''); setQuery(''); }} /> : undefined}
          style={styles.searchInput}
        />
      </View>

      {isLoading ? (
        <LoadingState label="Loading customers…" />
      ) : isError ? (
        <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />
      ) : customers.length === 0 ? (
        <EmptyState
          title={query ? 'No matches' : 'No customers yet'}
          message={query ? 'Try another name or phone number.' : 'Buyers and POS customers with a phone number appear here.'}
        />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          renderItem={({ item }) => {
            const msisdn = toMsisdn(item.phone);
            return (
              <Card mode="elevated" style={styles.card}>
                <View style={styles.cardBody}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text variant="titleMedium" style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text variant="bodySmall" style={styles.meta}>{item.phone}</Text>
                    <Text variant="bodySmall" style={styles.meta}>
                      {item.ordersCount} order{item.ordersCount === 1 ? '' : 's'} · {formatGhs(item.totalSpent)} lifetime
                    </Text>
                    <Chip compact style={styles.pointsChip} textStyle={styles.pointsText}>
                      {item.loyaltyPoints} loyalty points
                    </Chip>
                  </View>
                  <View style={styles.actions}>
                    <IconButton icon="phone" onPress={() => Linking.openURL(`tel:${msisdn}`)} accessibilityLabel="Call" />
                    <IconButton icon="whatsapp" iconColor="#16A34A" onPress={() => Linking.openURL(`https://wa.me/${msisdn}`)} accessibilityLabel="WhatsApp" />
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  title: { color: '#0F172A', fontWeight: '700' },
  searchRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  searchInput: { backgroundColor: '#FFFFFF' },
  list: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 24 },
  card: { backgroundColor: '#FFFFFF' },
  cardBody: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  name: { color: '#0F172A', fontWeight: '700' },
  meta: { color: '#64748B', marginTop: 2 },
  pointsChip: { backgroundColor: '#DCFCE7', marginTop: 8, alignSelf: 'flex-start' },
  pointsText: { color: '#166534', fontWeight: '700' },
  actions: { alignItems: 'center' },
});
