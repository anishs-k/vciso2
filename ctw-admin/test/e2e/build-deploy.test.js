// End to end: onboard a client in CTW Admin, generate its image, and run it the way the client does
// (docker load + docker compose up with only the downloaded files); then an image-only update on the same
// database, and a full rebuild that the old database must refuse. Slow (real docker build / save).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');
const { startStack, signInFully, freePort, dockerAvailable, docker, sleep } = require('../helpers/harness');
const { freshSample } = require('../helpers/fixtures');

const CUST = 'Cust_00606';
const REPO = 'ctw-test/vciso-platform';

test('build and deploy like a client', { skip: !dockerAvailable() && 'Docker is not running', timeout: 20 * 60_000 }, async (t) => {
  const stack = await startStack();
  const clientDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctw-e2e-client-'));
  const project = `ctw-e2e-${crypto.randomBytes(3).toString('hex')}`;
  const dbPassword = crypto.randomBytes(12).toString('hex');
  const [dbPort, apiPort, devPort] = [await freePort(), await freePort(), await freePort()];
  const composeEnv = { ...process.env, POSTGRES_PASSWORD: dbPassword, POSTGRES_PORT: String(dbPort), API_PORT: String(apiPort) };
  const compose = (...args) => execFileSync('docker', ['compose', '-p', project, ...args], { cwd: clientDir, env: composeEnv, encoding: 'utf8', stdio: 'pipe' });
  const extra = [];

  t.after(async () => {
    for (const c of extra) try { docker('rm', '-f', c); } catch { /* gone */ }
    try { compose('down', '-v'); } catch { /* never started */ }
    for (const v of [1, 2, 3]) try { docker('rmi', '-f', `${REPO}:${CUST.toLowerCase()}-v${v}`); } catch { /* not loaded */ }
    fs.rmSync(clientDir, { recursive: true, force: true });
    await stack.stop();
  });

  const { api } = await signInFully(stack);
  const runBuild = async (body) => {
    const r = await api.call('POST', `/clients/${CUST}/builds`, body);
    assert.equal(r.status, 202, JSON.stringify(r.body));
    for (;;) {
      const b = (await api.call('GET', `/builds/${r.body.build_id}`)).body;
      if (b.status === 'success' || b.status === 'failed') {
        assert.equal(b.status, 'success', `${b.error}\n${b.log.slice(-3000)}`);
        return b;
      }
      await sleep(2000);
    }
  };
  const fetchFile = async (build, name, as = name) => {
    const r = await api.call('GET', `/builds/${build.build_id}/files/${name}`);
    assert.equal(r.status, 200, name);
    fs.writeFileSync(path.join(clientDir, as), r.body);
  };
  const health = async (port, want) => {
    for (let i = 0; i < 90; i++) {
      try {
        const h = await (await fetch(`http://127.0.0.1:${port}/api/health`)).json();
        if (want === undefined || h.linked === want) return h;
      } catch { /* starting */ }
      await sleep(1000);
    }
    throw new Error(`no healthy platform on ${port}`);
  };
  const clientSql = (sql) => docker('exec', `${project}-db-1`, 'psql', '-U', 'vciso_admin', '-d', CUST.toLowerCase().replace(/^/, 'vciso_'), '-At', '-c', sql);
  const linkFingerprint = () => {
    const l = JSON.parse(docker('exec', `${project}-api-1`, 'cat', '/data/link.json'));
    return `${l.instance_id}|${l.db_uid}|${l.session_secret}|${l.data_key}|${l.linked_at}`;
  };

  let v1;
  let passwords;
  await t.test('onboard and run a full build', async () => {
    await api.call('POST', '/clients', freshSample(CUST));
    assert.equal((await api.call('POST', `/clients/${CUST}/validate`)).body.valid, true);
    v1 = await runBuild({ build_type: 'full' });
    assert.equal(v1.image_tag, `${REPO}:${CUST.toLowerCase()}-v1`);
    passwords = (await api.call('POST', `/builds/${v1.build_id}/credentials`)).body.credentials;
    assert.equal(passwords.length, 3);
    assert.equal((await api.call('POST', `/builds/${v1.build_id}/credentials`)).status, 410);
    assert.ok(!docker('images', '-q', v1.image_tag), 'the build machine keeps only the .tar.gz');
  });

  await t.test('the image holds the platform for this client and nothing private', async () => {
    for (const f of [`${CUST}_init.sql`, 'docker-compose.yml', 'README.md']) await fetchFile(v1, f);
    await fetchFile(v1, `vciso-platform-${CUST.toLowerCase()}.tar.gz`, 'image-v1.tar.gz');
    assert.match(docker('load', '-i', path.join(clientDir, 'image-v1.tar.gz')), /Loaded image: ctw-test\/vciso-platform:cust_00606-v1/);
    // No shell inside: each tool runs as the entrypoint with plain arguments (no quoting to get wrong).
    const inImage = (tool, ...args) => docker('run', '--rm', '--user', 'root', '--entrypoint', tool, v1.image_tag, ...args);
    const found = inImage('find', '/', '-xdev', '-not', '-path', '*/node_modules/*', '(',
      '-name', 'initial_credentials*', '-o', '-name', '*.sql', '-o', '-name', '.env', '-o', '-name', 'client_spec.json',
      '-o', '-name', 'link.json', '-o', '-path', '*ctw-admin*', '-o', '-path', '*/intake/*', ')', '-print');
    assert.equal(found, '', 'no private file in the image');
    assert.equal(inImage('stat', '-c', '%a %U', '/app/instance/instance.json'), '444 root', 'instance.json read-only');
    assert.deepEqual(JSON.parse(inImage('cat', '/app/dist/modules/enabled.json')).modules, ['compliance', 'vulnerabilities']);
    assert.equal(inImage('ls', '/app/ui/index.html'), '/app/ui/index.html');
    assert.equal(JSON.parse(inImage('cat', '/app/instance/instance.json')).instance_id, v1.instance_id);
  });

  let fingerprint;
  await t.test('the client starts it: the platform links itself and serves the UI', async () => {
    compose('up', '-d');
    const h = await health(apiPort, true);
    assert.equal(h.database, 'connected');
    const ui = await fetch(`http://127.0.0.1:${apiPort}/`);
    assert.match(await ui.text(), /<div id="root">/);
    assert.match(compose('logs', 'api'), /first start: linked to database/);
    fingerprint = linkFingerprint();
    clientSql("CREATE TABLE e2e_marker (note text); INSERT INTO e2e_marker VALUES ('client data from v1')");
  });

  await t.test('the initial users sign in with their one-time passwords', async () => {
    const login = (pw) => fetch(`http://127.0.0.1:${apiPort}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login_id: 'priya.sharma', password: pw }),
    });
    assert.equal((await login('wrong-password')).status, 401);
    // MFA is on and the platform cannot send mail: production stops after the password check (503).
    assert.equal((await login(passwords[0].password)).status, 503);
    // A development container on the same database and volume completes the sign-in.
    const dev = `${project}-devmfa`;
    extra.push(dev);
    docker('run', '-d', '--rm', '--name', dev, '--network', `${project}_default`, '-v', `${project}_vciso_data:/data`,
      '-e', 'CTW_DEV_MFA=true', '-e', `DATABASE_URL=postgres://vciso_admin:${dbPassword}@db:5432/vciso_${CUST.toLowerCase()}`,
      '-p', `127.0.0.1:${devPort}:4000`, v1.image_tag);
    await health(devPort, true);
    for (const c of passwords) {
      const r = await (await fetch(`http://127.0.0.1:${devPort}/api/auth/login`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login_id: c.login_id, password: c.password }),
      })).json();
      const v = await (await fetch(`http://127.0.0.1:${devPort}/api/auth/verify-mfa`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: r.userId, code: r.devCode }),
      })).json();
      assert.ok(v.token, `${c.login_id} signed in`);
      assert.equal(v.user.must_change_password, true);
      const info = await fetch(`http://127.0.0.1:${devPort}/api/company-info/${CUST}`, { headers: { authorization: `Bearer ${v.token}` } });
      assert.equal(info.status, 200);
    }
    docker('rm', '-f', dev);
  });

  await t.test('a second copy with its own volume is refused by the database', async () => {
    const copy = `${project}-copy`;
    extra.push(copy);
    const port = await freePort();
    docker('run', '-d', '--rm', '--name', copy, '--network', `${project}_default`,
      '-e', `DATABASE_URL=postgres://vciso_admin:${dbPassword}@db:5432/vciso_${CUST.toLowerCase()}`, '-p', `127.0.0.1:${port}:4000`, v1.image_tag);
    const h = await health(port);
    assert.equal(h.linked, false);
    // `docker logs` hands the container's stderr (console.warn) back on its own stderr.
    const logs = spawnSync('docker', ['logs', copy], { encoding: 'utf8' });
    assert.match(logs.stdout + logs.stderr, /automatic link refused: .*already linked/);
    docker('rm', '-f', copy);
  });

  await t.test('image-only update: same database, same link, data kept', async () => {
    const s = freshSample(CUST);
    s.organization.contacts[0].contact_phone = '+91-90000-00000';
    await api.call('PUT', `/clients/${CUST}`, s);
    const v2 = await runBuild({ build_type: 'image_only' });
    assert.equal(v2.instance_id, v1.instance_id);
    assert.ok(!v2.files.includes(`${CUST}_init.sql`));
    assert.ok(v2.files.includes('UPGRADE.md'));
    assert.equal((await api.call('POST', `/builds/${v2.build_id}/credentials`)).status, 410);
    await fetchFile(v2, 'UPGRADE.md');
    assert.match(fs.readFileSync(path.join(clientDir, 'UPGRADE.md'), 'utf8'), /Not in this update: changes to organisation, offices and contacts/);
    await fetchFile(v2, `vciso-platform-${CUST.toLowerCase()}.tar.gz`, 'image-v2.tar.gz');
    docker('load', '-i', path.join(clientDir, 'image-v2.tar.gz'));
    await fetchFile(v2, 'docker-compose.yml');
    compose('up', '-d', 'api');
    await sleep(2000);
    await health(apiPort, true);
    assert.equal(docker('inspect', '-f', '{{.Config.Image}}', `${project}-api-1`), v2.image_tag);
    assert.equal(linkFingerprint(), fingerprint, 'link.json unchanged');
    assert.equal(clientSql('SELECT note FROM e2e_marker'), 'client data from v1');
    assert.doesNotMatch(compose('logs', '--since', '1m', 'api'), /first start/);
  });

  await t.test('a full rebuild is a new instance: the old database refuses it', async () => {
    assert.equal((await api.call('POST', `/clients/${CUST}/builds`, { build_type: 'full' })).status, 409, 'needs confirmation');
    const v3 = await runBuild({ build_type: 'full', confirm_new_instance: true });
    assert.notEqual(v3.instance_id, v1.instance_id);
    await fetchFile(v3, `vciso-platform-${CUST.toLowerCase()}.tar.gz`, 'image-v3.tar.gz');
    docker('load', '-i', path.join(clientDir, 'image-v3.tar.gz'));
    await fetchFile(v3, 'docker-compose.yml');
    compose('up', '-d', 'api');
    await sleep(2000);
    const h = await health(apiPort, false);
    assert.equal(h.linked, false);
    assert.match(compose('logs', '--since', '1m', 'api'), /database was generated for instance/);
    assert.equal(clientSql('SELECT note FROM e2e_marker'), 'client data from v1', 'the old data is untouched');
  });

  await t.test('the audit trail has the whole story', async () => {
    const { rows } = await stack.db.query(`SELECT action FROM ctw_audit_log WHERE customer_id = $1 ORDER BY audit_id`, [CUST]);
    const actions = rows.map((r) => r.action);
    for (const a of ['client.create', 'client.validate', 'build.start', 'build.success', 'build.credentials', 'build.download', 'client.update']) {
      assert.ok(actions.includes(a), a);
    }
    assert.equal(actions.filter((a) => a === 'build.success').length, 3);
  });
});
