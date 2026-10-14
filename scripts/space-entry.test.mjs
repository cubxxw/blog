import test from 'node:test';
import assert from 'node:assert/strict';
import { languageDestination, canAnimateEntry } from '../assets/js/space/entry.mjs';

test('language changes keep the current profile route and query on this site', () => {
  const routes = { zh: '/zh/projects/', en: '/en/projects/' };
  assert.equal(languageDestination('en', routes, 'https://example.test/zh/projects/?profile=about#story'), 'https://example.test/en/projects/?profile=about#story');
  assert.equal(languageDestination('en', { en:'/projects/' }, 'https://example.test/zh/projects/#identity'), 'https://example.test/projects/#identity');
  for (const bad of ['https://other.test/en/projects/', '//other.test/en/projects/', '/en/articles/', '/en/projects/?inject=1']) {
    assert.equal(languageDestination('en', { en: bad }, 'https://example.test/zh/projects/'), null);
  }
  assert.equal(languageDestination('fr', routes, 'https://example.test/zh/projects/'), null);
});

test('language selection respects a backup deployment prefix without allowing a different root', () => {
  const routes = { zh:'/blog/zh/projects/', en:'/blog/projects/' };
  assert.equal(languageDestination('en', routes, 'https://example.test/blog/zh/projects/?profile=about#story'), 'https://example.test/blog/projects/?profile=about#story');
  assert.equal(languageDestination('zh', routes, 'https://example.test/blog/projects/'), 'https://example.test/blog/zh/projects/');
  assert.equal(languageDestination('en', { en:'/projects/' }, 'https://example.test/blog/zh/projects/'), null);
  assert.equal(languageDestination('en', { en:'/blog/../projects/' }, 'https://example.test/blog/zh/projects/'), null);
});

test('the optional 3D entrance costs nothing for motion, bandwidth and mobile opt-outs', () => {
  const eligible = { reducedMotion: false, coarsePointer: false, saveData: false, width: 1280, visible: true };
  assert.equal(canAnimateEntry(eligible), true);
  for (const change of [{ reducedMotion: true }, { coarsePointer: true }, { saveData: true }, { width: 640 }, { visible: false }]) {
    assert.equal(canAnimateEntry({ ...eligible, ...change }), false);
  }
});
