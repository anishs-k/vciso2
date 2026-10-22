-- Initial users may also be IT Admins (Roles sheet Role_0003: read, write, view, all; no admin).
-- Safe to run twice.

ALTER TABLE ctw_client_initial_user DROP CONSTRAINT IF EXISTS ctw_client_initial_user_role_type_check;
ALTER TABLE ctw_client_initial_user ADD CONSTRAINT ctw_client_initial_user_role_type_check
  CHECK (role_type IN ('vCISO', 'Organisation Owner', 'IT Admin', 'Control Owner', 'Auditor', 'Viewer'));

INSERT INTO ctw_migration (name) VALUES ('010_it_admin_role') ON CONFLICT DO NOTHING;
