// CTW admin API: CTW staff sign in, onboard clients and generate their images.
// Runs on CTW's side only, against the CTW central database (CTW_DATABASE_URL). It listens on
// 127.0.0.1 unless CTW_ADMIN_HOST says otherwise: put it behind CTW's VPN or a TLS proxy, never on the internet.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const db = require('./db');
const auth = require('./auth');
const builds = require('./builds');
const secrets = require('./secrets');
const { errorHandler } = require('./http');

const PORT = Number(process.env.CTW_ADMIN_PORT) || 4500;
const HOST = process.env.CTW_ADMIN_HOST || '127.0.0.1';

// Fail at start-up, not at the first sign-in, when a key is missing.
auth.secret();
secrets.key();
if (!process.env.CTW_LICENSE_SECRET) console.warn('[ctw-admin] CTW_LICENSE_SECRET is not set: full builds will be refused');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
    // React sets inline style attributes, hence 'unsafe-inline' for styles only; the QR code is a data: URL.
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
      "connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  });
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('[health] database check failed:', err.message);
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api', auth.requireAdmin);
app.use('/api', require('./routes/catalogue'));
app.use('/api/questionnaire', require('./routes/questionnaire'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api', require('./routes/builds'));
app.use('/api/admins', require('./routes/admins'));
app.use('/api/audit', require('./routes/audit'));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

// The built UI (ctw-admin/ui, `npm run build` there): one port for UI and API.
const UI_DIR = path.join(__dirname, '..', 'ui', 'dist');
if (fs.existsSync(path.join(UI_DIR, 'index.html'))) {
  app.use(express.static(UI_DIR, { index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(UI_DIR, 'index.html')));
}

builds
  .recover()
  .then(() =>
    app.listen(PORT, HOST, () => {
      console.log(`[ctw-admin] listening on http://${HOST}:${PORT}${auth.mfaRequired() ? '' : ' (MFA not required: CTW_REQUIRE_MFA=false)'}`);
    }),
  )
  .catch((err) => {
    console.error('[ctw-admin] failed to start:', err.message);
    process.exit(1);
  });
