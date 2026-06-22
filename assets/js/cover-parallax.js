/* ============================================================
   cover-parallax.js — article hero cover 2.5D parallax (no WebGL)
   ------------------------------------------------------------
   Writes --cov-rx / --cov-ry (and --cov-active) on the article's
   .entry-cover figure as the cursor moves over it, which the CSS
   (zzz-cover-parallax.css) turns into a gentle perspective tilt.
   Sibling of card-tilt.js — same rAF-batched, dependency-free
   approach — but tuned for the single, large hero cover: a smaller
   peak angle so a big image never tilts too far.

   Self-gates to fine pointers and non-reduced-motion, so phones and
   motion-averse visitors get the flat cover exactly as before. The
   image's own open-reveal + hover-zoom (zzz-cover-motion.css) is
   untouched; this only drives the frame's rotation.
   ============================================================ */

const MAX_DEG = 4; // peak tilt — smaller than the cards: the cover is large

function init() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const cover = document.querySelector('.post-single .entry-cover');
  if (!cover) return; // not an article, or no cover image

  let raf = 0;
  let pending = null;

  function apply() {
    raf = 0;
    if (!pending) return;
    cover.style.setProperty('--cov-rx', pending.rx.toFixed(2) + 'deg');
    cover.style.setProperty('--cov-ry', pending.ry.toFixed(2) + 'deg');
  }

  function onMove(e) {
    const r = cover.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; // 0..1
    const py = (e.clientY - r.top) / r.height; // 0..1
    pending = {
      ry: (px - 0.5) * 2 * MAX_DEG, // left/right → rotateY
      rx: (0.5 - py) * 2 * MAX_DEG, // up/down → rotateX
    };
    if (!raf) raf = requestAnimationFrame(apply);
  }

  function onEnter() {
    cover.style.setProperty('--cov-active', '1');
  }

  function onLeave() {
    cover.style.setProperty('--cov-active', '0');
    cover.style.setProperty('--cov-rx', '0deg');
    cover.style.setProperty('--cov-ry', '0deg');
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    pending = null;
  }

  cover.addEventListener('pointerenter', onEnter);
  cover.addEventListener('pointermove', onMove, { passive: true });
  cover.addEventListener('pointerleave', onLeave);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
