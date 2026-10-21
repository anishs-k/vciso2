// Runs a command, handing each line of its output to onLine as it arrives (for live build logs).
const { spawn } = require('child_process');

function run(cmd, args, { cwd, env, onLine = () => {}, stdout: keepStdout = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, windowsHide: true });
    let out = '';
    const lines = (stream, keep) => {
      let rest = '';
      stream.on('data', (d) => {
        const text = d.toString('utf8');
        if (keep) out += text;
        rest += text;
        const parts = rest.split(/\r?\n/);
        rest = parts.pop();
        parts.forEach((l) => onLine(l));
      });
      stream.on('end', () => rest && onLine(rest));
    };
    // With keepStdout, stdout is the command's result (e.g. JSON) and is not logged line by line.
    if (keepStdout) child.stdout.on('data', (d) => (out += d.toString('utf8')));
    else lines(child.stdout, false);
    lines(child.stderr, false);
    child.on('error', (err) => reject(new Error(`cannot run ${cmd}: ${err.message}`)));
    child.on('close', (code) => resolve({ code, stdout: out }));
  });
}

module.exports = { run };
