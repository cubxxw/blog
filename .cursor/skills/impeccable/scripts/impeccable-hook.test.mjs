import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const scripts = dirname(fileURLToPath(import.meta.url));
const engine = '#!/bin/sh\nif [ "$1" = engine-probe ]; then echo "impeccable-engine test"; else printf "engine:%s\\n" "$*"; fi\n';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'impeccable-hook-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const skillScripts = join(root, '.cursor/skills/impeccable/scripts');
  const path = join(root, 'path');
  const home = join(root, 'home');
  mkdirSync(skillScripts, { recursive: true });
  mkdirSync(path);
  mkdirSync(home);
  for (const name of ['impeccable', 'VERSION', 'engine-checksums.txt']) {
    copyFileSync(join(scripts, name), join(skillScripts, name));
  }
  for (const name of ['dirname', 'uname', 'tr', 'shasum', 'sha256sum', 'mkdir', 'chmod', 'rm', 'mv']) {
    const source = ['/usr/bin', '/bin'].map(dir => join(dir, name)).find(existsSync);
    if (source) symlinkSync(source, join(path, name));
  }
  const networkLog = join(root, 'network.log');
  for (const name of ['curl', 'wget']) {
    writeFileSync(join(path, name), '#!/bin/sh\nprintf "network attempted\\n" >> "$IMPECCABLE_TEST_NETWORK_LOG"\nexit 1\n', { mode: 0o755 });
  }
  const env = {
    HOME: home,
    PATH: path,
    IMPECCABLE_HOME: join(home, '.impeccable'),
    IMPECCABLE_TEST_NETWORK_LOG: networkLog,
  };
  const hookCommand = JSON.parse(readFileSync(join(scripts, '../../../hooks.json'), 'utf8')).hooks.postToolUse[0].command;
  const run = () => spawnSync('/bin/sh', ['-c', hookCommand], { cwd: root, env, encoding: 'utf8', timeout: 15000 });
  return { root, skillScripts, path, home, env, networkLog, run };
}

test('cold-install Write hook skips bootstrap without network or cache writes', t => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
  assert.equal(existsSync(f.networkLog), false, 'Write must not attempt a download');
  assert.equal(existsSync(f.env.IMPECCABLE_HOME), false, 'Write must not create an engine cache');
});

test('Write hook delegates to a configured engine with its hook argument', t => {
  const f = fixture(t);
  f.env.IMPECCABLE_BIN = join(f.root, 'configured-engine');
  writeFileSync(f.env.IMPECCABLE_BIN, engine, { mode: 0o755 });
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'engine:hook\n');
  assert.equal(existsSync(f.networkLog), false);
});

for (const source of ['home', 'PATH', 'cache']) {
  test(`Write hook delegates to a verified ${source} engine without network`, t => {
    const f = fixture(t);
    const version = readFileSync(join(f.skillScripts, 'VERSION'), 'utf8').trim();
    const binary = source === 'home' ? join(f.home, '.impeccable/bin/impeccable')
      : source === 'PATH' ? join(f.path, 'impeccable')
        : join(f.env.IMPECCABLE_HOME, 'bin', version, 'impeccable');
    mkdirSync(dirname(binary), { recursive: true });
    writeFileSync(binary, engine, { mode: 0o755 });
    if (source === 'cache') {
      const os = process.platform === 'darwin' ? 'darwin' : 'linux';
      const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
      const digest = createHash('sha256').update(engine).digest('hex');
      writeFileSync(join(f.skillScripts, 'engine-checksums.txt'), `${version} impeccable-${os}-${arch} ${digest}\n`);
    }
    const result = f.run();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'engine:hook\n');
    assert.equal(existsSync(f.networkLog), false);
  });
}

test('an unverified cache does not trigger a Write hook download', t => {
  const f = fixture(t);
  const version = readFileSync(join(f.skillScripts, 'VERSION'), 'utf8').trim();
  const binary = join(f.env.IMPECCABLE_HOME, 'bin', version, 'impeccable');
  mkdirSync(dirname(binary), { recursive: true });
  writeFileSync(binary, engine, { mode: 0o755 });
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(existsSync(f.networkLog), false);
  assert.equal(existsSync(`${binary}.verified`), false);
});

test('an explicit cold-install engine command still attempts verified bootstrap', t => {
  const f = fixture(t);
  const result = spawnSync('/bin/sh', [join(f.skillScripts, 'impeccable'), 'engine-probe'], {
    cwd: f.root, env: f.env, encoding: 'utf8', timeout: 15000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 127, 'the intercepted offline download must fail closed');
  assert.equal(existsSync(f.networkLog), true, 'explicit commands may bootstrap');
  assert.match(result.stderr, /could not download engine/);
  const version = readFileSync(join(f.skillScripts, 'VERSION'), 'utf8').trim();
  assert.equal(existsSync(join(f.env.IMPECCABLE_HOME, 'bin', version, 'impeccable')), false);
});
