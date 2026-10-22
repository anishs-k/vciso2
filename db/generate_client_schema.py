#!/usr/bin/env python3
"""Generate one client's database: schema, licence guard and seed data.

    python3 db/generate_client_schema.py --spec dist_client/<Cust>/client_spec.json \
        --out dist_client/<Cust>/<Cust>_init.sql

Reads a validated client intake spec (intake/client_intake.py) and the master workbook, and writes:
  <Cust>_init.sql            runs once when the client's Postgres starts with an empty volume
  initial_credentials.txt    one-time passwords of the initial users (next to the SQL file)
  instance.json              this client instance's identity, read by the API (later baked into the image)

What goes in:
1. The workbook tables exactly as db/generate_schema.py builds them (load_schema): same names,
   types, keys and DECISIONS, documented in db/SCHEMA_DIFF.md. CLIENT_EXCLUDED_TABLES lists the
   ones a client does not get.
2. Tables for the modules the client licensed (architecture section 9, SOW v1.1 WP1), and the
   platform tables every client gets for data the workbook has no sheet for (SECTION 2b below):
   questionnaire assessments, compliance audits and their findings, tool integrations, settings and
   the threat-intelligence cache.
3. The licence row and the licence guard: triggers that refuse users, vCISOs, Organisation Owners,
   control owners, API integrations and frameworks beyond the licence, and anything after expiry.
4. Only the licensed part of the master catalogue (vendor IP), plus the client's own register:
   offices, contacts, contract, licence per office, initial users and roles, control register.

Everything the client build decides on top of the workbook is in the CLIENT DECISIONS section.
"""

import argparse
import json
import os
import re
import secrets
import sys
import uuid
from datetime import date, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from db.generate_schema import load_schema  # noqa: E402
from intake.client_intake import ROLE_TYPES  # noqa: E402

try:
    import bcrypt  # hashes the one-time passwords here, so the SQL file never holds them in plain text
except ImportError:
    bcrypt = None


def password_hash_sql(password):
    """SQL value for a user's password_hash. With bcrypt installed: the hash itself ($2a$, which pgcrypto's
    crypt() verifies). Without: crypt() at load time, which puts the plain password in the SQL file."""
    if bcrypt:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=10, prefix=b'2a')).decode('ascii')
    return Raw(f"crypt({q(password)}, gen_salt('bf', 10))")

DEFAULT_XLSX = os.path.join(ROOT, 'docs/Master-Framework v13.0 Control-Framework Map.xlsx')
# Bumped when the shape of the generated database changes; the API refuses a database it does not know.
SCHEMA_VERSION = 2

# ---------------------------------------------------------------- CLIENT DECISIONS

# Workbook tables a client database does not get: table -> reason
CLIENT_EXCLUDED_TABLES = {
    'customer_fy_financial_plan': 'Billing stays with CyberTrustWorks, outside the client image (architecture section 11, item 11)',
    'customer_fy_invoices': 'Billing stays with CyberTrustWorks, outside the client image (architecture section 11, item 11)',
}

# Intake role type -> Role_ID in the Roles sheet. The sheet has no role names, so this mapping is
# an assumption to confirm: vCISO gets the only role with Access_Admin (Role_0004), Organisation
# Owner the blank Role_0005, IT Admin read + write + all without admin (Role_0003, otherwise unused),
# Control Owner read + write (Role_0002), Auditor and Viewer read only.
ROLE_IDS = {
    'vCISO': 'Role_0004',
    'Organisation Owner': 'Role_0005',
    'IT Admin': 'Role_0003',
    'Control Owner': 'Role_0002',
    'Auditor': 'Role_0001',
    'Viewer': 'Role_0001',
}
assert set(ROLE_IDS) == set(ROLE_TYPES), 'ROLE_IDS must cover every intake role type'

# Placeholder notes the workbook puts in value cells ("System Date", "(User ID)", "Future Date"...).
PLACEHOLDER = re.compile(r'^\(?\s*(system date|user id|future date|effective date \+ ?1)\s*\)?$', re.I)

# Review frequency (months) -> Collection_Frequency text in the control register.
COLLECTION_FREQUENCY = {1: 'Monthly', 3: 'Quarterly', 6: 'Half-yearly', 12: 'Annual', 24: 'Biennial', 36: 'Triennial'}

SEVERITIES = ('Critical', 'High', 'Medium', 'Low', 'Info')
ALERT_TYPES = ('vulnerability', 'news_breach', 'news_review', 'integration_down', 'compliance_sla')


# ---------------------------------------------------------------- SQL literals

class Raw(str):
    """An SQL expression inserted as-is (e.g. CURRENT_DATE)."""


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def _bool(v):
    s = str(v).strip().lower()
    if s in ('y', 'yes', 'true', '1'): return True
    if s in ('n', 'no', 'false', '0'): return False
    return None


def lit(v, typ):
    """Python / workbook value -> SQL literal for a column of type `typ`; None means NULL."""
    if v is None or isinstance(v, Raw):
        return v
    if isinstance(v, str):
        v = v.strip()
        if not v or PLACEHOLDER.match(v):
            return None
    if typ == 'boolean':
        b = v if isinstance(v, bool) else _bool(v)
        return None if b is None else ('TRUE' if b else 'FALSE')
    if typ in ('integer', 'bigint'):
        try:
            f = float(v)
        except (TypeError, ValueError):
            return None
        return str(int(f)) if f == int(f) else None
    if typ.startswith('numeric'):
        try:
            return repr(float(v))
        except (TypeError, ValueError):
            return None
    if typ in ('date', 'timestamptz'):
        if isinstance(v, (datetime, date)):
            return q(v.isoformat())
        try:
            return q(datetime.strptime(str(v)[:10], '%Y-%m-%d').date().isoformat())
        except ValueError:
            return None
    if isinstance(v, float) and v == int(v):
        v = int(v)
    return q(v)


def array(values, typ='text'):
    return Raw('ARRAY[' + ', '.join(q(v) if typ == 'text' else str(v) for v in values) + f']::{typ}[]')


# ---------------------------------------------------------------- generator

def build_client_schema(spec, excel_path, output_path, write_credentials=True):
    """Writes the SQL and instance.json next to output_path. The one-time passwords are returned in
    'credentials' and, unless write_credentials is False, also written to initial_credentials.txt."""
    if not spec.get('license_seal'):
        # The API checks the seal in the database against instance.json; 'unsealed' would ship a licence
        # nobody signed. scripts/build_client_bundle.py seals the spec before calling this.
        raise ValueError('the spec has no license_seal: build it with scripts/build_client_bundle.py, '
                         'or seal it first (intake/client_intake.py --seal)')
    schema = load_schema(excel_path)
    wb, tables, fks = schema['wb'], schema['tables'], schema['fks']
    for t in CLIENT_EXCLUDED_TABLES:
        tables.pop(t)
    fks = [fk for fk in fks if fk[0] in tables and fk[2] in tables]
    types = {t: {c['name']: c['type'] for c in tb['cols']} for t, tb in tables.items()}
    types['customer_contract_framework_map']['review_frequency_months'] = 'integer'  # added below (SECTION 1)
    warnings = []

    org = spec['organization']
    contract = spec['contract']
    limits = spec['licensing_limits']
    policies = spec.get('security_policies', {})
    mods = set(spec['enabled_modules'])
    selected = spec['selected_frameworks']
    fids = sorted(f['framework_id'] for f in selected)
    cust_id = org['customer_id']
    ctr_id = contract['contract_id']
    fy_id = contract['financial_year']
    offices = org['offices']
    primary_office = next(o['office_id'] for o in offices if o['office_type'] == 'Primary')

    instance_id = str(uuid.uuid4())
    generated_at = datetime.now().astimezone().isoformat(timespec='seconds')

    sql = []
    w = sql.append

    def insert(t, values, catalogue=False):
        """INSERT for one row; values are column -> Python value (typed via the schema) or Raw."""
        if catalogue and 'active' in types[t] and lit(values.get('active'), 'boolean') is None:
            values['active'] = True  # a catalogue row shipped to the client is active unless the sheet says N
        cols, vals = [], []
        for c, v in values.items():
            if c not in types[t]:
                raise KeyError(f'{t}.{c} is not a column of the generated schema')
            s = lit(v, types[t][c])
            if s is not None:
                cols.append(c); vals.append(s)
        w(f"INSERT INTO {t} ({', '.join(cols)}) VALUES ({', '.join(vals)});")

    def sheet_rows(t):
        """Rows of the sheet behind table t, as dicts keyed by column name."""
        tb = tables[t]
        for r in wb[tb['sheet']].iter_rows(min_row=2, values_only=True):
            yield {c['name']: (r[c['idx']] if c['idx'] is not None and c['idx'] < len(r) else None) for c in tb['cols']}

    def seed(t, rows, key):
        """Insert rows once per primary key; later duplicates in the sheet are reported, not loaded."""
        seen = {}
        for row in rows:
            k = tuple(row.get(c) for c in key)
            if any(x is None for x in k):
                continue
            if k in seen:
                if seen[k] != row:
                    warnings.append(f"{tables[t]['sheet']}: {'/'.join(map(str, k))} appears more than once; first row kept")
                continue
            seen[k] = row
            insert(t, dict(row), catalogue=True)
        return seen

    # ---- header
    w('-- ===========================================================================')
    w(f"-- Client database for {org['customer_name']} ({cust_id})")
    w('-- Generated by db/generate_client_schema.py from the client spec and')
    w(f'-- "{os.path.basename(excel_path)}". Do not edit by hand: change the spec or')
    w('-- the generator and regenerate. Table design: db/SCHEMA_DIFF.md.')
    w(f'-- Generated: {generated_at}   instance {instance_id}   schema version {SCHEMA_VERSION}')
    w(f'-- Licensed frameworks: {fids}')
    w(f'-- Licensed modules: {sorted(mods)}')
    w(f"-- Limits: users {limits['max_users']}, vCISOs {limits['max_vcisos']}, Org Owners {limits['max_org_owners']}, "
      f"control owners {limits.get('max_control_owners', limits['max_users'])}, API integrations {limits['max_api_integrations']}, "
      f"frameworks {limits['max_frameworks']}, valid to {limits['valid_to']}")
    w('-- ===========================================================================')
    w('')
    w('BEGIN;')
    w('CREATE EXTENSION IF NOT EXISTS pgcrypto;')
    w('')

    # ---- 1. workbook tables
    w('-- SECTION 1: Workbook tables (same design as db/init/001_framework_tables.sql)')
    for t, tb in tables.items():
        lines = [f"  {c['name']} {c['type']}" + (' NOT NULL DEFAULT now()' if c['name'] == 'created_at' else '')
                 for c in tb['cols']]
        if tb['pk']: lines.append(f"  PRIMARY KEY ({', '.join(tb['pk'])})")
        for u in tb['uniques']: lines.append(f"  UNIQUE ({', '.join(u)})")
        w(f'CREATE TABLE {t} (' + ('\n' + ',\n'.join(lines) + '\n' if lines else '') + ');')
        w(f"COMMENT ON TABLE {t} IS {q(tb['sheet'] + (' - ' + tb['note'] if tb['note'] else ''))};")
    w('')
    for t, cc, pt, pc, _ in fks:
        w(f"ALTER TABLE {t} ADD CONSTRAINT {('fk_' + t + '_' + '_'.join(cc))[:63]} "
          f"FOREIGN KEY ({', '.join(cc)}) REFERENCES {pt} ({', '.join(pc)});")
    w('')
    # Not in the workbook: how often each office reviews a licensed framework (onboarding form, Frameworks step).
    w('ALTER TABLE customer_contract_framework_map ADD COLUMN review_frequency_months integer '
      'CHECK (review_frequency_months > 0);')
    w("COMMENT ON COLUMN customer_contract_framework_map.review_frequency_months IS "
      "'Review interval of this framework in this office, in months (not in the workbook; set at onboarding)';")
    w('')

    # ---- 2. module tables
    w('-- SECTION 2: Module tables (architecture section 9; only licensed modules)')
    sev = ', '.join(q(s) for s in SEVERITIES)
    if 'vulnerabilities' in mods:
        w(f"""CREATE TABLE vulnerability_finding (
  finding_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES master_customer_details (customer_id),
  tool_id integer,
  api_id bigint,
  source_finding_id text NOT NULL,
  asset_id text REFERENCES customer_asset_owner (asset_id),
  unmapped_asset text,
  cve text,
  cvss numeric(3,1) CHECK (cvss BETWEEN 0 AND 10),
  severity text NOT NULL CHECK (severity IN ({sev})),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reappeared', 'in_progress', 'remediated', 'risk_accepted', 'false_positive')),
  title text,
  description text,
  sla_due date,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  remediated_at timestamptz,
  risk_accepted_by text REFERENCES customer_framework_users (user_id),
  risk_accepted_reason text,
  risk_accepted_until date,
  false_positive_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  UNIQUE (customer_id, tool_id, source_finding_id)
);
COMMENT ON TABLE vulnerability_finding IS 'Every normalised scanner finding; the same finding = client + tool + tool finding ID (architecture 6.1)';""")
    if 'alerting' in mods:
        types_ = ', '.join(q(a) for a in ALERT_TYPES)
        channels = "'website', 'email', 'app_push'"
        w(f"""CREATE TABLE alert (
  alert_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES master_customer_details (customer_id),
  alert_type text NOT NULL CHECK (alert_type IN ({types_})),
  severity text NOT NULL CHECK (severity IN ({sev})),
  source_ref text NOT NULL,
  title text NOT NULL,
  summary text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'escalated', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  ack_deadline timestamptz,
  acknowledged_by text REFERENCES customer_framework_users (user_id),
  acknowledged_at timestamptz,
  acknowledged_via text CHECK (acknowledged_via IN ({channels})),
  escalation_level integer NOT NULL DEFAULT 1 CHECK (escalation_level BETWEEN 1 AND 3),
  escalated_at timestamptz,
  closed_at timestamptz
);
CREATE TABLE alert_delivery (
  delivery_id text PRIMARY KEY,
  alert_id text NOT NULL REFERENCES alert (alert_id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ({channels})),
  recipient_user_id text REFERENCES customer_framework_users (user_id),
  recipient_contact_id text REFERENCES master_customer_contact_details (contact_id),
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered boolean NOT NULL DEFAULT false,
  escalation_level integer NOT NULL DEFAULT 1 CHECK (escalation_level BETWEEN 1 AND 3),
  delivery_response text,
  CHECK (recipient_user_id IS NOT NULL OR recipient_contact_id IS NOT NULL)
);
CREATE TABLE alert_rule (
  rule_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES master_customer_details (customer_id),
  alert_type text NOT NULL CHECK (alert_type IN ({types_})),
  severity text NOT NULL CHECK (severity IN ({sev})),
  channels text[] NOT NULL CHECK (channels <@ ARRAY[{channels}]),
  target_roles text[] NOT NULL,
  ack_window_minutes integer CHECK (ack_window_minutes > 0),
  escalate_to text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, alert_type, severity)
);
COMMENT ON TABLE alert_rule IS 'Delivery rules per alert type and severity; defaults from architecture 8.3, editable per client';""")
    if 'mobile_access' in mods:
        w("""CREATE TABLE mobile_device (
  device_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES master_customer_details (customer_id),
  user_id text NOT NULL REFERENCES customer_framework_users (user_id),
  device_model text,
  platform text CHECK (platform IN ('iOS', 'Android')),
  push_token_ref text,
  paired_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE TABLE pairing_code (
  pairing_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES master_customer_details (customer_id),
  user_id text NOT NULL REFERENCES customer_framework_users (user_id),
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);""")
    if 'news_breach_watch' in mods:
        alert_fk = ' REFERENCES alert (alert_id)' if 'alerting' in mods else ''
        w(f"""CREATE TABLE news_alert (
  news_alert_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES master_customer_details (customer_id),
  alert_id text{alert_fk},
  headline text NOT NULL,
  summary text NOT NULL,
  attack_type text,
  incident_date date,
  data_affected text,
  confidence numeric(3,2) CHECK (confidence BETWEEN 0 AND 1),
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  verdict text NOT NULL CHECK (verdict IN ('verified', 'needs_review')),
  vciso_decision text NOT NULL DEFAULT 'pending' CHECK (vciso_decision IN ('pending', 'incident_opened', 'false_positive')),
  vciso_reason text,
  received_at timestamptz NOT NULL DEFAULT now()
);""")
    if 'incidents' in mods:
        alert_fk = ' REFERENCES alert (alert_id)' if 'alerting' in mods else ''
        w(f"""CREATE TABLE incident (
  incident_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES master_customer_details (customer_id),
  origin text NOT NULL CHECK (origin IN ('news', 'vulnerability', 'manual')),
  source_alert_id text{alert_fk},
  priority text NOT NULL CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'contained', 'eradicated', 'recovered', 'closed')),
  regulator_deadline timestamptz,
  regulator_reported_at timestamptz,
  assigned_to text REFERENCES customer_framework_users (user_id),
  post_incident_review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);""")
    if 'onprem_ai_assessment' in mods:
        w("""CREATE TABLE evidence_assessment (
  assessment_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES master_customer_details (customer_id),
  office_id text REFERENCES master_customer_address_details (office_id),
  framework_id integer REFERENCES master_framework (framework_id),
  clause_control_id integer REFERENCES master_clause_control_map (clause_control_id),
  evidence_file_name text NOT NULL,
  ai_verdict text CHECK (ai_verdict IN ('meets', 'partially_meets', 'does_not_meet', 'cannot_assess')),
  ai_confidence numeric(3,2) CHECK (ai_confidence BETWEEN 0 AND 1),
  ai_findings jsonb,
  follow_up_questions jsonb,
  model_version text NOT NULL,
  vciso_decision text NOT NULL DEFAULT 'pending' CHECK (vciso_decision IN ('pending', 'accepted', 'rejected', 'overridden')),
  vciso_decided_by text REFERENCES customer_framework_users (user_id),
  vciso_decided_at timestamptz,
  vciso_comment text,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE evidence_assessment IS 'On-premise AI evidence verdicts (SOW v1.1 WP8); ai_findings holds quotes and page references; the vCISO decides';""")
    w('')

    # ---- 2b. platform tables (every client): data the vCISO screens keep that the workbook has no sheet for
    w('-- SECTION 2b: Platform tables (every client; not in the workbook)')
    w("""CREATE TABLE assessment (
  assessment_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES master_customer_details (customer_id),
  questionnaire text NOT NULL,
  framework_id integer REFERENCES master_framework (framework_id),
  framework_name text,
  cycle_no integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'in_review', 'changes_requested', 'reviewed', 'approved')),
  respondent_name text,
  respondent_email text,
  submitted_by text REFERENCES customer_framework_users (user_id),
  submitted_at timestamptz,
  target_date date,
  readiness_score numeric(5,2),
  summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  UNIQUE (customer_id, questionnaire, cycle_no)
);
COMMENT ON TABLE assessment IS 'A gap-assessment questionnaire run (ISO 27001, DPDP, CSPM ...); framework_id is empty for questionnaires that are not a workbook framework';
CREATE TABLE assessment_response (
  response_id text PRIMARY KEY,
  assessment_id text NOT NULL REFERENCES assessment (assessment_id) ON DELETE CASCADE,
  question_id text NOT NULL,
  reference text,
  clause_control_id integer REFERENCES master_clause_control_map (clause_control_id),
  response_value text,
  score numeric(4,2),
  status text,
  notes text,
  proof_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  vciso_review_status text NOT NULL DEFAULT 'pending'
    CHECK (vciso_review_status IN ('pending', 'accepted', 'verified', 'rejected', 'needs_remediation')),
  vciso_notes text,
  vciso_rejection_reason text,
  reviewed_by text REFERENCES customer_framework_users (user_id),
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, question_id)
);
COMMENT ON TABLE assessment_response IS 'One answer; reference is the control it asks about (4.1, A.5.1, S.3), clause_control_id that control in the register when it is licensed; proof_files lists evidence IDs from customer_transactions';

CREATE TABLE compliance_audit (
  audit_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES master_customer_details (customer_id),
  framework_id integer REFERENCES master_framework (framework_id),
  framework text,
  title text NOT NULL,
  audit_type text CHECK (audit_type IN ('internal', 'external', 'certification', 'surveillance')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  auditor text,
  start_date date,
  end_date date,
  created_by text REFERENCES customer_framework_users (user_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  closed_at timestamptz
);
CREATE TABLE compliance_audit_finding (
  finding_id text PRIMARY KEY,
  audit_id text NOT NULL REFERENCES compliance_audit (audit_id) ON DELETE CASCADE,
  clause_control_id integer REFERENCES master_clause_control_map (clause_control_id),
  control_ref text,
  severity text NOT NULL CHECK (severity IN ('critical', 'major', 'minor', 'observation')),
  description text NOT NULL,
  corrective_action text,
  owner_user_id text REFERENCES customer_framework_users (user_id),
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
COMMENT ON TABLE compliance_audit_finding IS 'Audit findings and their corrective action (CAR); an open finding past due_date is an overdue CAR';

CREATE TABLE customer_tool_integration (
  integration_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES master_customer_details (customer_id),
  module_slug text NOT NULL,
  tool_name text NOT NULL,
  api_url text,
  username text,
  secret_encrypted bytea,
  webhook_url text,
  notes text,
  enabled boolean NOT NULL DEFAULT false,
  pull_frequency_per_day integer CHECK (pull_frequency_per_day >= 1),
  test_status text CHECK (test_status IN ('ok', 'failed')),
  test_detail text,
  last_tested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  updated_by text REFERENCES customer_framework_users (user_id),
  UNIQUE (customer_id, module_slug, tool_name)
);
COMMENT ON TABLE customer_tool_integration IS 'Connection to one of the client''s security tools; secret_encrypted is the API key, encrypted with the instance key from link.json (never stored in the database)';

CREATE TABLE platform_setting (
  customer_id text NOT NULL REFERENCES master_customer_details (customer_id),
  setting_key text NOT NULL,
  value text,
  secret_encrypted bytea,
  updated_by text REFERENCES customer_framework_users (user_id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, setting_key),
  CHECK (value IS NULL OR secret_encrypted IS NULL)
);
COMMENT ON TABLE platform_setting IS 'Instance settings (SMTP, Jira, threat-feed keys); secrets go in secret_encrypted, encrypted with the instance key';

CREATE TABLE threat_intel_feed (
  customer_id text NOT NULL REFERENCES master_customer_details (customer_id),
  source text NOT NULL CHECK (source IN ('cisa_kev', 'otx_pulses')),
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  item_count integer GENERATED ALWAYS AS (jsonb_array_length(data)) STORED,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  fetched_by text REFERENCES customer_framework_users (user_id),
  PRIMARY KEY (customer_id, source)
);
COMMENT ON TABLE threat_intel_feed IS 'Last copy of each external threat feed, so the Threat Intelligence page works without fetching every time';
CREATE TABLE threat_intel_match (
  match_id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES master_customer_details (customer_id),
  source text NOT NULL,
  cve_id text,
  asset_value text NOT NULL,
  asset_id text REFERENCES customer_asset_owner (asset_id),
  threat_title text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  details jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'dismissed')),
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (customer_id, source, cve_id, asset_value)
);
COMMENT ON TABLE threat_intel_match IS 'A feed item that matches one of the client''s assets; seen again = last_seen refreshed';""")
    w('')

    # ---- 3. licence and licence guard
    w('-- SECTION 3: Licence and licence guard')
    w('-- The triggers stop the platform and its users from going past the licence. They are not a defence')
    w('-- against the database superuser, who can disable triggers: the API must also verify license_seal.')
    roles_sql = {r: q(r) for r in ('vCISO', 'Organisation Owner')}
    w(f"""CREATE TABLE client_license (
  license_id text PRIMARY KEY,
  customer_id text NOT NULL UNIQUE REFERENCES master_customer_details (customer_id),
  valid_from date NOT NULL,
  valid_to date NOT NULL CHECK (valid_to > valid_from),
  max_users integer NOT NULL,
  max_vcisos integer NOT NULL,
  max_org_owners integer NOT NULL,
  max_control_owners integer NOT NULL,
  max_api_integrations integer NOT NULL,
  max_frameworks integer NOT NULL,
  licensed_frameworks integer[] NOT NULL,
  licensed_modules text[] NOT NULL,
  license_seal text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The licence row of a customer, refusing when there is none or it has expired.
CREATE FUNCTION ctw_active_license(p_customer text) RETURNS client_license AS $$
DECLARE
  lic client_license;
BEGIN
  SELECT * INTO lic FROM client_license WHERE customer_id = p_customer;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LICENSE_VIOLATION: no licence for customer %', p_customer;
  END IF;
  IF CURRENT_DATE > lic.valid_to THEN
    RAISE EXCEPTION 'LICENSE_VIOLATION: licence expired on %. Contact CyberTrustWorks to renew.', lic.valid_to;
  END IF;
  RETURN lic;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION trg_protect_client_license() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'SECURITY_VIOLATION: client_license is a signed entitlement and cannot be changed locally.';
END;
$$ LANGUAGE plpgsql;

-- Users: seats, vCISOs and Organisation Owners. Checked whenever a row becomes an active user / role
-- holder (insert, re-activation, role change), so deactivating and re-activating cannot bypass a quota.
CREATE FUNCTION trg_enforce_user_limits() RETURNS trigger AS $$
DECLARE
  lic client_license;
  was_active boolean := TG_OP = 'UPDATE' AND OLD.active IS TRUE AND OLD.customer_id IS NOT DISTINCT FROM NEW.customer_id;
  n integer;
BEGIN
  IF NEW.active IS NOT TRUE THEN RETURN NEW; END IF;
  IF was_active AND OLD.user_role IS NOT DISTINCT FROM NEW.user_role THEN RETURN NEW; END IF;
  lic := ctw_active_license(NEW.customer_id);

  IF NOT was_active THEN
    SELECT count(*) INTO n FROM customer_framework_users
      WHERE customer_id = NEW.customer_id AND active IS TRUE AND user_id <> NEW.user_id;
    IF n >= lic.max_users THEN
      RAISE EXCEPTION 'LICENSE_VIOLATION: the licence allows % active users.', lic.max_users;
    END IF;
  END IF;

  IF NEW.user_role = {roles_sql['vCISO']} AND NOT (was_active AND OLD.user_role = {roles_sql['vCISO']}) THEN
    SELECT count(*) INTO n FROM customer_framework_users
      WHERE customer_id = NEW.customer_id AND active IS TRUE AND user_role = {roles_sql['vCISO']} AND user_id <> NEW.user_id;
    IF n >= lic.max_vcisos THEN
      RAISE EXCEPTION 'LICENSE_VIOLATION: the licence allows % vCISO(s).', lic.max_vcisos;
    END IF;
  END IF;

  IF NEW.user_role = {roles_sql['Organisation Owner']} AND NOT (was_active AND OLD.user_role = {roles_sql['Organisation Owner']}) THEN
    SELECT count(*) INTO n FROM customer_framework_users
      WHERE customer_id = NEW.customer_id AND active IS TRUE AND user_role = {roles_sql['Organisation Owner']} AND user_id <> NEW.user_id;
    IF n >= lic.max_org_owners THEN
      RAISE EXCEPTION 'LICENSE_VIOLATION: the licence allows % Organisation Owner(s).', lic.max_org_owners;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Role grants: the vCISO and Organisation Owner roles count distinct users, like the user quotas.
CREATE FUNCTION trg_enforce_role_limits() RETURNS trigger AS $$
DECLARE
  lic client_license;
  n integer;
BEGIN
  IF NEW.active IS NOT TRUE OR NEW.role_id NOT IN ({q(ROLE_IDS['vCISO'])}, {q(ROLE_IDS['Organisation Owner'])}) THEN
    RETURN NEW;
  END IF;
  lic := ctw_active_license(NEW.customer_id);
  SELECT count(DISTINCT user_id) INTO n FROM customer_framework_role_user
    WHERE customer_id = NEW.customer_id AND role_id = NEW.role_id AND active IS TRUE AND user_id <> NEW.user_id;
  IF NEW.role_id = {q(ROLE_IDS['vCISO'])} AND n >= lic.max_vcisos THEN
    RAISE EXCEPTION 'LICENSE_VIOLATION: the vCISO role ({ROLE_IDS['vCISO']}) is licensed for % user(s).', lic.max_vcisos;
  END IF;
  IF NEW.role_id = {q(ROLE_IDS['Organisation Owner'])} AND n >= lic.max_org_owners THEN
    RAISE EXCEPTION 'LICENSE_VIOLATION: the Organisation Owner role ({ROLE_IDS['Organisation Owner']}) is licensed for % user(s).', lic.max_org_owners;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- API integrations: one integration = one distinct tool + API in use; mapping an API that is already
-- in use to another control does not take a new integration.
CREATE FUNCTION trg_enforce_api_limits() RETURNS trigger AS $$
DECLARE
  lic client_license;
  n integer;
BEGIN
  IF NEW.active IS NOT TRUE OR NEW.api_id IS NULL THEN RETURN NEW; END IF;
  lic := ctw_active_license(NEW.customer_id);
  IF EXISTS (SELECT 1 FROM customer_api_map WHERE customer_id = NEW.customer_id AND active IS TRUE
             AND tool_id IS NOT DISTINCT FROM NEW.tool_id AND api_id = NEW.api_id) THEN
    RETURN NEW;
  END IF;
  SELECT count(DISTINCT (tool_id, api_id)) INTO n FROM customer_api_map
    WHERE customer_id = NEW.customer_id AND active IS TRUE AND api_id IS NOT NULL;
  IF n >= lic.max_api_integrations THEN
    RAISE EXCEPTION 'LICENSE_VIOLATION: the licence allows % API integration(s).', lic.max_api_integrations;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Control owners: distinct users named as owner in Customer-Clause-Control-Owner or as Owner User ID
-- in the control register.
CREATE FUNCTION ctw_control_owner_count(p_customer text, p_except text) RETURNS integer AS $$
  SELECT count(DISTINCT u)::integer FROM (
    SELECT user_id AS u FROM customer_clause_control_owner WHERE customer_id = p_customer AND active IS TRUE
    UNION
    SELECT owner_user_id FROM customer_clause_control_map WHERE customer_id = p_customer
  ) s WHERE u IS NOT NULL AND u <> p_except;
$$ LANGUAGE sql STABLE;

CREATE FUNCTION trg_enforce_control_owner_limits() RETURNS trigger AS $$
DECLARE
  lic client_license;
  owner text;
BEGIN
  IF TG_TABLE_NAME = 'customer_clause_control_owner' THEN
    IF NEW.active IS NOT TRUE THEN RETURN NEW; END IF;
    owner := NEW.user_id;
  ELSE
    owner := NEW.owner_user_id;
  END IF;
  IF owner IS NULL THEN RETURN NEW; END IF;
  lic := ctw_active_license(NEW.customer_id);
  IF ctw_control_owner_count(NEW.customer_id, owner) < ctw_control_owner_count(NEW.customer_id, '') THEN
    RETURN NEW;  -- already a control owner
  END IF;
  IF ctw_control_owner_count(NEW.customer_id, owner) >= lic.max_control_owners THEN
    RAISE EXCEPTION 'LICENSE_VIOLATION: the licence allows % control owner(s).', lic.max_control_owners;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Frameworks: every row tied to a framework must use a licensed one, and the licence per office / FY
-- cannot cover more distinct frameworks than licensed.
CREATE FUNCTION trg_enforce_framework_limits() RETURNS trigger AS $$
DECLARE
  lic client_license;
  n integer;
BEGIN
  IF NEW.framework_id IS NULL THEN RETURN NEW; END IF;
  lic := ctw_active_license(NEW.customer_id);
  IF NOT NEW.framework_id = ANY (lic.licensed_frameworks) THEN
    RAISE EXCEPTION 'LICENSE_VIOLATION: framework % is not licensed (licensed: %).', NEW.framework_id, lic.licensed_frameworks;
  END IF;
  IF TG_TABLE_NAME = 'customer_contract_framework_map' THEN
    SELECT count(DISTINCT framework_id) INTO n FROM customer_contract_framework_map
      WHERE customer_id = NEW.customer_id AND framework_id <> NEW.framework_id;
    IF n >= lic.max_frameworks THEN
      RAISE EXCEPTION 'LICENSE_VIOLATION: the licence allows % framework(s).', lic.max_frameworks;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tool integrations: enabled connections count against the API integration licence too.
CREATE FUNCTION trg_enforce_integration_limits() RETURNS trigger AS $$
DECLARE
  lic client_license;
  n integer;
BEGIN
  IF NEW.enabled IS NOT TRUE OR (TG_OP = 'UPDATE' AND OLD.enabled IS TRUE) THEN RETURN NEW; END IF;
  lic := ctw_active_license(NEW.customer_id);
  SELECT count(*) INTO n FROM customer_tool_integration
    WHERE customer_id = NEW.customer_id AND enabled IS TRUE AND integration_id <> NEW.integration_id;
  IF n >= lic.max_api_integrations THEN
    RAISE EXCEPTION 'LICENSE_VIOLATION: the licence allows % API integration(s).', lic.max_api_integrations;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_integration_limits BEFORE INSERT OR UPDATE ON customer_tool_integration
  FOR EACH ROW EXECUTE FUNCTION trg_enforce_integration_limits();
CREATE TRIGGER enforce_user_limits BEFORE INSERT OR UPDATE ON customer_framework_users
  FOR EACH ROW EXECUTE FUNCTION trg_enforce_user_limits();
CREATE TRIGGER enforce_role_limits BEFORE INSERT OR UPDATE ON customer_framework_role_user
  FOR EACH ROW EXECUTE FUNCTION trg_enforce_role_limits();
CREATE TRIGGER enforce_api_limits BEFORE INSERT OR UPDATE ON customer_api_map
  FOR EACH ROW EXECUTE FUNCTION trg_enforce_api_limits();
CREATE TRIGGER enforce_control_owner_limits BEFORE INSERT OR UPDATE ON customer_clause_control_owner
  FOR EACH ROW EXECUTE FUNCTION trg_enforce_control_owner_limits();
CREATE TRIGGER enforce_control_owner_limits BEFORE INSERT OR UPDATE OF owner_user_id ON customer_clause_control_map
  FOR EACH ROW EXECUTE FUNCTION trg_enforce_control_owner_limits();""")
    for t in ('customer_contract_framework_map', 'customer_clause_control_map', 'customer_framework_users',
              'customer_framework_role_user', 'customer_clause_control_owner', 'customer_control_ownership_trf',
              'customer_asset_owner', 'customer_api_map', 'customer_transactions', 'assessment', 'compliance_audit'):
        if t in tables or t in ('assessment', 'compliance_audit'):
            w(f'CREATE TRIGGER enforce_framework_limits BEFORE INSERT OR UPDATE OF framework_id ON {t}\n'
              f'  FOR EACH ROW EXECUTE FUNCTION trg_enforce_framework_limits();')
    w('')

    # ---- 4. licensed catalogue
    w('-- SECTION 4: Master catalogue (only what this client licensed)')
    fy_rows = seed('financial_year_master', sheet_rows('financial_year_master'), ['fy_id'])
    if (fy_id,) not in fy_rows:
        raise ValueError(f'contract.financial_year {fy_id} is not in the Financial Year Master sheet '
                         f'({min(k[0] for k in fy_rows)}-{max(k[0] for k in fy_rows)})')

    seed('master_framework', (r for r in sheet_rows('master_framework') if r['framework_id'] in fids), ['framework_id'])

    # Controls: renumbered <framework><3-digit sequence>, the sheet's ID kept (db/SCHEMA_DIFF.md section 4).
    controls, seq = [], {}
    for r in sheet_rows('master_clause_control_map'):
        fid = r['framework_id']
        if fid not in fids or (r['clause_control_id'] is None and r['requirement'] is None):
            continue
        seq[fid] = seq.get(fid, 0) + 1
        if seq[fid] > 999:
            raise ValueError(f'Framework {fid} has more than 999 controls; the ID scheme <framework><3 digits> is full')
        r['source_clause_control_id'] = r['clause_control_id']
        r['clause_control_id'] = fid * 1000 + seq[fid]
        controls.append(r)
    seed('master_clause_control_map', controls, ['clause_control_id'])
    for fid in fids:
        if fid not in seq:
            warnings.append(f'Framework {fid} has no clauses or controls in Master-Clause-Control-Map; '
                            f'its control register is empty')

    role_rows = seed('roles', sheet_rows('roles'), ['role_id'])
    ui_rows = seed('ui_report_dashboard_list', sheet_rows('ui_report_dashboard_list'), ['ui_id'])
    role_ui = seed('role_ui_user_map', (r for r in sheet_rows('role_ui_user_map')
                                        if (r['role_id'],) in role_rows and (r['ui_id'],) in ui_rows),
                   ['role_id', 'ui_id'])
    for role in sorted(set(ROLE_IDS.values())):
        if (role,) not in role_rows:
            raise ValueError(f'{role} (used by ROLE_IDS) is not in the Roles sheet')
    seed('vciso_function', sheet_rows('vciso_function'), ['function_id'])
    seed('vciso_sub_function', sheet_rows('vciso_sub_function'), ['function_id', 'sub_function_id'])

    # RCSA: an area row, then its sub-control rows (db/SCHEMA_DIFF.md section 2).
    areas, subs, area = [], [], None
    for r in wb['RCSA'].iter_rows(min_row=2, values_only=True):
        if r[1]:
            area = r[0]
            areas.append(dict(control_area_id=r[0], major_control_area=r[1], active=r[7]))
        elif r[2] and area:
            subs.append(dict(sub_control_id=r[2], control_area_id=area, sub_control_area=r[3],
                             framework_id=r[4] if r[4] in fids else None, control_id=r[5], document_id=r[6],
                             active=r[7]))
    seed('rcsa_control_area', areas, ['control_area_id'])
    seed('rcsa_sub_control', subs, ['sub_control_id'])

    # Tool-API catalogue: every tool the client chose at onboarding, carrying what was entered there (endpoint,
    # pulls per day, enabled). The sheet fills Framework_ID on a tool's first row only; an unlicensed framework
    # is left empty. A tool the sheet does not list gets one API row of its own, numbered after the sheet's tools.
    chosen = spec.get('integrations', {}).get('tools', [])
    wanted = {tool_key(t['tool_name']): t for t in chosen}
    tool_rows, found, fw, sheet_ids = [], set(), {}, []
    for r in sheet_rows('tool_api_map'):
        if r['tool_id'] is None:
            continue
        sheet_ids.append(r['tool_id'])
        fw[r['tool_id']] = r['framework_id'] if r['framework_id'] is not None else fw.get(r['tool_id'])
        t = wanted.get(tool_key(r['tool_name']))
        if t:
            found.add(tool_key(t['tool_name']))
            r['framework_id'] = fw[r['tool_id']] if fw[r['tool_id']] in fids else None
            tool_rows.append(onboarded_tool_row(r, t))
    next_id = max(sheet_ids, default=0)
    for t in chosen:
        if tool_key(t['tool_name']) in found:
            continue
        next_id += 100000
        tool_rows.append(onboarded_tool_row(
            {'tool_id': next_id, 'api_id': next_id * 10000 + 1, 'api_name': 'API_1', 'applicable': True}, t))
        warnings.append(f"Integration '{t['tool_name']}' is not in the Tool-API-Map sheet: added as tool {next_id} "
                        "with one API, from the onboarding details")
    seed('tool_api_map', tool_rows, ['tool_id', 'api_id'])
    w('')

    # ---- 5. client register
    w('-- SECTION 5: Client register')
    # The client is on board for the contract: on-boarding is its first day, off-boarding its last.
    def boarding(t):
        d = {'on_boarding_date': contract['contract_start_date']}
        if 'off_boarding_date' in types[t]:
            d['off_boarding_date'] = contract['contract_end_date']
        return d
    insert('master_customer_details', dict(customer_id=cust_id, customer_name=org['customer_name'],
                                           category=org.get('category'), active=True, **boarding('master_customer_details')))
    for o in offices:
        insert('master_customer_address_details', dict(
            customer_id=cust_id, office_id=o['office_id'], office_type=o['office_type'], office_address=o['office_address'],
            city=o['city'], state=o['state'], country=o['country'], pincode=o.get('pincode'),
            category=org.get('category'), industry=org.get('industry'), active=True, **boarding('master_customer_address_details')))
    for c in org.get('contacts', []):
        insert('master_customer_contact_details', dict(
            customer_id=cust_id, office_id=c['office_id'], contact_id=c['contact_id'], contact_type=c['contact_type'],
            contact_priority=c.get('contact_priority'), contact_person=c.get('contact_person'),
            designation=c.get('designation'), department=c.get('department'), contact_phone=c.get('contact_phone'),
            contact_email=c.get('contact_email'), active=True, **boarding('master_customer_contact_details')))
    insert('master_customer_contract_detail', dict(
        customer_id=cust_id, office_id=primary_office, fy_id=fy_id, customer_ref_po=contract.get('customer_ref_po'),
        contract_id=ctr_id, contract_type=contract.get('contract_type', 'Original'),
        contract_period_months=contract.get('contract_period_months'), contract_start_date=contract['contract_start_date'],
        contract_end_date=contract['contract_end_date'], contract_value=contract.get('contract_value'),
        invoicing_frequency=contract.get('invoicing_frequency'), active=True, **boarding('master_customer_contract_detail')))

    w(f"""INSERT INTO client_license (license_id, customer_id, valid_from, valid_to, max_users, max_vcisos, max_org_owners,
  max_control_owners, max_api_integrations, max_frameworks, licensed_frameworks, licensed_modules, license_seal)
VALUES ({q('LIC_' + cust_id)}, {q(cust_id)}, {q(contract['contract_start_date'])}, {q(limits['valid_to'])}, {int(limits['max_users'])},
  {int(limits['max_vcisos'])}, {int(limits['max_org_owners'])}, {int(limits.get('max_control_owners', limits['max_users']))},
  {int(limits['max_api_integrations'])}, {int(limits['max_frameworks'])}, {array(fids, 'integer')}, {array(sorted(mods))},
  {q(spec.get('license_seal') or 'unsealed')});
-- From here on the licence row is read-only.
CREATE TRIGGER protect_client_license BEFORE INSERT OR UPDATE OR DELETE ON client_license
  FOR EACH ROW EXECUTE FUNCTION trg_protect_client_license();
CREATE TRIGGER protect_client_license_truncate BEFORE TRUNCATE ON client_license
  FOR EACH STATEMENT EXECUTE FUNCTION trg_protect_client_license();""")

    # Which app instance this database belongs to. db_uid is drawn when the database is created, so
    # two databases loaded from the same file differ; `npm run link` pins the API to one of them.
    w(f"""CREATE TABLE platform_instance (
  instance_id uuid PRIMARY KEY,
  customer_id text NOT NULL UNIQUE REFERENCES master_customer_details (customer_id),
  license_id text NOT NULL REFERENCES client_license (license_id),
  schema_version integer NOT NULL,
  db_uid uuid NOT NULL DEFAULT gen_random_uuid(),
  generated_at timestamptz NOT NULL,
  initialised_at timestamptz NOT NULL DEFAULT now(),
  linked_at timestamptz,
  linked_from text
);
COMMENT ON TABLE platform_instance IS 'The app instance this database was generated for; only the link columns may change';
INSERT INTO platform_instance (instance_id, customer_id, license_id, schema_version, generated_at)
VALUES ({q(instance_id)}, {q(cust_id)}, {q('LIC_' + cust_id)}, {SCHEMA_VERSION}, {q(generated_at)});
CREATE FUNCTION trg_protect_platform_instance() RETURNS trigger AS $$
BEGIN
  IF TG_OP <> 'UPDATE' OR (NEW.instance_id, NEW.customer_id, NEW.license_id, NEW.schema_version, NEW.db_uid,
                          NEW.generated_at, NEW.initialised_at)
     IS DISTINCT FROM (OLD.instance_id, OLD.customer_id, OLD.license_id, OLD.schema_version, OLD.db_uid,
                       OLD.generated_at, OLD.initialised_at) THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: platform_instance identity cannot be changed; only linking may update it.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER protect_platform_instance BEFORE INSERT OR UPDATE OR DELETE ON platform_instance
  FOR EACH ROW EXECUTE FUNCTION trg_protect_platform_instance();
CREATE TRIGGER protect_platform_instance_truncate BEFORE TRUNCATE ON platform_instance
  FOR EACH STATEMENT EXECUTE FUNCTION trg_protect_platform_instance();""")

    for f in selected:
        for off in f['office_ids']:
            insert('customer_contract_framework_map', dict(
                customer_id=cust_id, office_id=off, fy_id=fy_id, contract_id=ctr_id, framework_id=f['framework_id'],
                review_frequency_months=review_months(f, off),
                customer_ref_po=contract.get('customer_ref_po'), active=True,
                framework_license_count=limits['max_frameworks'], api_integration_license_count=limits['max_api_integrations'],
                user_license_count=limits['max_users'], for_customer_or_internal='C'))

    # Scanner tools chosen at onboarding: one connection each, with its endpoint and pull frequency, whether or
    # not the workbook's Tool-API-Map lists it. The client adds the API key on the Integrations screen.
    tools = spec.get('integrations', {}).get('tools', [])
    if tools:
        w('-- Tool integrations chosen at onboarding')
    for t in tools:
        w("INSERT INTO customer_tool_integration (integration_id, customer_id, module_slug, tool_name, api_url, enabled, "
          f"pull_frequency_per_day, notes) VALUES ({q('INT_' + str(uuid.uuid4()))}, {q(cust_id)}, 'vulnerability-management', "
          f"{q(t['tool_name'])}, {q(t['target_endpoint']) if t.get('target_endpoint') else 'NULL'}, {'TRUE' if t.get('enabled') else 'FALSE'}, "
          f"{int(t['pull_frequency_per_day']) if t.get('pull_frequency_per_day') else 'NULL'}, "
          f"{q('Chosen at onboarding; add the API key here')});")
    if tools:
        w('')

    # Initial users, each with a one-time password (must be changed: last_password_change stays empty).
    credentials = []
    sso = str(policies.get('sso_type') or 'LOCAL').upper()
    for u in spec['initial_users']:
        role_id = ROLE_IDS[u['role_type']]
        office = u.get('office_id') or primary_office
        own_fids = [f['framework_id'] for f in sorted(selected, key=lambda f: f['framework_id']) if office in f['office_ids']]
        password = secrets.token_urlsafe(12)
        credentials.append((u['login_id'], u['role_type'], password))
        insert('customer_framework_users', dict(
            customer_id=cust_id, office_id=office, fy_id=fy_id, contract_id=ctr_id,
            framework_id=(own_fids or fids)[0], user_id=u['user_id'], user_role=u['role_type'], user_name=u['user_name'],
            user_email=u['user_email'], user_mobile=u.get('user_mobile'), designation=u.get('designation'),
            department=u.get('department'), login_id=u['login_id'],
            password_hash=password_hash_sql(password),
            single_signon=sso not in ('LOCAL', ''), ad_ldap_applicable=sso in ('LDAP', 'AD'),
            mfa=bool(policies.get('mfa_enforced', True)), password_change_days=policies.get('password_expiry_days'),
            for_customer_or_internal='C', active=True))
        # One role row per licensed framework and per screen the role may use (Role-UI-User-Map).
        screens = sorted(ui for (role, ui) in role_ui if role == role_id)
        if not screens:
            warnings.append(f"{role_id} ({u['role_type']}) has no screens in Role-UI-User-Map; {u['login_id']} gets no role rows")
        for fid in fids:
            for ui in screens:
                insert('customer_framework_role_user', dict(
                    customer_id=cust_id, address_id=office, fy_id=fy_id, contract_id=ctr_id,
                    customer_ref_po=contract.get('customer_ref_po'), framework_id=fid, active=True, role_id=role_id,
                    user_id=u['user_id'], ui_id=ui, for_customer_or_internal='C'))

    # Control register (architecture Diagram 2, step 5): every licensed control, per office it applies to.
    # One INSERT ... VALUES per row (not INSERT ... SELECT), so the file itself shows every row, as a table
    # viewer reading the file sees it.
    w('-- Control register: one row per licensed control and office; the client scopes it after install')

    def first_filled(*values):
        return next((v for v in values if v is not None and str(v).strip()), None)

    for f in selected:
        for off in f['office_ids']:
            months = int(review_months(f, off))
            for m in (c for c in controls if c['framework_id'] == f['framework_id']):
                insert('customer_clause_control_map', dict(
                    customer_id=cust_id, office_id=off, fy_id=fy_id, contract_id=ctr_id, framework_id=m['framework_id'],
                    clause_control_id=m['clause_control_id'],
                    clause_control_ref=first_filled(m['clause_control_sub_ref_no'], m['clause_control_ref_no']),
                    clause_control_desc=first_filled(m['clause_control_sub_ref_desc'], m['clause_control_ref_desc']),
                    requirement=m['requirement'], type_pre_defined_custom='Pre-defined', active=True,
                    mandatory=m['mandatory'], applicable=True, primary_document_required=m['primary_document_required'],
                    search_keyword=m['search_keyword'], objective_evidence=m['objective_evidence'],
                    review_frequency_months=months,
                    collection_frequency=COLLECTION_FREQUENCY.get(months, f'Every {months} months'),
                    current_collection_no=0, validation_method=m['review_method'], status='Not Started'))

    # Default delivery rules (architecture 8.3; SOW v1.1: website and email, app push only with mobile access).
    if 'alerting' in mods:
        push = ['app_push'] if 'mobile_access' in mods else []
        rules = []
        if 'vulnerabilities' in mods:
            rules += [
                ('VULN_CRIT', 'vulnerability', 'Critical', ['website', 'email'] + push, ['vCISO', 'Organisation Owner'], 15,
                 'Organisation Owner, then escalation contacts', 'Red banner + bell; email if no app or push fails; push bypasses Do Not Disturb'),
                ('VULN_HIGH', 'vulnerability', 'High', ['website', 'email'] + push, ['vCISO'], 60,
                 'Organisation Owner, then escalation contacts', 'Bell; email if no app or push fails'),
                ('VULN_MED', 'vulnerability', 'Medium', ['website', 'email'], ['vCISO'], None, None,
                 'Dashboard only; weekly summary email; SLA 60 days'),
                ('VULN_LOW', 'vulnerability', 'Low', ['website', 'email'], ['vCISO'], None, None,
                 'Dashboard only; weekly summary email; SLA 90 days'),
                ('INTEGRATION_DOWN', 'integration_down', 'Medium', ['website', 'email'], ['vCISO', 'Client IT'], 1440,
                 'Reminder only', 'Bell; daily digest email; window is 1 working day'),
            ]
        if 'news_breach_watch' in mods:
            rules += [
                ('NEWS_VERIFIED', 'news_breach', 'Critical', ['website', 'email'] + push, ['vCISO', 'Organisation Owner'], 15,
                 'Organisation Owner, then escalation contacts', 'Red banner + bell; email always'),
                ('NEWS_REVIEW', 'news_review', 'Medium', ['website'] + push, ['vCISO'], 1440,
                 'Organisation Owner', 'Review queue; quiet notice; window is 1 working day'),
            ]
        for rid, atype, severity, chans, roles, window, escalate, notes in rules:
            w(f"INSERT INTO alert_rule (rule_id, customer_id, alert_type, severity, channels, target_roles, ack_window_minutes, "
              f"escalate_to, notes) VALUES ({q('AR_' + rid + '_' + cust_id)}, {q(cust_id)}, {q(atype)}, {q(severity)}, "
              f"{array(chans)}, {array(roles)}, {'NULL' if window is None else window}, "
              f"{'NULL' if escalate is None else q(escalate)}, {q(notes)});")

    w('')
    w('COMMIT;')

    if not bcrypt:
        warnings.append('bcrypt is not installed: the initial users\' one-time passwords are in this file in plain text '
                        '(pip install bcrypt)')
    warnings = list(dict.fromkeys(warnings))
    if warnings:
        at = sql.index('BEGIN;')
        sql[at:at] = ['-- Workbook / spec notes found while generating:'] + [f'--   * {x}' for x in warnings] + ['']

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    # UTF-8 always: the workbook text has dashes and quotes, and the client's Postgres reads the file as UTF-8
    # (Windows would otherwise write cp1252).
    with open(output_path, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(sql) + '\n')
    cred_path = os.path.join(os.path.dirname(os.path.abspath(output_path)), 'initial_credentials.txt')
    if write_credentials:
        with open(cred_path, 'w', encoding='utf-8') as fh:
            fh.write(f"# One-time passwords for {org['customer_name']} ({cust_id}). Hand over securely, then delete this file.\n"
                     '# Each user must change the password at first sign-in.\n')
            for login, role, pw in credentials:
                fh.write(f'{login}\t{role}\t{pw}\n')
        os.chmod(cred_path, 0o600)
    elif os.path.exists(cred_path):
        os.remove(cred_path)  # an older build's passwords no longer match this database
    instance_path = os.path.join(os.path.dirname(os.path.abspath(output_path)), 'instance.json')
    with open(instance_path, 'w', encoding='utf-8') as fh:
        json.dump(dict(instance_id=instance_id, customer_id=cust_id, customer_name=org['customer_name'],
                       license_id='LIC_' + cust_id, license_seal=spec['license_seal'],
                       schema_version=SCHEMA_VERSION, generated_at=generated_at,
                       licensed_frameworks=fids, licensed_modules=sorted(mods)), fh, indent=2)
        fh.write('\n')

    print(f'[SUCCESS] {os.path.relpath(output_path)}: {len(tables)} workbook tables + modules {sorted(mods)}, '
          f'{len(controls)} licensed controls, frameworks {fids}')
    for x in warnings:
        print(f'  note: {x}', file=sys.stderr)
    return dict(sql_path=output_path, credentials_path=cred_path if write_credentials else None,
                instance_path=instance_path, instance_id=instance_id, schema_version=SCHEMA_VERSION,
                passwords_in_sql=bcrypt is None,
                credentials=[dict(login_id=login, role_type=role, password=pw) for login, role, pw in credentials],
                warnings=warnings)


# The workbook spells some tools differently from the onboarding form: they are the same tool.
TOOL_NAME_ALIASES = {'macfee': 'mcafee'}


def tool_key(name):
    """A tool's name for matching: letters and digits only, lower case, workbook misspellings corrected."""
    k = re.sub(r'[^a-z0-9]', '', str(name or '').lower())
    return TOOL_NAME_ALIASES.get(k, k)


def onboarded_tool_row(row, tool):
    """A Tool-API-Map row with the onboarding details of its tool: the client's name for it, its endpoint,
    how often it is pulled and whether it is on."""
    row = dict(row)
    row['tool_name'] = tool['tool_name']
    if tool.get('target_endpoint'):
        row['api_target_loc'] = tool['target_endpoint']
    row['data_pulling_freq_per_day'] = tool.get('pull_frequency_per_day')
    row['active'] = bool(tool.get('enabled'))
    return row


def sql_file_name(customer_id):
    """The client database file of a bundle: <customer ID>_init.sql, e.g. Cust_00301_init.sql."""
    return f'{customer_id}_init.sql'


def review_months(framework, office_id):
    """How often an office reviews a licensed framework: its own interval, else the framework's, else yearly."""
    return (framework.get('office_review_months') or {}).get(office_id) or framework.get('review_frequency_months') or 12


def main():
    parser = argparse.ArgumentParser(description='CyberTrustWorks client database generator')
    parser.add_argument('--spec', required=True, help='Validated client intake spec (client_spec.json)')
    parser.add_argument('--excel', default=DEFAULT_XLSX, help='Master workbook')
    parser.add_argument('--out', help='Output SQL file (default: dist_client/<customer_id>/<customer_id>_init.sql)')
    args = parser.parse_args()

    for path in (args.spec, args.excel):
        if not os.path.exists(path):
            sys.exit(f'Error: file not found: {path}')
    with open(args.spec, encoding='utf-8') as fh:
        spec = json.load(fh)
    cust = spec['organization']['customer_id']
    out = args.out or os.path.join(ROOT, 'dist_client', cust, sql_file_name(cust))
    try:
        build_client_schema(spec, args.excel, out)
    except ValueError as exc:
        sys.exit(f'Error: {exc}')


if __name__ == '__main__':
    main()
