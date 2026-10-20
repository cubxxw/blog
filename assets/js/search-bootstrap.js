import * as params from '@params';

(() => {
  const palette = document.getElementById('search-command-palette');
  if (!palette) return;
  const input = palette.querySelector('.search-palette__input');
  const status = document.getElementById('search-empty');
  const retry = document.getElementById('search-index-retry');
  const fullLink = document.getElementById('search-full-link');
  const triggers = document.querySelectorAll('[data-search-trigger], .nav-search-trigger');
  const zh = document.documentElement.lang.toLowerCase().startsWith('zh');
  let loading, owned = false, returnFocus = null, state = 'idle', intent = 0, attempts = 0;

  function loadSearch() {
    if (window.__searchPaletteReady) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const src = new URL(params.controllerSrc, window.location.href);
      // Removing a script does not necessarily cancel its in-flight fetch.
      // Explicit recovery must not join that same stalled browser request.
      if (++attempts > 1) src.searchParams.set('search-retry', String(attempts));
      script.src = src.href;
      script.integrity = params.controllerIntegrity;
      script.crossOrigin = 'anonymous';
      const fail = timedOut => {
        clearTimeout(timer); script.onload = script.onerror = null; script.remove();
        const error = new Error('Search controller unavailable');
        error.name = timedOut ? 'TimeoutError' : 'Error';
        reject(error);
      };
      const timer = setTimeout(() => fail(true), 15000);
      script.onload = () => {
        clearTimeout(timer);
        if (window.__searchPaletteReady) resolve();
        else fail(false);
      };
      script.onerror = () => fail(false);
      document.head.appendChild(script);
    });
    loading.catch(() => { loading = null; });
    return loading;
  }

  function activate() {
    if (!owned) return;
    owned = false; intent++;
    document.dispatchEvent(new CustomEvent('search:activate', { detail: { returnFocus } }));
    returnFocus = null;
  }

  function start() {
    if (state === 'loading') return;
    state = 'loading'; const current = ++intent;
    input.setAttribute('aria-busy', 'true');
    status.hidden = false;
    status.textContent = zh ? '正在准备搜索…' : 'Preparing search…';
    retry.setAttribute('aria-disabled', 'true');
    loadSearch().then(() => { if (owned && current === intent) activate(); }).catch(error => {
      if (!owned || current !== intent) return;
      state = 'error'; input.setAttribute('aria-busy', 'false');
      status.textContent = error.name === 'TimeoutError'
        ? (zh ? '搜索超时，请重试。' : 'Search timed out. Please try again.')
        : (zh ? '暂时无法搜索，请重试。' : 'Search is unavailable. Please try again.');
      retry.hidden = false; retry.setAttribute('aria-disabled', 'false');
    });
  }

  function open(trigger) {
    if (owned) return;
    owned = true; returnFocus = trigger || document.activeElement; state = 'idle';
    palette.removeAttribute('hidden'); document.body.classList.add('search-palette-open');
    triggers.forEach(t => t.setAttribute('aria-expanded', 'true'));
    retry.hidden = true; input.focus(); start();
  }

  function close() {
    owned = false; intent++; state = 'idle';
    palette.setAttribute('hidden', ''); document.body.classList.remove('search-palette-open');
    triggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
    input.value = ''; input.setAttribute('aria-busy', 'false');
    status.hidden = true; retry.hidden = true;
    if (fullLink) { const url = new URL(fullLink.href); url.searchParams.delete('q'); fullLink.href = url.href; }
    returnFocus?.focus({ preventScroll: true }); returnFocus = null;
  }

  function isShortcut(event) {
    return event.key === '/' ||
      ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k');
  }

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (owned && target.closest('.search-palette__close, .search-palette__backdrop, #search-index-retry')) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (target.closest('#search-index-retry')) start(); else close();
      return;
    }
    const trigger = target.closest('[data-search-trigger], .nav-search-trigger');
    if (!trigger || (!owned && window.__searchPaletteReady)) return;
    event.preventDefault(); event.stopImmediatePropagation(); open(trigger);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.isComposing || event.keyCode === 229) return;
    if (owned) {
      event.stopImmediatePropagation();
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      else if (isShortcut(event) && (event.metaKey || event.ctrlKey)) event.preventDefault();
      else if (event.key === 'Enter' && event.target === input) event.preventDefault();
      else if (event.key === 'Tab') {
        const items = [...palette.querySelectorAll('a[href],button,input,[tabindex]')]
          .filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
      return;
    }
    if(document.querySelector('[data-product-space][data-product-view="bear"] [data-bear-workspace][data-ready="true"]'))return;
    if (!isShortcut(event) || window.__searchPaletteReady) return;
    if (event.key === '/' && /input|textarea|select/i.test(event.target.tagName)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    open(document.activeElement);
  }, true);

  input.addEventListener('input', event => {
    if (!owned) return;
    event.stopImmediatePropagation();
    if (fullLink) {
      const url = new URL(fullLink.href), query = input.value.trim();
      if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
      fullLink.href = url.href;
    }
  }, true);
  // A removed/timed-out script may still finish. Adopt it only while this
  // dialog is still owned, preserving the latest query and return focus.
  document.addEventListener('search:controller-ready', activate);
})();
