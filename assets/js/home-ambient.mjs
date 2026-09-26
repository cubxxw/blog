// The gate itself has no Three.js dependency. The loader stays untouched until
// decoration is useful, visible, and the browser has spare main-thread time.
export function mountHomeAmbient(loadModules, onOrb) {
  const hero = document.getElementById('hp-about');
  const host = document.getElementById('hp-hero-field');
  const stage = document.getElementById('hp-bear-stage');
  const wrap = document.getElementById('hp-bear-ai');
  if (!hero || !host || !stage || !wrap) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const width = matchMedia('(max-width: 768px)');
  const coarse = matchMedia('(pointer: coarse)');
  const connection = navigator.connection;
  let visible = false, scheduled = null, pending = false, attempted = false;
  let field = null, orb = null, pageHidden = false;
  function eligible() {
    return !pageHidden && !document.hidden && visible && !motion.matches && !width.matches && !coarse.matches
      && !(connection && (connection.saveData || /^(slow-2g|2g|3g)$/.test(connection.effectiveType)));
  }
  function cancelScheduled() {
    if (scheduled === null) return;
    if ('cancelIdleCallback' in window) cancelIdleCallback(scheduled);
    else clearTimeout(scheduled);
    scheduled = null;
  }
  function dispose() {
    cancelScheduled();
    if (field) field.dispose();
    if (orb) orb.dispose();
    field = null; orb = null;
    wrap.classList.remove('has-orb');
    onOrb(null);
  }
  async function mount() {
    scheduled = null;
    if (!eligible() || pending || attempted) return;
    pending = true;
    try {
      // Probe without importing Three, and release this temporary context.
      const canvas = document.createElement('canvas');
      const context = window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      if (!context) { attempted = true; return; }
      const release = context.getExtension('WEBGL_lose_context');
      if (release) release.loseContext();
      const modules = await loadModules();
      if (!eligible()) return;
      attempted = true;
      field = modules[0].mountHeroField(host, host);
      orb = modules[1].mountBearOrb(stage, wrap);
      if (orb) { wrap.classList.add('has-orb'); onOrb(orb); }
    } catch (_) {
      attempted = true;
      dispose(); // CSS artwork and the ordinary chat stay available.
    } finally { pending = false; }
  }
  function reconcile() {
    // Render loops pause themselves off-screen and in background tabs. Destroy
    // GPU resources for a changed user/device preference or page departure.
    if (motion.matches || width.matches || coarse.matches || (connection && (connection.saveData || /^(slow-2g|2g|3g)$/.test(connection.effectiveType)))) {
      dispose(); attempted = false;
    }
    if (!eligible()) { cancelScheduled(); return; }
    if (pending || attempted || scheduled !== null) return;
    scheduled = 'requestIdleCallback' in window ? requestIdleCallback(mount, { timeout: 2500 }) : setTimeout(mount, 2500);
  }
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    reconcile();
  }, { threshold: 0.01 });
  observer.observe(hero);
  motion.addEventListener('change', reconcile);
  width.addEventListener('change', reconcile);
  coarse.addEventListener('change', reconcile);
  if (connection && connection.addEventListener) connection.addEventListener('change', reconcile);
  document.addEventListener('visibilitychange', reconcile);
  window.addEventListener('pagehide', () => { pageHidden = true; dispose(); attempted = false; });
  window.addEventListener('pageshow', () => { pageHidden = false; reconcile(); });
}
