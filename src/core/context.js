// Shared helpers for routes: the one client this instance serves, framework slugs as the UI names
// them, and the rule that turns a control register row into the control ID the UI shows.
const db = require('../db');
const instance = require('../instance');

const customerId = () => instance.state.instance.customer_id;
const licensed = (module) => instance.state.instance.licensed_modules.includes(module);

// The client's own scope: primary office, current financial year and contract (all from install).
let scope;
async function clientScope() {
  if (!scope) {
    const { rows } = await db.query(
      `SELECT c.office_id, c.fy_id, c.contract_id, c.contract_start_date, c.contract_end_date, c.contract_value,
              c.contract_period_months, c.customer_ref_po
         FROM master_customer_contract_detail c WHERE c.customer_id = $1 AND c.active IS TRUE
        ORDER BY c.contract_start_date DESC LIMIT 1`,
      [customerId()]
    );
    if (!rows[0]) throw Object.assign(new Error('The client register has no active contract'), { status: 500, expose: true });
    scope = rows[0];
  }
  return scope;
}

// Framework_ID (workbook Framework_ID short code) -> slug used by the UI (frameworkCatalog.js).
const SLUG_BY_CODE = {
  ISO27001: 'iso-27001', DPDPA: 'dpdp', DPDP: 'dpdp', ISO9001: 'iso-9001', ISO22301: 'iso-22301', ISO31000: 'iso-31000',
  ISO45001: 'iso-45001', 'NISTSP800-52V5': 'nist-800-53', 'NIST-CSF2': 'nist-csf', PCIDSSV4: 'pci-dss',
  COBIT2019: 'cobit-2019', TOGAFV10: 'togaf-10', ISA62443: 'isa-62443', IEC61508: 'iec-61508', IEC61511: 'iec-61511',
  'NERC-CIP': 'nerc-cip', ISO27017: 'iso-27017', ISO27701: 'iso-27701', 'GDPR-UK': 'gdpr', 'EU-Privacy-Act': 'eu-ai-act',
};

const slugOf = (code) => SLUG_BY_CODE[code] || String(code || '').toLowerCase();

// Any spelling the UI sends (iso-27001, iso27001-2022, dpdpa, 102 ...) -> licensed framework row.
async function resolveFramework(key) {
  const k = String(key || '').toLowerCase();
  const { rows } = await db.query('SELECT framework_id, framework_code, standard FROM master_framework ORDER BY framework_id');
  return rows.find((f) => {
    const slug = slugOf(f.framework_code);
    if (k === String(f.framework_id) || k === slug || k === String(f.framework_code).toLowerCase()) return true;
    if (slug === 'dpdp') return k.includes('dpdp');
    if (slug === 'iso-27001') return k.includes('27001') && !k.includes('27017');
    return false;
  }) || null;
}

// The control ID the UI uses. ISO/IEC 27001 numbers Annex A controls like its clauses (5.1 is both
// "Leadership" and "Policies for information security"), so controls get the A. prefix the UI uses;
// other frameworks use the workbook's own code (DPDP-CN-01) where it has one.
const UI_CONTROL_ID = `CASE
    WHEN mf.framework_code = 'ISO27001' AND m.control_controltype = 'Control' THEN 'A.' || m.clause_control_sub_ref_no
    WHEN mf.framework_code = 'ISO27001' THEN COALESCE(m.clause_control_sub_ref_no, m.clause_control_ref_no)
    ELSE COALESCE(m.source_clause_control_id, m.clause_control_sub_ref_no, m.clause_control_id::text) END`;

// DB status <-> UI status. Install leaves controls 'Not Started', which the UI calls not_assessed.
const uiStatus = (s) => (!s || s === 'Not Started' ? 'not_assessed' : s);
const yn = (b) => (b === null || b === undefined ? null : b ? 'Y' : 'N');
const fromYn = (v) => (v === undefined ? undefined : v === null || v === '' ? null : ['y', 'yes', 'true', true, 1, '1'].includes(typeof v === 'string' ? v.toLowerCase() : v));

// A user named in a form (user ID, login ID, email or exact name) -> user_id, or an error.
async function resolveUser(value) {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === '') return null;
  const v = String(value).trim();
  const { rows } = await db.query(
    `SELECT user_id FROM customer_framework_users
      WHERE customer_id = $1 AND (user_id = $2 OR lower(login_id) = lower($2) OR lower(user_email) = lower($2) OR lower(user_name) = lower($2))`,
    [customerId(), v]
  );
  if (rows.length !== 1) {
    throw Object.assign(new Error(`"${v}" is not ${rows.length ? 'a unique' : 'a'} user of this organisation`), { status: 400, expose: true });
  }
  return rows[0].user_id;
}

// For UI features the client database has no table for yet: say so instead of pretending to save.
function notInSchema(feature) {
  return (_req, res) => res.status(501).json({
    error: `${feature} is not stored by this platform version yet (no table for it in the client database).`,
    code: 'not_in_client_schema',
  });
}

function notAvailable(feature) {
  return (_req, res) => res.status(501).json({ error: `${feature} is not available in this platform version yet.`, code: 'not_available' });
}

// 404 unless :clientId is this instance's client (the UI still passes client IDs from its SaaS days).
function ownClient(param = 'clientId') {
  return (req, res, next) => (req.params[param] === customerId() ? next() : res.status(404).json({ error: 'Unknown client' }));
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = {
  customerId, licensed, clientScope, slugOf, resolveFramework, UI_CONTROL_ID, uiStatus, yn, fromYn, resolveUser,
  notInSchema, notAvailable, ownClient, wrap,
};
