const { Pool } = require('pg');

// DATABASE_URL takes precedence; otherwise pg reads PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PG_POOL_MAX) || 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// An idle client erroring (e.g. db restart) must not crash the process.
pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

async function query(text, params = []) {
  return pool.query(text, params);
}

// Retries so the api survives starting a few seconds before Postgres is ready.
async function waitForDatabase({ retries = 10, delayMs = 2_000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      console.warn(`[db] connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = { pool, query, waitForDatabase };
