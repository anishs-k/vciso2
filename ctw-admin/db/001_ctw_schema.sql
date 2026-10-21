-- CyberTrustWorks central database: every client CTW has onboarded, its contract and licence, and
-- every bundle / Docker image generated for it. This is CTW's own database, never shipped to a client.
--
-- Column names follow intake/intake_schema.json, so a client's rows turn back into the spec that
-- intake/client_intake.py validates and scripts/build_client_bundle.py builds from.
-- Initial passwords are never stored here: they are shown once when a bundle is generated.
--
-- Runs once, on the first start of an empty data volume (docker-compose.yml).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── CTW staff ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE ctw_admin_user (
  admin_id       serial PRIMARY KEY,
  login_id       text NOT NULL UNIQUE,
  full_name      text NOT NULL,
  email          text NOT NULL UNIQUE,
  password_hash  text NOT NULL,                      -- bcrypt, via pgcrypto crypt()
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz
);
COMMENT ON TABLE ctw_admin_user IS 'CTW staff who may onboard clients and generate their images';

-- ─── Catalogues (loaded from intake/client_intake.py by scripts/seed.js) ────────────────────
CREATE TABLE ctw_framework (
  framework_id    integer PRIMARY KEY,
  framework_name  text NOT NULL,
  active          boolean NOT NULL DEFAULT true
);

CREATE TABLE ctw_module (
  module_name  text PRIMARY KEY,
  mandatory    boolean NOT NULL DEFAULT false,       -- compliance: every licence includes it
  sort_order   integer NOT NULL DEFAULT 0            -- order of AVAILABLE_MODULES
);

-- ─── Clients ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE ctw_client (
  customer_id      text PRIMARY KEY CHECK (customer_id ~ '^[A-Za-z0-9_-]{3,32}$'),  -- as CUSTOMER_ID_RE
  customer_name    text NOT NULL,
  category         text NOT NULL
                   CHECK (category IN ('Enterprise', 'Mid-Market', 'SMB', 'Government', 'Financial Institution')),
  industry         text NOT NULL,
  primary_domain   text NOT NULL,
  deployment_fqdn  text,
  -- draft: being filled in; ready: validates; generated: has a successful build; live: deployed at the client
  status           text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'ready', 'generated', 'live', 'suspended')),
  created_by       integer REFERENCES ctw_admin_user (admin_id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ctw_client_office (
  office_id       text PRIMARY KEY,
  customer_id     text NOT NULL REFERENCES ctw_client (customer_id) ON DELETE CASCADE,
  office_type     text NOT NULL CHECK (office_type IN ('Primary', 'Secondary', 'Data Center', 'Regional Office')),
  office_address  text NOT NULL,
  city            text NOT NULL,
  state           text NOT NULL,
  country         text NOT NULL,
  pincode         text,
  UNIQUE (customer_id, office_id)                    -- target of the same-client foreign keys below
);
CREATE UNIQUE INDEX ctw_client_office_one_primary ON ctw_client_office (customer_id) WHERE office_type = 'Primary';

CREATE TABLE ctw_client_contact (
  contact_id        text PRIMARY KEY,
  customer_id       text NOT NULL REFERENCES ctw_client (customer_id) ON DELETE CASCADE,
  office_id         text NOT NULL,
  contact_type      text NOT NULL
                    CHECK (contact_type IN ('Executive', 'Primary vCISO', 'IT Security', 'Escalation', 'Emergency')),
  contact_priority  integer NOT NULL CHECK (contact_priority > 0),
  contact_person    text NOT NULL,
  designation       text NOT NULL,
  department        text,
  contact_email     text NOT NULL,
  contact_phone     text NOT NULL,
  FOREIGN KEY (customer_id, office_id) REFERENCES ctw_client_office (customer_id, office_id)
);

-- ─── Contract ───────────────────────────────────────────────────────────────────────────────
-- A client keeps its old contracts (extensions, AMC, ...); the one with is_current goes into the bundle.
CREATE TABLE ctw_contract (
  customer_id             text NOT NULL REFERENCES ctw_client (customer_id) ON DELETE CASCADE,
  contract_id             text NOT NULL,
  customer_ref_po         text NOT NULL,
  contract_type           text CHECK (contract_type IN ('Original', 'Extension', 'AMC', 'AR', 'CR')),
  financial_year          integer NOT NULL,
  contract_period_months  integer NOT NULL CHECK (contract_period_months > 0),
  contract_start_date     date NOT NULL,
  contract_end_date       date NOT NULL CHECK (contract_end_date > contract_start_date),
  contract_value          numeric(14, 2),
  currency                text NOT NULL,
  invoicing_frequency     text NOT NULL CHECK (invoicing_frequency IN ('M', 'Q', 'H', 'Y')),
  is_current              boolean NOT NULL DEFAULT true,
  PRIMARY KEY (customer_id, contract_id)
);
CREATE UNIQUE INDEX ctw_contract_one_current ON ctw_contract (customer_id) WHERE is_current;

-- ─── Licence ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE ctw_licence (
  customer_id           text PRIMARY KEY REFERENCES ctw_client (customer_id) ON DELETE CASCADE,
  max_users             integer NOT NULL CHECK (max_users > 0),
  max_vcisos            integer NOT NULL CHECK (max_vcisos >= 0),
  max_org_owners        integer NOT NULL CHECK (max_org_owners >= 0),
  max_control_owners    integer CHECK (max_control_owners >= 0),
  max_api_integrations  integer NOT NULL CHECK (max_api_integrations >= 0),
  max_frameworks        integer NOT NULL CHECK (max_frameworks > 0),
  valid_to              date NOT NULL,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ctw_licence_module (
  customer_id  text NOT NULL REFERENCES ctw_licence (customer_id) ON DELETE CASCADE,
  module_name  text NOT NULL REFERENCES ctw_module (module_name),
  PRIMARY KEY (customer_id, module_name)
);

CREATE TABLE ctw_licence_framework (
  customer_id              text NOT NULL REFERENCES ctw_licence (customer_id) ON DELETE CASCADE,
  framework_id             integer NOT NULL REFERENCES ctw_framework (framework_id),
  review_frequency_months  integer CHECK (review_frequency_months > 0),
  PRIMARY KEY (customer_id, framework_id)
);

-- Offices a licensed framework applies to
CREATE TABLE ctw_licence_framework_office (
  customer_id   text NOT NULL,
  framework_id  integer NOT NULL,
  office_id     text NOT NULL,
  PRIMARY KEY (customer_id, framework_id, office_id),
  FOREIGN KEY (customer_id, framework_id) REFERENCES ctw_licence_framework (customer_id, framework_id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id, office_id) REFERENCES ctw_client_office (customer_id, office_id) ON DELETE CASCADE
);

-- ─── Tools, policies, news watch ────────────────────────────────────────────────────────────
CREATE TABLE ctw_client_tool (
  customer_id             text NOT NULL REFERENCES ctw_client (customer_id) ON DELETE CASCADE,
  tool_name               text NOT NULL
                          CHECK (tool_name IN ('Tenable', 'Qualys', 'Rapid7', 'Greenbone', 'McAfee', 'Zscaler')),
  enabled                 boolean NOT NULL DEFAULT true,
  target_endpoint         text,
  pull_frequency_per_day  integer NOT NULL CHECK (pull_frequency_per_day >= 0),
  sort_order              integer NOT NULL DEFAULT 0,                  -- order as entered
  PRIMARY KEY (customer_id, tool_name)
);

CREATE TABLE ctw_client_security_policy (
  customer_id              text PRIMARY KEY REFERENCES ctw_client (customer_id) ON DELETE CASCADE,
  sso_type                 text NOT NULL DEFAULT 'LOCAL'
                           CHECK (sso_type IN ('LOCAL', 'SAML_2_0', 'OIDC', 'AZURE_AD', 'OKTA')),
  sso_metadata_url         text,
  mfa_enforced             boolean NOT NULL DEFAULT true,
  password_expiry_days     integer CHECK (password_expiry_days > 0),
  session_timeout_minutes  integer CHECK (session_timeout_minutes > 0)
);

-- Needed when the licence includes news_breach_watch
CREATE TABLE ctw_client_news_watch (
  customer_id        text PRIMARY KEY REFERENCES ctw_client (customer_id) ON DELETE CASCADE,
  monitored_names    text[] NOT NULL DEFAULT '{}',
  monitored_domains  text[] NOT NULL DEFAULT '{}',
  monitored_cities   text[] NOT NULL DEFAULT '{}',
  custom_keywords    text[] NOT NULL DEFAULT '{}'
);

-- ─── Initial users (no passwords: the bundle builder makes one-time passwords) ──────────────
CREATE TABLE ctw_client_initial_user (
  customer_id  text NOT NULL REFERENCES ctw_client (customer_id) ON DELETE CASCADE,
  user_id      text NOT NULL,
  login_id     text NOT NULL,
  user_name    text NOT NULL,
  user_email   text NOT NULL,
  user_mobile  text,
  designation  text,
  department   text,
  role_type    text NOT NULL
               CHECK (role_type IN ('vCISO', 'Organisation Owner', 'Control Owner', 'Auditor', 'Viewer')),
  office_id    text NOT NULL,
  PRIMARY KEY (customer_id, user_id),
  UNIQUE (customer_id, login_id),
  FOREIGN KEY (customer_id, office_id) REFERENCES ctw_client_office (customer_id, office_id)
);

-- ─── Builds ("Generate Docker Image") ───────────────────────────────────────────────────────
-- full: new schema, instance ID and passwords (the client's database must be recreated);
-- image_only: new image around the instance.json of an earlier full build (database kept).
CREATE TABLE ctw_build (
  build_id          bigserial PRIMARY KEY,
  customer_id       text NOT NULL REFERENCES ctw_client (customer_id),
  version           integer NOT NULL,
  build_type        text NOT NULL CHECK (build_type IN ('full', 'image_only')),
  based_on_build    bigint REFERENCES ctw_build (build_id),      -- image_only: whose instance.json
  status            text NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'running', 'success', 'failed')),
  instance_id       uuid,
  licence_seal      text,
  image_tag         text,
  image_size_bytes  bigint,
  artifact_dir      text,                                        -- where SQL, compose, image .tar are kept
  spec_snapshot     jsonb,                                       -- the exact spec built from
  log               text NOT NULL DEFAULT '',
  error             text,
  requested_by      integer REFERENCES ctw_admin_user (admin_id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  started_at        timestamptz,
  finished_at       timestamptz,
  UNIQUE (customer_id, version),
  CHECK (build_type = 'full' OR based_on_build IS NOT NULL)
);
CREATE INDEX ctw_build_customer ON ctw_build (customer_id, created_at DESC);

-- ─── Audit ──────────────────────────────────────────────────────────────────────────────────
-- customer_id has no foreign key on purpose: the trail outlives a deleted client.
CREATE TABLE ctw_audit_log (
  audit_id     bigserial PRIMARY KEY,
  at           timestamptz NOT NULL DEFAULT now(),
  admin_id     integer REFERENCES ctw_admin_user (admin_id),
  action       text NOT NULL,                                   -- e.g. client.create, build.start
  customer_id  text,
  details      jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX ctw_audit_log_customer ON ctw_audit_log (customer_id, at DESC);

-- ─── updated_at ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION ctw_touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER ctw_client_touch BEFORE UPDATE ON ctw_client
  FOR EACH ROW EXECUTE FUNCTION ctw_touch_updated_at();
CREATE TRIGGER ctw_licence_touch BEFORE UPDATE ON ctw_licence
  FOR EACH ROW EXECUTE FUNCTION ctw_touch_updated_at();
