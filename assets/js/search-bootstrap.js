import * as params from '@params';

(() => {
  let loading;

  function addScript(src, integrity) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.integrity = integrity;
      script.crossOrigin = 'anonymous';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function loadSearch() {
    if (!loading) {
      loading = addScript(params.fuseSrc, params.fuseIntegrity)
        .then(() => addScript(params.paletteSrc, params.paletteIntegrity));
    }
    return loading;
  }

  function isShortcut(event) {
    return event.key === '/' ||
      ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k');
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-search-trigger], .nav-search-trigger');
    if (!trigger || window.__searchPaletteReady) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    loadSearch().then(() => trigger.click());
  }, true);

  document.addEventListener('keydown', event => {
    if (!isShortcut(event) || window.__searchPaletteReady) return;
    if (event.key === '/' && /input|textarea|select/i.test(event.target.tagName)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    loadSearch().then(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        bubbles: true
      }));
    });
  }, true);
})();
