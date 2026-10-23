import test from 'node:test';
import assert from 'node:assert/strict';
import { APPS } from '../assets/js/space/state.mjs';
import { MOBILE_APPS, findApplications, searchWorkspace, resultIndex, isEditableTarget, escapeAction } from '../assets/js/space/navigation.mjs';

const labels = { welcome: '关于我', reader: '文章与思考', products: '产品实验室', photos: '旅途相册', map: '去过的地方', books: '我的书架', notes: '你的笔记', contact: '联系与留言', terminal: '终端', agent: '和 BEAR 聊聊', settings: '工作区设置' };

test('the five mobile destinations are registered and the full launcher exposes every application', () => {
  assert.deepEqual(MOBILE_APPS, ['welcome', 'reader', 'products', 'agent', 'settings']);
  assert.ok(MOBILE_APPS.every(app => APPS.includes(app)));
  assert.equal(APPS.length, 12);
  assert.deepEqual(findApplications(APPS, labels), APPS);
  for (const app of ['notes', 'books', 'contact', 'settings', 'terminal']) {
    assert.deepEqual(findApplications(APPS, labels, app), [app]);
  }
});

test('application search matches Chinese labels and normalizes wide Latin characters', () => {
  assert.deepEqual(findApplications(APPS, labels, '笔记'), ['notes']);
  assert.deepEqual(findApplications(APPS, labels, '  ＡＧＥＮＴ  '), ['agent']);
  assert.deepEqual(findApplications(APPS, labels, 'bear 聊聊'), ['agent']);
  assert.deepEqual(findApplications(APPS, labels, 'missing application'), []);
});

test('workspace search preserves app document context and identifies explicit product and article navigation', () => {
  const catalog = { labels, products: [{ id: 'signal', name: 'Talent Signal', description: 'Agent hiring', stage: 'Building' }], articles: [{ title: 'Agent architecture', description: 'Practical design', tags: ['AI'], url: '/zh/agent/', date: '2026.10.13' }] };
  const note = searchWorkspace(catalog, APPS, 'notes')[0];
  assert.equal(note.app, 'notes');
  assert.equal(note.payload, undefined, 'app search must restore its last document rather than clear it');
  assert.equal(searchWorkspace(catalog, APPS, 'talent signal')[0].payload, 'signal');
  assert.equal(searchWorkspace(catalog, APPS, 'agent AI')[0].payload, '/zh/agent/');
  assert.ok(!searchWorkspace(catalog, APPS, '').some(item => item.kind === 'article'));
  assert.deepEqual(searchWorkspace(catalog, APPS, 'absent text'), []);
});

test('sparse catalogs and empty keyboard result lists stay navigable', () => {
  assert.deepEqual(searchWorkspace({}, APPS, 'unknown'), []);
  assert.equal(resultIndex(0, 1, 0), -1);
  assert.equal(resultIndex(-1, 1, 3), 0);
  assert.equal(resultIndex(0, -1, 3), 0);
  assert.equal(resultIndex(2, 1, 3), 2);
  assert.equal(resultIndex(1, 4, 11), 5);
});

test('Escape dismisses the active overlay before considering a window', () => {
  const active = { hasActive: true, editing: false };
  assert.equal(escapeAction({ ...active, searchOpen: true, menuOpen: true }), 'search');
  assert.equal(escapeAction({ ...active, launchpadOpen: true, editing: true }), 'launchpad');
  assert.equal(escapeAction({ ...active, overviewOpen: true }), 'overview');
  assert.equal(escapeAction({ ...active, menuOpen: true }), 'menu');
  assert.equal(escapeAction(active), 'minimize');
  assert.equal(escapeAction({ ...active, editing: true }), null);
  assert.equal(escapeAction({ hasActive: false }), null);
});

test('text editing and contenteditable suppress destructive window shortcuts', () => {
  assert.equal(isEditableTarget({ isContentEditable: true }), true);
  assert.equal(isEditableTarget({ closest: selector => selector.includes('textarea') ? {} : null }), true);
  assert.equal(isEditableTarget({ closest: () => null, isContentEditable: false }), false);
  assert.equal(isEditableTarget(null), false);
});
