// An Indian pincode -> its country, state and city, for the office form. Asks India Post's public lookup
// (api.postalpincode.in) and names the place the way the form's lists do (ctw_geo_state / ctw_geo_city),
// so the dropdowns show it as chosen. Answers are kept in memory; a pincode's place does not change.
const db = require('./db');

const API = process.env.CTW_PINCODE_API || 'https://api.postalpincode.in/pincode/';
const TIMEOUT_MS = 8000;
const PINCODE = /^[1-9][0-9]{5}$/;

// India Post spellings that differ from the state list (after norm()).
const STATE_ALIASES = {
  chattisgarh: 'chhattisgarh',
  orissa: 'odisha',
  pondicherry: 'puducherry',
  dadraandnagarhaveli: 'dadraandnagarhavelianddamananddiu',
  damananddiu: 'dadraandnagarhavelianddamananddiu',
  newdelhi: 'delhi',
};
// India Post districts whose city goes by another name in the city list.
const CITY_ALIASES = { bangalore: 'bengaluru', gurgaon: 'gurugram', bombay: 'mumbai', calcutta: 'kolkata', madras: 'chennai' };

const norm = (s) => (s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');
const find = (names, wanted, aliases) => {
  const n = norm(wanted);
  return names.find((x) => norm(x) === n) || names.find((x) => norm(x) === aliases[n]);
};

class LookupError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}

async function fromIndiaPost(pincode) {
  let body;
  try {
    const res = await fetch(API + pincode, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    body = await res.json();
  } catch {
    throw new LookupError(502, 'Pincode lookup is not available right now; type the place in.');
  }
  const offices = (body?.[0]?.Status === 'Success' && body[0].PostOffice) || [];
  if (!offices.length) throw new LookupError(404, `No place found for pincode ${pincode}`);
  return offices;
}

const cache = new Map();

// -> { pincode, country, state, city }. Throws a LookupError (404 unknown pincode, 400 bad format, 502 API down).
async function lookupPincode(pincode) {
  pincode = String(pincode || '').trim();
  if (!PINCODE.test(pincode)) throw new LookupError(400, 'An Indian pincode is 6 digits and does not start with 0');
  if (cache.has(pincode)) return cache.get(pincode);

  const offices = await fromIndiaPost(pincode);
  const first = offices[0];

  const { rows: states } = await db.query("SELECT state_code, name FROM ctw_geo_state WHERE country_iso2 = 'IN'");
  const stateName = find(states.map((s) => s.name), first.State, STATE_ALIASES);
  const state = states.find((s) => s.name === stateName);

  // The district is the city; a block (taluk) is tried when the district is not in the state's list.
  let city = first.District;
  if (state) {
    const { rows } = await db.query(
      "SELECT DISTINCT name FROM ctw_geo_city WHERE country_iso2 = 'IN' AND state_code = $1",
      [state.state_code],
    );
    const names = rows.map((r) => r.name);
    const candidates = [...new Set(offices.flatMap((o) => [o.District, o.Block]))].filter((x) => x && x !== 'NA');
    city = candidates.map((c) => find(names, c, CITY_ALIASES)).find(Boolean) || first.District;
  }

  const place = { pincode, country: 'India', state: stateName || first.State, city };
  cache.set(pincode, place);
  return place;
}

module.exports = { lookupPincode, PINCODE };
