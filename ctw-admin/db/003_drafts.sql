-- Drafts may be partial. The onboarding form opens empty (no pre-filled values) and "Save draft" keeps
-- whatever has been entered so far, so the value columns of a client's record may be NULL while it is a
-- draft. Completeness is the intake validator's job (intake/client_intake.py validate_spec), which every
-- client passes before it is 'ready' and can be built. Identifiers, the company name and every CHECK
-- (allowed values, ranges) stay: a CHECK passes a NULL but still refuses a wrong value.
-- Safe to run twice.

ALTER TABLE ctw_client
  ALTER COLUMN category DROP NOT NULL,
  ALTER COLUMN industry DROP NOT NULL,
  ALTER COLUMN primary_domain DROP NOT NULL;

ALTER TABLE ctw_client_office
  ALTER COLUMN office_type DROP NOT NULL,
  ALTER COLUMN office_address DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN state DROP NOT NULL,
  ALTER COLUMN country DROP NOT NULL;

ALTER TABLE ctw_client_contact
  ALTER COLUMN office_id DROP NOT NULL,
  ALTER COLUMN contact_type DROP NOT NULL,
  ALTER COLUMN contact_priority DROP NOT NULL,
  ALTER COLUMN contact_person DROP NOT NULL,
  ALTER COLUMN designation DROP NOT NULL,
  ALTER COLUMN contact_email DROP NOT NULL,
  ALTER COLUMN contact_phone DROP NOT NULL;

ALTER TABLE ctw_contract
  ALTER COLUMN customer_ref_po DROP NOT NULL,
  ALTER COLUMN financial_year DROP NOT NULL,
  ALTER COLUMN contract_period_months DROP NOT NULL,
  ALTER COLUMN contract_start_date DROP NOT NULL,
  ALTER COLUMN contract_end_date DROP NOT NULL,
  ALTER COLUMN currency DROP NOT NULL,
  ALTER COLUMN invoicing_frequency DROP NOT NULL;

ALTER TABLE ctw_licence
  ALTER COLUMN max_users DROP NOT NULL,
  ALTER COLUMN max_vcisos DROP NOT NULL,
  ALTER COLUMN max_org_owners DROP NOT NULL,
  ALTER COLUMN max_api_integrations DROP NOT NULL,
  ALTER COLUMN max_frameworks DROP NOT NULL,
  ALTER COLUMN valid_to DROP NOT NULL;

ALTER TABLE ctw_client_tool
  ALTER COLUMN pull_frequency_per_day DROP NOT NULL;

ALTER TABLE ctw_client_security_policy
  ALTER COLUMN sso_type DROP NOT NULL,
  ALTER COLUMN mfa_enforced DROP NOT NULL;

ALTER TABLE ctw_client_initial_user
  ALTER COLUMN login_id DROP NOT NULL,
  ALTER COLUMN user_name DROP NOT NULL,
  ALTER COLUMN user_email DROP NOT NULL,
  ALTER COLUMN role_type DROP NOT NULL,
  ALTER COLUMN office_id DROP NOT NULL;

INSERT INTO ctw_migration (name) VALUES ('003_drafts') ON CONFLICT DO NOTHING;
