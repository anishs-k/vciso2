// CTW admin sessions. A token is `<payload>.<signature>`: base64url JSON signed with HMAC-SHA256 under
// CTW_SESSION_SECRET, the same shape as the client platform's tokens (src/auth.js) but a different key,
// so neither accepts the other's.
//
// A session token carries the admin's session_version: bumping it in the database (password change,
// deactivation, MFA reset, "sign out everywhere") ends every session at once. A short-lived `mfa`
// challenge token stands between the password and the authenticator code.
//
// Until an admin has changed a temporary password, and (with CTW_REQUIRE_MFA, the default) set up MFA,
// requireAdmin answers 403 with a `code` the UI acts on; requireSession lets those set-up calls through.
const crypto = require('crypto');
const db = require('./db');

const TTL_SECONDS = Number(process.env.CTW_SESSION_TTL_SECONDS) || 8 * 3600;
const CHALLENGE_SECONDS = 5 * 60;
const mfaRequired = () => process.env.CTW_REQUIRE_MFA !== 'false';

function secret() {
  const s = process.env.CTW_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('CTW_SESSION_SECRET must be set (32+ characters) in ctw-admin/.env');
  return s;
}

const sign = (data) => crypto.createHmac('sha256', secret()).update(data).digest('base64url');

function token(claims, ttl) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ ...claims, iat: now, exp: now + ttl })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

const issue = (admin, { mfa = false } = {}) =>
  token({ typ: 'session', sub: admin.admin_id, sv: admin.session_version, mfa }, TTL_SECONDS);
const issueChallenge = (admin) => token({ typ: 'mfa', sub: admin.admin_id, sv: admin.session_version }, CHALLENGE_SECONDS);

function read(t, typ = 'session') {
  const [payload, sig] = String(t || '').split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  return claims.typ === typ && claims.exp >= Date.now() / 1000 ? claims : null;
}

// What the UI may know about an admin (never the hash, the TOTP secret or recovery codes).
const ADMIN_COLS = 'admin_id, login_id, full_name, email';
const STATE_COLS = `${ADMIN_COLS}, active, session_version, must_change_password, mfa_enabled,
  cardinality(recovery_codes) AS recovery_codes_left`;

function publicAdmin(row) {
  return { admin_id: row.admin_id, login_id: row.login_id, full_name: row.full_name, email: row.email };
}

// What is still to do before the admin may use the tool: [] when nothing.
function pending(row) {
  const out = [];
  if (row.must_change_password) out.push('password_change_required');
  if (mfaRequired() && !row.mfa_enabled) out.push('mfa_setup_required');
  return out;
}

async function loadSession(req) {
  const h = req.get('authorization') || '';
  const claims = h.startsWith('Bearer ') ? read(h.slice(7)) : null;
  if (!claims) return null;
  const { rows } = await db.query(`SELECT ${STATE_COLS} FROM ctw_admin_user WHERE admin_id = $1`, [claims.sub]);
  const row = rows[0];
  if (!row || !row.active || row.session_version !== claims.sv) return null;
  return { row, claims };
}

// A valid session, set-up steps outstanding or not (sign-in, password change, MFA set-up). Sets req.admin.
async function requireSession(req, res, next) {
  try {
    const s = await loadSession(req);
    if (!s) return res.status(401).json({ error: 'Not signed in' });
    req.admin = publicAdmin(s.row);
    req.adminState = s.row;
    req.session = s.claims;
    next();
  } catch (err) {
    next(err);
  }
}

// A session of an admin who has finished setting up. Everything except /api/auth goes through this.
function requireAdmin(req, res, next) {
  requireSession(req, res, (err) => {
    if (err) return next(err);
    const todo = pending(req.adminState);
    if (todo.length) {
      const why = todo[0] === 'password_change_required'
        ? 'Change your temporary password first'
        : 'Set up multi-factor sign-in first';
      return res.status(403).json({ error: why, code: todo[0], pending: todo });
    }
    next();
  });
}

module.exports = {
  issue,
  issueChallenge,
  read,
  requireSession,
  requireAdmin,
  pending,
  publicAdmin,
  mfaRequired,
  secret,
  ADMIN_COLS,
  STATE_COLS,
  TTL_SECONDS,
};
