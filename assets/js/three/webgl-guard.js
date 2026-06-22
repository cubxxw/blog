/* ============================================================
   webgl-guard.js — shared gating + lifecycle for every 3D touch
   ------------------------------------------------------------
   This blog is a reading-first site. Any WebGL we add must earn
   its place and cost nothing when it can't help. This module
   centralises the "is it safe / worth it to run 3D here?" checks
   that knowledge-galaxy.html pioneered, so every 3D effect shares
   one restrained baseline instead of re-deriving it:

     • WebGL capability probe        → no context, no 3D
     • prefers-reduced-motion        → respect it, stay static
     • coarse-pointer / tiny screens → opt-out for phones by default
     • IntersectionObserver pause    → never burn GPU off-screen
     • tab-visibility pause          → never animate a hidden tab
     • DPR clamp (≤2)                → cap fill-rate on retina

   Nothing here imports three.js — it is intentionally dependency
   -free so the gate can decide NOT to load three.js at all (the
   expensive ~650KB module) on devices that would never use it.
   ============================================================ */

/** @returns {boolean} true when a WebGL context can actually be created. */
export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

/** @returns {boolean} true when the visitor asked for reduced motion. */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The single decision gate. Returns whether a 3D effect should mount,
 * plus a `reason` for debugging when it shouldn't.
 *
 * @param {object} [opts]
 * @param {number} [opts.minWidth=0]   Skip below this viewport width (px).
 * @param {boolean} [opts.desktopOnly=false] Skip coarse-pointer devices.
 * @returns {{ ok: boolean, reason: string }}
 */
export function shouldRun3D(opts = {}) {
  const { minWidth = 0, desktopOnly = false } = opts;
  if (prefersReducedMotion()) return { ok: false, reason: 'reduced-motion' };
  if (!hasWebGL()) return { ok: false, reason: 'no-webgl' };
  if (window.innerWidth < minWidth) return { ok: false, reason: 'too-narrow' };
  if (desktopOnly && window.matchMedia('(pointer: coarse)').matches) {
    return { ok: false, reason: 'coarse-pointer' };
  }
  return { ok: true, reason: 'ok' };
}

/** Clamp device-pixel-ratio so retina screens don't quadruple fill-rate. */
export function clampDPR(max = 2) {
  return Math.min(window.devicePixelRatio || 1, max);
}

/**
 * Drive a render loop that only runs while the element is on-screen AND
 * the tab is visible. Returns a controller with start/stop/dispose so the
 * caller can tear everything down cleanly (important to avoid leaking GPU
 * contexts on navigation).
 *
 * @param {Element} el        Element to observe for visibility.
 * @param {(dt:number, t:number) => void} onFrame  Per-frame callback.
 * @param {object} [opts]
 * @param {() => void} [opts.onDispose]  Extra cleanup (dispose geometries…).
 * @returns {{ start:Function, stop:Function, dispose:Function, running:boolean }}
 */
export function createRenderLoop(el, onFrame, opts = {}) {
  const { onDispose } = opts;
  let rafId = 0;
  let running = false;
  let onScreen = true;
  let last = 0;

  function tick(now) {
    if (!running) return;
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    onFrame(dt, now / 1000);
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (running || !onScreen || document.hidden) return;
    running = true;
    last = 0;
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  // Pause when scrolled out of view — the most common "wasted GPU" case.
  const io = new IntersectionObserver(
    (entries) => {
      onScreen = entries[0].isIntersecting;
      if (onScreen) start();
      else stop();
    },
    { threshold: 0.01 }
  );
  io.observe(el);

  // Pause on tab switch.
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  function dispose() {
    stop();
    io.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    if (onDispose) onDispose();
  }

  return {
    start,
    stop,
    dispose,
    get running() {
      return running;
    },
  };
}
