// Compliance: licensed frameworks and their controls, the client's control register
// (customer_clause_control_map), evidence (customer_transactions) and the asset register
// (customer_asset_owner). Routes keep the paths the vCISO UI calls.
const express = require('express');
const db = require('../../db');
const auth = require('../../auth');
const ctx = require('../../core/context');
const evidence = require('../../core/evidence');

const router = express.Router();
const { wrap, customerId, UI_CONTROL_ID } = ctx;
const { questionnaireKey, NON_FRAMEWORK_QUESTIONNAIRES } = require('./assessments');
router.use(auth.requireUser);

const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });

async function framework(key) {
  const f = await ctx.resolveFramework(key);
  if (!f) throw httpError(404, `Framework "${key}" is not licensed for this organisation`);
  return f;
}

// ---------------------------------------------------------------- frameworks and controls

// Licensed frameworks with their controls, shaped like the UI's FRAMEWORK_CATALOG entries.
router.get('/vciso/frameworks', wrap(async (_req, res) => {
  const { rows } = await db.query(
    `SELECT mf.framework_id, mf.framework_code, mf.standard, m.clause_control_id, m.control_controltype,
            m.clause_control_ref_no, m.clause_control_ref_desc, m.clause_control_sub_ref_no, m.clause_control_sub_ref_desc,
            m.requirement, ${UI_CONTROL_ID} AS control_id
       FROM master_framework mf LEFT JOIN master_clause_control_map m ON m.framework_id = mf.framework_id
      ORDER BY mf.framework_id, m.clause_control_id`
  );
  const out = new Map();
  for (const r of rows) {
    if (!out.has(r.framework_id)) {
      out.set(r.framework_id, { framework_id: r.framework_id, slug: ctx.slugOf(r.framework_code), name: r.standard,
                                shortName: r.framework_code, domains: [], _d: new Map() });
    }
    const f = out.get(r.framework_id);
    if (!r.clause_control_id) continue;
    const iso = r.framework_code === 'ISO27001';
    const ref = String(r.clause_control_ref_no || '').trim();
    const domain = iso
      ? `${r.control_controltype === 'Control' ? 'A.' : 'Clause '}${ref} ${r.clause_control_ref_desc || ''}`.trim()
      : [ref, r.clause_control_ref_desc].filter(Boolean).join(' — ') || 'Controls';
    if (!f._d.has(domain)) {
      const d = { name: domain, controls: [] };
      f._d.set(domain, d);
      f.domains.push(d);
    }
    f._d.get(domain).controls.push({
      id: r.control_id,
      clause_control_id: r.clause_control_id,
      name: r.clause_control_sub_ref_desc || r.clause_control_ref_desc || r.control_id,
      desc: r.requirement || '',
      reference: iso ? null : r.clause_control_sub_ref_no,
    });
  }
  res.json({ frameworks: [...out.values()].map(({ _d, ...f }) => f) });
}));

// The control register for one framework: one row per control (the primary office's row; edits
// below apply to every office that has the control).
const REGISTER_SQL = `
  SELECT DISTINCT ON (m.clause_control_id) ${UI_CONTROL_ID} AS control_id, c.clause_control_id, c.office_id,
         c.status, c.notes, c.evidence_owner_user_id AS assignee, c.owner_user_id AS control_owner, c.target_completion AS target_date,
         c.mandatory, c.applicable, c.justification, c.implementation_status, c.search_keyword AS keyword, c.objective_evidence,
         c.review_frequency_months AS review_frequency, c.collection_frequency, c.remarks, c.active, c.effective_date_from,
         c.effective_date_to, c.created_by, c.updated_by, COALESCE(c.updated_at, c.created_at) AS updated_at,
         c.clause_control_ref, c.clause_control_desc, c.requirement, c.primary_document_required, c.validation_method
    FROM customer_clause_control_map c
    JOIN master_clause_control_map m ON m.clause_control_id = c.clause_control_id
    JOIN master_framework mf ON mf.framework_id = m.framework_id
   WHERE c.customer_id = $1 AND c.framework_id = $2`;

const toRow = (r) => ({
  ...r, status: ctx.uiStatus(r.status), mandatory: ctx.yn(r.mandatory), applicable: ctx.yn(r.applicable), active: ctx.yn(r.active),
  inputs_json: null,
});

router.get('/vciso/audit/:slug/controls', wrap(async (req, res) => {
  const f = await framework(req.params.slug);
  const { rows } = await db.query(`${REGISTER_SQL} ORDER BY m.clause_control_id, c.office_id = $3 DESC`,
    [customerId(), f.framework_id, (await ctx.clientScope()).office_id]);
  res.json(rows.map(toRow));
}));

// UI field -> register column, with how to convert the value.
const EDITABLE = {
  status: ['status', (v) => (v === 'not_assessed' ? 'Not Started' : v)],
  notes: ['notes'], justification: ['justification'], implementation_status: ['implementation_status'],
  keyword: ['search_keyword'], objective_evidence: ['objective_evidence'], remarks: ['remarks'],
  target_date: ['target_completion', (v) => v || null],
  effective_date_from: ['effective_date_from', (v) => v || null], effective_date_to: ['effective_date_to', (v) => v || null],
  review_frequency: ['review_frequency_months', (v) => (v === '' || v === null ? null : parseInt(v, 10))],
  mandatory: ['mandatory', ctx.fromYn], applicable: ['applicable', ctx.fromYn], active: ['active', ctx.fromYn],
};

router.put('/vciso/audit/:slug/controls/:controlId', wrap(async (req, res) => {
  const f = await framework(req.params.slug);
  const sets = [];
  const params = [customerId(), f.framework_id, req.params.controlId];
  const put = (col, v) => { params.push(v); sets.push(`${col} = $${params.length}`); };
  for (const [field, [col, conv]] of Object.entries(EDITABLE)) {
    if (req.body[field] !== undefined) put(col, conv ? conv(req.body[field]) : req.body[field]);
  }
  // Owners must be users of this organisation (the licence counts control owners).
  if (req.body.control_owner !== undefined) put('owner_user_id', await ctx.resolveUser(req.body.control_owner));
  if (req.body.assignee !== undefined) put('evidence_owner_user_id', await ctx.resolveUser(req.body.assignee));
  if (!sets.length) throw httpError(400, 'Nothing to update');
  put('updated_by', req.user.user_id);
  const { rowCount } = await db.query(
    `UPDATE customer_clause_control_map c SET ${sets.join(', ')}, updated_at = now(), last_updated = now()
       FROM master_clause_control_map m JOIN master_framework mf ON mf.framework_id = m.framework_id
      WHERE m.clause_control_id = c.clause_control_id AND c.customer_id = $1 AND c.framework_id = $2
        AND ${UI_CONTROL_ID} = $3`,
    params
  );
  if (!rowCount) throw httpError(404, `Control ${req.params.controlId} is not in the ${f.standard} register`);
  const { rows } = await db.query(`${REGISTER_SQL} AND ${UI_CONTROL_ID} = $3`, [customerId(), f.framework_id, req.params.controlId]);
  res.json({ ...toRow(rows[0]), offices_updated: rowCount, ...(req.body.inputs_json !== undefined && { not_saved: ['inputs_json'] }) });
}));

// Implementation steps (the UI's ISO / DPDP roll-out plan) have no table in the client database yet.
router.get('/vciso/audit/:slug/steps', (_req, res) => res.json([]));
router.put('/vciso/audit/:slug/steps/:stepId', ctx.notInSchema('Implementation steps'));
router.put('/vciso/vcisomainpage/step/:stepId', ctx.notInSchema('Implementation steps'));

// ---------------------------------------------------------------- evidence

// The register control a UI reference points at (4.1, A.5.1, DPDP-CN-01 ...), or null.
async function controlFor(frameworkId, ref) {
  if (!ref) return null;
  const { rows } = await db.query(
    `SELECT m.clause_control_id FROM master_clause_control_map m JOIN master_framework mf ON mf.framework_id = m.framework_id
      WHERE m.framework_id = $1 AND ${UI_CONTROL_ID} = $2`,
    [frameworkId, String(ref)]
  );
  return rows[0]?.clause_control_id ?? null;
}

const EVIDENCE_SQL = `
  SELECT t.folder_location AS id, t.evidence_file_name AS original_name, t.any_other AS reference, t.clause_control_id,
         mf.framework_code, t.status AS review_status, t.review_comments AS vcisso_notes_, t.notes AS rejection_reason,
         t.remarks AS requirement_name, t.upload_date, t.current_status AS questionnaire, t.created_at AS uploaded_at, t.user_id AS uploaded_by, t.updated_by AS reviewed_by
    FROM customer_transactions t LEFT JOIN master_framework mf ON mf.framework_id = t.framework_id
   WHERE t.customer_id = $1 AND t.folder_location IS NOT NULL AND t.active IS NOT FALSE`;

const toEvidence = (r) => ({
  id: r.id, filename: r.original_name, original_name: r.original_name, size: evidence.sizeOf(r.id),
  framework_id: r.framework_code ? ctx.slugOf(r.framework_code) : r.questionnaire, control_id: r.reference, reference: r.reference, question_id: r.reference,
  requirement_name: r.requirement_name, review_status: r.review_status, vciso_notes: r.vcisso_notes_,
  rejection_reason: r.rejection_reason, uploaded_at: r.uploaded_at, uploaded_by: r.uploaded_by, reviewed_by: r.reviewed_by,
  url: `/api/evidence/file/${r.id}`, download_url: `/api/evidence/download/${r.id}`, tags: null,
});

async function listEvidence(where = '', params = []) {
  const { rows } = await db.query(`${EVIDENCE_SQL} ${where} ORDER BY t.created_at DESC`, [customerId(), ...params]);
  return rows.map(toEvidence);
}

// Records uploaded files as evidence cycles; files whose row cannot be written are deleted again.
// Questionnaires that are not a workbook framework (CSPM) store their proof with no framework_id and
// the questionnaire name in current_status.
async function storeEvidence(req, frameworkKey, ref, note) {
  if (!req.files?.length) throw httpError(400, 'No files uploaded');
  try {
    const q = questionnaireKey(frameworkKey);
    const f = NON_FRAMEWORK_QUESTIONNAIRES.includes(q) ? { framework_id: null } : await framework(frameworkKey);
    const scope = await ctx.clientScope();
    const control = f.framework_id ? await controlFor(f.framework_id, ref) : null;
    for (const file of req.files) {
      await db.query(
        `INSERT INTO customer_transactions (customer_id, office_id, fy_id, contract_id, framework_id, user_id, clause_control_id,
           cycle_no, start_datetime, evidence_file_name, folder_location, validation_method, status, evidence_uploaded,
           upload_date, remarks, any_other, current_status, active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1, now(), $8, $9, 'Manual', 'pending', TRUE, CURRENT_DATE, $10, $11, $12, TRUE, $6)`,
        [customerId(), scope.office_id, scope.fy_id, scope.contract_id, f.framework_id, req.user.user_id, control,
         file.originalname, file.filename, note || null, ref || null, f.framework_id ? null : q]
      );
    }
    return listEvidence('AND t.folder_location = ANY($2)', [req.files.map((x) => x.filename)]);
  } catch (err) {
    req.files.forEach((x) => evidence.remove(x.filename));
    throw err;
  }
}

async function reviewEvidence(req, res) {
  const status = req.body.reviewStatus;
  if (!['accepted', 'rejected', 'verified', 'pending'].includes(status)) throw httpError(400, 'reviewStatus must be accepted or rejected');
  const { rowCount } = await db.query(
    `UPDATE customer_transactions SET status = $3, review_comments = $4, notes = $5, updated_by = $6, updated_at = now(),
            last_updated = now(), closure_date = CASE WHEN $3 IN ('accepted', 'verified') THEN CURRENT_DATE END
      WHERE customer_id = $1 AND folder_location = $2`,
    [customerId(), req.params.id, status, req.body.vcisoNotes || null, req.body.rejectionReason || null, req.user.user_id]
  );
  if (!rowCount) throw httpError(404, 'No such evidence');
  res.json({ success: true, reviewStatus: status, reviewedBy: req.user.name, reviewedAt: new Date().toISOString() });
}

async function deleteEvidence(req, res) {
  const { rowCount } = await db.query('DELETE FROM customer_transactions WHERE customer_id = $1 AND folder_location = $2',
    [customerId(), req.params.id]);
  if (!rowCount) throw httpError(404, 'No such evidence');
  evidence.remove(req.params.id);
  res.json({ success: true });
}

// Control detail page
router.get('/vciso/control-evidence', wrap(async (req, res) => {
  const f = await framework(req.query.framework_id);
  res.json(await listEvidence('AND t.framework_id = $2 AND t.any_other = $3', [f.framework_id, String(req.query.control_id || '')]));
}));
router.post('/vciso/control-evidence', evidence.upload.array('files'), wrap(async (req, res) => {
  res.status(201).json(await storeEvidence(req, req.body.framework_id, req.body.control_id, req.body.requirement_name));
}));
router.delete('/vciso/control-evidence/:id', wrap(deleteEvidence));

// Questionnaire proof files (ISO / DPDP / CSPM questionnaire pages): one file, answered as { file }.
router.post('/vciso/evidence/upload', evidence.upload.array('files'), wrap(async (req, res) => {
  const [e] = await storeEvidence(req, req.body.framework_id, req.body.question_id || req.body.control_id, req.body.requirement_name);
  const f = req.files[0];
  res.status(201).json({ file: { ...e, mimetype: f.mimetype }, files: [e] });
}));

// vCISO main page
router.post('/vciso/vcisomainpage/evidence/upload', evidence.upload.array('files'), wrap(async (req, res) => {
  res.status(201).json(await storeEvidence(req, req.body.framework_id, req.body.control_id, req.body.reason));
}));
router.post('/vciso/vcisomainpage/evidence/:id/review', wrap(reviewEvidence));
router.delete('/vciso/vcisomainpage/evidence/:id', wrap(deleteEvidence));

// Everything the vCISO main page draws on: company, frameworks, register status per clause, evidence.
router.get('/vciso/vcisomainpage/data', wrap(async (_req, res) => {
  const { rows: [c] } = await db.query(
    `SELECT d.customer_id, d.customer_name, d.category, a.office_address, a.city, a.state, a.country, a.industry, a.office_id
       FROM master_customer_details d
       LEFT JOIN master_customer_address_details a ON a.customer_id = d.customer_id AND a.office_type = 'Primary'
      WHERE d.customer_id = $1`, [customerId()]);
  const { rows: contacts } = await db.query(
    `SELECT contact_person AS full_name, designation, contact_type, contact_email AS email FROM master_customer_contact_details
      WHERE customer_id = $1 AND active IS TRUE ORDER BY contact_priority NULLS LAST, contact_id`, [customerId()]);
  const { rows: fws } = await db.query(
    `SELECT DISTINCT f.framework_id, f.standard, f.framework_code FROM customer_contract_framework_map m
       JOIN master_framework f USING (framework_id) WHERE m.customer_id = $1 AND m.active IS TRUE ORDER BY 1`, [customerId()]);
  const { rows: clauses } = await db.query(
    `SELECT DISTINCT ON (c.clause_control_id) ${UI_CONTROL_ID} AS control_id, c.clause_control_ref AS clause_number,
            c.status, mf.framework_code
       FROM customer_clause_control_map c JOIN master_clause_control_map m ON m.clause_control_id = c.clause_control_id
       JOIN master_framework mf ON mf.framework_id = m.framework_id
      WHERE c.customer_id = $1 ORDER BY c.clause_control_id, c.office_id = $2 DESC`, [customerId(), c.office_id]);
  const clientClauses = clauses.map((r) => ({
    control_id: r.control_id, clause_number: r.clause_number, status: ctx.uiStatus(r.status), framework_id: ctx.slugOf(r.framework_code),
  }));
  res.json({
    client: { id: c.customer_id, name: c.customer_name, industry: c.industry },
    clientId: c.customer_id,
    companyInfo: {
      company_name: c.customer_name, legal_name: c.customer_name, address: c.office_address, city: c.city, state: c.state,
      country: c.country, company_size: c.category, num_employees: null, website: null, industry: c.industry, company_branch: c.office_id,
    },
    contacts,
    frameworkSelections: fws.map((f) => f.standard),
    frameworks: fws.map((f) => ({ ...f, slug: ctx.slugOf(f.framework_code) })),
    assessments: [], isoAssessment: null, dpdpAssessment: null, cspmAssessment: null, cspmResponses: [], cloudProviders: [],
    steps: [], masterTypes: [], implementationSteps: [],
    clientClauses,
    clientControls: clientClauses,
    evidences: await listEvidence(),
  });
}));

// ---------------------------------------------------------------- assets (Customer-Asset-Owner)

// UI asset -> register row: the identifier goes to asset_desc and, by type, to ip or url;
// the type is kept in any_other and the tags in remarks.
const ASSET_SQL = `
  SELECT a.asset_id AS id, COALESCE(a.any_other, 'Other') AS asset_type, a.asset_desc AS value, COALESCE(a.internet, FALSE) AS internet_facing,
         a.remarks AS tags, a.created_at, a.owner_id, u.user_name AS owner_name, a.ip, a.url
    FROM customer_asset_owner a LEFT JOIN customer_framework_users u ON u.user_id = a.owner_id
   WHERE a.customer_id = $1 AND a.active IS NOT FALSE`;
const TYPES = ['IP', 'Hostname', 'Domain', 'URL', 'Server', 'Database', 'Cloud Resource', 'Other'];
const placement = (type, value) => (type === 'IP' ? { ip: value, url: null } : ['URL', 'Domain', 'Hostname'].includes(type) ? { ip: null, url: value } : { ip: null, url: null });

router.get('/vciso/assets', wrap(async (_req, res) => {
  const { rows } = await db.query(`${ASSET_SQL} ORDER BY a.created_at DESC`, [customerId()]);
  res.json(rows);
}));

router.post('/vciso/assets', wrap(async (req, res) => {
  const type = TYPES.includes(req.body.asset_type) ? req.body.asset_type : 'Other';
  const value = String(req.body.value || '').trim();
  if (!value) throw httpError(400, 'Enter the asset value');
  const scope = await ctx.clientScope();
  const id = `AST_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  const { ip, url } = placement(type, value);
  await db.query(
    `INSERT INTO customer_asset_owner (customer_id, address_id, fy_id, contract_id, asset_id, asset_desc, ip, url, internet,
       any_other, remarks, active, for_customer_or_internal, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, 'C', $12)`,
    [customerId(), scope.office_id, scope.fy_id, scope.contract_id, id, value, ip, url, !!req.body.internet_facing, type,
     req.body.tags || null, req.user.user_id]
  );
  const { rows } = await db.query(`${ASSET_SQL} AND a.asset_id = $2`, [customerId(), id]);
  res.status(201).json(rows[0]);
}));

router.put('/vciso/assets/:id', wrap(async (req, res) => {
  const sets = [];
  const params = [customerId(), req.params.id];
  const put = (col, v) => { params.push(v); sets.push(`${col} = $${params.length}`); };
  if (req.body.value !== undefined) put('asset_desc', String(req.body.value).trim());
  if (req.body.tags !== undefined) put('remarks', req.body.tags);
  if (req.body.internet_facing !== undefined) put('internet', !!req.body.internet_facing);
  if (req.body.asset_type !== undefined) put('any_other', TYPES.includes(req.body.asset_type) ? req.body.asset_type : 'Other');
  if (req.body.owner !== undefined) put('owner_id', await ctx.resolveUser(req.body.owner));
  if (!sets.length) throw httpError(400, 'Nothing to update');
  put('updated_by', req.user.user_id);
  const { rowCount } = await db.query(
    `UPDATE customer_asset_owner SET ${sets.join(', ')}, updated_at = now() WHERE customer_id = $1 AND asset_id = $2`, params);
  if (!rowCount) throw httpError(404, 'No such asset');
  // keep ip / url in step with the identifier and type
  await db.query(
    `UPDATE customer_asset_owner SET ip = CASE WHEN any_other = 'IP' THEN asset_desc END,
            url = CASE WHEN any_other IN ('URL', 'Domain', 'Hostname') THEN asset_desc END
      WHERE customer_id = $1 AND asset_id = $2`, [customerId(), req.params.id]);
  const { rows } = await db.query(`${ASSET_SQL} AND a.asset_id = $2`, [customerId(), req.params.id]);
  res.json(rows[0]);
}));

// Assets referenced by findings are deactivated rather than deleted, so the history stays.
router.delete('/vciso/assets/:id', wrap(async (req, res) => {
  const { rowCount } = await db.query(
    `UPDATE customer_asset_owner SET active = FALSE, updated_at = now(), updated_by = $3 WHERE customer_id = $1 AND asset_id = $2`,
    [customerId(), req.params.id, req.user.user_id]);
  if (!rowCount) throw httpError(404, 'No such asset');
  res.json({ success: true });
}));

// Asset owners as the Vulnerabilities page lists them (?client_id is ignored: one client per instance).
router.get('/assets', wrap(async (_req, res) => {
  const { rows } = await db.query(
    `SELECT a.asset_id AS id, u.user_name AS name, u.user_email AS email, u.department, u.user_mobile AS phone,
            COALESCE(a.url, a.asset_desc) AS host, COALESCE(a.ip, a.public_ip) AS ip_address, a.url AS dns_name,
            CASE WHEN a.internet THEN 'External' ELSE 'Internal' END AS facing
       FROM customer_asset_owner a LEFT JOIN customer_framework_users u ON u.user_id = a.owner_id
      WHERE a.customer_id = $1 AND a.active IS NOT FALSE ORDER BY a.asset_id`, [customerId()]);
  res.json(rows);
}));

router.use(require('./assessments').router);

module.exports = { name: 'compliance', prefix: '/api', router };
