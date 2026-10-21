// CTW tables -> client spec (intake/intake_schema.json), the input of the validator and the bundle
// builder. The reverse of lib/spec-import.js. Expects DATE columns as 'YYYY-MM-DD' strings and
// NUMERIC as numbers (type parsers in src/db.js).

// Drops null / undefined fields, so optional fields that were never filled are absent, as in a spec file.
function clean(row) {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null && v !== undefined));
}

async function buildSpec(db, id) {
  const one = async (sql) => (await db.query(sql, [id])).rows[0];
  const all = async (sql) => (await db.query(sql, [id])).rows;

  const client = await one(
    `SELECT customer_id, customer_name, category, industry, primary_domain, deployment_fqdn
       FROM ctw_client WHERE customer_id = $1`,
  );
  if (!client) return null;

  const offices = await all(
    `SELECT office_id, office_type, office_address, city, state, country, pincode
       FROM ctw_client_office WHERE customer_id = $1 ORDER BY office_id`,
  );
  const contacts = await all(
    `SELECT contact_id, office_id, contact_type, contact_priority, contact_person, designation, department,
            contact_email, contact_phone
       FROM ctw_client_contact WHERE customer_id = $1 ORDER BY contact_id`,
  );
  const contract = await one(
    `SELECT contract_id, customer_ref_po, contract_type, financial_year, contract_period_months,
            contract_start_date, contract_end_date, contract_value, currency, invoicing_frequency
       FROM ctw_contract WHERE customer_id = $1 AND is_current`,
  );
  const licence = await one(
    `SELECT max_users, max_vcisos, max_org_owners, max_control_owners, max_api_integrations, max_frameworks, valid_to
       FROM ctw_licence WHERE customer_id = $1`,
  );
  const frameworks = await all(
    `SELECT f.framework_id,
            COALESCE(array_agg(o.office_id ORDER BY o.office_id) FILTER (WHERE o.office_id IS NOT NULL), '{}') AS office_ids,
            f.review_frequency_months,
            jsonb_object_agg(o.office_id, o.review_frequency_months)
              FILTER (WHERE o.review_frequency_months IS NOT NULL) AS office_review_months
       FROM ctw_licence_framework f
       LEFT JOIN ctw_licence_framework_office o USING (customer_id, framework_id)
      WHERE f.customer_id = $1
      GROUP BY f.framework_id, f.review_frequency_months
      ORDER BY f.framework_id`,
  );
  // Modules in catalogue order, as the intake lists them.
  const modules = await all(
    `SELECT lm.module_name FROM ctw_licence_module lm JOIN ctw_module m USING (module_name)
      WHERE lm.customer_id = $1 ORDER BY m.sort_order`,
  );
  const tools = await all(
    `SELECT tool_name, enabled, target_endpoint, pull_frequency_per_day
       FROM ctw_client_tool WHERE customer_id = $1 ORDER BY sort_order, tool_name`,
  );
  const news = await one(
    `SELECT monitored_names, monitored_domains, monitored_cities, custom_keywords
       FROM ctw_client_news_watch WHERE customer_id = $1`,
  );
  const policy = await one(
    `SELECT sso_type, sso_metadata_url, mfa_enforced, password_expiry_days, session_timeout_minutes
       FROM ctw_client_security_policy WHERE customer_id = $1`,
  );
  const users = await all(
    `SELECT user_id, login_id, user_name, user_email, user_mobile, designation, department, role_type, office_id
       FROM ctw_client_initial_user WHERE customer_id = $1 ORDER BY user_id`,
  );

  const spec = {
    organization: { ...clean(client), offices: offices.map(clean), contacts: contacts.map(clean) },
  };
  if (contract) spec.contract = clean(contract);
  if (licence) {
    spec.licensing_limits = clean(licence);
    spec.selected_frameworks = frameworks.map(clean);
    spec.enabled_modules = modules.map((m) => m.module_name);
  }
  spec.integrations = { tools: tools.map(clean) };
  if (news) spec.news_watch_profile = news;
  if (policy) spec.security_policies = clean(policy);
  spec.initial_users = users.map(clean);
  return spec;
}

module.exports = { buildSpec };
