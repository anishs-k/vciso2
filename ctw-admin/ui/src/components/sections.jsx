// The nine sections of the client form. Each gets the spec, `edit(fn)` (fn mutates a copy of the spec)
// and the catalogue from the API (frameworks, modules, choice lists).
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Alert, Field, NumberField, SearchSelect, Select, Text } from './ui';
import { useCountries, usePlaces } from '../lib/geo';
import { countryNamed } from '../lib/phone';
import { PhoneField } from './PhoneField';
import { endAfterMonths, financialYear, monthsBetween, newContact, newOffice, newTool, newUser, removeOffice, renameCustomer, userIdFor, userNumber } from '../lib/spec';

const MODULE_INFO = {
  compliance: ['Compliance', 'Frameworks, controls, evidence, audits. Always included.'],
  vulnerabilities: ['Vulnerability management', 'Scanner integrations and findings.'],
  alerting: ['Alerting', 'Alert rules and delivery (website, email, app).'],
  mobile_access: ['Mobile access', 'App push notifications.'],
  news_breach_watch: ['News & Breach Watch', 'Monitors the news for the client\'s names and domains. Needs Alerting.'],
  onprem_ai_assessment: ['On-prem AI assessment', 'AI-assisted assessment on the client\'s premises.'],
  incidents: ['Incidents', 'Incident register and response.'],
};

function OfficeSelect({ spec, value, onChange, label = 'Office' }) {
  return (
    <Select
      label={label}
      required
      value={value}
      onChange={onChange}
      placeholder={spec.organization.offices.length ? 'Choose…' : 'Add an office first'}
      options={spec.organization.offices.map((o) => ({ value: o.office_id, label: `${o.city || o.office_id} (${o.office_type})` }))}
    />
  );
}

// ─── 1. Organisation ────────────────────────────────────────────────────────────────────────
export function Organisation({ spec, edit, catalogue, isNew }) {
  const o = spec.organization;
  const set = (k) => (v) => edit((s) => (s.organization[k] = v));
  return (
    <div className="stack">
      <div className="grid-2">
        <Text
          label="Customer ID"
          required
          value={o.customer_id}
          disabled={!isNew}
          placeholder="Letters, digits, _ or -"
          hint={isNew ? 'Cannot be changed later. 3–32 letters, digits, _ or -' : 'Fixed once the client exists'}
          onChange={(v) => edit((s) => {
            renameCustomer(s, s.organization.customer_id, v);
            s.organization.customer_id = v;
          })}
        />
        <Text label="Company legal name" required value={o.customer_name} onChange={set('customer_name')} />
        <Select label="Category" required value={o.category} onChange={set('category')} options={catalogue.options.categories} placeholder="Choose…" />
        <Text label="Industry" required value={o.industry} onChange={set('industry')} placeholder="Industry sector" />
        <Text label="Primary domain" required value={o.primary_domain} onChange={set('primary_domain')} placeholder="Company domain" />
      </div>
    </div>
  );
}

// Country, then one of its states, then one of that state's cities. Changing a choice clears the ones
// below it. A list that has no entries (places not loaded, a country without states) leaves typing free.
function OfficePlace({ office, edit }) {
  const { countries, states, cities } = usePlaces(office.country, office.state);
  const loading = (list) => (list === null ? 'Loading…' : undefined);
  return (
    <>
      <SearchSelect
        label="Country"
        required
        value={office.country}
        options={countries || []}
        freeText={countries?.length === 0}
        placeholder={loading(countries) || 'Type to search…'}
        onChange={(v) => edit((o) => {
          if (v !== o.country) Object.assign(o, { country: v, state: '', city: '' });
        })}
      />
      <SearchSelect
        label="State"
        required
        value={office.state}
        options={states || []}
        freeText={states?.length === 0}
        disabled={!office.country}
        placeholder={!office.country ? 'Choose a country first' : loading(states) || 'Type to search…'}
        onChange={(v) => edit((o) => {
          if (v !== o.state) Object.assign(o, { state: v, city: '' });
        })}
      />
      <SearchSelect
        label="City"
        required
        value={office.city}
        options={cities || []}
        freeText={cities?.length === 0}
        disabled={!office.state}
        placeholder={!office.state ? 'Choose a state first' : loading(cities) || 'Type to search…'}
        onChange={(v) => edit((o) => (o.city = v))}
      />
    </>
  );
}

// ─── 2. Offices ─────────────────────────────────────────────────────────────────────────────
export function Offices({ spec, edit, catalogue }) {
  const offices = spec.organization.offices;
  return (
    <div className="stack">
      {!offices.length && <Alert>Add the client's offices. Exactly one is the Primary office.</Alert>}
      {offices.map((o, i) => {
        const set = (k) => (v) => edit((s) => (s.organization.offices[i][k] = v));
        return (
          <div className="repeat" key={o.office_id}>
            <div className="repeat-head">
              <h3 className="grow">
                Office {i + 1} <span className="muted mono">{o.office_id}</span>
              </h3>
              <button type="button" className="link-danger" onClick={() => edit((s) => removeOffice(s, o.office_id))}>
                Remove
              </button>
            </div>
            <div className="grid-3">
              <Select label="Type" required value={o.office_type} onChange={set('office_type')} options={catalogue.options.office_types} placeholder="Choose…" />
              <Text label="Address" required value={o.office_address} onChange={set('office_address')} />
              <OfficePlace office={o} edit={(fn) => edit((s) => fn(s.organization.offices[i]))} />
              <Text label="Pincode" required value={o.pincode} onChange={set('pincode')} />
            </div>
          </div>
        );
      })}
      <div>
        <button type="button" onClick={() => edit((s) => s.organization.offices.push(newOffice(s)))}>
          + Add office
        </button>
      </div>
    </div>
  );
}

// ─── 3. Contacts ────────────────────────────────────────────────────────────────────────────
// The country of the office with this ID (from the country list), for a phone number's default code.
const officeCountry = (spec, countries, officeId) =>
  countryNamed(countries, spec.organization.offices.find((o) => o.office_id === officeId)?.country);

export function Contacts({ spec, edit, catalogue }) {
  const contacts = spec.organization.contacts;
  const countries = useCountries();
  return (
    <div className="stack">
      {!contacts.length && (
        <Alert>Executive, vCISO, IT security, escalation and emergency contacts. Priority 1 is called first.</Alert>
      )}
      {contacts.map((c, i) => {
        const set = (k) => (v) => edit((s) => (s.organization.contacts[i][k] = v));
        return (
          <div className="repeat" key={c.contact_id}>
            <div className="repeat-head">
              <h3 className="grow">
                {c.contact_person || `Contact ${i + 1}`} <span className="muted mono">{c.contact_id}</span>
              </h3>
              <button type="button" className="link-danger" onClick={() => edit((s) => s.organization.contacts.splice(i, 1))}>
                Remove
              </button>
            </div>
            <div className="grid-3">
              <Select label="Type" required value={c.contact_type} onChange={set('contact_type')} options={catalogue.options.contact_types} placeholder="Choose…" />
              <NumberField label="Priority" required min={1} value={c.contact_priority} onChange={set('contact_priority')} />
              <OfficeSelect spec={spec} value={c.office_id} onChange={set('office_id')} />
              <Text label="Name" required value={c.contact_person} onChange={set('contact_person')} />
              <Text label="Designation" required value={c.designation} onChange={set('designation')} />
              <Text label="Department" value={c.department} onChange={set('department')} />
              <Text label="Email" required type="email" value={c.contact_email} onChange={set('contact_email')} />
              <PhoneField
                label="Phone"
                required
                value={c.contact_phone}
                onChange={set('contact_phone')}
                countries={countries}
                preferred={officeCountry(spec, countries, c.office_id)}
              />
            </div>
          </div>
        );
      })}
      <div>
        <button
          type="button"
          disabled={!spec.organization.offices.length}
          onClick={() => edit((s) => s.organization.contacts.push(newContact(s)))}
        >
          + Add contact
        </button>
        {!spec.organization.offices.length && <span className="muted small"> Add an office first.</span>}
      </div>
    </div>
  );
}

// ─── 4. Contract ────────────────────────────────────────────────────────────────────────────
// The next generated contract ID for this customer, from the API (the number is not used up until saved).
const nextContractId = (customerId) =>
  api(`/clients/next-contract-id?customer_id=${encodeURIComponent(customerId)}`).then((r) => r.contract_id);

export function Contract({ spec, edit, catalogue }) {
  const k = spec.contract;
  const set = (key) => (v) => edit((s) => (s.contract[key] = v));
  const cid = spec.organization.customer_id;
  // An empty contract ID is filled in as soon as the step opens; the admin may change it.
  useEffect(() => {
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(cid || '') || k.contract_id) return;
    nextContractId(cid)
      .then((id) => edit((s) => !s.contract.contract_id && (s.contract.contract_id = id)))
      .catch(() => {}); // left empty, the API generates it on save
  }, [cid]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid-3">
      <Text label="Contract ID" value={k.contract_id} onChange={set('contract_id')} />
      <Text label="Client's PO number" required value={k.customer_ref_po} onChange={set('customer_ref_po')} />
      <Select label="Type" value={k.contract_type} onChange={set('contract_type')} options={catalogue.options.contract_types} placeholder="Choose…" />
      <Text
        label="Start date"
        required
        type="date"
        value={k.contract_start_date}
        onChange={(v) => edit((s) => {
          const k = s.contract;
          k.contract_start_date = v;
          k.financial_year = financialYear(v);
          // With a period, the end date follows the start; without one, the period comes from the dates.
          if (v && Number.isInteger(k.contract_period_months)) k.contract_end_date = endAfterMonths(v, k.contract_period_months);
          else k.contract_period_months = monthsBetween(v, k.contract_end_date);
        })}
      />
      <Text
        label="End date"
        required
        type="date"
        value={k.contract_end_date}
        onChange={(v) => edit((s) => {
          s.contract.contract_end_date = v;
          s.contract.contract_period_months = monthsBetween(s.contract.contract_start_date, v);
        })}
      />
      <NumberField
        label="Period (months)"
        required
        min={1}
        max={60}
        value={k.contract_period_months}
        onChange={(v) => edit((s) => {
          s.contract.contract_period_months = v;
          const end = endAfterMonths(s.contract.contract_start_date, v);
          if (end) s.contract.contract_end_date = end;
        })}
        hint="From the dates; or enter it to set the end date"
      />
      <NumberField
        label="Financial year"
        required
        value={k.financial_year}
        onChange={set('financial_year')}
        hint="April–March; set from the start date"
      />
      <NumberField label="Contract value" min={0} value={k.contract_value} onChange={set('contract_value')} />
      <Select label="Currency" required value={k.currency} onChange={set('currency')} options={['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD']} placeholder="Choose…" />
      <Select label="Invoicing" required value={k.invoicing_frequency} onChange={set('invoicing_frequency')} options={catalogue.options.invoicing_frequencies} placeholder="Choose…" />
    </div>
  );
}

// ─── 5. Licence limits ──────────────────────────────────────────────────────────────────────
export function Licence({ spec, edit }) {
  const l = spec.licensing_limits;
  const set = (key) => (v) => edit((s) => (s.licensing_limits[key] = v));
  // On opening the step, an empty licence end takes the contract's end date; the admin may change it.
  useEffect(() => {
    if (!l.valid_to && spec.contract.contract_end_date) {
      edit((s) => !s.licensing_limits.valid_to && (s.licensing_limits.valid_to = s.contract.contract_end_date));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="stack">
      <Alert tone="warn">
        These limits are sealed into the client's database and enforced there: the client cannot go past them.
        Changing them later needs a full build (a new database).
      </Alert>
      <div className="grid-3">
        <NumberField label="Max users" required min={1} value={l.max_users} onChange={set('max_users')} />
        <NumberField label="Max vCISOs" required min={1} value={l.max_vcisos} onChange={set('max_vcisos')} />
        <NumberField label="Max Organisation Owners" required min={1} value={l.max_org_owners} onChange={set('max_org_owners')} />
        <NumberField label="Max control owners" min={1} value={l.max_control_owners} onChange={set('max_control_owners')} hint="Less than max users" />
        <Text
          label="Max viewer only"
          value={Number.isInteger(l.max_users) && Number.isInteger(l.max_control_owners) ? l.max_users - l.max_control_owners : ''}
          disabled
          hint="Max users − max control owners"
        />
        <NumberField label="Max tool integrations" required min={0} value={l.max_api_integrations} onChange={set('max_api_integrations')} />
        <NumberField label="Max frameworks" required min={1} value={l.max_frameworks} onChange={set('max_frameworks')} />
        <Text
          label="Licence valid till"
          required
          type="date"
          value={l.valid_to}
          onChange={set('valid_to')}
          hint="Taken from the contract's end date; after this date the platform turns read-only"
        />
      </div>
    </div>
  );
}

// ─── 6. Frameworks ──────────────────────────────────────────────────────────────────────────
const REVIEW_MONTHS = [1, 3, 6, 12, 24, 36];
const monthsLabel = (m) => `${m} month${m > 1 ? 's' : ''}`;

export function Frameworks({ spec, edit, catalogue }) {
  const selected = new Map(spec.selected_frameworks.map((f, i) => [f.framework_id, i]));
  const max = spec.licensing_limits.max_frameworks;
  const toggle = (id) =>
    edit((s) => {
      const i = s.selected_frameworks.findIndex((f) => f.framework_id === id);
      if (i >= 0) s.selected_frameworks.splice(i, 1);
      else {
        s.selected_frameworks.push({
          framework_id: id,
          office_ids: [],
          review_frequency_months: '',
        });
        s.selected_frameworks.sort((a, b) => a.framework_id - b.framework_id);
      }
    });
  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        {selected.size} of {max || '?'} allowed by the licence. Only the selected frameworks' controls go into the
        client's database.
      </p>
      {catalogue.frameworks.map((fw) => {
        const i = selected.get(fw.framework_id);
        const on = i !== undefined;
        const f = on ? spec.selected_frameworks[i] : null;
        return (
          <div className={`pick ${on ? 'on' : ''}`} key={fw.framework_id}>
            <input
              type="checkbox"
              checked={on}
              onChange={() => toggle(fw.framework_id)}
              aria-label={fw.framework_name}
              style={{ marginTop: 3 }}
            />
            <div className="grow stack" style={{ gap: 10 }}>
              <div>
                <strong>{fw.framework_name}</strong> <span className="muted mono">#{fw.framework_id}</span>
              </div>
              {on && (
                <Field label="Applies to offices" required>
                  <div className="stack" style={{ gap: 8 }}>
                    {spec.organization.offices.map((o) => {
                      const applies = f.office_ids.includes(o.office_id);
                      const months = f.office_review_months?.[o.office_id] ?? f.review_frequency_months ?? '';
                      return (
                        <div className="office-review" key={o.office_id}>
                          <label className="check grow">
                            <input
                              type="checkbox"
                              checked={applies}
                              onChange={(e) =>
                                edit((s) => {
                                  const ff = s.selected_frameworks[i];
                                  if (e.target.checked) ff.office_ids = [...ff.office_ids, o.office_id].sort();
                                  else {
                                    ff.office_ids = ff.office_ids.filter((x) => x !== o.office_id);
                                    if (ff.office_review_months) delete ff.office_review_months[o.office_id];
                                  }
                                })
                              }
                            />
                            <span>
                              {o.city || o.office_id} <span className="muted">({o.office_type})</span>
                            </span>
                          </label>
                          <span className="muted small">Review every</span>
                          <select
                            aria-label={`Review every, ${o.city || o.office_id}`}
                            value={applies ? months : ''}
                            onChange={(e) =>
                              edit((s) => {
                                const ff = s.selected_frameworks[i];
                                // Choosing an interval for an office also makes the framework apply to it.
                                if (e.target.value !== '' && !ff.office_ids.includes(o.office_id)) {
                                  ff.office_ids = [...ff.office_ids, o.office_id].sort();
                                }
                                ff.office_review_months = { ...ff.office_review_months };
                                if (e.target.value === '') delete ff.office_review_months[o.office_id];
                                else ff.office_review_months[o.office_id] = Number(e.target.value);
                              })
                            }
                          >
                            <option value="">Choose…</option>
                            {REVIEW_MONTHS.map((m) => (
                              <option key={m} value={m}>
                                {monthsLabel(m)}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                    {!spec.organization.offices.length && <span className="muted small">Add an office first.</span>}
                  </div>
                </Field>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 7. Modules ─────────────────────────────────────────────────────────────────────────────
function ListInput({ label, values, onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <Field label={label}>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <button type="button" onClick={add}>
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="chips" style={{ marginTop: 6 }}>
          {values.map((v) => (
            <span className="chip" key={v}>
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}

export function Modules({ spec, edit, catalogue }) {
  const mods = spec.enabled_modules;
  const w = spec.news_watch_profile;
  const setWatch = (k) => (v) => edit((s) => (s.news_watch_profile[k] = v));
  return (
    <div className="stack">
      {catalogue.modules.map((m) => {
        const on = mods.includes(m.module_name);
        const [title, desc] = MODULE_INFO[m.module_name] || [m.module_name, ''];
        return (
          <label className={`pick ${on ? 'on' : ''}`} key={m.module_name} style={{ cursor: m.mandatory ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              checked={on}
              disabled={m.mandatory}
              style={{ marginTop: 3 }}
              onChange={(e) =>
                edit((s) => {
                  s.enabled_modules = e.target.checked
                    ? catalogue.modules.map((x) => x.module_name).filter((x) => x === m.module_name || s.enabled_modules.includes(x))
                    : s.enabled_modules.filter((x) => x !== m.module_name);
                })
              }
            />
            <div className="grow">
              <strong>{title}</strong> {m.mandatory && <span className="badge neutral">Mandatory</span>}
              <div className="muted small">{desc}</div>
            </div>
          </label>
        );
      })}
      {mods.includes('news_breach_watch') && (
        <div className="repeat">
          <div className="repeat-head">
            <h3 className="grow">News & Breach Watch profile</h3>
          </div>
          <div className="grid-2">
            <ListInput label="Company names" values={w.monitored_names} onChange={setWatch('monitored_names')} placeholder="Name to watch" />
            <ListInput label="Domains" values={w.monitored_domains} onChange={setWatch('monitored_domains')} placeholder="Domain to watch" />
            <ListInput label="Cities" values={w.monitored_cities} onChange={setWatch('monitored_cities')} placeholder="City to watch" />
            <ListInput label="Keywords" values={w.custom_keywords} onChange={setWatch('custom_keywords')} placeholder="Keyword to watch" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 8. Integrations & security ─────────────────────────────────────────────────────────────
export function Security({ spec, edit, catalogue }) {
  const tools = spec.integrations.tools;
  const p = spec.security_policies;
  const unused = catalogue.options.tools.filter((t) => !tools.some((x) => x.tool_name === t));
  const setP = (k) => (v) => edit((s) => (s.security_policies[k] = v));
  return (
    <div className="stack">
      <h3>Scanner tools</h3>
      {!tools.length && <p className="muted" style={{ margin: 0 }}>No tools. Tools need the Vulnerabilities module.</p>}
      {tools.map((t, i) => {
        const set = (k) => (v) => edit((s) => (s.integrations.tools[i][k] = v));
        return (
          <div className="repeat" key={t.tool_name}>
            <div className="repeat-head">
              <h3 className="grow">{t.tool_name}</h3>
              <label className="check">
                <input type="checkbox" checked={t.enabled} onChange={(e) => set('enabled')(e.target.checked)} /> Enabled
              </label>
              <button type="button" className="link-danger" onClick={() => edit((s) => s.integrations.tools.splice(i, 1))}>
                Remove
              </button>
            </div>
            <div className="grid-2">
              <Text label="Endpoint URL" value={t.target_endpoint} onChange={set('target_endpoint')} placeholder="https://" />
              <NumberField label="Pulls per day" required min={1} value={t.pull_frequency_per_day} onChange={set('pull_frequency_per_day')} hint="At least 1" />
            </div>
          </div>
        );
      })}
      {unused.length > 0 && (
        <div className="row">
          {unused.map((t) => (
            <button type="button" className="sm" key={t} onClick={() => edit((s) => s.integrations.tools.push(newTool(t)))}>
              + {t}
            </button>
          ))}
        </div>
      )}

      <h3 style={{ marginTop: 8 }}>Sign-in policy</h3>
      <div className="grid-2">
        <Select label="Sign-in" required value={p.sso_type} onChange={setP('sso_type')} options={catalogue.options.sso_types} placeholder="Choose…" />
        {p.sso_type !== 'LOCAL' && (
          <Text label="SSO metadata URL" required value={p.sso_metadata_url} onChange={setP('sso_metadata_url')} />
        )}
        <NumberField label="Password expires after (days)" min={1} value={p.password_expiry_days} onChange={setP('password_expiry_days')} />
        <NumberField label="Session timeout (minutes)" min={1} value={p.session_timeout_minutes} onChange={setP('session_timeout_minutes')} />
      </div>
      <label className="check">
        <input type="checkbox" checked={Boolean(p.mfa_enforced)} onChange={(e) => setP('mfa_enforced')(e.target.checked)} />
        <span>
          Multi-factor sign-in for every user
          <span className="muted small" style={{ display: 'block' }}>
            The platform cannot send email yet: with MFA on, users cannot sign in until mail delivery is built.
          </span>
        </span>
      </label>
    </div>
  );
}

// ─── 9. Initial users ───────────────────────────────────────────────────────────────────────
export function Users({ spec, edit, catalogue }) {
  const users = spec.initial_users;
  const countries = useCountries();
  return (
    <div className="stack">
      <Alert>
        The first people to sign in. Each gets a one-time password when the image is generated, shown once to you.{' '}
        {Number.isInteger(spec.licensing_limits.max_org_owners)
          ? `At least one IT Admin, and exactly ${spec.licensing_limits.max_org_owners} Organisation Owner(s), as set in Licence limits; a vCISO is optional.`
          : 'At least one IT Admin, and as many Organisation Owners as Licence limits sets; a vCISO is optional.'}
      </Alert>
      {users.map((u, i) => {
        const set = (k) => (v) => edit((s) => (s.initial_users[i][k] = v));
        return (
          <div className="repeat" key={userNumber(u.user_id)}>
            <div className="repeat-head">
              <h3 className="grow">
                {u.user_name || `User ${i + 1}`} <span className="muted mono">{u.user_id}</span>
              </h3>
              <button type="button" className="link-danger" onClick={() => edit((s) => s.initial_users.splice(i, 1))}>
                Remove
              </button>
            </div>
            <div className="grid-3">
              <OfficeSelect
                spec={spec}
                value={u.office_id}
                onChange={(v) => edit((s) => {
                  const x = s.initial_users[i];
                  x.office_id = v;
                  x.user_id = userIdFor(v, x.user_id);
                })}
              />
              <Text label="Full name" required value={u.user_name} onChange={set('user_name')} />
              <Text label="Login ID" required value={u.login_id} onChange={set('login_id')} placeholder="Sign-in name" />
              <Text label="Email" required type="email" value={u.user_email} onChange={set('user_email')} />
              <Select label="Role" required value={u.role_type} onChange={set('role_type')} options={catalogue.options.role_types} placeholder="Choose…" />
              <PhoneField
                label="Mobile"
                value={u.user_mobile}
                onChange={set('user_mobile')}
                countries={countries}
                preferred={officeCountry(spec, countries, u.office_id)}
              />
              <Text label="Designation" value={u.designation} onChange={set('designation')} />
              <Text label="Department" value={u.department} onChange={set('department')} />
            </div>
          </div>
        );
      })}
      <div>
        <button type="button" disabled={!spec.organization.offices.length} onClick={() => edit((s) => s.initial_users.push(newUser(s)))}>
          + Add user
        </button>
        {!spec.organization.offices.length && <span className="muted small"> Add an office first.</span>}
      </div>
    </div>
  );
}

export const SECTION_COMPONENTS = {
  organization: Organisation,
  offices: Offices,
  contacts: Contacts,
  contract: Contract,
  licence: Licence,
  frameworks: Frameworks,
  modules: Modules,
  security: Security,
  users: Users,
};
