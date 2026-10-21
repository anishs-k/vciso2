// The audit trail, newest first: GET /api/audit?customer_id=&action=&admin_id=&before=<audit_id>&limit=
// `action` matches a prefix ("build." finds every build action). Page on with `before` = next_before.
const express = require('express');
const db = require('../db');
const { wrap } = require('../http');

const router = express.Router();

router.get('/', wrap(async (req, res) => {
  const where = [];
  const params = [];
  const add = (sql, v) => {
    params.push(v);
    where.push(sql.replace('?', `$${params.length}`));
  };
  if (req.query.customer_id) add('l.customer_id = ?', String(req.query.customer_id));
  if (req.query.action) add("l.action LIKE ? || '%'", String(req.query.action));
  if (/^\d+$/.test(req.query.admin_id || '')) add('l.admin_id = ?', Number(req.query.admin_id));
  if (/^\d+$/.test(req.query.before || '')) add('l.audit_id < ?', Number(req.query.before));
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

  const { rows } = await db.query(
    `SELECT l.audit_id, l.at, l.action, l.customer_id, l.details, l.admin_id, a.login_id AS admin_login
       FROM ctw_audit_log l LEFT JOIN ctw_admin_user a ON a.admin_id = l.admin_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY l.audit_id DESC LIMIT ${limit + 1}`,
    params,
  );
  const more = rows.length > limit;
  const page = rows.slice(0, limit);
  res.json({ entries: page, next_before: more ? page[page.length - 1].audit_id : null });
}));

router.get('/actions', wrap(async (_req, res) => {
  res.json((await db.query('SELECT DISTINCT action FROM ctw_audit_log ORDER BY action')).rows.map((r) => r.action));
}));

module.exports = router;
