/* ============================================================
   card-tilt.js — pointer-driven 3D tilt for cards (no WebGL)
   ------------------------------------------------------------
   A tiny, dependency-free enhancement: any element carrying the
   `data-tilt` attribute gets a restrained 3D tilt that follows the
   cursor, plus a soft specular highlight that tracks the pointer.
   Pure CSS transforms driven by a handful of custom properties —
   no canvas, no three.js, effectively free.

   Deliberately gated to fine pointers and non-reduced-motion: phones
   (which can't hover) and motion-averse visitors get the flat card
   exactly as before. The tilt is small (±MAX_DEG) and eased entirely
   in CSS, so it reads as gentle depth, never a gimmick.

   Custom properties written per card (consumed by the CSS):
     --tilt-rx / --tilt-ry  rotation in degrees
     --tilt-mx / --tilt-my  highlight centre, 0..100%
     --tilt-active          1 while pointer is over the card, else 0
   ============================================================ */

const MAX_DEG = 6; // peak tilt at the card edges — intentionally subtle

function init() {
  // Respect the two opt-outs up front; if either holds, do nothing at all.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const cards = document.querySelectorAll('[data-tilt]');
  cards.forEach((card) => {
    let raf = 0;
    let pending = null;
    let rect = null; // cached bounds; set on enter, refreshed on scroll/resize

    function apply() {
      raf = 0;
      if (!pending) return;
      const { rx, ry, mx, my } = pending;
      card.style.setProperty('--tilt-rx', rx.toFixed(2) + 'deg');
      card.style.setProperty('--tilt-ry', ry.toFixed(2) + 'deg');
      card.style.setProperty('--tilt-mx', mx.toFixed(1) + '%');
      card.style.setProperty('--tilt-my', my.toFixed(1) + '%');
    }

    function onMove(e) {
      const r = rect || (rect = card.getBoundingClientRect());
      const px = (e.clientX - r.left) / r.width; // 0..1
      const py = (e.clientY - r.top) / r.height; // 0..1
      // Map cursor position to opposing rotations: top tilts back, etc.
      pending = {
        ry: (px - 0.5) * 2 * MAX_DEG, // left/right → rotateY
        rx: (0.5 - py) * 2 * MAX_DEG, // up/down → rotateX
        mx: px * 100,
        my: py * 100,
      };
      if (!raf) raf = requestAnimationFrame(apply);
    }

    function onEnter() {
      rect = card.getBoundingClientRect(); // cache once; reused every move
      card.style.setProperty('--tilt-active', '1');
    }

    function onLeave() {
      // Ease back to flat; CSS transitions handle the actual return.
      card.style.setProperty('--tilt-active', '0');
      card.style.setProperty('--tilt-rx', '0deg');
      card.style.setProperty('--tilt-ry', '0deg');
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      pending = null;
      rect = null;
    }

    // Only recompute the cached rect while hovering, and only when the layout
    // could actually have shifted — never per pointermove.
    function refreshRect() { if (rect) rect = card.getBoundingClientRect(); }

    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('pointermove', onMove, { passive: true });
    card.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', refreshRect, { passive: true });
    window.addEventListener('resize', refreshRect, { passive: true });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
