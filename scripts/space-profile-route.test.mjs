import test from 'node:test';
import assert from 'node:assert/strict';
import * as navigation from '../assets/js/space/navigation.mjs';

test('old About bookmarks open the matching profile section inside the desktop', () => {
  assert.equal(typeof navigation.resolveSpaceRoute, 'function');
  for (const [hash, payload] of [['#about', 'about'], ['#identity', 'identity'], ['#story', 'story'], ['#start-here', 'start-here']]) {
    assert.deepEqual(navigation.resolveSpaceRoute(hash, []), { view: 'bear', app: 'welcome', payload });
  }
  assert.deepEqual(navigation.resolveSpaceRoute('', [], 'about'), { view: 'bear', app: 'welcome', payload: 'about' });
});

test('product links and alternate views retain their destinations after the merge', () => {
  assert.equal(typeof navigation.resolveSpaceRoute, 'function');
  const products = [{ id: 'signal' }];
  assert.deepEqual(navigation.resolveSpaceRoute('#focus-signal', products), { view: 'bear', app: 'products', payload: 'signal' });
  assert.deepEqual(navigation.resolveSpaceRoute('#signal', products), { view: 'bear', app: 'products', payload: 'signal' });
  assert.deepEqual(navigation.resolveSpaceRoute('#product-lab', products), { view: 'lab' });
  assert.deepEqual(navigation.resolveSpaceRoute('#knowledge', products), { view: 'knowledge' });
  assert.deepEqual(navigation.resolveSpaceRoute('#unknown', products), { view: 'bear' });
  assert.deepEqual(navigation.resolveSpaceRoute('', products), { view: 'bear' });
});
