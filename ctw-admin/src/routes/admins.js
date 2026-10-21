// CTW staff accounts. A new admin, or one whose password is reset, gets a temporary password shown once
// to the admin who made it; it must be changed at the first sign-in. Admins cannot deactivate or reset
// themselves (their own account is under /api/auth), and the last active admin cannot be deactivated.
const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const { wrap, httpError } = require('../http');

const router = express.Router();

const LIST = `SELECT a.admin_id, a.login_id, a.full_name, a.email, a.active, a.mfa_enabled, a.must_change_password,
                     a.last_login_at, a.created_at, c.login_id AS created_by_login
                FROM ctw_admin_user a LEFT JOIN ctw_admin_user c ON c.admin_id = a.created_by`;

const temporaryPassword = () => crypto.randomBytes(12).toString('base64url');

async function audit(adminId, action, details) {
  await db.query('INSERT INTO ctw_audit_log (admin_id, action, details) VALUES ($1, $2, $3)', [adminId, action, details]);
}

async function other(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw httpError(404, 'Admin not found');
  if (id === req.admin.admin_id) throw httpError(400, 'Use “My account” for your own account');
  const { rows } = await db.query(`${LIST} WHERE a.admin_id = $1`, [id]);
  if (!rows.length) throw httpError(404, 'Admin not found');
  return rows[0];
}

router.get('/', wrap(async (_req, res) => {
  res.json((await db.query(`${LIST} ORDER BY a.active DESC, a.full_name`)).rows);
}));

router.post('/', wrap(async (req, res) => {
  const login = String(req.body.login_id || '').trim();
  const name = String(req.body.full_name || '').trim();
  const email = String(req.body.email || '').trim();
  if (!/^[A-Za-z0-9._-]{3,64}$/.test(login)) throw httpError(400, 'Login ID: 3–64 letters, digits, dot, _ or -');
  if (!name) throw httpError(400, 'Full name is required');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw httpError(400, 'Email is not valid');
  const password = temporaryPassword();
  const { rows } = await db.query(
    `INSERT INTO ctw_admin_user (login_id, full_name, email, password_hash, must_change_password, created_by)
     VALUES ($1, $2, $3, crypt($4, gen_salt('bf', 10)), true, $5) RETURNING admin_id`,
    [login, name, email, password, req.admin.admin_id],
  );
  await audit(req.admin.admin_id, 'admin.create', { admin_id: rows[0].admin_id, login_id: login });
  const created = (await db.query(`${LIST} WHERE a.admin_id = $1`, [rows[0].admin_id])).rows[0];
  res.status(201).json({ admin: created, temporary_password: password });
}));

router.post('/:id/deactivate', wrap(async (req, res) => {
  const target = await other(req);
  await db.tx(async (c) => {
    // Serialises concurrent deactivations so two admins cannot switch each other off.
    await c.query('LOCK TABLE ctw_admin_user IN SHARE ROW EXCLUSIVE MODE');
    const { rows } = await c.query('SELECT count(*)::int AS n FROM ctw_admin_user WHERE active AND admin_id <> $1', [target.admin_id]);
    if (!rows[0].n) throw httpError(409, 'The last active admin cannot be deactivated');
    await c.query('UPDATE ctw_admin_user SET active = false, session_version = session_version + 1 WHERE admin_id = $1', [target.admin_id]);
  });
  await audit(req.admin.admin_id, 'admin.deactivate', { admin_id: target.admin_id, login_id: target.login_id });
  res.json({ success: true });
}));

router.post('/:id/activate', wrap(async (req, res) => {
  const target = await other(req);
  await db.query('UPDATE ctw_admin_user SET active = true WHERE admin_id = $1', [target.admin_id]);
  await audit(req.admin.admin_id, 'admin.activate', { admin_id: target.admin_id, login_id: target.login_id });
  res.json({ success: true });
}));

// For an admin who lost the phone and the recovery codes: they set MFA up again at the next sign-in.
router.post('/:id/reset-mfa', wrap(async (req, res) => {
  const target = await other(req);
  await db.query(
    `UPDATE ctw_admin_user SET mfa_enabled = false, mfa_secret_enc = NULL, mfa_last_step = NULL, recovery_codes = '{}',
            session_version = session_version + 1
      WHERE admin_id = $1`,
    [target.admin_id],
  );
  await audit(req.admin.admin_id, 'admin.reset_mfa', { admin_id: target.admin_id, login_id: target.login_id });
  res.json({ success: true });
}));

router.post('/:id/reset-password', wrap(async (req, res) => {
  const target = await other(req);
  const password = temporaryPassword();
  await db.query(
    `UPDATE ctw_admin_user SET password_hash = crypt($2, gen_salt('bf', 10)), must_change_password = true,
            session_version = session_version + 1
      WHERE admin_id = $1`,
    [target.admin_id, password],
  );
  await audit(req.admin.admin_id, 'admin.reset_password', { admin_id: target.admin_id, login_id: target.login_id });
  res.json({ temporary_password: password });
}));

module.exports = router;
