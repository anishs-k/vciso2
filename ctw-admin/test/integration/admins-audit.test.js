// CTW staff accounts and the audit trail.
const test = require('node:test');
const assert = require('node:assert/strict');
const totp = require('../../src/totp');
const { startStack, client, signInFully, dockerAvailable } = require('../helpers/harness');

// Takes a new admin through first sign-in (own password + MFA); returns its signed-in client.
async function setUpAdmin(base, login, temp, password) {
  const c = client(base);
  let r = await c.call('POST', '/auth/login', { login_id: login, password: temp });
  c.token = r.body.token;
  r = await c.call('POST', '/auth/password', { current_password: temp, new_password: password });
  c.token = r.body.token;
  const secret = (await c.call('POST', '/auth/mfa/setup')).body.secret;
  r = await c.call('POST', '/auth/mfa/confirm', { code: totp.codeAt(secret, totp.currentStep()) });
  c.token = r.body.token;
  return c;
}

test('admins and audit', { skip: !dockerAvailable() && 'Docker is not running', timeout: 180_000 }, async (t) => {
  const stack = await startStack();
  t.after(() => stack.stop());
  const full = await signInFully(stack);
  const { api } = full;
  const me = (await api.call('GET', '/auth/me')).body.admin;
  let ops;
  let opsTemp;

  await t.test('add an admin: temporary password once, must change it and set up MFA', async () => {
    let r = await api.call('POST', '/admins', { login_id: 'ops.one', full_name: 'Ops One', email: 'ops.one@ctw.example' });
    assert.equal(r.status, 201);
    ops = r.body.admin;
    opsTemp = r.body.temporary_password;
    assert.ok(opsTemp.length >= 16);
    assert.equal(ops.must_change_password, true);
    assert.equal(ops.created_by_login, 'ctw.admin');
    r = await client(stack.base).call('POST', '/auth/login', { login_id: 'ops.one', password: opsTemp });
    assert.deepEqual(r.body.pending, ['password_change_required', 'mfa_setup_required']);
  });

  await t.test('input is checked', async () => {
    for (const body of [
      { login_id: 'a', full_name: 'A', email: 'a@b.co' },
      { login_id: 'ok.login', full_name: '', email: 'a@b.co' },
      { login_id: 'ok.login', full_name: 'A', email: 'not-an-email' },
    ]) assert.equal((await api.call('POST', '/admins', body)).status, 400, JSON.stringify(body));
    assert.equal((await api.call('POST', '/admins', { login_id: 'ops.one', full_name: 'X', email: 'other@ctw.example' })).status, 409);
  });

  await t.test('the list never carries hashes, secrets or recovery codes', async () => {
    const list = (await api.call('GET', '/admins')).body;
    assert.equal(list.length, 2);
    assert.ok(!/hash|secret|recovery|session_version/.test(JSON.stringify(list)));
  });

  await t.test('own account is not managed here', async () => {
    for (const a of ['deactivate', 'reset-password', 'reset-mfa']) {
      assert.equal((await api.call('POST', `/admins/${me.admin_id}/${a}`)).status, 400, a);
    }
    assert.equal((await api.call('POST', '/admins/99999/deactivate')).status, 404);
  });

  await t.test('deactivate ends sessions and sign-in; reactivate restores sign-in', async () => {
    const o = client(stack.base);
    o.token = (await o.call('POST', '/auth/login', { login_id: 'ops.one', password: opsTemp })).body.token;
    assert.equal((await o.call('GET', '/auth/me')).status, 200);
    assert.equal((await api.call('POST', `/admins/${ops.admin_id}/deactivate`)).status, 200);
    assert.equal((await o.call('GET', '/auth/me')).status, 401);
    assert.equal((await o.call('POST', '/auth/login', { login_id: 'ops.one', password: opsTemp })).status, 401);
    assert.equal((await api.call('POST', `/admins/${ops.admin_id}/activate`)).status, 200);
    assert.equal((await o.call('POST', '/auth/login', { login_id: 'ops.one', password: opsTemp })).status, 200);
  });

  await t.test('two admins deactivating each other at once: one stays active', async () => {
    const peer = await setUpAdmin(stack.base, 'ops.one', opsTemp, 'Ops-One-Password-9');
    const [a, b] = await Promise.all([
      api.call('POST', `/admins/${ops.admin_id}/deactivate`),
      peer.call('POST', `/admins/${me.admin_id}/deactivate`),
    ]);
    const { rows } = await stack.db.query('SELECT login_id FROM ctw_admin_user WHERE active');
    assert.equal(rows.length, 1, `left active: ${rows.map((r) => r.login_id)}; answers ${a.status} / ${b.status}`);
    assert.deepEqual([a.status, b.status].filter((s) => s === 200).length, 1);
    // put both back for the next tests
    await stack.db.query('UPDATE ctw_admin_user SET active = true');
    if (rows[0].login_id !== 'ctw.admin') api.token = (await signInAgain(stack, full)).token;
  });

  await t.test('reset password and reset MFA sign the admin out and force set-up again', async () => {
    const peer = client(stack.base);
    let r = await api.call('POST', `/admins/${ops.admin_id}/reset-password`);
    assert.equal(r.status, 200);
    const temp = r.body.temporary_password;
    assert.ok(temp.length >= 16);
    r = await peer.call('POST', '/auth/login', { login_id: 'ops.one', password: temp });
    assert.equal(r.body.mfa_required, true, 'MFA stays on after a password reset');
    assert.equal((await api.call('POST', `/admins/${ops.admin_id}/reset-mfa`)).status, 200);
    const { rows } = await stack.db.query(
      'SELECT mfa_enabled, mfa_secret_enc, cardinality(recovery_codes)::int AS n, must_change_password FROM ctw_admin_user WHERE admin_id = $1',
      [ops.admin_id],
    );
    assert.deepEqual(rows[0], { mfa_enabled: false, mfa_secret_enc: null, n: 0, must_change_password: true });
    r = await peer.call('POST', '/auth/login', { login_id: 'ops.one', password: temp });
    assert.deepEqual(r.body.pending, ['password_change_required', 'mfa_setup_required']);
  });

  await t.test('audit: filter by action prefix and client, page with next_before', async () => {
    let r = await api.call('GET', '/audit?action=admin.&limit=3');
    assert.equal(r.status, 200);
    assert.equal(r.body.entries.length, 3);
    assert.ok(r.body.entries.every((e) => e.action.startsWith('admin.')));
    assert.ok(r.body.next_before);
    const ids = r.body.entries.map((e) => Number(e.audit_id));
    assert.deepEqual(ids, [...ids].sort((x, y) => y - x), 'newest first');
    const p2 = await api.call('GET', `/audit?action=admin.&limit=3&before=${r.body.next_before}`);
    assert.ok(Number(p2.body.entries[0].audit_id) < Math.min(...ids));
    await api.call('POST', '/clients/Cust_00101/validate');
    r = await api.call('GET', '/audit?customer_id=Cust_00101');
    assert.ok(r.body.entries.length > 0 && r.body.entries.every((e) => e.customer_id === 'Cust_00101'));
    r = await api.call('GET', '/audit?limit=100000&before=abc&admin_id=x');
    assert.equal(r.status, 200, 'odd parameters are ignored or clamped');
    assert.ok(r.body.entries.length <= 200);
    assert.ok((await api.call('GET', '/audit/actions')).body.includes('admin.create'));
  });
});

// ctw.admin with MFA on: password, then the code of a step not used yet.
async function signInAgain(stack, full) {
  const { rows } = await stack.db.query(`SELECT mfa_last_step FROM ctw_admin_user WHERE login_id = 'ctw.admin'`);
  const step = Math.max(totp.currentStep(), Number(rows[0].mfa_last_step) + 1);
  const c = client(stack.base);
  const r = await c.call('POST', '/auth/login', { login_id: 'ctw.admin', password: full.password });
  const s = await c.call('POST', '/auth/login/mfa', { challenge: r.body.challenge, code: totp.codeAt(full.secret, step) });
  assert.equal(s.status, 200, 'ctw.admin signs in again');
  return s.body;
}
