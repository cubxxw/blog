import assert from 'node:assert/strict';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const DISPATCH = fileURLToPath(
  new URL('./dispatch-blog-executor.mjs', import.meta.url),
);
const QUEUE = fileURLToPath(new URL('./brief-queue.mjs', import.meta.url));

function brief() {
  return `---
schema: blog-brief/v1
id: 2026-08-01-test-dispatch
title: 测试自动下发
status: ready
priority: normal
language: zh
section: growth
brief_type: thinking
dispatched_at: 2026-08-01T12:00:00+08:00
source_refs:
  - brain://topics/test-dispatch.md
---

## 唯一命题

一个明确判断。

## 为什么值得由我写

一条作者经验。

## 目标读者与阅读场景

正在做决策的读者。

## 已批准素材包

- 一条已批准事实。

## 证据与隐私边界

- 可以公开：上述事实。
- 必须匿名：无。
- 禁止使用：私密原文。
- 发布前仍需作者确认：无。

## 验收标准

- [ ] 只推进唯一命题。
`;
}

function setup(fakeExit = 0) {
  const root = mkdtempSync(join(tmpdir(), 'brief-dispatch-'));
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, '_briefs'));
  mkdirSync(join(root, 'content'));
  copyFileSync(QUEUE, join(root, 'scripts', 'brief-queue.mjs'));
  copyFileSync(DISPATCH, join(root, 'scripts', 'dispatch-blog-executor.mjs'));

  const fakeCodex = join(root, 'fake-codex.mjs');
  writeFileSync(
    fakeCodex,
    `#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
writeFileSync(process.env.FAKE_CODEX_LOG, JSON.stringify(process.argv.slice(2)));
process.exit(${fakeExit});
`,
  );
  chmodSync(fakeCodex, 0o755);

  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
  execFileSync('git', ['add', 'scripts', 'fake-codex.mjs'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'test fixture'], { cwd: root });

  const briefPath = join(root, '_briefs', '2026-08-01-test-dispatch.md');
  writeFileSync(briefPath, brief());

  return {
    root,
    briefPath,
    fakeCodex,
    log: join(tmpdir(), `fake-codex-${process.pid}-${Math.random()}.json`),
  };
}

test('dispatch validates, claims, and starts an ephemeral executor', () => {
  const fixture = setup();
  const env = {
    ...process.env,
    BLOG_REPO_ROOT: fixture.root,
    FAKE_CODEX_LOG: fixture.log,
  };
  execFileSync(
    process.execPath,
    [
      DISPATCH,
      '--brief',
      '_briefs/2026-08-01-test-dispatch.md',
      '--codex-bin',
      fixture.fakeCodex,
    ],
    { env, encoding: 'utf8' },
  );

  assert.match(readFileSync(fixture.briefPath, 'utf8'), /status: claimed/);
  const args = JSON.parse(readFileSync(fixture.log, 'utf8'));
  assert.deepEqual(args.slice(0, 2), ['exec', '--ephemeral']);
  assert.ok(args.includes('--sandbox'));
});

test('dispatch releases an untouched claim when executor startup fails', () => {
  const fixture = setup(2);
  const env = {
    ...process.env,
    BLOG_REPO_ROOT: fixture.root,
    FAKE_CODEX_LOG: fixture.log,
  };
  const result = spawnSync(
    process.execPath,
    [
      DISPATCH,
      '--brief',
      '_briefs/2026-08-01-test-dispatch.md',
      '--codex-bin',
      fixture.fakeCodex,
    ],
    { env, encoding: 'utf8' },
  );

  assert.equal(result.status, 2);
  assert.match(readFileSync(fixture.briefPath, 'utf8'), /status: ready/);
  assert.match(result.stderr, /claim released/);
});
