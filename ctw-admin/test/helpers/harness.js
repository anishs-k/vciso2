// Test harness: a CTW stack of its own for one test file, never the real CTW database.
//
//   startStack()  -> a throwaway Postgres container (random port, db/*.sql loaded on first start), seeded
//                    like `npm run seed`, and the admin API as a child process on a random port, with test
//                    keys and a temporary builds folder. stop() removes all of it.
//
// Every CTW setting is passed explicitly and dotenv never overrides a set variable, so ctw-admin/.env
// contributes nothing (CTW_PYTHON aside, when the shell sets it).
const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
const { Client } = require('pg');

const ADMIN_DIR = path.resolve(__dirname, '..', '..');
const ROOT = path.resolve(ADMIN_DIR, '..');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', windowsHide: true }).trim();

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function dockerAvailable() {
  try {
    docker('version', '--format', '{{.Server.Version}}');
    return true;
  } catch {
    return false;
  }
}

// A Postgres container loaded with db/*.sql; resolves when the final server (after init) answers.
async function startDatabase() {
  const name = `ctw-test-db-${crypto.randomBytes(4).toString('hex')}`;
  const password = crypto.randomBytes(12).toString('hex');
  docker('run', '-d', '--rm', '--name', name,
    '-e', 'POSTGRES_USER=ctw_admin', '-e', `POSTGRES_PASSWORD=${password}`, '-e', 'POSTGRES_DB=ctw',
    '-p', '127.0.0.1::5432', '-v', `${path.join(ADMIN_DIR, 'db')}:/docker-entrypoint-initdb.d:ro`,
    'postgres:16-alpine');
  const port = Number(docker('port', name, '5432/tcp').split('\n')[0].split(':').pop());
  const url = `postgres://ctw_admin:${password}@127.0.0.1:${port}/ctw`;
  for (let i = 0; i < 120; i++) {
    const c = new Client({ connectionString: url, connectionTimeoutMillis: 2000 });
    try {
      await c.connect();
      // ctw_migration is written by the last init file, so its rows mean init has finished.
      const { rows } = await c.query('SELECT count(*)::int AS n FROM ctw_migration');
      await c.end();
      if (rows[0].n >= 2) return { name, url };
    } catch {
      await c.end().catch(() => {});
    }
    await sleep(500);
  }
  docker('rm', '-f', name);
  throw new Error('the test database did not start');
}

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: ADMIN_DIR, env, windowsHide: true });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${args.join(' ')} exited ${code}:\n${out}`))));
  });
}

async function startApi(env) {
  const child = spawn(process.execPath, ['src/index.js'], { cwd: ADMIN_DIR, env, windowsHide: true });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  const base = `http://127.0.0.1:${env.CTW_ADMIN_PORT}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`the API exited:\n${log}`);
    try {
      if ((await fetch(`${base}/api/health`)).ok) return { child, base, log: () => log };
    } catch {
      /* not listening yet */
    }
    await sleep(200);
  }
  child.kill();
  throw new Error(`the API did not start:\n${log}`);
}

async function startStack({ api = true, requireMfa = true } = {}) {
  const db = await startDatabase();
  const buildsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctw-test-builds-'));
  // The shell's environment (docker and python need theirs), minus anything that could point the test at
  // real CTW or client settings; then the test's own.
  const inherited = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !/^(CTW_|DATABASE_URL$|PG[A-Z]+$|POSTGRES_)/i.test(k)),
  );
  const env = {
    ...inherited,
    CTW_PYTHON: process.env.CTW_PYTHON,
    CTW_DATABASE_URL: db.url,
    CTW_ADMIN_HOST: '127.0.0.1',
    CTW_ADMIN_PORT: String(await freePort()),
    CTW_SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    CTW_DATA_KEY: crypto.randomBytes(32).toString('hex'),
    CTW_LICENSE_SECRET: crypto.randomBytes(32).toString('hex'),
    CTW_REQUIRE_MFA: requireMfa ? 'true' : 'false',
    CTW_BUILDS_DIR: buildsDir,
    CTW_IMAGE_REPO: 'ctw-test/vciso-platform',
    CTW_ADMIN_LOGIN: 'ctw.admin',
  };
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];

  const seeded = await run(process.execPath, ['scripts/seed.js'], env);
  const adminPassword = seeded.match(/temporary password (\S+)/)?.[1];
  if (!adminPassword) throw new Error(`seed printed no admin password:\n${seeded}`);

  const server = api ? await startApi(env) : null;
  const pg = new Client({ connectionString: db.url });
  await pg.connect();

  return {
    env,
    db: pg,
    base: server?.base,
    apiLog: () => server?.log() || '',
    buildsDir,
    adminPassword,
    async stop() {
      await pg.end().catch(() => {});
      if (server) server.child.kill();
      try {
        docker('rm', '-f', db.name);
      } catch {
        /* already gone */
      }
      fs.rmSync(buildsDir, { recursive: true, force: true });
    },
  };
}

// A small API client: call(method, path, body) -> { status, body }, keeping a token once set.
function client(base) {
  const c = {
    token: null,
    async call(method, p, body, token = c.token) {
      const send = () =>
        fetch(`${base}/api${p}`, {
          method,
          headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      let res;
      try {
        res = await send();
      } catch (err) {
        // A pooled keep-alive connection the server closed while idle: the request never reached it.
        // Browsers retry these themselves; Node's fetch does not.
        if (err.cause?.code !== 'ECONNRESET') throw err;
        res = await send();
      }
      const type = res.headers.get('content-type') || '';
      return { status: res.status, headers: res.headers, body: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()) };
    },
  };
  return c;
}

// Takes the seeded admin through the first sign-in: own password, MFA. -> { api, password, secret, step, recovery }
async function signInFully(stack, { password = 'Test-Password-Strong-1' } = {}) {
  const totp = require('../../src/totp');
  const api = client(stack.base);
  let r = await api.call('POST', '/auth/login', { login_id: 'ctw.admin', password: stack.adminPassword });
  api.token = r.body.token;
  r = await api.call('POST', '/auth/password', { current_password: stack.adminPassword, new_password: password });
  api.token = r.body.token;
  r = await api.call('POST', '/auth/mfa/setup');
  const secret = r.body.secret;
  const step = totp.currentStep();
  r = await api.call('POST', '/auth/mfa/confirm', { code: totp.codeAt(secret, step) });
  if (r.status !== 200) throw new Error(`MFA set-up failed: ${JSON.stringify(r.body)}`);
  api.token = r.body.token;
  return { api, password, secret, step, recovery: r.body.recovery_codes };
}

module.exports = { startStack, client, signInFully, freePort, dockerAvailable, docker, sleep, ROOT, ADMIN_DIR };
