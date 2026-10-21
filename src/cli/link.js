// Links this client instance to its database. Run once after the database has been initialised:
//
//   CTW_INSTANCE_DIR=<folder with instance.json> DATABASE_URL=postgres://... npm run link
//   npm run link -- --relink     move the link to another database (e.g. after a restore)
//
// In the client image (which links itself on first start, CTW_AUTO_LINK):
//   docker compose run --rm api node dist/cli/link.js --relink
//
// Checks the database was generated for this instance and licence, then writes link.json
// (CTW_LINK_FILE, default next to instance.json). The API serves only the linked database from then on
// (src/instance.js). Lives in src/ so it ships in the image.
require('dotenv').config();
const { Pool } = require('pg');
const instance = require('../instance');

async function main() {
  const relink = process.argv.includes('--relink');
  if (!process.env.DATABASE_URL) {
    throw new instance.LinkError('DATABASE_URL is not set: give the connection string of this client\'s database');
  }
  const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5_000 });
  try {
    const { link, already, database } = await instance.link(db, { relink });
    const verb = already ? 'already linked to' : 'linked to';
    console.log(`Instance ${link.customer_id} (${link.instance_id}) ${verb} database "${database}" (${link.db_uid}).`);
    if (!already) console.log(`Wrote ${instance.LINK_FILE}. Keep it with instance.json; restart the API to apply.`);
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(err instanceof instance.LinkError ? `Not linked: ${err.message}` : err);
  process.exit(1);
});
