import React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Appbar, Card, List, Text, useTheme } from 'react-native-paper';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { routeForNotification } from '@/services/pushNotifications';
import type { MerchantNotification } from '@/types';

/** One icon per payload type (same `type` values the backend records). */
const TYPE_ICONS: Record<string, string> = {
  order_created: 'receipt',
  order_status: 'receipt',
  order_paid: 'cash',
  payment_received: 'cash',
  subscription_active: 'star-outline',
  plan_trial_reminder: 'clock-outline',
  plan_renewal_reminder: 'clock-outline',
  plan_past_due: 'alert-circle-outline',
  plan_suspended: 'lock-outline',
  welcome: 'storefront-outline',
  low_stock: 'package-variant-closed',
  security: 'shield-outline',
  contact_message: 'message-outline',
};

/** Compact locale-aware timestamp, e.g. "18 Oct 2026, 09:42". */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Notifications inbox: the server-backed history of every push dispatched for
 * this store (merchant_notifications). Unread rows carry a dot and bold title;
 * tapping one marks it read, refreshes the dashboard badge, and follows the
 * exact same deep-link map (`routeForNotification`) as a notification tap.
 */
export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['notifications'],
      initialPageParam: 1,
      queryFn: ({ pageParam }) => endpoints.getNotifications(pageParam, 20),
      getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    });

  const items: MerchantNotification[] = data?.pages.flatMap((p) => p.notifications) ?? [];
  const unread = data?.pages[0]?.unread ?? 0;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notifications-unread'] });
  };

  const markAllRead = () => {
    endpoints.markAllNotificationsRead().catch(() => undefined).then(invalidate);
  };

  const openItem = (item: MerchantNotification) => {
    if (!item.readAt) {
      endpoints.markNotificationRead(item.id).catch(() => undefined).then(invalidate);
    }
    const route = routeForNotification(item.data ?? {});
    if (route) router.push(route as never);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Notifications" />
        {unread > 0 ? (
          <Appbar.Action icon="check-all" accessibilityLabel="Mark all as read" onPress={markAllRead} />
        ) : null}
      </Appbar.Header>

      {isLoading ? (
        <LoadingState label="Loading notifications…" />
      ) : isError && items.length === 0 ? (
        <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          message="New orders, payments, stock alerts and account events appear here as they happen."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          renderItem={({ item }) => {
            const isUnread = !item.readAt;
            return (
              <Card mode="elevated" onPress={() => openItem(item)}>
                <View style={styles.cardBody}>
                  <List.Icon
                    icon={TYPE_ICONS[String(item.type ?? '')] ?? 'bell-outline'}
                    color={isUnread ? colors.primary : colors.onSurfaceVariant}
                    style={styles.icon}
                  />
                  <View style={styles.text}>
                    <View style={styles.titleRow}>
                      <Text
                        variant="titleSmall"
                        numberOfLines={1}
                        style={[styles.title, { color: colors.onSurface }, isUnread && styles.unreadTitle]}
                      >
                        {item.title}
                      </Text>
                      {isUnread ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
                    </View>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                      {item.body}
                    </Text>
                    <Text variant="labelSmall" style={styles.when}>
                      {formatWhen(item.createdAt)}
                    </Text>
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
  root: { flex: 1 },
  list: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 24 },
  cardBody: { flexDirection: 'row', alignItems: 'flex-start', padding: 12 },
  icon: { marginVertical: 2 },
  text: { flex: 1, marginHorizontal: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flexShrink: 1 },
  unreadTitle: { fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  when: { color: '#98A2B3', marginTop: 4 },
});