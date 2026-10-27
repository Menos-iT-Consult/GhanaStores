import React from 'react';
import { RefreshControl, ScrollView, View, type TextStyle, type ViewStyle } from 'react-native';
import { Appbar, Snackbar, Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { OrdersWidget } from '@/components/widgets/OrdersWidget';
import { writeWidgetSnapshot } from '@/widgets/snapshot';
import { refreshAndroidWidget } from '@/widgets/refreshAndroidWidget';

import { GlassCard } from '@/components/glass/GlassCard';
import { ThemeToggle } from '@/components/glass/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { RevenueCarousel } from '@/components/glass/RevenueCarousel';
import { useGlass } from '@/components/glass/glass';
import { QuickActions } from '@/components/glass/QuickActions';
import { MetricGrid } from '@/components/glass/MetricGrid';
import { AlertBanner } from '@/components/glass/AlertBanner';
import { SectionHeader } from '@/components/SectionHeader';
import { SectionSkeleton, SkeletonBlock } from '@/components/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { ErrorState } from '@/components/ScreenState';
import { usePosSync } from '@/offline/usePosSync';
import { formatGhs, ACCENT } from '@/theme';
import type { DashboardFull } from '@/types';

/**
 * Command center (Material 3): flat tonal hero revenue card, outlined
 * Today's sales, seller quick actions, 2x2 metric grid, amber low-stock banner, top products and
 * recent orders in plain surface cards. Data layer unchanged — one round
 * trip to /dashboard/full powers most of the screen.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { store } = useAuth();
  const g = useGlass();
  const reduceMotion = useReducedMotion();
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

  // Keep the home-screen widget snapshot in sync with the dashboard payload.
  // Best-effort: snapshot + Android push must never break the screen.
  React.useEffect(() => {
    if (!data) return;
    writeWidgetSnapshot({
      storeName: store?.name ?? null,
      todayRevenue: Number(data.kpis?.todayRevenue) || 0,
      weekRevenue: Number(data.kpis?.weekRevenue) || 0,
      paidOrders: Number(data.kpis?.paidOrders) || 0,
      pendingOrders: Number(data.operations?.pendingOrderCount) || 0,
      lowStockCount: Number(data.operations?.lowStockCount) || 0,
      transitCash: Number(data.operations?.transitCash) || 0,
      recentOrders: (Array.isArray(data.recentOrders) ? data.recentOrders : []).slice(0, 5).map((o) => ({
        id: String(o?.id ?? ''),
        orderNumber: String(o?.orderNumber ?? ''),
        customerName: String(o?.customerName ?? ''),
        total: Number(o?.total) || 0,
        status: String(o?.status ?? ''),
      })),
    })
      .then(refreshAndroidWidget)
      .catch(() => undefined);
  }, [data, store?.name]);

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: g.slate }]}>
        <ScrollView contentContainerStyle={styles.content} scrollEnabled={false}>
          <HeroGlassSkeleton g={g} />
          <SectionSkeleton rows={4} />
        </ScrollView>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.root, { backgroundColor: g.slate }]}>
        <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />
      </View>
    );
  }

  const { kpis, monthlyTrend, recentOrders, operations } = data;
  // Defensive defaults: never let a partial/stale payload crash the screen.
  const safeTrend = Array.isArray(monthlyTrend) ? monthlyTrend : [];
  const safeOrders = Array.isArray(recentOrders) ? recentOrders : [];
  const safeKpis = {
    todayRevenue: Number(kpis?.todayRevenue) || 0,
    paidOrders: Number(kpis?.paidOrders) || 0,
    totalRevenue: Number(kpis?.totalRevenue) || 0,
    averageOrderValue: Number(kpis?.averageOrderValue) || 0,
    weekRevenue: Number(kpis?.weekRevenue) || 0,
  };
  const safeOps = {
    pendingOrderCount: Number(operations?.pendingOrderCount) || 0,
    lowStockCount: Number(operations?.lowStockCount) || 0,
    loyaltyMembers: Number(operations?.loyaltyMembers) || 0,
    outstandingPoints: Number(operations?.outstandingPoints) || 0,
    transitCash: Number(operations?.transitCash) || 0,
  };
  const pendingOrders = safeOps.pendingOrderCount;
  const recentPendingOrders = safeOrders.filter((o) => String(o?.status).toUpperCase() === 'PENDING');
  return (
    <View style={[styles.root, { backgroundColor: g.slate }]}>
      <Appbar.Header mode="small" style={{ backgroundColor: g.slate }}>
        <Appbar.Content
          title={greetingFor(new Date().getHours())}
          subtitle={store?.name ?? 'Your store'}
          titleStyle={{ fontWeight: '700' }}
        />
        <ThemeToggle />
        <NotificationBell iconColor={g.muted} onPress={() => router.push('/notifications')} />
        <Appbar.Action
          icon="cog-outline"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
        />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={g.blue} />}
      >
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(300)}>
          <RevenueCarousel
            storeName={store?.name ?? 'My store'}
            heroRevenue={safeKpis.todayRevenue}
            heroLabel="Today"
            trendPoints={safeTrend.map((m) => ({
              month: String(m?.month ?? ''),
              revenue: Number(m?.revenue) || 0,
            }))}
          />
        </Animated.View>

        <Animated.View
          style={styles.pills}
          entering={reduceMotion ? undefined : FadeInDown.delay(80).duration(280)}
        >
          <QuickActions
            actions={[
              { label: 'New sale', icon: 'cash-register', emphasis: 'primary', onPress: () => router.push('/pos') },
              { label: 'Orders', icon: 'receipt', onPress: () => router.push('/orders') },
              { label: 'Add product', icon: 'plus-box-outline', onPress: () => router.push('/products/new') },
            ]}
          />
        </Animated.View>

        {/* Offline queue needs attention: surface it above everything. */}
        {sync.failed > 0 ? (
          <View style={styles.alertWrap}>
            <AlertBanner
              title={`${sync.failed} sale${sync.failed === 1 ? '' : 's'} failed to sync`}
              body="The server rejected these sales (e.g. insufficient stock). Tap to review in POS."
              onPress={() => router.push('/pos')}
            />
          </View>
        ) : null}
        {sync.pending > 0 ? (
          <GlassCard style={styles.noteCard}>
            <View style={styles.alertBody}>
              <Text variant="titleSmall" style={styles.pendingTitle(g)}>
                {sync.pending} sale{sync.pending === 1 ? '' : 's'} waiting to sync
              </Text>
              <Text variant="bodySmall" style={styles.alertText(g)}>
                {sync.online ? 'Syncing as connection allows.' : 'You are offline — they will sync automatically.'}
              </Text>
            </View>
          </GlassCard>
        ) : null}

        <SectionHeader
          title="Needs attention"
        />
        <OrdersWidget
          title="Pending orders"
          emptyMessage={pendingOrders > 0
            ? 'Open the orders list to review pending orders.'
            : 'No orders need your attention right now.'}
          orders={recentPendingOrders.slice(0, 3).map((o) => ({
            id: String(o.id),
            orderNumber: String(o.orderNumber),
            customerName: String(o.customerName),
            total: Number(o.total) || 0,
            status: String(o.status),
          }))}
          pendingOrders={pendingOrders}
          onSeeAll={() => router.push('/orders')}
        />

        {safeOps.lowStockCount > 0 ? (
          <View style={styles.alertWrap}>
            <AlertBanner
              title={`${safeOps.lowStockCount} variant${safeOps.lowStockCount === 1 ? '' : 's'} running low`}
              body="Restock now to keep selling without gaps."
              onPress={() => router.push('/products')}
            />
          </View>
        ) : null}

        <SectionHeader title="Recent orders" actionLabel="See all" onAction={() => router.push('/orders')} />
        {safeOrders.length === 0 ? (
          <GlassCard style={styles.listBody}>
            <Text variant="bodyMedium" style={styles.mutedCenter(g)}>
              Orders from your storefront and POS will show here.
            </Text>
          </GlassCard>
        ) : (
          <GlassCard>
            {safeOrders.slice(0, 6).map((o, i) => (
              <View key={o.id} style={[styles.rankRow, i > 0 && styles.divider(g)]}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text variant="titleSmall" style={styles.rankName(g)} numberOfLines={1}>
                    #{o.orderNumber} · {o.customerName}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted(g)}>
                    {o.paymentMethod} · {new Date(o.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <StatusBadge status={o.status} />
                <Text variant="titleSmall" style={styles.rankRevenue(g)}>{formatGhs(o.total)}</Text>
              </View>
            ))}
          </GlassCard>
        )}

        <SectionHeader title="Sales snapshot" />
        <MetricGrid
          metrics={[
            {
              label: 'Revenue this week',
              value: safeKpis.weekRevenue,
              format: (n) => formatGhs(n),
              icon: 'chart-line',
              accent: ACCENT.revenue,
            },
            {
              label: 'Paid orders',
              value: safeKpis.paidOrders,
              format: (n) => String(Math.round(n)),
              icon: 'receipt-text-check-outline',
              accent: ACCENT.orders,
            },
            {
              label: 'Average order',
              value: safeKpis.averageOrderValue,
              format: (n) => formatGhs(n),
              icon: 'cash-multiple',
              accent: ACCENT.pos,
            },
            {
              label: 'Lifetime revenue',
              value: safeKpis.totalRevenue,
              format: (n) => formatGhs(n),
              icon: 'cash-check',
              accent: ACCENT.primary,
            },
          ]}
        />

        <SectionHeader
          title="Top products"
          actionLabel={(top.data?.products.length ?? 0) > 0 ? 'Manage' : undefined}
          onAction={() => router.push('/products')}
        />
        {top.isLoading ? (
          <SectionSkeleton rows={3} />
        ) : (top.data?.products.length ?? 0) === 0 ? (
          <GlassCard style={styles.listBody}>
            <Text variant="bodyMedium" style={styles.mutedCenter(g)}>
              Products you sell will be ranked here.
            </Text>
          </GlassCard>
        ) : (
          <GlassCard>
            {top.data!.products.map((p, i) => (
              <View key={`${p.name}-${i}`} style={[styles.rankRow, i > 0 && styles.divider(g)]}>
                <Text variant="titleSmall" style={styles.rank(g)}>{i + 1}</Text>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text variant="titleSmall" style={styles.rankName(g)} numberOfLines={1}>{p.name}</Text>
                  <Text variant="bodySmall" style={styles.muted(g)}>{p.unitsSold} sold</Text>
                </View>
                <Text variant="titleSmall" style={styles.rankRevenue(g)}>{formatGhs(p.revenue)}</Text>
              </View>
            ))}
          </GlassCard>
        )}

        <SectionHeader title="Loyalty & operations" />
        <GlassCard style={styles.opsCard}>
          <OpsRow label="Loyalty members" value={String(safeOps.loyaltyMembers)} />
          <OpsRow
            label="Points outstanding"
            value={String(safeOps.outstandingPoints)}
            last={safeOps.transitCash === 0}
          />
          {safeOps.transitCash > 0 ? (
            <OpsRow label="Rider cash in transit" value={formatGhs(safeOps.transitCash)} last />
          ) : null}
        </GlassCard>
      </ScrollView>

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)} duration={2500}>
        {snack}
      </Snackbar>
    </View>
  );
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function HeroGlassSkeleton({ g }: { g: ReturnType<typeof useGlass> }) {
  return (
    <View style={styles.skelHero(g)}>
      <SkeletonBlock height={14} width="45%" />
      <SkeletonBlock height={34} width="65%" style={{ marginTop: 10 }} />
      <SkeletonBlock height={52} width="100%" style={{ marginTop: 12 }} />
    </View>
  );
}

function OpsRow({ label, value, hint, last }: { label: string; value: string; hint?: string; last?: boolean }) {
  const g = useGlass();
  return (
    <View style={[styles.opsRow, !last && styles.divider(g)]}>
      <View style={{ flex: 1 }}>
        <Text variant="titleSmall" style={styles.rankName(g)}>{label}</Text>
        {hint ? <Text variant="bodySmall" style={styles.muted(g)}>{hint}</Text> : null}
      </View>
      <Text variant="titleSmall" style={styles.rankRevenue(g)}>{value}</Text>
    </View>
  );
}

const styles = {
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 } satisfies ViewStyle,
  noteCard: { padding: 0, marginTop: 14 },
  alertWrap: { marginTop: 14 },
  trendCard: { padding: 16, alignItems: 'center' } satisfies ViewStyle,
  listBody: { padding: 16 },
  opsCard: { paddingHorizontal: 0, overflow: 'hidden' } satisfies ViewStyle,
  opsRow: { flexDirection: 'row', alignItems: 'center', padding: 14 } satisfies ViewStyle,
  muted: (g: ReturnType<typeof useGlass>): TextStyle => ({ color: g.muted }),
  mutedCenter: (g: ReturnType<typeof useGlass>): TextStyle => ({ color: g.muted, textAlign: 'center', padding: 4 }),
  pendingTitle: (g: ReturnType<typeof useGlass>): TextStyle => ({ color: g.amber, fontWeight: '700' }),
  rankRow: { flexDirection: 'row', alignItems: 'center', padding: 14 } satisfies ViewStyle,
  divider: (g: ReturnType<typeof useGlass>): ViewStyle => ({ borderTopWidth: 1, borderTopColor: g.glassBorder }),
  rank: (g: ReturnType<typeof useGlass>): TextStyle => ({ width: 24, color: g.faint, fontWeight: '700' }),
  rankName: (g: ReturnType<typeof useGlass>): TextStyle => ({ color: g.ink, fontWeight: '600' }),
  rankRevenue: (g: ReturnType<typeof useGlass>): TextStyle => ({ color: g.blue, fontWeight: '700' }),
  alertBody: { padding: 14 },
  alertText: (g: ReturnType<typeof useGlass>): TextStyle => ({ color: g.muted, marginTop: 2 }),
  skelHero: (g: ReturnType<typeof useGlass>): ViewStyle => ({
    backgroundColor: g.card,
    borderWidth: 1,
    borderColor: g.glassBorder,
    borderRadius: g.radius,
    padding: 18,
    marginBottom: 12,
  }),
};
