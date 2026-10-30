import { query } from '../config/database.js';
import { paystackPlatformReady } from './paystackPlatform.js';

export const DEFAULT_MANAGED_PAYMENT_POLICY = Object.freeze({
  enabled: true,
  feePercent: 2,
  minimumPayoutGhs: 50,
});

export const MANAGED_PAYMENT_SETTING_DEFINITIONS = Object.freeze({
  enabled: {
    key: 'managed_payments_enabled',
    description: 'Allow stores to accept payments through the DiDwa managed Paystack account',
  },
  feePercent: {
    key: 'managed_payments_fee_percent',
    description: 'Platform fee percent deducted from settled managed orders',
  },
  minimumPayoutGhs: {
    key: 'managed_payout_minimum_ghs',
    description: 'Minimum available balance in GHS required for managed payout requests',
  },
});

export async function getManagedPaymentPolicy(runQuery = query) {
  const keys = Object.values(MANAGED_PAYMENT_SETTING_DEFINITIONS).map(({ key }) => key);
  const { rows } = await runQuery(
    `SELECT setting_key, setting_value
       FROM system_settings
      WHERE setting_key = ANY($1::text[])`,
    [keys],
  );
  const values = new Map(rows.map(({ setting_key, setting_value }) => [setting_key, setting_value]));
  const read = (name, fallback) => values.has(MANAGED_PAYMENT_SETTING_DEFINITIONS[name].key)
    ? values.get(MANAGED_PAYMENT_SETTING_DEFINITIONS[name].key)
    : fallback;

  return {
    enabled: String(read('enabled', DEFAULT_MANAGED_PAYMENT_POLICY.enabled)) === 'true',
    feePercent: Number(read('feePercent', DEFAULT_MANAGED_PAYMENT_POLICY.feePercent)),
    minimumPayoutGhs: Number(read('minimumPayoutGhs', DEFAULT_MANAGED_PAYMENT_POLICY.minimumPayoutGhs)),
    paystackReady: paystackPlatformReady(),
  };
}

export async function getManagedStoreProfile(storeId, runQuery = query) {
  const { rows } = await runQuery(
    `SELECT use_managed_payments, payout_momo_number, payout_momo_network,
            payout_momo_account_name, payout_momo_verified_at
       FROM stores WHERE id = $1 LIMIT 1`,
    [storeId],
  );
  return rows[0] || null;
}

export function validateManagedPaymentPolicy(value) {
  const enabled = value?.enabled;
  const feePercent = Number(value?.feePercent);
  const minimumPayoutGhs = Number(value?.minimumPayoutGhs);

  if (typeof enabled !== 'boolean') return { error: 'Choose whether managed payments are enabled.' };
  if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 20) {
    return { error: 'The managed payment fee must be between 0 and 20 percent.' };
  }
  if (!Number.isFinite(minimumPayoutGhs) || minimumPayoutGhs < 1 || minimumPayoutGhs > 1_000_000) {
    return { error: 'The minimum payout must be between GHS 1 and GHS 1,000,000.' };
  }
  return {
    settings: {
      enabled,
      feePercent: Math.round(feePercent * 100) / 100,
      minimumPayoutGhs: Math.round(minimumPayoutGhs * 100) / 100,
    },
  };
}

export function normalizeMomoNetwork(value) {
  const network = String(value || '').trim().toUpperCase();
  if (network === 'VODAFONE' || network === 'VODAFONE CASH') return 'TELECEL';
  if (network === 'AIRTELTIGO' || network === 'AIRTEL TIGO') return 'AT';
  return ['MTN', 'TELECEL', 'AT'].includes(network) ? network : null;
}

export function roundGhs(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function managedOrderAmounts(grossAmount, feePercent) {
  const gross = roundGhs(grossAmount);
  const fee = roundGhs(gross * Number(feePercent) / 100);
  return { gross, fee, net: roundGhs(gross - fee) };
}
