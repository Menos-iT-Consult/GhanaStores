import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Card, IconButton, Snackbar, Text, useTheme } from 'react-native-paper';
import { BarChart } from 'react-native-gifted-charts';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { StatCard } from '@/components/StatCard';
import { SectionHeader } from '@/components/SectionHeader';
import { StatCardSkeleton, SectionSkeleton, SkeletonBlock } from '@/components/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { ErrorState } from '@/components/ScreenState';
import { usePosSync } from '@/offline/usePosSync';
import { formatGhs } from '@/theme';

/**
 * Command center: KPI grid, 6-month revenue trend, top products, recent
 * orders, and ops alerts (offline sales needing attention). One round trip
 * to /dashboard/full powers most of the screen.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { store } = useAuth();
  const sync = usePosSync();
  const [snack, setSnack] = React.useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-full'],
    queryFn: endpoints.getDashboardFull,
    refetchInterval: 30_000,
  });

  const top = useQuery({
    queryKey: ['top-products'],
    queryFn: () => endpoints.getTopProducts(5),
    refetchInterval: 60_000,
  });

  React.useEffect(() => {
    if (sync.failed === 0 && sync.pending > 0 && sync.online) {
      setSnack(`${sync.pending} offline sale${sync.pending === 1 ? '' : 's'} syncing…`);
    }
  }, [sync.failed, sync.pending, sync.online]);

  if (isLoading) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock height={26} width="55%" />
            <SkeletonBlock height={14} width="35%" style={{ marginTop: 8 }} />
          </View>
          <SkeletonBlock height={40} width={40} style={{ borderRadius: 20 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} scrollEnabled={false}>
          <StatCardSkeleton />
          <StatCardSkeleton />
          <SectionHeader title="Revenue trend" />
          <SkeletonBlock height={170} />
          <SectionHeader title="Recent orders" />
          <SectionSkeleton rows={4} />
        </ScrollView>
      </View>
    );
  }

  if (isError || !data) {
    return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;
  }

  const { kpis, monthlyTrend, recentOrders, operations } = data;
  const pendingOrders = recentOrders.filter((o) => String(o.status).toUpperCase() === 'PENDING').length;
  const barData = monthlyTrend.map((m) => ({ value: Math.round(m.revenue), label: m.month }));
  const hasTrend = barData.some((d) => d.value > 0);
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineSmall" style={styles.greeting}>
            Hi{store?.name ? `, ${store.name}` : ''}
          </Text>
          <Text variant="bodyMedium" style={styles.sub}>
            Here’s how your store is doing today.
          </Text>
        </View>
        <IconButton icon="cog-outline" size={24} onPress={() => router.push('/settings')} accessibilityLabel="Settings" />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Offline queue needs attention: surface it above everything. */}
        {sync.failed > 0 ? (
          <Card mode="elevated" style={[styles.card, styles.alertCard]} onPress={() => router.push('/pos')}>
            <View style={styles.alertBody}>
              <Text variant="titleSmall" style={styles.alertTitle}>
                {sync.failed} offline sale{sync.failed === 1 ? '' : 's'} need{sync.failed === 1 ? 's' : ''} attention
              </Text>
              <Text variant="bodySmall" style={styles.alertText}>
                The server rejected these sales (e.g. insufficient stock). Tap to review in POS.
              </Text>
            </View>
          </Card>
        ) : null}
        {sync.pending > 0 ? (
          <Card mode="elevated" style={styles.card} onPress={() => router.push('/pos')}>
            <View style={styles.alertBody}>
              <Text variant="titleSmall" style={styles.pendingTitle}>
                {sync.pending} sale{sync.pending === 1 ? '' : 's'} waiting to sync
              </Text>
              <Text variant="bodySmall" style={styles.alertText}>
                {sync.online ? 'Syncing as connection allows.' : 'You are offline — they will sync automatically.'}
              </Text>
            </View>
          </Card>
        ) : null}

        <View style={styles.statsRow}>
          <StatCard label="Today" value={formatGhs(kpis.todayRevenue)} hint="Revenue" />
          <StatCard label="This week" value={formatGhs(kpis.weekRevenue)} hint="Revenue" />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Paid orders" value={String(kpis.paidOrders)} hint={`${pendingOrders} pending`} />
          <StatCard label="Avg order" value={formatGhs(kpis.averageOrderValue)} hint="All time" />
        </View>

        <SectionHeader title="Revenue trend" actionLabel="New sale" onAction={() => router.push('/pos')} />
        <Card mode="elevated" style={styles.card}>
          <View style={styles.chartBody}>
            {hasTrend ? (
              <BarChart
                data={barData}
                barWidth={20}
                spacing={14}
                noOfSections={3}
                barBorderRadius={4}
                frontColor="#0066FF"
                yAxisThickness={0}
                xAxisThickness={0}
                xAxisLabelTextStyle={styles.axisLabel}
                yAxisTextStyle={styles.axisLabel}
                maxValue={Math.max(...barData.map((d) => d.value)) * 1.15 || 10}
                height={160}
                isAnimated
              />
            ) : (
              <Text variant="bodyMedium" style={styles.mutedCenter}>
                No paid sales yet — your 6-month trend will appear here.
              </Text>
            )}
          </View>
        </Card>
        <SectionHeader
          title="Top products"
          actionLabel={(top.data?.products.length ?? 0) > 0 ? 'Manage' : undefined}
          onAction={() => router.push('/products')}
        />
        {top.isLoading ? (
          <SectionSkeleton rows={3} />
        ) : (top.data?.products.length ?? 0) === 0 ? (
          <Card mode="elevated" style={styles.card}>
            <View style={styles.listBody}>
              <Text variant="bodyMedium" style={styles.mutedCenter}>
                Products you sell will be ranked here.
              </Text>
            </View>
          </Card>
        ) : (
          <Card mode="elevated" style={styles.card}>
            {top.data!.products.map((p, i) => (
              <View key={`${p.name}-${i}`} style={[styles.rankRow, i > 0 && styles.divider]}>
                <Text variant="titleSmall" style={styles.rank}>{i + 1}</Text>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text variant="titleSmall" style={styles.rankName} numberOfLines={1}>{p.name}</Text>
                  <Text variant="bodySmall" style={styles.muted}>{p.unitsSold} sold</Text>
                </View>
                <Text variant="titleSmall" style={styles.rankRevenue}>{formatGhs(p.revenue)}</Text>
              </View>
            ))}
          </Card>
        )}

        <SectionHeader title="Recent orders" actionLabel="See all" onAction={() => router.push('/orders')} />
        {recentOrders.length === 0 ? (
          <Card mode="elevated" style={styles.card}>
            <View style={styles.listBody}>
              <Text variant="bodyMedium" style={styles.mutedCenter}>
                Orders from your storefront and POS will show here.
              </Text>
            </View>
          </Card>
        ) : (
          <Card mode="elevated" style={styles.card}>
            {recentOrders.slice(0, 6).map((o, i) => (
              <View key={o.id} style={[styles.rankRow, i > 0 && styles.divider]}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text variant="titleSmall" style={styles.rankName} numberOfLines={1}>
                    #{o.orderNumber} · {o.customerName}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {o.paymentMethod} · {new Date(o.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <StatusBadge status={o.status} />
                <Text variant="titleSmall" style={styles.rankRevenue}>{formatGhs(o.total)}</Text>
              </View>
            ))}
          </Card>
        )}

        <SectionHeader title="Operations" />
        <View style={styles.statsRow}>
          <StatCard
            label="Low stock"
            value={String(operations.lowStockCount)}
            hint={operations.lowStockCount > 0 ? 'Variants to restock' : 'All good'}
          />
          <StatCard label="Loyalty members" value={String(operations.loyaltyMembers)} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Points outstanding" value={String(operations.outstandingPoints)} />
          <StatCard label="Rider cash in transit" value={formatGhs(operations.transitCash)} />
        </View>
      </ScrollView>

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)} duration={2500}>
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  greeting: { color: '#0F172A', fontWeight: '700' },
  sub: { color: '#64748B', marginTop: 2 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', marginHorizontal: -6, marginTop: 4 },
  card: { backgroundColor: '#FFFFFF' },
  chartBody: { padding: 16, alignItems: 'center' },
  listBody: { padding: 16 },
  muted: { color: '#64748B' },
  mutedCenter: { color: '#64748B', textAlign: 'center', padding: 4 },
  axisLabel: { color: '#94A3B8', fontSize: 10 },
  rankRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  divider: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  rank: { width: 24, color: '#94A3B8', fontWeight: '700' },
  rankName: { color: '#0F172A', fontWeight: '600' },
  rankRevenue: { color: '#0066FF', fontWeight: '700' },
  alertCard: { borderLeftWidth: 4, borderLeftColor: '#DC2626' },
  alertBody: { padding: 14 },
  alertTitle: { color: '#991B1B', fontWeight: '700' },
  pendingTitle: { color: '#92400E', fontWeight: '700' },
  alertText: { color: '#64748B', marginTop: 2 },
});
