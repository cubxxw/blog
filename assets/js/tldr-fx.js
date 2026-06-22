/*
  TL;DR ambient FX — a tiny canvas "neural field" behind the TL;DR block.
  Draws a handful of slow-drifting nodes with faint connecting lines to give
  an understated "AI" feel. Intentionally lightweight (no WebGL, no deps):
    - bails out entirely on prefers-reduced-motion
    - only animates while the block is on screen (IntersectionObserver)
    - caps node count + DPR so the cost stays negligible
  Colour is read from the computed --color-accent so it tracks light/dark themes.
*/
(function () {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  var blocks = document.querySelectorAll('[data-tldr-fx]');
  if (!blocks.length) return;

  function toRGBA(color, alpha) {
    // Accept "rgb(...)", "rgba(...)" or "#rrggbb"; fall back to a neutral ink.
    var c = (color || '').trim();
    var m;
    if ((m = c.match(/^#([0-9a-f]{6})$/i))) {
      var n = parseInt(m[1], 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
    }
    if ((m = c.match(/^rgba?\(([^)]+)\)$/i))) {
      var parts = m[1].split(',').map(function (s) { return s.trim(); });
      return 'rgba(' + parts[0] + ',' + parts[1] + ',' + parts[2] + ',' + alpha + ')';
    }
    return 'rgba(120,120,120,' + alpha + ')';
  }

  function initBlock(block) {
    var canvas = block.querySelector('.article-tldr__fx');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var accent = getComputedStyle(block).getPropertyValue('--color-accent') ||
      getComputedStyle(document.documentElement).getPropertyValue('--color-accent');
    var lineColor = toRGBA(accent, 0.16);
    var dotColor = toRGBA(accent, 0.5);

    var w = 0, h = 0;
    var nodes = [];
    var running = false;
    var rafId = 0;

    function resize() {
      var r = block.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Node density scales with width but is hard-capped for performance.
      var count = Math.min(14, Math.max(6, Math.round(w / 60)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          r: 0.8 + Math.random() * 1.4
        });
      }
    }

    function step() {
      ctx.clearRect(0, 0, w, h);
      var i, j, a, b, dx, dy, dist;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
      }
      // Connecting lines (only near pairs).
      ctx.lineWidth = 1;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          dx = a.x - b.x;
          dy = a.y - b.y;
          dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.globalAlpha = 1 - dist / 90;
            ctx.strokeStyle = lineColor;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      // Nodes.
      ctx.fillStyle = dotColor;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafId = requestAnimationFrame(step);
    }

    function start() {
      if (running) return;
      running = true;
      canvas.classList.add('is-on');
      rafId = requestAnimationFrame(step);
    }
    function stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
    }

    resize();

    var ro = ('ResizeObserver' in window) ? new ResizeObserver(function () { resize(); }) : null;
    if (ro) ro.observe(block);
    else window.addEventListener('resize', resize, { passive: true });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0.05 });
      io.observe(block);
    } else {
      start();
    }
  }

  blocks.forEach(initBlock);
})();
