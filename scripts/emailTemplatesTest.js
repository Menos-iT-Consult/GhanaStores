/**
 * Email templates - rendering, tone and safety.
 *
 * Logic-only (no SMTP, no database). Asserts every trigger produces a complete,
 * branded, email-client-safe message and that dynamic values are HTML-escaped.
 *
 * Run: npm run test:email-templates   (no database needed)
 */
import assert from 'node:assert';
import {
  welcomeTemplate,
  trialReminderTemplate,
  renewalReminderTemplate,
  pastDueTemplate,
  contactMessageTemplate,
  passwordResetTemplate,
} from '../services/emailTemplates.js';

// storefrontUrl() builds links from PLATFORM_DOMAIN; give the test a realistic apex.
process.env.PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || 'didwaghana.com';

let pass = 0;
let fail = 0;
function test(name, fn) {
  try {
    fn();
    pass += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    fail += 1;
    console.error(`  FAIL  ${name}\n        ${err.message}`);
  }
}

const store = {
  name: "Ama's Fashion <Hub>",           // includes an apostrophe and angle brackets
  email: 'ama@example.com',
  subdomain_slug: 'ama-fashion',
  custom_domain: null,
  trial_ends_at: '2026-10-28',
  plan_period_end: '2026-11-14',
  grace_ends_at: '2026-10-17',
  plan: 'growth',
};

/* --------------------------- Structure & shell ----------------------------- */

/** Every template must return a full branded document. */
function assertShell(mail, { tone } = {}) {
  assert.ok(mail.subject && mail.subject.length > 4, 'has a subject');
  assert.ok(mail.text && mail.text.length > 10, 'has a plain-text alternative');
  assert.ok(mail.html, 'has html');
  assert.match(mail.html, /<!DOCTYPE html>/, 'is a full document');
  assert.match(mail.html, /role="presentation"/, 'uses presentational tables');
  assert.ok(!/<style[\s>]/.test(mail.html), 'no <style> block (clients strip it)');
  assert.match(mail.html, /DiDwa/, 'carries the brand');
  assert.match(mail.html, /max-width:600px/, 'fixed 600px card width');
  assert.match(mail.html, /display:none/, 'has a hidden preheader');
  if (tone) {
    const accents = { info: '#2563eb', success: '#059669', warning: '#f59e0b', danger: '#dc2626' };
    assert.ok(mail.html.includes(accents[tone]), `uses the ${tone} accent colour`);
  }
}

test('welcome is branded, success-toned and links the storefront', () => {
  const mail = welcomeTemplate(store);
  assertShell(mail, { tone: 'success' });
  assert.ok(mail.html.includes('ama-fashion.didwaghana.com'), 'links the subdomain storefront');
  assert.ok(/trial/i.test(mail.text), 'mentions the trial');
});

test('trial reminder is warning-toned and renews', () => {
  const mail = trialReminderTemplate(store);
  assertShell(mail, { tone: 'warning' });
  assert.ok(/renew/i.test(mail.html.toLowerCase()), 'calls to renew');
});

test('renewal reminder is info-toned and shows the plan', () => {
  const mail = renewalReminderTemplate(store);
  assertShell(mail, { tone: 'info' });
  assert.ok(mail.html.includes('growth'), 'names the plan');
});

test('past-due has a warning tone and a stronger danger variant when suspended', () => {
  const due = pastDueTemplate(store, { suspended: false });
  assertShell(due, { tone: 'warning' });
  const suspended = pastDueTemplate(store, { suspended: true });
  assertShell(suspended, { tone: 'danger' });
  assert.ok(/suspended/i.test(suspended.subject), 'suspended subject reflects state');
});

test('contact message quotes the sender and sets replyTo', () => {
  const mail = contactMessageTemplate({
    msg: { name: 'Kofi', email: 'kofi@example.com', phone: '0244123456', topic: 'Order', message: 'Where is my order?' },
    storeName: "Ama's Fashion <Hub>",
    label: 'New message for your store',
  });
  assertShell(mail, { tone: 'info' });
  assert.strictEqual(mail.replyTo, 'kofi@example.com', 'replyTo is the sender');
  assert.ok(mail.html.includes('Where is my order?'), 'quotes the message body');
});

test('password reset links the token and states expiry', () => {
  const mail = passwordResetTemplate({ store, link: 'https://didwaghana.com/reset-password?token=abc123', minutes: 60 });
  assertShell(mail, { tone: 'info' });
  assert.ok(mail.html.includes('reset-password?token=abc123'), 'embeds the reset link');
  assert.ok(/60 minutes/.test(mail.text) || /60 minutes/.test(mail.html), 'states the expiry window');
});

/* ------------------------------- Escaping ---------------------------------- */

test('a store name with angle brackets is escaped, never injected', () => {
  const mail = welcomeTemplate(store);
  assert.ok(!mail.html.includes('<Hub>'), 'raw angle brackets must not survive into HTML');
  assert.ok(mail.html.includes('&lt;Hub&gt;'), 'angle brackets are escaped to entities');
});

test('a hostile contact message body is escaped in the quote block', () => {
  const mail = contactMessageTemplate({
    msg: { name: 'X', email: 'x@example.com', message: '<script>alert(1)</script>' },
    storeName: null,
    label: 'New contact form submission',
  });
  assert.ok(!mail.html.includes('<script>'), 'script tag must be neutralised');
  assert.ok(mail.html.includes('&lt;script&gt;'), 'script tag is escaped');
});

/* ------------------------------ Plain text -------------------------------- */

test('every template ships a non-empty plain-text body', () => {
  for (const mail of [
    welcomeTemplate(store),
    trialReminderTemplate(store),
    renewalReminderTemplate(store),
    pastDueTemplate(store, { suspended: false }),
    contactMessageTemplate({ msg: { name: 'K', email: 'k@e.com', message: 'hi' }, label: 'Msg' }),
    passwordResetTemplate({ store, link: 'https://x.test/r?token=t' }),
  ]) {
    assert.ok(mail.text && mail.text.trim().length > 10, 'text alternative present');
    // The text body must not carry the template's HTML markup. We check for the
    // concrete tags/artifacts the HTML body uses; angle brackets that are merely
    // part of a store name (e.g. "<Hub>") are fine in plain text, which is never
    // parsed as markup.
    assert.ok(!/<!DOCTYPE|<div|<\/div>|<a href|<table|<\/td>|<p style/i.test(mail.text),
      'plain text carries no HTML markup');
  }
});

console.log(`\n${pass}/${pass + fail} email-template assertions passed`);
process.exit(fail ? 1 : 0);

