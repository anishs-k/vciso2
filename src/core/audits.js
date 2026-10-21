// Compliance audits and their findings / corrective actions (compliance_audit, compliance_audit_finding).
const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const auth = require('../auth');
const ctx = require('./context');

const router = express.Router();
const { wrap, customerId } = ctx;
router.use(auth.requireUser);

const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });
const AUDIT_STATUS = ['open', 'in_progress', 'closed'];
const AUDIT_TYPES = ['internal', 'external', 'certification', 'surveillance'];
const FINDING_SEVERITY = ['critical', 'major', 'minor', 'observation'];

// Audits with the counts the UI shows; an open finding past its due date is an overdue CAR.
async function auditData() {
  const { rows: audits } = await db.query(
    `SELECT a.audit_id AS id, a.title, a.framework, a.framework_id, a.audit_type, a.status, a.auditor, a.start_date, a.end_date,
            a.created_at, a.closed_at, count(f.*)::int AS findings,
            count(f.*) FILTER (WHERE f.severity = 'major')::int AS major,
            count(f.*) FILTER (WHERE f.severity = 'critical')::int AS critical,
            count(f.*) FILTER (WHERE f.status <> 'closed' AND f.due_date < CURRENT_DATE)::int AS overdue_cars
       FROM compliance_audit a LEFT JOIN compliance_audit_finding f ON f.audit_id = a.audit_id
      WHERE a.customer_id = $1 GROUP BY a.audit_id ORDER BY a.created_at DESC`, [customerId()]);
  const { rows: cars } = await db.query(
    `SELECT f.finding_id AS id, f.audit_id, f.control_ref, f.severity, f.description, f.corrective_action, f.owner_user_id,
            f.due_date, f.status, f.created_at, f.closed_at
       FROM compliance_audit_finding f JOIN compliance_audit a ON a.audit_id = f.audit_id
      WHERE a.customer_id = $1 ORDER BY f.created_at DESC`, [customerId()]);
  return { audits, cars };
}

async function oneAudit(id) {
  const { audits } = await auditData();
  const a = audits.find((x) => x.id === id);
  if (!a) throw httpError(404, 'No such audit');
  return a;
}

router.get('/vciso/audits', wrap(async (_req, res) => res.json((await auditData()).audits)));

// The framework may be any text; when it names a licensed framework the audit is tied to it.
router.post('/vciso/audits', wrap(async (req, res) => {
  const b = req.body;
  if (!String(b.title || '').trim()) throw httpError(400, 'Enter a title');
  const f = b.framework ? await ctx.resolveFramework(b.framework) : null;
  const id = `AUD_${crypto.randomUUID()}`;
  await db.query(
    `INSERT INTO compliance_audit (audit_id, customer_id, framework_id, framework, title, audit_type, status, auditor, start_date, end_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [id, customerId(), f?.framework_id ?? null, b.framework || f?.standard || null, String(b.title).trim(),
     AUDIT_TYPES.includes(b.audit_type) ? b.audit_type : null, AUDIT_STATUS.includes(b.status) ? b.status : 'open',
     b.auditor || null, b.start_date || null, b.end_date || null, req.user.user_id]);
  res.status(201).json(await oneAudit(id));
}));

router.patch('/vciso/audits/:id', wrap(async (req, res) => {
  const b = req.body;
  if (b.status !== undefined && !AUDIT_STATUS.includes(b.status)) throw httpError(400, `status must be one of ${AUDIT_STATUS.join(', ')}`);
  const { rowCount } = await db.query(
    `UPDATE compliance_audit SET title = COALESCE($3, title), status = COALESCE($4, status), auditor = COALESCE($5, auditor),
            start_date = COALESCE($6, start_date), end_date = COALESCE($7, end_date), updated_at = now(),
            closed_at = CASE WHEN $4 = 'closed' THEN COALESCE(closed_at, now()) WHEN $4 IS NOT NULL THEN NULL ELSE closed_at END
      WHERE customer_id = $1 AND audit_id = $2`,
    [customerId(), req.params.id, b.title ?? null, b.status ?? null, b.auditor ?? null, b.start_date ?? null, b.end_date ?? null]);
  if (!rowCount) throw httpError(404, 'No such audit');
  res.json(await oneAudit(req.params.id));
}));

router.get('/vciso/audits/:id/findings', wrap(async (req, res) => {
  await oneAudit(req.params.id);
  res.json((await auditData()).cars.filter((c) => c.audit_id === req.params.id));
}));

// A finding names the control it is against (4.1, A.5.1 ...); it is tied to the register when licensed.
router.post('/vciso/audits/:id/findings', wrap(async (req, res) => {
  const a = await oneAudit(req.params.id);
  const b = req.body;
  if (!FINDING_SEVERITY.includes(b.severity)) throw httpError(400, `severity must be one of ${FINDING_SEVERITY.join(', ')}`);
  if (!String(b.description || '').trim()) throw httpError(400, 'Describe the finding');
  let control = null;
  if (b.control_ref && a.framework_id) {
    const { rows } = await db.query(
      `SELECT m.clause_control_id FROM master_clause_control_map m JOIN master_framework mf ON mf.framework_id = m.framework_id
        WHERE m.framework_id = $1 AND ${ctx.UI_CONTROL_ID} = $2`, [a.framework_id, String(b.control_ref)]);
    control = rows[0]?.clause_control_id ?? null;
  }
  const id = `CAR_${crypto.randomUUID()}`;
  await db.query(
    `INSERT INTO compliance_audit_finding (finding_id, audit_id, clause_control_id, control_ref, severity, description,
       corrective_action, owner_user_id, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, a.id, control, b.control_ref || null, b.severity, String(b.description).trim(), b.corrective_action || null,
     await ctx.resolveUser(b.owner), b.due_date || null]);
  res.status(201).json((await auditData()).cars.find((c) => c.id === id));
}));

router.patch('/vciso/audits/:id/findings/:findingId', wrap(async (req, res) => {
  const b = req.body;
  if (b.status !== undefined && !AUDIT_STATUS.includes(b.status)) throw httpError(400, `status must be one of ${AUDIT_STATUS.join(', ')}`);
  const owner = b.owner === undefined ? undefined : await ctx.resolveUser(b.owner);
  const { rowCount } = await db.query(
    `UPDATE compliance_audit_finding f SET status = COALESCE($4, f.status), corrective_action = COALESCE($5, f.corrective_action),
            due_date = COALESCE($6, f.due_date), owner_user_id = CASE WHEN $8 THEN $7 ELSE f.owner_user_id END,
            closed_at = CASE WHEN $4 = 'closed' THEN COALESCE(f.closed_at, now()) WHEN $4 IS NOT NULL THEN NULL ELSE f.closed_at END
       FROM compliance_audit a
      WHERE a.audit_id = f.audit_id AND a.customer_id = $1 AND f.audit_id = $2 AND f.finding_id = $3`,
    [customerId(), req.params.id, req.params.findingId, b.status ?? null, b.corrective_action ?? null, b.due_date ?? null,
     owner ?? null, owner !== undefined]);
  if (!rowCount) throw httpError(404, 'No such finding');
  res.json((await auditData()).cars.find((c) => c.id === req.params.findingId));
}));

module.exports = { router, auditData };
