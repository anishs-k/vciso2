// Which builds are allowed (full / image-only), and which build files are kept, without running Docker:
// the build rows and folders are made by the test the way a finished build leaves them.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { startStack, signInFully, dockerAvailable } = require('../helpers/harness');
const { freshSample } = require('../helpers/fixtures');

test('build rules', { skip: !dockerAvailable() && 'Docker is not running', timeout: 180_000 }, async (t) => {
  const stack = await startStack();
  t.after(() => stack.stop());
  const { api } = await signInFully(stack);
  process.env.CTW_LICENSE_SECRET = stack.env.CTW_LICENSE_SECRET; // for sealOf below, as the API seals
  const { sealOf } = require('../../lib/python');
  const CUST = 'Cust_00404';
  const spec = freshSample(CUST);
  await api.call('POST', '/clients', spec);
  await api.call('POST', '/clients/Cust_00404/validate');
  const opts = async () => (await api.call('GET', `/clients/${CUST}/build-options`)).body;

  // A finished build as src/builds.js leaves it: row, folder, bundle/instance.json, an image file.
  async function fakeBuild(version, { type = 'full', status = 'success', basedOn = null, schemaVersion = 2, s = spec } = {}) {
    const dir = path.join(stack.buildsDir, CUST, `v${version}`);
    fs.mkdirSync(path.join(dir, 'bundle'), { recursive: true });
    const seal = await sealOf(s);
    fs.writeFileSync(path.join(dir, 'bundle', 'instance.json'), JSON.stringify({ instance_id: `00000000-0000-4000-8000-00000000000${version}`, schema_version: schemaVersion, license_seal: seal }));
    fs.writeFileSync(path.join(dir, 'bundle', 'docker-compose.yml'), `services:\n  api:\n    image: ctw-test/vciso-platform:x-v${version}\n`);
    fs.writeFileSync(path.join(dir, `vciso-platform-${CUST.toLowerCase()}.tar.gz`), Buffer.alloc(4096, 1));
    const { rows } = await stack.db.query(
      `INSERT INTO ctw_build (customer_id, version, build_type, based_on_build, status, instance_id, licence_seal, spec_snapshot, artifact_dir, finished_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now()) RETURNING build_id`,
      [CUST, version, type, basedOn, status, `00000000-0000-4000-8000-00000000000${version}`, seal, s, dir],
    );
    return { id: rows[0].build_id, dir };
  }

  await t.test('first delivery: full only, without confirmation', async () => {
    const o = await opts();
    assert.equal(o.full.allowed, true);
    assert.equal(o.full.needs_confirm, false);
    assert.equal(o.image_only.allowed, false);
    assert.match(o.image_only.reason, /no successful full build/);
  });

  let v1;
  await t.test('after a full build: image-only allowed on it; a new full build needs confirmation', async () => {
    v1 = await fakeBuild(1);
    const o = await opts();
    assert.equal(o.image_only.allowed, true);
    assert.equal(o.image_only.base_build.version, 1);
    assert.deepEqual(o.image_only.unapplied_changes, []);
    assert.equal(o.full.needs_confirm, true);
    assert.match(o.full.warning, /recreated/);
    const r = await api.call('POST', `/clients/${CUST}/builds`, { build_type: 'full' });
    assert.equal(r.status, 409);
    assert.equal(r.body.needs_confirm, true);
    assert.equal((await api.call('POST', `/clients/${CUST}/builds`, { build_type: 'weird' })).status, 400);
  });

  await t.test('changes kept in the database are listed as not carried by image-only', async () => {
    const s = structuredClone(spec);
    s.organization.contacts[0].contact_phone = '+91-1';
    s.initial_users[0].user_mobile = '+91-2';
    await api.call('PUT', `/clients/${CUST}`, s);
    const o = await opts();
    assert.equal(o.image_only.allowed, true);
    assert.deepEqual(o.image_only.unapplied_changes.map((c) => c.section), ['organization', 'initial_users']);
  });

  await t.test('a licence change blocks image-only', async () => {
    for (const mutate of [
      (s) => (s.licensing_limits.max_users = 26),
      (s) => (s.enabled_modules = s.enabled_modules.filter((m) => m !== 'incidents')),
      (s) => s.selected_frameworks.pop(),
    ]) {
      const s = structuredClone(spec);
      mutate(s);
      await api.call('PUT', `/clients/${CUST}`, s);
      const o = await opts();
      assert.equal(o.image_only.allowed, false);
      assert.match(o.image_only.reason, /licence changed since v1/);
      assert.equal((await api.call('POST', `/clients/${CUST}/builds`, { build_type: 'image_only' })).status, 409);
    }
    await api.call('PUT', `/clients/${CUST}`, spec);
    assert.equal((await opts()).image_only.allowed, true, 'back to the delivered licence');
  });

  await t.test('a platform schema change blocks image-only', async () => {
    const f = path.join(v1.dir, 'bundle', 'instance.json');
    const inst = JSON.parse(fs.readFileSync(f, 'utf8'));
    fs.writeFileSync(f, JSON.stringify({ ...inst, schema_version: 1 }));
    const o = await opts();
    assert.equal(o.image_only.allowed, false);
    assert.match(o.image_only.reason, /database schema changed \(v1 in v1, v2 now\)/);
    fs.writeFileSync(f, JSON.stringify(inst));
  });

  await t.test('missing base files and a suspended client block builds', async () => {
    fs.renameSync(path.join(v1.dir, 'bundle'), path.join(v1.dir, 'bundle.x'));
    assert.match((await opts()).image_only.reason, /files of v1 are missing/);
    fs.renameSync(path.join(v1.dir, 'bundle.x'), path.join(v1.dir, 'bundle'));
    await stack.db.query(`UPDATE ctw_client SET status = 'suspended' WHERE customer_id = $1`, [CUST]);
    const o = await opts();
    assert.equal(o.full.allowed, false);
    assert.equal(o.image_only.allowed, false);
    await stack.db.query(`UPDATE ctw_client SET status = 'generated' WHERE customer_id = $1`, [CUST]);
  });

  await t.test('one build at a time per client', async () => {
    await stack.db.query(`INSERT INTO ctw_build (customer_id, version, build_type, status) VALUES ($1, 50, 'full', 'running')`, [CUST]);
    const r = await api.call('POST', `/clients/${CUST}/builds`, { build_type: 'image_only' });
    assert.equal(r.status, 409);
    assert.match(r.body.error, /still in progress/);
    await stack.db.query(`DELETE FROM ctw_build WHERE customer_id = $1 AND version = 50`, [CUST]);
  });

  await t.test('file cleanup keeps the image-only base and the latest build', async () => {
    const v2 = await fakeBuild(2);
    const v3 = await fakeBuild(3, { type: 'image_only', basedOn: v2.id });
    const v4 = await fakeBuild(4, { status: 'failed' });
    // A build row pointing outside its own folder: its files are marked removed but nothing there is deleted.
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ctw-outside-'));
    fs.writeFileSync(path.join(outside, 'precious.txt'), 'keep me');
    await stack.db.query('UPDATE ctw_build SET artifact_dir = $2 WHERE build_id = $1', [v4.id, outside]);

    let list = (await api.call('GET', `/clients/${CUST}/builds`)).body;
    const kept = Object.fromEntries(list.map((b) => [b.version, b.kept_because]));
    assert.match(kept[2], /base/);
    assert.match(kept[3], /latest/);
    assert.equal(kept[1], null);
    assert.ok(list.find((b) => b.version === 1).disk_bytes >= 4096);

    assert.equal((await api.call('DELETE', `/builds/${v2.id}/files`)).status, 409);
    assert.equal((await api.call('DELETE', `/builds/${v3.id}/files`)).status, 409);
    const r = await api.call('POST', `/clients/${CUST}/builds/cleanup`);
    assert.equal(r.body.removed, 2);
    assert.ok(!fs.existsSync(v1.dir), 'v1 folder removed');
    assert.ok(fs.existsSync(v2.dir) && fs.existsSync(v3.dir), 'kept folders stay');
    assert.equal(fs.readFileSync(path.join(outside, 'precious.txt'), 'utf8'), 'keep me', 'nothing outside the builds folder is deleted');
    fs.rmSync(outside, { recursive: true, force: true });

    list = (await api.call('GET', `/clients/${CUST}/builds`)).body;
    assert.deepEqual(list.filter((b) => b.files_removed_at).map((b) => b.version).sort(), [1, 4]);
    assert.deepEqual((await api.call('GET', `/builds/${v1.id}`)).body.files, []);
    assert.equal((await api.call('GET', `/builds/${v1.id}/files/build.log`)).status, 404);
    assert.equal((await api.call('DELETE', `/builds/${v1.id}/files`)).status, 409);
    assert.equal((await opts()).image_only.allowed, true, 'image-only still possible after cleanup');
  });

  await t.test('only known file names are served', async () => {
    const list = (await api.call('GET', `/clients/${CUST}/builds`)).body;
    const id = list.find((b) => b.version === 2).build_id;
    assert.equal((await api.call('GET', `/builds/${id}/files/instance.json`)).status, 200);
    for (const name of ['..%2F..%2F.env', 'spec.json', '..%5Cbundle%5Cinstance.json', 'bundle%2Finstance.json']) {
      assert.equal((await api.call('GET', `/builds/${id}/files/${name}`)).status, 404, name);
    }
    assert.equal((await api.call('POST', `/builds/${id}/credentials`)).status, 410, 'no passwords for a build this process did not run');
  });
});
