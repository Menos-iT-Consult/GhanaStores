import React from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import {
  AI_ACTIONS,
  isSupportedOrderText,
  type DidwaAiActionId,
} from '../../../../config/didwaAiActions.js';
import { api, apiErrorMessage } from '@/api/client';

interface ProductOption {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface AiItem {
  name: string;
  quantity: number;
}

interface AiActionResult {
  type?: 'inventory' | 'sales' | 'orders';
  customerName?: string | null;
  items?: AiItem[];
  deliveryLocation?: string | null;
  deliveryRegion?: string | null;
  totalGhs?: number | null;
  needsReview?: boolean;
  reviewNotes?: string[];
  professionalEnglish?: string;
  professionalCaption?: string;
  ghanaianPidgin?: string;
  totalSalesGhs?: number;
  platformFeesGhs?: number;
  platformFeePercent?: number;
  netPayableGhs?: number;
  paidOutGhs?: number;
  pendingPayoutGhs?: number;
  availableGhs?: number;
  supportedWallets?: string[];
  variantCount?: number;
  lowStockCount?: number;
  unitsInStock?: number;
  stockValueGhs?: number;
  lowStockItems?: Array<{
    productName: string;
    variant: string;
    quantity: number;
    reorderLevel: number;
  }>;
  last7DaysGhs?: number;
  previous7DaysGhs?: number;
  changePercent?: number | null;
  last30DaysGhs?: number;
  paidOrders30Days?: number;
  averageOrderValue30Days?: number;
  topProducts?: Array<{ name: string; unitsSold: number; revenueGhs: number }>;
  totalOrders?: number;
  pendingOver48Hours?: number;
  byStatus?: Array<{ status: string; count: number; totalGhs: number }>;
  request?: {
    status?: string;
    amount_ghs?: number;
    momo_network?: string;
    momo_number?: string;
  };
  message?: string;
}

interface SupportContact {
  supportEmail?: string;
  supportPhone?: string;
  whatsappNumber?: string;
}

function formatGhs(value: unknown): string {
  return `GH₵${Number(value || 0).toFixed(2)}`;
}

function ResultLine({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.resultLine, { borderBottomColor: colors.outlineVariant }]}>
      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="bodyMedium" style={[styles.resultValue, { color: colors.onSurface }]}>{value}</Text>
    </View>
  );
}

export function DiDwaAiSheet({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const { colors } = useTheme();
  const [selectedAction, setSelectedAction] = React.useState<DidwaAiActionId | null>(null);
  const [orderText, setOrderText] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [productId, setProductId] = React.useState('');
  const [products, setProducts] = React.useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [result, setResult] = React.useState<AiActionResult | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [supportContact, setSupportContact] = React.useState<SupportContact>({});
  const supportContactAvailable = Boolean(
    supportContact.supportEmail || supportContact.supportPhone || supportContact.whatsappNumber,
  );
  const fallbackText = 'This action could not be processed. Choose a suggested option and check the required details.';

  React.useEffect(() => {
    if (!visible) return undefined;
    api.get<{ settings: { contact?: SupportContact } }>('/api/platform-settings/public')
      .then((response) => setSupportContact(response.data.settings?.contact || {}))
      .catch((err: unknown) => {
        setError(apiErrorMessage(err, 'Could not load DiDwa Support contact details.'));
      });
    return undefined;
  }, [visible]);

  React.useEffect(() => {
    if (!visible || selectedAction !== '[GENERATE_PRODUCT_COPY]' || products.length || productsLoading) return;
    setProductsLoading(true);
    api.get<{ products: ProductOption[] }>('/api/ai/products')
      .then((response) => {
        setProducts(response.data.products || []);
      })
      .catch((err: unknown) => {
        setError(apiErrorMessage(err, 'Could not load products from your store.'));
      })
      .finally(() => {
        setProductsLoading(false);
      });
    return undefined;
  }, [visible, selectedAction, products.length]);

  const runAction = async (action: DidwaAiActionId, payload: Record<string, unknown> = {}) => {
    setBusy(true);
    setError('');
    setResult(null);
    setCopied(false);
    try {
      const response = await api.post<{ result: AiActionResult }>('/api/ai/gateway', { action, payload });
      setResult(response.data.result);
    } catch (err) {
      setError(apiErrorMessage(err, fallbackText));
    } finally {
      setBusy(false);
    }
  };

  const chooseAction = (action: DidwaAiActionId) => {
    setSelectedAction(action);
    setError('');
    setResult(null);
    if (
      action === '[CHECK_MOMO_BALANCE]'
      || action === '[INVENTORY_INSIGHTS]'
      || action === '[SALES_SUMMARY]'
      || action === '[ORDER_SUMMARY]'
    ) void runAction(action);
  };

  const submit = () => {
    if (selectedAction === '[PARSE_WHATSAPP_ORDER]') {
      if (!isSupportedOrderText(orderText)) return setError('Enter an order message with customer or item details.');
      void runAction(selectedAction, { text: orderText });
    } else if (selectedAction === '[GENERATE_PRODUCT_COPY]') {
      if (!productId) return setError('Select a product before generating copy.');
      void runAction(selectedAction, { productId });
    } else if (selectedAction === '[REQUEST_PAYOUT]') {
      const amountGhs = Number(amount);
      if (!Number.isFinite(amountGhs) || amountGhs <= 0) return setError('Enter a valid payout amount.');
      void runAction(selectedAction, { amountGhs });
    } else {
      setError('Choose a suggested action before continuing.');
    }
  };

  const copyText = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
    } catch {
      setError('Clipboard access is unavailable on this device.');
    }
  };

  const openSupportContact = async (type: 'email' | 'phone' | 'whatsapp') => {
    let url = '';
    if (type === 'email' && supportContact.supportEmail) {
      url = `mailto:${supportContact.supportEmail}`;
    } else if (type === 'phone' && supportContact.supportPhone) {
      url = `tel:${supportContact.supportPhone}`;
    } else if (type === 'whatsapp' && supportContact.whatsappNumber) {
      const digits = supportContact.whatsappNumber.replace(/\D/g, '');
      const internationalNumber = digits.startsWith('0') ? `233${digits.slice(1)}` : digits;
      url = `https://wa.me/${internationalNumber}`;
    }

    if (!url) {
      setError('Support contact details are unavailable.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      setError('Could not open the selected DiDwa Support contact on this device.');
    }
  };

  const renderResult = () => {
    if (!result) return null;
    return (
      <Card mode="outlined" style={styles.resultCard}>
        <Card.Title
          title="Result"
          right={() => (
            <IconButton
              icon={copied ? 'check' : 'content-copy'}
              accessibilityLabel={copied ? 'Copied result' : 'Copy result'}
              onPress={() => void copyText(JSON.stringify(result, null, 2))}
            />
          )}
        />
        <Card.Content>
          {Array.isArray(result.items) ? (
            <>
              <ResultLine label="Customer" value={result.customerName || 'Not identified'} />
              <View style={styles.items}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Items</Text>
                {result.items.length
                  ? result.items.map((item, index) => (
                    <Text key={`${item.name}-${index}`} variant="bodyMedium" style={{ color: colors.onSurface }}>
                      {item.quantity} × {item.name}
                    </Text>
                  ))
                  : <Text variant="bodyMedium">Not identified</Text>}
              </View>
              <ResultLine label="Delivery" value={result.deliveryLocation || 'Not identified'} />
              <ResultLine label="Region" value={result.deliveryRegion || 'Not identified'} />
              <ResultLine label="Total" value={result.totalGhs === null || result.totalGhs === undefined ? 'Not identified' : formatGhs(result.totalGhs)} />
              {result.needsReview ? (
                <View style={[styles.reviewBox, { backgroundColor: colors.tertiaryContainer }]}>
                  <Text variant="titleSmall" style={{ color: colors.onTertiaryContainer }}>Review before using this order</Text>
                  {result.reviewNotes?.map((note) => <Text key={note} variant="bodySmall" style={{ color: colors.onTertiaryContainer }}>• {note}</Text>)}
                </View>
              ) : null}
            </>
          ) : null}
          {result.professionalEnglish ? (
            <View style={styles.copyResults}>
              <CopyText label="Professional English" value={result.professionalEnglish} onCopy={copyText} />
              {result.professionalCaption ? <CopyText label="English caption" value={result.professionalCaption} onCopy={copyText} /> : null}
              {result.ghanaianPidgin ? <CopyText label="Ghanaian Pidgin" value={result.ghanaianPidgin} onCopy={copyText} /> : null}
            </View>
          ) : null}
          {result.totalSalesGhs !== undefined ? (
            <>
              <ResultLine label="Gross sales" value={formatGhs(result.totalSalesGhs)} />
              <ResultLine label={`DiDwa fee (${result.platformFeePercent ?? 2}%)`} value={formatGhs(result.platformFeesGhs)} />
              <ResultLine label="Net payable" value={formatGhs(result.netPayableGhs)} />
              <ResultLine label="Paid out" value={formatGhs(result.paidOutGhs)} />
              <ResultLine label="Pending payouts" value={formatGhs(result.pendingPayoutGhs)} />
              <ResultLine label="Available to withdraw" value={formatGhs(result.availableGhs)} />
              <Text variant="bodySmall" style={styles.supportedWallets}>
                Supported wallets: {result.supportedWallets?.join(', ')}
              </Text>
            </>
          ) : null}
          {result.request ? (
            <>
              <ResultLine label="Status" value={result.request.status || 'Pending'} />
              <ResultLine label="Amount" value={formatGhs(result.request.amount_ghs)} />
              <ResultLine label="Wallet" value={`${result.request.momo_network || ''} · ${result.request.momo_number || ''}`} />
              <Text variant="bodyMedium" style={styles.payoutMessage}>{result.message}</Text>
            </>
          ) : null}
          {result.type === 'inventory' ? (
            <>
              <ResultLine label="Active variants" value={String(result.variantCount || 0)} />
              <ResultLine label="Low-stock variants" value={String(result.lowStockCount || 0)} />
              <ResultLine label="Units in stock" value={String(result.unitsInStock || 0)} />
              <ResultLine label="Estimated stock value" value={formatGhs(result.stockValueGhs)} />
              <View style={styles.items}>
                <Text variant="titleSmall">Restock priorities</Text>
                {result.lowStockItems?.length
                  ? result.lowStockItems.map((item, index) => (
                    <ResultLine
                      key={`${item.productName}-${item.variant}-${index}`}
                      label={`${item.productName} · ${item.variant}`}
                      value={`${item.quantity} left (restock at ${item.reorderLevel})`}
                    />
                  ))
                  : <Text variant="bodySmall">No active variants are below their reorder levels.</Text>}
              </View>
            </>
          ) : null}
          {result.type === 'sales' ? (
            <>
              <ResultLine label="Sales, last 7 days" value={formatGhs(result.last7DaysGhs)} />
              <ResultLine label="Previous 7 days" value={formatGhs(result.previous7DaysGhs)} />
              <ResultLine
                label="Week-on-week change"
                value={result.changePercent === null || result.changePercent === undefined
                  ? 'No previous sales to compare'
                  : `${result.changePercent > 0 ? '+' : ''}${result.changePercent}%`}
              />
              <ResultLine label="Sales, last 30 days" value={formatGhs(result.last30DaysGhs)} />
              <ResultLine label="Paid orders, last 30 days" value={String(result.paidOrders30Days || 0)} />
              <ResultLine label="Average order value" value={formatGhs(result.averageOrderValue30Days)} />
              <View style={styles.items}>
                <Text variant="titleSmall">Top products (30 days)</Text>
                {result.topProducts?.length
                  ? result.topProducts.map((item) => (
                    <ResultLine key={item.name} label={`${item.name} · ${item.unitsSold} sold`} value={formatGhs(item.revenueGhs)} />
                  ))
                  : <Text variant="bodySmall">No completed sales in the last 30 days.</Text>}
              </View>
            </>
          ) : null}
          {result.type === 'orders' ? (
            <>
              <ResultLine label="All orders" value={String(result.totalOrders || 0)} />
              <ResultLine label="Pending over 48 hours" value={String(result.pendingOver48Hours || 0)} />
              <View style={styles.items}>
                <Text variant="titleSmall">Orders by status</Text>
                {result.byStatus?.map((item) => (
                  <ResultLine key={item.status} label={item.status} value={`${item.count} · ${formatGhs(item.totalGhs)}`} />
                ))}
              </View>
            </>
          ) : null}
        </Card.Content>
      </Card>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
      >
        <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text variant="titleLarge" style={{ color: colors.onSurface, fontWeight: '700' }}>DiDwa AI</Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>System-generated seller tools</Text>
          </View>
          <IconButton icon="close" accessibilityLabel="Close" onPress={onDismiss} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="titleSmall" style={styles.sectionTitle}>Choose a suggested action</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {AI_ACTIONS.map((action) => (
              <Chip
                key={action.id}
                selected={selectedAction === action.id}
                onPress={() => chooseAction(action.id)}
                accessibilityRole="button"
                style={styles.chip}
              >
                {action.label}
              </Chip>
            ))}
          </ScrollView>

          {selectedAction ? (
            <Text variant="bodySmall" style={styles.description}>
              {AI_ACTIONS.find((action) => action.id === selectedAction)?.description}
            </Text>
          ) : null}

          {selectedAction === '[PARSE_WHATSAPP_ORDER]' ? (
            <View style={styles.form}>
              <TextInput
                mode="outlined"
                label="WhatsApp order message"
                value={orderText}
                onChangeText={setOrderText}
                multiline
                numberOfLines={5}
                maxLength={5000}
                style={styles.textInput}
              />
              <Text variant="bodySmall" style={styles.hint}>Check the extracted order details before using them.</Text>
              <Button mode="contained" icon="text-search" onPress={submit} disabled={busy}>Parse order</Button>
            </View>
          ) : null}

          {selectedAction === '[GENERATE_PRODUCT_COPY]' ? (
            <View style={styles.form}>
              <Text variant="titleSmall">Select an active product</Text>
              {productsLoading ? <ActivityIndicator /> : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {products.map((product) => (
                    <Chip key={product.id} selected={productId === product.id} onPress={() => setProductId(product.id)}>
                      {product.name} · {formatGhs(product.price)}
                    </Chip>
                  ))}
                  {!products.length ? <Text variant="bodySmall">No active products found.</Text> : null}
                </ScrollView>
              )}
              <Button mode="contained" icon="text-box-edit-outline" onPress={submit} disabled={busy || productsLoading || !productId}>
                Generate copy
              </Button>
            </View>
          ) : null}

          {selectedAction === '[REQUEST_PAYOUT]' ? (
            <View style={styles.form}>
              <TextInput
                mode="outlined"
                label="Amount in GHS"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                style={styles.textInput}
              />
              <Text variant="bodySmall" style={styles.hint}>Payouts go to your verified wallet and require DiDwa manual review.</Text>
              <Button mode="contained" icon="cash-fast" onPress={submit} disabled={busy}>Request payout</Button>
            </View>
          ) : null}

          {busy ? <ActivityIndicator style={styles.loader} /> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {renderResult()}
        </ScrollView>
        {supportContactAvailable ? (
          <View style={[styles.footer, { borderTopColor: colors.outlineVariant }]}>
            <Card mode="outlined">
              <Card.Content>
                <Text variant="titleSmall">DiDwa Support</Text>
              {supportContact.supportEmail ? (
                <Button mode="outlined" icon="email-outline" onPress={() => void openSupportContact('email')}>
                  Email {supportContact.supportEmail}
                </Button>
              ) : null}
              {supportContact.supportPhone ? (
                <Button mode="outlined" icon="phone" onPress={() => void openSupportContact('phone')}>
                  Call {supportContact.supportPhone}
                </Button>
              ) : null}
              {supportContact.whatsappNumber ? (
                <Button mode="outlined" icon="message-text-outline" onPress={() => void openSupportContact('whatsapp')}>
                  WhatsApp Support
                </Button>
              ) : null}
              </Card.Content>
            </Card>
          </View>
        ) : null}
      </Modal>
    </Portal>
  );
}

function CopyText({ label, value, onCopy }: { label: string; value: string; onCopy: (text: string) => Promise<void> }) {
  const { colors } = useTheme();
  return (
    <View style={styles.copyBlock}>
      <View style={styles.copyHeading}>
        <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
        <IconButton icon="content-copy" size={18} accessibilityLabel={`Copy ${label}`} onPress={() => void onCopy(value)} />
      </View>
      <Text variant="bodyMedium" style={{ color: colors.onSurface }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modal: {
    alignSelf: 'stretch',
    height: '90%',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20 },
  heading: { flex: 1, gap: 2 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 10 },
  sectionTitle: { marginTop: 4 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  chip: { marginRight: 2 },
  description: { color: '#475569' },
  form: { gap: 10 },
  textInput: { backgroundColor: '#FFFFFF' },
  hint: { color: '#475569', marginBottom: 6 },
  loader: { marginVertical: 8 },
  error: { color: '#B42318', backgroundColor: '#FEF3F2', padding: 12, borderRadius: 10 },
  resultCard: { marginTop: 4 },
  resultLine: { minHeight: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  resultValue: { flex: 1, textAlign: 'right', fontWeight: '600' },
  items: { gap: 4, paddingVertical: 8 },
  reviewBox: { gap: 4, padding: 12, borderRadius: 10, marginTop: 10 },
  copyResults: { gap: 12 },
  copyBlock: { gap: 4 },
  copyHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  supportedWallets: { color: '#475569', marginTop: 10 },
  payoutMessage: { marginTop: 10 },
});
