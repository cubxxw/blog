import test from 'node:test';
import assert from 'node:assert/strict';
import { bookkeepingOnly, shouldIgnoreBuild } from './netlify-ignore.mjs';

test('documentation, test, workflow and delivery-state changes skip the duplicate site build', () => {
  assert.equal(bookkeepingOnly(['docs/ci.md', 'README.md', '.github/workflows/main.yaml', 'scripts/ci-light.test.mjs', 'tools/ci/package-lock.json', 'config/newsletter-state.json', 'data/seo/gsc-2026-10-29.json']), true);
});
test('every site input and unknown path still builds, including mixed and rename diffs', () => {
  for (const file of ['content/zh/projects/example.md', 'assets/js/app.js', 'layouts/index.html', 'netlify/functions/chat.mjs', 'netlify.toml', 'package-lock.json', 'themes/PaperMod', 'scripts/site-build.mjs', 'config.yml', 'data/products.json', 'unknown']) {
    assert.equal(bookkeepingOnly(['docs/ci.md', file]), false, file);
  }
  assert.equal(bookkeepingOnly([]), false);
});
test('missing, invalid, unchanged and unavailable comparison history always builds', () => {
  const base = 'a'.repeat(40), head = 'b'.repeat(40);
  for (const args of [{}, { base: 'HEAD', head }, { base, head: base }, { base, head, git: () => { throw new Error('missing history'); } }]) {
    assert.equal(shouldIgnoreBuild(args), false);
  }
});
test('a complete ancestral diff considers both sides of renames and uses NUL separators', () => {
  const calls = [], base = 'a'.repeat(40), head = 'b'.repeat(40);
  assert.equal(shouldIgnoreBuild({ base, head, git: args => { calls.push(args); return calls.length === 1 ? '' : 'docs/with space.md\0.github/workflows/main.yaml\0'; } }), true);
  assert.deepEqual(calls[0], ['merge-base', '--is-ancestor', base, head]);
  assert.deepEqual(calls[1], ['diff', '--name-only', '--no-renames', '-z', base, head, '--']);
});
