import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Banner,
  Button,
  Card,
  Chip,
  Dialog,
  IconButton,
  Portal,
  SegmentedButtons,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { ZoomIn, useReducedMotion } from 'react-native-reanimated';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Crypto from 'expo-crypto';
import * as endpoints from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { loadCatalog, saveCatalog } from '@/offline/catalog';
import { discardEntry, enqueueSale, retryEntry } from '@/offline/posOutbox';
import { usePosSync } from '@/offline/usePosSync';
import { formatGhs } from '@/theme';
import type { LoyaltyLookup, PosSaleResult, Product, ProductVariant } from '@/types';

interface CartLine {
  variantId: string;
  productName: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
}

function variantPrice(p: Product, v: ProductVariant): number {
  return Number(v.priceOverride ?? p.price);
}

/**
 * Offline-first register. The catalog is served from cache when the network
 * is gone, every sale lands in the outbox with a UUID saleId before any
 * network call, and reconnect flushes FIFO — the same idempotency key the
 * server uses, so replays can never double-record.
 */
export default function PosScreen() {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const qc = useQueryClient();
  const sync = usePosSync();

  const [cached, setCached] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOMO'>('CASH');
  const [momoNetwork, setMomoNetwork] = useState<'MTN' | 'VODAFONE' | 'AT'>('MTN');
  const [phone, setPhone] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [redeem, setRedeem] = useState(false);
  const [pickProduct, setPickProduct] = useState<Product | null>(null);
  const [receipt, setReceipt] = useState<{ title: string; body: string; offline: boolean } | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  // Seed the offline catalog from AsyncStorage, then let the server refresh it.
  useEffect(() => {
    loadCatalog<Product>().then(setCached).catch(() => undefined);
  }, []);

  // Debounce the loyalty lookup while the merchant types a phone number.
  useEffect(() => {
    if (phone.trim().length < 9) {
      setLookupPhone('');
      return undefined;
    }
    const t = setTimeout(() => setLookupPhone(phone.trim()), 500);
    return () => clearTimeout(t);
  }, [phone]);

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: endpoints.getProducts,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (productsQuery.data) saveCatalog(productsQuery.data).catch(() => undefined);
  }, [productsQuery.data]);

  const loyalty = useQuery({
    queryKey: ['pos-loyalty', lookupPhone],
    queryFn: () => endpoints.getLoyalty(lookupPhone),
    enabled: lookupPhone.length >= 9,
  });

  const products = productsQuery.data ?? cached;

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || String(p.category || '').toLowerCase().includes(q),
    );
  }, [products, search]);
  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const loyaltyProfile: LoyaltyLookup | undefined = loyalty.data;
  const maxDiscount = loyaltyProfile?.customer?.redeemableValueGhs ?? 0;
  const discount = redeem ? Math.min(maxDiscount, subtotal) : 0;
  const total = Math.max(0, subtotal - discount);

  const addVariant = (p: Product, v: ProductVariant) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.variantId === v.id);
      if (existing) {
        const nextQty = Math.min(existing.quantity + 1, existing.maxStock);
        if (nextQty === existing.quantity) {
          setSnack(`Only ${v.stockQuantity} in stock for ${p.name}.`);
          return prev;
        }
        return prev.map((l) => (l.variantId === v.id ? { ...l, quantity: nextQty } : l));
      }
      if (Number(v.stockQuantity) <= 0) {
        setSnack(`${p.name} is out of stock.`);
        return prev;
      }
      return [
        ...prev,
        {
          variantId: v.id,
          productName: p.name,
          variantLabel: `${v.optionName}: ${v.optionValue}`,
          unitPrice: variantPrice(p, v),
          quantity: 1,
          maxStock: Number(v.stockQuantity),
        },
      ];
    });
  };

  const tapProduct = (p: Product) => {
    const variants = (p.variants ?? []).filter((v) => v.id);
    if (variants.length === 1) addVariant(p, variants[0]);
    else setPickProduct(p);
  };

  const changeQty = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.variantId === variantId
            ? { ...l, quantity: Math.min(Math.max(0, l.quantity + delta), l.maxStock) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  };

  const saleMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        items: cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        paymentMethod,
        ...(paymentMethod === 'MOMO' ? { momoNetwork } : {}),
        ...(phone.trim() ? { customerPhone: phone.trim() } : {}),
        ...(redeem && loyaltyProfile?.customer
          ? { redeemPoints: loyaltyProfile.customer.loyalty_points }
          : {}),
      };
      if (sync.online) {
        // Online: charge now; the UUID is the replay-safe idempotency key.
        return {
          mode: 'live' as const,
          result: await endpoints.createPosSale({ saleId: Crypto.randomUUID(), ...payload }),
        };
      }
      // Offline: persist to the outbox; auto-sync flushes it on reconnect.
      await enqueueSale(payload);
      return { mode: 'queued' as const };
    },
    onSuccess: (out) => {
      if (out.mode === 'live') {
        const r: PosSaleResult = out.result;
        setReceipt({
          title: `Sale #${r.order.order_number}`,
          body: `${formatGhs(r.order.total)} collected via ${paymentMethod}.${
            r.order.pointsEarned ? ` +${r.order.pointsEarned} loyalty points.` : ''
          }`,
          offline: false,
        });
      } else {
        setReceipt({
          title: 'Sale saved offline',
          body: `${formatGhs(total)} will sync automatically when you are back online.`,
          offline: true,
        });
      }
      setCart([]);
      setPhone('');
      setRedeem(false);
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard-full'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => setSnack(apiErrorMessage(err, 'Could not record the sale.')),
  });
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Appbar.Header mode="small" style={{ backgroundColor: colors.background }}>
        <Appbar.Content title="Point of sale" />
        <Chip compact style={[styles.syncChip, { backgroundColor: sync.online === false ? colors.errorContainer : colors.tertiaryContainer }]}>
          <Text style={{ color: sync.online === false ? colors.onErrorContainer : colors.onTertiaryContainer }}>
            {sync.online === false ? 'Offline' : 'Online'}
          </Text>
        </Chip>
        <Appbar.Action icon="refresh" onPress={() => { sync.flush().catch(() => undefined); productsQuery.refetch(); }} accessibilityLabel="Sync" />
      </Appbar.Header>

      <Banner visible={sync.failed > 0} actions={[{ label: 'Sync now', onPress: () => sync.flush().catch(() => undefined) }]}>
        {sync.failed} sale{sync.failed === 1 ? '' : 's'} rejected by the server — see below to retry or discard.
      </Banner>

      <View style={styles.searchRow}>
        <TextInput
          mode="outlined"
          dense
          placeholder="Search products or categories…"
          value={search}
          onChangeText={setSearch}
          left={<TextInput.Icon icon="magnify" />}
          right={search ? <TextInput.Icon icon="close" onPress={() => setSearch('')} /> : undefined}
        />
      </View>

      {productsQuery.isLoading && cached.length === 0 ? (
        <LoadingState label="Loading your catalog…" />
      ) : productsQuery.isError && products.length === 0 ? (
        <ErrorState message={apiErrorMessage(productsQuery.error)} onRetry={productsQuery.refetch} />
      ) : visibleProducts.length === 0 ? (
        <EmptyState title="No products found" message={search ? 'Try a different search.' : 'Add products to start selling.'} />
      ) : (
        <FlatList
          data={visibleProducts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const variants = (item.variants ?? []).filter((v) => v.id);
            const inStock = variants.some((v) => Number(v.stockQuantity) > 0);
            return (
              <Card mode="elevated" style={styles.productCard} onPress={() => tapProduct(item)} disabled={!inStock}>
                <View style={styles.productBody}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text variant="titleMedium" style={styles.productName} numberOfLines={1}>{item.name}</Text>
                    <Text variant="bodySmall" style={styles.productMeta}>
                      {item.category || 'Uncategorised'} · {formatGhs(item.price)}
                    </Text>
                    <Text variant="bodySmall" style={[styles.productStock, { color: inStock ? colors.tertiary : colors.error }]}>
                      {inStock
                        ? `${variants.reduce((s, v) => s + Number(v.stockQuantity), 0)} in stock`
                        : 'Out of stock'}
                      {variants.length > 1 ? ` · ${variants.length} options` : ''}
                    </Text>
                  </View>
                  <IconButton icon={inStock ? 'plus-circle' : 'minus-circle-outline'} iconColor={inStock ? colors.primary : colors.outline} disabled={!inStock} onPress={() => tapProduct(item)} />
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Offline queue panel: pending + failed sales with retry/discard. */}
      {sync.entries.length > 0 ? (
        <Card mode="elevated" style={[{ marginHorizontal: 16, marginBottom: 8 }, { backgroundColor: colors.errorContainer }]}>
          <View style={styles.outboxBody}>
            <Text variant="titleSmall" style={[styles.outboxTitle, { color: colors.onErrorContainer }]}>
              Offline queue ({sync.entries.length})
            </Text>
            {sync.entries.map((e) => (
              <View key={e.saleId} style={styles.outboxRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text variant="bodyMedium" style={styles.productName} numberOfLines={1}>
                    {e.payload.items.length} item{e.payload.items.length === 1 ? '' : 's'} · {e.payload.paymentMethod}
                  </Text>
                  <Text variant="bodySmall" style={{ color: e.status === 'failed' ? colors.error : colors.onSurfaceVariant }}>
                    {e.status === 'failed' ? e.error || 'Rejected' : 'Waiting to sync'} · {new Date(e.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
                {e.status === 'failed' ? (
                  <>
                    <Button compact mode="outlined" onPress={() => retryEntry(e.saleId)}>Retry</Button>
                    <Button compact mode="text" textColor={colors.error} onPress={() => discardEntry(e.saleId)}>Drop</Button>
                  </>
                ) : null}
              </View>
            ))}
          </View>
        </Card>
      ) : null}
      {/* Cart + charge bar pinned to the bottom. */}
      {cart.length > 0 ? (
        <View style={[styles.cartBar, { backgroundColor: colors.surface, borderTopColor: colors.outlineVariant }]}>
          <ScrollView style={styles.cartLines}>
            {cart.map((l) => (
              <View key={l.variantId} style={styles.cartRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text variant="bodyMedium" style={styles.cartName} numberOfLines={1}>{l.productName}</Text>
                  <Text variant="bodySmall" style={styles.productMeta}>
                    {l.variantLabel} · {formatGhs(l.unitPrice)}
                  </Text>
                </View>
                <IconButton icon="minus" onPress={() => changeQty(l.variantId, -1)} accessibilityLabel="Decrease" />
                <Text variant="titleSmall" style={styles.qty}>{l.quantity}</Text>
                <IconButton icon="plus" onPress={() => changeQty(l.variantId, 1)} accessibilityLabel="Increase" />
              </View>
            ))}
          </ScrollView>

          <TextInput
            mode="outlined"
            dense
            label="Customer phone (optional)"
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            maxLength={12}
            left={<TextInput.Icon icon="phone" />}
            style={{ marginTop: 8 }}
          />
          {loyaltyProfile?.customer ? (
            <Chip compact style={styles.loyaltyChip}>
              {loyaltyProfile.customer.name || 'Customer'} · {loyaltyProfile.customer.loyalty_points} pts · up to {formatGhs(maxDiscount)} off
            </Chip>
          ) : lookupPhone ? (
            <Text variant="bodySmall" style={styles.productMeta}>
              {loyalty.isFetching ? 'Checking loyalty…' : 'No loyalty profile for this number — a new one will be created.'}
            </Text>
          ) : null}
          {loyaltyProfile?.customer && maxDiscount > 0 ? (
            <Button compact mode={redeem ? 'contained' : 'outlined'} onPress={() => setRedeem((r) => !r)} style={styles.redeemBtn}>
              {redeem ? `Redeeming ${formatGhs(discount)} — tap to cancel` : `Redeem points (up to ${formatGhs(maxDiscount)})`}
            </Button>
          ) : null}

          <SegmentedButtons
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as 'CASH' | 'MOMO')}
            buttons={[{ value: 'CASH', label: 'Cash' }, { value: 'MOMO', label: 'MoMo' }]}
            density="small"
            style={styles.payRow}
          />
          {paymentMethod === 'MOMO' ? (
            <SegmentedButtons
              value={momoNetwork}
              onValueChange={(v) => setMomoNetwork(v as 'MTN' | 'VODAFONE' | 'AT')}
              buttons={[{ value: 'MTN', label: 'MTN' }, { value: 'VODAFONE', label: 'Telecel' }, { value: 'AT', label: 'AT' }]}
              density="small"
              style={styles.payRow}
            />
          ) : null}

          <View style={styles.totalRow}>
            <Text variant="titleMedium" style={[styles.totalLabel, { color: colors.onSurface }]}>Total</Text>
            <Text variant="headlineSmall" style={[styles.totalValue, { color: colors.primary }]}>{formatGhs(total)}</Text>
          </View>
          <Button
            mode="contained"
            icon={sync.online === false ? 'cloud-off-outline' : 'cash-check'}
            loading={saleMutation.isPending}
            disabled={saleMutation.isPending}
            onPress={() => saleMutation.mutate()}
            style={styles.chargeBtn}
          >
            {sync.online === false ? `Save offline · ${formatGhs(total)}` : `Charge ${formatGhs(total)}`}
          </Button>
        </View>
      ) : null}
      <Portal>
        {/* Variant picker for multi-option products. */}
        <Dialog visible={Boolean(pickProduct)} onDismiss={() => setPickProduct(null)}>
          <Dialog.Title>{pickProduct?.name}</Dialog.Title>
          <Dialog.Content>
            {(pickProduct?.variants ?? []).filter((v) => v.id).map((v) => (
              <View key={v.id} style={styles.variantRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyLarge">{v.optionValue}</Text>
                  <Text variant="bodySmall" style={styles.productMeta}>
                    {formatGhs(variantPrice(pickProduct!, v))} · {v.stockQuantity} in stock
                  </Text>
                </View>
                <Button
                  mode="contained"
                  compact
                  disabled={Number(v.stockQuantity) <= 0}
                  onPress={() => { addVariant(pickProduct!, v); setPickProduct(null); }}
                >
                  Add
                </Button>
              </View>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPickProduct(null)}>Close</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Receipt / confirmation. */}
        <Dialog visible={Boolean(receipt)} onDismiss={() => setReceipt(null)}>
          <Dialog.Title>{receipt?.title}</Dialog.Title>
          <Dialog.Content>
            <Animated.View
              entering={reduceMotion ? undefined : ZoomIn.duration(260)}
              style={[styles.receiptIcon, { backgroundColor: receipt?.offline ? colors.secondaryContainer : colors.tertiaryContainer }]}
            >
              <MaterialCommunityIcons
                name={receipt?.offline ? 'cloud-check-outline' : 'check'}
                size={32}
                color={receipt?.offline ? colors.onSecondaryContainer : colors.onTertiaryContainer}
              />
            </Animated.View>
            <Text variant="bodyMedium">{receipt?.body}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="contained" onPress={() => setReceipt(null)}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)} duration={3000}>
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  syncChip: { marginRight: 4 },
  searchRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  list: { padding: 16, paddingTop: 8, paddingBottom: 24 },
  productCard: { marginBottom: 10 },
  productBody: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  productName: { fontWeight: '700' },
  productMeta: { marginTop: 2 },
  productStock: { marginTop: 4, fontWeight: '600' },
  outboxBody: { padding: 12 },
  outboxTitle: { fontWeight: '700', marginBottom: 6 },
  outboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.2)' },
  cartBar: { borderTopWidth: 1, padding: 12 },
  cartLines: { maxHeight: 150 },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  cartName: { fontWeight: '600' },
  qty: { fontWeight: '700', minWidth: 24, textAlign: 'center' },
  loyaltyChip: { backgroundColor: '#CFEEDE', marginTop: 8, alignSelf: 'flex-start' },
  redeemBtn: { marginTop: 8, alignSelf: 'flex-start' },
  payRow: { marginTop: 10 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  totalLabel: { fontWeight: '700' },
  totalValue: { fontWeight: '800' },
  chargeBtn: { marginTop: 10 },
  variantRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  receiptIcon: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
});
