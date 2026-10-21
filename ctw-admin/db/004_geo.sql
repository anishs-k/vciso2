-- Countries, their states and their cities: the choices for an office's location in the onboarding form.
-- Filled by `npm run db:geo` (scripts/load-geo.js) from the country-state-city package; empty until then,
-- and the form then falls back to typing. Offices keep the names (ctw_client_office.city/state/country),
-- as before, so specs and the intake validator do not change.
-- Safe to run twice.

CREATE TABLE IF NOT EXISTS ctw_geo_country (
  iso2  char(2) PRIMARY KEY,
  name  text NOT NULL
);

CREATE TABLE IF NOT EXISTS ctw_geo_state (
  country_iso2  char(2) NOT NULL REFERENCES ctw_geo_country(iso2) ON DELETE CASCADE,
  state_code    text NOT NULL,
  name          text NOT NULL,
  PRIMARY KEY (country_iso2, state_code)
);

CREATE TABLE IF NOT EXISTS ctw_geo_city (
  country_iso2  char(2) NOT NULL,
  state_code    text NOT NULL,
  name          text NOT NULL,
  FOREIGN KEY (country_iso2, state_code) REFERENCES ctw_geo_state(country_iso2, state_code) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ctw_geo_city_state ON ctw_geo_city (country_iso2, state_code);

INSERT INTO ctw_migration (name) VALUES ('004_geo') ON CONFLICT DO NOTHING;
