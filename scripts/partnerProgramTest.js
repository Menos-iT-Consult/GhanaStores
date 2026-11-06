import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const migration = read('../db/migrations/004_partner_program.sql');
const api = read('../routes/partnerApiRoutes.js');
const adminApi = read('../routes/admin/partners.js');
const auth = read('../middleware/authMiddleware.js');
const billing = read('../routes/billingRoutes.js');
const affiliateApi = read('../routes/affiliateApiRoutes.js');
const affiliateModel = read('../models/affiliate.js');
const domain = read('../middleware/domainMiddleware.js');
const slug = read('../services/subdomainSlug.js');
const hostApi = read('../routes/domainRoutes.js');
const app = read('../src/App.jsx');
const portal = read('../src/pages/partner/PartnerPortalPage.jsx');
const adminUi = read('../src/pages/admin/AdminPartners.jsx');
const routes = read('../src/routes.js');
const server = read('../server.js');
const prompts = read('../config/partnerPrompts.js');
const runner = read('../scripts/applyAffiliateMigration.js');
const webhooks = read('../services/paymentWebhooks.js');

const checks = [
  ['migration defines partner profiles, network, earnings ledger, and payouts',
    ['partners', 'partner_network', 'partner_ledgers', 'partner_payouts'].every((table) => migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`))],
  ['partner rates are bounded and use separate merchant / affiliate bases',
    /merchant_override_rate_percent[\s\S]{0,160}CHECK/.test(migration)
      && /affiliate_override_rate_percent[\s\S]{0,160}CHECK/.test(migration)
      && /orders\.total/.test(migration)
      && /NEW\.earned_amount_ghs/.test(migration)],
  ['paid-order and affiliate-commission triggers provide idempotent override records',
    /orders_partner_override_trigger/.test(migration)
      && /affiliate_commissions_partner_override_trigger/.test(migration)
      && /ON CONFLICT \(partner_id, source_type, source_id\)/.test(migration)],
  ['partial managed-payment refunds reduce partner GMV overrides idempotently',
    /UPDATE partner_ledgers[\s\S]{0,500}source_type = 'merchant_gmv'/.test(webhooks)
      && /base_amount_ghs = GREATEST\(base_amount_ghs - \$2, 0\)/.test(webhooks)],
  ['partner applications use bcrypt and only approved partners can sign in',
    /bcrypt\.hash\(password, 12\)/.test(api)
      && /account\.status !== 'approved'/.test(api)
      && /issuePartnerToken\(partner\)/.test(api)],
  ['partner protected endpoints validate PARTNER role and approved status',
    /req\.auth\?\.role !== 'PARTNER'/.test(api)
      && /findPartnerById\(req\.auth\.sub\)/.test(api)],
  ['payout reservations serialize per partner and use verified MoMo details',
    /WHERE id = \$1 AND status = 'approved'\s+FOR UPDATE/.test(read('../models/partner.js'))
      && /status IN \('pending','paid'\)/.test(read('../models/partner.js'))
      && /momo_verified_at/.test(read('../models/partner.js'))],
  ['admin partner approvals, rate changes, network reads, and payout decisions are audited',
    /router\.patch\('\/partners\/:id'/.test(adminApi)
      && /router\.get\('\/partners\/:id\/network'/.test(adminApi)
      && /recordAdminAction/.test(adminApi)
      && /router\.patch\('\/partner-payouts\/:id'/.test(adminApi)],
  ['merchant attribution is written in the store transaction with affiliate precedence',
    /findApprovedPartnerByCode/.test(billing)
      && /referred_by_partner_id/.test(billing)
      && /INSERT INTO partner_network \(partner_id, relationship, merchant_id\)/.test(billing)
      && /A submitted affiliate code takes precedence/.test(billing)],
  ['affiliate recruitment from partner links sets parent and network row transactionally',
    /partnerCode/.test(affiliateApi)
      && /parentPartnerId: partner\?\.id/.test(affiliateApi)
      && /INSERT INTO partner_network \(partner_id, relationship, affiliate_id\)/.test(affiliateModel)],
  ['partner is reserved from seller subdomain allocation and recognized by host routing',
    /new Set\(\[[^\]]*'partner'[^\]]*\]\)/.test(slug)
      && /classifyHost/.test(domain)
      && /isPartnerHost/.test(hostApi)],
  ['SPA provides a partner-host portal and public merchant landing route',
    /isPartnerHost/.test(app)
      && /PartnerPortalPage/.test(app)
      && /route\.startsWith\('\/p\/'\)/.test(app)
      && /'\/p\/'/.test(routes)],
  ['partner dashboard and admin UI provide referral, network, rate, and payout workflows',
    /Merchant onboarding link/.test(portal)
      && /Affiliate recruitment link/.test(portal)
      && /Request MoMo payout/.test(portal)
      && /RateSlider/.test(adminUi)
      && /Mark paid/.test(adminUi)],
  ['outreach templates avoid promises of fixed commission or guaranteed earnings',
    /PARTNER_OUTREACH_TEMPLATES/.test(prompts)
      && /Never promise a specific rate, guaranteed earnings/.test(prompts)],
  ['partner migration is included in the documented affiliate migration runner',
    /004_partner_program\.sql/.test(runner)],
  ['partner sign-in and payout routes have dedicated rate limits',
    /\/api\/partners\/login', authLimiter/.test(server)
      && /\/api\/partners\/payouts', affiliatePayoutLimiter/.test(server)],
];

let failures = 0;
for (const [label, passed] of checks) {
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${label}`);
  if (!passed) failures += 1;
}
console.log(`\n===== RESULT: ${checks.length - failures} passed, ${failures} failed =====\n`);
process.exit(failures === 0 ? 0 : 1);
