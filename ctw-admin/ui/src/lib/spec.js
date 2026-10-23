// The client spec as the form edits it: the shape of intake/intake_schema.json, which the API reads and
// writes as a whole (GET / POST / PUT /api/clients).

// Financial years run April - March (Financial Year Master): FY 2026 = Apr 2026 - Mar 2027.
export function financialYear(date) {
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
}

// Contract length in months from its first to its last day; a started month counts as a month, a single
// extra day (the end written as the anniversary) does not:
// 2026-10-21 → 2027-10-20 and → 2027-10-21 are 12, 2026-04-01 → 2027-03-31 is 12, 2026-10-21 → 2027-01-05 is 3.
// '' when either date is missing or the end is not after the start.
export function monthsBetween(start, end) {
  if (!start || !end || end <= start) return '';
  const [sy, sm, sd] = start.split('-').map(Number);
  const after = new Date(`${end}T00:00:00Z`);
  after.setUTCDate(after.getUTCDate() + 1); // the day after the last day
  // n months after the start; a day past the month's end rolls over (29 Feb + 12 months = 1 Mar).
  const plus = (n) => new Date(Date.UTC(sy, sm - 1 + n, sd));
  let n = 0;
  while (n < 1200 && plus(n + 1) <= after) n++;
  // Days left over after the whole months. One day is the end date written as the anniversary
  // (21 Oct → 21 Oct is a year, as is 21 Oct → 20 Oct); more than that is a started month, which counts.
  const extraDays = Math.round((after - plus(n)) / 86_400_000);
  return extraDays > 1 ? n + 1 : n;
}

// The last day of a contract of `months` months from `start`: the day before the same date that many months
// on (2026-10-21 + 12 -> 2027-10-20). monthsBetween(start, endAfterMonths(start, n)) is n.
// '' without a start or a whole number of months of at least 1.
export function endAfterMonths(start, months) {
  if (!start || !Number.isInteger(months) || months < 1) return '';
  const [y, m, d] = start.split('-').map(Number);
  const end = new Date(Date.UTC(y, m - 1 + months, d)); // a day past the month's end rolls over, as in monthsBetween
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}

// A new client starts empty: nothing is filled in for the admin. Compliance is ticked because every
// licence must include it. Each office gets its contract when the Contract step opens.
export function emptySpec() {
  return {
    organization: {
      customer_id: '',
      customer_name: '',
      category: '',
      industry: '',
      primary_domain: '',
      offices: [],
      contacts: [],
    },
    contracts: [],
    licensing_limits: {
      max_users: '',
      max_vcisos: '',
      max_org_owners: '',
      max_it_admins: '',
      max_control_owners: '',
      max_api_integrations: '',
      max_frameworks: '',
      valid_to: '',
    },
    selected_frameworks: [],
    enabled_modules: ['compliance'],
    integrations: { tools: [] },
    news_watch_profile: { monitored_names: [], monitored_domains: [], monitored_cities: [], custom_keywords: [] },
    security_policies: { sso_type: '', mfa_enforced: false, password_expiry_days: '', session_timeout_minutes: '' },
    initial_users: [],
  };
}

// A spec from the API with every section present, so the form never meets an undefined one.
export function normalize(spec) {
  const base = emptySpec();
  const s = structuredClone(spec);
  s.organization = { ...base.organization, ...s.organization };
  s.organization.offices ||= [];
  s.organization.contacts ||= [];
  // One contract per office; a spec from before that has one "contract", the Primary office's.
  if (!Array.isArray(s.contracts)) {
    const primary = s.organization.offices.find((o) => o.office_type === 'Primary')?.office_id || '';
    s.contracts = s.contract ? [{ ...s.contract, office_id: s.contract.office_id || primary }] : [];
  }
  delete s.contract;
  s.licensing_limits ||= base.licensing_limits;
  s.selected_frameworks ||= [];
  s.enabled_modules ||= ['compliance'];
  s.integrations = { tools: s.integrations?.tools || [] };
  s.news_watch_profile = { ...base.news_watch_profile, ...s.news_watch_profile };
  s.security_policies = { ...base.security_policies, ...s.security_policies };
  s.initial_users ||= [];
  return s;
}

// Next free ID like Cust_00101_003 / User_0004 among the existing ones.
function nextId(prefix, existing, width) {
  let n = 1;
  const taken = new Set(existing);
  while (taken.has(`${prefix}${String(n).padStart(width, '0')}`)) n++;
  return `${prefix}${String(n).padStart(width, '0')}`;
}

export const newOffice = (spec) => ({
  office_id: nextId(`${spec.organization.customer_id || 'Cust'}_`, spec.organization.offices.map((o) => o.office_id), 3),
  office_type: '',
  office_address: '',
  city: '',
  state: '',
  country: '',
  pincode: '',
});

// A contact's ID is <office ID>_<contact number>, e.g. Cust_00301_002_0002. The number runs on across all
// of the client's contacts (highest so far + 1) and stays fixed; the office part follows the contact's office.
const contactNumber = (id) => Number((id || '').match(/_(\d{4})$/)?.[1] || 0);
export const contactIdFor = (spec, officeId, contactId) =>
  `${officeId || spec.organization.customer_id}_${String(contactNumber(contactId)).padStart(4, '0')}`;

// A contact for an office (the first office when none is given).
export function newContact(spec, officeId = spec.organization.offices[0]?.office_id || '') {
  const next = Math.max(0, ...spec.organization.contacts.map((c) => contactNumber(c.contact_id))) + 1;
  return {
    contact_id: `${officeId || spec.organization.customer_id}_${String(next).padStart(4, '0')}`,
    office_id: officeId,
    contact_type: '',
    contact_priority: '',
    contact_person: '',
    designation: '',
    department: '',
    contact_email: '',
    contact_phone: '',
  };
}

// A contract's ID is <office ID>_C<number>, e.g. Cust_00301_002_C002; the number runs on across the client's
// contracts (highest so far + 1) and stays fixed (ctw-admin/lib/contract-id.js gives one on save if missing).
const contractNumber = (id) => Number((id || '').match(/_C(\d+)$/)?.[1] || 0);
export const contractIdFor = (officeId, n) => `${officeId}_C${String(n).padStart(3, '0')}`;

export function newContract(spec, officeId) {
  const next = Math.max(0, ...spec.contracts.map((k) => contractNumber(k.contract_id))) + 1;
  return {
    office_id: officeId,
    contract_id: contractIdFor(officeId, next),
    customer_ref_po: '',
    contract_type: '',
    financial_year: '',
    contract_period_months: '',
    contract_start_date: '',
    contract_end_date: '',
    contract_value: '',
    currency: '',
    invoicing_frequency: '',
  };
}

// The licence runs from the first contract's start to (by default) the last one's end; '' while there is none.
export const lastContractEnd = (spec) => spec.contracts.map((k) => k.contract_end_date).filter(Boolean).sort().at(-1) || '';
export const firstContractStart = (spec) => spec.contracts.map((k) => k.contract_start_date).filter(Boolean).sort()[0] || '';

// A user's ID is <office ID>_<user number>, e.g. Cust_00220_001_User_0001: the number is fixed, the office
// part follows the user's office (just User_0001 until an office is chosen).
export const userNumber = (userId) => (userId || '').match(/User_\d+$/)?.[0] || userId || '';
export const userIdFor = (officeId, userId) => (officeId ? `${officeId}_${userNumber(userId)}` : userNumber(userId));

export const newUser = (spec) => ({
  user_id: nextId('User_', spec.initial_users.map((u) => userNumber(u.user_id)), 4),
  login_id: '',
  user_name: '',
  user_email: '',
  user_mobile: '',
  designation: '',
  department: '',
  role_type: '',
  office_id: '',
});

// A tool pulls at least once a day: 1 to start with, the admin may raise it.
export const newTool = (name) => ({ tool_name: name, enabled: true, target_endpoint: '', pull_frequency_per_day: 1 });

// On a new client, office and contact IDs start with the customer ID: follow it when it changes.
export function renameCustomer(spec, from, to) {
  if (!from || from === to) return spec;
  const re = (id) => (id && id.startsWith(`${from}_`) ? `${to}${id.slice(from.length)}` : id);
  const o = spec.organization;
  o.offices.forEach((x) => (x.office_id = re(x.office_id)));
  o.contacts.forEach((x) => {
    x.contact_id = re(x.contact_id);
    x.office_id = re(x.office_id);
  });
  spec.initial_users.forEach((u) => {
    u.office_id = re(u.office_id);
    u.user_id = re(u.user_id);
  });
  spec.selected_frameworks.forEach((f) => {
    f.office_ids = f.office_ids.map(re);
    if (f.office_review_months) f.office_review_months = Object.fromEntries(Object.entries(f.office_review_months).map(([k, v]) => [re(k), v]));
  });
  spec.contracts.forEach((k) => {
    k.office_id = re(k.office_id);
    k.contract_id = re(k.contract_id);
  });
  return spec;
}

// What the licence's max_frameworks counts: each framework once for every office it applies to
// (ISO 27001 on two offices = 2).
export const frameworkOfficeCount = (spec) => spec.selected_frameworks.reduce((n, f) => n + f.office_ids.length, 0);

// When an office goes, nothing may keep pointing at it.
export function removeOffice(spec, officeId) {
  const o = spec.organization;
  o.offices = o.offices.filter((x) => x.office_id !== officeId);
  spec.contracts = spec.contracts.filter((k) => k.office_id !== officeId);
  const fallback = o.offices[0]?.office_id || '';
  o.contacts.forEach((c) => {
    if (c.office_id !== officeId) return;
    c.office_id = fallback;
    c.contact_id = contactIdFor(spec, fallback, c.contact_id);
  });
  spec.initial_users.forEach((u) => {
    if (u.office_id !== officeId) return;
    u.office_id = fallback;
    u.user_id = userIdFor(fallback, u.user_id);
  });
  spec.selected_frameworks.forEach((f) => {
    f.office_ids = f.office_ids.filter((id) => id !== officeId);
    if (f.office_review_months) delete f.office_review_months[officeId];
  });
  return spec;
}

// What is sent to the API: every field left empty is sent as null (a draft may be partial: the database
// keeps it, and the validator says what is still missing), and the news-watch profile only goes with its module.
export function toPayload(spec) {
  const blankToNull = (v) => {
    if (Array.isArray(v)) return v.map(blankToNull);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blankToNull(x)]));
    return v === '' ? null : v;
  };
  const s = blankToNull(structuredClone(spec));
  if (!s.enabled_modules.includes('news_breach_watch')) delete s.news_watch_profile;
  return s;
}
