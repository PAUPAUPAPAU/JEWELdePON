const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');

test('Codespaces preview lifecycle and failures', { skip: process.platform !== 'linux', timeout: 90000 }, async t => {
  // Refuse to disturb a developer's existing preview.
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(8080, '0.0.0.0', resolve);
  });
  await new Promise(resolve => probe.close(resolve));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jdp-lifecycle-'));
  fs.mkdirSync(path.join(root, '.devcontainer'));
  const helper = path.join(root, '.devcontainer/server.cjs');
  fs.copyFileSync(path.join(__dirname, '../.devcontainer/server.cjs'), helper);
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { start: 'node app.cjs' } }));
  const app = path.join(root, 'app.cjs');
  const key = createHash('sha256').update(root).digest('hex').slice(0, 12);
  const state = `/tmp/jewel-de-pon-${key}.json`;
  function run(command) {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [helper, command], { cwd: root });
      let output = '';
      child.stdout.on('data', b => { output += b; });
      child.stderr.on('data', b => { output += b; });
      child.once('error', reject);
      child.once('exit', code => resolve({ code, output }));
    });
  }
  function healthy() {
    fs.writeFileSync(app, "require('http').createServer((q,s)=>{s.setHeader('content-type','application/json');s.end(JSON.stringify({ok:true,service:'jewel-de-pon',pid:process.pid}));}).listen(Number(process.env.PORT),process.env.HOST);");
  }
  t.after(async () => {
    await run('stop');
    fs.rmSync(root, { recursive: true, force: true });
    for (const suffix of ['.json', '.json.lock', '.log']) fs.rmSync(`/tmp/jewel-de-pon-${key}${suffix}`, { force: true });
  });
  healthy();
  const starts = await Promise.all([run('start'), run('start')]);
  starts.forEach(r => assert.equal(r.code, 0, r.output));
  const first = JSON.parse(fs.readFileSync(state));
  assert.equal((await run('status')).code, 0);
  assert.equal((await run('start')).code, 0);
  assert.equal(JSON.parse(fs.readFileSync(state)).pid, first.pid);
  let result = await run('restart');
  assert.equal(result.code, 0, result.output);
  assert.notEqual(JSON.parse(fs.readFileSync(state)).pid, first.pid);
  assert.equal((await run('stop')).code, 0);
  assert.equal((await run('status')).code, 1);
  // Even a different app claiming the same health identity must not be adopted.
  const other = require('node:http').createServer((q,s) => s.end('{"ok":true,"service":"jewel-de-pon"}'));
  await new Promise(resolve => other.listen(8080, '0.0.0.0', resolve));
  try {
    result = await run('start');
    assert.equal(result.code, 1);
    assert.match(result.output, /occupied/);
    assert.equal((await run('stop')).code, 0);
    assert.equal(other.listening, true);
  } finally { await new Promise(resolve => other.close(resolve)); }
  fs.writeFileSync(app, "throw new Error('fixture startup failure');");
  result = await run('start');
  assert.equal(result.code, 1);
  assert.match(result.output, /fixture startup failure/);
  // Health responses must be bounded even if a server accepts but never replies.
  fs.writeFileSync(app, "require('http').createServer(()=>{}).listen(8080,'0.0.0.0');");
  result = await run('start');
  assert.equal(result.code, 1);
  assert.match(result.output, /failed to become healthy/);
  // A stale PID must never kill an unrelated process.
  fs.writeFileSync(state, JSON.stringify({ pid: process.pid, token: 'not-our-token' }));
  assert.equal((await run('stop')).code, 0);
});
