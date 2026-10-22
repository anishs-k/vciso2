// Choices for the onboarding form. The fixed lists mirror the CHECK constraints in db/001_ctw_schema.sql
// and the enums in intake/intake_schema.json.
const express = require('express');
const db = require('../db');
const { wrap } = require('../http');

const router = express.Router();

const OPTIONS = {
  categories: ['Enterprise', 'Mid-Market', 'SMB', 'Government', 'Financial Institution'],
  office_types: ['Primary', 'Secondary', 'Data Center', 'Regional Office'],
  contact_types: ['Executive', 'Primary vCISO', 'IT Security', 'Escalation', 'Emergency'],
  contract_types: ['Original', 'Extension', 'AMC', 'AR', 'CR'],
  invoicing_frequencies: [
    { value: 'M', label: 'Monthly' },
    { value: 'Q', label: 'Quarterly' },
    { value: 'H', label: 'Half-yearly' },
    { value: 'Y', label: 'Yearly' },
  ],
  tools: ['Tenable', 'Qualys', 'Rapid7', 'Greenbone', 'McAfee', 'Zscaler'],
  sso_types: ['LOCAL', 'SAML_2_0', 'OIDC', 'AZURE_AD', 'OKTA'],
  role_types: ['vCISO', 'Organisation Owner', 'IT Admin', 'Control Owner', 'Auditor', 'Viewer'],
  client_statuses: ['draft', 'ready', 'generated', 'live', 'suspended'],
};

router.get('/frameworks', wrap(async (_req, res) => {
  const { rows } = await db.query(
    'SELECT framework_id, framework_name FROM ctw_framework WHERE active ORDER BY framework_id',
  );
  res.json(rows);
}));

router.get('/modules', wrap(async (_req, res) => {
  const { rows } = await db.query('SELECT module_name, mandatory FROM ctw_module ORDER BY sort_order');
  res.json(rows);
}));

router.get('/options', (_req, res) => res.json(OPTIONS));

// Places for an office (db/004_geo.sql, loaded by `npm run db:geo`): countries, then a country's states,
// then a state's cities, each sorted by name. Countries carry their phone calling code and number
// lengths (db/005_phone.sql) for the phone boxes.
router.get('/geo/countries', wrap(async (_req, res) => {
  const { rows } = await db.query(
    'SELECT iso2 AS code, name, phone_code, phone_lengths, phone_main FROM ctw_geo_country ORDER BY name',
  );
  res.json(rows);
}));

router.get('/geo/countries/:country/states', wrap(async (req, res) => {
  const { rows } = await db.query(
    'SELECT state_code AS code, name FROM ctw_geo_state WHERE country_iso2 = $1 ORDER BY name',
    [req.params.country],
  );
  res.json(rows);
}));

router.get('/geo/countries/:country/states/:state/cities', wrap(async (req, res) => {
  const { rows } = await db.query(
    'SELECT DISTINCT name FROM ctw_geo_city WHERE country_iso2 = $1 AND state_code = $2 ORDER BY name',
    [req.params.country, req.params.state],
  );
  res.json(rows.map((r) => r.name));
}));

module.exports = router;
