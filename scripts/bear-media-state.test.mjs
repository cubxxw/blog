import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAND_PATH, projectCoordinate, fitMap, zoomMap, panMap, photoState, stepPhoto, visiblePhotos } from '../assets/js/space/media-state.mjs';
const photos = [{ id: 'kumano', region: 'japan' }, { id: 'fuji', region: 'japan' }, { id: 'vangvieng', region: 'southeast-asia' }, { id: 'public-unassigned', region: null }];
const places = [{ lon: 91.14, lat: 29.65 }, { lon: 138.73, lat: 35.36 }, { lon: 102.45, lat: 18.92 }];
test('photo selection keeps exact object ID across region and detail transitions', () => {
  const filtered = photoState(photos, 'region:japan');
  const detail = photoState(photos, 'fuji', filtered);
  assert.deepEqual(detail, { region: 'japan', selectedID: 'fuji' });
  assert.equal(stepPhoto(photos, detail, 1).selectedID, 'kumano');
  assert.equal(stepPhoto(photos, detail, -1).selectedID, 'kumano');
  assert.deepEqual(photoState(photos, 'region:japan', detail), filtered);
  assert.deepEqual(photoState(photos, 'vangvieng', detail), { region: 'southeast-asia', selectedID: 'vangvieng' });
});
test('unassigned photos are shown only in all, without invented region coordinates', () => {
  assert.equal(visiblePhotos(photos, 'all').length, 4); assert.equal(visiblePhotos(photos, 'japan').length, 2);
  assert.deepEqual(photoState(photos, 'public-unassigned', { region: 'japan' }), { region: 'all', selectedID: 'public-unassigned' });
});
test('projection is geographic and rejects invalid coordinates', () => {
  assert.deepEqual(projectCoordinate(0, 0), { x: 360, y: 180 });
  assert.deepEqual(projectCoordinate(180, 90), { x: 720, y: 0 });
  assert.equal(projectCoordinate(181, 20), null); assert.equal(projectCoordinate(20, NaN), null);
  assert.ok(LAND_PATH.length > 30000); assert.ok(/^M/.test(LAND_PATH)); assert.ok(!/[<>]/.test(LAND_PATH));
});
test('fit contains all real travel region centers', () => {
  const view = fitMap(places);
  for (const p of places.map(p => projectCoordinate(p.lon, p.lat))) { assert.ok(p.x >= view.x && p.x <= view.x + view.width); assert.ok(p.y >= view.y && p.y <= view.y + view.height); }
  assert.equal(view.width / view.height, 2);
});
test('zoom preserves cursor position unless bounded at map edges', () => {
  const view = { x: 300, y: 90, width: 220, height: 110 }, anchor = { x: 355, y: 145 }, zoomed = zoomMap(view, 2, anchor);
  assert.equal(zoomed.width, 110); assert.equal((anchor.x - zoomed.x) / zoomed.width, .25); assert.equal((anchor.y - zoomed.y) / zoomed.height, .5);
  assert.deepEqual(panMap(view, -10000, 10000), { x: 0, y: 250, width: 220, height: 110 });
  assert.deepEqual(zoomMap(view, .01), { x: 0, y: 0, width: 720, height: 360 });
});

test('restored public photo IDs stay selected while explicit album load is pending', () => {
  const id = 'immich:public:22222222-2222-4222-8222-222222222222';
  const state = photoState(photos, id);
  assert.equal(state.selectedID, id);
  const projected = [...photos, { id, region: null }];
  assert.equal(photoState(projected, id, state).selectedID, id);
  assert.equal(photoState(photos, 'region:all', state).selectedID, null);
});
