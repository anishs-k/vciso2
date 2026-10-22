// Clients: spec round-trip, drafts, validation, the database's own rules, deletion.
const test = require('node:test');
const assert = require('node:assert/strict');
const { startStack, signInFully, dockerAvailable } = require('../helpers/harness');
const { freshSample } = require('../helpers/fixtures');

test('clients', { skip: !dockerAvailable() && 'Docker is not running', timeout: 180_000 }, async (t) => {
  const stack = await startStack();
  t.after(() => stack.stop());
  const { api } = await signInFully(stack);

  await t.test('catalogues come from intake/client_intake.py', async () => {
    const fw = (await api.call('GET', '/frameworks')).body;
    const mods = (await api.call('GET', '/modules')).body;
    assert.equal(fw.length, 19);
    assert.ok(fw.some((f) => f.framework_id === 102 && /27001/.test(f.framework_name)));
    assert.deepEqual(mods.filter((m) => m.mandatory).map((m) => m.module_name), ['compliance']);
    assert.equal(mods[0].module_name, 'compliance', 'catalogue order');
    assert.ok((await api.call('GET', '/options')).body.role_types.includes('vCISO'));
  });

  await t.test('the seeded sample reads back exactly as intake/sample_client_spec.json', async () => {
    const sample = require('../../../intake/sample_client_spec.json');
    const expected = structuredClone(sample);
    delete expected.license_seal;
    const r = await api.call('GET', '/clients/Cust_00101');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.spec, expected);
  });

  await t.test('create -> draft, validate -> ready, round-trip of a new client', async () => {
    const spec = freshSample('Cust_00202');
    let r = await api.call('POST', '/clients', spec);
    assert.equal(r.status, 201);
    assert.equal(r.body.status, 'draft');
    // The API generates the contract ID: the customer's digits and the next running number.
    assert.match(r.body.contract_id, /^Contract_00202_\d{3}$/);
    spec.contract.contract_id = r.body.contract_id;
    assert.deepEqual((await api.call('GET', '/clients/Cust_00202')).body.spec, spec);
    r = await api.call('POST', '/clients/Cust_00202/validate');
    assert.deepEqual(r.body, { valid: true, errors: [], status: 'ready' });
    assert.equal((await api.call('POST', '/clients', spec)).status, 409);
  });

  await t.test('contract IDs: suggested, typed or generated, never shared', async () => {
    const next = (await api.call('GET', '/clients/next-contract-id?customer_id=Cust_00606')).body.contract_id;
    assert.match(next, /^Contract_00606_\d{3}$/);
    assert.equal((await api.call('GET', '/clients/next-contract-id?customer_id=Cust_00606')).body.contract_id, next, 'a preview uses no number up');
    // The suggestion is saved as shown, and the next one moves past it.
    const a = freshSample('Cust_00606');
    a.contract.contract_id = next;
    assert.equal((await api.call('POST', '/clients', a)).body.contract_id, next);
    const n = Number(next.split('_').at(-1));
    assert.equal((await api.call('GET', '/clients/next-contract-id?customer_id=Cust_00607')).body.contract_id, `Contract_00607_${String(n + 1).padStart(3, '0')}`);
    // An ID of the admin's own is kept; another client's is refused.
    const b = freshSample('Cust_00607');
    b.contract.contract_id = 'PO-ACME-2026';
    assert.equal((await api.call('POST', '/clients', b)).body.contract_id, 'PO-ACME-2026');
    const c = freshSample('Cust_00608');
    c.contract.contract_id = 'PO-ACME-2026';
    const r = await api.call('POST', '/clients', c);
    assert.equal(r.status, 409);
    assert.match(r.body.error, /already used by Cust_00607/);
    // Two admins saved the same suggestion: the second gets the next number instead.
    const stale = { ...c, contract: { ...c.contract, contract_id: `Contract_00608_${String(n).padStart(3, '0')}` } };
    await stack.db.query(`UPDATE ctw_contract SET contract_id = $1 WHERE customer_id = 'Cust_00607'`, [stale.contract.contract_id]);
    const got = (await api.call('POST', '/clients', stale)).body.contract_id;
    assert.match(got, /^Contract_00608_\d{3}$/);
    assert.notEqual(got, stale.contract.contract_id);
    // Editing keeps the ID; a new one can be typed in.
    a.contract.contract_id = next;
    a.organization.customer_name = 'Changed';
    assert.equal((await api.call('PUT', '/clients/Cust_00606', a)).body.contract_id, next);
    a.contract.contract_id = 'CTR-NEW';
    assert.equal((await api.call('PUT', '/clients/Cust_00606', a)).body.contract_id, 'CTR-NEW');
    for (const id of ['Cust_00606', 'Cust_00607', 'Cust_00608']) await api.call('DELETE', `/clients/${id}`);
  });

  await t.test('a framework can be reviewed at a different interval in each office', async () => {
    const s = freshSample('Cust_00609');
    s.selected_frameworks[0].office_review_months = { Cust_00609_001: 3, Cust_00609_002: 24 };
    assert.equal((await api.call('POST', '/clients', s)).status, 201);
    const back = (await api.call('GET', '/clients/Cust_00609')).body.spec.selected_frameworks;
    assert.deepEqual(back[0].office_review_months, { Cust_00609_001: 3, Cust_00609_002: 24 });
    assert.equal(back[1].office_review_months, undefined, 'none given, none stored');
    assert.equal((await api.call('POST', '/clients/Cust_00609/validate')).body.valid, true);
    s.selected_frameworks[0].office_ids = ['Cust_00609_001'];
    delete s.selected_frameworks[0].office_review_months.Cust_00609_002;
    s.selected_frameworks[0].office_review_months.Cust_00609_001 = 0;
    const r = await api.call('PUT', '/clients/Cust_00609', s);
    assert.equal(r.status, 400, 'the database refuses 0 months');
    assert.equal((await api.call('DELETE', '/clients/Cust_00609')).status, 200);
  });

  await t.test('IT Admin users, and exactly as many Organisation Owners as the licence sets', async () => {
    const s = freshSample('Cust_00610');
    assert.equal((await api.call('POST', '/clients', s)).status, 201);
    const back = (await api.call('GET', '/clients/Cust_00610')).body.spec.initial_users;
    assert.equal(back.find((u) => u.login_id === 'rohan.iyer').role_type, 'IT Admin');
    assert.deepEqual((await api.call('POST', '/clients/Cust_00610/validate')).body.errors, []);
    s.licensing_limits.max_org_owners = 2;
    await api.call('PUT', '/clients/Cust_00610', s);
    const r = (await api.call('POST', '/clients/Cust_00610/validate')).body;
    assert.ok(r.errors.some((e) => /Organisation Owner users \(1\) must equal max_org_owners \(2\)/.test(e)), JSON.stringify(r.errors));
    // A client without a vCISO user is fine.
    s.licensing_limits.max_org_owners = 1;
    s.initial_users = s.initial_users.filter((u) => u.role_type !== 'vCISO');
    await api.call('PUT', '/clients/Cust_00610', s);
    assert.deepEqual((await api.call('POST', '/clients/Cust_00610/validate')).body.errors, []);
    // At least one IT Admin.
    s.initial_users = s.initial_users.map((u) => (u.role_type === 'IT Admin' ? { ...u, role_type: 'Viewer' } : u));
    await api.call('PUT', '/clients/Cust_00610', s);
    assert.ok((await api.call('POST', '/clients/Cust_00610/validate')).body.errors.includes('At least one initial user must be an IT Admin'));
    assert.equal((await api.call('DELETE', '/clients/Cust_00610')).status, 200);
  });

  await t.test('editing a ready client makes it a draft again; the ID cannot change', async () => {
    const spec = freshSample('Cust_00202');
    spec.organization.customer_name = 'Renamed Ltd';
    spec.integrations.tools.reverse();
    const before = (await api.call('GET', '/clients/Cust_00202')).body.spec.contract.contract_id;
    let r = await api.call('PUT', '/clients/Cust_00202', spec);
    assert.deepEqual(r.body, { customer_id: 'Cust_00202', status: 'draft', contract_id: before }, 'the contract ID stays');
    const back = (await api.call('GET', '/clients/Cust_00202')).body.spec;
    assert.equal(back.organization.customer_name, 'Renamed Ltd');
    assert.deepEqual(back.integrations.tools.map((x) => x.tool_name), ['Greenbone', 'Tenable'], 'order as entered');
    r = await api.call('PUT', '/clients/Cust_00202', freshSample('Cust_00303'));
    assert.equal(r.status, 400);
    assert.equal((await api.call('PUT', '/clients/Nope_1', freshSample('Nope_1'))).status, 404);
  });

  await t.test('the validator explains what is wrong', async () => {
    const spec = freshSample('Cust_00202');
    spec.licensing_limits.max_vcisos = 0;
    spec.enabled_modules = spec.enabled_modules.filter((m) => m !== 'alerting');
    await api.call('PUT', '/clients/Cust_00202', spec);
    const r = await api.call('POST', '/clients/Cust_00202/validate');
    assert.equal(r.body.valid, false);
    assert.equal(r.body.status, 'draft');
    assert.ok(r.body.errors.some((e) => /max_vcisos must be >= 1/.test(e)));
    assert.ok(r.body.errors.some((e) => /requires the 'alerting' module/.test(e)));
  });

  await t.test('a draft may be partial: saved as entered, the validator lists what is missing', async () => {
    const partial = {
      organization: {
        customer_id: 'Cust_00777', customer_name: 'Partial Ltd', category: null, industry: null, primary_domain: null,
        offices: [{ office_id: 'Cust_00777_001', office_type: null, office_address: null, city: 'Pune', state: null, country: null }],
        contacts: [{ contact_id: 'Cust_00777_001_0001', office_id: null, contact_type: null, contact_priority: null, contact_person: 'A', designation: null, contact_email: null, contact_phone: null }],
      },
      contract: { contract_id: null, customer_ref_po: null, contract_start_date: null, currency: null },
      licensing_limits: { max_users: null, valid_to: null },
      selected_frameworks: [{ framework_id: 102, office_ids: [], review_frequency_months: null }],
      enabled_modules: ['compliance', 'vulnerabilities'],
      integrations: { tools: [{ tool_name: 'Tenable', enabled: true, pull_frequency_per_day: null }] },
      security_policies: { sso_type: null, mfa_enforced: false },
      initial_users: [{ user_id: 'User_0001', login_id: null, user_name: null, user_email: null, role_type: null, office_id: null }],
    };
    let r = await api.call('POST', '/clients', partial);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const first = Number((await api.call('GET', '/clients/Cust_00202')).body.spec.contract.contract_id.split('_').at(-1));
    assert.match(r.body.contract_id, /^Contract_00777_\d{3}$/);
    assert.ok(Number(r.body.contract_id.split('_').at(-1)) > first, 'numbers run on across clients');
    const back = (await api.call('GET', '/clients/Cust_00777')).body.spec;
    assert.equal(back.organization.offices[0].city, 'Pune');
    assert.equal(back.organization.offices[0].office_type, undefined, 'empty stays empty');
    assert.deepEqual(back.enabled_modules, ['compliance', 'vulnerabilities'], 'modules kept without licence numbers');
    assert.deepEqual(back.selected_frameworks.map((f) => f.framework_id), [102]);
    r = await api.call('POST', '/clients/Cust_00777/validate');
    assert.equal(r.body.valid, false);
    assert.equal(r.body.status, 'draft');
    for (const want of [/category must be one of/, /industry is required/, /office_type must be one of/, /contract.customer_ref_po is required/,
      /invoicing_frequency must be one of/, /max_users must be a whole number/, /contact_priority must be a whole number/,
      /pull_frequency_per_day must be a whole number/, /role_type must be one of/]) {
      assert.ok(r.body.errors.some((e) => want.test(e)), want.source);
    }
    assert.equal((await api.call('POST', '/clients/Cust_00777/builds', { build_type: 'full' })).status, 409, 'a draft cannot be built');
    assert.equal((await api.call('DELETE', '/clients/Cust_00777')).status, 200);
  });

  await t.test('the database refuses what the tables cannot hold, with a readable reason', async () => {
    const cases = [
      [(s) => (s.organization.offices[1].office_type = 'Primary'), 409, /only one Primary office/],
      [(s) => (s.organization.category = 'Startup'), 400, /category/],
      [(s) => s.integrations.tools.push({ ...s.integrations.tools[0] }), 409, /Each tool can be listed only once/],
      [(s) => (s.initial_users[0].office_id = 'Elsewhere'), 400, /office/],
      [(s) => (s.contract.contract_end_date = s.contract.contract_start_date), 400, /contract_end_date|check/],
    ];
    const seqBefore = (await stack.db.query('SELECT last_value FROM ctw_contract_seq')).rows[0].last_value;
    const bad = freshSample('Cust_00505');
    bad.organization.offices[1].office_type = 'Primary';
    assert.equal((await api.call('POST', '/clients', bad)).status, 409);
    assert.equal((await stack.db.query('SELECT last_value FROM ctw_contract_seq')).rows[0].last_value, seqBefore, 'a refused client uses no contract number');
    for (const [mutate, status, msg] of cases) {
      const s = freshSample('Cust_00202');
      mutate(s);
      const r = await api.call('PUT', '/clients/Cust_00202', s);
      assert.equal(r.status, status, msg.source);
      assert.match(r.body.error + (r.body.constraint || ''), msg);
    }
    // nothing of a refused edit was kept
    assert.equal((await api.call('GET', '/clients/Cust_00202')).body.spec.organization.offices[1].office_type, 'Secondary');
  });

  await t.test('bad input is a 400, not a crash', async () => {
    assert.equal((await api.call('POST', '/clients', { nothing: 1 })).status, 400);
    assert.equal((await api.call('POST', '/clients', { organization: { customer_id: 'x y!' } })).status, 400);
    const raw = await fetch(`${stack.base}/api/clients`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${api.token}` },
      body: '{not json',
    });
    assert.equal(raw.status, 400);
    assert.ok(!/at .*\.js/.test(stack.apiLog()), 'no stack trace for client errors');
  });

  await t.test('list shows status, licence and last build', async () => {
    const list = (await api.call('GET', '/clients')).body;
    const c = list.find((x) => x.customer_id === 'Cust_00202');
    assert.equal(c.status, 'draft');
    assert.equal(c.offices, 2);
    assert.equal(c.last_build, null);
    assert.deepEqual(c.frameworks, [102, 103]);
  });

  await t.test('a draft cannot be built; delete works only without builds', async () => {
    let r = await api.call('POST', '/clients/Cust_00202/builds', { build_type: 'full' });
    assert.equal(r.status, 409);
    assert.match(r.body.error, /Validate/);
    assert.equal((await api.call('DELETE', '/clients/Cust_00202')).status, 200);
    assert.equal((await api.call('GET', '/clients/Cust_00202')).status, 404);
    await stack.db.query(`INSERT INTO ctw_build (customer_id, version, build_type, status) VALUES ('Cust_00101', 1, 'full', 'failed')`);
    r = await api.call('DELETE', '/clients/Cust_00101');
    assert.equal(r.status, 409);
    assert.match(r.body.error, /suspend/);
  });

  await t.test('every change is audited', async () => {
    const { rows } = await stack.db.query(`SELECT DISTINCT action FROM ctw_audit_log WHERE customer_id = 'Cust_00202'`);
    assert.deepEqual(rows.map((r) => r.action).sort(), ['client.create', 'client.delete', 'client.update', 'client.validate']);
  });
});
