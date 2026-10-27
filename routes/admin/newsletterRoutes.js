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
    `SELECT c.id, c.name, c.email, c.phone
       FROM customers c
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
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
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

    const emails = rows.filter((r) => r.email).map((r) => r.email);

    let emailSent = 0;
    let emailFailed = 0;

    for (const to of emails) {
      const result = await sendEmail({
        to,
        subject: subject.trim(),
        text: message.trim(),
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
        emailCount: emails.length,
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
    const rows = await resolveCustomers({ recipientType, customerIds, storeId });
    if (!rows.length) {
      return res.json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No customers found to send to.',
      });
    }

    const phones = rows.filter((r) => r.phone).map((r) => r.phone);

    let smsSent = 0;
    let smsFailed = 0;

    const segmentsPerMessage = estimateSegments(message.trim());

    for (const phone of phones) {
      const quota = await consumeSegments('platform', segmentsPerMessage);
      if (!quota.ok) {
        smsFailed++;
        continue;
      }

      const result = await sendSms([phone], message.trim());
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
        phoneCount: phones.length,
        segmentsPerMessage,
        totalSegments: segmentsPerMessage * phones.length,
        smsSent,
        smsFailed,
        message: message.trim().substring(0, 100),
      },
    });

    res.json({
      success: true,
      sent: smsSent,
      failed: smsFailed,
      segments: segmentsPerMessage * phones.length,
      message: `Sent ${smsSent} SMS${smsSent === 1 ? '' : 's'}.`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;