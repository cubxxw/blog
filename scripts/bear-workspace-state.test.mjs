import test from 'node:test';
import assert from 'node:assert/strict';

const model = await import('../assets/js/space/state.mjs').catch(() => ({}));
const screen = { width: 1440, height: 850 };
function workspace(saved) {
  assert.equal(typeof model.createWorkspace, 'function', 'workspace model must be available');
  return model.createWorkspace(saved, screen);
}
test('opening two applications retains both and gives the latest window focus', () => {
  let s = workspace();
  s = model.reduceWorkspace(s, { type: 'open', app: 'notes' }, screen);
  s = model.reduceWorkspace(s, { type: 'open', app: 'photos' }, screen);
  assert.deepEqual(s.windows.map(w => w.id), ['notes', 'photos']);
  assert.equal(s.active, 'photos');
});
test('a minimized application restores its original geometry without duplicating itself', () => {
  let s = model.reduceWorkspace(workspace(), { type: 'open', app: 'notes' }, screen);
  s = model.reduceWorkspace(s, { type: 'geometry', id: 'notes', rect: { x: 210, y: 120, width: 640, height: 440 } }, screen);
  s = model.reduceWorkspace(s, { type: 'minimize', id: 'notes' }, screen);
  assert.equal(s.windows[0].minimized, true);
  s = model.reduceWorkspace(s, { type: 'open', app: 'notes' }, screen);
  assert.equal(s.windows.length, 1);
  assert.equal(s.windows[0].minimized, false);
  assert.equal(s.windows[0].rect.x, 210);
});
test('a persisted window from a large screen stays reachable after resizing', () => {
  let s = model.reduceWorkspace(workspace(), { type: 'open', app: 'notes' }, screen);
  s = model.reduceWorkspace(s, { type: 'geometry', id: 'notes', rect: { x: 900, y: 420, width: 500, height: 360 } }, screen);
  const restored = model.createWorkspace(model.serializeWorkspace(s), { width: 820, height: 650 });
  const { x, y, width, height } = restored.windows[0].rect;
  assert.ok(x >= 0 && x + width <= 820);
  assert.ok(y >= 0 && y + height <= 550);
});
test('corrupt snapshots and unknown applications do not poison the workspace', () => {
  assert.deepEqual(workspace('{broken').windows, []);
  assert.deepEqual(workspace({ version: 99, windows: [{ app: 'notes' }] }).windows, []);
  assert.deepEqual(workspace({ version: 1, windows: [{ app: '<script>', id: 'x' }] }).windows, []);
});
test('local writing survives serialization and respects the storage size boundary', () => {
  let s = model.reduceWorkspace(workspace(), { type: 'note', text: '一条属于访客的笔记。' }, screen);
  assert.equal(workspace(model.serializeWorkspace(s)).note, '一条属于访客的笔记。');
  s = model.reduceWorkspace(s, { type: 'note', text: 'a'.repeat(60000) }, screen);
  assert.equal(s.note.length, 40000);
});
test('maximize and restore returns to the pre-maximize rectangle', () => {
  let s = model.reduceWorkspace(workspace(), { type: 'open', app: 'notes' }, screen);
  const rect = { ...s.windows[0].rect };
  s = model.reduceWorkspace(s, { type: 'maximize', id: 'notes' }, screen);
  assert.equal(s.windows[0].maximized, true);
  s = model.reduceWorkspace(s, { type: 'maximize', id: 'notes' }, screen);
  assert.deepEqual(s.windows[0].rect, rect);
});
test('closing the active window focuses the next visible window', () => {
  let s = model.reduceWorkspace(workspace(), { type: 'open', app: 'notes' }, screen);
  s = model.reduceWorkspace(s, { type: 'open', app: 'photos' }, screen);
  s = model.reduceWorkspace(s, { type: 'close', id: 'photos' }, screen);
  assert.equal(s.active, 'notes');
});
test('only safe site and HTTPS links can be opened', () => {
  assert.equal(typeof model.safeURL, 'function');
  assert.equal(model.safeURL('javascript:alert(1)', 'https://cubxxw.com'), null);
  assert.equal(model.safeURL('//evil.test', 'https://cubxxw.com'), null);
  assert.equal(model.safeURL('https://good.test/path', 'https://cubxxw.com'), 'https://good.test/path');
  assert.equal(model.safeURL('/zh/articles/', 'https://cubxxw.com'), 'https://cubxxw.com/zh/articles/');
});
test('reader links resolved to the local site retain their safe HTTP URLs', () => {
  assert.equal(model.safeURL('http://localhost:8889/images/photo.webp', 'http://localhost:8889'), 'http://localhost:8889/images/photo.webp');
  assert.equal(model.safeURL('http://untrusted.test/photo.webp', 'http://localhost:8889'), null);
});
