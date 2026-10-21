-- Phase 8: admin MFA (TOTP), forced password change, session revocation, build file cleanup.
-- Runs after 001 on a new volume (docker-entrypoint-initdb.d) and through `npm run db:migrate` on an
-- existing database; written so that running it twice changes nothing.

CREATE TABLE IF NOT EXISTS ctw_migration (
  name        text PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);
INSERT INTO ctw_migration (name) VALUES ('001_ctw_schema') ON CONFLICT DO NOTHING;

ALTER TABLE ctw_admin_user
  -- TOTP secret, AES-256-GCM under CTW_DATA_KEY (src/secrets.js); NULL until the admin sets up MFA
  ADD COLUMN IF NOT EXISTS mfa_secret_enc text,
  ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false,
  -- last TOTP time step accepted: a code is never accepted twice
  ADD COLUMN IF NOT EXISTS mfa_last_step bigint,
  -- SHA-256 of the unused recovery codes
  ADD COLUMN IF NOT EXISTS recovery_codes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz,
  -- in every session token; bumping it signs the admin out everywhere
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by integer REFERENCES ctw_admin_user (admin_id);

COMMENT ON COLUMN ctw_admin_user.mfa_secret_enc IS 'TOTP secret, encrypted with CTW_DATA_KEY; never returned by the API';

-- Build files (SQL, image) removed to free disk; the row and its log stay as the record.
ALTER TABLE ctw_build ADD COLUMN IF NOT EXISTS files_removed_at timestamptz;

CREATE INDEX IF NOT EXISTS ctw_audit_log_at ON ctw_audit_log (at DESC);

INSERT INTO ctw_migration (name) VALUES ('002_security') ON CONFLICT DO NOTHING;
