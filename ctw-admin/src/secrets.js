// Encrypts what CTW keeps secret in its own database (admins' TOTP secrets): AES-256-GCM under a key
// derived from CTW_DATA_KEY. Losing or changing CTW_DATA_KEY means every admin sets up MFA again.
const crypto = require('crypto');

function key() {
  const k = process.env.CTW_DATA_KEY;
  if (!k || k.length < 32) throw new Error('CTW_DATA_KEY must be set (32+ characters) in ctw-admin/.env');
  return crypto.createHash('sha256').update(k).digest();
}

// -> 'v1:<iv>:<tag>:<ciphertext>' (base64url)
function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return ['v1', iv, c.getAuthTag(), data].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join(':');
}

function decrypt(value) {
  const [v, iv, tag, data] = String(value).split(':');
  if (v !== 'v1') throw new Error('unknown secret format');
  const d = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64url')), d.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt, key };
