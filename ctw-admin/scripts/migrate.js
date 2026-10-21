// Applies the db/*.sql files a CTW database has not had yet, in name order (`npm run db:migrate`).
// A new volume gets every file from docker-entrypoint-initdb.d; each file from 002 on records itself
// in ctw_migration, so this runner then has nothing to do. A database made before ctw_migration existed
// counts 001 as applied when its tables are there.
const fs = require('fs');
const path = require('path');

const ADMIN_DIR = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(ADMIN_DIR, '.env') });
const { Client } = require('pg');

const DB_DIR = path.join(ADMIN_DIR, 'db');

async function main() {
  if (!process.env.CTW_DATABASE_URL) throw new Error('CTW_DATABASE_URL is not set (see ctw-admin/.env.example)');
  const db = new Client({ connectionString: process.env.CTW_DATABASE_URL });
  await db.connect();
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS ctw_migration (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const { rows: base } = await db.query(`SELECT to_regclass('ctw_client') IS NOT NULL AS has_schema`);
    if (base[0].has_schema) await db.query(`INSERT INTO ctw_migration (name) VALUES ('001_ctw_schema') ON CONFLICT DO NOTHING`);

    const done = new Set((await db.query('SELECT name FROM ctw_migration')).rows.map((r) => r.name));
    const files = fs.readdirSync(DB_DIR).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();
    let applied = 0;
    for (const file of files) {
      const name = file.replace(/\.sql$/, '');
      if (done.has(name)) continue;
      await db.query('BEGIN');
      try {
        await db.query(fs.readFileSync(path.join(DB_DIR, file), 'utf8'));
        await db.query('INSERT INTO ctw_migration (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
        await db.query('COMMIT');
      } catch (err) {
        await db.query('ROLLBACK');
        throw new Error(`${file}: ${err.message}`);
      }
      console.log(`Applied ${file}`);
      applied++;
    }
    console.log(applied ? `${applied} migration(s) applied.` : 'The database is up to date.');
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(`Migration failed: ${err.message}`);
  process.exit(1);
});
