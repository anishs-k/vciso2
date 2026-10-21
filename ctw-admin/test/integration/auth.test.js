// Sign-in, first-sign-in set-up, MFA, sessions, against a throwaway CTW stack.
const test = require('node:test');
const assert = require('node:assert/strict');
const totp = require('../../src/totp');
const { startStack, client, dockerAvailable } = require('../helpers/harness');

test('auth and MFA', { skip: !dockerAvailable() && 'Docker is not running', timeout: 180_000 }, async (t) => {
  const stack = await startStack();
  t.after(() => stack.stop());
  const api = client(stack.base);
  const NEW_PW = 'Integration-Test-Pass-7';
  let secret;
  let step;
  let recovery;

  await t.test('security headers and no caching on the API', async () => {
    const r = await api.call('GET', '/health');
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.headers.get('x-powered-by'), null);
  });

  await t.test('everything but sign-in needs a session', async () => {
    for (const p of ['/clients', '/admins', '/audit', '/frameworks', '/auth/me']) {
      assert.equal((await api.call('GET', p)).status, 401, p);
    }
    assert.equal((await api.call('GET', '/clients', undefined, 'forged.token')).status, 401);
  });

  await t.test('wrong password: 401, the same message for unknown users', async () => {
    const a = await api.call('POST', '/auth/login', { login_id: 'ctw.admin', password: 'wrong' });
    const b = await api.call('POST', '/auth/login', { login_id: 'nobody', password: 'wrong' });
    assert.equal(a.status, 401);
    assert.equal(a.body.error, b.body.error);
  });

  await t.test('seeded admin: temporary password, then MFA, before the tool opens', async () => {
    let r = await api.call('POST', '/auth/login', { login_id: 'ctw.admin', password: stack.adminPassword });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.pending, ['password_change_required', 'mfa_setup_required']);
    api.token = r.body.token;
    r = await api.call('GET', '/clients');
    assert.equal(r.status, 403);
    assert.equal(r.body.code, 'password_change_required');
    assert.equal((await api.call('POST', '/auth/mfa/setup')).status, 200, 'set-up calls are allowed meanwhile');

    for (const [pw, why] of [['short', /at least 12/], ['has-ctw.admin-inside', /login ID/], [stack.adminPassword, /differ/]]) {
      r = await api.call('POST', '/auth/password', { current_password: stack.adminPassword, new_password: pw });
      assert.equal(r.status, 400);
      assert.match(r.body.error, why);
    }
    r = await api.call('POST', '/auth/password', { current_password: 'not-it', new_password: NEW_PW });
    assert.match(r.body.error, /current password/);
    const old = api.token;
    r = await api.call('POST', '/auth/password', { current_password: stack.adminPassword, new_password: NEW_PW });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.pending, ['mfa_setup_required']);
    assert.equal((await api.call('GET', '/auth/me', undefined, old)).status, 401, 'the old session ended');
    api.token = r.body.token;
    assert.equal((await api.call('GET', '/clients')).body.code, 'mfa_setup_required');

    r = await api.call('POST', '/auth/mfa/setup');
    secret = r.body.secret;
    assert.match(secret, /^[A-Z2-7]{32}$/);
    assert.equal((await api.call('POST', '/auth/mfa/confirm', { code: '000000' })).status, 400);
    step = totp.currentStep();
    r = await api.call('POST', '/auth/mfa/confirm', { code: totp.codeAt(secret, step) });
    assert.equal(r.status, 200);
    recovery = r.body.recovery_codes;
    assert.equal(recovery.length, 10);
    assert.deepEqual(r.body.pending, []);
    api.token = r.body.token;
    assert.equal((await api.call('GET', '/clients')).status, 200);
    assert.equal((await api.call('POST', '/auth/mfa/setup')).status, 409);
  });

  await t.test('the TOTP secret is stored encrypted, recovery codes hashed', async () => {
    const { rows } = await stack.db.query(`SELECT mfa_secret_enc, recovery_codes FROM ctw_admin_user WHERE login_id = 'ctw.admin'`);
    assert.match(rows[0].mfa_secret_enc, /^v1:/);
    assert.ok(!rows[0].mfa_secret_enc.includes(secret));
    assert.ok(rows[0].recovery_codes.every((h) => /^[0-9a-f]{64}$/.test(h)));
    assert.ok(!rows[0].recovery_codes.includes(recovery[0]));
  });

  await t.test('two-step sign-in: a challenge is not a session, a code works once', async () => {
    let r = await api.call('POST', '/auth/login', { login_id: 'ctw.admin', password: NEW_PW });
    assert.equal(r.body.mfa_required, true);
    assert.equal(r.body.token, undefined);
    const ch = r.body.challenge;
    assert.equal((await api.call('GET', '/auth/me', undefined, ch)).status, 401);
    r = await api.call('POST', '/auth/login/mfa', { challenge: ch, code: totp.codeAt(secret, step) });
    assert.equal(r.status, 401, 'the code used at set-up');
    r = await api.call('POST', '/auth/login/mfa', { challenge: ch, code: totp.codeAt(secret, step + 1) });
    assert.equal(r.status, 200);
    r = await api.call('POST', '/auth/login/mfa', { challenge: ch, code: totp.codeAt(secret, step + 1) });
    assert.equal(r.status, 401, 'the same code again');
    assert.equal((await api.call('POST', '/auth/login/mfa', { challenge: 'x.y', code: '123456' })).status, 401);
  });

  await t.test('recovery codes: any case and format, once each', async () => {
    let r = await api.call('POST', '/auth/login', { login_id: 'ctw.admin', password: NEW_PW });
    r = await api.call('POST', '/auth/login/mfa', { challenge: r.body.challenge, recovery_code: ` ${recovery[0].toUpperCase().replace('-', '')} ` });
    assert.equal(r.status, 200);
    api.token = r.body.token;
    r = await api.call('POST', '/auth/login', { login_id: 'ctw.admin', password: NEW_PW });
    r = await api.call('POST', '/auth/login/mfa', { challenge: r.body.challenge, recovery_code: recovery[0] });
    assert.equal(r.status, 401);
    assert.equal((await api.call('GET', '/auth/me')).body.recovery_codes_left, 9);
  });

  await t.test('five wrong passwords lock the login', async () => {
    const other = client(stack.base);
    await stack.db.query(
      `INSERT INTO ctw_admin_user (login_id, full_name, email, password_hash) VALUES ('lock.me', 'L', 'l@x.io', crypt('Right-Password-123', gen_salt('bf', 4)))`,
    );
    for (let i = 0; i < 5; i++) assert.equal((await other.call('POST', '/auth/login', { login_id: 'lock.me', password: 'nope' })).status, 401);
    const r = await other.call('POST', '/auth/login', { login_id: 'lock.me', password: 'Right-Password-123' });
    assert.equal(r.status, 429, 'locked even with the right password');
  });

  await t.test('sign out everywhere ends the session', async () => {
    assert.equal((await api.call('POST', '/auth/logout-all')).status, 200);
    assert.equal((await api.call('GET', '/auth/me')).status, 401);
  });

  await t.test('sign-ins are in the audit log', async () => {
    const { rows } = await stack.db.query(`SELECT details->>'method' AS m FROM ctw_audit_log WHERE action = 'admin.login' AND details->>'mfa' = 'true'`);
    assert.deepEqual(rows.map((r) => r.m).sort(), ['recovery_code', 'totp']);
  });
});
