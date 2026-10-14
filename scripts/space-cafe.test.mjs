import test from 'node:test';
import assert from 'node:assert/strict';
import { cafeTheme, cafeEntryMode, createSceneSelection } from '../assets/js/space/cafe.mjs';

test('only six known cafés can be restored from browser storage', () => {
  for (const id of ['zen', 'garden', 'coast', 'mountain', 'lake', 'rain']) assert.equal(cafeTheme(id), id);
  for (const value of [null, '', '__proto__', 'https://other.example/image', {}, '<script>']) assert.equal(cafeTheme(value), 'zen');
});
test('direct content routes take priority over a café visit', () => {
  assert.equal(cafeEntryMode({ route: { view: 'bear', app: 'reader' }, navigation: 'navigate' }), 'desktop');
  assert.equal(cafeEntryMode({ route: { view: 'lab' }, saved: 'cafe', localeResume: true }), 'desktop');
});
test('a fresh visit enters the café; reload and language changes resume the current place', () => {
  const route = { view: 'bear' };
  assert.equal(cafeEntryMode({ route, navigation: 'navigate', saved: 'desktop' }), 'cafe');
  assert.equal(cafeEntryMode({ route, navigation: 'reload', saved: 'desktop' }), 'desktop');
  assert.equal(cafeEntryMode({ route, navigation: 'navigate', saved: 'desktop', localeResume: true }), 'desktop');
  assert.equal(cafeEntryMode({ route, navigation: 'reload', saved: 'invalid' }), 'cafe');
});
test('returning to the café from an old About URL survives reload and language changes', () => {
  const route = { view: 'bear', app: 'welcome', payload: 'identity' };
  assert.equal(cafeEntryMode({ route, navigation: 'navigate', saved: 'cafe' }), 'desktop');
  assert.equal(cafeEntryMode({ route, navigation: 'reload', saved: 'cafe' }), 'cafe');
  assert.equal(cafeEntryMode({ route, navigation: 'navigate', saved: 'cafe', localeResume: true }), 'cafe');
});
test('a slow previous scene cannot overwrite the latest selection', async () => {
  const pending = new Map(), committed = [];
  const selection = createSceneSelection({ load: id => new Promise(resolve => pending.set(id, resolve)), commit: id => committed.push(id) });
  const older = selection.select('coast'), newer = selection.select('garden');
  pending.get('garden')(); await newer; pending.get('coast')(); await older;
  assert.deepEqual(committed, ['garden']);
});
test('a failed scene keeps the previous view; selecting the current scene cancels an older load', async () => {
  let resolve, committed = [];
  const selection = createSceneSelection({ load: id => id === 'rain' ? Promise.reject(new Error('offline')) : new Promise(done => resolve = done), commit: id => committed.push(id) });
  assert.equal(await selection.select('rain'), 'failed');
  const pending = selection.select('coast');
  selection.cancel(); resolve(); assert.equal(await pending, 'superseded');
  assert.deepEqual(committed, []);
});
