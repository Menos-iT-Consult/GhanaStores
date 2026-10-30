/**
 * DiDwa - Super admin newsletter routes.
 *
 * Separate endpoints for email newsletters and bulk SMS so each channel
 * has its own validation, sending logic, and audit trail.
 *
 * Channels:
 *   - Email: uses services/emailService.js (Gmail SMTP, dry-run when unconfigured)
 *   - SMS:   uses services/smsService.js (mNotify, metered against store quota)
 *
 * Every write is recorded in the admin audit log.
 */
import { Router } from 'express';
import { query } from '../../config/database.js';
import { requireAdmin } from './helpers.js';
import { recordAdminAction } from '../../services/adminAudit.js';
import { sendEmail } from '../../services/emailService.js';
import { sendSms, estimateSegments } from '../../services/smsService.js';
import { consumeSegments } from '../../services/smsQuota.js';
import { uuidParam } from './helpers.js';
import { personalizeNewsletterContent } from '../../services/newsletterContent.js';

const router = Router();

/* ------------------------------------------------------------------ */
/*  Shared recipient resolution                                       */
/* ------------------------------------------------------------------ */

/**
 * Resolve customers from the customers table based on recipientType.
 * @returns {Promise<Array<{id, name, email, phone}>>}
 */
async function resolveCustomers({ recipientType = 'all', customerIds = [], storeId } = {}) {
  const selectedStoreId = uuidParam(storeId);
  if (!selectedStoreId) return [];
  const params = [selectedStoreId];
  const filters = [`c.store_id = $1`];

  if (recipientType === 'selected') {
    if (!Array.isArray(customerIds)) return [];
    const validIds = customerIds.filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    );
    if (!validIds.length) return [];
    params.push(validIds);
    filters.push(`c.id = ANY($${params.length}::uuid[])`);
  }

  const { rows } = await query(
    `SELECT c.id, c.name, c.email, c.phone, s.name AS store_name
       FROM customers c
       JOIN stores s ON s.id = c.store_id
      WHERE ${filters.join(' AND ')}
       ORDER BY c.name`,
    params,
  );
  return rows;
}

/* ------------------------------------------------------------------ */
/*  Send Email Newsletter                                             */
/* ------------------------------------------------------------------ */

/**
 * POST /api/admin/newsletter/send-email
 * Body: { subject, message, recipientType: 'all' | 'selected', customerIds?: string[] }
 */
router.post('/newsletter/send-email', requireAdmin, async (req, res, next) => {
  try {
    const { subject, message, recipientType = 'all', customerIds = [], storeId } = req.body || {};
    if (!uuidParam(storeId)) {
      return res.status(400).json({ error: 'Select a valid merchant before sending a newsletter.' });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Subject is required for email newsletters.' });
    }
    if (subject.length > 200 || /[\r\n]/.test(subject)) {
      return res.status(400).json({ error: 'Email subject must be 200 characters or fewer and cannot contain line breaks.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    if (message.length > 10_000) {
      return res.status(400).json({ error: 'Email message must be 10,000 characters or fewer.' });
    }
    if (!['all', 'selected'].includes(recipientType)) {
      return res.status(400).json({ error: 'Recipient type must be all or selected.' });
    }

    const rows = await resolveCustomers({ recipientType, customerIds, storeId });
    if (!rows.length) {
      return res.json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No customers found to send to.',
      });
    }

    const emailCustomers = rows.filter((customer) => customer.email);

    let emailSent = 0;
    let emailFailed = 0;

    for (const customer of emailCustomers) {
      const result = await sendEmail({
        to: customer.email,
        subject: personalizeNewsletterContent(subject.trim(), customer),
        text: personalizeNewsletterContent(message.trim(), customer),
      });
      if (result.sent) emailSent++;
      else emailFailed++;
    }

    await recordAdminAction(req, {
      action: 'newsletter.send_email',
      targetType: 'newsletter',
      targetId: null,
      detail: {
        recipientType,
        customerCount: rows.length,
        emailCount: emailCustomers.length,
        emailSent,
        emailFailed,
        subject: subject.trim().substring(0, 100),
      },
    });

    res.json({
      success: true,
      sent: emailSent,
      failed: emailFailed,
      message: `Sent ${emailSent} email newsletter${emailSent === 1 ? '' : 's'}.`,
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  Send SMS Newsletter                                               */
/* ------------------------------------------------------------------ */

/**
 * POST /api/admin/newsletter/send-sms
 * Body: { message, recipientType: 'all' | 'selected', customerIds?: string[] }
 */
router.post('/newsletter/send-sms', requireAdmin, async (req, res, next) => {
  try {
    const { message, recipientType = 'all', customerIds = [], storeId } = req.body || {};
    if (!uuidParam(storeId)) {
      return res.status(400).json({ error: 'Select a valid merchant before sending a newsletter.' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required for SMS.' });
    }
    if (message.length > 2_000) {
      return res.status(400).json({ error: 'SMS message must be 2,000 characters or fewer.' });
    }
    if (!['all', 'selected'].includes(recipientType)) {
      return res.status(400).json({ error: 'Recipient type must be all or selected.' });
    }
    const rows = await resolveCustomers({ recipientType, customerIds, storeId });
    if (!rows.length) {
      return res.json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No customers found to send to.',
      });
    }

    const smsCustomers = rows.filter((customer) => customer.phone);

    let smsSent = 0;
    let smsFailed = 0;
    let segmentsCharged = 0;

    for (const customer of smsCustomers) {
      const personalizedMessage = personalizeNewsletterContent(message.trim(), customer);
      const segmentsPerMessage = estimateSegments(personalizedMessage);
      const quota = await consumeSegments('platform', segmentsPerMessage);
      if (!quota.ok) {
        smsFailed++;
        continue;
      }
      segmentsCharged += segmentsPerMessage;

      const result = await sendSms([customer.phone], personalizedMessage);
      if (result.ok) smsSent++;
      else smsFailed++;
    }

    await recordAdminAction(req, {
      action: 'newsletter.send_sms',
      targetType: 'newsletter',
      targetId: null,
      detail: {
        recipientType,
        customerCount: rows.length,
        phoneCount: smsCustomers.length,
        totalSegments: segmentsCharged,
        smsSent,
        smsFailed,
        message: message.trim().substring(0, 100),
      },
    });

    res.json({
      success: true,
      sent: smsSent,
      failed: smsFailed,
      segments: segmentsCharged,
      message: `Sent ${smsSent} SMS${smsSent === 1 ? '' : 's'}.`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;