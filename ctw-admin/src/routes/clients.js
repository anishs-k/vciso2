// Clients CTW has onboarded. A client is read and written as a whole spec (intake/intake_schema.json);
// lib/spec-import.js and lib/spec-build.js map it to and from the tables.
//
// Status: POST and PUT leave a client 'draft' (a 'ready' client that is edited drops back to 'draft');
// POST /:id/validate moves a draft that passes to 'ready'. 'generated' / 'live' come from builds.
const express = require('express');
const db = require('../db');
const { wrap, httpError } = require('../http');
const { importSpec, replaceSpec } = require('../../lib/spec-import');
const { previewContractId, currentContractId, planContractId, applyContractPlan } = require('../../lib/contract-id');
const { buildSpec } = require('../../lib/spec-build');
const { validateSpec } = require('../../lib/python');

const router = express.Router();

function requireSpec(body) {
  if (!body || typeof body.organization !== 'object' || body.organization === null) {
    throw httpError(400, 'Body must be a client spec with an "organization" object');
  }
  return body;
}

router.get('/', wrap(async (_req, res) => {
  const { rows } = await db.query(`
    SELECT c.customer_id, c.customer_name, c.category, c.industry, c.status, c.created_at, c.updated_at,
           k.contract_end_date, l.valid_to,
           (SELECT count(*)::int FROM ctw_client_office o WHERE o.customer_id = c.customer_id) AS offices,
           (SELECT count(*)::int FROM ctw_client_initial_user u WHERE u.customer_id = c.customer_id) AS initial_users,
           COALESCE((SELECT array_agg(m.module_name ORDER BY cm.sort_order)
                       FROM ctw_licence_module m JOIN ctw_module cm USING (module_name)
                      WHERE m.customer_id = c.customer_id), '{}') AS modules,
           COALESCE((SELECT array_agg(f.framework_id ORDER BY f.framework_id)
                       FROM ctw_licence_framework f WHERE f.customer_id = c.customer_id), '{}') AS frameworks,
           b.last_build
      FROM ctw_client c
      LEFT JOIN ctw_contract k ON k.customer_id = c.customer_id AND k.is_current
      LEFT JOIN ctw_licence l ON l.customer_id = c.customer_id
      LEFT JOIN LATERAL (
        SELECT json_build_object('build_id', build_id, 'version', version, 'build_type', build_type,
                                 'status', status, 'image_tag', image_tag, 'finished_at', finished_at) AS last_build
          FROM ctw_build WHERE customer_id = c.customer_id ORDER BY version DESC LIMIT 1
      ) b ON true
     ORDER BY c.customer_id`);
  res.json(rows);
}));

// The contract ID the next generated one would be for this customer ID (the number is not used up).
router.get('/next-contract-id', wrap(async (req, res) => {
  const customerId = String(req.query.customer_id || '').trim();
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(customerId)) throw httpError(400, 'customer_id is required');
  res.json({ contract_id: await previewContractId(db, customerId) });
}));

router.get('/:id', wrap(async (req, res) => {
  const { rows } = await db.query(
    'SELECT customer_id, status, created_at, updated_at FROM ctw_client WHERE customer_id = $1',
    [req.params.id],
  );
  if (!rows.length) throw httpError(404, 'Client not found');
  res.json({ ...rows[0], spec: await buildSpec(db, req.params.id) });
}));

router.post('/', wrap(async (req, res) => {
  const spec = requireSpec(req.body);
  const id = spec.organization.customer_id;
  if (!id) throw httpError(400, 'organization.customer_id is required');
  // The contract ID: as entered if no other client has it, else generated (lib/contract-id.js).
  try {
    await db.tx(async (c) => {
      const { rows } = await c.query('SELECT 1 FROM ctw_client WHERE customer_id = $1', [id]);
      if (rows.length) throw Object.assign(new Error('exists'), { code: 'exists' });
      const plan = await planContractId(c, id, spec.contract?.contract_id, null);
      spec.contract = { ...spec.contract, contract_id: plan.contractId };
      await importSpec(c, spec, { adminId: req.admin.admin_id, status: 'draft' });
      spec.contract.contract_id = await applyContractPlan(c, id, plan);
    });
  } catch (err) {
    if (err.code === 'exists') throw httpError(409, `Client ${id} already exists`);
    if (err.code === 'contract_taken') throw httpError(409, err.message);
    throw err;
  }
  res.status(201).json({ customer_id: id, status: 'draft', contract_id: spec.contract.contract_id });
}));

router.put('/:id', wrap(async (req, res) => {
  const spec = requireSpec(req.body);
  const id = req.params.id;
  if (spec.organization.customer_id && spec.organization.customer_id !== id) {
    throw httpError(400, 'The customer ID cannot be changed');
  }
  spec.organization.customer_id = id;
  try {
    // The contract ID as on create; left empty, the current one stays.
    const status = await db.tx(async (c) => {
      const plan = await planContractId(c, id, spec.contract?.contract_id, await currentContractId(c, id));
      spec.contract = { ...spec.contract, contract_id: plan.contractId };
      const status = await replaceSpec(c, id, spec, { adminId: req.admin.admin_id });
      spec.contract.contract_id = await applyContractPlan(c, id, plan);
      return status;
    });
    res.json({ customer_id: id, status, contract_id: spec.contract.contract_id });
  } catch (err) {
    if (err.code === 'not_found') throw httpError(404, 'Client not found');
    if (err.code === 'contract_taken') throw httpError(409, err.message);
    throw err;
  }
}));

// Runs intake/client_intake.py's validator on the stored client.
router.post('/:id/validate', wrap(async (req, res) => {
  const id = req.params.id;
  const spec = await buildSpec(db, id);
  if (!spec) throw httpError(404, 'Client not found');
  const errors = await validateSpec(spec);
  const { rows } = await db.query(
    `UPDATE ctw_client SET status = CASE
        WHEN status IN ('draft', 'ready') THEN (CASE WHEN $2 THEN 'ready' ELSE 'draft' END)
        ELSE status END
      WHERE customer_id = $1 RETURNING status`,
    [id, errors.length === 0],
  );
  await db.query(
    `INSERT INTO ctw_audit_log (admin_id, action, customer_id, details) VALUES ($1, 'client.validate', $2, $3)`,
    [req.admin.admin_id, id, { valid: errors.length === 0, errors: errors.length }],
  );
  res.json({ valid: errors.length === 0, errors, status: rows[0].status });
}));

// Only a client that was never built: builds are the record of what was shipped.
router.delete('/:id', wrap(async (req, res) => {
  const id = req.params.id;
  await db.tx(async (c) => {
    const { rows } = await c.query(
      `SELECT (SELECT count(*)::int FROM ctw_build b WHERE b.customer_id = $1) AS builds
         FROM ctw_client WHERE customer_id = $1 FOR UPDATE`,
      [id],
    );
    if (!rows.length) throw httpError(404, 'Client not found');
    if (rows[0].builds) throw httpError(409, 'This client has builds and cannot be deleted; suspend it instead');
    await c.query('DELETE FROM ctw_client WHERE customer_id = $1', [id]);
    await c.query(`INSERT INTO ctw_audit_log (admin_id, action, customer_id) VALUES ($1, 'client.delete', $2)`, [
      req.admin.admin_id,
      id,
    ]);
  });
  res.json({ success: true });
}));

module.exports = router;
