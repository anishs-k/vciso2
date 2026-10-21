-- Phone numbers by country: each country's calling code and how many digits its phone numbers have
-- (mobile and landline, without the leading 0). Filled by `npm run db:geo` from libphonenumber-js, used
-- by the onboarding form's phone boxes. NULL for the few places without a numbering plan.
-- Safe to run twice.

ALTER TABLE ctw_geo_country
  ADD COLUMN IF NOT EXISTS phone_code    text,
  ADD COLUMN IF NOT EXISTS phone_lengths integer[],
  -- The country a shared code stands for when nothing else says (+1 United States, +44 United Kingdom).
  ADD COLUMN IF NOT EXISTS phone_main    boolean NOT NULL DEFAULT false;

INSERT INTO ctw_migration (name) VALUES ('005_phone') ON CONFLICT DO NOTHING;
