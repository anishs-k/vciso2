// Which client this API instance is, and which database it is linked to.
//
// A client receives one image (UI + API) and runs one database. The build pipeline writes
// instance.json (db/generate_client_schema.py); `npm run link` pins the instance to one database by
// writing link.json next to it. On start the API checks both files against the database and serves
// nothing but /api/health and /api/instance until they agree, so it can never run against another
// client's database or a second copy of its own.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// The database shape this code understands (db/generate_client_schema.py SCHEMA_VERSION).
const SCHEMA_VERSION = 2;

const DIR = process.env.CTW_INSTANCE_DIR ? path.resolve(process.env.CTW_INSTANCE_DIR) : null;
const INSTANCE_FILE = DIR && path.join(DIR, 'instance.json');
// In the client image instance.json is baked in (read-only) and link.json lives on the data volume.
const LINK_FILE = process.env.CTW_LINK_FILE ? path.resolve(process.env.CTW_LINK_FILE) : DIR && path.join(DIR, 'link.json');

const state = { linked: false, reason: 'not checked yet', instance: null, link: null, database: null };

class LinkError extends Error {}

function readJson(file, what) {
  if (!fs.existsSync(file)) throw new LinkError(`${what} not found: ${file}`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new LinkError(`${what} is not valid JSON (${file}): ${err.message}`);
  }
}

function loadInstance() {
  if (!DIR) throw new LinkError('CTW_INSTANCE_DIR is not set (the folder holding this client\'s instance.json)');
  const inst = readJson(INSTANCE_FILE, 'instance.json');
  for (const key of ['instance_id', 'customer_id', 'license_id', 'license_seal', 'schema_version']) {
    if (!inst[key]) throw new LinkError(`instance.json has no ${key}`);
  }
  if (inst.schema_version !== SCHEMA_VERSION) {
    throw new LinkError(`instance.json is for schema version ${inst.schema_version}; this API supports ${SCHEMA_VERSION}`);
  }
  return inst;
}

// The identity a database carries (platform_instance + client_license), or why it has none.
async function readDatabase(db) {
  let rows;
  try {
    ({ rows } = await db.query(
      `SELECT p.instance_id::text, p.customer_id, p.license_id, p.schema_version, p.db_uid::text, p.linked_at,
              l.license_seal, l.valid_to, l.licensed_frameworks, l.licensed_modules, current_database() AS database
         FROM platform_instance p JOIN client_license l ON l.license_id = p.license_id`
    ));
  } catch (err) {
    if (err.code === '42P01') {
      throw new LinkError(`database "${await db.query('SELECT current_database() d').then((r) => r.rows[0].d)}" ` +
        'is not a vCISO client database (no platform_instance table); load the client\'s <customer ID>_init.sql into an empty database');
    }
    throw err;
  }
  if (rows.length !== 1) throw new LinkError(`platform_instance must hold exactly one row, found ${rows.length}`);
  return rows[0];
}

// Every reason this instance and this database do not belong together.
function mismatches(inst, dbRow) {
  const out = [];
  if (dbRow.instance_id !== inst.instance_id) out.push(`database was generated for instance ${dbRow.instance_id}, this is ${inst.instance_id}`);
  if (dbRow.customer_id !== inst.customer_id) out.push(`database belongs to customer ${dbRow.customer_id}, this instance to ${inst.customer_id}`);
  if (dbRow.license_id !== inst.license_id) out.push(`licence ${dbRow.license_id} in the database, ${inst.license_id} in instance.json`);
  if (dbRow.license_seal !== inst.license_seal) out.push('licence seal in the database does not match instance.json');
  if (dbRow.schema_version !== SCHEMA_VERSION) out.push(`database schema version ${dbRow.schema_version}, this API supports ${SCHEMA_VERSION}`);
  return out;
}

// Called once at start. Never throws: the outcome is kept in `state`.
async function verify(db) {
  try {
    const inst = loadInstance();
    state.instance = inst;
    const dbRow = await readDatabase(db);
    state.database = dbRow.database;
    const bad = mismatches(inst, dbRow);
    if (bad.length) throw new LinkError(`this database is not ${inst.customer_id}'s: ${bad.join('; ')}`);
    if (!fs.existsSync(LINK_FILE)) {
      throw new LinkError(`instance ${inst.customer_id} is not linked to a database yet: run \`npm run link\``);
    }
    const link = readJson(LINK_FILE, 'link.json');
    if (link.instance_id !== inst.instance_id) throw new LinkError('link.json belongs to another instance; run `npm run link`');
    if (link.db_uid !== dbRow.db_uid) {
      throw new LinkError(`linked to database ${link.database} (${link.db_uid}), but connected to ${dbRow.database} ` +
        `(${dbRow.db_uid}); point DATABASE_URL at the linked database, or run \`npm run link -- --relink\` to move the link`);
    }
    if (!link.session_secret || link.session_secret.length < 64) throw new LinkError('link.json has no session secret; run `npm run link -- --relink`');
    if (!link.data_key || link.data_key.length < 64) throw new LinkError('link.json has no data key; run `npm run link -- --relink`');
    Object.assign(state, { linked: true, reason: null, link, licence: { valid_to: dbRow.valid_to } });
  } catch (err) {
    if (!(err instanceof LinkError)) throw err;
    Object.assign(state, { linked: false, reason: err.message, link: null });
  }
  return state;
}

// Pins this instance to the database `db` is connected to (scripts/link-db.js).
async function link(db, { relink = false } = {}) {
  const inst = loadInstance();
  const dbRow = await readDatabase(db);
  const bad = mismatches(inst, dbRow);
  if (bad.length) throw new LinkError(`refusing to link ${inst.customer_id} to database ${dbRow.database}: ${bad.join('; ')}`);

  const existing = fs.existsSync(LINK_FILE) ? readJson(LINK_FILE, 'link.json') : null;
  if (existing && existing.db_uid === dbRow.db_uid && existing.instance_id === inst.instance_id) {
    return { link: existing, already: true, database: dbRow.database };
  }
  // A link.json from an earlier build of the bundle (another instance_id) is stale and simply replaced.
  if (!relink && existing && existing.instance_id === inst.instance_id) {
    throw new LinkError(`this instance is already linked to database ${existing.database} (${existing.db_uid}); ` +
      'use --relink to move it to this database');
  }
  if (!relink && dbRow.linked_at) {
    throw new LinkError(`database ${dbRow.database} was already linked on ${dbRow.linked_at.toISOString()} ` +
      'by another installation of this instance; use --relink if that installation is gone');
  }
  const record = {
    instance_id: inst.instance_id,
    customer_id: inst.customer_id,
    database: dbRow.database,
    db_uid: dbRow.db_uid,
    linked_at: new Date().toISOString(),
    linked_from: os.hostname(),
    session_secret: crypto.randomBytes(48).toString('hex'),
    // Encrypts secrets stored in the database (tool credentials, settings). Kept across --relink, so a
    // restored database stays readable; losing link.json means re-entering those secrets.
    data_key: existing?.instance_id === inst.instance_id && existing.data_key ? existing.data_key : crypto.randomBytes(32).toString('hex'),
  };
  await db.query('UPDATE platform_instance SET linked_at = now(), linked_from = $1', [record.linked_from]);
  fs.mkdirSync(path.dirname(LINK_FILE), { recursive: true });
  fs.writeFileSync(LINK_FILE, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
  return { link: record, already: false, database: dbRow.database };
}

// CTW_AUTO_LINK=true (the client image): on the very first start, with no link.json yet, link to the
// configured database. Safe to automate because link() without relink refuses a database another
// installation already linked and a link.json of this instance pointing elsewhere.
async function autoLink(db) {
  if (state.linked || process.env.CTW_AUTO_LINK !== 'true' || !LINK_FILE || fs.existsSync(LINK_FILE)) return null;
  try {
    const result = await link(db);
    await verify(db);
    return result;
  } catch (err) {
    if (!(err instanceof LinkError)) throw err;
    state.reason = `automatic link refused: ${err.message}`;
    return null;
  }
}

// Express middleware: everything except the routes in `open` waits for a linked instance.
function requireLinked(open = []) {
  return (req, res, next) => {
    if (state.linked || open.includes(req.path)) return next();
    res.status(503).json({ error: 'instance_not_linked', message: state.reason });
  };
}

// Key for pgp_sym_encrypt / pgp_sym_decrypt of secrets in the client database.
const dataKey = () => state.link.data_key;

module.exports = { dataKey, SCHEMA_VERSION, state, verify, link, autoLink, requireLinked, LinkError, LINK_FILE, INSTANCE_FILE };
