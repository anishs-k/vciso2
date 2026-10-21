// Vulnerabilities: findings in vulnerability_finding (architecture 6.1), shaped for the vCISO UI.
// Scanner connectors (WP5), Tenable and scan-file import are not built yet and say so.
const crypto = require('crypto');
const express = require('express');
const db = require('../../db');
const auth = require('../../auth');
const ctx = require('../../core/context');

const router = express.Router();
const { wrap, customerId } = ctx;
router.use(auth.requireUser);

const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });
const SEVERITY = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info' };
const STATUSES = ['open', 'in_progress', 'remediated', 'reappeared', 'risk_accepted', 'false_positive'];
// Architecture 6.1 SLA days by severity.
const SLA_DAYS = { Critical: 10, High: 30, Medium: 60, Low: 90 };

const severityIn = (s) => SEVERITY[String(s || '').toLowerCase()] || null;

// Finding + its asset's owner (Customer-Asset-Owner -> Customer-Framework-Users).
const FINDING_SQL = `
  SELECT f.finding_id AS id, f.title, f.cve, lower(f.severity) AS severity, COALESCE(a.asset_desc, f.unmapped_asset, f.asset_id) AS asset,
         f.asset_id, f.cvss::float AS cvss_score, f.status, f.description, NULL AS impact, NULL AS recommendation, f.sla_due AS due_date,
         f.first_seen AS discovered_at, f.created_at AS uploaded_at, f.remediated_at, f.last_seen,
         CASE WHEN f.tool_id IS NULL THEN 'manual' ELSE COALESCE(t.tool_name, 'scanner') END AS source,
         u.user_name AS owner_name, u.user_email AS owner_email, u.department AS owner_department, u.user_mobile AS owner_phone,
         a.url AS owner_host, a.ip AS owner_ip, a.url AS owner_dns,
         CASE WHEN a.internet THEN 'External' WHEN a.asset_id IS NOT NULL THEN 'Internal' END AS owner_facing,
         a.url AS host, a.ip AS ip_address, f.asset_id IS NULL AS unmapped
    FROM vulnerability_finding f
    LEFT JOIN customer_asset_owner a ON a.asset_id = f.asset_id
    LEFT JOIN customer_framework_users u ON u.user_id = a.owner_id
    LEFT JOIN LATERAL (SELECT tool_name FROM tool_api_map WHERE tool_id = f.tool_id LIMIT 1) t ON TRUE
   WHERE f.customer_id = $1`;

router.get('/vciso/vulnerabilities', wrap(async (req, res) => {
  const params = [customerId()];
  let where = '';
  if (req.query.severity && req.query.severity !== 'all') { params.push(severityIn(req.query.severity)); where += ` AND f.severity = $${params.length}`; }
  if (req.query.status && req.query.status !== 'all') { params.push(req.query.status); where += ` AND f.status = $${params.length}`; }
  const { rows } = await db.query(`${FINDING_SQL}${where} ORDER BY f.cvss DESC NULLS LAST, f.first_seen DESC`, params);
  res.json(rows);
}));

// The asset a finding names: an asset ID, or an identifier (IP / host) registered in the asset register.
async function assetFor(value) {
  if (!value) return { asset_id: null, unmapped_asset: null };
  const { rows } = await db.query(
    `SELECT asset_id FROM customer_asset_owner WHERE customer_id = $1 AND active IS NOT FALSE
        AND (asset_id = $2 OR asset_desc = $2 OR ip = $2 OR url = $2) LIMIT 1`, [customerId(), String(value).trim()]);
  return rows[0] ? { asset_id: rows[0].asset_id, unmapped_asset: null } : { asset_id: null, unmapped_asset: String(value).trim() };
}

// A finding entered by hand (no scanner).
router.post('/vciso/vulnerabilities', wrap(async (req, res) => {
  const severity = severityIn(req.body.severity);
  if (!req.body.title || !severity) throw httpError(400, 'Title and a severity (critical, high, medium, low) are required');
  const status = STATUSES.includes(req.body.status) ? req.body.status : 'open';
  const { asset_id, unmapped_asset } = await assetFor(req.body.asset);
  const id = `VULN_${crypto.randomUUID()}`;
  const cvss = req.body.cvss_score === '' || req.body.cvss_score == null ? null : Number(req.body.cvss_score);
  await db.query(
    `INSERT INTO vulnerability_finding (finding_id, customer_id, source_finding_id, asset_id, unmapped_asset, cve, cvss, severity,
       status, title, description, sla_due)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::date, CURRENT_DATE + $13::int))`,
    [id, customerId(), `manual:${id}`, asset_id, unmapped_asset, req.body.cve || null, cvss, severity, status, req.body.title,
     req.body.description || null, req.body.due_date || null, SLA_DAYS[severity] ?? 90]
  );
  const { rows } = await db.query(`${FINDING_SQL} AND f.finding_id = $2`, [customerId(), id]);
  res.status(201).json(rows[0]);
}));

// Status changes. Owner details belong to the asset (Customer-Asset-Owner), not the finding.
router.patch('/vciso/vulnerabilities/:id', wrap(async (req, res) => {
  const ownerFields = Object.keys(req.body).filter((k) => k.startsWith('owner_'));
  if (ownerFields.length && req.body.status === undefined) {
    throw httpError(400, 'A finding\'s owner comes from its asset: assign the owner in the asset register');
  }
  if (!STATUSES.includes(req.body.status)) throw httpError(400, `status must be one of ${STATUSES.join(', ')}`);
  const { rowCount } = await db.query(
    `UPDATE vulnerability_finding SET status = $3, updated_at = now(),
            remediated_at = CASE WHEN $3 = 'remediated' THEN COALESCE(remediated_at, now()) ELSE NULL END
      WHERE customer_id = $1 AND finding_id = $2`, [customerId(), req.params.id, req.body.status]);
  if (!rowCount) throw httpError(404, 'No such finding');
  const { rows } = await db.query(`${FINDING_SQL} AND f.finding_id = $2`, [customerId(), req.params.id]);
  res.json(rows[0]);
}));

// Findings from scanners only, in the shape of the old live-data feed (SecurityDashboard, Vulnerabilities).
router.get('/vciso/security/live-data', wrap(async (_req, res) => {
  const { rows } = await db.query(
    `${FINDING_SQL} AND f.tool_id IS NOT NULL AND f.status IN ('open', 'reappeared', 'in_progress') ORDER BY f.cvss DESC NULLS LAST`,
    [customerId()]);
  res.json({
    vulnerabilities: rows.map((v) => ({
      id: v.id, title: v.title, severity: v.severity, asset: v.asset, cvss: v.cvss_score, status: v.status,
      firstSeen: v.discovered_at, lastSeen: v.last_seen, source: v.source, category: 'network',
    })),
    note: rows.length ? null : 'No scanner findings yet: scanner connectors are not available in this platform version.',
  });
}));

// Scanner connectors, Tenable and scan-file import (SOW WP5) are not built yet.
router.get('/connectors', (_req, res) => res.json({ connectors: [], summary: { provided: 0, total: 0 } }));
router.all('/connectors/*', ctx.notAvailable('Scanner connectors'));
router.all('/vciso/tenable/*', ctx.notAvailable('The Tenable connector'));
router.get('/sources/config', (_req, res) => res.json({ runFromPath: null, batchSync: { configured: false }, supportedExtensions: [] }));
router.post('/sources/:action', ctx.notAvailable('Scan-file import'));
router.get('/clients/:clientId/sync-schedules', ctx.ownClient(), (_req, res) => res.json({ schedules: [] }));
router.post('/clients/:clientId/sync-schedules', ctx.notAvailable('Scan sync schedules'));
router.all('/sync-schedules/:id', ctx.notAvailable('Scan sync schedules'));

module.exports = { name: 'vulnerabilities', prefix: '/api', router };
