/**
 * DiDwa - Gmail SMTP transactional email.
 *
 * Mirrors smsService.js deliberately: when credentials are absent the service
 * runs in DRY_RUN and logs the message instead of sending, so a missing key
 * degrades to "no email" rather than breaking the request that triggered it.
 * A contact form that refuses to submit because mail is unconfigured would be a
 * far worse outcome than a message that arrives and no notification.
 *
 * Gmail requires an APP PASSWORD (Google Account > Security > 2-Step
 * Verification > App passwords), not the account password, and 2FA must be on.
 *
 * nodemailer is imported lazily and dynamically. Importing it at module scope
 * would make the whole server fail to boot in any environment where
 * `npm install` has not yet run, rather than degrading to dry-run the way the
 * rest of this service is designed to. It WAS declared as a dependency and had
 * never actually been installed, so every send failed at the import and returned
 * `send-failed` - this service has never once delivered a message.
 */
import {
  welcomeTemplate,
  trialReminderTemplate,
  renewalReminderTemplate,
  pastDueTemplate,
  contactMessageTemplate,
  passwordResetTemplate,
} from './emailTemplates.js';

const SMTP_HOST = process.env.GMAIL_SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.GMAIL_SMTP_PORT || 465);
const SMTP_USER = String(process.env.GMAIL_USER || '').trim();
const SMTP_PASS = String(process.env.GMAIL_APP_PASSWORD || '').trim();
const FROM = String(process.env.GMAIL_FROM || SMTP_USER).trim();

export const isEmailConfigured = Boolean(SMTP_USER && SMTP_PASS && FROM);

/** Cached so the SMTP handshake happens once, not on every send. */
let transporterPromise = null;

async function transporter() {
  if (transporterPromise) return transporterPromise;
  transporterPromise = (async () => {
    const { default: nodemailer } = await import('nodemailer');
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      // 465 is implicit TLS; 587 is STARTTLS on a plain connect.
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  })();
  /* A rejected import must not poison the cache, or every later send would
     reuse the same failed promise forever. */
  transporterPromise.catch(() => { transporterPromise = null; });
  return transporterPromise;
}

/**
 * Send one email. Never throws: a notification failure must not fail the
 * action that produced it, and the message is already persisted by the caller.
 *
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
export async function sendEmail({ to, subject, text, html, replyTo }) {
  const list = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!list.length) return { sent: false, reason: 'no-recipient' };

  if (!isEmailConfigured) {
    console.log(`[email:DRY_RUN] to=${list.join(',')} from=${FROM} subject="${subject}"\n${text || ''}\n`);
    return { sent: false, reason: 'dry-run' };
  }

  try {
    const tx = await transporter();
    await tx.sendMail({
      from: FROM,
      to: list.join(', '),
      subject,
      text,
      html,
      /* Replying to the sender's address is what makes the notification useful:
         hitting Reply in the seller's inbox reaches the customer directly. */
      replyTo: replyTo || undefined,
    });
    return { sent: true };
  } catch (err) {
    console.error('[email] send failed:', err?.message || err);
    return { sent: false, reason: 'send-failed' };
  }
}

/**
 * Tell a seller (or the platform admin) that a contact form was submitted.
 *
 * @param {object} msg       the stored contact_messages row
 * @param {string|null} to   recipient address; null/blank falls back to ADMIN_EMAIL
 * @param {string} storeName seller's shop name, for context
 */
export async function notifyNewMessage(msg, to, storeName) {
  const recipient = String(to || process.env.ADMIN_EMAIL || '').trim();
  if (!recipient) return { sent: false, reason: 'no-recipient' };

  const label = msg.source === 'storefront'
    ? `New message for ${storeName || 'your store'}`
    : 'New contact form submission';

  const mail = contactMessageTemplate({ msg, storeName, label });

  return sendEmail({
    to: recipient,
    replyTo: msg.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}

/* ---------------------- Lifecycle email (mirrors SMS) ----------------------- */
/*
 * Same four billing events that SMS covers: welcome, trial reminder, renewal
 * reminder, past-due (covering suspension).
 *
 * Deliberately NOT mirrored: the low-stock alert. That fires on every POS sale
 * and storefront order that drops a variant below threshold, so emailing it
 * would bury the merchant. It is also the one SMS with a delivery latch
 * (low_stock_alert_sent) - see routes/inventoryRoutes.js dispatchLowStockAlerts -
 * and email must never touch that flag, or a Gmail outage would re-arm the
 * lifecycle on every sale and spray restock emails at the merchant.
 *
 * Lifecycle email is fire-and-forget. It has no retry, no latch and no coupling
 * to whether the SMS succeeded: the two channels are independent, and if one
 * gateway is down the other should still deliver.
 */

/**
 * Send the lifecycle email matching `template`.
 *
 * Template names deliberately mirror the smsService.js exports so a reader can
 * compare the two side by side: 'welcome' | 'trial-reminder' |
 * 'renewal-reminder' | 'past-due'.
 *
 * Never throws and returns the underlying sendEmail() result, so callers can
 * `await` without a try/catch and without risking the request that triggered it.
 */
export async function sendLifecycleEmail(store, template, extra = {}) {
  const to = String(store?.email || '').trim();
  if (!to) return { sent: false, reason: 'no-recipient' };

  let mail;
  switch (template) {
    case 'welcome':
      mail = welcomeTemplate(store);
      break;
    case 'trial-reminder':
      mail = trialReminderTemplate(store);
      break;
    case 'renewal-reminder':
      mail = renewalReminderTemplate(store);
      break;
    case 'past-due':
      mail = pastDueTemplate(store, { suspended: extra.suspended === true });
      break;
    default:
      return { sent: false, reason: `unknown-template:${template}` };
  }

  return sendEmail({
    to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}