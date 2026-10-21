// Anis: downloads data from the Postgres databases running in Docker, from a web page.
// It talks only to Docker (docker ps / docker exec): no project code, no npm packages, no passwords
// (it runs pg_dump / psql inside the container as the container's own POSTGRES_USER).
//
//   node server.js        then open http://127.0.0.1:4700   (or double-click start.bat)
//
// Listens on 127.0.0.1 only: nobody else on the network can reach it.
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFile, spawn } = require('child_process');

const PORT = Number(process.env.ANIS_PORT) || 4700;
const HOST = '127.0.0.1';
const MAX_BUFFER = 1024 * 1024 * 1024; // 1 GB per table for the CSV zip

// ─── Docker ───────────────────────────────────────────────────────────────────────────────

// Runs docker with arguments (never through a shell) -> stdout as text.
function docker(args) {
  return new Promise((resolve, reject) => {
    execFile('docker', args, { maxBuffer: MAX_BUFFER, windowsHide: true }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).trim()));
      else resolve(stdout);
    });
  });
}

// Running containers made from a Postgres image.
async function containers() {
  const out = await docker(['ps', '--format', '{{json .}}']);
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((c) => /postgres/i.test(c.Image))
    .map((c) => ({ name: c.Names, image: c.Image, ports: c.Ports, status: c.Status }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// The user the container's database was created with.
async function pgUser(container) {
  const user = (await docker(['exec', container, 'printenv', 'POSTGRES_USER']).catch(() => '')).trim();
  return user || 'postgres';
}

async function psql(container, db, sql) {
  const user = await pgUser(container);
  return docker(['exec', container, 'psql', '-U', user, '-d', db, '-X', '-A', '-t', '-F', '\t', '-c', sql]);
}

async function databases(container) {
  const out = await psql(container, 'postgres', 'SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY 1');
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

// Every table with its exact number of rows.
async function tables(container, db) {
  const out = await psql(container, db, `
    SELECT table_schema, table_name,
           (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text
      FROM information_schema.tables
     WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('pg_catalog', 'information_schema')
     ORDER BY 1, 2`);
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [schema, name, rows] = line.split('\t');
      return { schema, name, rows: Number(rows) };
    });
}

// Only names Docker / Postgres listed themselves are used: nothing typed reaches a command.
async function checkContainer(name) {
  if (!(await containers()).some((c) => c.name === name)) throw httpError(404, `No running Postgres container "${name}"`);
}
async function checkDb(container, db) {
  await checkContainer(container);
  if (!(await databases(container)).includes(db)) throw httpError(404, `No database "${db}" in ${container}`);
}

const ident = (s) => `"${s.replaceAll('"', '""')}"`;

// One table as CSV (with a header row).
async function tableCsv(container, db, schema, name) {
  const user = await pgUser(container);
  return docker(['exec', container, 'psql', '-U', user, '-d', db, '-X', '-c',
    `COPY ${ident(schema)}.${ident(name)} TO STDOUT WITH (FORMAT csv, HEADER)`]);
}

// ─── ZIP (stored, no compression library needed) ─────────────────────────────────────────

function zip(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  const dos = dosTime(new Date());
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const data = f.data;
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(dos.time, 10);
    local.writeUInt16LE(dos.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, name, data);

    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(0, 10);
    c.writeUInt16LE(dos.time, 12);
    c.writeUInt16LE(dos.date, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(data.length, 20);
    c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(name.length, 28);
    c.writeUInt32LE(offset, 42);
    central.push(c, name);
    offset += local.length + name.length + data.length;
  }
  const centralSize = central.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, ...central, end]);
}

function dosTime(d) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────────────────

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

// Local date and time for file names: 2026-10-22_1530.
function stamp() {
  const d = new Date();
  const two = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}_${two(d.getHours())}${two(d.getMinutes())}`;
}
const safe = (s) => s.replace(/[^A-Za-z0-9_.-]/g, '_');
const BOM = Buffer.from('﻿'); // so Excel reads Hindi and other non-English text correctly

function sendJson(res, body, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function attachment(res, filename, type) {
  res.writeHead(200, {
    'content-type': type,
    'content-disposition': `attachment; filename="${filename}"`,
    'cache-control': 'no-store',
  });
}

const routes = {
  '/api/containers': async () => containers(),

  '/api/databases': async (q) => {
    await checkContainer(q.c);
    return databases(q.c);
  },

  '/api/tables': async (q) => {
    await checkDb(q.c, q.db);
    return tables(q.c, q.db);
  },

  // The whole database as one .sql file (schema and data), restorable with psql.
  '/download/sql': async (q, res) => {
    await checkDb(q.c, q.db);
    const user = await pgUser(q.c);
    const args = ['exec', q.c, 'pg_dump', '-U', user, '-d', q.db, '--no-owner', '--no-privileges'];
    if (q.inserts === '1') args.push('--inserts');
    if (q.dataOnly === '1') args.push('--data-only');
    attachment(res, `${safe(q.db)}_${stamp()}.sql`, 'application/sql; charset=utf-8');
    await new Promise((resolve) => {
      const p = spawn('docker', args, { windowsHide: true });
      let err = '';
      p.stderr.on('data', (d) => (err += d));
      p.stdout.pipe(res, { end: false });
      p.on('close', (code) => {
        if (code !== 0) res.destroy(new Error(err)); // the browser shows the download as failed
        else res.end();
        resolve();
      });
    });
    return undefined;
  },

  // Every table as a CSV file, in one .zip.
  '/download/csv-zip': async (q, res) => {
    await checkDb(q.c, q.db);
    const files = [];
    for (const t of await tables(q.c, q.db)) {
      const csv = await tableCsv(q.c, q.db, t.schema, t.name);
      const name = t.schema === 'public' ? t.name : `${t.schema}.${t.name}`;
      files.push({ name: `${safe(name)}.csv`, data: Buffer.concat([BOM, Buffer.from(csv, 'utf8')]) });
    }
    const body = zip(files);
    attachment(res, `${safe(q.db)}_csv_${stamp()}.zip`, 'application/zip');
    res.end(body);
    return undefined;
  },

  // One table as CSV.
  '/download/csv': async (q, res) => {
    await checkDb(q.c, q.db);
    const t = (await tables(q.c, q.db)).find((x) => x.schema === q.schema && x.name === q.table);
    if (!t) throw httpError(404, `No table ${q.schema}.${q.table}`);
    const csv = await tableCsv(q.c, q.db, t.schema, t.name);
    attachment(res, `${safe(q.db)}_${safe(t.name)}_${stamp()}.csv`, 'text/csv; charset=utf-8');
    res.end(Buffer.concat([BOM, Buffer.from(csv, 'utf8')]));
    return undefined;
  },
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}`);
  if (req.method !== 'GET') return sendJson(res, { error: 'Only GET' }, 405);
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'",
    });
    return res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
  }
  if (url.pathname === '/favicon.ico') return res.writeHead(204).end();
  const route = routes[url.pathname];
  if (!route) return sendJson(res, { error: 'Not found' }, 404);
  const q = Object.fromEntries(url.searchParams);
  try {
    const body = await route(q, res);
    if (body !== undefined) sendJson(res, body);
  } catch (err) {
    console.error(`${url.pathname}: ${err.message}`);
    if (!res.headersSent) sendJson(res, { error: err.message }, err.status || 500);
    else res.destroy();
  }
  return undefined;
});

server.listen(PORT, HOST, () => {
  console.log(`Anis is running: http://${HOST}:${PORT}   (close this window to stop it)`);
});
