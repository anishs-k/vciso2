// Writes a client spec (the JSON of intake/intake_schema.json) into the CTW tables.
// lib/spec-build.js turns the rows back into the spec. Both run inside the caller's transaction;
// `db` is a pg client.
//
// A draft may leave sections out (no contract yet, no users, ...); the validator, not the tables,
// decides when a client is complete.

async function insert(db, table, row) {
  const cols = Object.keys(row).filter((k) => row[k] !== undefined);
  const params = cols.map((_c, i) => `$${i + 1}`);
  await db.query(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${params.join(', ')})`,
    cols.map((c) => row[c]),
  );
}

function pick(obj, keys) {
  return Object.fromEntries(keys.map((k) => [k, obj?.[k]]));
}

const CLIENT_COLS = ['customer_name', 'category', 'industry', 'primary_domain', 'deployment_fqdn'];
const CONTRACT_COLS = ['customer_ref_po', 'contract_type', 'financial_year', 'contract_period_months',
  'contract_start_date', 'contract_end_date', 'contract_value', 'currency', 'invoicing_frequency'];

// Everything below ctw_client. Old contracts are kept: the spec's contract becomes the current one.
async function writeSections(db, id, spec) {
  const org = spec.organization;
  for (const o of org.offices || []) {
    await insert(db, 'ctw_client_office', {
      customer_id: id,
      ...pick(o, ['office_id', 'office_type', 'office_address', 'city', 'state', 'country', 'pincode']),
    });
  }
  for (const c of org.contacts || []) {
    await insert(db, 'ctw_client_contact', {
      customer_id: id,
      ...pick(c, ['contact_id', 'office_id', 'contact_type', 'contact_priority', 'contact_person',
        'designation', 'department', 'contact_email', 'contact_phone']),
    });
  }

  if (spec.contract) {
    await db.query('UPDATE ctw_contract SET is_current = false WHERE customer_id = $1', [id]);
    const c = pick(spec.contract, CONTRACT_COLS);
    await db.query(
      `INSERT INTO ctw_contract (customer_id, contract_id, ${CONTRACT_COLS.join(', ')}, is_current)
       VALUES ($1, $2, ${CONTRACT_COLS.map((_c, i) => `$${i + 3}`).join(', ')}, true)
       ON CONFLICT (customer_id, contract_id) DO UPDATE SET
         ${CONTRACT_COLS.map((col) => `${col} = EXCLUDED.${col}`).join(', ')}, is_current = true`,
      [id, spec.contract.contract_id, ...CONTRACT_COLS.map((col) => c[col] ?? null)],
    );
  }

  // The licence row holds modules and frameworks too, so a draft gets one as soon as any of the three is there.
  if (spec.licensing_limits || spec.enabled_modules?.length || spec.selected_frameworks?.length) {
    await insert(db, 'ctw_licence', {
      customer_id: id,
      ...pick(spec.licensing_limits, ['max_users', 'max_vcisos', 'max_org_owners', 'max_control_owners',
        'max_api_integrations', 'max_frameworks', 'valid_to']),
    });
    for (const m of spec.enabled_modules || []) {
      await insert(db, 'ctw_licence_module', { customer_id: id, module_name: m });
    }
    for (const f of spec.selected_frameworks || []) {
      await insert(db, 'ctw_licence_framework', {
        customer_id: id,
        framework_id: f.framework_id,
        review_frequency_months: f.review_frequency_months,
      });
      for (const officeId of f.office_ids || []) {
        await insert(db, 'ctw_licence_framework_office', {
          customer_id: id,
          framework_id: f.framework_id,
          office_id: officeId,
          review_frequency_months: f.office_review_months?.[officeId] ?? null,
        });
      }
    }
  }

  for (const [i, t] of (spec.integrations?.tools || []).entries()) {
    await insert(db, 'ctw_client_tool', {
      customer_id: id,
      ...pick(t, ['tool_name', 'enabled', 'target_endpoint', 'pull_frequency_per_day']),
      sort_order: i,
    });
  }
  if (spec.security_policies) {
    await insert(db, 'ctw_client_security_policy', {
      customer_id: id,
      ...pick(spec.security_policies, ['sso_type', 'sso_metadata_url', 'mfa_enforced',
        'password_expiry_days', 'session_timeout_minutes']),
    });
  }
  if (spec.news_watch_profile) {
    await insert(db, 'ctw_client_news_watch', {
      customer_id: id,
      ...pick(spec.news_watch_profile, ['monitored_names', 'monitored_domains', 'monitored_cities',
        'custom_keywords']),
    });
  }

  for (const u of spec.initial_users || []) {
    await insert(db, 'ctw_client_initial_user', {
      customer_id: id,
      ...pick(u, ['user_id', 'login_id', 'user_name', 'user_email', 'user_mobile', 'designation',
        'department', 'role_type', 'office_id']),
    });
  }
}

// Children first, so no foreign key is left pointing at a deleted office.
const SECTION_TABLES = ['ctw_client_initial_user', 'ctw_client_news_watch', 'ctw_client_security_policy',
  'ctw_client_tool', 'ctw_licence', 'ctw_client_contact', 'ctw_client_office'];

async function importSpec(db, spec, { adminId = null, status = 'ready' } = {}) {
  const id = spec.organization.customer_id;
  const { rowCount } = await db.query('SELECT 1 FROM ctw_client WHERE customer_id = $1', [id]);
  if (rowCount) throw Object.assign(new Error(`client ${id} already exists`), { code: 'exists' });

  await insert(db, 'ctw_client', { customer_id: id, ...pick(spec.organization, CLIENT_COLS), status, created_by: adminId });
  await writeSections(db, id, spec);
  await insert(db, 'ctw_audit_log', { admin_id: adminId, action: 'client.create', customer_id: id });
  return id;
}

// Replaces every section of an existing client with the spec's. The customer ID cannot change.
async function replaceSpec(db, id, spec, { adminId = null } = {}) {
  const { rows } = await db.query('SELECT status FROM ctw_client WHERE customer_id = $1 FOR UPDATE', [id]);
  if (!rows.length) throw Object.assign(new Error(`client ${id} not found`), { code: 'not_found' });

  // An edited client must be validated again before it can be built.
  const status = rows[0].status === 'ready' ? 'draft' : rows[0].status;
  await db.query(
    `UPDATE ctw_client SET ${CLIENT_COLS.map((c, i) => `${c} = $${i + 2}`).join(', ')}, status = $${CLIENT_COLS.length + 2}
      WHERE customer_id = $1`,
    [id, ...CLIENT_COLS.map((c) => spec.organization[c] ?? null), status],
  );
  for (const table of SECTION_TABLES) {
    await db.query(`DELETE FROM ${table} WHERE customer_id = $1`, [id]);
  }
  await writeSections(db, id, spec);
  await insert(db, 'ctw_audit_log', { admin_id: adminId, action: 'client.update', customer_id: id });
  return status;
}

module.exports = { importSpec, replaceSpec };
