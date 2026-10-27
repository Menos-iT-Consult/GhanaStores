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

const checks = [
  ['affiliate subdomain is reserved from tenant lookup', /RESERVED_SUBDOMAINS/.test(middleware) && /new Set\(\[[^\]]*'affiliate'[^\]]*\]\)/.test(slugRules)],
  ['affiliate root renders program info', /if \(isAffiliateHost\) \{[\s\S]{0,500}AffiliateProgramPage/.test(app)],
  ['affiliate host detection has a platform apex fallback', /hostState\.platformDomain \|\| platformHost \|\| 'didwaghana\.com'/.test(app)],
  ['affiliate program CTAs lead to live signup and login routes', /AFFILIATE_SIGNUP_URL = `\$\{AFFILIATE_PLATFORM_URL\}\/affiliate\/signup`/.test(programPage) && /AFFILIATE_LOGIN_URL = `\$\{AFFILIATE_PLATFORM_URL\}\/affiliate\/login`/.test(programPage) && /href=\{AFFILIATE_SIGNUP_URL\}/.test(programPage) && /href=\{AFFILIATE_LOGIN_URL\}/.test(programPage)],
  ['affiliate login and signup are registered public routes', ['/affiliate/login', '/affiliate/signup'].every((route) => uiRoutes.includes(`'${route}'`))],
  ['affiliate dashboard is registered as a public route', uiRoutes.includes("'/affiliate/dashboard'")],
  ['affiliate signup endpoint creates a separate affiliate account', /router\.post\('\/signup'/.test(routes) && /create\(\{[\s\S]{0,200}passwordHash/.test(routes)],
  ['affiliate signup hashes passwords', /bcrypt\.hash\(password, 12\)/.test(routes)],
  ['affiliate login issues a dedicated affiliate token', /issueAffiliateToken\(affiliate\)/.test(routes)],
  ['affiliate protected APIs require the affiliate role', /req\.auth\?\.role !== 'AFFILIATE'/.test(routes)],
  ['referral links set a protected cookie using configured attribution duration', /router\.get\('\/attribution'/.test(routes) && /httpOnly: true/.test(routes) && /settings\.attributionDays/.test(routes)],
  ['merchant registration attributes the store to the referred affiliate', /findByReferralCode\(decodeURIComponent\(referralCookie\)\)/.test(billingRoutes) && /linkStoreToAffiliate\(store\.id, affiliate\.id\)/.test(billingRoutes)],
  ['frontend provides separate affiliate access and dashboard screens', /\/api\/affiliate\/signup/.test(accessPage) && /\/api\/affiliate\/stats/.test(dashboardPage)],
  ['affiliate API is mounted while obsolete server-rendered routes are not', /app\.use\('\/api\/affiliate', affiliateApiRoutes\)/.test(server) && !/app\.use\('\/affiliate', affiliateRoutes\)/.test(server)],
];

let failures = 0;
for (const [label, passed] of checks) {
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${label}`);
  if (!passed) failures += 1;
}
console.log(`\n===== RESULT: ${checks.length - failures} passed, ${failures} failed =====\n`);
process.exit(failures === 0 ? 0 : 1);
