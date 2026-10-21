// Sign-in for CTW staff (ctw_admin_user; bcrypt hashes made by pgcrypto), in one or two steps:
//   POST /login { login_id, password }  -> { token } or, with MFA on, { mfa_required, challenge }
//   POST /login/mfa { challenge, code | recovery_code } -> { token }
// and the admin's own account: password, MFA set-up, sign out everywhere.
const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const auth = require('../auth');
const totp = require('../totp');
const secrets = require('../secrets');
const { wrap, httpError } = require('../http');

const router = express.Router();

// Failed attempts per login ID (password) or admin (code): 5 in a row lock it for 15 minutes.
// In memory, so a restart clears it.
const failures = new Map();
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60_000;
const MIN_PASSWORD = 12;

function locked(key) {
  const f = failures.get(key);
  return f && f.count >= MAX_FAILURES && Date.now() < f.until;
}
function failed(key) {
  const f = failures.get(key);
  failures.set(key, { count: (f && Date.now() < f.until ? f.count : 0) + 1, until: Date.now() + LOCK_MS });
}

const hashCode = (code) => crypto.createHash('sha256').update(String(code).toLowerCase().replace(/[^a-z0-9]/g, '')).digest('hex');
const newRecoveryCodes = () =>
  Array.from({ length: 10 }, () => {
    const s = totp.base32Encode(crypto.randomBytes(5)).toLowerCase();
    return `${s.slice(0, 4)}-${s.slice(4, 8)}`;
  });

async function audit(adminId, action, details = {}) {
  await db.query('INSERT INTO ctw_audit_log (admin_id, action, details) VALUES ($1, $2, $3)', [adminId, action, details]);
}

// The signed-in answer: token, who, and what is still to set up.
async function signedIn(adminId, { mfa }) {
  const { rows } = await db.query(`SELECT ${auth.STATE_COLS} FROM ctw_admin_user WHERE admin_id = $1`, [adminId]);
  const row = rows[0];
  return {
    token: auth.issue(row, { mfa }),
    expires_in: auth.TTL_SECONDS,
    admin: auth.publicAdmin(row),
    pending: auth.pending(row),
  };
}

router.post('/login', wrap(async (req, res) => {
  const login = String(req.body.login_id || req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!login || !password) throw httpError(400, 'Enter your login ID or email and your password');
  if (locked(`p:${login}`)) throw httpError(429, 'Too many failed attempts. Try again in 15 minutes.');

  const { rows } = await db.query(
    `SELECT admin_id, session_version, mfa_enabled FROM ctw_admin_user
      WHERE active AND (lower(login_id) = $1 OR lower(email) = $1) AND password_hash = crypt($2, password_hash)`,
    [login, password],
  );
  if (!rows.length) {
    failed(`p:${login}`);
    throw httpError(401, 'Invalid login ID or password');
  }
  failures.delete(`p:${login}`);
  const admin = rows[0];
  if (admin.mfa_enabled) return res.json({ mfa_required: true, challenge: auth.issueChallenge(admin) });

  await db.query('UPDATE ctw_admin_user SET last_login_at = now() WHERE admin_id = $1', [admin.admin_id]);
  await audit(admin.admin_id, 'admin.login', { mfa: false });
  res.json(await signedIn(admin.admin_id, { mfa: false }));
}));

router.post('/login/mfa', wrap(async (req, res) => {
  const claims = auth.read(req.body.challenge, 'mfa');
  if (!claims) throw httpError(401, 'The sign-in took too long. Enter your password again.');
  const id = claims.sub;
  if (locked(`m:${id}`)) throw httpError(429, 'Too many wrong codes. Try again in 15 minutes.');

  const { rows } = await db.query(
    `SELECT admin_id, session_version, mfa_secret_enc, mfa_last_step FROM ctw_admin_user
      WHERE admin_id = $1 AND active AND mfa_enabled`,
    [id],
  );
  const admin = rows[0];
  if (!admin || admin.session_version !== claims.sv) throw httpError(401, 'Enter your password again.');

  let method = null;
  if (req.body.recovery_code) {
    const { rowCount } = await db.query(
      `UPDATE ctw_admin_user SET recovery_codes = array_remove(recovery_codes, $2)
        WHERE admin_id = $1 AND $2 = ANY (recovery_codes)`,
      [id, hashCode(req.body.recovery_code)],
    );
    if (rowCount) method = 'recovery_code';
  } else {
    const step = totp.verify(secrets.decrypt(admin.mfa_secret_enc), req.body.code, admin.mfa_last_step === null ? null : Number(admin.mfa_last_step));
    // Recording the step only if no other sign-in took it first: a code is accepted once.
    if (step !== null) {
      const { rowCount } = await db.query(
        `UPDATE ctw_admin_user SET mfa_last_step = $2
          WHERE admin_id = $1 AND (mfa_last_step IS NULL OR mfa_last_step < $2)`,
        [id, step],
      );
      if (rowCount) method = 'totp';
    }
  }
  if (!method) {
    failed(`m:${id}`);
    throw httpError(401, req.body.recovery_code ? 'That recovery code is not valid or was used' : 'Wrong or expired code');
  }
  failures.delete(`m:${id}`);
  await db.query('UPDATE ctw_admin_user SET last_login_at = now() WHERE admin_id = $1', [id]);
  await audit(id, 'admin.login', { mfa: true, method });
  res.json(await signedIn(id, { mfa: true }));
}));

router.get('/me', auth.requireSession, (req, res) => {
  const s = req.adminState;
  res.json({
    admin: req.admin,
    pending: auth.pending(s),
    mfa_enabled: s.mfa_enabled,
    mfa_required: auth.mfaRequired(),
    recovery_codes_left: s.recovery_codes_left,
  });
});

// Own password. Ends every other session; this one continues with the returned token.
router.post('/password', auth.requireSession, wrap(async (req, res) => {
  const current = String(req.body.current_password || '');
  const next = String(req.body.new_password || '');
  if (next.length < MIN_PASSWORD) throw httpError(400, `The new password needs at least ${MIN_PASSWORD} characters`);
  if (next === current) throw httpError(400, 'The new password must differ from the current one');
  if (next.toLowerCase().includes(req.admin.login_id.toLowerCase())) throw httpError(400, 'The password must not contain your login ID');
  const { rowCount } = await db.query(
    `UPDATE ctw_admin_user SET password_hash = crypt($3, gen_salt('bf', 10)), must_change_password = false,
            password_changed_at = now(), session_version = session_version + 1
      WHERE admin_id = $1 AND password_hash = crypt($2, password_hash)`,
    [req.admin.admin_id, current, next],
  );
  if (!rowCount) throw httpError(400, 'The current password is not correct');
  await audit(req.admin.admin_id, 'admin.password_change');
  res.json(await signedIn(req.admin.admin_id, { mfa: req.session.mfa }));
}));

// MFA set-up, step 1: a new secret for the authenticator app (not active until confirmed).
router.post('/mfa/setup', auth.requireSession, wrap(async (req, res) => {
  if (req.adminState.mfa_enabled) throw httpError(409, 'Multi-factor sign-in is already set up. Another admin can reset it.');
  const s = totp.newSecret();
  await db.query('UPDATE ctw_admin_user SET mfa_secret_enc = $2 WHERE admin_id = $1', [req.admin.admin_id, secrets.encrypt(s)]);
  res.json({ secret: s, otpauth_uri: totp.otpauthUri(s, req.admin.login_id) });
}));

// Step 2: a code from the app proves it is set up; recovery codes are shown this once.
router.post('/mfa/confirm', auth.requireSession, wrap(async (req, res) => {
  const { rows } = await db.query('SELECT mfa_enabled, mfa_secret_enc FROM ctw_admin_user WHERE admin_id = $1', [req.admin.admin_id]);
  if (rows[0].mfa_enabled) throw httpError(409, 'Multi-factor sign-in is already set up');
  if (!rows[0].mfa_secret_enc) throw httpError(409, 'Start the set-up first');
  const step = totp.verify(secrets.decrypt(rows[0].mfa_secret_enc), req.body.code);
  if (step === null) throw httpError(400, 'That code does not match. Check the time on your phone and try the next code.');
  const codes = newRecoveryCodes();
  await db.query(
    `UPDATE ctw_admin_user SET mfa_enabled = true, mfa_last_step = $2, recovery_codes = $3,
            session_version = session_version + 1
      WHERE admin_id = $1`,
    [req.admin.admin_id, step, codes.map(hashCode)],
  );
  await audit(req.admin.admin_id, 'admin.mfa_enabled');
  res.json({ recovery_codes: codes, ...(await signedIn(req.admin.admin_id, { mfa: true })) });
}));

// Ends every session of this admin, this one included.
router.post('/logout-all', auth.requireSession, wrap(async (req, res) => {
  await db.query('UPDATE ctw_admin_user SET session_version = session_version + 1 WHERE admin_id = $1', [req.admin.admin_id]);
  await audit(req.admin.admin_id, 'admin.logout_all');
  res.json({ success: true });
}));

// Tokens are stateless; the UI drops its copy.
router.post('/logout', (_req, res) => res.json({ success: true }));

module.exports = router;
module.exports.MIN_PASSWORD = MIN_PASSWORD;
