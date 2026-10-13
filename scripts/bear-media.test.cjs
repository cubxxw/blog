const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createBearerMediaHandler, stripImageMetadata } = require('../netlify/functions/bear-media.js');
const ALBUM = '11111111-1111-4111-8111-111111111111';
const ASSET = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const KEY = 'server-only-shared-key';
const CONFIG = { IMMICH_URL: 'http://127.0.0.1:2283', BEAR_IMMICH_PUBLIC_ALBUMS: JSON.stringify([{ slug: 'journey', title: 'Public journey', albumId: ALBUM, sharedKey: KEY, region: 'japan' }]) };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+Z0AAAAASUVORK5CYII=', 'base64');
const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
function stub(overrides = {}) {
  const calls = [];
  return { calls, fetchImpl: async (href, options) => {
    const url = new URL(href); calls.push({ url, options, body: options.body && JSON.parse(options.body) });
    const path = url.pathname;
    if (overrides[path]) return overrides[path](url, options);
    if (path === '/api/shared-links/me') return json({ type: 'ALBUM', album: { id: ALBUM }, expiresAt: null, allowUpload: false, allowDownload: false, showMetadata: false, key: KEY, assets: [{ originalPath: '/private' }] });
    if (path === `/api/albums/${ALBUM}`) return json({ id: ALBUM, albumName: 'PRIVATE TITLE', ownerId: OTHER, sharedLinks: [{ key: KEY }], assetCount: 999 });
    if (path === '/api/search/metadata') return json({ assets: { items: [{ id: ASSET, type: 'IMAGE', originalFileName: 'PRIVATE.jpg', originalPath: '/private/PRIVATE.jpg', fileCreatedAt: '2020-01-01', exifInfo: { latitude: 35, longitude: 139 }, people: [{ name: 'Private person' }], ownerId: OTHER, description: KEY }], nextCursor: 'PRIVATE-DATE-CURSOR' } });
    if (path === `/api/assets/${ASSET}/thumbnail`) return new Response(PNG, { headers: { 'Content-Type': 'image/png' } });
    throw new Error(`unexpected test route ${path}`);
  } };
}
const event = params => ({ httpMethod: 'GET', queryStringParameters: params });
test('no explicit album allowlist makes no upstream requests', async () => {
  let called = false;
  const handler = createBearerMediaHandler({ env: {}, fetchImpl: () => { called = true; throw Error(); } });
  const response = await handler(event({}));
  assert.deepEqual(JSON.parse(response.body), { connected: false, albums: [], photos: [], reason: 'not_configured' }); assert.equal(called, false);
});
test('only GET and the fixed public protocol are accepted', async () => {
  const handler = createBearerMediaHandler({ env: CONFIG, fetchImpl: () => { throw Error('should not fetch'); } });
  assert.equal((await handler({ httpMethod: 'POST' })).statusCode, 405);
  for (const params of [{ url: 'https://evil.test' }, { key: KEY }, { album: ALBUM }, { action: 'original' }, { action: 'thumbnail', album: 'journey', asset: ASSET, size: 'fullsize' }]) assert.ok((await handler(event(params))).statusCode >= 400);
});
test('invalid allowlist and insecure remote provider fail closed', async () => {
  for (const env of [{ ...CONFIG, BEAR_IMMICH_PUBLIC_ALBUMS: '{}' }, { ...CONFIG, IMMICH_URL: 'https://user:secret@host.test' }, { ...CONFIG, IMMICH_URL: 'http://public.test' }, { ...CONFIG, BEAR_IMMICH_PUBLIC_ALBUMS: CONFIG.BEAR_IMMICH_PUBLIC_ALBUMS.replace('japan', 'private-location') }]) {
    const response = await createBearerMediaHandler({ env, fetchImpl: () => { throw Error(); } })(event({})); assert.equal(response.statusCode, 503); assert.equal(JSON.parse(response.body).reason, 'invalid_configuration');
  }
});
test('listing uses album-confined v3 filter and strips all private fields', async () => {
  const upstream = stub(), handler = createBearerMediaHandler({ env: CONFIG, ...upstream });
  const response = await handler(event({})), body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200); assert.equal(body.connected, true); assert.equal(body.photos.length, 1);
  assert.deepEqual(Object.keys(body.photos[0]).sort(), ['album', 'id', 'image', 'place', 'region', 'source', 'thumb', 'title']);
  for (const privateText of [KEY, 'PRIVATE', '/private', 'ownerId', 'people', 'exifInfo', 'latitude', 'fileCreatedAt', 'albumId', 'sharedKey']) assert.ok(!response.body.includes(privateText), privateText);
  const search = upstream.calls.find(c => c.body);
  assert.deepEqual(search.body.filter, { albumIds: { any: [ALBUM] }, type: { eq: 'IMAGE' } });
  assert.equal(search.body.size, 60); assert.equal(search.body.withExif, false); assert.equal(search.body.withPeople, false); assert.equal(search.body.withStacked, false);
  assert.equal(upstream.calls[0].url.searchParams.get('key'), KEY);
});
test('unassigned public album remains unassigned instead of inferring a region', async () => {
  const config = JSON.parse(CONFIG.BEAR_IMMICH_PUBLIC_ALBUMS); delete config[0].region;
  const response = await createBearerMediaHandler({ env: { ...CONFIG, BEAR_IMMICH_PUBLIC_ALBUMS: JSON.stringify(config) }, ...stub() })(event({}));
  assert.equal(JSON.parse(response.body).photos[0].region, null);
});
test('cursor is opaque, bound to album and expires', async () => {
  let time = 1000000;
  const upstream = stub(), handler = createBearerMediaHandler({ env: CONFIG, ...upstream, now: () => time });
  const first = JSON.parse((await handler(event({ album: 'journey' }))).body), cursor = first.albums[0].nextCursor;
  assert.ok(cursor); assert.ok(!Buffer.from(cursor, 'base64url').toString().includes('PRIVATE-DATE-CURSOR'));
  assert.equal((await handler(event({ album: 'journey', cursor }))).statusCode, 200);
  assert.equal(upstream.calls.at(-1).body.cursor, 'PRIVATE-DATE-CURSOR');
  assert.equal((await handler(event({ album: 'journey', cursor: `${cursor.slice(0, -8)}AAAAAAAA` }))).statusCode, 400);
  assert.equal((await handler(event({ cursor }))).statusCode, 400);
  time += 16 * 60 * 1000; assert.equal((await handler(event({ album: 'journey', cursor }))).statusCode, 400);
  assert.equal((await handler(event({ album: 'journey', cursor: 'x'.repeat(4100) }))).statusCode, 400);
});
test('wrong share type, another album and expiration are rejected', async () => {
  for (const share of [{ type: 'INDIVIDUAL', album: { id: ALBUM } }, { type: 'ALBUM', album: { id: OTHER } }, { type: 'ALBUM', album: { id: ALBUM }, expiresAt: 'invalid' }, { type: 'ALBUM', album: { id: ALBUM }, expiresAt: '2000-01-01T00:00:00Z' }]) {
    const upstream = stub({ '/api/shared-links/me': () => json({ allowUpload: false, allowDownload: false, showMetadata: false, ...share }) });
    const response = await createBearerMediaHandler({ env: CONFIG, ...upstream })(event({}));
    assert.equal(response.statusCode, 502); assert.equal(JSON.parse(response.body).connected, false); assert.equal(upstream.calls.length, 1);
  }
});
test('public share must explicitly disable uploads, downloads and metadata', async () => {
  for (const flag of ['allowUpload', 'allowDownload', 'showMetadata']) {
    for (const value of [true, undefined, null, 'false', 0]) {
      const share = { type: 'ALBUM', album: { id: ALBUM }, allowUpload: false, allowDownload: false, showMetadata: false, [flag]: value };
      const upstream = stub({ '/api/shared-links/me': () => json(share) });
      const response = await createBearerMediaHandler({ env: CONFIG, ...upstream })(event({}));
      assert.equal(response.statusCode, 502, `${flag}=${value}`); assert.equal(JSON.parse(response.body).failures[0].reason, 'share_not_allowed'); assert.equal(upstream.calls.length, 1);
    }
  }
});
test('thumbnail proves fresh asset membership within allowed album before serving', async () => {
  const upstream = stub(), response = await createBearerMediaHandler({ env: CONFIG, ...upstream })(event({ action: 'thumbnail', album: 'journey', asset: ASSET, size: 'preview' }));
  assert.equal(response.statusCode, 200); assert.equal(response.isBase64Encoded, true); assert.equal(response.headers['Content-Type'], 'image/png');
  assert.deepEqual(upstream.calls.find(c => c.body).body.filter, { albumIds: { any: [ALBUM] }, type: { eq: 'IMAGE' }, id: { eq: ASSET } });
  assert.equal(upstream.calls.find(c => c.url.pathname.includes('/thumbnail')).url.searchParams.get('size'), 'preview');
  assert.ok(upstream.calls.every(c => c.options.redirect === 'manual'));
});
test('arbitrary asset UUID and video cannot access thumbnail endpoint', async () => {
  for (const item of [{ id: OTHER, type: 'IMAGE' }, { id: ASSET, type: 'VIDEO' }]) {
    const upstream = stub({ '/api/search/metadata': () => json({ assets: { items: [item] } }) });
    const response = await createBearerMediaHandler({ env: CONFIG, ...upstream })(event({ action: 'thumbnail', album: 'journey', asset: ASSET }));
    assert.equal(response.statusCode, 404); assert.ok(!upstream.calls.some(c => c.url.pathname.includes('/thumbnail')));
  }
});
test('upstream redirects are rejected and error bodies never leak keys', async () => {
  for (const path of ['/api/shared-links/me', `/api/assets/${ASSET}/thumbnail`]) {
    const upstream = stub({ [path]: () => new Response(KEY, { status: 302, headers: { Location: `https://private.test/?key=${KEY}` } }) });
    const response = await createBearerMediaHandler({ env: CONFIG, ...upstream })(event(path.includes('thumbnail') ? { action: 'thumbnail', album: 'journey', asset: ASSET } : {}));
    assert.equal(response.statusCode, 502); assert.ok(!response.body.includes(KEY));
  }
  const upstream = stub({ '/api/shared-links/me': () => new Response(`error ${KEY}`, { status: 401 }) });
  const response = await createBearerMediaHandler({ env: CONFIG, ...upstream })(event({})); assert.ok(!response.body.includes(KEY)); assert.equal(response.statusCode, 502);
});
test('timeout is a real failed connection', async () => {
  const fetchImpl = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Error(KEY))));
  const response = await createBearerMediaHandler({ env: CONFIG, fetchImpl, timeoutMs: 5 })(event({}));
  assert.equal(response.statusCode, 502); assert.equal(JSON.parse(response.body).failures[0].reason, 'upstream_timeout'); assert.ok(!response.body.includes(KEY));
});
test('bounded image bytes and unsupported content types fail closed', async () => {
  for (const response of [new Response('svg', { headers: { 'Content-Type': 'image/svg+xml' } }), new Response(PNG, { headers: { 'Content-Type': 'image/png', 'Content-Length': String(6 * 1024 * 1024) } }), new Response(PNG.subarray(0, -8), { headers: { 'Content-Type': 'image/png' } })]) {
    const upstream = stub({ [`/api/assets/${ASSET}/thumbnail`]: () => response });
    assert.equal((await createBearerMediaHandler({ env: CONFIG, ...upstream })(event({ action: 'thumbnail', album: 'journey', asset: ASSET }))).statusCode, 502);
  }
});
function jpegSegment(marker, content) { const length = Buffer.alloc(2); length.writeUInt16BE(content.length + 2); return Buffer.concat([Buffer.from([255, marker]), length, content]); }
test('JPEG strips EXIF, XMP, ICC, comments and trailing data, including between scans', () => {
  const pixels = Buffer.from([7, 8, 255, 0, 9]), metadata = Buffer.from('GPS secret private-person');
  const input = Buffer.concat([Buffer.from([255, 216]), jpegSegment(0xe1, metadata), jpegSegment(0xe2, metadata), jpegSegment(0xdb, Buffer.from([0, 1])), jpegSegment(0xda, Buffer.from([1, 2])), pixels, jpegSegment(0xfe, metadata), jpegSegment(0xda, Buffer.from([1, 2])), pixels, Buffer.from([255, 217]), metadata]);
  const result = stripImageMetadata(input, 'image/jpeg'); assert.ok(!result.bytes.includes(metadata)); assert.ok(result.bytes.includes(pixels)); assert.ok(result.bytes.subarray(-2).equals(Buffer.from([255, 217])));
  assert.throws(() => stripImageMetadata(input.subarray(0, 20), 'image/jpeg'));
});
function pngChunk(type, data) { const chunk = Buffer.alloc(data.length + 12); chunk.writeUInt32BE(data.length); chunk.write(type, 4); data.copy(chunk, 8); return chunk; }
test('PNG strips eXIf, text and other ancillary chunks without changing pixel data', () => {
  const metadata = Buffer.from('GPS secret private-person'), iend = PNG.length - 12;
  const input = Buffer.concat([PNG.subarray(0, iend), pngChunk('eXIf', metadata), pngChunk('tEXt', metadata), PNG.subarray(iend), metadata]);
  const result = stripImageMetadata(input, 'image/png'); assert.deepEqual(result.bytes, PNG); assert.ok(!result.bytes.includes(metadata));
  assert.throws(() => stripImageMetadata(Buffer.concat([PNG.subarray(0, iend), pngChunk('acTL', Buffer.alloc(8)), PNG.subarray(iend)]), 'image/png'));
});
function webp(chunks) { const body = Buffer.concat(chunks.map(([type, data]) => { const chunk = Buffer.alloc(8 + data.length + data.length % 2); chunk.write(type); chunk.writeUInt32LE(data.length, 4); data.copy(chunk, 8); return chunk; })); const head = Buffer.from('RIFF\0\0\0\0WEBP', 'ascii'); head.writeUInt32LE(body.length + 4, 4); return Buffer.concat([head, body]); }
test('WebP strips EXIF/XMP/ICC chunks and feature flags, rejects animation', () => {
  const flags = Buffer.alloc(10); flags[0] = 0x2c;
  const metadata = Buffer.from('GPS secret private-person'), input = webp([['VP8X', flags], ['EXIF', metadata], ['XMP ', metadata], ['ICCP', metadata], ['VP8 ', Buffer.from([1, 2, 3])]]);
  const result = stripImageMetadata(input, 'image/webp'); assert.ok(!result.bytes.includes(metadata)); assert.equal(result.bytes[20], 0); assert.equal(result.bytes.readUInt32LE(4) + 8, result.bytes.length);
  assert.throws(() => stripImageMetadata(webp([['ANIM', Buffer.alloc(6)], ['VP8 ', Buffer.alloc(1)]]), 'image/webp'));
});

test('4 MiB binary boundary stays within the buffered response after base64 encoding', async () => {
  const limit = 4 * 1024 * 1024;
  const header = PNG.subarray(0, 33), end = PNG.subarray(-12);
  const atLimit = Buffer.concat([header, pngChunk('IDAT', Buffer.alloc(limit - header.length - end.length - 12, 7)), end]);
  assert.equal(atLimit.length, limit);
  assert.equal(stripImageMetadata(atLimit, 'image/png').bytes.length, limit);
  const upstream = stub({ [`/api/assets/${ASSET}/thumbnail`]: () => new Response(atLimit, { headers: { 'Content-Type': 'image/png' } }) });
  const response = await createBearerMediaHandler({ env: CONFIG, ...upstream })(event({ action: 'thumbnail', album: 'journey', asset: ASSET }));
  assert.equal(response.statusCode, 200); assert.ok(Buffer.byteLength(JSON.stringify(response)) < 6000000 - 8192);
  assert.equal(Buffer.from(response.body, 'base64').length, limit);
  const aboveLimit = Buffer.concat([atLimit, Buffer.from([0])]);
  assert.throws(() => stripImageMetadata(aboveLimit, 'image/png'), /response_too_large/);
  const tooLarge = stub({ [`/api/assets/${ASSET}/thumbnail`]: () => new Response(aboveLimit, { headers: { 'Content-Type': 'image/png' } }) });
  assert.equal((await createBearerMediaHandler({ env: CONFIG, ...tooLarge })(event({ action: 'thumbnail', album: 'journey', asset: ASSET }))).statusCode, 502);
});

test('album configuration and asset IDs reject implicit coercion', async () => {
  const valid = JSON.parse(CONFIG.BEAR_IMMICH_PUBLIC_ALBUMS)[0];
  const invalid = [
    ...[undefined, null, 1, {}, [], ['journey']].map(slug => ({ ...valid, slug })),
    ...[undefined, null, 1, {}, [ALBUM]].map(albumId => ({ ...valid, albumId })),
    ...[false, 0, {}, ['japan']].map(region => ({ ...valid, region })),
  ];
  for (const candidate of invalid) {
    let called = false;
    const env = { ...CONFIG, BEAR_IMMICH_PUBLIC_ALBUMS: JSON.stringify([candidate]) };
    const result = await createBearerMediaHandler({ env, fetchImpl: () => { called = true; throw Error(); } })(event({}));
    assert.equal(result.statusCode, 503); assert.equal(called, false);
  }
  const coercedURL = { toString: () => CONFIG.IMMICH_URL };
  assert.equal((await createBearerMediaHandler({ env: { ...CONFIG, IMMICH_URL: coercedURL }, ...stub() })(event({}))).statusCode, 503);
  assert.equal((await createBearerMediaHandler({ env: CONFIG, ...stub() })(event({ action: 'thumbnail', album: 'journey', asset: [ASSET] }))).statusCode, 400);
});
test('early upstream rejection aborts the signal and cancels every unread body', async () => {
  const cases = [
    { status: 302, headers: { 'Content-Type': 'application/json', Location: 'https://private.invalid' } },
    { status: 401, headers: { 'Content-Type': 'application/json' } },
    { status: 200, headers: { 'Content-Type': 'text/html' } },
    { status: 200, headers: { 'Content-Type': 'application/json', 'Content-Length': '999999999' } },
  ];
  for (const init of cases) {
    let signal, cancelled = false;
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('unread upstream bytes')); }, cancel() { cancelled = true; } });
    const provider = new Response(stream, init);
    const fetchImpl = (_url, options) => { signal = options.signal; return Promise.resolve(provider); };
    const result = await createBearerMediaHandler({ env: CONFIG, fetchImpl })(event({}));
    assert.equal(result.statusCode, 502); assert.equal(signal.aborted, true); assert.equal(cancelled, true); assert.equal(provider.bodyUsed, true);
  }
});
test('fully consumed upstream requests also release their abort controllers', async () => {
  const upstream = stub();
  const result = await createBearerMediaHandler({ env: CONFIG, ...upstream })(event({}));
  assert.equal(result.statusCode, 200); assert.ok(upstream.calls.every(call => call.options.signal.aborted));
});
