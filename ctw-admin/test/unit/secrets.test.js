const test = require('node:test');
const assert = require('node:assert/strict');

const KEY = 'unit-test-data-key-0123456789-abcdefghij';
process.env.CTW_DATA_KEY = KEY;
const secrets = require('../../src/secrets');

test('encrypt / decrypt round-trip, with a fresh IV each time', () => {
  const a = secrets.encrypt('JBSWY3DPEHPK3PXP');
  const b = secrets.encrypt('JBSWY3DPEHPK3PXP');
  assert.notEqual(a, b);
  assert.match(a, /^v1:[\w-]+:[\w-]+:[\w-]+$/);
  assert.equal(secrets.decrypt(a), 'JBSWY3DPEHPK3PXP');
  assert.equal(secrets.decrypt(secrets.encrypt('ünïcødé ✓')), 'ünïcødé ✓');
});

test('a changed ciphertext, tag or IV is refused (GCM)', () => {
  const parts = secrets.encrypt('secret').split(':');
  for (const i of [1, 2, 3]) {
    const p = [...parts];
    const flip = p[i][0] === 'A' ? 'B' : 'A';
    p[i] = flip + p[i].slice(1);
    assert.throws(() => secrets.decrypt(p.join(':')));
  }
  assert.throws(() => secrets.decrypt(`v2:${parts.slice(1).join(':')}`), /unknown secret format/);
});

test('another key cannot decrypt', () => {
  const e = secrets.encrypt('secret');
  process.env.CTW_DATA_KEY = 'a-completely-different-key-0123456789xyz';
  try {
    assert.throws(() => secrets.decrypt(e));
  } finally {
    process.env.CTW_DATA_KEY = KEY;
  }
});

test('a missing or short key is an error, not a weak key', () => {
  for (const k of [undefined, '', 'short']) {
    if (k === undefined) delete process.env.CTW_DATA_KEY;
    else process.env.CTW_DATA_KEY = k;
    assert.throws(() => secrets.encrypt('x'), /CTW_DATA_KEY/);
  }
  process.env.CTW_DATA_KEY = KEY;
});
