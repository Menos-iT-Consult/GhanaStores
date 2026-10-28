import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getPlatformPublicSettings,
  platformPublicSettingsValues,
  validatePlatformPublicSettings,
} from '../services/platformPublicSettings.js';

const settings = {
  contact: {
    supportEmail: 'support@example.com',
    supportPhone: '+233 20 123 4567',
    whatsappNumber: '+233 20 123 4567',
    businessAddress: 'Accra, Ghana',
  },
  socialLinks: {
    facebook: 'https://facebook.com/didwa',
    instagram: 'https://instagram.com/didwa',
    tiktok: 'https://tiktok.com/@didwa',
    youtube: 'https://youtube.com/@didwa',
    x: 'https://x.com/didwa',
    linkedin: 'https://linkedin.com/company/didwa',
  },
  whatsapp: {
    floatingEnabled: true,
    sellerGroupUrl: 'https://chat.whatsapp.com/seller-invite',
    affiliateGroupUrl: 'https://chat.whatsapp.com/affiliate-invite',
  },
};

assert.equal(validatePlatformPublicSettings(settings).error, undefined);
assert.equal(platformPublicSettingsValues(settings).length, 13);
assert.equal(
  validatePlatformPublicSettings({
    ...settings,
    socialLinks: { ...settings.socialLinks, facebook: 'javascript:alert(1)' },
  }).error,
  'Enter a valid HTTPS URL for facebook.',
);
assert.equal(
  validatePlatformPublicSettings({
    ...settings,
    whatsapp: { ...settings.whatsapp, affiliateGroupUrl: 'https://example.com/group' },
  }).error,
  'Affiliate group link must be a WhatsApp group invite URL.',
);
assert.equal(
  validatePlatformPublicSettings({
    ...settings,
    contact: { ...settings.contact, supportEmail: 'not-an-email' },
  }).error,
  'Enter a valid support email address.',
);

const defaults = await getPlatformPublicSettings(async () => ({ rows: [] }));
assert.equal(defaults.contact.supportEmail, 'hello@didwaghana.com');
assert.equal(defaults.whatsapp.floatingEnabled, true);
assert.equal(defaults.whatsapp.sellerGroupUrl, '');

const persisted = await getPlatformPublicSettings(async () => ({
  rows: [
    { setting_key: 'platform_contact_support_email', setting_value: settings.contact.supportEmail },
    { setting_key: 'platform_social_facebook_url', setting_value: settings.socialLinks.facebook },
    { setting_key: 'platform_whatsapp_floating_enabled', setting_value: 'false' },
    { setting_key: 'platform_seller_whatsapp_group_url', setting_value: settings.whatsapp.sellerGroupUrl },
  ],
}));
assert.equal(persisted.contact.supportEmail, settings.contact.supportEmail);
assert.equal(persisted.socialLinks.facebook, settings.socialLinks.facebook);
assert.equal(persisted.whatsapp.floatingEnabled, false);
assert.equal(persisted.whatsapp.sellerGroupUrl, settings.whatsapp.sellerGroupUrl);

const [adminRoutes, publicRoutes, adminPage, marketingPage, affiliatePage, sellerPage, schema, spaRoutes, server] = await Promise.all([
  readFile(new URL('../routes/admin/platformSettings.js', import.meta.url), 'utf8'),
  readFile(new URL('../routes/publicPlatformSettingsRoutes.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/admin/AdminPlatformSettings.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/PublicPages.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/affiliate/AffiliateDashboardPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/SellerAnalytics.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'),
  readFile(new URL('../src/routes.js', import.meta.url), 'utf8'),
  readFile(new URL('../server.js', import.meta.url), 'utf8'),
]);

assert.match(adminRoutes, /router\.get\('\/platform-settings', requireAdmin/);
assert.match(adminRoutes, /router\.patch\('\/platform-settings', requireAdmin/);
assert.match(publicRoutes, /router\.get\('\/platform-settings\/public'/);
assert.match(server, /app\.use\('\/api', publicPlatformSettingsRoutes\)/);
assert.match(spaRoutes, /'\/admin\/platform-settings'/);
assert.match(adminPage, /\['facebook', 'Facebook'\]/);
assert.match(adminPage, /Affiliate WhatsApp group invite URL/);
assert.match(marketingPage, /Chat with DiDwa on WhatsApp/);
assert.match(marketingPage, /aria-label=\{label\}/);
assert.match(affiliatePage, /Join the affiliate WhatsApp group/);
assert.match(sellerPage, /Join the seller WhatsApp group/);
assert.match(schema, /platform_whatsapp_floating_enabled/);

console.log('Platform contact and social settings validation passed.');
