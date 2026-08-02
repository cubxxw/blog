import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('./brief-queue.mjs', import.meta.url));

function fixture(status = 'ready') {
  return `---
schema: blog-brief/v1
id: 2026-08-01-test-brief
title: 测试任务
status: ${status}
priority: normal
language: zh
section: growth
brief_type: thinking
dispatched_at: 2026-08-01T12:00:00+08:00
source_refs:
  - brain://topics/test-brief.md
---

## 唯一命题

一个明确判断。

## 为什么值得由我写

一条作者一手经验。

## 目标读者与阅读场景

正在做决策的读者。

## 已批准素材包

### 事实与项目证据

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

function setup() {
  const root = mkdtempSync(join(tmpdir(), 'brief-queue-'));
  const briefs = join(root, '_briefs');
  const content = join(root, 'content');
  mkdirSync(briefs);
  mkdirSync(content);
  return {
    briefs,
    content,
    env: {
      ...process.env,
      BLOG_BRIEFS_DIR: briefs,
      BLOG_CONTENT_DIR: content,
    },
  };
}

test('strict validation accepts a complete v1 brief', () => {
  const { briefs, env } = setup();
  writeFileSync(join(briefs, '2026-08-01-test-brief.md'), fixture());
  const output = execFileSync(
    process.execPath,
    [SCRIPT, '--check'],
    { encoding: 'utf8', env },
  );
  assert.match(output, /0 error/);
});

test('strict validation accepts a field-note brief', () => {
  const { briefs, env } = setup();
  writeFileSync(
    join(briefs, '2026-08-01-test-brief.md'),
    fixture().replace('brief_type: thinking', 'brief_type: field-note'),
  );
  const output = execFileSync(
    process.execPath,
    [SCRIPT, '--check'],
    { encoding: 'utf8', env },
  );
  assert.match(output, /0 error/);
});

test('legacy ready briefs fail instead of entering the queue', () => {
  const { briefs, env } = setup();
  writeFileSync(
    join(briefs, '2026-08-01-test-brief.md'),
    '---\ntitle: Legacy\nstatus: ready\n---\n',
  );
  const result = spawnSync(process.execPath, [SCRIPT, '--check'], {
    encoding: 'utf8',
    env,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /expected blog-brief\/v1/);
});

test('claim and release perform guarded state transitions', () => {
  const { briefs, env } = setup();
  const file = join(briefs, '2026-08-01-test-brief.md');
  writeFileSync(file, fixture());
  execFileSync(
    process.execPath,
    [SCRIPT, '--claim', file],
    { encoding: 'utf8', env },
  );
  let text = execFileSync('sed', ['-n', '1,12p', file], { encoding: 'utf8' });
  assert.match(text, /status: claimed/);

  execFileSync(
    process.execPath,
    [SCRIPT, '--release', file],
    { encoding: 'utf8', env },
  );
  text = execFileSync('sed', ['-n', '1,12p', file], { encoding: 'utf8' });
  assert.match(text, /status: ready/);
});

test('ready brief is rejected when an article with the same slug exists', () => {
  const { briefs, content, env } = setup();
  writeFileSync(join(briefs, '2026-08-01-test-brief.md'), fixture());
  mkdirSync(join(content, 'zh', 'growth', 'posts'), { recursive: true });
  writeFileSync(join(content, 'zh', 'growth', 'posts', 'test-brief.md'), '---\n---\n');

  const result = spawnSync(process.execPath, [SCRIPT, '--check'], {
    encoding: 'utf8',
    env,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /possible duplicate article/);
});

test('ready-to-publish brief accepts the article recorded in its receipt', () => {
  const { briefs, content, env } = setup();
  const file = join(briefs, '2026-08-01-test-brief.md');
  writeFileSync(
    file,
    `${fixture('ready-to-publish')}

## 执行回执

- article: content/zh/growth/posts/test-brief.md
`,
  );
  mkdirSync(join(content, 'zh', 'growth', 'posts'), { recursive: true });
  writeFileSync(join(content, 'zh', 'growth', 'posts', 'test-brief.md'), '---\n---\n');

  const output = execFileSync(
    process.execPath,
    [SCRIPT, '--check'],
    { encoding: 'utf8', env },
  );
  assert.match(output, /0 error/);
});
