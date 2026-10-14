/**
 * DiDwa - Transactional email templates.
 *
 * One beautiful, email-client-safe shell for every message DiDwa sends, so a
 * welcome, a billing warning and a password reset all look like they came from
 * the same product rather than six unrelated form letters.
 *
 * Why table-based, inline-styled HTML: Gmail, Outlook (Word engine) and most
 * mobile clients strip <style> blocks and ignore flexbox/grid. A layout built
 * from nested tables with inline CSS and a bulletproof CTA button renders
 * consistently everywhere, which a modern <div> layout does not.
 *
 * Each builder returns { subject, text, html }:
 *   - subject : the inbox line (human, actionable)
 *   - text    : the plain-text alternative (never empty - spam filters and
 *               text-only clients need it, and it doubles as the DRY_RUN log)
 *   - html    : the rendered template
 *
 * Every dynamic value is HTML-escaped; URLs are only ever ones we built here.
 */

const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/* --------------------------------- Brand ---------------------------------- */
const BRAND = {
  navy: '#0B1120',      // header backdrop
  blue: '#2563eb',      // primary accent / CTA
  ink: '#0f172a',       // body text
  muted: '#64748b',     // secondary text
  line: '#e2e8f0',      // borders
  page: '#eef2f7',      // page background behind the card
};

/** Tone drives the accent bar + CTA colour so the mood matches the message. */
const TONES = {
  info: { accent: BRAND.blue, cta: BRAND.blue },
  success: { accent: '#059669', cta: '#059669' },
  warning: { accent: '#f59e0b', cta: '#f59e0b' },
  danger: { accent: '#dc2626', cta: '#dc2626' },
};

/** Platform origin for links (never trust the incoming Host header). */
function platformUrl() {
  return (process.env.CLIENT_URL || 'https://didwaghana.com').replace(/\/+$/, '');
}

/** The seller's public storefront, custom domain preferred over subdomain. */
function storefrontUrl(store) {
  const platformDomain = (process.env.PLATFORM_DOMAIN || '')
    .replace(/^https?:\\?\/\//, '')
    .replace(/\/+$/, '');
  if (store?.custom_domain) {
    return `https://${String(store.custom_domain).replace(/^https?:\\?\/\//, '').replace(/\/+$/, '')}`;
  }
  if (store?.subdomain_slug && platformDomain) {
    return `https://${store.subdomain_slug}.${platformDomain}`;
  }
  return null;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

/* ------------------------------- Detail card ------------------------------- */
/** A soft key/value card used to show plan, dates, status, etc. */
function detailCard(rows) {
  const body = rows
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(
      ([k, v]) =>
        `<tr>
           <td style="padding:7px 0;color:${BRAND.muted};font-size:13px;width:42%">${esc(k)}</td>
           <td style="padding:7px 0;color:${BRAND.ink};font-size:14px;font-weight:600">${esc(v)}</td>
         </tr>`,
    )
    .join('');
  if (!body) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
            style="background:#f8fafc;border:1px solid ${BRAND.line};border-radius:10px;margin:20px 0">
            <tr><td style="padding:6px 16px">${body}</td></tr>
          </table>`;
}

/* ------------------------------ CTA button --------------------------------- */
/** Bulletproof button: a padded anchor inside a coloured cell - renders in Outlook. */
function ctaButton({ label, url, tone }) {
  if (!label || !url) return '';
  const t = TONES[tone] || TONES.info;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px 0 4px">
            <tr>
              <td align="center" bgcolor="${t.cta}" style="border-radius:8px">
                <a href="${esc(url)}"
                   style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;
                          color:#ffffff;text-decoration:none;border-radius:8px;background:${t.cta}">
                  ${esc(label)}
                </a>
              </td>
            </tr>
          </table>`;
}

/* --------------------------------- Shell ---------------------------------- */
/**
 * The full document every template is wrapped in.
 * @param {object} o
 *   preheader  - the short inbox preview line (hidden in the body)
 *   tone       - 'info' | 'success' | 'warning' | 'danger'
 *   eyebrow    - small coloured label above the heading (e.g. "Billing")
 *   heading    - the main message heading
 *   introHtml  - a line of body copy (trusted HTML we build ourselves)
 *   bodyHtml   - detail cards / extra copy
 *   cta        - { label, url }
 *   footerNote - extra reassurance line in the footer
 */
function shell({
  preheader = '',
  tone = 'info',
  eyebrow,
  heading,
  introHtml = '',
  bodyHtml = '',
  cta,
  footerNote,
}) {
  const t = TONES[tone] || TONES.info;
  const eyebrowHtml = eyebrow
    ? `<div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${t.accent};margin-bottom:6px">${esc(eyebrow)}</div>`
    : '';
  const ctaHtml = ctaButton({ ...cta, tone });
  const fallback = cta
    ? `<p style="margin:14px 0 0;color:${BRAND.muted};font-size:12px">
         Button not working? Paste this link into your browser:<br>
         <a href="${esc(cta.url)}" style="color:${BRAND.blue};word-break:break-all">${esc(cta.url)}</a>
       </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};-webkit-font-smoothing:antialiased">
  <div style="display:none;font-size:1px;color:${BRAND.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">
    ${esc(preheader)}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BRAND.page};padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:600px">

        <!-- Brand header -->
        <tr>
          <td style="background:${BRAND.navy};padding:26px 34px;border-radius:14px 14px 0 0">
            <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-.02em">
              DiDwa<span style="color:${t.accent}">.</span>
            </div>
            <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:12px;color:#94a3b8;margin-top:2px">
              Sell everywhere. Get paid instantly.
            </div>
          </td>
        </tr>
        <!-- Tone accent bar -->
        <tr><td style="background:${t.accent};height:4px;line-height:4px;font-size:0">&nbsp;</td></tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px 34px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
            ${eyebrowHtml}
            <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;font-weight:800;color:${BRAND.ink}">${esc(heading)}</h1>
            ${introHtml ? `<p style="margin:0 0 4px;font-size:15px;line-height:1.6;color:#334155">${introHtml}</p>` : ''}
            ${bodyHtml}
            ${ctaHtml}
            ${fallback}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#ffffff;padding:0 34px 30px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
            <div style="border-top:1px solid ${BRAND.line};padding-top:18px;color:${BRAND.muted};font-size:12px;line-height:1.6">
              ${footerNote ? `${esc(footerNote)}<br>` : ''}
              Reply to this email and it reaches a human on the DiDwa team.<br>
              <span style="color:#94a3b8">&copy; ${new Date().getFullYear()} DiDwa &middot; Built for Ghanaian merchants.</span>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ============================== Templates ================================= */

/**
 * Welcome - fired once, right after the store is created.
 * Warm, celebratory, and points the seller at their live storefront.
 */
export function welcomeTemplate(store) {
  const url = storefrontUrl(store);
  const heading = 'Your store is live';
  const text = [
    `Hi ${store.name || 'there'},`,
    '',
    'Your free trial is live and your storefront is ready.',
    `Trial ends: ${formatDate(store.trial_ends_at)}`,
    url ? `\nOpen your storefront: ${url}` : '',
    '',
    'Add products, connect a payment method, and share your link - you can start selling in minutes.',
  ].filter(Boolean).join('\n');

  const html = shell({
    preheader: 'Your 14-day free trial is live. Your storefront is ready.',
    tone: 'success',
    eyebrow: 'Welcome aboard',
    heading,
    introHtml: `Welcome to DiDwa, <strong>${esc(store.name || 'there')}</strong>. Your 14-day free trial is live and your storefront is already online - no card required.`,
    bodyHtml: detailCard([['Trial ends', formatDate(store.trial_ends_at)]])
      + `<p style="margin:0;font-size:14px;line-height:1.6;color:#334155">
           Add your first products, connect Mobile Money, and share your link.
           You can be selling in minutes.
         </p>`,
    cta: url ? { label: 'Open your storefront', url } : null,
    footerNote: 'Everything you add during the trial stays with you when you upgrade.',
  });

  return { subject: `${heading} - welcome to DiDwa`, text, html };
}

/**
 * Trial reminder - day 11, three days before the trial expires.
 * Nudges a paid plan so the storefront does not go down.
 */
export function trialReminderTemplate(store) {
  const url = storefrontUrl(store) || `${platformUrl()}/settings/plan`;
  const heading = 'Your free trial ends soon';
  const text = [
    `Hi ${store.name || 'there'},`,
    '',
    'Your free trial ends soon. Choose a plan to keep your storefront live.',
    `Trial ends: ${formatDate(store.trial_ends_at)}`,
    '',
    `Renew now: ${url}`,
  ].filter(Boolean).join('\n');

  const html = shell({
    preheader: 'Your free trial ends soon - pick a plan to stay live.',
    tone: 'warning',
    eyebrow: 'Billing',
    heading,
    introHtml: 'Your free trial is coming to an end. Choose a paid plan to keep your storefront live and your orders flowing.',
    bodyHtml: detailCard([['Trial ends', formatDate(store.trial_ends_at)]]),
    cta: { label: 'Renew now', url },
    footerNote: 'Billing is pay-upfront - one charge buys the period, nothing auto-renews.',
  });

  return { subject: `${heading} - keep your store live`, text, html };
}

/**
 * Renewal reminder - day -3 on a paid plan.
 * A gentle heads-up before the paid period lapses.
 */
export function renewalReminderTemplate(store) {
  const url = storefrontUrl(store) || `${platformUrl()}/settings/plan`;
  const heading = 'Your plan is up for renewal';
  const text = [
    `Hi ${store.name || 'there'},`,
    '',
    'Your plan is up for renewal soon.',
    `Plan: ${store.plan || 'current'}`,
    `Renews: ${formatDate(store.plan_period_end)}`,
    '',
    `Manage billing: ${url}`,
  ].filter(Boolean).join('\n');

  const html = shell({
    preheader: `Your ${store.plan || 'plan'} renews ${formatDate(store.plan_period_end)}.`,
    tone: 'info',
    eyebrow: 'Billing',
    heading,
    introHtml: 'A quick heads-up that your paid period is ending soon. Renew to keep selling without interruption.',
    bodyHtml: detailCard([
      ['Plan', store.plan || 'current'],
      ['Renews', formatDate(store.plan_period_end)],
    ]),
    cta: { label: 'Manage billing', url },
  });

  return { subject: `${heading} - ${store.plan || 'plan'}`, text, html };
}

/**
 * Past due (and suspension) - day 14 / day 17.
 * `extra.suspended === true` renders the stronger, red "suspended" variant.
 */
export function pastDueTemplate(store, { suspended = false } = {}) {
  const url = storefrontUrl(store) || `${platformUrl()}/settings/plan`;
  const heading = suspended
    ? 'Your storefront has been suspended'
    : 'Your account is past due';
  const text = suspended
    ? [
      `Hi ${store.name || 'there'},`,
      '',
      'Your storefront has been suspended because your subscription lapsed.',
      'Status: SUSPENDED',
      '',
      `Restore your store: ${url}`,
    ].filter(Boolean).join('\n')
    : [
      `Hi ${store.name || 'there'},`,
      '',
      'Your account is past due. Renew before the grace period ends to keep selling.',
      'Status: PAST DUE',
      `Grace ends: ${formatDate(store.grace_ends_at)}`,
      '',
      `Subscribe to restore: ${url}`,
    ].filter(Boolean).join('\n');

  const html = shell({
    preheader: suspended
      ? 'Your storefront is suspended. Renew to go back online.'
      : 'Your account is past due - renew before the grace period ends.',
    tone: suspended ? 'danger' : 'warning',
    eyebrow: suspended ? 'Action needed' : 'Billing',
    heading,
    introHtml: suspended
      ? 'Your storefront is offline because the subscription lapsed. Renew now to bring it straight back.'
      : 'Your subscription is past due. Renew before the grace period ends so your storefront stays live.',
    bodyHtml: suspended
      ? detailCard([['Status', 'SUSPENDED']])
      : detailCard([['Status', 'PAST DUE'], ['Grace ends', formatDate(store.grace_ends_at)]]),
    cta: { label: suspended ? 'Restore my store' : 'Subscribe to restore', url },
  });

  return { subject: `${heading} - action needed`, text, html };
}

/**
 * Contact / storefront message - tells the seller (or platform admin) someone
 * reached them. `replyTo` is the sender so hitting Reply answers them directly.
 */
export function contactMessageTemplate({ msg, storeName, label }) {
  const heading = label;
  const fromName = msg.name || 'Someone';
  const text = [
    label,
    '',
    `From:  ${msg.name}`,
    `Email: ${msg.email}`,
    msg.phone ? `Phone: ${msg.phone}` : null,
    msg.topic ? `Topic: ${msg.topic}` : null,
    '',
    msg.message,
    '',
    'Reply directly to this email to answer the sender.',
  ].filter(Boolean).join('\n');

  // The sender's own message, quoted in a soft block so it reads as a quote, not
  // our copy. Escaped, with line breaks preserved.
  const quote = `<div style="margin:16px 0 0;padding:14px 16px;background:#f8fafc;border:1px solid ${BRAND.line};border-left:3px solid ${BRAND.blue};border-radius:8px;color:#334155;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(msg.message)}</div>`;

  const html = shell({
    preheader: `From ${msg.name}: ${String(msg.message || '').slice(0, 90)}`.trim(),
    tone: 'info',
    eyebrow: storeName ? 'Customer message' : 'Contact form',
    heading,
    introHtml: storeName
      ? `A customer sent a message to <strong>${esc(storeName)}</strong>.`
      : 'A new message came in through the DiDwa contact form.',
    bodyHtml: detailCard([
      ['From', fromName],
      ['Email', msg.email],
      msg.phone ? ['Phone', msg.phone] : null,
      msg.topic ? ['Topic', msg.topic] : null,
    ].filter(Boolean).map((r) => r)) + quote,
    footerNote: 'Hit Reply and your answer goes straight to the sender.',
  });

  return {
    subject: label,
    text,
    html,
    replyTo: msg.email,
  };
}

/**
 * Password reset - the emailed link for the forgot/reset flow. Neutral security
 * tone (blue), a clear button, and reassurance if the user did not ask.
 */
export function passwordResetTemplate({ store, link, minutes = 60 }) {
  const heading = 'Reset your password';
  const text = [
    `Hi ${store.name || 'there'},`,
    '',
    `Use the link below to choose a new password. It expires in ${minutes} minutes and can be used once.`,
    '',
    link,
    '',
    'If you did not request this, you can ignore this email - your password stays the same.',
  ].filter(Boolean).join('\n');

  const html = shell({
    preheader: 'Choose a new password for your DiDwa store.',
    tone: 'info',
    eyebrow: 'Account security',
    heading,
    introHtml: `We received a request to reset the password for <strong>${esc(store.email)}</strong>. Choose a new one with the button below.`,
    bodyHtml: detailCard([['Link expires in', `${minutes} minutes`], ['Can be used', 'Once']])
      + `<p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:${BRAND.muted}">
           If you did not request a password reset, you can safely ignore this email -
           your password will stay the same.
         </p>`,
    cta: { label: 'Reset password', url: link },
  });

  return {
    subject: 'Reset your DiDwa password',
    text,
    html,
  };
}



