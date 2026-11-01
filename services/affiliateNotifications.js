import { query } from '../config/database.js';
import { normalizeGhPhone, formatGhs } from '../utils/helpers.js';
import { sendEmail } from './emailService.js';
import { sendSms } from './smsService.js';
import { affiliateNotificationTemplate } from './emailTemplates.js';

function affiliateSmsMessage(affiliate, event, details) {
  const firstName = String(affiliate?.full_name || 'there').trim().split(/\s+/)[0] || 'there';
  const amount = details.amountGhs == null ? '' : formatGhs(details.amountGhs);
  const dashboardUrl = `${(process.env.CLIENT_URL || 'https://didwaghana.com').replace(/\/+$/, '')}/affiliate/dashboard`;

  switch (event) {
    case 'welcome':
      return `Welcome to DiDwa Affiliates, ${firstName}! Your referral code is ${affiliate.referral_code}. Track activity: ${dashboardUrl}`;
    case 'payout-account-updated':
      return `DiDwa security alert: the verified payout account on your affiliate profile was updated. If this wasn't you, contact support.`;
    case 'referral':
      return `Hi ${firstName}, ${String(details.storeName || 'a new store')} joined DiDwa with your referral code. View activity: ${dashboardUrl}`;
    case 'commission':
      return `Hi ${firstName}, a commission of ${amount} was recorded and is pending payout eligibility. View details: ${dashboardUrl}`;
    case 'payout-requested':
      return `Hi ${firstName}, your ${amount} affiliate payout request was received and is pending review.`;
    case 'payout-paid':
      return `Hi ${firstName}, your ${amount} affiliate payout has been marked paid.`;
    case 'payout-rejected':
      return `Hi ${firstName}, your ${amount} affiliate payout was rejected.${details.note ? ` Note: ${String(details.note).slice(0, 120)}` : ''} Contact support if you need help.`;
    default:
      throw new Error(`Unknown affiliate notification event: ${event}`);
  }
}

function logFailure(event, affiliateId, channel, reason) {
  console.error('[affiliate-notifications] delivery failed', {
    event,
    affiliateId,
    channel,
    reason,
  });
}

export async function dispatchAffiliateNotification(
  affiliate,
  event,
  details = {},
  senders = {},
) {
  const affiliateId = affiliate?.id || null;
  const results = {};
  const emailSender = senders.sendEmail || sendEmail;
  const smsSender = senders.sendSms || sendSms;

  const emailTask = async () => {
    const to = String(affiliate?.email || '').trim();
    if (!to) {
      results.email = { sent: false, reason: 'no-recipient' };
      return;
    }
    try {
      const mail = affiliateNotificationTemplate(affiliate, event, details);
      results.email = await emailSender({
        to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      if (!results.email?.sent && results.email?.reason !== 'dry-run') {
        logFailure(event, affiliateId, 'email', results.email?.reason || 'send-failed');
      }
    } catch (err) {
      results.email = { sent: false, reason: 'send-failed' };
      logFailure(event, affiliateId, 'email', err?.code || 'exception');
    }
  };

  const smsTask = async () => {
    const phone = normalizeGhPhone(affiliate?.phone);
    if (!phone) {
      results.sms = { sent: false, reason: 'no-valid-recipient' };
      return;
    }
    try {
      const message = affiliateSmsMessage(affiliate, event, details);
      const result = await smsSender([phone], message);
      results.sms = { sent: Boolean(result?.ok), dryRun: Boolean(result?.dryRun), reason: result?.reason };
      if (!result?.ok) logFailure(event, affiliateId, 'sms', result?.reason || 'send-failed');
    } catch (err) {
      results.sms = { sent: false, reason: 'send-failed' };
      logFailure(event, affiliateId, 'sms', err?.code || 'exception');
    }
  };

  await Promise.all([emailTask(), smsTask()]);
  return results;
}

export async function notifyAffiliateById(affiliateId, event, details = {}) {
  try {
    const { rows } = await query(
      `SELECT id, full_name, email, phone, referral_code
         FROM affiliates
        WHERE id = $1 AND is_active = TRUE
        LIMIT 1`,
      [affiliateId],
    );
    if (!rows[0]) {
      logFailure(event, affiliateId, 'lookup', 'affiliate-not-found');
      return { lookup: { sent: false, reason: 'affiliate-not-found' } };
    }
    return await dispatchAffiliateNotification(rows[0], event, details);
  } catch (err) {
    logFailure(event, affiliateId, 'lookup', err?.code || 'lookup-failed');
    return { lookup: { sent: false, reason: 'lookup-failed' } };
  }
}

