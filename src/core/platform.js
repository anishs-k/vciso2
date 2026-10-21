// Instance-level data every client gets: settings (platform_setting), tool integrations
// (customer_tool_integration) and the threat-intelligence cache (threat_intel_feed / _match).
// Secrets are encrypted in the database with the instance's data key from link.json.
const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const auth = require('../auth');
const instance = require('../instance');
const ctx = require('./context');

const router = express.Router();
const { wrap, customerId } = ctx;
router.use(auth.requireUser);

const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });

// ---------------------------------------------------------------- settings

const PLAIN_SETTINGS = ['smtp_enabled', 'smtp_host', 'smtp_port', 'smtp_username', 'smtp_from',
  'jira_enabled', 'jira_url', 'jira_project_key', 'jira_email'];
const SECRET_SETTINGS = ['smtp_password', 'jira_api_token', 'otx_api_key'];

// Plain values as stored; for a secret only whether it is set (`<key>_set`), never the value.
router.get('/settings', wrap(async (_req, res) => {
  const { rows } = await db.query('SELECT setting_key, value, secret_encrypted IS NOT NULL AS secret FROM platform_setting WHERE customer_id = $1', [customerId()]);
  const out = {};
  for (const r of rows) {
    if (r.secret) out[`${r.setting_key}_set`] = true;
    else out[r.setting_key] = r.value;
  }
  res.json(out);
}));

async function saveSetting(key, value, userId) {
  if (!PLAIN_SETTINGS.includes(key) && !SECRET_SETTINGS.includes(key)) throw httpError(400, `Unknown setting "${key}"`);
  const v = value === undefined || value === null ? '' : String(value);
  if (v === '') {
    await db.query('DELETE FROM platform_setting WHERE customer_id = $1 AND setting_key = $2', [customerId(), key]);
  } else if (SECRET_SETTINGS.includes(key)) {
    await db.query(
      `INSERT INTO platform_setting (customer_id, setting_key, secret_encrypted, updated_by) VALUES ($1, $2, pgp_sym_encrypt($3, $4), $5)
       ON CONFLICT (customer_id, setting_key) DO UPDATE SET value = NULL, secret_encrypted = EXCLUDED.secret_encrypted,
         updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [customerId(), key, v, instance.dataKey(), userId]);
  } else {
    await db.query(
      `INSERT INTO platform_setting (customer_id, setting_key, value, updated_by) VALUES ($1, $2, $3, $4)
       ON CONFLICT (customer_id, setting_key) DO UPDATE SET value = EXCLUDED.value, secret_encrypted = NULL,
         updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [customerId(), key, v, userId]);
  }
}

router.post('/settings', wrap(async (req, res) => {
  await saveSetting(req.body.key, req.body.value, req.user.user_id);
  res.json({ success: true });
}));
router.post('/settings/batch', wrap(async (req, res) => {
  const values = req.body.settings || {};
  for (const [k, v] of Object.entries(values)) await saveSetting(k, v, req.user.user_id);
  res.json({ success: true, saved: Object.keys(values).length });
}));

// ---------------------------------------------------------------- tool integrations

// Every tool the client licensed (Tool-API-Map) plus every connection saved, one row per tool.
router.get('/vciso/integrations', wrap(async (_req, res) => {
  const { rows } = await db.query(
    `WITH catalogue AS (
       SELECT 'vulnerability-management' AS module_slug, tool_name, min(api_target_loc) AS api_url, count(*)::int AS apis
         FROM tool_api_map GROUP BY tool_name)
     SELECT COALESCE(i.module_slug, c.module_slug) AS module_slug, COALESCE(i.tool_name, c.tool_name) AS tool_name,
            i.integration_id, COALESCE(i.api_url, c.api_url, '') AS api_url, COALESCE(i.username, '') AS username,
            COALESCE(i.webhook_url, '') AS webhook_url, COALESCE(i.notes, CASE WHEN c.apis IS NOT NULL THEN c.apis || ' API(s) licensed' END, '') AS notes,
            CASE WHEN i.enabled THEN 1 ELSE 0 END AS enabled, i.secret_encrypted IS NOT NULL AS has_secret,
            i.test_status, i.test_detail, i.last_tested_at, i.updated_at, c.tool_name IS NOT NULL AS in_catalogue
       FROM catalogue c FULL JOIN (SELECT * FROM customer_tool_integration WHERE customer_id = $1) i
         ON i.tool_name = c.tool_name AND i.module_slug = c.module_slug
      ORDER BY 1, 2`,
    [customerId()]);
  res.json(rows);
}));

// Save a connection. An empty api_key keeps the stored secret, except when the connection is being
// cleared (disabled with no URL), which also forgets the secret.
router.post('/vciso/integrations', wrap(async (req, res) => {
  const b = req.body;
  const slug = String(b.module_slug || '').trim();
  const tool = String(b.tool_name || '').trim();
  if (!slug || !tool) throw httpError(400, 'module_slug and tool_name are required');
  const enabled = b.enabled === 1 || b.enabled === true || b.enabled === '1';
  const clearing = !enabled && !b.api_url && !b.username;
  const key = b.api_key ? String(b.api_key) : null;
  await db.query(
    `INSERT INTO customer_tool_integration (integration_id, customer_id, module_slug, tool_name, api_url, username, webhook_url, notes,
       enabled, secret_encrypted, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CASE WHEN $10::text IS NULL THEN NULL ELSE pgp_sym_encrypt($10, $11) END, $12, now())
     ON CONFLICT (customer_id, module_slug, tool_name) DO UPDATE SET
       api_url = EXCLUDED.api_url, username = EXCLUDED.username, webhook_url = EXCLUDED.webhook_url, notes = EXCLUDED.notes,
       enabled = EXCLUDED.enabled, updated_by = EXCLUDED.updated_by, updated_at = now(),
       secret_encrypted = CASE WHEN $13 THEN NULL WHEN $10::text IS NULL THEN customer_tool_integration.secret_encrypted
                               ELSE EXCLUDED.secret_encrypted END,
       test_status = CASE WHEN $13 THEN NULL ELSE customer_tool_integration.test_status END`,
    [`INT_${crypto.randomUUID()}`, customerId(), slug, tool, b.api_url || null, b.username || null, b.webhook_url || null,
     b.notes || null, enabled, key, instance.dataKey(), req.user.user_id, clearing]);
  res.json({ success: true });
}));

// Can the platform reach the tool's API URL? (Reachability only: the connectors that log in and pull
// findings are not built yet.)
router.post('/vciso/integrations/test', wrap(async (req, res) => {
  const { rows } = await db.query(
    'SELECT integration_id, api_url FROM customer_tool_integration WHERE customer_id = $1 AND tool_name = $2 ORDER BY updated_at DESC NULLS LAST LIMIT 1',
    [customerId(), String(req.body.tool_name || '')]);
  if (!rows[0]?.api_url) throw httpError(400, 'Save the tool\'s API URL first');
  let ok = false;
  let detail;
  try {
    const r = await fetch(rows[0].api_url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(8000) });
    ok = true;
    detail = `Reachable (HTTP ${r.status}). Credentials are checked once the connector for this tool is available.`;
  } catch (err) {
    detail = `Cannot reach ${rows[0].api_url}: ${err.cause?.code || err.name === 'TimeoutError' ? 'timed out' : err.message}`;
  }
  await db.query(
    'UPDATE customer_tool_integration SET test_status = $2, test_detail = $3, last_tested_at = now() WHERE integration_id = $1',
    [rows[0].integration_id, ok ? 'ok' : 'failed', detail]);
  res.json({ ok, detail });
}));

// ---------------------------------------------------------------- threat intelligence

const SEVERITIES = ['critical', 'high', 'medium', 'low'];

router.get('/vciso/threat-intel', wrap(async (_req, res) => {
  const cid = customerId();
  const { rows: matches } = await db.query(
    `SELECT match_id AS id, asset_value, cve_id, threat_title, severity, source, details, status, first_seen, last_seen
       FROM threat_intel_match WHERE customer_id = $1 AND status <> 'dismissed' ORDER BY last_seen DESC LIMIT 500`, [cid]);
  let engine = [];
  if (ctx.licensed('alerting')) {
    ({ rows: engine } = await db.query(
      `SELECT alert_id AS id, source_ref AS asset_value, NULL AS cve_id, title AS threat_title, lower(severity) AS severity,
              alert_type AS source, json_build_object('summary', summary) AS details, status, created_at AS first_seen
         FROM alert WHERE customer_id = $1 AND status <> 'closed' ORDER BY created_at DESC LIMIT 200`, [cid]));
  }
  const { rows: feeds } = await db.query('SELECT source, data, fetched_at FROM threat_intel_feed WHERE customer_id = $1', [cid]);
  const cache = { cisa_kev: { data: [] }, otx_pulses: { data: [] } };
  for (const f of feeds) cache[f.source] = { data: f.data, fetched_at: f.fetched_at };
  const { rows: assets } = await db.query('SELECT ip, url FROM customer_asset_owner WHERE customer_id = $1 AND active IS NOT FALSE', [cid]);
  const ips = assets.map((a) => a.ip).filter(Boolean);
  const hostnames = assets.map((a) => a.url).filter(Boolean);
  res.json({ alerts: [...matches, ...engine], assets: { ips, hostnames, total: assets.length }, cache });
}));

async function saveFeed(source, data, userId) {
  if (!['cisa_kev', 'otx_pulses'].includes(source)) throw httpError(400, 'source must be cisa_kev or otx_pulses');
  if (!Array.isArray(data)) throw httpError(400, 'data must be a list');
  await db.query(
    `INSERT INTO threat_intel_feed (customer_id, source, data, fetched_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT (customer_id, source) DO UPDATE SET data = EXCLUDED.data, fetched_by = EXCLUDED.fetched_by, fetched_at = now()`,
    [customerId(), source, JSON.stringify(data), userId]);
}

router.post('/vciso/threat-intel/cache', wrap(async (req, res) => {
  await saveFeed(req.body.source, req.body.data, req.user.user_id);
  res.json({ success: true });
}));

// CISA Known Exploited Vulnerabilities, fetched by the platform when the client network allows it.
const CISA_KEV = process.env.CISA_KEV_URL || 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
router.get('/vciso/threat-intel/fetch-cisa', wrap(async (req, res) => {
  let feed;
  try {
    const r = await fetch(CISA_KEV, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    feed = await r.json();
  } catch (err) {
    return res.json({ items: [], error: `Could not fetch the CISA KEV feed from this network (${err.message}).` });
  }
  const items = (feed.vulnerabilities || []).map((v) => ({
    cveID: v.cveID, vulnerabilityName: v.vulnerabilityName, vendorProject: v.vendorProject, product: v.product,
    dateAdded: v.dateAdded, dueDate: v.dueDate, severity: v.knownRansomwareCampaignUse === 'Known' ? 'critical' : 'high',
  }));
  await saveFeed('cisa_kev', items, req.user.user_id);
  res.json({ items });
}));

// Feed items matched to the client's assets (the page does the matching); seen again = last_seen.
router.post('/vciso/threat-intel/alerts', wrap(async (req, res) => {
  const alerts = Array.isArray(req.body.alerts) ? req.body.alerts : [];
  let saved = 0;
  for (const a of alerts) {
    if (!a.asset_value || !a.threat_title) continue;
    const severity = SEVERITIES.includes(String(a.severity).toLowerCase()) ? String(a.severity).toLowerCase() : 'medium';
    await db.query(
      `INSERT INTO threat_intel_match (match_id, customer_id, source, cve_id, asset_value, asset_id, threat_title, severity, details)
       VALUES ($1, $2, $3, $4, $5,
               (SELECT asset_id FROM customer_asset_owner WHERE customer_id = $2 AND active IS NOT FALSE
                   AND $5 IN (asset_desc, ip, url, public_ip) LIMIT 1), $6, $7, $8)
       ON CONFLICT (customer_id, source, cve_id, asset_value) DO UPDATE SET last_seen = now(), threat_title = EXCLUDED.threat_title,
         severity = EXCLUDED.severity, details = EXCLUDED.details`,
      [`TI_${crypto.randomUUID()}`, customerId(), String(a.source || 'manual'), a.cve_id || null, String(a.asset_value),
       String(a.threat_title), severity, JSON.stringify(a.details || {})]);
    saved++;
  }
  res.json({ success: true, saved });
}));

router.patch('/vciso/threat-intel/alerts/:id', wrap(async (req, res) => {
  if (!['open', 'acknowledged', 'dismissed'].includes(req.body.status)) throw httpError(400, 'status must be open, acknowledged or dismissed');
  const { rowCount } = await db.query('UPDATE threat_intel_match SET status = $3 WHERE customer_id = $1 AND match_id = $2',
    [customerId(), req.params.id, req.body.status]);
  if (!rowCount) throw httpError(404, 'No such threat match');
  res.json({ success: true });
}));

module.exports = router;
