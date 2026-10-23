// The client questionnaire: the template download, and reading a filled-in copy back.
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { startStack, signInFully, dockerAvailable } = require('../helpers/harness');
const { pythonPath } = require('../../lib/python');

// Fills a questionnaire file with openpyxl: `answers` ({ key: value }) on "Company Details" by the hidden
// key column, `cells` ({ "Offices!G5": value }) straight into the tables.
function fillIn(template, answers, cells = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctw-q-test-'));
  const src = path.join(dir, 'template.xlsx');
  const out = path.join(dir, 'filled.xlsx');
  fs.writeFileSync(src, template);
  execFileSync(pythonPath(), ['-c', [
    'import json, sys, openpyxl',
    'wb = openpyxl.load_workbook(sys.argv[1]); ws = wb["Company Details"]; a = json.loads(sys.argv[3])',
    'for r in ws.iter_rows(min_row=2):',
    '    if r[4].value in a: r[2].value = a[r[4].value]',
    'for ref, v in json.loads(sys.argv[4]).items():',
    '    sheet, cell = ref.split("!"); wb[sheet][cell] = v',
    'wb.save(sys.argv[2])',
  ].join('\n'), src, out, JSON.stringify(answers), JSON.stringify(cells)]);
  const data = fs.readFileSync(out);
  fs.rmSync(dir, { recursive: true, force: true });
  return data.toString('base64');
}

test('questionnaire', { skip: !dockerAvailable() && 'Docker is not running', timeout: 180_000 }, async (t) => {
  const stack = await startStack();
  t.after(() => stack.stop());
  const { api } = await signInFully(stack);
  let template;

  await t.test('the template is an Excel file', async () => {
    const r = await api.call('GET', '/questionnaire/template');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-disposition'), /Client_Onboarding_Questionnaire\.xlsx/);
    assert.equal(r.body.subarray(0, 2).toString(), 'PK', 'an .xlsx is a zip');
    template = r.body;
  });

  await t.test('a filled-in questionnaire reads back by key; dates become YYYY-MM-DD', async () => {
    // Offices: row 4 is Office 1, row 5 Office 2; B = type, D = city, G = pincode, H = frameworks.
    // Office 1 is left blank: Office 2 keeps its number, as Contacts and Users name it.
    const file = fillIn(template, {
      'org.customer_name': 'Acme Finance',
      'contract.contract_start_date': '01-Apr-2026',
      'licence.max_it_admins': 2,
      'module.alerting': 'Yes',
    }, {
      'Offices!B5': 'Primary', 'Offices!D5': 'Pune', 'Offices!G5': 411001, 'Offices!H5': 'ISO 27001, DPDPA',
      'Users!B4': 'Amit Kumar', 'Users!H4': 'IT Admin', 'Users!I4': 'Office 2',
    });
    const r = await api.call('POST', '/questionnaire/read', { file });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.answers, {
      'org.customer_name': 'Acme Finance',
      'contract.contract_start_date': '2026-04-01',
      'licence.max_it_admins': 2,
      'module.alerting': 'Yes',
      'office.2.office_type': 'Primary',
      'office.2.city': 'Pune',
      'office.2.pincode': 411001,
      'office.2.frameworks': 'ISO 27001, DPDPA',
      'user.1.user_name': 'Amit Kumar',
      'user.1.role_type': 'IT Admin',
      'user.1.office': 'Office 2',
    });
    assert.deepEqual(r.body.warnings, []);
  });

  await t.test("the client form (one sheet, labels in column B) is read, its free-text cells split up", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctw-q-test-'));
    const out = path.join(dir, 'form.xlsx');
    // The layout of QA/Final_Onboarding_Questionnaire_FrameworkLogic.xlsx, a few rows of each kind.
    execFileSync(pythonPath(), ['-c', [
      'import sys, openpyxl',
      'wb = openpyxl.Workbook(); ws = wb.active; ws.title = "Client Onboarding Form"',
      'rows = [("Category", "Information Required", "Client Response (Please fill here)", "Instructions / Examples"),',
      '  ("1. Company Details",), ("Company Details", "Company Legal Name", "Acme Finance"),',
      '  ("2. Office Details",), ("Office Details", "Office Type", "Primary"),',
      '  ("Office Details", "Complete Address", "12 MG Road, Pune, Maharashtra, India, 411001"),',
      '  ("Office Details", "Additional Offices (If any)", "Secondary: 5 Park St, Kolkata, West Bengal, India, 700016"),',
      '  ("3. Contacts",), ("Contacts", "Primary Contact - Full Name", "Rahul Sharma"), ("Contacts", "Primary Contact - Office Location", "HQ"),',
      '  ("Contacts", "Additional Contacts (If any)", "Emergency, 1, Kolkata, Vikas Singh, SOC Lead, vikas@acme.in, +91 9876543214"),',
      '  ("4. Contract",), ("Contract", "Contract Start Date", "01-Apr-2026"), ("Contract", "Invoicing Frequency", "Quarterly"),',
      '  ("6. Compliance Frameworks",), ("Compliance Frameworks", "Framework 1", "ISO 27001"),',
      '  ("Compliance Frameworks", "Framework 1 - Applied Offices", "HQ, Kolkata"),',
      '  ("Compliance Frameworks", "Additional Frameworks (If any)", "DPDPA 2023 - HQ - 6 months"),',
      '  ("8. Login & Security",), ("Login & Security", "Login Method", "Azure AD"),',
      '  ("Login & Security", "Scanner Tool URLs", "Tenable: https://cloud.tenable.com"),',
      '  ("9. Initial Users",), ("Initial Users", "User 1 (IT Admin) - Full Name", "Amit Kumar"), ("Initial Users", "User 1 - Role", "IT Admin")]',
      'for r in rows: ws.append(r)',
      'wb.save(sys.argv[1])',
    ].join('\n'), out]);
    const file = fs.readFileSync(out).toString('base64');
    fs.rmSync(dir, { recursive: true, force: true });
    const r = await api.call('POST', '/questionnaire/read', { file });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.warnings, []);
    assert.deepEqual(r.body.answers, {
      'org.customer_name': 'Acme Finance',
      'contract.contract_start_date': '2026-04-01',
      'contract.invoicing_frequency': 'Quarterly',
      'security.sso_type': 'AZURE_AD',
      'tool.Tenable.used': 'Yes',
      'tool.Tenable.endpoint': 'https://cloud.tenable.com',
      'office.1.office_type': 'Primary',
      'office.1.office_address': '12 MG Road', 'office.1.city': 'Pune', 'office.1.state': 'Maharashtra',
      'office.1.country': 'India', 'office.1.pincode': '411001',
      'office.2.office_type': 'Secondary',
      'office.2.office_address': '5 Park St', 'office.2.city': 'Kolkata', 'office.2.state': 'West Bengal',
      'office.2.country': 'India', 'office.2.pincode': '700016',
      'contact.1.contact_person': 'Rahul Sharma', 'contact.1.office': 'HQ',
      'contact.2.contact_type': 'Emergency', 'contact.2.contact_priority': 1, 'contact.2.office': 'Kolkata',
      'contact.2.contact_person': 'Vikas Singh', 'contact.2.designation': 'SOC Lead',
      'contact.2.contact_email': 'vikas@acme.in', 'contact.2.contact_phone': '+91 9876543214',
      'framework.1.name': 'ISO 27001', 'framework.1.offices': 'HQ, Kolkata',
      'framework.2.name': 'DPDPA 2023', 'framework.2.offices': 'HQ', 'framework.2.review_months': '6',
      'user.1.user_name': 'Amit Kumar', 'user.1.role_type': 'IT Admin',
    });
  });

  await t.test('an empty questionnaire, a bad date and a file that is not one are reported', async () => {
    let r = await api.call('POST', '/questionnaire/read', { file: template.toString('base64') });
    assert.deepEqual(r.body.warnings, ['The questionnaire has no answers filled in']);
    r = await api.call('POST', '/questionnaire/read', { file: fillIn(template, { 'contract.contract_start_date': 'next April' }) });
    assert.match(r.body.warnings.join(), /From which date should the contract start\?: "next April" is not a date/);
    r = await api.call('POST', '/questionnaire/read', { file: Buffer.from('not excel').toString('base64') });
    assert.equal(r.status, 400);
    r = await api.call('POST', '/questionnaire/read', {});
    assert.equal(r.status, 400);
  });
});
