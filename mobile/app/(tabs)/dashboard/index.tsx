import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { StatCard } from '@/components/StatCard';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import { formatGhs } from '@/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { store, signOut } = useAuth();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: endpoints.getDashboardStats,
    refetchInterval: 30_000,
  });

  if (isLoading) return <LoadingState label="Loading your dashboard…" />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <Text variant="headlineSmall" style={styles.greeting}>Hi{store?.name ? `, ${store.name}` : ''}</Text>
      <Text variant="bodyMedium" style={styles.sub}>Here’s how your store is doing today.</Text>

      <View style={styles.statsRow}>
        <StatCard label="Today" value={formatGhs(data!.todayRevenue)} hint="Revenue" />
        <StatCard label="Pending" value={String(data!.pendingOrders)} hint="Orders" />
      </View>
      <View style={styles.statsRow}>
        <StatCard label="Total orders" value={String(data!.totalOrders)} />
        <StatCard label="All-time revenue" value={formatGhs(data!.totalRevenue)} />
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>Quick actions</Text>
      <Card mode="elevated" style={styles.actions}>
        <View style={styles.actionsBody}>
          <Button
            mode="contained"
            icon="receipt-text-outline"
            onPress={() => router.push('/orders')}
            style={styles.action}
          >
            View orders
          </Button>
          <Button
            mode="outlined"
            icon="package-variant"
            onPress={() => router.push('/products')}
            style={styles.action}
          >
            Manage products
          </Button>
          <Button
            mode="outlined"
            icon="cog-outline"
            onPress={() => router.push('/settings')}
            style={styles.action}
          >
            Settings
          </Button>
          <Button mode="text" textColor="#DC2626" icon="logout" onPress={signOut} style={styles.action}>
            Sign out
          </Button>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  greeting: { color: '#0F172A', fontWeight: '700' },
  sub: { color: '#64748B', marginTop: 2, marginBottom: 16 },
  statsRow: { flexDirection: 'row', marginHorizontal: -6 },
  sectionTitle: { color: '#0F172A', fontWeight: '700', marginTop: 24, marginBottom: 10 },
  actions: { backgroundColor: '#FFFFFF' },
  actionsBody: { padding: 16 },
  action: { marginBottom: 10 },
});
