import { query } from '../config/database.js';

const SETTINGS = {
  commissionRatePercent: {
    key: 'affiliate_commission_rate',
    description: 'Recurring commission percentage paid to affiliates',
  },
  minimumPayoutGhs: {
    key: 'affiliate_min_cashout_ghs',
    description: 'Minimum available balance in GHS required for payout requests',
  },
  attributionDays: {
    key: 'affiliate_attribution_days',
    description: 'Days a referral attribution remains valid',
  },
  payoutProcessingMinDays: {
    key: 'affiliate_payout_min_days',
    description: 'Minimum business days to process an affiliate payout',
  },
  payoutProcessingMaxDays: {
    key: 'affiliate_payout_max_days',
    description: 'Maximum business days to process an affiliate payout',
  },
};

export async function getAffiliateProgramSettings(runQuery = query) {
  const keys = Object.values(SETTINGS).map(({ key }) => key);
  const { rows } = await runQuery(
    'SELECT setting_key, setting_value FROM system_settings WHERE setting_key = ANY($1::text[])',
    [keys],
  );
  const values = new Map(rows.map(({ setting_key, setting_value }) => [setting_key, Number(setting_value)]));
  const settings = {};

  for (const [name, { key }] of Object.entries(SETTINGS)) {
    const value = values.get(key);
    if (!Number.isFinite(value)) {
      throw new Error(`Affiliate program setting "${key}" is missing or invalid.`);
    }
    settings[name] = value;
  }

  return settings;
}

export const affiliateProgramSettingDefinitions = SETTINGS;
