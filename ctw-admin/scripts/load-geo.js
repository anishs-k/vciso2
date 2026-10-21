// Loads countries, states and cities into the CTW database (ctw_geo_*, db/004_geo.sql) from the
// country-state-city package, and each country's phone calling code and number lengths (db/005_phone.sql)
// from libphonenumber-js. Replaces what is there, in one transaction.
//
//   npm run db:geo
//
// Safe to run again.
const path = require('path');

const ADMIN_DIR = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(ADMIN_DIR, '.env') });
const { Client } = require('pg');
const { Country, State, City } = require('country-state-city');
const phoneMetadata = require('libphonenumber-js/metadata.max.json');
const { Metadata } = require('libphonenumber-js/core');

// -> { code, lengths, main } for a country, or null when it has no numbering plan. Lengths are those of
// mobile and landline numbers (without the trunk 0), else of any number the plan allows.
function phonePlan(iso2) {
  const md = new Metadata(phoneMetadata);
  if (!md.hasCountry(iso2)) return null;
  md.selectNumberingPlan(iso2);
  const plan = md.numberingPlan;
  const typed = ['MOBILE', 'FIXED_LINE'].flatMap((t) => plan.type(t)?.possibleLengths() || []);
  const lengths = [...new Set(typed.length ? typed : plan.possibleLengths())].sort((a, b) => a - b);
  const code = plan.callingCode();
  return { code, lengths, main: phoneMetadata.country_calling_codes[code]?.[0] === iso2 };
}

// Inserts rows in chunks, one array parameter per column.
async function insertAll(db, table, columns, rows) {
  const CHUNK = 20_000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const part = rows.slice(i, i + CHUNK);
    const params = columns.map((_, c) => part.map((r) => r[c]));
    const unnest = columns.map((_, c) => `$${c + 1}::text[]`).join(', ');
    await db.query(`INSERT INTO ${table} (${columns.join(', ')}) SELECT * FROM unnest(${unnest})`, params);
  }
}

async function main() {
  if (!process.env.CTW_DATABASE_URL) throw new Error('CTW_DATABASE_URL is not set (see ctw-admin/.env.example)');
  const countries = Country.getAllCountries().map((c) => [c.isoCode, c.name]);
  const states = State.getAllStates().map((s) => [s.countryCode, s.isoCode, s.name]);
  // The package lists a few cities twice in one state: keep each name once.
  const seen = new Set();
  const cities = City.getAllCities()
    .map((c) => [c.countryCode, c.stateCode, c.name])
    .filter((c) => !seen.has(c.join('|')) && seen.add(c.join('|')));
  const stateKeys = new Set(states.map((s) => `${s[0]}|${s[1]}`));

  const db = new Client({ connectionString: process.env.CTW_DATABASE_URL });
  await db.connect();
  try {
    await db.query('BEGIN');
    await db.query('TRUNCATE ctw_geo_city, ctw_geo_state, ctw_geo_country');
    await insertAll(db, 'ctw_geo_country', ['iso2', 'name'], countries);
    let phones = 0;
    for (const [iso2] of countries) {
      const p = phonePlan(iso2);
      if (!p) continue;
      await db.query('UPDATE ctw_geo_country SET phone_code = $2, phone_lengths = $3, phone_main = $4 WHERE iso2 = $1', [iso2, p.code, p.lengths, p.main]);
      phones++;
    }
    await insertAll(db, 'ctw_geo_state', ['country_iso2', 'state_code', 'name'], states);
    await insertAll(db, 'ctw_geo_city', ['country_iso2', 'state_code', 'name'], cities.filter((c) => stateKeys.has(`${c[0]}|${c[1]}`)));
    await db.query('COMMIT');
    console.log(`Loaded ${countries.length} countries (${phones} with phone numbering), ${states.length} states, ${cities.length} cities.`);
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(`Loading places failed: ${err.message}`);
  process.exit(1);
});
