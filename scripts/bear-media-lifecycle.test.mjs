import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleURL = new URL('../assets/js/space/media.js', import.meta.url);
const source = (await readFile(moduleURL, 'utf8')).replace(/from '\.\/(state\.mjs|media-state\.mjs)'/g, (_match, file) => `from '${new URL(file, moduleURL).href}'`);
const { mountMedia } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

// A minimal DOM boundary exercises the real mounted load/dispose handlers without a browser service.
class Button extends EventTarget {
  constructor(dataset = {}) { super(); this.dataset = dataset; }
  click() { this.dispatchEvent(new Event('click')); }
}
class Host extends EventTarget {
  constructor() { super(); this.isConnected = true; this.markup = ''; }
  set innerHTML(value) {
    this.markup = value; this.load = new Button();
    this.more = [...value.matchAll(/data-media-more="([^"]+)"/g)].map(match => new Button({ mediaMore: match[1] }));
  }
  get innerHTML() { return this.markup; }
  querySelectorAll(selector) { return selector === '[data-media-load]' ? [this.load] : selector === '[data-media-more]' ? this.more : []; }
  querySelector() { return null; }
  closest() { return null; }
}
const ID = suffix => `${suffix.repeat(8)}-${suffix.repeat(4)}-4${suffix.repeat(3)}-8${suffix.repeat(3)}-${suffix.repeat(12)}`;
const remote = (suffix, album = 'journey', title = suffix) => ({ id: `immich:${album}:${ID(suffix)}`, album, title, place: 'Public album', region: null, source: 'immich' });
const album = (slug = 'journey', nextCursor = null) => ({ slug, title: slug, nextCursor });
const response = (photos, albums = [album()], extra = {}) => new Response(JSON.stringify({ connected: true, photos, albums, reason: 'connected', ...extra }), { headers: { 'Content-Type': 'application/json' }, status: extra.status || 200 });
const staticPhoto = { id: 'kumano', title: 'Kumano', place: 'Japan', image: '/public.webp', thumb: '/public.webp', region: 'japan' };
function setup(fetchImpl, options = {}) {
  const originalFetch = globalThis.fetch, originalLocation = globalThis.location;
  globalThis.fetch = fetchImpl; globalThis.location = { origin: 'https://blog.test' };
  const catalog = { language: 'en', photos: [staticPhoto], places: [], articles: [] }, notifications = [];
  const media = mountMedia({ catalog, execute() {}, notify: text => notifications.push(text), ...options });
  const host = new Host(); media.renderPhotos(host, '', 'one');
  return { media, catalog, notifications, host, cleanup() { media.dispose('one'); media.dispose('two'); globalThis.fetch = originalFetch; globalThis.location = originalLocation; } };
}
async function until(predicate) {
  const deadline = Date.now() + 1000;
  while (!predicate()) { if (Date.now() > deadline) assert.fail('load did not settle'); await new Promise(resolve => setImmediate(resolve)); }
}
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

test('full refresh replaces remote projection and preserves the static object and array', async () => {
  let round = 0;
  const fixture = setup(() => response(round++ ? [remote('2', 'journey', 'updated'), remote('3')] : [remote('1'), remote('2')]));
  try {
    const photosArray = fixture.catalog.photos;
    fixture.host.load.click(); await until(() => fixture.media.status().phase === 'ready');
    assert.deepEqual(fixture.catalog.photos.map(p => p.id), ['kumano', remote('1').id, remote('2').id]);
    fixture.host.load.click(); await until(() => fixture.notifications.length === 2);
    assert.equal(fixture.catalog.photos, photosArray); assert.equal(fixture.catalog.photos[0], staticPhoto);
    assert.deepEqual(fixture.catalog.photos.map(p => p.id), ['kumano', remote('2').id, remote('3').id]);
    assert.equal(fixture.catalog.photos[1].title, 'updated');
  } finally { fixture.cleanup(); }
});
test('pagination appends the requested album, updates duplicate IDs and retains other albums', async () => {
  let round = 0, pagingURL;
  const fixture = setup(url => { pagingURL = url; return round++ ? response([remote('1', 'journey', 'updated'), remote('3'), remote('4', 'other')], [album('journey')]) : response([remote('1'), remote('2', 'other')], [album('journey', 'a'.repeat(50)), album('other')]); });
  try {
    fixture.host.load.click(); await until(() => fixture.media.status().phase === 'ready');
    fixture.host.more[0].click(); await until(() => fixture.notifications.length === 2);
    assert.ok(pagingURL.includes('album=journey&cursor='));
    assert.deepEqual(new Set(fixture.catalog.photos.map(p => p.id)), new Set(['kumano', remote('1').id, remote('2', 'other').id, remote('3').id]));
    assert.equal(fixture.catalog.photos.find(p => p.id === remote('1').id).title, 'updated');
  } finally { fixture.cleanup(); }
});
test('not configured response removes earlier remote photos', async () => {
  let round = 0;
  const fixture = setup(() => round++ ? response([], [], { connected: false, reason: 'not_configured' }) : response([remote('1')]));
  try {
    fixture.host.load.click(); await until(() => fixture.media.status().phase === 'ready');
    fixture.host.load.click(); await until(() => fixture.media.status().reason === 'not_configured');
    assert.deepEqual(fixture.catalog.photos, [staticPhoto]); assert.equal(fixture.media.status().loaded, 0); assert.equal(fixture.notifications.length, 1);
  } finally { fixture.cleanup(); }
});
test('revoked shares remove earlier remote photos and explain the strict sharing flags', async () => {
  let round = 0;
  const fixture = setup(() => round++ ? response([], [], { connected: false, reason: 'unavailable', failures: [{ album: 'journey', reason: 'share_not_allowed' }], status: 502 }) : response([remote('1')]));
  try {
    fixture.host.load.click(); await until(() => fixture.media.status().phase === 'ready');
    fixture.host.load.click(); await until(() => fixture.media.status().reason === 'share_not_allowed');
    assert.deepEqual(fixture.catalog.photos, [staticPhoto]); assert.match(fixture.host.markup, /disable uploads, downloads, and metadata/);
  } finally { fixture.cleanup(); }
});
test('disposing the last media window aborts transport and ignores late results', async () => {
  const pending = deferred(); let signal;
  const fixture = setup((_url, options) => { signal = options.signal; return pending.promise; });
  try {
    fixture.host.load.click(); fixture.media.dispose('one');
    assert.equal(signal.aborted, true); assert.equal(fixture.media.status().reason, 'cancelled');
    pending.resolve(response([remote('1')])); await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(fixture.catalog.photos, [staticPhoto]); assert.deepEqual(fixture.notifications, []); assert.equal(fixture.media.status().reason, 'cancelled');
  } finally { fixture.cleanup(); }
});
test('late cancelled request cannot overwrite a newly reopened media load', async () => {
  const pending = deferred(); let count = 0;
  const fixture = setup(() => count++ ? response([remote('2')]) : pending.promise);
  try {
    fixture.host.load.click(); fixture.media.dispose('one');
    fixture.media.renderPhotos(fixture.host, '', 'one'); fixture.host.load.click(); await until(() => fixture.media.status().phase === 'ready');
    pending.resolve(response([remote('1')])); await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(fixture.catalog.photos.map(p => p.id), ['kumano', remote('2').id]); assert.equal(fixture.notifications.length, 1); assert.equal(fixture.media.status().phase, 'ready');
  } finally { fixture.cleanup(); }
});
test('one remaining media window keeps the shared request alive', async () => {
  const pending = deferred(); let signal;
  const fixture = setup((_url, options) => { signal = options.signal; return pending.promise; });
  try {
    const second = new Host(); fixture.media.renderPhotos(second, '', 'two');
    fixture.host.load.click(); fixture.media.dispose('one'); assert.equal(signal.aborted, false);
    pending.resolve(response([remote('1')])); await until(() => fixture.media.status().phase === 'ready');
    assert.equal(fixture.catalog.photos.length, 2); assert.equal(fixture.notifications.length, 1);
  } finally { fixture.cleanup(); }
});
test('timeout is distinct from closing the last window and rejects delayed data', async () => {
  const pending = deferred(); let signal;
  const fixture = setup((_url, options) => { signal = options.signal; return pending.promise; }, { requestTimeoutMs: 5 });
  try {
    fixture.host.load.click(); await until(() => signal.aborted);
    pending.resolve(response([remote('1')])); await until(() => fixture.media.status().phase === 'error');
    assert.equal(fixture.media.status().reason, 'timeout'); assert.deepEqual(fixture.catalog.photos, [staticPhoto]); assert.equal(fixture.notifications.length, 0);
  } finally { fixture.cleanup(); }
});
