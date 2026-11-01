import assert from 'node:assert/strict';
import {
  affiliateNotificationTemplate,
} from '../services/emailTemplates.js';
import {
  dispatchAffiliateNotification,
} from '../services/affiliateNotifications.js';

process.env.CLIENT_URL = 'https://didwaghana.com';

const affiliate = {
  id: 'affiliate-test-id',
  full_name: 'Ama Mensah',
  email: 'ama@example.com',
  phone: '0244123456',
  referral_code: 'AMA12345',
};
const events = [
  'welcome',
  'payout-account-updated',
  'referral',
  'commission',
  'payout-requested',
  'payout-paid',
  'payout-rejected',
];

for (const event of events) {
  const mail = affiliateNotificationTemplate(affiliate, event, {
    amountGhs: 125.5,
    storeName: 'Ama Shop',
    note: 'Please update details.',
  });
  assert.ok(mail.subject.length > 4, `${event} includes a subject`);
  assert.ok(mail.text.includes('Affiliate dashboard:'), `${event} includes a plain-text dashboard link`);
  assert.match(mail.html, /<!DOCTYPE html>/, `${event} uses the shared email shell`);
  assert.match(mail.html, /<h1\b/, `${event} has an email heading`);
  assert.ok(mail.html.includes('ama@example.com') === false, `${event} does not expose the affiliate email in the body`);
}

const hostileMail = affiliateNotificationTemplate(affiliate, 'referral', {
  storeName: '<script>alert(1)</script>',
});
assert.ok(!hostileMail.html.includes('<script>'), 'HTML dynamic content is escaped');
assert.ok(hostileMail.html.includes('&lt;script&gt;'), 'escaped dynamic content remains readable');
const hostileDetailsMail = affiliateNotificationTemplate({
  ...affiliate,
  full_name: '<img src=x onerror=alert(1)>',
}, 'payout-rejected', {
  amountGhs: 25,
  note: '<script>alert(1)</script>',
});
assert.ok(!hostileDetailsMail.html.includes('<script>'), 'payout notes are escaped in HTML');
assert.ok(!hostileDetailsMail.html.includes('<img src=x'), 'affiliate names are escaped in HTML');
const readableTextMail = affiliateNotificationTemplate({
  ...affiliate,
  full_name: 'Ama & Kofi',
}, 'referral', { storeName: 'Shop & Co.' });
assert.ok(readableTextMail.text.includes('Hello Ama,'), 'plain-text greeting uses the affiliate first name');
assert.ok(readableTextMail.text.includes('Shop & Co. has joined'), 'plain text referral details are readable');

const calls = [];
const success = await dispatchAffiliateNotification(affiliate, 'payout-requested', { amountGhs: 25 }, {
  sendEmail: async (message) => {
    calls.push(['email', message.to, message.subject]);
    return { sent: true };
  },
  sendSms: async (recipients, message) => {
    calls.push(['sms', recipients[0], message]);
    return { ok: true };
  },
});
assert.equal(success.email.sent, true, 'email dispatch succeeds');
assert.equal(success.sms.sent, true, 'SMS dispatch succeeds independently');
assert.deepEqual(calls.map(([channel]) => channel).sort(), ['email', 'sms']);
assert.ok(calls.some(([channel, recipient]) => channel === 'sms' && recipient === '233244123456'),
  'Ghanaian mobile numbers are normalized before SMS dispatch');

const independent = await dispatchAffiliateNotification(affiliate, 'commission', { amountGhs: 2 }, {
  sendEmail: async () => { throw new Error('mail gateway unavailable'); },
  sendSms: async () => ({ ok: true }),
});
assert.equal(independent.email.sent, false, 'email errors are contained');
assert.equal(independent.sms.sent, true, 'SMS still sends when email fails');

const noContacts = await dispatchAffiliateNotification({
  id: 'affiliate-no-contact',
  full_name: 'No Contact',
  email: '',
  phone: 'not-a-phone',
}, 'welcome', {}, {
  sendEmail: async () => { throw new Error('must not send'); },
  sendSms: async () => { throw new Error('must not send'); },
});
assert.equal(noContacts.email.reason, 'no-recipient', 'missing email is reported');
assert.equal(noContacts.sms.reason, 'no-valid-recipient', 'invalid phone is reported');

console.log('\nAffiliate notification template and delivery checks passed');
