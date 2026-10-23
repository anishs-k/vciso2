// Calls into intake/client_intake.py, which stays the one place that knows the catalogues and the
// validation rules. Uses the project's .venv Python unless CTW_PYTHON says otherwise.
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const INTAKE_DIR = path.join(ROOT, 'intake');

function pythonPath() {
  if (process.env.CTW_PYTHON) return process.env.CTW_PYTHON;
  return process.platform === 'win32'
    ? path.join(ROOT, '.venv', 'Scripts', 'python.exe')
    : path.join(ROOT, '.venv', 'bin', 'python');
}

// Runs `body` with client_intake imported; `input` (JSON) arrives on stdin, the script prints JSON.
function runIntake(body, input) {
  const code = [
    'import json, sys',
    `sys.path.insert(0, ${JSON.stringify(INTAKE_DIR)})`,
    'import client_intake',
    body,
  ].join('\n');
  return new Promise((resolve, reject) => {
    const py = spawn(pythonPath(), ['-c', code], { env: { ...process.env, PYTHONUTF8: '1' } });
    let out = '';
    let err = '';
    py.stdout.on('data', (d) => (out += d));
    py.stderr.on('data', (d) => (err += d));
    py.on('error', (e) => reject(new Error(`cannot run ${pythonPath()}: ${e.message}`)));
    py.on('close', (status) => {
      if (status !== 0) return reject(new Error(`client_intake.py failed: ${err.trim() || `exit ${status}`}`));
      try {
        resolve(JSON.parse(out));
      } catch {
        reject(new Error(`client_intake.py printed something other than JSON: ${out.slice(0, 200)}`));
      }
    });
    py.stdin.end(input === undefined ? '' : JSON.stringify(input));
  });
}

const readCatalogue = () =>
  runIntake(
    'print(json.dumps({"frameworks": client_intake.FRAMEWORK_CATALOGUE, "modules": client_intake.AVAILABLE_MODULES}))',
  );

// [] when the spec is valid, else the validator's messages.
const validateSpec = (spec) =>
  runIntake('print(json.dumps(client_intake.validate_spec(json.load(sys.stdin))))', spec);

// The licence seal the bundle builder would give this spec (needs CTW_LICENSE_SECRET).
const sealOf = (spec) => runIntake('print(json.dumps(client_intake.spec_seal(json.load(sys.stdin))))', spec);

// Runs intake/questionnaire.py with `args`, `input` (JSON) on stdin; resolves with the JSON it prints.
function runQuestionnaire(args, input) {
  return new Promise((resolve, reject) => {
    const py = spawn(pythonPath(), [path.join(INTAKE_DIR, 'questionnaire.py'), ...args], { env: { ...process.env, PYTHONUTF8: '1' } });
    let out = '';
    let err = '';
    py.stdout.on('data', (d) => (out += d));
    py.stderr.on('data', (d) => (err += d));
    py.on('error', (e) => reject(new Error(`cannot run ${pythonPath()}: ${e.message}`)));
    py.on('close', (status) => {
      if (status !== 0) return reject(new Error(`questionnaire.py failed: ${err.trim() || `exit ${status}`}`));
      try {
        resolve(JSON.parse(out));
      } catch {
        reject(new Error(`questionnaire.py printed something other than JSON: ${out.slice(0, 200)}`));
      }
    });
    py.stdin.end(JSON.stringify(input));
  });
}

module.exports = { pythonPath, readCatalogue, validateSpec, sealOf, runQuestionnaire, ROOT };
