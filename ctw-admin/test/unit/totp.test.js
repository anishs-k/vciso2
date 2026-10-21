const test = require('node:test');
const assert = require('node:assert/strict');
const totp = require('../../src/totp');

// RFC 6238 appendix B (SHA-1, key "12345678901234567890"), last 6 of the 8 digits.
const RFC_SECRET = totp.base32Encode(Buffer.from('12345678901234567890'));
const VECTORS = [
  [59, '287082'],
  [1111111109, '081804'],
  [1111111111, '050471'],
  [1234567890, '005924'],
  [2000000000, '279037'],
  [20000000000, '353130'],
];

test('codes match the RFC 6238 test vectors', () => {
  for (const [seconds, code] of VECTORS) assert.equal(totp.codeAt(RFC_SECRET, Math.floor(seconds / 30)), code, `T=${seconds}`);
});

test('base32 round-trips and rejects other characters', () => {
  const buf = Buffer.from('any bytes ÿ\u0000', 'latin1');
  assert.deepEqual(totp.base32Decode(totp.base32Encode(buf)), buf);
  assert.throws(() => totp.base32Decode('ABC1'), /invalid base32/);
});

test('a new secret is 32 base32 characters (160 bits)', () => {
  assert.match(totp.newSecret(), /^[A-Z2-7]{32}$/);
  assert.notEqual(totp.newSecret(), totp.newSecret());
});

test('verify accepts the current step and one either side, nothing further', () => {
  const s = totp.newSecret();
  const now = Date.UTC(2026, 9, 21, 12, 0, 15);
  const step = totp.currentStep(now);
  for (const d of [-1, 0, 1]) assert.equal(totp.verify(s, totp.codeAt(s, step + d), null, now), step + d);
  for (const d of [-3, -2, 2, 3]) assert.equal(totp.verify(s, totp.codeAt(s, step + d), null, now), null);
});

test('verify refuses a step at or before the last one used (no replay)', () => {
  const s = totp.newSecret();
  const now = Date.now();
  const step = totp.currentStep(now);
  assert.equal(totp.verify(s, totp.codeAt(s, step), step, now), null);
  assert.equal(totp.verify(s, totp.codeAt(s, step - 1), step, now), null);
  assert.equal(totp.verify(s, totp.codeAt(s, step + 1), step, now), step + 1);
});

test('verify ignores spaces and refuses anything but six digits', () => {
  const s = totp.newSecret();
  const now = Date.now();
  const code = totp.codeAt(s, totp.currentStep(now));
  assert.notEqual(totp.verify(s, `${code.slice(0, 3)} ${code.slice(3)}`, null, now), null);
  for (const bad of ['', '12345', '1234567', 'abcdef', null, undefined]) assert.equal(totp.verify(s, bad, null, now), null);
});

test('the otpauth URI carries issuer, account and parameters', () => {
  const uri = totp.otpauthUri('JBSWY3DPEHPK3PXP', 'ctw.admin');
  assert.match(uri, /^otpauth:\/\/totp\/CyberTrustWorks%20Admin%3Actw\.admin\?secret=JBSWY3DPEHPK3PXP&issuer=CyberTrustWorks%20Admin/);
  assert.match(uri, /digits=6&period=30/);
});
