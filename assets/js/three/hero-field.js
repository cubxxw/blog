/* ============================================================
   hero-field.js — homepage hero ambient field (minimal, restrained)
   ------------------------------------------------------------
   A single full-screen fragment shader behind the hero text: a
   very slow, low-contrast flowing gradient with a few sparse drifting
   light motes. Deliberately the CHEAPEST possible WebGL form — one
   fullscreen triangle, no geometry, no lights, no textures — so it
   costs almost nothing per frame and never competes with reading.

   Colour is sampled from the live `--accent` CSS variable, so the
   field follows the light/dark theme automatically with zero JS
   branching. A faint mouse parallax gives it just enough life to
   feel alive without ever drawing attention to itself.

   All gating (WebGL probe, reduced-motion, off-screen pause, DPR
   clamp) is delegated to webgl-guard.js so this file only describes
   the *look*, not the safety rules.
   ============================================================ */

import * as THREE from 'three';
import { shouldRun3D, clampDPR, createRenderLoop } from './webgl-guard.js';

/** Read a CSS custom property off an element and parse it to [r,g,b] 0..1. */
function readAccent(el) {
  const raw = getComputedStyle(el).getPropertyValue('--accent').trim() || '#888888';
  // Accept #rgb / #rrggbb. Anything else falls back to a neutral grey.
  let hex = raw.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length !== 6) return [0.5, 0.5, 0.5];
  const n = parseInt(hex, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uMouse;     // -1..1 parallax offset
  uniform vec3  uAccent;    // theme accent
  uniform float uAspect;

  // Cheap value-noise — enough for a soft cloudy gradient, no textures.
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  void main() {
    vec2 uv = vUv;
    uv.x *= uAspect;

    // Two slow noise octaves drifting in different directions + mouse parallax.
    vec2 p = uv * 1.6 + uMouse * 0.15;
    float n = noise(p + uTime * 0.015);
    n += 0.5 * noise(p * 2.0 - uTime * 0.02);
    n /= 1.5;

    // Sparse soft motes: a few bright pinpoints that breathe in and out.
    float motes = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 c = vec2(
        0.5 + 0.42 * sin(uTime * 0.05 + fi * 2.4),
        0.5 + 0.40 * cos(uTime * 0.04 + fi * 1.7)
      );
      c.x *= uAspect;
      float d = distance(uv, c);
      motes += 0.012 / (d + 0.04) * (0.5 + 0.5 * sin(uTime * 0.3 + fi));
    }

    // Compose: a barely-there accent wash + the motes, all low-alpha so
    // the hero text always wins. The base alpha is deliberately low and the
    // wash range narrowed so the field reads as an ambient glow that varies
    // across the canvas — never a flat filled panel. The CSS mask then melts
    // the whole thing into the page at the edges.
    float wash = smoothstep(0.35, 0.95, n);
    vec3 col = uAccent * (0.55 + 0.45 * wash) + uAccent * motes;
    float alpha = (0.04 + 0.15 * wash + motes * 0.6);

    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.42));
  }
`;

/**
 * Mount the hero field onto a host element. Safe to call unconditionally —
 * it self-aborts (and the host stays transparent) when 3D shouldn't run.
 *
 * @param {HTMLElement} host  Positioned container; canvas fills it absolutely.
 * @param {HTMLElement} [themeEl=document.body]  Element to read --accent from.
 * @returns {{ dispose: Function } | null}
 */
export function mountHeroField(host, themeEl = document.body) {
  if (!host) return null;
  // Desktop-only is intentional: the field is a delight, not a feature, and
  // phones get the clean static hero with zero WebGL cost.
  const gate = shouldRun3D({ minWidth: 768, desktopOnly: true });
  if (!gate.ok) return null;

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setPixelRatio(clampDPR(2));

  const size = () => ({ w: host.clientWidth, h: host.clientHeight });
  let { w, h } = size();
  renderer.setSize(w, h);
  Object.assign(renderer.domElement.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  });
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera(); // identity; we draw a fullscreen tri

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uAccent: { value: new THREE.Vector3(...readAccent(themeEl)) },
    uAspect: { value: w / Math.max(h, 1) },
  };

  const geom = new THREE.BufferGeometry();
  // One oversized triangle covering clip space (the classic fullscreen trick).
  geom.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(
    new Float32Array([0, 0, 2, 0, 0, 2]), 2));

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geom, material);
  scene.add(mesh);

  // Smoothed mouse parallax — lerp toward target so it eases, never jitters.
  // Cache the host rect and refresh it only on scroll/resize; reading it per
  // mousemove (up to ~120/s) forces a synchronous layout every event.
  let hostRect = host.getBoundingClientRect();
  const refreshRect = () => { hostRect = host.getBoundingClientRect(); };
  const target = new THREE.Vector2(0, 0);
  const onMouse = (e) => {
    if (!loop.running) return; // idle while paused/off-screen — no work
    const r = hostRect;
    target.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      ((e.clientY - r.top) / r.height) * 2 - 1
    );
  };
  window.addEventListener('mousemove', onMouse, { passive: true });
  window.addEventListener('scroll', refreshRect, { passive: true });

  // Re-read accent when the theme toggles (PaperMod flips a class on <body>).
  const themeObserver = new MutationObserver(() => {
    uniforms.uAccent.value.set(...readAccent(themeEl));
  });
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

  const onResize = () => {
    ({ w, h } = size());
    renderer.setSize(w, h);
    uniforms.uAspect.value = w / Math.max(h, 1);
    refreshRect();
  };
  window.addEventListener('resize', onResize, { passive: true });

  const loop = createRenderLoop(host, (dt, t) => {
    uniforms.uTime.value = t;
    uniforms.uMouse.value.lerp(target, 0.04);
    renderer.render(scene, camera);
  }, {
    onDispose() {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('scroll', refreshRect);
      window.removeEventListener('resize', onResize);
      themeObserver.disconnect();
      geom.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
  });
  loop.start();

  return { dispose: loop.dispose };
}
