// services/affiliateService.js
// DiDwa - Affiliate Program Service Layer

// Core utilities
export function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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