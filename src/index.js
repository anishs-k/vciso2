require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const db = require('./db');
const instance = require('./instance');
const { mountModules } = require('./modules');

const PORT = Number(process.env.PORT) || 4000;
// The built UI (vciso-platform/vciso-app, `npm run build`); served by this process so a client
// runs one container for UI + API.
const UI_DIR = path.resolve(process.env.UI_DIR || path.join(__dirname, '..', 'vciso-platform', 'vciso-app', 'dist'));

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Liveness + database reachability + link state. Used by Docker HEALTHCHECK and load balancers.
app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT NOW() AS time');
    res.json({ status: 'ok', database: 'connected', linked: instance.state.linked, time: rows[0].time, uptime: process.uptime() });
  } catch (err) {
    console.error('[health] database check failed:', err.message);
    res.status(503).json({ status: 'error', database: 'unreachable', linked: instance.state.linked });
  }
});

// Which client this instance is and whether it is linked; open so the UI can explain a refusal.
app.get('/api/instance', (_req, res) => {
  const inst = instance.state.instance;
  res.json({
    linked: instance.state.linked,
    reason: instance.state.reason,
    customer_id: inst?.customer_id ?? null,
    customer_name: inst?.customer_name ?? null,
    licensed_modules: inst?.licensed_modules ?? [],
    licensed_frameworks: inst?.licensed_frameworks ?? [],
  });
});

app.use('/api', instance.requireLinked());
// Core routes every client gets; licensable features are the modules below.
app.use('/api/auth', require('./core/auth'));
app.use('/api', require('./core/evidence').downloads);
app.use('/api', require('./core/client'));
app.use('/api', require('./core/platform'));
app.use('/api', require('./core/audits').router);
const modules = mountModules(app);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (fs.existsSync(path.join(UI_DIR, 'index.html'))) {
  app.use(express.static(UI_DIR, { index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(UI_DIR, 'index.html')));
}

app.use((err, _req, res, _next) => {
  // Database refusals from the licence guard carry a message meant for the user.
  const licence = /^(LICENSE|SECURITY)_VIOLATION/.test(err.message || '');
  const status = licence ? 403 : err.status || err.statusCode || 500;
  if (status >= 500) console.error('[api] unhandled error:', err);
  res.status(status).json({ error: err.expose || licence || status < 500 ? err.message : 'Internal server error' });
});

async function start() {
  await db.waitForDatabase();
  const { rows } = await db.query('SELECT current_database() AS d');
  console.log(`[db] connected to PostgreSQL database "${rows[0].d}"`);

  await instance.verify(db);
  const auto = await instance.autoLink(db);
  if (auto) console.log(`[instance] first start: linked to database "${auto.database}", wrote ${instance.LINK_FILE}`);
  if (instance.state.linked) {
    console.log(`[instance] ${instance.state.instance.customer_id} linked to database "${instance.state.link.database}"`);
  } else {
    console.warn(`[instance] NOT LINKED — serving /api/health and /api/instance only. ${instance.state.reason}`);
  }

  const server = app.listen(PORT, () => {
    console.log(`[api] listening on port ${PORT} — modules: ${modules.join(', ') || 'none'}`);
  });

  const shutdown = (signal) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(async () => {
      await db.pool.end();
      process.exit(0);
    });
    // Don't hang forever on stuck connections.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('[api] failed to start:', err.message);
  process.exit(1);
});
