// Session tokens and the request guard. A token is `<payload>.<signature>`: base64url JSON signed with
// HMAC-SHA256 under the session secret that `npm run link` generated for this instance, so tokens
// from another instance (or another database) never verify here.
const crypto = require('crypto');
const instance = require('./instance');
const db = require('./db');

const TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS) || 8 * 3600;

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', instance.state.link.session_secret).update(data).digest('base64url');

function issue(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = b64(JSON.stringify({ sub: user.user_id, iid: instance.state.instance.instance_id, iat: now, exp: now + TTL_SECONDS }));
  return `${payload}.${sign(payload)}`;
}

function read(token) {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (claims.iid !== instance.state.instance.instance_id || claims.exp < Date.now() / 1000) return null;
  return claims;
}

// The signed-in user, as the API hands it to the UI. `role` is the UI's routing role; the
// platform role from the client database is `user_role`.
const USER_SQL = `
  SELECT u.user_id, u.login_id, u.user_name, u.user_email, u.user_role, u.office_id, u.designation, u.department,
         u.customer_id, c.customer_name, u.last_password_change IS NULL AS must_change_password,
         COALESCE(array_agg(DISTINCT r.role_id) FILTER (WHERE r.role_id IS NOT NULL), '{}') AS role_ids,
         COALESCE(array_agg(DISTINCT r.ui_id) FILTER (WHERE r.ui_id IS NOT NULL), '{}') AS screens
    FROM customer_framework_users u
    JOIN master_customer_details c ON c.customer_id = u.customer_id
    LEFT JOIN customer_framework_role_user r ON r.user_id = u.user_id AND r.active IS TRUE
   WHERE u.active IS TRUE AND %WHERE%
   GROUP BY u.user_id, c.customer_name`;

// vCISO and Organisation Owner see the vCISO pages (architecture: the Org Owner sees the same pages);
// everyone else gets the client dashboard.
const UI_ROLE = { vCISO: 'vciso', 'Organisation Owner': 'vciso' };

function toUser(row) {
  return {
    id: row.user_id,
    user_id: row.user_id,
    login_id: row.login_id,
    name: row.user_name,
    email: row.user_email,
    role: UI_ROLE[row.user_role] || 'client',
    user_role: row.user_role,
    role_ids: row.role_ids,
    screens: row.screens,
    office_id: row.office_id,
    designation: row.designation,
    department: row.department,
    client_id: row.customer_id,
    company_name: row.customer_name,
    must_change_password: row.must_change_password,
  };
}

async function findUser(where, params) {
  const { rows } = await db.query(USER_SQL.replace('%WHERE%', where), params);
  return rows[0] ? toUser(rows[0]) : null;
}

function bearer(req) {
  const h = req.get('authorization') || '';
  if (h.startsWith('Bearer ') && h.length > 7) return h.slice(7);
  // EventSource cannot send headers, so the event stream alone takes the token as a query parameter.
  return req.path === '/events' && req.query.token ? String(req.query.token) : null;
}

// Requires a valid session; sets req.user.
async function requireUser(req, res, next) {
  try {
    const claims = read(bearer(req));
    const user = claims && (await findUser('u.user_id = $1', [claims.sub]));
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { issue, read, findUser, requireUser, bearer, TTL_SECONDS };
