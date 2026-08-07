#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(
  process.env.BLOG_REPO_ROOT ||
    fileURLToPath(new URL('..', import.meta.url)),
);
const BRIEFS_DIR = join(ROOT, '_briefs');
const OUTPUT_DIR = join(ROOT, '_output', 'brief-executors');

function argumentValue(args, flag) {
  const index = args.indexOf(flag);
  if (index < 0) return '';
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
  });
  if (result.error) throw result.error;
  return result;
}

function resolveBrief(input) {
  const file = resolve(ROOT, input);
  if (!file.startsWith(`${BRIEFS_DIR}${sep}`)) {
    throw new Error('brief must be inside _briefs/');
  }
  if (!existsSync(file)) throw new Error(`brief not found: ${input}`);
  return file;
}

function statusOf(file) {
  const match = readFileSync(file, 'utf8').match(
    /^status:\s*['"]?([^'"\n]+)['"]?\s*$/m,
  );
  return match?.[1]?.trim() ?? '';
}

function assertWorktreeScope(brief) {
  const status = run('git', ['status', '--porcelain', '--untracked-files=all']);
  if (status.status !== 0) {
    throw new Error(status.stderr || 'unable to inspect git worktree');
  }
  const allowed = relative(ROOT, brief);
  const unrelated = status.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, ''))
    .filter((path) => path !== allowed);
  if (unrelated.length > 0) {
    throw new Error(
      `blog worktree has unrelated changes: ${unrelated.join(', ')}`,
    );
  }
}

function assertRemoteCurrent() {
  const upstream = run('git', [
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    '@{upstream}',
  ]);
  if (upstream.status !== 0) return;

  const remote = upstream.stdout.trim().split('/')[0];
  const fetch = run('git', ['fetch', '--quiet', remote]);
  if (fetch.status !== 0) {
    throw new Error(fetch.stderr || `unable to fetch ${remote}`);
  }

  const counts = run('git', [
    'rev-list',
    '--left-right',
    '--count',
    `HEAD...${upstream.stdout.trim()}`,
  ]);
  if (counts.status !== 0) {
    throw new Error(counts.stderr || 'unable to compare upstream branch');
  }
  const [, behindText] = counts.stdout.trim().split(/\s+/);
  const behind = Number(behindText || 0);
  if (behind > 0) {
    throw new Error(
      `current branch is ${behind} commit(s) behind ${upstream.stdout.trim()}; update before dispatch`,
    );
  }
}

function executorPrompt(brief) {
  const path = relative(ROOT, brief);
  return `你是一个全新的 blog executor，只在当前 blog 仓库内工作。

目标：把指定任务卡 ${path} 执行到 ready-to-publish，或在材料不足时明确 blocked。

边界：
- 不得访问 brain 仓库、brain:// 引用目标或任何上游私有文件；只使用任务卡“已批准素材包”。
- 不继承或猜测上游对话。任务卡是唯一编辑契约。
- 先读取 CLAUDE.md、_briefs/README.md、docs/blog-editorial-workflow.md、.claude/skills/write-blog-from-brief/SKILL.md，并严格执行。
- 若目标 brief 的 id 含 agent-system-design，必须继续读取并执行 .claude/skills/research-agent-system-case-study/SKILL.md 与 .claude/skills/excalidraw-architecture/SKILL.md；必须启动该 skill 规定的三类只读研究 subagent，由当前 executor 保持唯一写入权。
- 这是定向 dispatch：目标 brief 已由调度器认领。不要运行 briefs:next，不要切换到其他 brief。
- 若当前仍在 main，先创建并切换到 codex/brief-${basename(brief, '.md')} 分支，再开始内容修改。
- 保留无关改动；不 commit、不 push、不合并、不部署、不标记 published。
- 公开研究、博客原生写作、独立审读、SEO/GEO、封面与验证都归当前仓库负责。
- 若被作者确认、证据或隐私边界阻塞，把目标 brief 标记为 blocked，并写清解除条件。
- 所有质量门通过后，把目标 brief 标记为 ready-to-publish，填写执行回执并停止。`;
}

function main() {
  const args = process.argv.slice(2);
  const briefInput = argumentValue(args, '--brief');
  if (!briefInput) throw new Error('usage: --brief _briefs/<file>.md [--dry-run]');

  const brief = resolveBrief(briefInput);
  const relativeBrief = relative(ROOT, brief);
  const dryRun = args.includes('--dry-run');
  const codexBin = argumentValue(args, '--codex-bin') || 'codex';

  const validation = run('node', [
    'scripts/brief-queue.mjs',
    '--check',
    '--file',
    relativeBrief,
  ]);
  if (validation.status !== 0) {
    process.stderr.write(validation.stderr);
    process.stdout.write(validation.stdout);
    process.exit(validation.status || 1);
  }

  const prompt = executorPrompt(brief);

  if (dryRun) {
    console.log(validation.stdout.trim());
    console.log(`Dry run: clean executor would process ${relativeBrief}`);
    console.log('\n--- executor prompt ---\n');
    console.log(prompt);
    process.exit(0);
  }

  assertWorktreeScope(brief);
  assertRemoteCurrent();

  const claim = run('node', [
    'scripts/brief-queue.mjs',
    '--claim',
    relativeBrief,
  ]);
  if (claim.status !== 0) {
    process.stderr.write(claim.stderr);
    process.stdout.write(claim.stdout);
    process.exit(claim.status || 1);
  }
  console.log(claim.stdout.trim());

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const id = basename(brief, '.md');
  const lastMessage = join(OUTPUT_DIR, `${id}.md`);
  const result = run(
    codexBin,
    [
      'exec',
      '--ephemeral',
      '--cd',
      ROOT,
      '--sandbox',
      'workspace-write',
      '--output-last-message',
      lastMessage,
      prompt,
    ],
    { stdio: 'inherit' },
  );

  if (result.status !== 0) {
    if (statusOf(brief) === 'claimed') {
      const release = run('node', [
        'scripts/brief-queue.mjs',
        '--release',
        relativeBrief,
      ]);
      if (release.status === 0) {
        console.error('Executor failed before work began; claim released.');
      }
    }
    process.exit(result.status || 1);
  }

  console.log(`Executor finished. Last message: ${relative(ROOT, lastMessage)}`);
}

try {
  main();
} catch (error) {
  console.error(`ERROR ${error.message}`);
  process.exit(1);
}
