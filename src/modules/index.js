const fs = require('fs');
const path = require('path');
const instance = require('../instance');

// Each feature module lives in its own folder and exports { name, router, prefix? }; the router is
// mounted at `prefix` (default /api/<name>). Several modules may share a prefix (the UI calls /api/vciso/...).
// In a client build, scripts/build.js deletes the folders the client didn't buy
// and writes enabled.json; in dev every folder present is loaded.
function listModules() {
  const manifest = path.join(__dirname, 'enabled.json');
  if (fs.existsSync(manifest)) {
    return JSON.parse(fs.readFileSync(manifest, 'utf8')).modules;
  }
  return fs
    .readdirSync(__dirname, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function mountModules(app) {
  const mounted = [];
  for (const dir of listModules()) {
    const mod = require(path.join(__dirname, dir));
    // A module answers only if the linked instance's licence includes it (in dev every folder is loaded).
    app.use(mod.prefix || `/api/${mod.name}`, (req, res, next) =>
      instance.state.instance?.licensed_modules.includes(mod.name) ? mod.router(req, res, next) : next());
    mounted.push(mod.name);
  }
  return mounted;
}

module.exports = { mountModules };
