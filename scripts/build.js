// Produces dist/ for a client image:
//   1. copy src/ -> dist/
//   2. remove feature modules not in ENABLED_MODULES (comma-separated; empty = keep all)
//   3. obfuscate every .js file in dist/ (skip with OBFUSCATE=false)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const MODULES_DIR = path.join(DIST, 'modules');

const requested = (process.env.ENABLED_MODULES || '')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const obfuscate = process.env.OBFUSCATE !== 'false';

fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(SRC, DIST, { recursive: true });

const available = fs
  .readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

// A licence may include modules this code base has no folder for yet (they are sold before they are
// built). Those are left out with a warning rather than failing the client's build; the licence in the
// database still lists them, so they switch on in a later image that has them.
const missing = requested.filter((m) => !available.includes(m));
if (missing.length) {
  console.warn(`WARNING: licensed module(s) not in this build: ${missing.join(', ')}. Available: ${available.join(', ')}`);
}

const enabled = requested.length ? requested.filter((m) => available.includes(m)) : available;
for (const mod of available) {
  if (!enabled.includes(mod)) {
    // Physically removed so code the client didn't buy never ships in their image.
    fs.rmSync(path.join(MODULES_DIR, mod), { recursive: true, force: true });
  }
}
fs.writeFileSync(path.join(MODULES_DIR, 'enabled.json'), JSON.stringify({ modules: enabled }));
console.log(`Modules: ${enabled.join(', ')}`);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

if (obfuscate) {
  const JavaScriptObfuscator = require('javascript-obfuscator');
  const files = walk(DIST).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    const result = JavaScriptObfuscator.obfuscate(code, {
      target: 'node',
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.5,
      deadCodeInjection: false,
      identifierNamesGenerator: 'hexadecimal',
      // Keep globals/exports intact so require() between files still works.
      renameGlobals: false,
      selfDefending: false,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.75,
    });
    fs.writeFileSync(file, result.getObfuscatedCode());
  }
  console.log(`Obfuscated ${files.length} file(s)`);
} else {
  console.log('Obfuscation skipped (OBFUSCATE=false)');
}
