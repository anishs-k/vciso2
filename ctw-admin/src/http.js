// Express helpers shared by the routers.

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Constraints whose Postgres message would not tell an admin what to fix.
const CONSTRAINT_MESSAGES = {
  ctw_client_office_one_primary: 'A client can have only one Primary office',
  ctw_contract_one_current: 'A client can have only one current contract',
  ctw_client_office_pkey: 'Office IDs must be unique',
  ctw_client_contact_pkey: 'Contact IDs must be unique',
  ctw_client_initial_user_pkey: 'Initial user IDs must be unique',
  ctw_client_initial_user_customer_id_login_id_key: 'Initial user login IDs must be unique',
  ctw_client_tool_pkey: 'Each tool can be listed only once',
  ctw_licence_framework_pkey: 'Each framework can be selected only once',
};

// Postgres errors a request can cause (bad value, duplicate, missing parent) -> 400/409 with the reason;
// anything else -> 500, logged.
function errorHandler(err, _req, res, _next) {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Body is not valid JSON' });
  if (err.expose && err.status) return res.status(err.status).json({ error: err.message, ...err.body });
  if (typeof err.code === 'string' && err.code.startsWith('23')) {
    const status = err.code === '23505' ? 409 : 400;
    const error = CONSTRAINT_MESSAGES[err.constraint] || err.detail || err.message;
    return res.status(status).json({ error, constraint: err.constraint });
  }
  if (err.code === '22P02' || err.code === '22007' || err.code === '22008') {
    return res.status(400).json({ error: err.message });
  }
  console.error('[api]', err);
  res.status(500).json({ error: 'Internal error' });
}

const httpError = (status, message, body) => Object.assign(new Error(message), { status, expose: true, body });

module.exports = { wrap, errorHandler, httpError };
