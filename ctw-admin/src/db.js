const { Pool, types } = require('pg');

// DATE stays 'YYYY-MM-DD' (no timezone shift) and NUMERIC becomes a number, as in a client spec.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

const pool = new Pool({
  connectionString: process.env.CTW_DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// An idle client erroring (e.g. db restart) must not crash the process.
pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

const query = (text, params = []) => pool.query(text, params);

// Runs fn(client) in one transaction.
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, tx };
