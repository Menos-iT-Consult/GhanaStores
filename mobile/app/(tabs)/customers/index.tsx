import React, { useEffect, useState } from 'react';
import { FlatList, Linking, RefreshControl, StyleSheet, View } from 'react-native';
import { Appbar, Card, Chip, IconButton, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';
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
  const [snack, setSnack] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['customers', query],
      initialPageParam: 1,
      queryFn: ({ pageParam }) => endpoints.getCustomers({ q: query, page: pageParam, limit: 20 }),
      getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    });

  const customers: Customer[] = data?.pages.flatMap((p) => p.customers) ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.Content title="Customers" />
        <Appbar.Action icon="refresh" onPress={() => { void refetch(); }} accessibilityLabel="Refresh customers" />
      </Appbar.Header>

      <View style={styles.searchRow}>
        <TextInput
          mode="outlined"
          dense
          placeholder="Search name or phone…"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          left={<TextInput.Icon icon="magnify" />}
          right={search ? <TextInput.Icon icon="close" onPress={() => { setSearch(''); setQuery(''); }} /> : undefined}
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
            const contact = async (url: string, fallback: string) => {
              try {
                await Linking.openURL(url);
              } catch {
                setSnack(fallback);
              }
            };
            return (
              <Card mode="elevated">
                <View style={styles.cardBody}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text variant="titleMedium" style={[styles.name, { color: colors.onSurface }]} numberOfLines={1}>{item.name}</Text>
                    <Text variant="bodySmall" style={[styles.meta, { color: colors.onSurfaceVariant }]}>{item.phone}</Text>
                    <Text variant="bodySmall" style={[styles.meta, { color: colors.onSurfaceVariant }]}>
                      {item.ordersCount} order{item.ordersCount === 1 ? '' : 's'} · {formatGhs(item.totalSpent)} lifetime
                    </Text>
                    {item.lastOrderAt ? (
                      <Text variant="bodySmall" style={[styles.meta, { color: colors.onSurfaceVariant }]}>
                        Last order {new Date(item.lastOrderAt).toLocaleDateString()}
                      </Text>
                    ) : null}
                    <Chip
                      compact
                      style={[styles.pointsChip, { backgroundColor: colors.tertiaryContainer }]}
                      textStyle={[styles.pointsText, { color: colors.onTertiaryContainer }]}
                    >
                      {item.loyaltyPoints} loyalty points
                    </Chip>
                  </View>
                  <View style={styles.actions}>
                    <IconButton
                      icon="phone"
                      disabled={msisdn.length !== 12}
                      onPress={() => { void contact(`tel:${msisdn}`, 'Could not open the phone app.'); }}
                      accessibilityLabel={`Call ${item.name}`}
                    />
                    <IconButton
                      icon="whatsapp"
                      iconColor={colors.tertiary}
                      disabled={msisdn.length !== 12}
                      onPress={() => { void contact(`https://wa.me/${msisdn}`, 'Could not open WhatsApp.'); }}
                      accessibilityLabel={`Message ${item.name} on WhatsApp`}
                    />
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)} duration={3000}>
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  list: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 24 },
  cardBody: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  name: { fontWeight: '700' },
  meta: { marginTop: 2 },
  pointsChip: { marginTop: 8, alignSelf: 'flex-start' },
  pointsText: { fontWeight: '700' },
  actions: { alignItems: 'center' },
});
