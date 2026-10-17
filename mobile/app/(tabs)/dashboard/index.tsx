import React from 'react';
import { RefreshControl, ScrollView, View, type TextStyle, type ViewStyle } from 'react-native';
import { IconButton, Snackbar, Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { OrdersWidget } from '@/components/widgets/OrdersWidget';
import { OpsWidget } from '@/components/widgets/OpsWidget';
import { TrendWidget } from '@/components/widgets/TrendWidget';
import { writeWidgetSnapshot } from '@/widgets/snapshot';
import { refreshAndroidWidget } from '@/widgets/refreshAndroidWidget';

import { GlassCard } from '@/components/glass/GlassCard';
import { ThemeToggle } from '@/components/glass/ThemeToggle';
import { useGlass } from '@/components/glass/glass';
import { HeroRevenueCard, type HeroRange } from '@/components/glass/HeroRevenueCard';
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
 * quick actions, 2x2 metric grid, amber low-stock banner, top products and
 * recent orders in plain surface cards. Data layer unchanged — one round
 * trip to /dashboard/full powers most of the screen.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { store } = useAuth();
  const g = useGlass();
  const sync = usePosSync();
  const [snack, setSnack] = React.useState<string | null>(null);
  const [heroRange, setHeroRange] = React.useState<HeroRange>(7);

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
    const pending = (Array.isArray(data.recentOrders) ? data.recentOrders : []).filter(
      (o) => String(o?.status).toUpperCase() === 'PENDING',
    ).length;
    writeWidgetSnapshot({
      storeName: store?.name ?? null,
      todayRevenue: Number(data.kpis?.todayRevenue) || 0,
      weekRevenue: Number(data.kpis?.weekRevenue) || 0,
      paidOrders: Number(data.kpis?.paidOrders) || 0,
      pendingOrders: pending,
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
    weekRevenue: Number(kpis?.weekRevenue) || 0,
    paidOrders: Number(kpis?.paidOrders) || 0,
    averageOrderValue: Number(kpis?.averageOrderValue) || 0,
    totalRevenue: Number(kpis?.totalRevenue) || 0,
  };
  const safeOps = {
    lowStockCount: Number(operations?.lowStockCount) || 0,
    loyaltyMembers: Number(operations?.loyaltyMembers) || 0,
    outstandingPoints: Number(operations?.outstandingPoints) || 0,
    transitCash: Number(operations?.transitCash) || 0,
  };
  const pendingOrders = safeOrders.filter((o) => String(o?.status).toUpperCase() === 'PENDING').length;
  const sparkSource = heroRange === 7 ? safeTrend.slice(-7) : safeTrend;
  const sparkValues = sparkSource.map((m) => Number(m?.revenue) || 0);
  const heroRevenue = heroRange === 7 ? safeKpis.weekRevenue : safeKpis.totalRevenue;
  const heroLabel = heroRange === 7 ? 'Last 7 days' : 'All-time pace (30d)';
  return (
    <View style={[styles.root, { backgroundColor: g.slate }]}>
      <View style={[styles.header, { justifyContent: 'space-between' }]}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineSmall" style={styles.greeting(g)}>
            {greetingFor(new Date().getHours())}{store?.name ? `, ${store.name}` : ''}
          </Text>
          <Text variant="bodyMedium" style={styles.sub(g)}>
            Here is how your store is doing today.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon="cog"
            size={22}
            iconColor={g.muted}
            accessibilityLabel="Settings"
            onPress={() => router.push('/settings')}
          />
          <ThemeToggle />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={ACCENT.primary} />}
      >
        {/* 1 · Floating hero revenue card */}
        <HeroRevenueCard
          storeName={store?.name ?? 'My store'}
          todayRevenue={heroRevenue}
          range={heroRange}
          onRangeChange={setHeroRange}
          sparkValues={sparkValues}
          periodLabel={heroLabel}
        />

        {/* 2 · Quick action glass pills */}
        <View style={styles.pills}>
          <QuickActions
            actions={[
              { label: 'New Sale', icon: 'cash-register', onPress: () => router.push('/pos') },
              { label: 'Add Product', icon: 'plus-box-outline', onPress: () => router.push('/products/new') },
              { label: 'POS', icon: 'point-of-sale', onPress: () => router.push('/pos') },
            ]}
          />
        </View>

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

        {/* 3 · Live metric grid */}
        <View style={styles.metricsWrap}>
          <MetricGrid
            metrics={[
              {
                label: 'Paid orders',
                value: safeKpis.paidOrders,
                format: (n) => String(Math.round(n)),
                icon: 'receipt-text-check-outline',
                accent: ACCENT.revenue,
              },
              {
                label: 'Pending',
                value: pendingOrders,
                format: (n) => String(Math.round(n)),
                icon: 'clock-outline',
                accent: ACCENT.orders,
              },
              {
                label: 'Low stock',
                value: safeOps.lowStockCount,
                format: (n) => String(Math.round(n)),
                icon: 'alert-outline',
                accent: safeOps.lowStockCount > 0 ? ACCENT.inventory : ACCENT.revenue,
              },
              {
                label: 'Rider cash',
                value: safeOps.transitCash,
                format: (n) => formatGhs(n),
                icon: 'bike-fast',
                accent: ACCENT.pos,
              },
            ]}
          />
        </View>

        {/* 4 · Animated amber alert (low inventory only) */}
        {safeOps.lowStockCount > 0 ? (
          <View style={styles.alertWrap}>
            <AlertBanner
              title={`${safeOps.lowStockCount} variant${safeOps.lowStockCount === 1 ? '' : 's'} running low`}
              body="Restock now to keep selling without gaps."
              onPress={() => router.push('/products')}
            />
          </View>
        ) : null}

        <OrdersWidget
          orders={safeOrders.slice(0, 3).map((o) => ({
            id: String(o.id),
            orderNumber: String(o.orderNumber),
            customerName: String(o.customerName),
            total: Number(o.total) || 0,
            status: String(o.status),
          }))}
          pendingOrders={pendingOrders}
          onSeeAll={() => router.push('/orders')}
        />
        <OpsWidget lowStockCount={safeOps.lowStockCount} transitCash={safeOps.transitCash} onRestock={() => router.push('/products')} />

        <SectionHeader title="Revenue trend" actionLabel="New sale" onAction={() => router.push('/pos')} />
        <GlassCard style={styles.trendCard}>
          <TrendWidget points={safeTrend.map((m) => ({ month: String(m?.month ?? ''), revenue: Number(m?.revenue) || 0 }))} />
        </GlassCard>
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

        <SectionHeader title="Operations" />
        <GlassCard style={styles.opsCard}>
          <OpsRow label="Low stock" value={String(safeOps.lowStockCount)} hint={safeOps.lowStockCount > 0 ? 'Variants to restock' : 'All good'} />
          <OpsRow label="Loyalty members" value={String(safeOps.loyaltyMembers)} />
          <OpsRow label="Points outstanding" value={String(safeOps.outstandingPoints)} last={safeOps.transitCash === 0} />
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
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 16, marginBottom: 12 } satisfies ViewStyle,
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 } satisfies ViewStyle,
  greeting: (g: ReturnType<typeof useGlass>): TextStyle => ({ color: g.ink, fontWeight: '800' }),
  sub: (g: ReturnType<typeof useGlass>): TextStyle => ({ color: g.muted, marginTop: 2 }),
  pills: { flexDirection: 'row', gap: 10, marginTop: 14 } satisfies ViewStyle,
  noteCard: { padding: 0, marginTop: 14 },
  metricsWrap: { marginTop: 14 },
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

