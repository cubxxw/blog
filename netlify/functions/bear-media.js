// Immich v3.3.1 public-album projection. Credentials and private asset metadata stay here.
// https://github.com/immich-app/immich/tree/v3.3.1/server/src/dtos/search.dto.ts
const { createHash, createCipheriv, createDecipheriv, randomBytes } = require('node:crypto');
const MAX_IMAGE = 4 * 1024 * 1024;
const MAX_BUFFERED_PAYLOAD = 6000000 - 8192; // Netlify buffered limit, with wrapper headroom.
const MAX_JSON = 2 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REGIONS = new Set(['tibet', 'japan', 'southeast-asia']);
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
class MediaError extends Error { constructor(reason, status = 502) { super(reason); this.reason = reason; this.status = status; } }
function readConfig(env) {
  let raw;
  if (env.BEAR_IMMICH_PUBLIC_ALBUMS != null && typeof env.BEAR_IMMICH_PUBLIC_ALBUMS !== 'string') throw new MediaError('invalid_configuration', 503);
  try { raw = JSON.parse(env.BEAR_IMMICH_PUBLIC_ALBUMS || '[]'); } catch { throw new MediaError('invalid_configuration', 503); }
  if (!Array.isArray(raw) || raw.length > 8) throw new MediaError('invalid_configuration', 503);
  if (!raw.length) return null;
  let url;
  if (typeof env.IMMICH_URL !== 'string') throw new MediaError('invalid_configuration', 503);
  try { url = new URL(env.IMMICH_URL); } catch { throw new MediaError('invalid_configuration', 503); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || !(url.protocol === 'https:' || (url.protocol === 'http:' && local))) throw new MediaError('invalid_configuration', 503);
  const seen = new Set();
  const albums = raw.map(a => {
    if (!a || typeof a !== 'object' || Array.isArray(a) || typeof a.slug !== 'string' || !SLUG.test(a.slug) || seen.has(a.slug) || typeof a.albumId !== 'string' || !UUID.test(a.albumId) || typeof a.sharedKey !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(a.sharedKey) || (a.region != null && (typeof a.region !== 'string' || (a.region !== '' && !REGIONS.has(a.region)))) || typeof a.title !== 'string' || !a.title.trim() || a.title.length > 100 || /[\u0000-\u001f]/.test(a.title)) throw new MediaError('invalid_configuration', 503);
    seen.add(a.slug);
    return { slug: a.slug, title: a.title.trim(), albumId: a.albumId, sharedKey: a.sharedKey, region: a.region || null };
  });
  return { base: url.href.replace(/\/+$/, ''), albums };
}
function searchBody(album, { cursor, asset } = {}) {
  return { filter: { albumIds: { any: [album.albumId] }, type: { eq: 'IMAGE' }, ...(asset ? { id: { eq: asset } } : {}) }, size: asset ? 1 : 60, withExif: false, withPeople: false, withStacked: false, orderBy: { field: 'fileCreatedAt', direction: 'desc' }, ...(cursor ? { cursor } : {}) };
}
// The upstream cursor may encode dates. Encrypt it rather than expose it in browser state.
function cursorKey(album) { return createHash('sha256').update(`bear-media-cursor:${album.slug}:${album.sharedKey}`).digest(); }
function encodeCursor(cursor, album, now) {
  if (typeof cursor !== 'string' || !cursor || cursor.length > 2048) return null;
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', cursorKey(album), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ cursor, until: now + 15 * 60 * 1000 }), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
function decodeCursor(value, album, now) {
  if (!value) return undefined;
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{40,4096}$/.test(value)) throw new MediaError('invalid_cursor', 400);
  try {
    const buffer = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', cursorKey(album), buffer.subarray(0, 12));
    decipher.setAuthTag(buffer.subarray(12, 28));
    const result = JSON.parse(Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]).toString('utf8'));
    if (!Number.isFinite(result.until) || result.until < now || result.until > now + 15 * 60 * 1000 || typeof result.cursor !== 'string' || result.cursor.length > 2048) throw new Error();
    return result.cursor;
  } catch { throw new MediaError('invalid_cursor', 400); }
}
async function boundedBytes(response, limit) {
  const size = response.headers.get('content-length');
  if (size && (!/^\d+$/.test(size) || Number(size) > limit)) throw new MediaError('response_too_large');
  if (!response.body?.getReader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > limit) throw new MediaError('response_too_large');
    return bytes;
  }
  const reader = response.body.getReader(), chunks = []; let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > limit) { await reader.cancel(); throw new MediaError('response_too_large'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, total);
}
function stripJPEG(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new MediaError('unsupported_image');
  const parts = [bytes.subarray(0, 2)]; let pos = 2, hasScan = false;
  while (pos < bytes.length) {
    const start = pos;
    if (bytes[pos++] !== 0xff) throw new MediaError('unsupported_image');
    while (bytes[pos] === 0xff) pos++;
    const marker = bytes[pos++];
    if (marker === 0xd9) { if (!hasScan) throw new MediaError('unsupported_image'); parts.push(Buffer.from([0xff, 0xd9])); return Buffer.concat(parts); }
    if (marker === 0x00 || marker === 0xd8 || marker === undefined || (marker >= 0xd0 && marker <= 0xd7)) throw new MediaError('unsupported_image');
    if (pos + 2 > bytes.length) throw new MediaError('unsupported_image');
    const length = bytes.readUInt16BE(pos);
    if (length < 2 || pos + length > bytes.length) throw new MediaError('unsupported_image');
    pos += length;
    if (!(marker >= 0xe0 && marker <= 0xef) && marker !== 0xfe) parts.push(bytes.subarray(start, pos));
    if (marker === 0xda) {
      hasScan = true;
      const scanStart = pos;
      while (pos < bytes.length) {
        if (bytes[pos] !== 0xff) { pos++; continue; }
        let next = pos + 1;
        while (bytes[next] === 0xff) next++;
        if (bytes[next] === 0 || (bytes[next] >= 0xd0 && bytes[next] <= 0xd7)) { pos = next + 1; continue; }
        break;
      }
      parts.push(bytes.subarray(scanStart, pos));
    }
  }
  throw new MediaError('unsupported_image');
}
function stripWebP(bytes) {
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.readUInt32LE(4) + 8 !== bytes.length) throw new MediaError('unsupported_image');
  const parts = []; let pos = 12, hasImage = false;
  while (pos < bytes.length) {
    if (pos + 8 > bytes.length) throw new MediaError('unsupported_image');
    const type = bytes.toString('ascii', pos, pos + 4), length = bytes.readUInt32LE(pos + 4), end = pos + 8 + length + (length % 2);
    if (end > bytes.length) throw new MediaError('unsupported_image');
    if (['ANIM', 'ANMF'].includes(type)) throw new MediaError('unsupported_image');
    if (['VP8 ', 'VP8L', 'ALPH', 'VP8X'].includes(type)) {
      const chunk = Buffer.from(bytes.subarray(pos, end));
      if (type === 'VP8X') { if (length !== 10 || chunk[8] & 0x02) throw new MediaError('unsupported_image'); chunk[8] &= ~0x2c; }
      if (type === 'VP8 ' || type === 'VP8L') hasImage = true;
      parts.push(chunk);
    }
    pos = end;
  }
  if (!hasImage) throw new MediaError('unsupported_image');
  const body = Buffer.concat(parts), head = Buffer.from('RIFF\0\0\0\0WEBP', 'ascii'); head.writeUInt32LE(body.length + 4, 4);
  return Buffer.concat([head, body]);
}
function stripPNG(bytes) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!bytes.subarray(0, 8).equals(signature)) throw new MediaError('unsupported_image');
  const parts = [signature]; let pos = 8, hasImage = false, hasHeader = false;
  while (pos < bytes.length) {
    if (pos + 12 > bytes.length) throw new MediaError('unsupported_image');
    const length = bytes.readUInt32BE(pos), type = bytes.toString('ascii', pos + 4, pos + 8), end = pos + 12 + length;
    if (end > bytes.length || !/^[A-Za-z]{4}$/.test(type) || ['acTL', 'fcTL', 'fdAT'].includes(type)) throw new MediaError('unsupported_image');
    if (type === 'IHDR') { if (hasHeader || pos !== 8 || length !== 13) throw new MediaError('unsupported_image'); hasHeader = true; }
    if (type === 'IDAT') hasImage = true;
    const allowed = ['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'].includes(type);
    if (!allowed && type[0] === type[0].toUpperCase()) throw new MediaError('unsupported_image');
    if (allowed) parts.push(bytes.subarray(pos, end));
    if (type === 'IEND') { if (length || !hasHeader || !hasImage) throw new MediaError('unsupported_image'); return Buffer.concat(parts); }
    pos = end;
  }
  throw new MediaError('unsupported_image');
}
function stripImageMetadata(bytes, type) {
  if (bytes.length > MAX_IMAGE) throw new MediaError('response_too_large');
  const mime = String(type || '').split(';')[0].trim().toLowerCase();
  if (mime === 'image/jpeg') return { bytes: stripJPEG(bytes), type: mime };
  if (mime === 'image/webp') return { bytes: stripWebP(bytes), type: mime };
  if (mime === 'image/png') return { bytes: stripPNG(bytes), type: mime };
  throw new MediaError('unsupported_image');
}
function createBearerMediaHandler({ env = process.env, fetchImpl = globalThis.fetch, now = Date.now, timeoutMs = 8000 } = {}) {
  const json = (status, body) => ({ statusCode: status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
  async function upstream(config, album, path, body, image = false) {
    const url = new URL(`${config.base}/api/${path}`); url.searchParams.set('key', album.sharedKey);
    const remaining = config.deadline - Date.now();
    if (remaining <= 0) throw new MediaError('upstream_timeout');
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, remaining));
    let response;
    try {
      response = await fetchImpl(url.href, { method: body ? 'POST' : 'GET', redirect: 'manual', signal: controller.signal, headers: { Accept: image ? 'image/jpeg,image/webp,image/png' : 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (response.status >= 300 && response.status < 400) throw new MediaError('upstream_redirect');
      if (!response.ok) throw new MediaError('upstream_unavailable');
      if (image) return stripImageMetadata(await boundedBytes(response, MAX_IMAGE), response.headers.get('content-type'));
      if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) throw new MediaError('invalid_response');
      const bytes = await boundedBytes(response, MAX_JSON);
      try { return JSON.parse(bytes.toString('utf8')); } catch { throw new MediaError('invalid_response'); }
    } catch (error) { if (error instanceof MediaError) throw error; throw new MediaError(controller.signal.aborted ? 'upstream_timeout' : 'upstream_unavailable'); }
    finally {
      clearTimeout(timer); controller.abort();
      // Early rejection can leave a body unread. Cancel it even if a custom transport ignores abort.
      if (response?.body && !response.bodyUsed) { try { await response.body.cancel(); } catch { /* The transport may already be aborted. */ } }
    }
  }
  async function verify(config, album) {
    const share = await upstream(config, album, 'shared-links/me');
    if (share.type !== 'ALBUM' || share.album?.id !== album.albumId || share.allowUpload !== false || share.allowDownload !== false || share.showMetadata !== false || (share.expiresAt && (!Number.isFinite(Date.parse(share.expiresAt)) || Date.parse(share.expiresAt) <= now()))) throw new MediaError('share_not_allowed');
    const metadata = await upstream(config, album, `albums/${album.albumId}`);
    if (metadata.id !== album.albumId) throw new MediaError('share_not_allowed');
  }
  return async event => {
    if (event.httpMethod !== 'GET') return json(405, { connected: false, reason: 'method_not_allowed' });
    const params = event.queryStringParameters || {};
    if (Object.keys(params).some(key => !['action', 'album', 'asset', 'size', 'cursor'].includes(key))) return json(400, { connected: false, reason: 'invalid_request' });
    const action = params.action || 'list';
    if (!['list', 'thumbnail'].includes(action)) return json(400, { connected: false, reason: 'invalid_request' });
    try {
      const config = readConfig(env);
      if (config) config.deadline = Date.now() + 14000;
      if (!config) return json(200, { connected: false, albums: [], photos: [], reason: 'not_configured' });
      const selected = params.album ? config.albums.find(a => a.slug === params.album) : null;
      if (params.album && !selected) throw new MediaError('album_not_allowed', 404);
      if (action === 'thumbnail') {
        if (!selected || typeof params.asset !== 'string' || !UUID.test(params.asset) || !['thumbnail', 'preview'].includes(params.size || 'thumbnail') || params.cursor) throw new MediaError('invalid_request', 400);
        await verify(config, selected);
        const membership = await upstream(config, selected, 'search/metadata', searchBody(selected, { asset: params.asset }));
        if (!Array.isArray(membership.assets?.items) || !membership.assets.items.some(asset => asset.id === params.asset && asset.type === 'IMAGE')) throw new MediaError('asset_not_allowed', 404);
        const image = await upstream(config, selected, `assets/${params.asset}/thumbnail?size=${params.size || 'thumbnail'}`, undefined, true);
        const payload = { statusCode: 200, headers: { ...headers, 'Content-Type': image.type, 'Content-Length': String(image.bytes.length) }, body: image.bytes.toString('base64'), isBase64Encoded: true };
        if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > MAX_BUFFERED_PAYLOAD) throw new MediaError('response_too_large');
        return payload;
      }
      if (params.asset || params.size || (params.cursor && !selected)) throw new MediaError('invalid_request', 400);
      const albums = [], photos = [], failures = [];
      for (const album of selected ? [selected] : config.albums) {
        try {
          const cursor = decodeCursor(params.cursor, album, now());
          await verify(config, album);
          const result = await upstream(config, album, 'search/metadata', searchBody(album, { cursor }));
          if (!Array.isArray(result.assets?.items) || result.assets.items.length > 60) throw new MediaError('invalid_response');
          const projected = result.assets.items.filter(asset => typeof asset.id === 'string' && UUID.test(asset.id) && asset.type === 'IMAGE').map(asset => {
            const query = `album=${encodeURIComponent(album.slug)}&asset=${encodeURIComponent(asset.id)}`;
            return { id: `immich:${album.slug}:${asset.id}`, title: album.title, place: album.title, region: album.region, source: 'immich', album: album.slug, thumb: `/.netlify/functions/bear-media?action=thumbnail&${query}&size=thumbnail`, image: `/.netlify/functions/bear-media?action=thumbnail&${query}&size=preview` };
          });
          const nextCursor = encodeCursor(result.assets.nextCursor, album, now());
          albums.push({ slug: album.slug, title: album.title, region: album.region, loaded: projected.length, nextCursor }); photos.push(...projected);
        } catch (error) { if (error.status === 400) throw error; failures.push({ album: album.slug, reason: error instanceof MediaError ? error.reason : 'upstream_unavailable' }); }
      }
      return json(albums.length ? 200 : 502, { connected: albums.length > 0, albums, photos, reason: failures.length ? (albums.length ? 'partial' : 'unavailable') : 'connected', ...(failures.length ? { failures } : {}) });
    } catch (error) { return json(error instanceof MediaError ? error.status : 502, { connected: false, albums: [], photos: [], reason: error instanceof MediaError ? error.reason : 'upstream_unavailable' }); }
  };
}
exports.handler = createBearerMediaHandler();
exports.createBearerMediaHandler = createBearerMediaHandler;
exports.stripImageMetadata = stripImageMetadata;
