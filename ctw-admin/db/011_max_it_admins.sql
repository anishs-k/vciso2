-- A licence's IT Admin seats (at least 1). Empty for drafts and for clients made before this column;
-- the intake validator requires it before a build. Safe to run twice.

ALTER TABLE ctw_licence ADD COLUMN IF NOT EXISTS max_it_admins integer CHECK (max_it_admins > 0);

INSERT INTO ctw_migration (name) VALUES ('011_max_it_admins') ON CONFLICT DO NOTHING;
