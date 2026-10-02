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
 * nodemailer is imported lazily and dynamically. It is listed in package.json,
 * but importing it at module scope would make the whole server fail to boot in
 * any environment where `npm install` has not yet run, rather than degrading to
 * dry-run the way the rest of this service is designed to.
 */
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

/** Plain-text escape for values interpolated into an HTML body. */
const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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

  const text = [
    label,
    '',
    `From:    ${msg.name}`,
    `Email:   ${msg.email}`,
    msg.phone ? `Phone:   ${msg.phone}` : null,
    msg.topic ? `Topic:   ${msg.topic}` : null,
    '',
    msg.message,
    '',
    '-- ',
    'Reply directly to this email to answer the sender.',
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5;color:#0f172a">
      <p><strong>${esc(label)}</strong></p>
      <table cellpadding="4" style="border-collapse:collapse;font-size:14px">
        <tr><td style="color:#64748b">From</td><td>${esc(msg.name)}</td></tr>
        <tr><td style="color:#64748b">Email</td><td><a href="mailto:${esc(msg.email)}">${esc(msg.email)}</a></td></tr>
        ${msg.phone ? `<tr><td style="color:#64748b">Phone</td><td>${esc(msg.phone)}</td></tr>` : ''}
        ${msg.topic ? `<tr><td style="color:#64748b">Topic</td><td>${esc(msg.topic)}</td></tr>` : ''}
      </table>
      <p style="white-space:pre-wrap;border-left:3px solid #e2e8f0;padding-left:12px;margin:16px 0">${esc(msg.message)}</p>
      <p style="color:#64748b;font-size:12px">Reply directly to this email to answer the sender.</p>
    </div>`;

  return sendEmail({
    to: recipient,
    replyTo: msg.email,
    subject: `[DiDwa] ${label}`,
    text,
    html,
  });
}