// The client organisation as the vCISO pages see it: dashboard, company, contacts, features, reports.
// Every query is scoped to this instance's own customer_id.
const express = require('express');
const db = require('../db');
const auth = require('../auth');
const ctx = require('./context');
const { auditData } = require('./audits');

const router = express.Router();
const { wrap, customerId } = ctx;

async function company() {
  const { rows } = await db.query(
    `SELECT c.customer_id, c.customer_name, c.category, a.office_id, a.office_address, a.city, a.state, a.country,
            a.pincode, a.industry
       FROM master_customer_details c
       LEFT JOIN master_customer_address_details a ON a.customer_id = c.customer_id AND a.office_type = 'Primary'
      WHERE c.customer_id = $1`,
    [customerId()]
  );
  const r = rows[0];
  const location = [r.city, r.state, r.country].filter(Boolean).join(', ');
  return {
    client: { id: r.customer_id, name: r.customer_name, industry: r.industry, category: r.category },
    companyInfo: {
      company_name: r.customer_name, legal_name: r.customer_name, industry: r.industry, company_size: r.category,
      address: r.office_address, city: r.city, state: r.state, country: r.country, pincode: r.pincode,
      headquarters: location, location, company_branch: r.office_id,
      website: null, primary_domain: null, timezone: null, cloud_provider: null, description: null,
    },
  };
}

async function contacts() {
  const { rows } = await db.query(
    `SELECT contact_id, office_id, contact_type, contact_priority, contact_person, designation, department,
            contact_email, contact_phone
       FROM master_customer_contact_details WHERE customer_id = $1 AND active IS TRUE
      ORDER BY contact_priority NULLS LAST, contact_id`,
    [customerId()]
  );
  return rows.map((c) => ({
    id: c.contact_id, office_id: c.office_id, contact_type: c.contact_type, priority: c.contact_priority,
    full_name: c.contact_person, name: c.contact_person, designation: c.designation, title: c.designation,
    department: c.department, email: c.contact_email, phone: c.contact_phone, mobile: c.contact_phone,
  }));
}

async function frameworks() {
  const { rows } = await db.query(
    `SELECT DISTINCT f.framework_id, f.standard, f.framework_code FROM customer_contract_framework_map m
       JOIN master_framework f USING (framework_id) WHERE m.customer_id = $1 AND m.active IS TRUE ORDER BY 1`,
    [customerId()]
  );
  return rows.map((f) => ({ ...f, slug: ctx.slugOf(f.framework_code) }));
}

async function vulnerabilityStats() {
  if (!ctx.licensed('vulnerabilities')) return { open: 0, critical: 0, high: 0, medium: 0, low: 0, mttr_days: null };
  const { rows } = await db.query(
    `SELECT count(*) FILTER (WHERE status IN ('open', 'reappeared', 'in_progress'))::int AS open,
            count(*) FILTER (WHERE severity = 'Critical' AND status IN ('open', 'reappeared', 'in_progress'))::int AS critical,
            count(*) FILTER (WHERE severity = 'High' AND status IN ('open', 'reappeared', 'in_progress'))::int AS high,
            count(*) FILTER (WHERE severity = 'Medium' AND status IN ('open', 'reappeared', 'in_progress'))::int AS medium,
            count(*) FILTER (WHERE severity = 'Low' AND status IN ('open', 'reappeared', 'in_progress'))::int AS low,
            round(avg(extract(epoch FROM remediated_at - first_seen) / 86400) FILTER (WHERE remediated_at IS NOT NULL))::int AS mttr_days,
            count(*) FILTER (WHERE sla_due < CURRENT_DATE AND status IN ('open', 'reappeared', 'in_progress'))::int AS overdue,
            count(*) FILTER (WHERE (sla_due >= CURRENT_DATE OR sla_due IS NULL) AND status IN ('open', 'reappeared', 'in_progress'))::int AS on_track,
            count(*) FILTER (WHERE status = 'remediated')::int AS remediated
       FROM vulnerability_finding WHERE customer_id = $1`,
    [customerId()]
  );
  return rows[0];
}

router.use(auth.requireUser);

router.get('/vciso/dashboard', wrap(async (_req, res) => {
  const [{ client, companyInfo }, fws, scope, v, { audits, cars }] = await Promise.all([
    company(), frameworks(), ctx.clientScope(), vulnerabilityStats(), auditData()]);
  let topServers = [];
  if (ctx.licensed('vulnerabilities')) {
    ({ rows: topServers } = await db.query(
      `SELECT COALESCE(asset_id, unmapped_asset) AS asset, count(*)::int AS total,
              count(*) FILTER (WHERE severity = 'Critical')::int AS critical, count(*) FILTER (WHERE severity = 'High')::int AS high
         FROM vulnerability_finding WHERE customer_id = $1 AND status IN ('open', 'reappeared', 'in_progress')
        GROUP BY 1 ORDER BY 2 DESC LIMIT 5`,
      [customerId()]
    ));
  }
  res.json({
    client,
    contract: {
      id: scope.contract_id, start_date: scope.contract_start_date, end_date: scope.contract_end_date,
      startDate: scope.contract_start_date, endDate: scope.contract_end_date, fy_id: scope.fy_id,
    },
    framework_selections: fws.map((f) => f.standard),
    frameworks: fws,
    company_info: { industry: companyInfo.industry, location: companyInfo.location, website: null, size: companyInfo.company_size },
    stats: {
      vulnerabilities: v,
      audits: {
        active: audits.filter((a) => a.status !== 'closed').length,
        findings: cars.filter((c) => c.status !== 'closed').length,
        overdue_cars: audits.reduce((n, a) => n + a.overdue_cars, 0),
        critical: cars.filter((c) => c.status !== 'closed' && c.severity === 'critical').length,
      },
      sla: { overdue: v.overdue || 0, on_track: v.on_track || 0, remediated: v.remediated || 0 },
    },
    topServers,
    monthlyTrend: [],
    recentAudits: audits.slice(0, 5),
  });
}));

// Feature flags follow the licence (instance.json / client_license.licensed_modules).
router.get('/vciso/client-features', (_req, res) => {
  const vuln = ctx.licensed('vulnerabilities');
  res.json({
    threat_feeds_enabled: ctx.licensed('news_breach_watch'),
    vuln_scanning_enabled: vuln,
    sla_tracking_enabled: vuln,
    asset_discovery_enabled: true,
    licensed_modules: require('../instance').state.instance.licensed_modules,
  });
});

router.get('/company-info/:clientId', ctx.ownClient(), wrap(async (_req, res) => res.json((await company()).companyInfo)));
router.get('/contacts/:clientId', ctx.ownClient(), wrap(async (_req, res) => res.json(await contacts())));
router.get('/clients', wrap(async (_req, res) => {
  const { client } = await company();
  res.json([client]);
}));
router.get('/clients/:clientId', ctx.ownClient(), wrap(async (_req, res) => res.json((await company()).client)));

// Contract period (the questionnaires default their target date to the day before it ends).
router.get('/contract-tenure/:clientId', ctx.ownClient(), wrap(async (_req, res) => {
  const s = await ctx.clientScope();
  res.json({ contract_id: s.contract_id, contract_start: s.contract_start_date, contract_end: s.contract_end_date,
             start_date: s.contract_start_date, end_date: s.contract_end_date, period_months: s.contract_period_months });
}));
router.get('/framework-selections/:clientId', ctx.ownClient(), wrap(async (_req, res) => res.json((await frameworks()).map((f) => f.standard))));
// Cloud providers in scope are not part of the intake yet.
router.get('/cloud-selections/:clientId', ctx.ownClient(), (_req, res) => res.json([]));

// Users of this organisation (customer_framework_users), for pickers such as control owner.
router.get('/users', wrap(async (_req, res) => {
  const { rows } = await db.query(
    `SELECT user_id AS id, user_id, login_id, user_name AS name, user_email AS email, user_role AS role, office_id,
            designation, department, active FROM customer_framework_users WHERE customer_id = $1 ORDER BY user_id`,
    [customerId()]
  );
  res.json(rows);
}));

router.get('/vciso/reports/data', wrap(async (_req, res) => {
  const { client } = await company();
  let vulns = [];
  if (ctx.licensed('vulnerabilities')) {
    ({ rows: vulns } = await db.query(
      'SELECT finding_id AS id, title, lower(severity) AS severity, status FROM vulnerability_finding WHERE customer_id = $1',
      [customerId()]
    ));
  }
  const { audits, cars } = await auditData();
  res.json({ client, vulns, audits, cars });
}));

// Server-sent events (the Vulnerabilities page listens for scan-sync progress). Nothing is pushed yet;
// the stream stays open with heartbeats so the browser does not reconnect in a loop.
router.get('/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write(': connected\n\n');
  const beat = setInterval(() => res.write(': heartbeat\n\n'), 25_000);
  req.on('close', () => clearInterval(beat));
});

module.exports = router;
