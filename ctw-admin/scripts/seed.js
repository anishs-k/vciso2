// Fills a fresh CTW database:
//   1. framework and module catalogues, read from intake/client_intake.py (single source of truth)
//   2. the first CTW admin, only while there is none; its password is printed once
//   3. client specs given as arguments (default: intake/sample_client_spec.json); existing clients are skipped
//
//   npm run seed [-- path/to/spec.json ...]
//
// Safe to run again.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const ADMIN_DIR = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(ADMIN_DIR, '.env') });
const { Client } = require('pg');
const { importSpec } = require('../lib/spec-import');
const { readCatalogue, ROOT } = require('../lib/python');

async function seedCatalogue(db) {
  const { frameworks, modules } = await readCatalogue();
  for (const [id, name] of Object.entries(frameworks)) {
    await db.query(
      `INSERT INTO ctw_framework (framework_id, framework_name) VALUES ($1, $2)
       ON CONFLICT (framework_id) DO UPDATE SET framework_name = EXCLUDED.framework_name`,
      [Number(id), name],
    );
  }
  for (const [i, m] of modules.entries()) {
    await db.query(
      `INSERT INTO ctw_module (module_name, mandatory, sort_order) VALUES ($1, $2, $3)
       ON CONFLICT (module_name) DO UPDATE SET mandatory = EXCLUDED.mandatory, sort_order = EXCLUDED.sort_order`,
      [m, m === 'compliance', i],
    );
  }
  console.log(`Catalogue: ${Object.keys(frameworks).length} frameworks, ${modules.length} modules.`);
}

// Returns the admin_id to attribute imports to.
async function seedAdmin(db) {
  const { rows } = await db.query('SELECT admin_id, login_id FROM ctw_admin_user ORDER BY admin_id LIMIT 1');
  if (rows.length) {
    console.log(`Admin: ${rows[0].login_id} already exists.`);
    return rows[0].admin_id;
  }
  const login = process.env.CTW_ADMIN_LOGIN || 'ctw.admin';
  const password = crypto.randomBytes(12).toString('base64url');
  const { rows: created } = await db.query(
    `INSERT INTO ctw_admin_user (login_id, full_name, email, password_hash, must_change_password)
     VALUES ($1, $2, $3, crypt($4, gen_salt('bf', 10)), true) RETURNING admin_id`,
    [
      login,
      process.env.CTW_ADMIN_NAME || 'CTW Administrator',
      process.env.CTW_ADMIN_EMAIL || 'admin@cybertrustworks.example',
      password,
    ],
  );
  await db.query(`INSERT INTO ctw_audit_log (admin_id, action) VALUES ($1, 'admin.create')`, [created[0].admin_id]);
  console.log(`Admin: created ${login} with temporary password ${password}  (shown once; change it and set up MFA at the first sign-in)`);
  return created[0].admin_id;
}

async function seedClients(db, adminId, files) {
  for (const file of files) {
    const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
    await db.query('BEGIN');
    try {
      const id = await importSpec(db, spec, { adminId });
      await db.query('COMMIT');
      console.log(`Client: imported ${id} from ${path.relative(ROOT, file)}.`);
    } catch (err) {
      await db.query('ROLLBACK');
      if (err.code !== 'exists') throw err;
      console.log(`Client: ${spec.organization.customer_id} already exists, skipped.`);
    }
  }
  // Generated contract IDs carry on after the contracts imported here (db/006_contract_id.sql).
  await db.query(`SELECT setval('ctw_contract_seq', GREATEST(n, 1), n > 0)
                    FROM (SELECT GREATEST((SELECT count(*) FROM ctw_contract),
                                          (SELECT CASE WHEN is_called THEN last_value ELSE 0 END FROM ctw_contract_seq)) AS n) c`);
}

async function main() {
  if (!process.env.CTW_DATABASE_URL) throw new Error('CTW_DATABASE_URL is not set (see ctw-admin/.env.example)');
  const files = process.argv.slice(2).map((f) => path.resolve(f));
  if (!files.length) files.push(path.join(ROOT, 'intake', 'sample_client_spec.json'));

  const db = new Client({ connectionString: process.env.CTW_DATABASE_URL });
  await db.connect();
  try {
    await seedCatalogue(db);
    const adminId = await seedAdmin(db);
    await seedClients(db, adminId, files);
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
