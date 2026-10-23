// The form's spec helpers and live checks (ui/src/lib), which run in the browser.
const test = require('node:test');
const assert = require('node:assert/strict');
const { freshSample } = require('../helpers/fixtures');

const load = async () => ({
  ...(await import('../../ui/src/lib/spec.js')),
  ...(await import('../../ui/src/lib/checks.js')),
  ...(await import('../../ui/src/lib/phone.js')),
});

test('the sample client (dates from today) passes every form check', async () => {
  const { normalize, checkSpec } = await load();
  assert.deepEqual(checkSpec(normalize(freshSample())), []);
});

test('a new client starts empty: nothing is pre-filled', async () => {
  const { emptySpec } = await load();
  const e = emptySpec();
  const values = [];
  const walk = (v, path) => {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`));
    if (v && typeof v === 'object') return Object.entries(v).forEach(([k, x]) => walk(x, path ? `${path}.${k}` : k));
    if (v !== '' && v !== false) values.push(path);
  };
  walk(e, '');
  // Only the mandatory Compliance module is set; the contract ID comes from the API on the first save.
  assert.deepEqual(values.sort(), ['enabled_modules[0]']);
});

test('an empty form lists what is missing in every required section', async () => {
  const { emptySpec, checkSpec } = await load();
  const sections = new Set(checkSpec(emptySpec()).map((c) => c.section));
  for (const s of ['organization', 'offices', 'contract', 'licence', 'frameworks', 'security', 'users']) assert.ok(sections.has(s), s);
  assert.ok(!sections.has('contacts'), 'contacts are optional');
});

test('empty choices in new rows are reported', async () => {
  const { normalize, newOffice, newContact, newUser, newTool, checkSpec } = await load();
  const s = normalize(freshSample());
  s.organization.offices.push(newOffice(s));
  s.organization.contacts.push(newContact(s));
  s.initial_users.push(newUser(s));
  s.integrations.tools.push(newTool('Qualys'));
  const m = checkSpec(s).map((c) => c.message).join(' | ');
  for (const want of [/choose the office type/, /choose the contact type/, /choose a role/]) assert.match(m, want);
  assert.doesNotMatch(m, /Qualys/, 'a new tool starts at 1 pull a day');
  assert.equal(newTool('Qualys').pull_frequency_per_day, 1);
  s.integrations.tools.at(-1).pull_frequency_per_day = 0;
  assert.match(checkSpec(s).map((c) => c.message).join(' | '), /Qualys: pulls per day must be 1 or more/);
});

test('checks follow the validator rules', async () => {
  const { normalize, checkSpec } = await load();
  const messages = (mutate) => {
    const s = normalize(freshSample());
    mutate(s);
    return checkSpec(s).map((c) => c.message).join(' | ');
  };
  assert.match(messages((s) => (s.organization.offices[1].office_type = 'Primary')), /Exactly one office must be Primary/);
  assert.match(messages((s) => (s.licensing_limits.max_vcisos = 30)), /vCISOs \+ Org Owners \+ IT Admins cannot exceed max users/);
  assert.match(messages((s) => (s.licensing_limits.max_it_admins = '')), /Max IT Admins must be a whole number ≥ 1/);
  assert.match(messages((s) => s.initial_users.push({ ...s.initial_users[2], user_id: 'User_0009', login_id: 'it.two', user_email: 'it2@x.in' })), /2 IT Admins, licence allows 1/);
  assert.match(messages((s) => (s.contracts[0].financial_year = 2020)), /Mumbai contract: financial year should be/);
  assert.match(messages((s) => (s.enabled_modules = s.enabled_modules.filter((m) => m !== 'alerting'))), /needs Alerting/);
  assert.match(messages((s) => (s.enabled_modules = ['compliance'])), /Scanner tools need the Vulnerabilities module/);
  assert.doesNotMatch(messages((s) => (s.initial_users[0].role_type = 'Viewer')), /vCISO/, 'a vCISO is optional');
  assert.match(messages((s) => (s.initial_users[2].role_type = 'Viewer')), /At least one user must be an IT Admin/);
  assert.match(messages((s) => (s.initial_users[1].role_type = 'IT Admin')), /Organisation Owners: 0 added, the licence sets 1/);
  assert.match(messages((s) => (s.licensing_limits.max_org_owners = 2)), /Organisation Owners: 1 added, the licence sets 2: add exactly 2/);
  assert.doesNotMatch(messages((s) => s.initial_users.push({ ...s.initial_users[0], user_id: 'User_0009', login_id: 'it.admin', user_email: 'it@x.in', role_type: 'IT Admin' })), /role|Organisation Owners/);
  assert.match(messages((s) => (s.initial_users[1].login_id = s.initial_users[0].login_id)), /Login IDs must be unique/);
  assert.match(messages((s) => (s.licensing_limits.valid_to = '2020-01-01')), /Licence end date is in the past/);
  assert.match(messages((s) => (s.organization.customer_id = 'a b')), /Customer ID/);
});

test('contract period in months is worked out from the dates', async () => {
  const { monthsBetween } = await load();
  assert.equal(monthsBetween('2026-10-21', '2027-10-20'), 12);
  assert.equal(monthsBetween('2026-10-21', '2027-10-21'), 12, 'end date written as the anniversary');
  assert.equal(monthsBetween('2026-10-21', '2027-10-23'), 13, 'two days more starts a month');
  assert.equal(monthsBetween('2024-02-29', '2025-03-01'), 12, 'leap day to its anniversary');
  assert.equal(monthsBetween('2026-04-01', '2027-03-31'), 12);
  assert.equal(monthsBetween('2026-01-01', '2026-01-31'), 1);
  assert.equal(monthsBetween('2026-01-31', '2026-02-27'), 1, 'a part month counts');
  assert.equal(monthsBetween('2026-10-21', '2027-01-05'), 3, '2 months and 16 days');
  assert.equal(monthsBetween('2026-01-15', '2031-01-14'), 60);
  assert.equal(monthsBetween('2024-02-29', '2025-02-28'), 12, 'leap day');
  for (const [a, b] of [['', '2027-01-01'], ['2026-01-01', ''], ['2026-05-01', '2026-05-01'], ['2026-05-02', '2026-05-01']]) {
    assert.equal(monthsBetween(a, b), '', `${a} → ${b}`);
  }
});

test('the end date follows the start date and the period', async () => {
  const { endAfterMonths, monthsBetween } = await load();
  assert.equal(endAfterMonths('2026-10-21', 12), '2027-10-20');
  assert.equal(endAfterMonths('2026-04-01', 12), '2027-03-31');
  assert.equal(endAfterMonths('2026-01-31', 1), '2026-03-02', 'no 31 February: rolls over as monthsBetween does');
  assert.equal(endAfterMonths('2024-02-29', 12), '2025-02-28');
  for (const [a, n] of [['2026-10-21', 12], ['2026-01-31', 1], ['2024-02-29', 12], ['2026-05-15', 36], ['2026-12-31', 2], ['2026-03-01', 60]]) {
    assert.equal(monthsBetween(a, endAfterMonths(a, n)), n, `${a} + ${n}`);
  }
  for (const [a, n] of [['', 12], ['2026-01-01', ''], ['2026-01-01', 0], ['2026-01-01', 1.5]]) assert.equal(endAfterMonths(a, n), '');
});

test('financial year runs April to March', async () => {
  const { financialYear } = await load();
  assert.equal(financialYear('2026-04-01'), 2026);
  assert.equal(financialYear('2027-03-31'), 2026);
  assert.equal(financialYear('2027-01-15'), 2026);
});

test('renaming a new client renames its office and contact IDs and every reference', async () => {
  const { normalize, renameCustomer } = await load();
  const s = renameCustomer(normalize(freshSample('Cust_00101')), 'Cust_00101', 'Cust_00777');
  const text = JSON.stringify(s);
  assert.ok(!text.includes('Cust_00101_'), 'no old office/contact ID left');
  assert.deepEqual(s.organization.offices.map((o) => o.office_id), ['Cust_00777_001', 'Cust_00777_002']);
  assert.equal(s.initial_users[0].office_id, 'Cust_00777_001');
  assert.deepEqual(s.selected_frameworks[0].office_ids, ['Cust_00777_001', 'Cust_00777_002']);
});

test('removing an office leaves nothing pointing at it', async () => {
  const { normalize, removeOffice } = await load();
  const s = removeOffice(normalize(freshSample()), 'Cust_00101_002');
  assert.ok(!JSON.stringify(s).includes('Cust_00101_002"'));
  assert.deepEqual(s.selected_frameworks[0].office_ids, ['Cust_00101_001']);
});

test('per-office review intervals follow office renames and removals', async () => {
  const { normalize, renameCustomer, removeOffice } = await load();
  const s = normalize(freshSample('Cust_00101'));
  s.selected_frameworks[0].office_review_months = { Cust_00101_001: 3, Cust_00101_002: 24 };
  renameCustomer(s, 'Cust_00101', 'Cust_00777');
  assert.deepEqual(s.selected_frameworks[0].office_review_months, { Cust_00777_001: 3, Cust_00777_002: 24 });
  removeOffice(s, 'Cust_00777_002');
  assert.deepEqual(s.selected_frameworks[0].office_review_months, { Cust_00777_001: 3 });
});

test('a user ID is the office ID and the user number, and follows the office', async () => {
  const { normalize, newUser, userIdFor, renameCustomer, removeOffice } = await load();
  assert.equal(userIdFor('Cust_00220_001', 'User_0001'), 'Cust_00220_001_User_0001');
  assert.equal(userIdFor('Cust_00220_002', 'Cust_00220_001_User_0001'), 'Cust_00220_002_User_0001', 'number kept');
  assert.equal(userIdFor('', 'Cust_00220_001_User_0001'), 'User_0001');
  const s = normalize(freshSample('Cust_00101'));
  s.initial_users[0].user_id = userIdFor('Cust_00101_001', s.initial_users[0].user_id);
  s.initial_users[1].office_id = 'Cust_00101_002';
  s.initial_users[1].user_id = userIdFor('Cust_00101_002', s.initial_users[1].user_id);
  assert.equal(newUser(s).user_id, 'User_0004', 'numbers count across offices');
  renameCustomer(s, 'Cust_00101', 'Cust_00777');
  assert.deepEqual(s.initial_users.map((u) => u.user_id), ['Cust_00777_001_User_0001', 'Cust_00777_002_User_0002', 'User_0003'], 'an ID without an office stays');
  removeOffice(s, 'Cust_00777_002');
  assert.equal(s.initial_users[1].user_id, 'Cust_00777_001_User_0002', 'moved to the remaining office');
});

test('new rows get the next free ID', async () => {
  const { normalize, newOffice, newUser, newContact } = await load();
  const s = normalize(freshSample());
  assert.equal(newOffice(s).office_id, 'Cust_00101_003');
  assert.equal(newOffice(s).office_type, '', 'chosen by the admin, not pre-filled');
  assert.equal(newUser(s).user_id, 'User_0004');
  assert.equal(newContact(s).contact_id, 'Cust_00101_001_0004');
});

test('toPayload sends every empty field as null and drops an unlicensed news profile', async () => {
  const { normalize, toPayload } = await load();
  const s = normalize(freshSample());
  s.licensing_limits.max_users = '';
  s.enabled_modules = ['compliance'];
  const p = toPayload(s);
  assert.equal(p.licensing_limits.max_users, null);
  const empty = toPayload(normalize({ organization: { customer_id: 'X_1', customer_name: 'X' } }));
  assert.equal(empty.organization.category, null);
  assert.deepEqual(empty.contracts, [], 'each office gets its contract on the Contract step');
  assert.equal(empty.security_policies.sso_type, null);
  assert.equal(p.news_watch_profile, undefined);
  assert.equal(s.licensing_limits.max_users, '', 'the form state is not changed');
});

// Rows as /api/geo/countries returns them (codes and lengths from libphonenumber-js).
const COUNTRIES = [
  { code: 'IN', name: 'India', phone_code: '91', phone_lengths: [10], phone_main: true },
  { code: 'GB', name: 'United Kingdom', phone_code: '44', phone_lengths: [9, 10], phone_main: true },
  { code: 'JE', name: 'Jersey', phone_code: '44', phone_lengths: [10], phone_main: false },
  { code: 'US', name: 'United States', phone_code: '1', phone_lengths: [10], phone_main: true },
  { code: 'AE', name: 'United Arab Emirates', phone_code: '971', phone_lengths: [8, 9], phone_main: true },
];

test('phone numbers: code and digits are read back from what is stored', async () => {
  const { parsePhone, formatPhone } = await load();
  const [india, uk, jersey] = COUNTRIES;
  assert.deepEqual(parsePhone('+91-98200-11223', COUNTRIES), { country: india, digits: '9820011223', hasCode: true });
  assert.deepEqual(parsePhone('+971 501234567', COUNTRIES).country.code, 'AE');
  assert.equal(parsePhone('+44 7700900123', COUNTRIES).country, uk, 'a shared code is its main country');
  assert.equal(parsePhone('+44 7700900123', COUNTRIES, jersey).country, jersey, 'unless the office is elsewhere with it');
  assert.deepEqual(parsePhone('9848010001', COUNTRIES, india), { country: india, digits: '9848010001', hasCode: false });
  assert.equal(formatPhone(india, '9820011223'), '+91 9820011223');
  assert.equal(formatPhone(india, ''), '', 'no digits, nothing stored');
});

test('phone numbers: length follows the country', async () => {
  const { phoneProblem } = await load();
  const [india, uk] = COUNTRIES;
  assert.equal(phoneProblem('+91 9820011223', COUNTRIES, india), null);
  assert.match(phoneProblem('+91 98200112', COUNTRIES, india), /must be 10 digits for India \(\+91\)/);
  assert.equal(phoneProblem('+44 201234567', COUNTRIES, uk), null, 'UK: 9 or 10');
  assert.match(phoneProblem('+971 1234567', COUNTRIES), /8 or 9 digits for United Arab Emirates/);
  assert.match(phoneProblem('9820011223', COUNTRIES, india), /choose the country code/);
  assert.equal(phoneProblem('', COUNTRIES, india), null, 'optional when empty');
  assert.equal(phoneProblem('', COUNTRIES, india, { required: true }), 'is required');
  assert.equal(phoneProblem('+91 1', [], india), null, 'no list, no length check');
});

test('contact phones and user mobiles are checked by their office country', async () => {
  const { normalize, checkSpec } = await load();
  const s = normalize(freshSample());
  assert.deepEqual(checkSpec(s, COUNTRIES), [], 'the sample numbers are valid');
  s.organization.contacts[0].contact_phone = '+91 98200';
  s.initial_users[0].user_mobile = '98200';
  const m = checkSpec(s, COUNTRIES).map((c) => c.message).join(' | ');
  assert.match(m, /phone must be 10 digits for India/);
  assert.match(m, /mobile choose the country code/);
});
