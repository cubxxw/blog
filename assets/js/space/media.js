import { safeURL } from './state.mjs';
import { LAND_PATH, projectCoordinate, fitMap, boundMap, zoomMap, panMap, photoState, visiblePhotos, stepPhoto } from './media-state.mjs';
const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ENDPOINT = '/.netlify/functions/bear-media';
export function mountMedia({ catalog, execute, notify, requestTimeoutMs = 18000 }) {
  const t = (cn, en) => catalog.language === 'zh' ? cn : en;
  const windows = new Map(), listeners = new Map();
  let connection = { phase: 'idle', connected: false, reason: 'unchecked', albums: [], loaded: 0 }, loadPromise, loadController, loadTimer, loadGeneration = 0;
  const photos = () => catalog.photos || [];
  const places = () => (catalog.places || []).filter(p => projectCoordinate(Number(p.lon), Number(p.lat)));
  const placeByID = id => places().find(p => p.id === id);
  const url = value => safeURL(value, location.origin);
  const open = (app, payload = '') => execute('open', { app, payload });
  const routeButton = (app, payload, label, cls = '') => `<button class="${cls}" data-media-open="${html(app)}" data-media-payload="${html(payload)}">${html(label)}</button>`;
  const writing = place => (catalog.articles || []).filter(a => (place?.match || []).some(term => `${a.title} ${a.description} ${(a.tags || []).join(' ')}`.toLocaleLowerCase().includes(String(term).toLocaleLowerCase())));
  const image = (photo, cls = '', preview = false) => {
    const src = url(preview ? photo.image : photo.thumb), alt = photo.place || photo.title;
    if (!src) return `<div class="sp-media-image" data-image-state="error"><span>${t('照片地址不可用', 'Photograph unavailable')}</span></div>`;
    const feedback = `<span class="sp-media-image__feedback" data-image-feedback ${preview ? 'role="status" aria-live="polite" aria-atomic="true"' : ''}>${t('正在打开照片…', 'Loading photograph…')}</span>`;
    return `<div class="sp-media-image ${cls}" data-image-wrap data-image-state="loading">${preview ? `<div class="sp-photo-recovery" data-image-recovery>${feedback}<button type="button" data-image-retry aria-disabled="true" hidden>${t('重试照片', 'Retry photograph')}</button></div>` : ''}<img ${preview ? `data-media-src="${html(src)}" fetchpriority="high" tabindex="-1"` : `src="${html(src)}" loading="lazy"`} alt="${html(alt)}" decoding="async" data-media-image>${preview ? '' : feedback}</div>`;
  };
  function bind(host, windowID) {
    listeners.get(windowID)?.abort();
    const controller = new AbortController(); listeners.set(windowID, controller);
    const on = (element, type, callback, options = {}) => element?.addEventListener(type, callback, { ...options, signal: controller.signal });
    host.querySelectorAll('[data-media-open]').forEach(b => on(b, 'click', () => open(b.dataset.mediaOpen, b.dataset.mediaPayload)));
    host.querySelectorAll('[data-media-image]').forEach(initialImage => {
      const wrapper = initialImage.closest('[data-image-wrap]'), feedback = wrapper.querySelector('[data-image-feedback]'), retry = wrapper.querySelector('[data-image-retry]'), recovery = wrapper.querySelector('[data-image-recovery]');
      const source = initialImage.dataset.mediaSrc || initialImage.getAttribute('src');
      let attempt;
      const current = owner => attempt === owner && !owner.controller.signal.aborted && !controller.signal.aborted && listeners.get(windowID) === controller && host.isConnected && wrapper.isConnected && wrapper.contains(owner.node);
      const stopAttempt = () => { if (!attempt) return; const previous = attempt; attempt = null; previous.controller.abort(); previous.node.removeAttribute('src'); };
      controller.signal.addEventListener('abort', stopAttempt, { once: true });
      function begin(node, assignSource) {
        const owner = { node, controller: new AbortController(), settled: false, decoding: false }; attempt = owner;
        const failure = () => {
          if (!current(owner) || owner.settled) return;
          owner.settled = true; owner.controller.abort(); wrapper.dataset.imageState = 'error';
          feedback.textContent = t('这张照片暂时未能打开。', 'This photograph could not load.');
          if (retry) { retry.hidden = false; retry.setAttribute('aria-disabled', 'false'); }
        };
        const success = async () => {
          if (!current(owner) || owner.settled || owner.decoding) return;
          owner.decoding = true;
          try { if (typeof node.decode === 'function') await node.decode(); } catch { failure(); return; }
          if (!current(owner) || owner.settled) return;
          // Hand off only this still-focused recovery action, before hiding it.
          if (retry && document.activeElement === retry) {
            node.focus({ preventScroll: true });
          }
          owner.settled = true; owner.controller.abort(); wrapper.dataset.imageState = 'ready'; feedback.textContent = '';
          if (retry) { retry.hidden = true; retry.setAttribute('aria-disabled', 'false'); }
          if (recovery) { recovery.hidden = true; recovery.style.minHeight = ''; }
        };
        node.addEventListener('load', success, { signal: owner.controller.signal });
        node.addEventListener('error', failure, { signal: owner.controller.signal });
        if (assignSource) node.src = source;
        // Cached images may have completed before listener registration.
        if (node.complete && (node.currentSrc || node.getAttribute('src'))) node.naturalWidth ? success() : failure();
      }
      on(retry, 'click', event => {
        event.stopPropagation(); if (wrapper.dataset.imageState === 'loading') return;
        // Preserve the error row's footprint through shorter pending copy.
        recovery.style.minHeight = getComputedStyle(recovery).height;
        wrapper.dataset.imageState = 'loading'; feedback.textContent = t('正在重试…', 'Trying again…'); retry.setAttribute('aria-disabled', 'true');
        const previous = attempt.node, next = document.createElement('img');
        for (const attribute of previous.attributes) if (attribute.name !== 'src') next.setAttribute(attribute.name, attribute.value);
        stopAttempt(); previous.replaceWith(next); begin(next, true);
      });
      begin(initialImage, !!initialImage.dataset.mediaSrc);
    });
    host.querySelectorAll('[data-media-load]').forEach(b => on(b, 'click', () => loadImmich()));
    host.querySelectorAll('[data-media-more]').forEach(b => on(b, 'click', () => loadImmich(b.dataset.mediaMore)));
    on.signal = controller.signal;
    return on;
  }
  function sourcePanel() {
    let text = t('已收录博客公开照片。还可以加载作者选择公开的 Immich 相册。', 'Public photographs from the blog. You can also load the author’s selected Immich albums.');
    if (connection.phase === 'loading') text = t('正在验证公开相册与连接…', 'Verifying public albums and connection…');
    if (connection.phase === 'ready') text = t(`已连接 ${connection.albums.length} 个公开相册，加载 ${connection.loaded} 张照片。`, `${connection.albums.length} public albums connected · ${connection.loaded} photographs loaded.`);
    if (connection.reason === 'not_configured' && connection.phase !== 'loading') text = t('Immich 公开相册尚未配置。现有旅行照片仍可浏览。', 'Immich public albums are not configured. The travel photographs remain available.');
    if (connection.phase === 'error') text = t('公开相册暂时无法连接。可以重试，或继续浏览已有照片。', 'Public albums could not connect. Retry or continue browsing the available photographs.');
    if (connection.reason === 'share_not_allowed') text = t('公开分享需要关闭上传、下载和元数据展示。请作者调整已有分享后重试。', 'The public share must disable uploads, downloads, and metadata. Ask the author to update the existing share, then retry.');
    if (connection.reason === 'timeout') text = t('公开相册连接超时。可以重试，或继续浏览博客照片。', 'The public album connection timed out. Retry or browse the blog photographs.');
    if (connection.reason === 'partial') text += t(' 部分相册未能连接。', ' Some albums could not connect.');
    return `<div class="sp-media-source"><span class="sp-media-source__mark" aria-hidden="true">◉</span><div><strong>${t('公开相册', 'Public albums')}</strong><p role="status" aria-live="polite">${html(text)}</p></div><button data-media-load ${connection.phase === 'loading' ? 'disabled' : ''}>${connection.phase === 'loading' ? t('连接中…', 'Connecting…') : connection.phase === 'ready' ? t('刷新', 'Refresh') : connection.phase === 'error' ? t('重试连接', 'Retry') : t('加载 Immich', 'Load Immich')} ↻</button></div>`;
  }
  function projectedPhoto(p) {
    if (!p || p.source !== 'immich' || typeof p.album !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(p.album) || typeof p.id !== 'string' || !p.id.startsWith(`immich:${p.album}:`)) return null;
    const asset = p.id.slice(`immich:${p.album}:`.length);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(asset)) return null;
    // Construct the proxy URL here; do not trust a provider-supplied URL or arbitrary query.
    const query = `album=${encodeURIComponent(p.album)}&asset=${encodeURIComponent(asset)}`;
    return { id: p.id, title: String(p.title || t('公开照片', 'Public photograph')).slice(0, 140), place: String(p.place || '').slice(0, 100), region: placeByID(p.region) ? p.region : null, source: 'immich', album: p.album, thumb: `${ENDPOINT}?action=thumbnail&${query}&size=thumbnail`, image: `${ENDPOINT}?action=thumbnail&${query}&size=preview` };
  }
  function replacePublicPhotos(incoming = [], albumSlug) {
    // Full refresh reconciles the projection. Pagination only reconciles duplicate IDs in its album.
    const retained = photos().filter(p => p.source !== 'immich' || (albumSlug && p.album !== albumSlug));
    const previousPage = albumSlug ? photos().filter(p => p.source === 'immich' && p.album === albumSlug) : [];
    const merged = new Map([...previousPage, ...incoming].map(p => [p.id, p]));
    catalog.photos ||= [];
    catalog.photos.splice(0, catalog.photos.length, ...retained, ...merged.values());
  }
  function removePublicPhotos(albumSlug) {
    catalog.photos ||= [];
    const retained = photos().filter(p => p.source !== 'immich' || (albumSlug && p.album !== albumSlug));
    catalog.photos.splice(0, catalog.photos.length, ...retained);
  }
  async function loadImmich(albumSlug) {
    if (loadPromise) return loadPromise;
    const album = albumSlug && connection.albums.find(a => a.slug === albumSlug && a.nextCursor);
    const controller = new AbortController(), generation = ++loadGeneration;
    let timedOut = false;
    loadController = controller;
    const current = () => generation === loadGeneration && windows.size > 0;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, requestTimeoutMs);
    loadTimer = timer;
    connection = { ...connection, phase: 'loading' }; redraw();
    loadPromise = (async () => {
      try {
        const suffix = album ? `&album=${encodeURIComponent(album.slug)}&cursor=${encodeURIComponent(album.nextCursor)}` : '';
        const response = await fetch(`${ENDPOINT}?action=list${suffix}`, { credentials: 'same-origin', signal: controller.signal, redirect: 'error' });
        if (!current()) return;
        if (controller.signal.aborted) throw new Error('aborted');
        const body = await response.json();
        if (!current()) return;
        if (controller.signal.aborted) throw new Error('aborted');
        if (!Array.isArray(body.albums) || !Array.isArray(body.photos) || body.photos.length > 480) throw new Error('unavailable');
        if (body.reason === 'not_configured') {
          removePublicPhotos();
          connection = { phase: 'idle', connected: false, reason: 'not_configured', albums: [], loaded: 0 }; return;
        }
        if (body.connected !== true) {
          const revoked = body.reason === 'share_not_allowed' || (Array.isArray(body.failures) && body.failures.length > 0 && body.failures.every(f => f.reason === 'share_not_allowed' || f.reason === 'album_not_allowed'));
          // An explicit failed refresh cannot keep presenting an earlier remote projection as live.
          removePublicPhotos(album?.slug);
          const remaining = album ? connection.albums.filter(a => a.slug !== album.slug) : [];
          connection = { phase: 'error', connected: false, reason: revoked ? 'share_not_allowed' : 'unavailable', albums: remaining, loaded: photos().filter(p => p.source === 'immich').length }; return;
        }
        if (!response.ok) throw new Error('unavailable');
        const safeAlbums = body.albums.filter(a => a && typeof a.slug === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(a.slug) && (!album || a.slug === album.slug)).map(a => ({ slug: a.slug, title: String(a.title || '').slice(0, 100), nextCursor: typeof a.nextCursor === 'string' && /^[A-Za-z0-9_-]{40,4096}$/.test(a.nextCursor) ? a.nextCursor : null }));
        const validAlbums = new Set(safeAlbums.map(a => a.slug));
        const incoming = body.photos.map(projectedPhoto).filter(p => p && validAlbums.has(p.album));
        replacePublicPhotos(incoming, album?.slug);
        const merged = album ? connection.albums.filter(a => a.slug !== album.slug).concat(safeAlbums) : safeAlbums;
        connection = { phase: 'ready', connected: true, reason: body.reason === 'partial' ? 'partial' : 'connected', albums: merged, loaded: photos().filter(p => p.source === 'immich').length };
        notify?.(t('公开相册已加载。', 'Public albums loaded.'));
      } catch {
        if (!current()) return;
        if (!album) removePublicPhotos();
        connection = { ...connection, phase: 'error', connected: false, reason: timedOut ? 'timeout' : 'unavailable', albums: album ? connection.albums : [], loaded: photos().filter(p => p.source === 'immich').length };
      } finally {
        clearTimeout(timer);
        if (current()) { loadPromise = undefined; loadController = null; loadTimer = undefined; redraw(); }
      }
    })();
    return loadPromise;
  }
  function redraw() {
    for (const [id, state] of windows) {
      if (!state.host.isConnected) continue;
      if (state.app === 'photos') drawPhotos(state.host, id); else drawMap(state.host, id);
    }
  }
  function drawPhotos(host, windowID, scrollTop = host.scrollTop || 0) {
    const state = windows.get(windowID), list = visiblePhotos(photos(), state.region), selected = photos().find(p => p.id === state.selectedID);
    host.innerHTML = `<section class="sp-photos${selected ? ' sp-photos--detail' : ''}" aria-label="${t('旅途相册', 'Travel photographs')}"><header class="sp-media-header"><div><p class="sp-media-kicker">BEAR / FIELD ARCHIVE</p><h2>${selected ? html(selected.title) : t('把路上的光，带回来。', 'Light gathered along the way.')}</h2></div>${routeButton('map', selected?.region || (state.region === 'all' ? '' : state.region), t('去过的地方 ↗', 'Explore places ↗'), 'sp-media-link')}</header>${selected ? `<div class="sp-photo-detail"><nav class="sp-photo-detail__nav" aria-label="${t('照片导航', 'Photograph navigation')}"><button data-photo-back>← ${t('返回相册', 'Back to photographs')}</button><span>${Math.max(1, list.findIndex(p => p.id === selected.id) + 1)} / ${list.length}</span><div><button data-photo-prev aria-label="${t('上一张照片', 'Previous photograph')}">←</button><button data-photo-next aria-label="${t('下一张照片', 'Next photograph')}">→</button></div></nav><figure>${image(selected, 'sp-photo-detail__image', true)}<figcaption><div><strong>${html(selected.title)}</strong><p>${html(selected.place)} · ${selected.source === 'immich' ? t('作者选定的公开相册', 'Selected public album') : t('熊鑫伟 摄', 'Photograph by Xinwei')}</p></div>${selected.region ? routeButton('map', selected.region, t('查看旅行区域 ↗', 'See travel region ↗')) : `<span>${t('未指定旅行区域', 'No travel region assigned')}</span>`}</figcaption></figure><p class="sp-media-hint"><span class="sp-media-hint__keyboard">${t('← → 切换照片 · Esc 返回相册', '← → browse photographs · Esc returns to the album')}</span><span class="sp-media-hint__touch">${t('用上方箭头浏览 · 返回相册继续挑选', 'Use the arrows above to browse · Return to the album to choose another')}</span></p></div>` : `${state.selectedID ? `<p class="sp-media-pending" role="status">${t('选中的公开相册照片尚未加载。加载相册后可以继续查看。', 'The selected public-album photograph is not loaded yet. Load its album to continue.')}</p>` : ''}<nav class="sp-photo-filters" aria-label="${t('按地区筛选照片', 'Filter photographs by region')}">${[['all', t('全部照片', 'All photographs')], ...places().map(p => [p.id, p.name])].map(([id, name]) => `<button data-photo-filter="${html(id)}" aria-pressed="${state.region === id}">${html(name)}<span>${visiblePhotos(photos(), id).length}</span></button>`).join('')}</nav><div class="sp-photo-grid">${list.length ? list.map((p, i) => `<article class="sp-photo-card"><button data-photo-select="${html(p.id)}" aria-label="${html(t('打开照片：', 'Open photograph: ') + p.title)}">${image(p)}<span class="sp-photo-card__index">${String(i + 1).padStart(2, '0')}</span><strong>${html(p.title)}</strong><span class="sp-photo-card__place">${html(p.place)}</span></button></article>`).join('') : `<p class="sp-media-empty">${t('这个区域暂时没有公开照片。', 'No public photographs in this region yet.')}</p>`}</div>${sourcePanel()}${connection.albums.some(a => a.nextCursor) ? `<div class="sp-media-pagination">${connection.albums.filter(a => a.nextCursor).map(a => `<button data-media-more="${html(a.slug)}">${t('继续加载', 'Load more')} · ${html(a.title)} ↓</button>`).join('')}</div>` : ''}<footer class="sp-media-footer">${t('旅行区域来自博客记录。照片未公开 GPS。', 'Travel regions come from the blog. Photo GPS is not published.')}<span>${photos().filter(p => p.source !== 'immich').length} ${t('张博客照片', 'blog photographs')}</span></footer>`}</section>`;
    const on = bind(host, windowID);
    if (selected) fitPhotoToWindow(host, on.signal);
    host.querySelectorAll('[data-photo-filter]').forEach(b => on(b, 'click', () => open('photos', `region:${b.dataset.photoFilter}`)));
    host.querySelectorAll('[data-photo-select]').forEach(b => on(b, 'click', () => open('photos', b.dataset.photoSelect)));
    const back = () => open('photos', `region:${state.region}`);
    const step = direction => open('photos', stepPhoto(photos(), state, direction).selectedID);
    on(host.querySelector('[data-photo-back]'), 'click', back);
    on(host.querySelector('[data-photo-prev]'), 'click', () => step(-1));
    on(host.querySelector('[data-photo-next]'), 'click', () => step(1));
    on(host.closest('[data-space-window]') || host, 'keydown', event => {
      if (!selected || event.target.closest('input,textarea,select')) return;
      if (['ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); event.key === 'Escape' ? back() : step(event.key === 'ArrowLeft' ? -1 : 1); }
    });
    host.scrollTop = scrollTop;
  }
  function fitPhotoToWindow(host, signal) {
    const detail = host.querySelector('.sp-photo-detail');
    if (!detail) return;
    const header = host.querySelector('.sp-media-header'), nav = detail.querySelector('nav'), caption = detail.querySelector('figcaption'), hint = detail.querySelector('.sp-media-hint'), recovery = detail.querySelector('[data-image-recovery]');
    const fit = () => {
      if (signal.aborted || !host.isConnected || !host.clientHeight) return;
      const style = getComputedStyle(detail);
      const reserved = [header, nav, caption, hint, recovery].reduce((sum, node) => sum + (node?.offsetHeight || 0), 0) + (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
      // CSS pixels belong to the actual window, even when the entire desktop
      // is projected into the café monitor. Tiny windows retain normal scroll.
      detail.style.setProperty('--photo-image-height', `${Math.max(128, Math.min(460, host.clientHeight - reserved - 8))}px`);
    };
    fit();
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(fit);
      for (const node of [host, header, nav, caption, hint, recovery]) if (node) observer.observe(node);
      signal.addEventListener('abort', () => observer.disconnect(), { once: true });
    } else window.addEventListener('resize', fit, { signal });
  }
  function renderPhotos(host, payload = '', windowID = 'photos') {
    const previous = windows.get(windowID);
    const next = photoState(photos(), payload, previous || {}), galleryScrolls = previous?.galleryScrolls || new Map();
    const currentTop = previous?.host?.scrollTop || 0;
    if (previous?.app === 'photos' && !previous.selectedID) galleryScrolls.set(previous.region, currentTop);
    // Window bodies survive app renders. A newly selected photograph must not
    // inherit the gallery's scroll; returning restores that region's position.
    const scrollTop = next.selectedID ? next.selectedID === previous?.selectedID ? currentTop : 0 : galleryScrolls.get(next.region) || 0;
    const restoreFocus = previous?.selectedID && !next.selectedID && host.contains?.(document.activeElement);
    const galleryReturnID = next.selectedID && previous?.selectedID && next.region === previous.region ? previous.galleryReturnID || previous.selectedID : next.selectedID;
    windows.set(windowID, { app: 'photos', host, ...next, galleryScrolls, galleryReturnID }); drawPhotos(host, windowID, scrollTop);
    if (restoreFocus) [...host.querySelectorAll('[data-photo-select]')].find(button => button.dataset.photoSelect === (previous.galleryReturnID || previous.selectedID))?.focus({ preventScroll: true });
  }
  function mapSVG(state) {
    const view = boundMap(state.view), pinSize = view.width / 120, textSize = view.width / 100;
    const grid = [];
    for (let lon = -180; lon <= 180; lon += 20) grid.push(`<path d="M${(lon + 180) * 2} 0V360"/><text x="${(lon + 180) * 2 + 2}" y="${view.y + view.height - 3}" font-size="${textSize * .72}">${Math.abs(lon)}°${lon < 0 ? 'W' : 'E'}</text>`);
    for (let lat = -60; lat <= 80; lat += 20) grid.push(`<path d="M0 ${(90 - lat) * 2}H720"/><text x="${view.x + 3}" y="${(90 - lat) * 2 - 2}" font-size="${textSize * .72}">${Math.abs(lat)}°${lat < 0 ? 'S' : 'N'}</text>`);
    const labels = [[80, 43, t('亚洲', 'ASIA')], [132, 10, t('太平洋', 'PACIFIC OCEAN')], [73, -12, t('印度洋', 'INDIAN OCEAN')]];
    return `<svg data-media-map viewBox="${view.x} ${view.y} ${view.width} ${view.height}" role="group" aria-label="${t('公开旅行区域地图，可用下方地区列表选择', 'Public travel regions. Select a place from the list below.')}"><rect x="0" y="0" width="720" height="360" class="sp-map-ocean"/><g class="sp-map-grid">${grid.join('')}</g><path class="sp-map-land" d="${LAND_PATH}" fill-rule="evenodd"/><g class="sp-map-label">${labels.map(([lon, lat, name]) => { const p = projectCoordinate(lon, lat); return `<text x="${p.x}" y="${p.y}" font-size="${textSize * 1.15}">${html(name)}</text>`; }).join('')}</g>${places().map(p => { const point = projectCoordinate(Number(p.lon), Number(p.lat)), selected = state.placeID === p.id; return `<g class="sp-map-pin" data-map-pin="${html(p.id)}" data-selected="${selected}" role="button" tabindex="0" aria-label="${html(p.name)}" aria-pressed="${selected}"><title>${html(p.name)}</title><circle class="sp-map-pin__halo" cx="${point.x}" cy="${point.y}" r="${pinSize * 1.75}"/><circle cx="${point.x}" cy="${point.y}" r="${pinSize * .55}"/><text x="${point.x + pinSize * 1.8}" y="${point.y + textSize * .25}" font-size="${textSize}">${html(p.name)}</text></g>`; }).join('')}</svg>`;
  }
  function drawMap(host, windowID) {
    const state = windows.get(windowID), place = placeByID(state.placeID) || places()[0], related = photos().filter(p => p.region === place?.id), matches = writing(place);
    host.innerHTML = `<section class="sp-places"><header class="sp-media-header"><div><p class="sp-media-kicker">BEAR / PLACES & FIELD NOTES</p><h2>${t('从一段路，找到一个故事。', 'A place leads to a story.')}</h2></div>${routeButton('photos', place ? `region:${place.id}` : '', t('浏览相册 ↗', 'Photographs ↗'), 'sp-media-link')}</header><div class="sp-map-frame"><div class="sp-map-viewport" data-map-viewport tabindex="0" aria-label="${t('地图：方向键移动，加减号缩放', 'Map: arrow keys pan, plus and minus zoom')}">${mapSVG(state)}</div><div class="sp-map-controls" aria-label="${t('地图控制', 'Map controls')}"><button data-map-zoom="in" aria-label="${t('放大地图', 'Zoom in')}">+</button><button data-map-zoom="out" aria-label="${t('缩小地图', 'Zoom out')}">−</button><button data-map-fit>${t('查看所有区域', 'Fit places')}</button><button data-map-reset>${t('世界', 'World')}</button></div><span class="sp-map-caption">${t('等距经纬投影 · 区域中心', 'Equirectangular · region centers')}</span></div><nav class="sp-place-list" aria-label="${t('选择旅行区域', 'Choose a travel region')}">${places().map((p, i) => `<button data-place-select="${html(p.id)}" aria-pressed="${place?.id === p.id}"><span>${String(i + 1).padStart(2, '0')}</span><strong>${html(p.name)}</strong><small>${photos().filter(photo => photo.region === p.id).length} ${t('张照片', 'photos')}</small></button>`).join('')}</nav>${place ? `<article class="sp-place-detail"><div class="sp-place-detail__intro"><p class="sp-media-kicker">${html(Math.abs(place.lat).toFixed(2))}°${place.lat < 0 ? 'S' : 'N'} / ${html(Math.abs(place.lon).toFixed(2))}°${place.lon < 0 ? 'W' : 'E'}</p><h3>${html(place.name)}</h3><p>${html(place.description)}</p><div class="sp-place-counts"><span>${related.length} ${t('张公开照片', 'public photographs')}</span><span>${matches.length} ${t('篇相关写作', 'related articles')}</span></div></div><div class="sp-place-photos">${related.slice(0, 4).map(p => `<article><button data-media-open="photos" data-media-payload="${html(p.id)}" aria-label="${html(p.title)}">${image(p)}<span>${html(p.title)}</span></button></article>`).join('') || `<p class="sp-media-empty">${t('这个区域暂时没有公开照片。', 'No public photographs here yet.')}</p>`}</div>${matches.length ? `<div class="sp-place-writing"><h4>${t('走过之后，写了这些。', 'Writing from the journey.')}</h4>${matches.slice(0, 4).map(a => `<button data-media-open="reader" data-media-payload="${html(a.url)}"><div><small>${html(a.date || '')}</small><strong>${html(a.title)}</strong></div><span aria-hidden="true">↗</span></button>`).join('')}</div>` : `<p class="sp-media-empty">${t('相关游记还未收录在当前阅读目录。', 'Travel writing has not been included in this reading catalog yet.')}</p>`}</article>` : ''}<footer class="sp-media-footer"><span>${t('标记来自已公开旅行记录，代表区域中心；不是照片 GPS。', 'Markers are public travel region centers, not photo GPS.')}</span><a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">Natural Earth 1:110m ↗</a></footer></section>`;
    const on = bind(host, windowID), viewport = host.querySelector('[data-map-viewport]');
    if (place) {
      const summary = document.createElement('div'); summary.className = 'sp-place-current'; summary.dataset.placeCurrent = place.id;
      summary.innerHTML = `<div><small>${t('当前旅行区域', 'Selected travel region')}</small><strong>${html(place.name)}</strong><span>${related.length} ${t('张照片', 'photos')} · ${matches.length} ${t('篇写作', 'articles')}</span></div><button type="button" data-place-story>${t('看故事 ↓', 'Read the story ↓')}</button>`;
      host.querySelector('.sp-map-frame').before(summary);
      const detail = host.querySelector('.sp-place-detail'), heading = detail?.querySelector('h3');
      if (heading) heading.tabIndex = -1;
      on(summary.querySelector('[data-place-story]'), 'click', () => { detail?.scrollIntoView({ block: 'start', behavior: 'auto' }); heading?.focus({ preventScroll: true }); });
    }
    const changeView = view => { state.view = boundMap(view); viewport.innerHTML = mapSVG(state); };
    const select = id => {
      const fromPin = document.activeElement?.closest?.('[data-map-pin]');
      state.placeID = id; open('map', id); host.scrollTop = 0;
      if (fromPin) [...host.querySelectorAll('[data-map-pin]')].find(pin => pin.dataset.mapPin === id)?.focus?.({ preventScroll: true });
    };
    on(viewport, 'click', event => { const pin = event.target.closest('[data-map-pin]'); if (pin) select(pin.dataset.mapPin); });
    on(viewport, 'keydown', event => { const pin = event.target.closest('[data-map-pin]'); if (pin && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.stopPropagation(); select(pin.dataset.mapPin); } });
    host.querySelectorAll('[data-place-select]').forEach(b => on(b, 'click', () => select(b.dataset.placeSelect)));
    host.querySelectorAll('[data-map-zoom]').forEach(b => on(b, 'click', () => changeView(zoomMap(state.view, b.dataset.mapZoom === 'in' ? 1.4 : 1 / 1.4))));
    on(host.querySelector('[data-map-fit]'), 'click', () => changeView(fitMap(places())));
    on(host.querySelector('[data-map-reset]'), 'click', () => changeView({ x: 0, y: 0, width: 720, height: 360 }));
    on(viewport, 'keydown', event => {
      if (event.target.closest('[data-map-pin]')) return;
      const shift = state.view.width / 10;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        if (['+', '=', '-'].includes(event.key)) changeView(zoomMap(state.view, event.key === '-' ? 1 / 1.4 : 1.4));
        else changeView(panMap(state.view, event.key === 'ArrowLeft' ? -shift : event.key === 'ArrowRight' ? shift : 0, event.key === 'ArrowUp' ? -shift : event.key === 'ArrowDown' ? shift : 0));
      }
    });
    let drag;
    on(viewport, 'pointerdown', event => { if (event.button !== 0 || event.target.closest('[data-map-pin]')) return; drag = { id: event.pointerId, x: event.clientX, y: event.clientY, view: state.view }; viewport.setPointerCapture(event.pointerId); viewport.dataset.dragging = 'true'; });
    on(viewport, 'pointermove', event => { if (!drag || drag.id !== event.pointerId) return; const rect = viewport.getBoundingClientRect(); changeView(panMap(drag.view, (drag.x - event.clientX) / rect.width * drag.view.width, (drag.y - event.clientY) / rect.width * drag.view.width)); });
    const end = () => { drag = null; delete viewport.dataset.dragging; };
    on(viewport, 'pointerup', end); on(viewport, 'pointercancel', end);
    on(viewport, 'wheel', event => { if (!event.ctrlKey && !event.metaKey) return; event.preventDefault(); const matrix = viewport.querySelector('svg').getScreenCTM(); if (!matrix) return; const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()); changeView(zoomMap(state.view, event.deltaY < 0 ? 1.15 : 1 / 1.15, point)); }, { passive: false });
  }
  function renderMap(host, payload = '', windowID = 'map') {
    const previous = windows.get(windowID), id = typeof payload === 'string' ? payload.replace(/^place:/, '') : '';
    const photo = photos().find(p => p.id === id || p.id === id.replace(/^photo:/, ''));
    windows.set(windowID, { app: 'map', host, placeID: placeByID(id)?.id || placeByID(photo?.region)?.id || previous?.placeID || places()[0]?.id, view: previous?.view || fitMap(places()) }); drawMap(host, windowID);
  }
  return { renderPhotos, renderMap, dispose(windowID) { listeners.get(windowID)?.abort(); listeners.delete(windowID); windows.delete(windowID); if (!windows.size && loadController) { ++loadGeneration; clearTimeout(loadTimer); loadController.abort(); loadController = null; loadPromise = undefined; loadTimer = undefined; connection = { ...connection, phase: 'idle', connected: false, reason: 'cancelled' }; } }, status() { return { ...connection, albums: connection.albums.map(a => ({ slug: a.slug, title: a.title, hasMore: !!a.nextCursor })) }; } };
}
