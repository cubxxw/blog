import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { selectContentScope, checkSources } from './ci-light.mjs';

const zh = 'content/zh/engineering/posts/example.md';
const en = zh.replace('/zh/', '/en/');
const changes = files => ({ baseSha: 'a'.repeat(40), fullScan: true, sourceFiles: [en, zh], files: files.map(([status, path]) => ({ status, path })) });

test('shared frontend changes do not fan out into a content or browser scan', () => {
  assert.deepEqual(selectContentScope(changes([['M', 'assets/css/extended/custom.css']]), '.'), []);
});
test('content edits check the current article and its existing translation, excluding deletions', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-ci-scope-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.dirname(path.join(root, en)), { recursive: true });
  fs.writeFileSync(path.join(root, en), 'translation');
  assert.deepEqual(selectContentScope(changes([['M', zh], ['D', 'content/zh/old.md']]), root), [en, zh]);
});
test('missing history and content policy changes retain a complete source scan', () => {
  const changeSet = changes([['M', 'config/tags-mapping.json']]);
  assert.deepEqual(selectContentScope(changeSet, '.'), [en, zh]);
  assert.deepEqual(selectContentScope({ ...changeSet, baseSha: null, files: [] }, '.'), [en, zh]);
});
test('malformed changed content fails the source gate', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-ci-content-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'config'));
  fs.writeFileSync(path.join(root, 'config/tags-mapping.json'), '{}');
  fs.mkdirSync(path.dirname(path.join(root, zh)), { recursive: true });
  fs.writeFileSync(path.join(root, zh), '---\ntitle: [broken\n---\n');
  await assert.rejects(checkSources({ changeSet: changes([['M', zh]]), repoRoot: root }), /Content source checks failed/);
});
test('automatic quality is a single bounded source job; broad diagnostics require dispatch', () => {
  const main = YAML.parse(fs.readFileSync('.github/workflows/main.yaml', 'utf8'));
  assert.deepEqual(Object.keys(main.jobs), ['verify']);
  assert.equal(main.jobs.verify.name, 'Required blog quality');
  assert.equal(main.jobs.verify['timeout-minutes'], 5);
  assert.equal(main.concurrency['cancel-in-progress'], true);
  const commands = main.jobs.verify.steps.map(step => step.run ?? '').join('\n');
  assert.match(commands, /npm ci --prefix tools\/ci/);
  assert.match(commands, /node scripts\/ci-light.mjs/);
  assert.doesNotMatch(commands, /playwright|ci-run\.mjs|npm (?:run (?:bear|ux|voice):test|test)|site-build|hugo/);
  for (const name of ['full-checks.yml', 'lighthouse.yml', 'search-preview.yml', 'content-audit.yml', 'seo-analyze.yml', 'seo-autofix.yml', 'release-followups.yml']) {
    const workflow = YAML.parse(fs.readFileSync(`.github/workflows/${name}`, 'utf8'));
    assert.equal(workflow.on.push, undefined, name);
    assert.equal(workflow.on.pull_request, undefined, name);
    assert.equal(workflow.on.schedule, undefined, name);
    assert.ok(workflow.on.workflow_dispatch !== undefined, name);
  }
  const full = YAML.parse(fs.readFileSync('.github/workflows/full-checks.yml', 'utf8'));
  assert.equal(full.jobs.release, undefined);
  assert.equal(full.jobs.followups, undefined);
});
test('the small CI dependency versions match the main tools and exclude browser/build tooling', () => {
  const root = JSON.parse(fs.readFileSync('package.json'));
  const light = JSON.parse(fs.readFileSync('tools/ci/package.json'));
  assert.equal(Object.keys(light.dependencies).length, 4);
  for (const [name, version] of Object.entries(light.dependencies)) assert.equal(version, root.devDependencies[name]);
});
