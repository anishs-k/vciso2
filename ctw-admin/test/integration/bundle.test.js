// The Python bundle builder as the build pipeline calls it (scripts/build_client_bundle.py --json).
// Needs the project's .venv with openpyxl and bcrypt; no Docker, no database.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { pythonPath, ROOT } = require('../../lib/python');
const { freshSample } = require('../helpers/fixtures');

// These specs go straight to the Python builder, not through the API that generates contract IDs.
const sample = (customerId) => {
  const spec = freshSample(customerId);
  spec.contract.contract_id = `Contract_${customerId.replace(/\D/g, '')}_001`;
  return spec;
};

const SECRET = crypto.randomBytes(32).toString('hex');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ctw-bundle-test-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const hasPython = fs.existsSync(pythonPath()) && spawnSync(pythonPath(), ['-c', 'import openpyxl, bcrypt']).status === 0;
const skip = !hasPython && 'the project .venv with openpyxl and bcrypt is missing';

function writeSpec(name, spec) {
  const f = path.join(tmp, `${name}.json`);
  fs.writeFileSync(f, JSON.stringify(spec));
  return f;
}

// Runs the builder; env is minimal so nothing leaks in from the shell (no PYTHONUTF8: Windows defaults).
// secret null = CTW_LICENSE_SECRET not set at all.
function build(specFile, out, args = [], secret = SECRET) {
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP };
  if (secret !== null) env.CTW_LICENSE_SECRET = secret;
  const r = spawnSync(pythonPath(), [path.join(ROOT, 'scripts', 'build_client_bundle.py'), '--spec', specFile, '--out', out, '--json', ...args], {
    cwd: ROOT,
    env,
    encoding: 'utf8',
  });
  const lines = r.stdout.trim().split('\n');
  return { status: r.status, result: JSON.parse(lines[lines.length - 1]), stdoutLines: lines.length, stderr: r.stderr };
}

test('bundle builder', { skip, timeout: 240_000 }, async (t) => {
  const okSpec = sample('Cust_00505');
  okSpec.selected_frameworks[0].office_review_months = { Cust_00505_001: 3, Cust_00505_002: 24 };
  const specFile = writeSpec('ok', okSpec);
  let ok;

  await t.test('refuses to seal without a proper CTW_LICENSE_SECRET', () => {
    for (const secret of [null, '', 'short']) {
      const r = build(specFile, path.join(tmp, 'nosecret'), [], secret);
      assert.equal(r.status, 1);
      assert.equal(r.result.stage, 'seal');
      assert.match(r.result.error, /CTW_LICENSE_SECRET/);
    }
  });

  await t.test('reports every validation error', () => {
    const bad = sample('Cust_00505');
    bad.enabled_modules = ['vulnerabilities'];
    bad.initial_users = [];
    const r = build(writeSpec('bad', bad), path.join(tmp, 'bad'));
    assert.equal(r.status, 1);
    assert.equal(r.result.stage, 'validate');
    assert.ok(r.result.errors.some((e) => /'compliance' is mandatory/.test(e)));
    assert.ok(r.result.errors.some((e) => /At least one initial user/.test(e)));
  });

  await t.test('--json --no-credentials-file: one JSON line on stdout, passwords only there', () => {
    const out = path.join(tmp, 'ok');
    const r = build(specFile, out, ['--no-credentials-file', '--image-tag', 'ctw-test/vciso-platform:cust_00505-v1']);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdoutLines, 1, 'progress goes to stderr');
    ok = { ...r.result, out };
    assert.equal(ok.ok, true);
    assert.deepEqual(ok.files, ['Cust_00505_init.sql', 'README.md', 'client_spec.json', 'docker-compose.yml', 'instance.json'], 'the SQL file is named after the customer');
    assert.deepEqual(ok.credentials.map((c) => c.login_id), ['priya.sharma', 'vikram.malhotra', 'rohan.iyer']);
    assert.ok(!fs.existsSync(path.join(out, 'initial_credentials.txt')));
  });

  await t.test('the SQL is UTF-8 and holds bcrypt hashes, never the passwords', () => {
    const buf = fs.readFileSync(path.join(ok.out, 'Cust_00505_init.sql'));
    const sql = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    assert.ok(/[–—’]/.test(sql), 'workbook dashes and quotes survive');
    for (const c of ok.credentials) assert.ok(!sql.includes(c.password), `no plain password for ${c.login_id}`);
    assert.equal((sql.match(/'\$2a\$10\$[./A-Za-z0-9]{53}'/g) || []).length, 3);
    assert.ok(!sql.includes("gen_salt('bf'"));
  });

  await t.test('each office gets its own review interval for a framework', () => {
    const sql = fs.readFileSync(path.join(ok.out, 'Cust_00505_init.sql'), 'utf8');
    assert.match(sql, /ALTER TABLE customer_contract_framework_map ADD COLUMN review_frequency_months/);
    const map = [...sql.matchAll(/INSERT INTO customer_contract_framework_map \(customer_id, office_id, fy_id, contract_id, framework_id, review_frequency_months[^)]*\) VALUES \('Cust_00505', '([^']+)', \d+, '[^']+', (\d+), (\d+)/g)]
      .map((m) => `${m[1]} ${m[2]} ${m[3]}`);
    assert.deepEqual(map, ['Cust_00505_001 102 3', 'Cust_00505_002 102 24', 'Cust_00505_001 103 6'], "own interval, else the framework's");
  });

  await t.test('an IT Admin gets the Roles sheet row Role_0003', () => {
    const sql = fs.readFileSync(path.join(ok.out, 'Cust_00505_init.sql'), 'utf8');
    assert.match(sql, /'User_0003', 'IT Admin'/);
    assert.match(sql, /'Role_0003', 'User_0003', 'UI_RD_0003'/);
  });

  await t.test("on-boarding and off-boarding dates are the contract's first and last day", () => {
    const sql = fs.readFileSync(path.join(ok.out, 'Cust_00505_init.sql'), 'utf8');
    assert.ok(!/on_boarding_date[^;]*CURRENT_DATE/.test(sql), 'a real date, not the day the SQL runs');
    const { contract_start_date: start, contract_end_date: end } = okSpec.contract;
    for (const t of ['master_customer_details', 'master_customer_address_details', 'master_customer_contract_detail']) {
      const line = sql.split(/\r?\n/).find((l) => l.startsWith(`INSERT INTO ${t} `));
      assert.match(line, /, on_boarding_date, off_boarding_date\) VALUES /, t);
      assert.ok(line.endsWith(`, '${start}', '${end}');`), t);
    }
  });

  await t.test('every scanner tool chosen at onboarding is connected in the client database', () => {
    const sql = fs.readFileSync(path.join(ok.out, 'Cust_00505_init.sql'), 'utf8');
    const tools = [...sql.matchAll(/INSERT INTO customer_tool_integration \([^)]*\) VALUES \('INT_[^']+', 'Cust_00505', 'vulnerability-management', '([^']+)', '([^']+)', (TRUE|FALSE), (\d+)/g)]
      .map((m) => `${m[1]} ${m[2]} ${m[3]} ${m[4]}`);
    const want = okSpec.integrations.tools.map((x) => `${x.tool_name} ${x.target_endpoint} ${x.enabled ? 'TRUE' : 'FALSE'} ${x.pull_frequency_per_day}`);
    assert.deepEqual(tools, want);
  });

  await t.test('instance.json, client_spec.json and the result agree on the seal', () => {
    const inst = JSON.parse(fs.readFileSync(path.join(ok.out, 'instance.json'), 'utf8'));
    const sealed = JSON.parse(fs.readFileSync(path.join(ok.out, 'client_spec.json'), 'utf8'));
    assert.equal(inst.license_seal, ok.license_seal);
    assert.equal(sealed.license_seal, ok.license_seal);
    assert.equal(inst.instance_id, ok.instance_id);
    assert.match(ok.license_seal, /^[0-9a-f]{64}$/);
    assert.match(fs.readFileSync(path.join(ok.out, 'docker-compose.yml'), 'utf8'), /image: ctw-test\/vciso-platform:cust_00505-v1/);
  });

  await t.test('a sealed spec changed afterwards is refused, --reseal seals it again', () => {
    const sealed = JSON.parse(fs.readFileSync(path.join(ok.out, 'client_spec.json'), 'utf8'));
    sealed.licensing_limits.max_users = 24;
    const f = writeSpec('tampered', sealed);
    let r = build(f, path.join(tmp, 'tampered'));
    assert.equal(r.status, 1);
    assert.match(r.result.error, /does not match its licence/);
    r = build(f, path.join(tmp, 'tampered'), ['--reseal', '--no-credentials-file']);
    assert.equal(r.status, 0);
    assert.notEqual(r.result.license_seal, ok.license_seal);
  });

  await t.test('without --no-credentials-file the passwords file is written', () => {
    const out = path.join(tmp, 'withfile');
    const r = build(specFile, out);
    assert.equal(r.status, 0);
    const lines = fs.readFileSync(path.join(out, 'initial_credentials.txt'), 'utf8').trim().split('\n').filter((l) => !l.startsWith('#'));
    assert.deepEqual(lines.map((l) => l.split('\t')[0]), ['priya.sharma', 'vikram.malhotra', 'rohan.iyer']);
  });

  await t.test('the schema generator refuses an unsealed spec', () => {
    const r = spawnSync(pythonPath(), [path.join(ROOT, 'db', 'generate_client_schema.py'), '--spec', specFile, '--out', path.join(tmp, 'x', 'x.sql')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /no license_seal/);
  });
});
