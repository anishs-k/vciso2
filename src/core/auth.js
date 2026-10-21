// Sign-in against customer_framework_users (passwords are bcrypt hashes made by pgcrypto at install).
const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const auth = require('../auth');
const instance = require('../instance');

const router = express.Router();

// MFA codes waiting to be verified: user_id -> { hash, expires, attempts }. Codes live for 5 minutes.
const pending = new Map();
const MFA_TTL_MS = 5 * 60_000;
const hash = (code) => crypto.createHash('sha256').update(code).digest('hex');
const mask = (email) => String(email || '').replace(/^(.).*?(.?)@/, (_m, a, b) => `${a}***${b}@`);

// Step 1 (LoginPage): password check, then an MFA challenge. The UI then posts the code to /verify-mfa.
// There is no mail delivery in the client platform yet, so the code is handed back (and auto-filled by
// the UI) only where it is not a second factor: users with MFA off, or CTW_DEV_MFA=true for development.
router.post('/login', async (req, res, next) => {
  try {
    const id = String(req.body.email || req.body.login_id || req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!id || !password) return res.status(400).json({ error: 'Enter your login ID or email and your password' });

    const { rows } = await db.query(
      `SELECT u.user_id, u.user_email, u.mfa IS TRUE AS mfa, l.valid_to < CURRENT_DATE AS expired
         FROM customer_framework_users u JOIN client_license l ON l.customer_id = u.customer_id
        WHERE u.active IS TRUE AND (lower(u.login_id) = lower($1) OR lower(u.user_email) = lower($1))
          AND u.password_hash IS NOT NULL AND u.password_hash = crypt($2, u.password_hash)`,
      [id, password]
    );
    const u = rows[0];
    if (!u) return res.status(401).json({ error: 'Invalid login ID or password' });
    // SOW WP1: an expired licence blocks sign-in.
    if (u.expired) return res.status(403).json({ error: 'The platform licence has expired. Contact CyberTrustWorks to renew.' });

    const showCode = !u.mfa || process.env.CTW_DEV_MFA === 'true';
    if (!showCode) {
      return res.status(503).json({ error: 'Multi-factor sign-in needs a mail server, which this platform version cannot use yet. Ask your administrator.' });
    }
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    pending.set(u.user_id, { hash: hash(code), expires: Date.now() + MFA_TTL_MS, attempts: 0 });
    res.json({ userId: u.user_id, email: mask(u.user_email), devCode: code });
  } catch (err) {
    next(err);
  }
});

// Step 2: the code from step 1 -> session token and user.
router.post('/verify-mfa', async (req, res, next) => {
  try {
    const userId = String(req.body.userId || '');
    const p = pending.get(userId);
    if (!p || p.expires < Date.now()) {
      pending.delete(userId);
      return res.status(401).json({ error: 'The code has expired. Sign in again.' });
    }
    if (++p.attempts > 5) {
      pending.delete(userId);
      return res.status(429).json({ error: 'Too many attempts. Sign in again.' });
    }
    const given = hash(String(req.body.code || '').trim());
    if (!crypto.timingSafeEqual(Buffer.from(given), Buffer.from(p.hash))) return res.status(401).json({ error: 'Wrong code' });
    pending.delete(userId);
    const user = await auth.findUser('u.user_id = $1', [userId]);
    if (!user) return res.status(401).json({ error: 'This account is no longer active' });
    res.json({ token: auth.issue(user), user });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', (_req, res) =>
  res.status(501).json({ error: 'Password reset by email needs a mail server, which this platform version cannot use yet. Ask your administrator.' }));

// The UI's SaaS flow let a vCISO pick a client; here the user always belongs to this instance's client.
router.patch('/me/client', auth.requireUser, (req, res) =>
  res.status(409).json({ error: `Your account already belongs to ${req.user.company_name}` }));

router.get('/me', auth.requireUser, (req, res) => res.json(req.user));

// What the user may see. Overview reads `permissions` as "section:item" strings; screens come from
// Role-UI-User-Map via Customer-Framework-Role-User.
router.get('/me/permissions', auth.requireUser, async (req, res, next) => {
  try {
    const { rows: screens } = await db.query(
      `SELECT DISTINCT s.ui_id, s.category FROM customer_framework_role_user r
         JOIN ui_report_dashboard_list s ON s.ui_id = r.ui_id
        WHERE r.user_id = $1 AND r.active IS TRUE ORDER BY 1`,
      [req.user.user_id]
    );
    const { rows: fws } = await db.query(
      `SELECT DISTINCT f.standard FROM customer_framework_role_user r JOIN master_framework f USING (framework_id)
        WHERE r.user_id = $1 AND r.active IS TRUE ORDER BY 1`,
      [req.user.user_id]
    );
    const modules = instance.state.instance.licensed_modules;
    res.json({
      role: req.user.user_role,
      role_ids: req.user.role_ids,
      screens,
      permissions: [
        ...fws.map((f) => `frameworks:${f.standard}`),
        ...(modules.includes('vulnerabilities') ? ['security_tools:Vulnerability Management'] : []),
        ...screens.map((s) => `screens:${s.ui_id}`),
      ],
    });
  } catch (err) {
    next(err);
  }
});

// First sign-in uses the one-time password from initial_credentials.txt; this replaces it.
router.post('/change-password', auth.requireUser, async (req, res, next) => {
  try {
    const current = String(req.body.current_password || req.body.currentPassword || '');
    const next_ = String(req.body.new_password || req.body.newPassword || req.body.password || '');
    if (next_.length < 12) return res.status(400).json({ error: 'The new password must be at least 12 characters' });
    const { rowCount } = await db.query(
      `UPDATE customer_framework_users
          SET password_hash = crypt($3, gen_salt('bf', 10)), last_password_change = now(), last_password_change_by = $1,
              updated_at = now(), updated_by = $1
        WHERE user_id = $1 AND password_hash = crypt($2, password_hash)`,
      [req.user.user_id, current, next_]
    );
    if (!rowCount) return res.status(401).json({ error: 'Current password is wrong' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Tokens are stateless; signing out is the client dropping its token.
router.post('/logout', (_req, res) => res.json({ success: true }));

module.exports = router;
