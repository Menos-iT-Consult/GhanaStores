import { query } from '../config/database.js';

export const PLATFORM_PUBLIC_SETTING_DEFINITIONS = {
  supportEmail: ['platform_contact_support_email', 'Platform support email'],
  supportPhone: ['platform_contact_support_phone', 'Platform support phone'],
  whatsappNumber: ['platform_contact_whatsapp_number', 'Platform WhatsApp number'],
  businessAddress: ['platform_contact_business_address', 'Platform business address'],
  facebook: ['platform_social_facebook_url', 'Facebook profile URL'],
  instagram: ['platform_social_instagram_url', 'Instagram profile URL'],
  tiktok: ['platform_social_tiktok_url', 'TikTok profile URL'],
  youtube: ['platform_social_youtube_url', 'YouTube profile URL'],
  x: ['platform_social_x_url', 'X profile URL'],
  linkedin: ['platform_social_linkedin_url', 'LinkedIn profile URL'],
  whatsappFloatingEnabled: ['platform_whatsapp_floating_enabled', 'Show floating WhatsApp button on public marketing pages'],
  sellerWhatsappGroupUrl: ['platform_seller_whatsapp_group_url', 'Seller WhatsApp group invite URL'],
  affiliateWhatsappGroupUrl: ['platform_affiliate_whatsapp_group_url', 'Affiliate WhatsApp group invite URL'],
};

const DEFAULTS = {
  supportEmail: 'hello@didwaghana.com',
  supportPhone: '+233 20 123 4567',
  whatsappNumber: '+233 20 123 4567',
  businessAddress: 'Accra, Ghana',
  facebook: '',
  instagram: '',
  tiktok: '',
  youtube: '',
  x: '',
  linkedin: '',
  whatsappFloatingEnabled: true,
  sellerWhatsappGroupUrl: '',
  affiliateWhatsappGroupUrl: '',
};

const SOCIAL_KEYS = ['facebook', 'instagram', 'tiktok', 'youtube', 'x', 'linkedin'];
const CONTACT_KEYS = ['supportEmail', 'supportPhone', 'whatsappNumber', 'businessAddress'];

export function normalizePlatformPublicSettings(value) {
  const contact = value?.contact || {};
  const socialLinks = value?.socialLinks || {};
  const whatsapp = value?.whatsapp || {};
  const result = {
    contact: Object.fromEntries(CONTACT_KEYS.map((key) => [key, String(contact[key] ?? '').trim()])),
    socialLinks: Object.fromEntries(SOCIAL_KEYS.map((key) => [key, String(socialLinks[key] ?? '').trim()])),
    whatsapp: {
      floatingEnabled: whatsapp.floatingEnabled,
      sellerGroupUrl: String(whatsapp.sellerGroupUrl ?? '').trim(),
      affiliateGroupUrl: String(whatsapp.affiliateGroupUrl ?? '').trim(),
    },
  };
  return result;
}

function isHttpsUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function isPhone(value) {
  const digits = value.replace(/\D/g, '');
  return !value || (/^[+()\d .-]{7,32}$/.test(value) && digits.length >= 7);
}

function isWhatsAppGroupUrl(value) {
  if (!value) return true;
  if (value.length > 500) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.toLowerCase() === 'chat.whatsapp.com'
      && url.pathname.length > 1;
  } catch {
    return false;
  }
}

export function validatePlatformPublicSettings(value) {
  const settings = normalizePlatformPublicSettings(value);
  const { contact, socialLinks, whatsapp } = settings;

  if (contact.supportEmail && (
    contact.supportEmail.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.supportEmail)
  )) return { error: 'Enter a valid support email address.' };
  if (!isPhone(contact.supportPhone)) return { error: 'Enter a valid platform support phone number.' };
  if (!isPhone(contact.whatsappNumber)) return { error: 'Enter a valid platform WhatsApp number.' };
  if (contact.businessAddress.length > 300) return { error: 'Business address must be 300 characters or fewer.' };

  for (const [network, url] of Object.entries(socialLinks)) {
    if (url.length > 500 || !isHttpsUrl(url)) {
      return { error: `Enter a valid HTTPS URL for ${network}.` };
    }
  }
  if (typeof whatsapp.floatingEnabled !== 'boolean') {
    return { error: 'Choose whether to show the floating WhatsApp button.' };
  }
  if (!isWhatsAppGroupUrl(whatsapp.sellerGroupUrl)) {
    return { error: 'Seller group link must be a WhatsApp group invite URL.' };
  }
  if (!isWhatsAppGroupUrl(whatsapp.affiliateGroupUrl)) {
    return { error: 'Affiliate group link must be a WhatsApp group invite URL.' };
  }
  return { settings };
}

export async function getPlatformPublicSettings(runQuery = query) {
  const { rows } = await runQuery(
    `SELECT setting_key, setting_value
       FROM system_settings
      WHERE setting_key LIKE 'platform_contact_%'
         OR setting_key LIKE 'platform_social_%'
         OR setting_key LIKE 'platform_whatsapp_%'`,
  );
  const values = new Map(rows.map(({ setting_key, setting_value }) => [setting_key, setting_value]));
  const read = (key) => {
    const [settingKey] = PLATFORM_PUBLIC_SETTING_DEFINITIONS[key];
    return values.has(settingKey) ? values.get(settingKey) : DEFAULTS[key];
  };
  return {
    contact: {
      supportEmail: String(read('supportEmail')),
      supportPhone: String(read('supportPhone')),
      whatsappNumber: String(read('whatsappNumber')),
      businessAddress: String(read('businessAddress')),
    },
    socialLinks: Object.fromEntries(SOCIAL_KEYS.map((key) => [key, String(read(key))])),
    whatsapp: {
      floatingEnabled: String(read('whatsappFloatingEnabled')) === 'true',
      sellerGroupUrl: String(read('sellerWhatsappGroupUrl')),
      affiliateGroupUrl: String(read('affiliateWhatsappGroupUrl')),
    },
  };
}

export function platformPublicSettingsValues(settings) {
  const values = {
    supportEmail: settings.contact.supportEmail,
    supportPhone: settings.contact.supportPhone,
    whatsappNumber: settings.contact.whatsappNumber,
    businessAddress: settings.contact.businessAddress,
    ...settings.socialLinks,
    whatsappFloatingEnabled: String(settings.whatsapp.floatingEnabled),
    sellerWhatsappGroupUrl: settings.whatsapp.sellerGroupUrl,
    affiliateWhatsappGroupUrl: settings.whatsapp.affiliateGroupUrl,
  };
  return Object.entries(PLATFORM_PUBLIC_SETTING_DEFINITIONS).map(([name, [key, description]]) => ({
    key,
    description,
    value: String(values[name]),
  }));
}
