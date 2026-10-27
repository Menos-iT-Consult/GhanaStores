// services/affiliateService.js
// DiDwa - Affiliate Program Service Layer

// Core utilities
export function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function isValidReferralCode(code) {
  const value = String(code || '').trim();
  return /^[A-HJ-NP-Z2-9]{8}$/i.test(value)
    || /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validateCommissionRate(rate) {
  const pct = parseFloat(rate);
  return pct >= 0 && pct <= 1 ? pct : 0.10;
}

export function calculateCommission(planAmountGHS, commissionRate) {
  const rate = validateCommissionRate(commissionRate);
  return Number((planAmountGHS * rate).toFixed(2));
}

export function formatGHS(amount) {
  return `₵${amount.toFixed(2)}`;
}

// Alias for backward compatibility
export { calculateCommission as calculateCommissionRate };