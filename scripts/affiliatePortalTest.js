import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const middleware = read('../middleware/domainMiddleware.js');
const slugRules = read('../services/subdomainSlug.js');
const app = read('../src/App.jsx');
const routes = read('../routes/affiliateApiRoutes.js');
const billingRoutes = read('../routes/billingRoutes.js');
const server = read('../server.js');
const uiRoutes = read('../src/routes.js');
const accessPage = read('../src/pages/affiliate/AffiliateAccessPage.jsx');
const dashboardPage = read('../src/pages/affiliate/AffiliateDashboardPage.jsx');
const programPage = read('../src/pages/AffiliateProgramPage.jsx');
const welcomePage = read('../src/pages/WelcomePage.jsx');
const affiliateModel = read('../models/affiliate.js');
const affiliateLib = read('../lib/affiliate.js');
const codeMigration = read('../db/migrations/002_short_affiliate_referral_codes.sql');
const payoutMigration = read('../db/migrations/003_affiliate_payout_account_verification.sql');
const paystackService = read('../services/paystackPlatform.js');

const checks = [
  ['affiliate subdomain is reserved from tenant lookup', /RESERVED_SUBDOMAINS/.test(middleware) && /new Set\(\[[^\]]*'affiliate'[^\]]*\]\)/.test(slugRules)],
  ['affiliate root opens the dashboard directly', /if \(route === '\/' \|\| route === '\/affiliate\/dashboard'\) return <AffiliateDashboardPage \/>/.test(app)],
  ['affiliate host detection has a platform apex fallback', /hostState\.platformDomain \|\| platformHost \|\| 'didwaghana\.com'/.test(app)],
  ['affiliate program CTAs normalize a missing scheme and open signup/login in new tabs', /new URL\([\s\S]{0,180}`https:\/\/\$\{configuredAffiliateUrl\}`[\s\S]{0,100}\)\.origin/.test(programPage) && /AFFILIATE_SIGNUP_URL = `\$\{AFFILIATE_PLATFORM_URL\}\/affiliate\/signup`/.test(programPage) && /AFFILIATE_LOGIN_URL = `\$\{AFFILIATE_PLATFORM_URL\}\/affiliate\/login`/.test(programPage) && /href=\{AFFILIATE_SIGNUP_URL\}[\s\S]{0,80}target="_blank"[\s\S]{0,60}rel="noopener noreferrer"/.test(programPage) && /href=\{AFFILIATE_LOGIN_URL\}[\s\S]{0,80}target="_blank"[\s\S]{0,60}rel="noopener noreferrer"/.test(programPage)],
  ['welcome-page affiliate button opens the affiliate domain root', /AFFILIATE_DASHBOARD_URL = 'https:\/\/affiliate\.didwaghana\.com'/.test(welcomePage) && /href=\{AFFILIATE_DASHBOARD_URL\}/.test(welcomePage)],
  ['affiliate login and signup are registered public routes', ['/affiliate/login', '/affiliate/signup'].every((route) => uiRoutes.includes(`'${route}'`))],
  ['affiliate dashboard is registered as a public route', uiRoutes.includes("'/affiliate/dashboard'")],
  ['affiliate signup endpoint creates a separate affiliate account', /router\.post\('\/signup'/.test(routes) && /create\(\{[\s\S]{0,200}passwordHash/.test(routes)],
  ['affiliate signup does not ask for payout MoMo details', !/momoNumber|momoNetwork/.test(accessPage) && /ALTER COLUMN momo_network DROP NOT NULL/.test(payoutMigration) && /ALTER COLUMN momo_number DROP NOT NULL/.test(payoutMigration)],
  ['affiliate dashboard verifies and saves payout account details through Paystack', /\/api\/affiliate\/payout-account\/verify/.test(dashboardPage) && /Verify and save payout account/.test(dashboardPage) && /resolvePaystackMomoAccountName/.test(routes) && /bank\/resolve/.test(paystackService)],
  ['payout requests require a verified account and use the current locked payout details', /momo_verified_at/.test(routes) && /momo_network, momo_number[\s\S]{0,100}FOR UPDATE/.test(routes)],
  ['affiliate signup hashes passwords', /bcrypt\.hash\(password, 12\)/.test(routes)],
  ['affiliate login issues a dedicated affiliate token', /issueAffiliateToken\(affiliate\)/.test(routes)],
  ['affiliate protected APIs require the affiliate role', /req\.auth\?\.role !== 'AFFILIATE'/.test(routes)],
  ['referral links set a protected cookie using configured attribution duration', /router\.get\('\/attribution'/.test(routes) && /httpOnly: true/.test(routes) && /settings\.attributionDays/.test(routes)],
  ['merchant registration attributes a valid referral cookie', /const referralCookie = String\(req\.headers\.cookie/.test(billingRoutes) && /findByReferralCode\(referralCode\)/.test(billingRoutes)],
  ['frontend provides separate affiliate access and dashboard screens', /\/api\/affiliate\/signup/.test(accessPage) && /\/api\/affiliate\/stats/.test(dashboardPage)],
  ['affiliate dashboard loads referrals, payout history, and program terms', ['/api/affiliate/referrals', '/api/affiliate/payouts', '/api/affiliate/program'].every((path) => dashboardPage.includes(path))],
  ['seller referral links open registration with the code prefilled', /platformOrigin\}\/login\?ref=\$\{encodeURIComponent\(profile\.referral_code\)\}/.test(dashboardPage) && /referralCode:\s*new URLSearchParams\(window\.location\.search\)\.get\('ref'\)/.test(read('../src/pages/AuthScreen.jsx'))],
  ['short referral codes are saved as attribution and accepted for signup', /A-HJ-NP-Z2-9/.test(app) && /isValidReferralCode/.test(routes) && /isValidReferralCode/.test(billingRoutes)],
  ['affiliate dashboard submits payout requests', /affiliateApi\.post\('\/api\/affiliate\/payouts'/.test(dashboardPage) && /Request Mobile Money payout/.test(dashboardPage)],
  ['seller signup exposes an optional referral code', /Referral code \(optional\)/.test(read('../src/pages/AuthScreen.jsx')) && /referralCode:\s*new URLSearchParams/.test(read('../src/pages/AuthScreen.jsx'))],
  ['seller registration validates and associates referral codes in the store transaction', /req\.body\?\.referralCode/.test(billingRoutes) && /INSERT INTO referrals \(affiliate_id, referred_store_id, status\)/.test(billingRoutes)],
  ['new affiliate codes are short, easy to read, and legacy codes remain valid', /length: 8/.test(affiliateModel) && /ABCDEFGHJKLMNPQRSTUVWXYZ23456789/.test(affiliateModel) && /isValidReferralCode/.test(routes) && /affiliate_referral_code_aliases/.test(affiliateModel) && /affiliate_referral_code_aliases/.test(codeMigration)],
  ['affiliate code migration preserves existing referral links', /INSERT INTO affiliate_referral_code_aliases/.test(codeMigration) && /ALTER COLUMN referral_code TYPE TEXT/.test(codeMigration) && /SET referral_code = short_code/.test(codeMigration)],
  ['payout reservations are serialized and account for existing requests', /FROM affiliates[\s\S]{0,80}FOR UPDATE/.test(routes) && /status IN \('pending', 'paid'\)/.test(routes)],
  ['affiliate migration runner includes the payout verification migration', /003_affiliate_payout_account_verification\.sql/.test(read('../scripts/applyAffiliateMigration.js'))],
  ['affiliate API is mounted while obsolete server-rendered routes are not', /app\.use\('\/api\/affiliate', affiliateApiRoutes\)/.test(server) && !/app\.use\('\/affiliate', affiliateRoutes\)/.test(server)],
];

let failures = 0;
for (const [label, passed] of checks) {
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${label}`);
  if (!passed) failures += 1;
}
console.log(`\n===== RESULT: ${checks.length - failures} passed, ${failures} failed =====\n`);
process.exit(failures === 0 ? 0 : 1);
