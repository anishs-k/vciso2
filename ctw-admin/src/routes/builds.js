// "Generate Docker Image" and its results. The pipeline itself is src/builds.js.
const fs = require('fs');
const express = require('express');
const db = require('../db');
const builds = require('../builds');
const { wrap, httpError } = require('../http');

const router = express.Router();

const SUMMARY = `build_id, customer_id, version, build_type, status, instance_id, licence_seal, image_tag,
  image_size_bytes, error, requested_by, created_at, started_at, finished_at, files_removed_at`;

async function getBuild(id) {
  if (!/^\d+$/.test(id)) throw httpError(404, 'Build not found');
  const { rows } = await db.query(`SELECT ${SUMMARY}, log, artifact_dir FROM ctw_build WHERE build_id = $1`, [id]);
  if (!rows.length) throw httpError(404, 'Build not found');
  return rows[0];
}

// Which builds the client can have now, with the reasons and warnings to show before starting one.
router.get('/clients/:id/build-options', wrap(async (req, res) => {
  res.json(await builds.options(req.params.id));
}));

// POST /api/clients/:id/builds { build_type: 'full' | 'image_only', confirm_new_instance }
// -> 202, the build runs in the background; follow it with GET /api/builds/:id
router.post('/clients/:id/builds', wrap(async (req, res) => {
  const build = await builds.start(req.params.id, req.admin.admin_id, {
    type: req.body?.build_type || 'full',
    confirm: req.body?.confirm_new_instance === true,
  });
  res.status(202).json(build);
}));

// History, with the disk each build's files take and whether they must be kept (src/builds.js keptBuilds).
router.get('/clients/:id/builds', wrap(async (req, res) => {
  const { rows } = await db.query(
    `SELECT ${SUMMARY}, artifact_dir,
            (SELECT login_id FROM ctw_admin_user a WHERE a.admin_id = b.requested_by) AS requested_by_login
       FROM ctw_build b WHERE customer_id = $1 ORDER BY version DESC`,
    [req.params.id],
  );
  const kept = await builds.keptBuilds(req.params.id);
  res.json(rows.map(({ artifact_dir: dir, ...b }) => ({
    ...b,
    disk_bytes: b.files_removed_at ? 0 : builds.dirSize(dir),
    kept_because: kept.get(b.build_id) || null,
  })));
}));

// Frees the disk of every build except the kept ones.
router.post('/clients/:id/builds/cleanup', wrap(async (req, res) => {
  res.json(await builds.cleanup(req.params.id, req.admin.admin_id));
}));

router.delete('/builds/:id/files', wrap(async (req, res) => {
  const build = await getBuild(req.params.id);
  res.json({ freed_bytes: await builds.removeFiles(build, req.admin.admin_id) });
}));

// The build with its log. ?log_from=<n> returns the log from character n on, for polling.
router.get('/builds/:id', wrap(async (req, res) => {
  const full = await getBuild(req.params.id);
  const { log, ...build } = full;
  delete build.artifact_dir; // a server path, not for the UI
  const from = Math.max(0, Number(req.query.log_from) || 0);
  res.json({ ...build, log: log.slice(from), log_length: log.length, files: Object.keys(builds.files(full)) });
}));

// The initial users' one-time passwords: available once, shortly after a successful build.
router.post('/builds/:id/credentials', wrap(async (req, res) => {
  const build = await getBuild(req.params.id);
  if (build.status !== 'success') throw httpError(409, `The build is ${build.status}`);
  const list = builds.takeCredentials(build.build_id);
  await db.query(
    `INSERT INTO ctw_audit_log (admin_id, action, customer_id, details) VALUES ($1, 'build.credentials', $2, $3)`,
    [req.admin.admin_id, build.customer_id, { build_id: build.build_id, given: Boolean(list) }],
  );
  if (!list) {
    throw httpError(410, 'The one-time passwords were already shown, or expired. Run a new full build to issue new ones.');
  }
  res.json({ credentials: list });
}));

router.get('/builds/:id/files/:name', wrap(async (req, res) => {
  const build = await getBuild(req.params.id);
  const file = builds.files(build)[req.params.name];
  if (!file) throw httpError(404, 'No such file in this build');
  await db.query(
    `INSERT INTO ctw_audit_log (admin_id, action, customer_id, details) VALUES ($1, 'build.download', $2, $3)`,
    [req.admin.admin_id, build.customer_id, { build_id: build.build_id, file: req.params.name }],
  );
  res.setHeader('Content-Length', fs.statSync(file).size);
  res.attachment(req.params.name);
  fs.createReadStream(file).pipe(res);
}));

module.exports = router;
