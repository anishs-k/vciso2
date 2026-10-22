// Checks the form runs as the admin types, so most problems show before saving. They follow the rules of
// intake/client_intake.py validate_spec; that validator (POST /api/clients/:id/validate) stays the judge.
import { financialYear } from './spec.js';
import { countryNamed, phoneProblem } from './phone.js';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CUSTOMER_ID = /^[A-Za-z0-9_-]{3,32}$/;
const int = (v) => Number.isInteger(v);
const today = () => new Date().toISOString().slice(0, 10);

export const SECTIONS = [
  { key: 'organization', label: 'Organisation', lead: "Fill in the organisation's core details." },
  { key: 'offices', label: 'Offices', lead: 'Where the client works. Exactly one office is the Primary office.' },
  { key: 'contacts', label: 'Contacts', lead: 'Who to call, and in what order.' },
  { key: 'contract', label: 'Contract', lead: 'The agreement this licence is sold under.' },
  { key: 'licence', label: 'Licence limits', lead: "Sealed into the client's database: the client cannot go past them." },
  { key: 'frameworks', label: 'Frameworks', lead: 'The compliance frameworks licensed, and the offices they apply to.' },
  { key: 'modules', label: 'Modules', lead: 'The parts of the platform the client has bought.' },
  { key: 'security', label: 'Integrations & security', lead: 'Scanner tools and how users sign in.' },
  { key: 'users', label: 'Initial users', lead: 'The first people to sign in to the client platform.' },
];

// -> [{ section, message }]. `countries` (from /api/geo/countries) let phone numbers be checked against
// their country's code and length; without them only "required" is checked.
export function checkSpec(spec, countries = []) {
  const out = [];
  const add = (section, message) => out.push({ section, message });
  const org = spec.organization;
  const officeCountry = (id) => countryNamed(countries, org.offices.find((o) => o.office_id === id)?.country);

  if (!CUSTOMER_ID.test(org.customer_id || '')) add('organization', 'Customer ID: 3–32 letters, digits, _ or -');
  if (!org.customer_name?.trim()) add('organization', 'Company legal name is required');
  if (!org.category) add('organization', 'Choose a category');
  if (!org.industry?.trim()) add('organization', 'Industry is required');
  if (!org.primary_domain?.trim()) add('organization', 'Primary domain is required');

  const offices = org.offices;
  const officeIds = new Set(offices.map((o) => o.office_id));
  if (!offices.length) add('offices', 'Add at least one office');
  if (offices.length && offices.filter((o) => o.office_type === 'Primary').length !== 1) {
    add('offices', 'Exactly one office must be Primary');
  }
  offices.forEach((o, i) => {
    if (!o.office_type) add('offices', `Office ${i + 1}: choose the office type`);
    const missing = ['office_address', 'country', 'state', 'city', 'pincode'].filter((k) => !o[k]?.trim());
    if (missing.length) add('offices', `Office ${i + 1}: ${missing.map((m) => m.replace('office_', '')).join(', ')} missing`);
  });

  org.contacts.forEach((c, i) => {
    const who = c.contact_person || `Contact ${i + 1}`;
    if (!c.contact_type) add('contacts', `${who}: choose the contact type`);
    if (!c.contact_person?.trim() || !c.designation?.trim()) add('contacts', `${who}: name and designation are required`);
    if (!EMAIL.test(c.contact_email || '')) add('contacts', `${who}: email is not valid`);
    const phone = phoneProblem(c.contact_phone, countries, officeCountry(c.office_id), { required: true });
    if (phone) add('contacts', `${who}: phone ${phone}`);
    if (!officeIds.has(c.office_id)) add('contacts', `${who}: choose an office`);
    if (!int(c.contact_priority) || c.contact_priority < 1) add('contacts', `${who}: priority must be 1 or more`);
  });

  const k = spec.contract;
  if (!k.customer_ref_po?.trim()) add('contract', "Client's PO number is required");
  if (!k.contract_start_date || !k.contract_end_date) add('contract', 'Start and end dates are required');
  else if (k.contract_end_date <= k.contract_start_date) add('contract', 'End date must be after the start date');
  if (!int(k.contract_period_months) || k.contract_period_months < 1 || k.contract_period_months > 60) {
    add('contract', 'Period must be 1–60 months');
  }
  if (k.contract_start_date && k.financial_year !== financialYear(k.contract_start_date)) {
    add('contract', `Financial year should be ${financialYear(k.contract_start_date)} for this start date (April–March)`);
  }
  if (k.contract_value === '' || k.contract_value < 0) add('contract', 'Contract value must be 0 or more');
  if (!k.currency?.trim()) add('contract', 'Currency is required');
  if (!k.invoicing_frequency) add('contract', 'Choose how often to invoice');

  const l = spec.licensing_limits;
  for (const [key, label, min] of [['max_users', 'Max users', 1], ['max_vcisos', 'Max vCISOs', 1],
    ['max_org_owners', 'Max Org Owners', 1], ['max_api_integrations', 'Max tool integrations', 0],
    ['max_frameworks', 'Max frameworks', 1]]) {
    if (!int(l[key]) || l[key] < min) add('licence', `${label} must be a whole number ≥ ${min}`);
  }
  if (l.max_control_owners !== '' && l.max_control_owners != null && l.max_control_owners >= l.max_users) {
    add('licence', 'Max control owners must be less than max users');
  }
  if (int(l.max_vcisos) && int(l.max_org_owners) && l.max_vcisos + l.max_org_owners > l.max_users) {
    add('licence', 'vCISOs + Org Owners cannot exceed max users');
  }
  if (!l.valid_to) add('licence', 'Licence end date is required');
  else {
    if (l.valid_to < today()) add('licence', 'Licence end date is in the past');
    if (k.contract_start_date && l.valid_to <= k.contract_start_date) add('licence', 'Licence must end after the contract starts');
  }

  const fw = spec.selected_frameworks;
  if (!fw.length) add('frameworks', 'Select at least one framework');
  if (int(l.max_frameworks) && fw.length > l.max_frameworks) {
    add('frameworks', `${fw.length} selected, licence allows ${l.max_frameworks}`);
  }
  fw.forEach((f) => !f.office_ids.length && add('frameworks', `Framework ${f.framework_id}: choose at least one office`));

  const mods = spec.enabled_modules;
  if (!mods.includes('compliance')) add('modules', 'Compliance is mandatory');
  if (mods.includes('news_breach_watch')) {
    if (!mods.includes('alerting')) add('modules', 'News & Breach Watch needs Alerting');
    const w = spec.news_watch_profile;
    if (!w.monitored_names.length && !w.monitored_domains.length) add('modules', 'News watch: add a name or a domain to monitor');
  }

  const active = spec.integrations.tools.filter((t) => t.enabled);
  if (active.length && !mods.includes('vulnerabilities')) add('security', 'Scanner tools need the Vulnerabilities module');
  if (int(l.max_api_integrations) && active.length > l.max_api_integrations) {
    add('security', `${active.length} active tools, licence allows ${l.max_api_integrations}`);
  }
  spec.integrations.tools.forEach((t) => {
    if (!int(t.pull_frequency_per_day) || t.pull_frequency_per_day < 1) add('security', `${t.tool_name}: pulls per day must be 1 or more`);
  });
  if (!spec.security_policies.sso_type) add('security', 'Choose how users sign in');
  else if (spec.security_policies.sso_type !== 'LOCAL' && !spec.security_policies.sso_metadata_url?.trim()) {
    add('security', 'SSO needs its metadata URL');
  }

  const users = spec.initial_users;
  if (!users.length) add('users', 'Add at least one initial user');
  if (int(l.max_users) && users.length > l.max_users) add('users', `${users.length} users, licence allows ${l.max_users}`);
  for (const [key, label] of [['login_id', 'Login IDs'], ['user_email', 'Emails']]) {
    const v = users.map((u) => (u[key] || '').toLowerCase()).filter(Boolean);
    if (new Set(v).size !== v.length) add('users', `${label} must be unique`);
  }
  users.forEach((u, i) => {
    const who = u.user_name || `User ${i + 1}`;
    if (!u.user_name?.trim() || !u.login_id?.trim()) add('users', `${who}: name and login ID are required`);
    if (!EMAIL.test(u.user_email || '')) add('users', `${who}: email is not valid`);
    const mobile = phoneProblem(u.user_mobile, countries, officeCountry(u.office_id));
    if (mobile) add('users', `${who}: mobile ${mobile}`);
    if (!u.role_type) add('users', `${who}: choose a role`);
    if (!officeIds.has(u.office_id)) add('users', `${who}: choose an office`);
  });
  const vcisos = users.filter((u) => u.role_type === 'vCISO').length;
  const owners = users.filter((u) => u.role_type === 'Organisation Owner').length;
  if (users.length && !users.some((u) => u.role_type === 'IT Admin')) add('users', 'At least one user must be an IT Admin');
  if (int(l.max_vcisos) && vcisos > l.max_vcisos) add('users', `${vcisos} vCISOs, licence allows ${l.max_vcisos}`);
  if (int(l.max_org_owners) && owners !== l.max_org_owners) {
    add('users', `Organisation Owners: ${owners} added, the licence sets ${l.max_org_owners}: add exactly ${l.max_org_owners}`);
  }

  return out;
}
