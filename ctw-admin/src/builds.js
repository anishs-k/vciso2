// "Generate Docker Image": the build pipeline for one client. Two kinds of build:
//
// full: a new instance. Spec from the CTW tables -> scripts/build_client_bundle.py --json (validates,
//   seals, writes SQL / instance.json / compose / README; the one-time passwords come back in its JSON and
//   are never written to disk) -> image. The client's database must be created anew from this build's SQL.
// image_only: a new image for an instance already delivered. Reuses the instance.json of the client's last
//   successful full build, so the client keeps its database and link; no SQL, no passwords. Refused when
//   the licence (seal) or the platform's database schema version changed since that build.
//
// Both end with: docker build (the bundle as the `instance` build context) -> docker save | gzip ->
// vciso-platform-<customer>.tar.gz, and the local image is removed.
//
// Builds run one at a time, in this process. Everything a build produces is kept under
// CTW_BUILDS_DIR/<customer>/v<version>/; the ctw_build row holds its status, log and result.
// One-time passwords are held in memory only, until fetched once (POST /api/builds/:id/credentials)
// or for CREDENTIALS_TTL_MS; after that, a new full build is the only way to new passwords.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const db = require('./db');
const { httpError } = require('./http');
const { buildSpec } = require('../lib/spec-build');
const { pythonPath, sealOf, ROOT } = require('../lib/python');
const { run } = require('../lib/run');

const BUILDS_DIR = path.resolve(process.env.CTW_BUILDS_DIR || path.join(__dirname, '..', 'builds'));
const IMAGE_REPO = process.env.CTW_IMAGE_REPO || 'cybertrustworks/vciso-platform';
const CREDENTIALS_TTL_MS = 60 * 60_000;

// Files of a build that may be downloaded, by name. Nothing else under the build folder is served.
// The client's database file is <customer ID>_init.sql (001_client_init.sql in builds made before).
const sqlName = (customerId) => `${customerId}_init.sql`;
const BUNDLE_FILES = (customerId) => [sqlName(customerId), '001_client_init.sql', 'docker-compose.yml', 'README.md',
  'instance.json', 'client_spec.json', 'UPGRADE.md'];
const tarName = (customerId) => `vciso-platform-${customerId.toLowerCase()}.tar.gz`;

// Spec sections that live in the client's database, not in the image: an image-only build leaves them as
// they were at its base build. (Licence changes are caught by the seal before this matters.)
const DATABASE_SECTIONS = {
  organization: 'organisation, offices and contacts',
  contract: 'contract',
  licensing_limits: 'licence limits',
  selected_frameworks: 'frameworks and their offices',
  enabled_modules: 'modules',
  integrations: 'tool integrations',
  security_policies: 'SSO / MFA / session policy',
  news_watch_profile: 'news watch profile',
  initial_users: 'initial users',
};

const queue = [];
let running = null;
const credentials = new Map(); // build_id -> { list, expires }

const buildDir = (customerId, version) => path.join(BUILDS_DIR, customerId, `v${version}`);

// The database shape the platform code in this repository expects (src/instance.js).
function platformSchemaVersion() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'instance.js'), 'utf8');
  return Number(src.match(/const SCHEMA_VERSION = (\d+)/)?.[1]);
}

// Collects log lines and writes them to the build row at most once a second, so the UI can follow.
function buildLog(buildId, file) {
  let pending = '';
  let timer = null;
  const flush = async () => {
    timer = null;
    if (!pending) return;
    const chunk = pending;
    pending = '';
    await db.query('UPDATE ctw_build SET log = log || $2 WHERE build_id = $1', [buildId, chunk]);
  };
  return {
    line(text) {
      const l = `${text}\n`;
      pending += l;
      fs.appendFileSync(file, l);
      if (!timer) timer = setTimeout(() => flush().catch((e) => console.error('[build] log:', e.message)), 1000);
    },
    async close() {
      if (timer) clearTimeout(timer);
      await flush();
    },
  };
}

async function audit(adminId, action, customerId, details) {
  await db.query('INSERT INTO ctw_audit_log (admin_id, action, customer_id, details) VALUES ($1, $2, $3, $4)', [
    adminId,
    action,
    customerId,
    details,
  ]);
}

class StepError extends Error {}

async function step(log, title, fn) {
  log.line(`\n== ${title}`);
  const started = Date.now();
  const result = await fn();
  log.line(`   done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  return result;
}

// ─── What can be built ──────────────────────────────────────────────────────────────────────

async function lastFullBuild(customerId) {
  const { rows } = await db.query(
    `SELECT build_id, version, instance_id, licence_seal, spec_snapshot, artifact_dir, finished_at
       FROM ctw_build WHERE customer_id = $1 AND build_type = 'full' AND status = 'success'
      ORDER BY version DESC LIMIT 1`,
    [customerId],
  );
  return rows[0] || null;
}

// JSON with object keys sorted: spec_snapshot comes back from jsonb with its keys reordered, so plain
// JSON.stringify would call every section changed. Array order still counts.
function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

function changedSections(before, after) {
  return Object.entries(DATABASE_SECTIONS)
    .filter(([key]) => canonical(before?.[key]) !== canonical(after?.[key]))
    .map(([key, label]) => ({ section: key, label }));
}

// Both kinds of build for a client: whether each is allowed, and what the admin must know first.
async function options(customerId) {
  const { rows } = await db.query('SELECT status FROM ctw_client WHERE customer_id = $1', [customerId]);
  if (!rows.length) throw httpError(404, 'Client not found');
  const status = rows[0].status;
  const base = await lastFullBuild(customerId);

  const full = { allowed: true, needs_confirm: Boolean(base), reason: null, warning: null };
  if (status === 'draft') Object.assign(full, { allowed: false, reason: 'Validate the client first: it has changes that were not validated' });
  if (status === 'suspended') Object.assign(full, { allowed: false, reason: 'The client is suspended' });
  if (base) {
    full.warning = `A full build makes a new instance. The client's database from v${base.version} cannot be used ` +
      'with it: it must be recreated from the new SQL (all data in it is lost unless migrated), the initial ' +
      'users get new one-time passwords, and the platform links again.';
  }

  const imageOnly = { allowed: false, reason: null, base_build: null, unapplied_changes: [] };
  if (status === 'suspended') {
    imageOnly.reason = 'The client is suspended';
  } else if (!base) {
    imageOnly.reason = 'There is no successful full build yet: the first delivery is always a full build';
  } else if (!fs.existsSync(path.join(base.artifact_dir || '', 'bundle', 'instance.json'))) {
    imageOnly.reason = `The files of v${base.version} are missing from the build folder: run a full build`;
  } else {
    imageOnly.base_build = { build_id: base.build_id, version: base.version, instance_id: base.instance_id };
    const inst = JSON.parse(fs.readFileSync(path.join(base.artifact_dir, 'bundle', 'instance.json'), 'utf8'));
    const spec = await buildSpec(db, customerId);
    let seal = null;
    try {
      seal = await sealOf(spec);
    } catch {
      // An incomplete spec (no licence) cannot be sealed; it certainly differs from the base's.
    }
    if (inst.schema_version !== platformSchemaVersion()) {
      imageOnly.reason = `The platform's database schema changed (v${inst.schema_version} in v${base.version}, ` +
        `v${platformSchemaVersion()} now): the client's database must be rebuilt, so a full build is needed`;
    } else if (seal !== base.licence_seal) {
      imageOnly.reason = `The licence changed since v${base.version} (limits, frameworks, modules or validity): ` +
        'it is sealed into the client\'s database, so a full build is needed';
    } else {
      imageOnly.allowed = true;
      imageOnly.unapplied_changes = changedSections(base.spec_snapshot, spec);
    }
  }
  return { status, full, image_only: imageOnly };
}

// ─── Pipeline ───────────────────────────────────────────────────────────────────────────────

// full: spec + bundle. Returns the bundle builder's result.
async function prepareFull(build, dir, bundleDir, tag, log) {
  const { build_id: id, customer_id: cust } = build;
  await step(log, '1/4 Client spec from the CTW database', async () => {
    const s = await buildSpec(db, cust);
    if (!s) throw new StepError(`client ${cust} no longer exists`);
    fs.writeFileSync(path.join(dir, 'spec.json'), JSON.stringify(s, null, 2));
    await db.query('UPDATE ctw_build SET spec_snapshot = $2 WHERE build_id = $1', [id, s]);
  });

  const bundle = await step(log, '2/4 Bundle: validate, seal, schema, compose', async () => {
    const r = await run(
      pythonPath(),
      [path.join(ROOT, 'scripts', 'build_client_bundle.py'), '--spec', path.join(dir, 'spec.json'),
        '--out', bundleDir, '--json', '--no-credentials-file', '--image-tag', tag],
      { cwd: ROOT, env: { PYTHONUTF8: '1' }, onLine: (l) => log.line(`   ${l}`), stdout: true },
    );
    let result;
    try {
      result = JSON.parse(r.stdout.trim().split('\n').pop());
    } catch {
      throw new StepError(`the bundle builder exited ${r.code} without a result`);
    }
    if (!result.ok) {
      const reasons = result.errors?.length ? `: ${result.errors.join('; ')}` : '';
      throw new StepError(`bundle refused at ${result.stage}: ${result.error}${reasons}`);
    }
    (result.warnings || []).forEach((w) => log.line(`   note: ${w}`));
    return result;
  });
  // Held until fetched once; never stored.
  credentials.set(id, { list: bundle.credentials, expires: Date.now() + CREDENTIALS_TTL_MS });
  await db.query('UPDATE ctw_build SET instance_id = $2, licence_seal = $3 WHERE build_id = $1', [
    id,
    bundle.instance_id,
    bundle.license_seal,
  ]);
  return { instance_id: bundle.instance_id };
}

// image_only: the base build's identity and deployment files, with the new image in the compose file.
async function prepareImageOnly(build, dir, bundleDir, tag, log) {
  const { build_id: id, customer_id: cust } = build;
  return step(log, '1/3 Instance of the base build', async () => {
    const { rows } = await db.query(
      'SELECT version, instance_id, licence_seal, spec_snapshot, artifact_dir FROM ctw_build WHERE build_id = $1',
      [build.based_on_build],
    );
    const base = rows[0];
    const from = path.join(base.artifact_dir, 'bundle');
    for (const f of ['instance.json', 'client_spec.json', 'README.md']) {
      fs.copyFileSync(path.join(from, f), path.join(bundleDir, f));
    }
    const compose = fs.readFileSync(path.join(from, 'docker-compose.yml'), 'utf8');
    const repo = IMAGE_REPO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const updated = compose.replace(new RegExp(`(image:\\s*)${repo}:\\S+`), `$1${tag}`);
    if (updated === compose) throw new StepError(`the compose file of v${base.version} has no ${IMAGE_REPO} image line`);
    fs.writeFileSync(path.join(bundleDir, 'docker-compose.yml'), updated);

    const spec = await buildSpec(db, cust);
    const unapplied = changedSections(base.spec_snapshot, spec);
    fs.writeFileSync(path.join(bundleDir, 'UPGRADE.md'), upgradeNotes(cust, tag, base, unapplied));
    await db.query(
      'UPDATE ctw_build SET instance_id = $2, licence_seal = $3, spec_snapshot = $4 WHERE build_id = $1',
      [id, base.instance_id, base.licence_seal, base.spec_snapshot],
    );
    log.line(`   instance ${base.instance_id} from v${base.version}; the client's database is kept`);
    unapplied.forEach((c) => log.line(`   note: not in this update (needs a full build): ${c.label}`));
    return { instance_id: base.instance_id };
  });
}

function upgradeNotes(cust, tag, base, unapplied) {
  const later = unapplied.length
    ? `\nNot in this update: changes to ${unapplied.map((c) => c.label).join(', ')} since v${base.version}. ` +
      'They live in the database and come with a full build.\n'
    : '';
  return `# Platform update for ${cust}: ${tag}

Same instance (${base.instance_id}) and licence as build v${base.version}. Your database, users and data are kept;
only the platform (UI + API) changes.

1. Back up the database and the \`vciso_data\` volume.
2. \`docker load -i ${tarName(cust)}\`
3. Use the \`docker-compose.yml\` that comes with this update (only the \`api\` image changed) and keep your
   existing \`${sqlName(cust)}\` next to it.
4. \`docker compose up -d api\`
5. \`curl http://localhost:4000/api/health\` shows \`"linked": true\`.
${later}`;
}

async function dockerSave(tag, file) {
  const save = spawn('docker', ['save', tag], { windowsHide: true });
  let err = '';
  save.stderr.on('data', (d) => (err += d));
  const exited = new Promise((resolve) => save.on('close', resolve));
  await pipeline(save.stdout, zlib.createGzip({ level: 6 }), fs.createWriteStream(file));
  if ((await exited) !== 0) throw new StepError(`docker save failed: ${err.trim()}`);
}

async function execute(build) {
  const { build_id: id, customer_id: cust, version, build_type: type, requested_by: adminId } = build;
  const dir = buildDir(cust, version);
  const bundleDir = path.join(dir, 'bundle');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(bundleDir, { recursive: true });
  const log = buildLog(id, path.join(dir, 'build.log'));
  const tag = `${IMAGE_REPO}:${cust.toLowerCase()}-v${version}`;
  const n = type === 'full' ? 4 : 3;

  await db.query(`UPDATE ctw_build SET status = 'running', started_at = now(), artifact_dir = $2 WHERE build_id = $1`, [
    id,
    dir,
  ]);
  log.line(`Build v${version} of ${cust} (build ${id}, ${type}), image ${tag}`);

  try {
    const prepared = type === 'full'
      ? await prepareFull(build, dir, bundleDir, tag, log)
      : await prepareImageOnly(build, dir, bundleDir, tag, log);

    await step(log, `${n - 1}/${n} Docker image`, async () => {
      const r = await run(
        'docker',
        ['build', '--progress=plain', '--build-context', `instance=${bundleDir}`,
          '--build-arg', `BUILD_VERSION=${cust}-v${version}`, '-t', tag, ROOT],
        { cwd: ROOT, onLine: (l) => log.line(`   ${l}`) },
      );
      if (r.code !== 0) throw new StepError(`docker build failed (exit ${r.code}); see the log above`);
    });

    const size = await step(log, `${n}/${n} Image file (docker save | gzip)`, async () => {
      const file = path.join(dir, tarName(cust));
      await dockerSave(tag, file);
      const bytes = fs.statSync(file).size;
      log.line(`   ${tarName(cust)}: ${(bytes / 1024 / 1024).toFixed(1)} MB`);
      // The .tar.gz is the deliverable; the local image would only pile up on the build machine.
      await run('docker', ['rmi', tag], { onLine: () => {} });
      return bytes;
    });

    await db.query(
      `UPDATE ctw_build SET status = 'success', image_tag = $2, image_size_bytes = $3, finished_at = now()
        WHERE build_id = $1`,
      [id, tag, size],
    );
    if (type === 'full') {
      await db.query(
        `UPDATE ctw_client SET status = 'generated' WHERE customer_id = $1 AND status IN ('draft', 'ready')`,
        [cust],
      );
    }
    log.line(`\nSUCCESS: ${tag}, instance ${prepared.instance_id}`);
    await audit(adminId, 'build.success', cust, { build_id: id, version, build_type: type, image_tag: tag });
  } catch (err) {
    credentials.delete(id);
    const message = err instanceof StepError ? err.message : `internal error: ${err.message}`;
    if (!(err instanceof StepError)) console.error('[build]', err);
    log.line(`\nFAILED: ${message}`);
    await db.query(`UPDATE ctw_build SET status = 'failed', error = $2, finished_at = now() WHERE build_id = $1`, [
      id,
      message,
    ]);
    await audit(adminId, 'build.failed', cust, { build_id: id, version, build_type: type, error: message });
  } finally {
    await log.close();
  }
}

async function drain() {
  if (running) return;
  while (queue.length) {
    running = queue.shift();
    try {
      await execute(running);
    } catch (err) {
      console.error('[build] could not record the result of build', running.build_id, err);
    }
    running = null;
  }
}

// Creates the build row and queues it. `type` 'full' needs `confirm` once the client has a full build
// (it replaces the delivered instance); 'image_only' needs options() to allow it.
async function start(customerId, adminId, { type = 'full', confirm = false } = {}) {
  if (!['full', 'image_only'].includes(type)) throw httpError(400, 'build_type must be "full" or "image_only"');
  const opts = await options(customerId);
  const chosen = type === 'full' ? opts.full : opts.image_only;
  if (!chosen.allowed) throw httpError(409, chosen.reason, { build_type: type });
  if (type === 'full' && chosen.needs_confirm && !confirm) {
    throw httpError(409, chosen.warning, { build_type: type, needs_confirm: true });
  }
  const basedOn = type === 'image_only' ? opts.image_only.base_build.build_id : null;

  const build = await db.tx(async (c) => {
    await c.query('SELECT 1 FROM ctw_client WHERE customer_id = $1 FOR UPDATE', [customerId]);
    const { rows: active } = await c.query(
      `SELECT build_id FROM ctw_build WHERE customer_id = $1 AND status IN ('queued', 'running')`,
      [customerId],
    );
    if (active.length) {
      throw httpError(409, `Build ${active[0].build_id} of this client is still in progress`, {
        build_id: active[0].build_id,
      });
    }
    const { rows } = await c.query(
      `INSERT INTO ctw_build (customer_id, version, build_type, based_on_build, requested_by)
       VALUES ($1, (SELECT COALESCE(max(version), 0) + 1 FROM ctw_build WHERE customer_id = $1), $2, $3, $4)
       RETURNING build_id, customer_id, version, build_type, based_on_build, status, requested_by, created_at`,
      [customerId, type, basedOn, adminId],
    );
    return rows[0];
  });
  await audit(adminId, 'build.start', customerId, {
    build_id: build.build_id,
    version: build.version,
    build_type: type,
    based_on_build: basedOn,
  });
  queue.push(build);
  drain();
  // 0 = started right away, n = n builds of other clients run first.
  const waiting = queue.findIndex((b) => b.build_id === build.build_id);
  return { ...build, queue_position: waiting === -1 ? 0 : waiting + 1 };
}

// The passwords of a successful full build, once.
function takeCredentials(buildId) {
  const c = credentials.get(buildId);
  credentials.delete(buildId);
  return c && c.expires > Date.now() ? c.list : null;
}

// Files of a build that exist and may be downloaded: name -> absolute path.
function files(build) {
  if (!build.artifact_dir || build.files_removed_at) return {};
  const out = {};
  for (const name of BUNDLE_FILES(build.customer_id)) out[name] = path.join(build.artifact_dir, 'bundle', name);
  out[tarName(build.customer_id)] = path.join(build.artifact_dir, tarName(build.customer_id));
  out['build.log'] = path.join(build.artifact_dir, 'build.log');
  return Object.fromEntries(Object.entries(out).filter(([, p]) => fs.existsSync(p)));
}

// ─── Disk ───────────────────────────────────────────────────────────────────────────────────

function dirSize(dir) {
  if (!dir || !fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => {
    const p = path.join(dir, e.name);
    return n + (e.isDirectory() ? dirSize(p) : fs.statSync(p).size);
  }, 0);
}

// Builds whose files must stay: the last successful full build (image-only builds start from its
// instance.json) and the last successful build (what the client is likely running).
async function keptBuilds(customerId) {
  const { rows } = await db.query(
    `SELECT (SELECT build_id FROM ctw_build WHERE customer_id = $1 AND status = 'success' AND build_type = 'full'
              ORDER BY version DESC LIMIT 1) AS base,
            (SELECT build_id FROM ctw_build WHERE customer_id = $1 AND status = 'success'
              ORDER BY version DESC LIMIT 1) AS latest`,
    [customerId],
  );
  return new Map([[rows[0].base, 'base of image-only updates'], [rows[0].latest, 'latest successful build']]
    .filter(([id]) => id));
}

// Removes a build's files (SQL, bundle, image); the row and its log stay. Returns the bytes freed.
async function removeFiles(build, adminId) {
  if (build.status === 'queued' || build.status === 'running') throw httpError(409, 'The build is still running');
  if (build.files_removed_at) throw httpError(409, 'The files of this build were already removed');
  const kept = await keptBuilds(build.customer_id);
  if (kept.has(build.build_id)) throw httpError(409, `These files are kept: ${kept.get(build.build_id)}`);
  const freed = dirSize(build.artifact_dir);
  // Only ever a folder this tool made for this build.
  const expected = buildDir(build.customer_id, build.version);
  if (build.artifact_dir && path.resolve(build.artifact_dir) === path.resolve(expected)) {
    fs.rmSync(expected, { recursive: true, force: true });
  }
  await db.query('UPDATE ctw_build SET files_removed_at = now() WHERE build_id = $1', [build.build_id]);
  await audit(adminId, 'build.files_removed', build.customer_id, { build_id: build.build_id, version: build.version, freed });
  return freed;
}

// Removes the files of every build of the client except the kept ones.
async function cleanup(customerId, adminId) {
  const kept = await keptBuilds(customerId);
  const { rows } = await db.query(
    `SELECT build_id, customer_id, version, status, artifact_dir, files_removed_at FROM ctw_build
      WHERE customer_id = $1 AND files_removed_at IS NULL AND status IN ('success', 'failed')`,
    [customerId],
  );
  let freed = 0;
  let removed = 0;
  for (const b of rows.filter((r) => !kept.has(r.build_id))) {
    freed += await removeFiles(b, adminId);
    removed++;
  }
  return { removed, freed_bytes: freed };
}

// Builds a previous process left queued or running can never finish.
async function recover() {
  const { rows } = await db.query(
    `UPDATE ctw_build SET status = 'failed', error = 'interrupted: the CTW admin API stopped during the build',
            finished_at = now()
      WHERE status IN ('queued', 'running') RETURNING build_id`,
  );
  if (rows.length) console.warn(`[build] marked ${rows.length} interrupted build(s) as failed`);
  setInterval(() => {
    for (const [id, c] of credentials) if (c.expires <= Date.now()) credentials.delete(id);
  }, 60_000).unref();
}

module.exports = {
  start,
  options,
  takeCredentials,
  files,
  recover,
  dirSize,
  keptBuilds,
  removeFiles,
  cleanup,
  changedSections,
  canonical,
  BUILDS_DIR,
};
