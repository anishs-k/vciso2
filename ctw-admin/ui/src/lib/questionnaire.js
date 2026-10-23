// Fills the onboarding form from a client's questionnaire answers (POST /api/questionnaire/read, written by
// intake/questionnaire.py): { "org.customer_name": ..., "office.1.city": ..., "office.2.frameworks": ... }.
// The questionnaire's sections replace the form's. What CTW fills in itself stays as it is: the customer and
// contract IDs, PO number, contract type and value, currency, invoicing. Offices are numbered in the
// questionnaire ("Office 2"); here they get their generated IDs.
import { endAfterMonths, financialYear, frameworkOfficeCount, lastContractEnd, newContact, newContract, newOffice, newTool, newUser, userIdFor } from './spec.js';

const int = (v) => (/^\d+$/.test(String(v ?? '').trim()) ? Number(String(v).trim()) : v ?? '');
const text = (v) => (v === undefined || v === null ? '' : String(v));
const yes = (v) => /^(y|yes|true|1)$/i.test(text(v).trim());
// What CTW fills in on a contract (not asked in the questionnaire), from the form's contract for the office.
const pickCtw = (k) => (k ? Object.fromEntries(['contract_id', 'customer_ref_po', 'contract_type', 'contract_value', 'currency', 'invoicing_frequency'].filter((f) => k[f] !== '' && k[f] != null).map((f) => [f, k[f]])) : {});
const list = (v) => text(v).split(',').map((x) => x.trim()).filter(Boolean);

// The numbered records of one kind ("office" -> { 1: { city: ... }, 3: {...} }), in number order.
function numbered(answers, kind) {
  const out = new Map();
  for (const [key, value] of Object.entries(answers)) {
    const m = key.match(new RegExp(`^${kind}\\.(\\d+)\\.(.+)$`));
    if (!m) continue;
    const n = Number(m[1]);
    if (!out.has(n)) out.set(n, {});
    out.get(n)[m[2]] = value;
  }
  return [...out.entries()].sort((a, b) => a[0] - b[0]);
}

// The framework a client named: its full name, or words all found in one framework's name ("ISO 27001",
// "27001", "DPDPA"). -> the framework, or a reason it is not one.
const words = (s) => text(s).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
function findFramework(frameworks, name) {
  const exact = frameworks.find((f) => f.framework_name.toLowerCase() === text(name).trim().toLowerCase());
  if (exact) return { fw: exact };
  const want = words(name);
  const hits = want.length ? frameworks.filter((f) => want.every((w) => words(f.framework_name).includes(w))) : [];
  if (hits.length === 1) return { fw: hits[0] };
  return { why: hits.length ? `matches several frameworks (${hits.map((f) => f.framework_name.split(' (')[0]).join(', ')}): write more of the name` : 'is not one of the frameworks' };
}

// -> { spec, notes }: a filled-in copy of `spec`, and what could not be used.
export function applyQuestionnaire(spec, answers, catalogue) {
  const s = structuredClone(spec);
  const notes = [];
  const a = answers;
  const o = s.organization;

  o.customer_name = text(a['org.customer_name']);
  o.category = text(a['org.category']);
  o.industry = text(a['org.industry']);
  o.primary_domain = text(a['org.primary_domain']);

  // Offices: questionnaire number -> generated office ID.
  o.offices = [];
  o.contacts = [];
  s.initial_users = [];
  const officeId = new Map();
  // Only as many offices as the client said they have; the primary one is the one they named.
  const count = int(a['office.count']);
  const primary = Number(text(a['office.primary']).match(/\d+/)?.[0]);
  const offices = numbered(a, 'office').filter(([n]) => !Number.isInteger(count) || n <= count);
  // A choice as the client wrote it ("primary office", "it admin") -> the list's own spelling.
  const pick = (choices, v) => {
    const t = text(v).trim().toLowerCase();
    return (choices || []).find((c) => c.toLowerCase() === t) || (choices || []).find((c) => t.includes(c.toLowerCase())) || text(v).trim();
  };
  const opt = catalogue.options;
  for (const [n, x] of offices) {
    if (!['office_address', 'city', 'state', 'country', 'pincode'].some((f) => x[f])) continue;
    const office = newOffice(s);
    Object.assign(office, {
      office_type: n === primary ? 'Primary' : pick(opt.office_types, x.office_type),
      office_address: text(x.office_address),
      country: text(x.country),
      state: text(x.state),
      city: text(x.city),
      pincode: text(x.pincode),
    });
    o.offices.push(office);
    officeId.set(n, office.office_id);
  }
  if (o.offices.length && !o.offices.some((x) => x.office_type === 'Primary')) {
    o.offices[0].office_type = 'Primary';
    notes.push(`No office was marked Primary: ${o.offices[0].city || 'the first office'} was taken as the Primary office`);
  }
  // An office as the client names it: "Office 2", "HQ" / "Head office" / "Primary", or by its city
  // ("Mumbai", "Bengaluru office").
  const officeOf = (value, who) => {
    const v = text(value).trim().toLowerCase();
    if (!v) return '';
    const n = Number(v.match(/^office\s*(\d+)$/)?.[1] ?? (/^\d+$/.test(v) ? v : NaN));
    if (officeId.has(n)) return officeId.get(n);
    const primaryOffice = o.offices.find((x) => x.office_type === 'Primary');
    if (/\b(hq|head|headquarters?|primary|main)\b/.test(v) && primaryOffice) return primaryOffice.office_id;
    const byCity = o.offices.find((x) => x.city && (v.includes(x.city.toLowerCase()) || x.city.toLowerCase().includes(v)));
    if (byCity) return byCity.office_id;
    const byAddress = o.offices.find((x) => x.office_address && x.office_address.toLowerCase().includes(v));
    if (byAddress) return byAddress.office_id;
    notes.push(`${who}: "${value}" is not one of the offices filled in`);
    return '';
  };
  const officesIn = (value, who) =>
    [...new Set(text(value).split(/,|;|\s+and\s+|\s*&\s*|\n/i).map((x) => x.trim()).filter(Boolean).map((x) => officeOf(x, who)).filter(Boolean))];

  for (const [n, x] of numbered(a, 'contact')) {
    const office = officeOf(x.office, `Contact ${n}`);
    const c = newContact(s, office || o.offices[0]?.office_id || '');
    Object.assign(c, {
      office_id: office,
      contact_type: pick(opt.contact_types, x.contact_type),
      contact_priority: int(x.contact_priority),
      contact_person: text(x.contact_person),
      designation: text(x.designation),
      department: text(x.department),
      contact_email: text(x.contact_email),
      contact_phone: text(x.contact_phone),
    });
    o.contacts.push(c);
  }

  // One contract per office, with the dates, and currency / invoicing when the questionnaire asks them; the
  // rest (PO, type, value) is CTW's: kept from the form when the office is the same one.
  const start = text(a['contract.contract_start_date']);
  const months = int(a['contract.contract_period_months']);
  let invoicing = '';
  if (a['contract.invoicing_frequency']) {
    const want = text(a['contract.invoicing_frequency']).trim().toLowerCase();
    const f = (catalogue.options.invoicing_frequencies || []).find((x) => [x.label.toLowerCase(), x.value.toLowerCase()].includes(want));
    if (f) invoicing = f.value;
    else notes.push(`Invoicing: "${a['contract.invoicing_frequency']}" is not one of Monthly, Quarterly, Half-yearly, Yearly`);
  }
  const before = new Map(spec.contracts.map((k) => [k.office_id, k]));
  s.contracts = [];
  for (const office of o.offices) {
    const k = { ...newContract(s, office.office_id), ...pickCtw(before.get(office.office_id)) };
    Object.assign(k, {
      contract_start_date: start,
      contract_period_months: months,
      contract_end_date: endAfterMonths(start, months),
      financial_year: financialYear(start),
    });
    if (a['contract.currency']) k.currency = text(a['contract.currency']).trim().toUpperCase();
    if (invoicing) k.invoicing_frequency = invoicing;
    s.contracts.push(k);
  }

  const l = s.licensing_limits;
  for (const key of ['max_users', 'max_vcisos', 'max_org_owners', 'max_it_admins', 'max_api_integrations']) {
    l[key] = int(a[`licence.${key}`]);
  }
  l.valid_to = lastContractEnd(s);

  // Each office names its frameworks and how often they are reviewed there.
  s.selected_frameworks = [];
  for (const [n, x] of offices) {
    const office = officeId.get(n);
    if (!office || !x.frameworks) continue;
    const months = int(x.review_months);
    for (const name of list(x.frameworks)) {
      const { fw, why } = findFramework(catalogue.frameworks, name);
      if (!fw) {
        notes.push(`Office ${n} frameworks: "${name}" ${why}`);
        continue;
      }
      let f = s.selected_frameworks.find((y) => y.framework_id === fw.framework_id);
      if (!f) {
        f = { framework_id: fw.framework_id, office_ids: [], review_frequency_months: months, office_review_months: {} };
        s.selected_frameworks.push(f);
      }
      if (!f.office_ids.includes(office)) f.office_ids = [...f.office_ids, office].sort();
      if (Number.isInteger(months)) f.office_review_months[office] = months;
    }
  }
  // Or each framework names the offices it applies to ("Framework 1", "Framework 1 - Applied Offices").
  for (const [n, x] of numbered(a, 'framework')) {
    if (!x.name) continue;
    const { fw, why } = findFramework(catalogue.frameworks, x.name);
    if (!fw) {
      notes.push(`Framework ${n}: "${x.name}" ${why}`);
      continue;
    }
    const months = int(x.review_months);
    let f = s.selected_frameworks.find((y) => y.framework_id === fw.framework_id);
    if (!f) {
      f = { framework_id: fw.framework_id, office_ids: [], review_frequency_months: months, office_review_months: {} };
      s.selected_frameworks.push(f);
    }
    for (const office of officesIn(x.offices, `Framework ${n} (${x.name})`)) {
      if (!f.office_ids.includes(office)) f.office_ids = [...f.office_ids, office].sort();
      if (Number.isInteger(months)) f.office_review_months[office] = months;
    }
    if (!x.offices) notes.push(`Framework ${n} (${x.name}): no offices named, choose them in Frameworks`);
  }
  s.selected_frameworks.sort((x, y) => x.framework_id - y.framework_id);
  // The licence: what the client asked for, else what was chosen (each framework once per office).
  l.max_frameworks = int(a['licence.max_frameworks']) || frameworkOfficeCount(s) || '';

  const order = catalogue.modules.map((m) => m.module_name);
  s.enabled_modules = order.filter((m) => m === 'compliance' || yes(a[`module.${m}`]));
  s.news_watch_profile = {
    ...s.news_watch_profile,
    monitored_names: list(a['news.monitored_names']),
    monitored_domains: list(a['news.monitored_domains']),
  };

  s.security_policies = {
    ...s.security_policies,
    sso_type: text(a['security.sso_type']),
    sso_metadata_url: text(a['security.sso_metadata_url']),
    session_timeout_minutes: int(a['security.session_timeout_minutes']),
    mfa_enforced: yes(a['security.mfa_enforced']),
  };
  // A tool the client uses (or gave an endpoint for), with its endpoint.
  s.integrations.tools = catalogue.options.tools
    .filter((t) => yes(a[`tool.${t}.used`]) || a[`tool.${t}.endpoint`])
    .map((t) => ({ ...newTool(t), target_endpoint: text(a[`tool.${t}.endpoint`]) }));

  for (const [n, x] of numbered(a, 'user')) {
    const u = newUser(s);
    const office = officeOf(x.office, `User ${n}`);
    Object.assign(u, {
      user_id: userIdFor(office, u.user_id),
      login_id: text(x.login_id),
      user_name: text(x.user_name),
      user_email: text(x.user_email),
      user_mobile: text(x.user_mobile),
      designation: text(x.designation),
      department: text(x.department),
      role_type: pick(opt.role_types, x.role_type),
      office_id: office,
    });
    s.initial_users.push(u);
  }

  return { spec: s, notes };
}
