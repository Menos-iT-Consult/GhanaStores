/**
 * DiDwa - Super admin newsletter routes.
 *
 * Provides endpoints for sending newsletters (email) and bulk SMS to customers.
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

const router = Router();

/* --------------------------- Write ---------------------------------- */

/**
 * POST /api/admin/newsletter/send
 * Send a newsletter (email) or bulk SMS to customers.
 *
 * Body:
 *   subject      string   Required for email newsletters
 *   message      string   Required - the message body / SMS text
 *   recipientType 'all' | 'selected'
 *   customerIds   string[] UUIDs when recipientType === 'selected'
 *
 * Response:
 *   { success, sent: { email: N, sms: M }, failed: { email: N, sms: M } }
 */
router.post('/send', requireAdmin, async (req, res, next) => {
  try {
    const { subject, message, recipientType = 'all', customerIds = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // ------------------------------------------------------------------
    // 1. Resolve recipient list from the customers table
    // ------------------------------------------------------------------
    const params = [];
    let where = '';

    if (recipientType === 'selected' && customerIds.length) {
      // Validate each id is a UUID before using it
      const validIds = customerIds.filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
      if (!validIds.length) {
        return res.status(400).json({ error: 'No valid customer ids provided.' });
      }
      validIds.forEach((id) => { params.push(id); });
      where = `WHERE c.id = ANY($${params.length})`;
    }

    const { rows } = await query(
      `SELECT c.id, c.name, c.email, c.phone, s.name AS store_name
         FROM customers c
         JOIN stores s ON s.id = c.store_id
         ${where}
         ORDER BY c.name`,
      params,
    );

    if (!rows.length) {
      return res.json({
        success: true,
        sent: { email: 0, sms: 0 },
        failed: { email: 0, sms: 0 },
        message: 'No customers found to send to.',
      });
    }

    const emails = rows.filter((r) => r.email).map((r) => r.email);
    const phones = rows.filter((r) => r.phone).map((r) => r.phone);

    // ------------------------------------------------------------------
    // 2. Send emails
    // ------------------------------------------------------------------
    let emailSent = 0;
    let emailFailed = 0;

    if (emails.length && subject && subject.trim()) {
      // Send emails one at a time; sendEmail() never throws.
      for (const to of emails) {
        const result = await sendEmail({
          to,
          subject: subject.trim(),
          text: message.trim(),
        });
        if (result.sent) emailSent++;
        else emailFailed++;
      }
    }

    // ------------------------------------------------------------------
    // 3. Send SMS (metered against platform quota)
    // ------------------------------------------------------------------
    let smsSent = 0;
    let smsFailed = 0;

    if (phones.length) {
      const needed = estimateSegments(message.trim());
      // Consume quota once per recipient - SMS is billed per segment per recipient
      // (mNotify bills per recipient per segment).
      for (const phone of phones) {
        const quota = await consumeSegments('platform', needed);
        if (!quota.ok) {
          smsFailed++;
          continue;
        }

        const result = await sendSms([phone], message.trim());
        if (result.ok) smsSent++;
        else smsFailed++;
      }
    }

    // ------------------------------------------------------------------
    // 4. Audit log
    // ------------------------------------------------------------------
    await recordAdminAction(req, {
      action: 'newsletter.send',
      targetType: 'newsletter',
      targetId: null,
      detail: {
        recipientType,
        customerCount: rows.length,
        emailSent,
        emailFailed,
        smsSent,
        smsFailed,
        subject: subject?.substring(0, 100) || null,
      },
    });

    res.json({
      success: true,
      sent: { email: emailSent, sms: smsSent },
      failed: { email: emailFailed, sms: smsFailed },
      message: `Sent ${emailSent} email(s) and ${smsSent} SMS.`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;