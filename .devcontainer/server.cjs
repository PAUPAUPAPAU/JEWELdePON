// Linux lifecycle helper for the Codespaces preview; game runtime stays unchanged.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { randomUUID, createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const key = createHash('sha256').update(root).digest('hex').slice(0, 12);
const stateFile = `/tmp/jewel-de-pon-${key}.json`;
const lockFile = `${stateFile}.lock`;
const logFile = `/tmp/jewel-de-pon-${key}.log`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function health() {
  try {
    const response = await fetch('http://127.0.0.1:8080/health', {
      signal: AbortSignal.timeout(1500), redirect: 'error'
    });
    const body = await response.json();
    return response.ok && body.ok === true && body.service === 'jewel-de-pon';
  } catch { return false; }
}

function owned(state) {
  if (!state || !Number.isInteger(state.pid) || state.pid < 2) return false;
  try {
    // A token in the process environment prevents killing a reused/stale PID.
    return fs.readFileSync(`/proc/${state.pid}/environ`, 'utf8')
      .split('\0').includes(`JDP_PREVIEW_TOKEN=${state.token}`);
  } catch { return false; }
}

function readState() {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function stop(state) {
  if (owned(state)) {
    process.kill(-state.pid, 'SIGTERM');
    for (let i = 0; i < 50 && owned(state); i++) await sleep(100);
    if (owned(state)) process.kill(-state.pid, 'SIGKILL');
  }
  fs.rmSync(stateFile, { force: true });
}

async function start(state) {
  if (owned(state)) {
    if (await health()) { console.log('Preview already running on port 8080.'); return; }
    throw new Error('Managed preview is unhealthy. Run the restart command.');
  }
  // Fail even when a different application returns a successful /health response.
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', () => reject(new Error('Port 8080 is occupied. Stop its owner before starting the preview.')));
    probe.listen(8080, '0.0.0.0', () => probe.close(resolve));
  });
  const token = randomUUID();
  const fd = fs.openSync(logFile, 'a', 0o600);
  fs.writeSync(fd, `\nPreview start ${new Date().toISOString()}\n`);
  const child = spawn('npm', ['start'], {
    cwd: root, detached: true, stdio: ['ignore', fd, fd],
    env: { ...process.env, PORT: '8080', HOST: '0.0.0.0', JDP_PREVIEW_TOKEN: token }
  });
  fs.closeSync(fd);
  await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
  child.unref();
  state = { pid: child.pid, token };
  fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (!owned(state)) break;
    if (await health() && owned(state)) {
      console.log(`Preview ready on port 8080. Log: ${logFile}`);
      return;
    }
    await sleep(250);
  }
  await stop(state);
  console.error(fs.readFileSync(logFile, 'utf8').slice(-8000));
  throw new Error(`Preview failed to become healthy. Log: ${logFile}`);
}

async function main() {
  if (process.platform !== 'linux') throw new Error('Run this helper inside the Linux development container.');
  const command = process.argv[2] || 'start';
  if (!['start', 'stop', 'restart', 'status'].includes(command)) throw new Error('Usage: node .devcontainer/server.cjs start|stop|restart|status');
  // Kernel-owned lock: concurrent starts cannot launch two servers, and crashes
  // release the lock automatically. The image includes util-linux/flock.
  if (process.env.JDP_PREVIEW_LOCK !== key) {
    const lock = spawn('flock', ['-o', '-w', '30', lockFile, process.execPath, __filename, command], {
      stdio: 'inherit', env: { ...process.env, JDP_PREVIEW_LOCK: key }
    });
    lock.once('error', error => { console.error(error.message); process.exitCode = 1; });
    lock.once('exit', code => { process.exitCode = code === 0 ? 0 : 1; });
    return;
  }
  const state = readState();
  if (command === 'status') {
    const ready = owned(state) && await health();
    console.log(`${ready ? 'Ready' : 'Not ready'}. Log: ${logFile}`);
    process.exitCode = ready ? 0 : 1;
    return;
  }
  if (command === 'stop' || command === 'restart') await stop(state);
  if (command !== 'stop') await start(command === 'restart' ? null : state);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
