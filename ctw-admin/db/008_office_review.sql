-- A licensed framework may be reviewed at a different interval in each office it applies to
-- (spec: selected_frameworks[].office_review_months = { office_id: months }). NULL means the framework's
-- own review_frequency_months, as before; existing clients keep that.
-- Safe to run twice.

ALTER TABLE ctw_licence_framework_office
  ADD COLUMN IF NOT EXISTS review_frequency_months integer CHECK (review_frequency_months > 0);

INSERT INTO ctw_migration (name) VALUES ('008_office_review') ON CONFLICT DO NOTHING;
