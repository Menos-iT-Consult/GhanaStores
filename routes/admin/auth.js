/**
 * DiDwa - Super admin authentication and team management.
 *
 * Super admins are all-powerful (they can suspend merchants, settle payouts and
 * move balances), so this file is deliberately strict:
 *   - the actor is always taken from the verified token, never the request body
 *   - the last remaining administrator cannot be removed, which would otherwise
 *     lock the whole platform out of its own dashboard
 *   - every change is written to the audit ledger
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../../config/database.js';
import { issueAdminToken } from '../../middleware/authMiddleware.js';
import { recordAdminAction, redact } from '../../services/adminAudit.js';
import { requireAdmin, readListQuery, listResponse, paged } from './helpers.js';

const router = Router();

const publicAdmin = (row) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  createdAt: row.created_at,
  lastLoginAt: row.last_login_at,
  lastLoginIp: row.last_login_ip,
});

const MIN_PASSWORD = 10;

const passwordProblem = (password) => {
  if (typeof password !== 'string' || !password) return 'Password is required.';
  if (password.length < MIN_PASSWORD) return `Admin passwords must be at least ${MIN_PASSWORD} characters.`;
  return '';
};

/* ----------------------------------- Login --------------------------------- */
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { rows } = await query(
      'SELECT id, email, name, password_hash FROM platform_admins WHERE LOWER(email) = $1 LIMIT 1',
      [email],
    );
    const admin = rows[0];
    // Same generic message for unknown email and bad password (no enumeration).
    if (!admin) return res.status(401).json({ error: 'Invalid email or password.' });

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

    // Stamp the session for the Team page's "who is active" view.
    await query(
      'UPDATE platform_admins SET last_login_at = NOW(), last_login_ip = $2 WHERE id = $1',
      [admin.id, req.ip || null],
    );
    // A signed-in operator is a privileged event, so it is logged too.
    await recordAdminAction(
      { auth: { sub: admin.id, email: admin.email, name: admin.name }, ip: req.ip },
      { action: 'admin.login', targetType: 'platform_admin', targetId: admin.id },
    );

    res.json({ token: issueAdminToken(admin), admin: publicAdmin({ ...admin, last_login_at: new Date() }) });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------ Me ----------------------------------- */
router.get('/me', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, email, name, created_at, last_login_at, last_login_ip FROM platform_admins WHERE id = $1 LIMIT 1',
      [req.auth.sub],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Administrator not found.' });
    res.json({ admin: publicAdmin(rows[0]) });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------- Team ---------------------------------- */
router.get('/team', requireAdmin, async (req, res, next) => {
  try {
    const plan = readListQuery(req, {
      defaultLimit: 25,
      sorts: { created: 'created_at', name: 'name', lastLogin: 'last_login_at' },
    });
    const filters = [];
    const params = [];
    if (plan.search) {
      params.push(plan.search);
      filters.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await paged({
      countSql: `SELECT COUNT(*)::int AS total FROM platform_admins ${where}`,
      rowsSql: `SELECT id, email, name, created_at, last_login_at, last_login_ip
                  FROM platform_admins ${where}
                 ORDER BY ${plan.orderBy} NULLS LAST
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      params,
      page: plan.page,
      limit: plan.limit,
      offset: plan.offset,
    });
    listResponse(res, { ...result, rows: result.rows.map(publicAdmin) }, 'admins');
  } catch (err) {
    next(err);
  }
});

/** Create an administrator (or reset an existing one's password). */
router.post('/team', requireAdmin, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const name = req.body?.name ? String(req.body.name).trim() : null;
    const problem = passwordProblem(req.body?.password);
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid administrator email is required.' });
    }
    if (problem) return res.status(400).json({ error: problem });

    const hash = await bcrypt.hash(String(req.body.password), 12);
    const { rows } = await query(
      `INSERT INTO platform_admins (email, password_hash, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash,
                                         name = COALESCE(EXCLUDED.name, platform_admins.name)
       RETURNING id, email, name, created_at, last_login_at, last_login_ip`,
      [email, hash, name],
    );
    const admin = rows[0];

    // A silent password reset on an existing account would otherwise leave no
    // trace at all, so this is always recorded.
    await recordAdminAction(req, {
      action: 'admin.team.create',
      targetType: 'platform_admin',
      targetId: admin.id,
      detail: { email: admin.email, name: admin.name },
    });
    res.status(201).json({ admin: publicAdmin(admin) });
  } catch (err) {
    next(err);
  }
});

/** Legacy alias: the pre-split client POSTed to /admins. */
router.post('/admins', (req, res, next) => {
  req.url = '/team';
  router.handle(req, res, next);
});

/** Update an administrator's name and/or password. */
router.patch('/team/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rows: found } = await query(
      'SELECT id, email, name, created_at, last_login_at, last_login_ip FROM platform_admins WHERE id = $1 LIMIT 1',
      [req.params.id],
    );
    const admin = found[0];
    if (!admin) return res.status(404).json({ error: 'Administrator not found.' });

    const updates = [];
    const params = [];
    const detail = {};

    if (req.body?.name !== undefined) {
      const name = String(req.body.name || '').trim() || null;
      params.push(name);
      updates.push(`name = $${params.length}`);
      detail.name = { from: admin.name, to: name };
    }
    if (req.body?.password) {
      const problem = passwordProblem(req.body.password);
      if (problem) return res.status(400).json({ error: problem });
      params.push(await bcrypt.hash(String(req.body.password), 12));
      updates.push(`password_hash = $${params.length}`);
      detail.passwordReset = true;
    }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update.' });

    params.push(admin.id);
    const { rows } = await query(
      `UPDATE platform_admins SET ${updates.join(', ')} WHERE id = $${params.length}
       RETURNING id, email, name, created_at, last_login_at, last_login_ip`,
      params,
    );

    await recordAdminAction(req, {
      action: detail.passwordReset ? 'admin.team.password_reset' : 'admin.team.update',
      targetType: 'platform_admin',
      targetId: admin.id,
      detail: { ...redact(detail), email: admin.email },
    });
    res.json({ admin: publicAdmin(rows[0]) });
  } catch (err) {
    next(err);
  }
});

/** Revoke an administrator. Refuses to remove the last one, or yourself. */
router.delete('/team/:id', requireAdmin, async (req, res, next) => {
  try {
    const targetId = String(req.params.id || '');
    if (targetId === req.auth.sub) {
      return res.status(409).json({ error: 'You cannot revoke your own access while signed in.' });
    }
    const removed = await withTransaction(async (t) => {
      const { rows } = await t.query(
        'SELECT id, email, name FROM platform_admins WHERE id = $1 FOR UPDATE',
        [targetId],
      );
      if (!rows[0]) return null;
      const { rows: remaining } = await t.query('SELECT COUNT(*)::int AS n FROM platform_admins');
      if (Number(remaining[0]?.n || 0) <= 1) return 'last';
      await t.query('DELETE FROM platform_admins WHERE id = $1', [targetId]);
      return rows[0];
    });

    if (removed === 'last') {
      return res.status(409).json({ error: 'This is the last administrator - promote someone else first.' });
    }
    if (!removed) return res.status(404).json({ error: 'Administrator not found.' });

    await recordAdminAction(req, {
      action: 'admin.team.revoke',
      targetType: 'platform_admin',
      targetId,
      detail: { email: removed.email, name: removed.name },
    });
    res.json({ revoked: publicAdmin(removed) });
  } catch (err) {
    next(err);
  }
});

export default router;
