#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import YAML from 'yaml';
import { resolveChangeSet } from './lib/ci-changes.mjs';
import { checkSource } from './lib/content-source.mjs';

const article = file => /^content\/(en|zh)\/.+\.md$/.test(file) && !/\/(AGENTS|CLAUDE)\.md$/.test(file);
const contentPolicy = file => /^(?:config\/(?:tags-mapping|content-quality)\.json|scripts\/(?:ci-light|check-ai-flavor)\.mjs|scripts\/lib\/content-(?:source|markdown)\.mjs)$/.test(file);

export function selectContentScope(changeSet, repoRoot) {
  if (changeSet.baseSha === null || changeSet.files.some(file => contentPolicy(file.path))) {
    return changeSet.sourceFiles;
  }
  const selected = new Set(changeSet.files.filter(file => file.status !== 'D' && article(file.path)).map(file => file.path));
  for (const file of [...selected]) {
    const translation = file.replace(/^content\/(en|zh)\//, (_, lang) => `content/${lang === 'en' ? 'zh' : 'en'}/`);
    if (fs.existsSync(path.join(repoRoot, translation))) selected.add(translation);
  }
  return [...selected].sort();
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`${command} ${args[0]} failed (${result.status ?? result.error?.code})`);
}

export async function checkSources({ changeSet, repoRoot = process.cwd() }) {
  const tags = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config/tags-mapping.json'), 'utf8'));
  const scope = selectContentScope(changeSet, repoRoot);
  const diagnostics = [];
  for (const file of scope) {
    diagnostics.push(...await checkSource({ file, text: fs.readFileSync(path.join(repoRoot, file), 'utf8'), tags }));
  }
  const errors = diagnostics.filter(item => item.severity === 'error');
  for (const item of errors) console.error(`${item.file}:${item.line}: ${item.ruleId}: ${item.message}`);
  console.log(`Content: ${scope.length} files, ${errors.length} errors, ${diagnostics.length - errors.length} suggestions.`);
  if (errors.length) throw new Error('Content source checks failed');
  return scope;
}

async function main() {
  const repoRoot = process.cwd();
  const changeSet = await resolveChangeSet({
    repoRoot, eventPath: process.env.GITHUB_EVENT_PATH,
    headSha: process.env.GITHUB_SHA ?? spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(),
    eventName: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF,
  });
  await checkSources({ changeSet, repoRoot });
  const authoredChinese = changeSet.files.filter(file => ['A', 'M', 'R', 'C'].includes(file.status) && file.path.startsWith('content/zh/') && article(file.path)).map(file => file.path);
  if (authoredChinese.length) run(process.execPath, ['scripts/check-ai-flavor.mjs', ...authoredChinese, '--check']);
  for (const file of changeSet.files.filter(file => file.status !== 'D' && /\.(?:mjs|cjs|js)$/.test(file.path))) {
    run(process.execPath, ['--check', file.path]);
  }
  for (const name of fs.readdirSync('.github/workflows').filter(name => /\.ya?ml$/.test(name))) {
    const workflow = YAML.parse(fs.readFileSync(path.join('.github/workflows', name), 'utf8'));
    if (!workflow?.on || !workflow.jobs || !Object.keys(workflow.jobs).length) throw new Error(`Invalid workflow: ${name}`);
  }
  run('git', ['diff', '--check', ...(changeSet.baseSha ? [changeSet.baseSha, changeSet.sourceSha] : [])]);
  console.log('Source checks passed. Netlify handles the site build; full diagnostics are manual.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
