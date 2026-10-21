const mounted = new WeakMap();

// Fullscreen changes presentation only. The existing workspace keeps its DOM
// owner, notes and window state through browser-initiated exits as well.
export function mountFullscreen(root) {
  if (mounted.has(root)) return mounted.get(root);
  const doc = root.ownerDocument, win = doc.defaultView;
  const zh = JSON.parse(root.querySelector('[data-space-catalog]')?.textContent || '{}').language === 'zh';
  const t = (cn,en) => zh ? cn : en;
  const controls = [...root.querySelectorAll('[data-space-fullscreen]')];
  const supported = typeof root.requestFullscreen === 'function' && typeof doc.exitFullscreen === 'function' && doc.fullscreenEnabled !== false;
  const abort = new AbortController();
  const status = doc.createElement('p');
  status.className = 'space-sr-only';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  root.append(status);
  let pending = false, disposed = false;
  function sync() {
    const active = doc.fullscreenElement === root;
    root.dataset.fullscreen = String(active);
    root.dataset.fullscreenSupported = String(supported);
    const label = !supported ? t('浏览器不支持系统全屏','System fullscreen is unavailable') : active ? t('退出全屏','Exit fullscreen') : t('进入全屏','Enter fullscreen');
    for (const button of controls) {
      button.disabled = !supported || pending;
      button.setAttribute('aria-pressed',String(active));
      button.setAttribute('aria-label',label);button.title = label;
      const text = button.querySelector('[data-space-fullscreen-label]');
      if (text) text.textContent = label;
    }
  }
  async function toggle(event) {
    const button = event.target.closest?.('[data-space-fullscreen]');
    if (!button || !root.contains(button) || !supported || pending || disposed) return;
    pending = true;sync();status.textContent = '';
    try {
      if (doc.fullscreenElement === root) await doc.exitFullscreen();
      else await root.requestFullscreen({navigationUI:'hide'});
    } catch {
      if (!disposed) status.textContent = t('未能切换系统全屏，仍可继续使用当前空间。','Fullscreen could not change. You can continue using the room.');
    } finally {
      pending = false;if (!disposed) sync();
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;abort.abort();hiddenObserver.disconnect();status.remove();mounted.delete(root);
  }
  // Product Lab is a sibling of the room. Release the top-layer owner when
  // switching away so the browser cannot keep a hidden room over that view.
  const hiddenObserver = new MutationObserver(()=>{
    if (root.hidden && doc.fullscreenElement === root) doc.exitFullscreen().catch(()=>{});
  });
  hiddenObserver.observe(root,{attributes:true,attributeFilter:['hidden']});
  root.addEventListener('click',toggle,{signal:abort.signal});
  doc.addEventListener('fullscreenchange',sync,{signal:abort.signal});
  win?.addEventListener('pagehide',event=>{if (!event.persisted) dispose();},{signal:abort.signal});
  const controller = {dispose};mounted.set(root,controller);sync();return controller;
}
