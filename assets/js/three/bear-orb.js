/* ============================================================
   bear-orb.js — the AI core: a living shader sphere + neural field
   ------------------------------------------------------------
   Replaces the flat CSS avatar puck with a single energy-body orb:

     • an Icosahedron (subdiv 5) whose vertices breathe via 3D simplex
       noise in the vertex shader, so the surface undulates organically
       instead of reading as a plastic ball;
     • a Fresnel rim glow in the fragment shader — bright edge, dark
       core — composited ADDITIVELY so it reads as emitted light;
     • a few hundred Points scattered on a shell around it, slowly
       spinning, with LineSegments wiring near neighbours into a
       drifting neural network (the most direct "AI" metaphor);
     • pointer parallax (the orb leans toward the cursor, particles
       drift after it) and a click "energy pulse" (uAmp eases up then
       settles) for tactile interaction.

   Deliberately NO postprocessing (EffectComposer/UnrealBloomPass): this
   is a reading-first blog, the addon chain is heavy, and an additive
   Fresnel term + AdditiveBlending particles get us 90% of the bloom look
   for none of the weight. Colour is bound to the warm palette (amber/gold
   over warm brown), never tech-blue, so it stays in the "Quiet Collector"
   key.

   The module exposes a small imperative handle so the surrounding widget
   can drive it across states (orbit ↔ chat, idle ↔ thinking) without ever
   tearing the scene down — one continuous AI entity:

     mountBearOrb(host, themeEl) -> {
       pulse(),            // fire a one-shot energy pulse (click feedback)
       setThinking(bool),  // ramp noise/glow/spin up while "computing"
       setRecessed(bool),  // shrink + dim + sink behind the chat panel
       dispose(),
     }

   All gating (WebGL probe, reduced-motion, off-screen + tab pause, DPR
   clamp) is delegated to webgl-guard.js.
   ============================================================ */

import * as THREE from 'three';
import { shouldRun3D, createRenderLoop } from './webgl-guard.js';

/** Read a CSS custom property off an element → [r,g,b] in 0..1. */
function readColor(el, prop, fallback) {
  const raw = (getComputedStyle(el).getPropertyValue(prop) || '').trim();
  let hex = raw.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length !== 6) hex = fallback.replace('#', '');
  const n = parseInt(hex, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/* ---- GLSL: classic Ashima 3D simplex noise (snoise) ----------------
   Public-domain noise used verbatim; lets the vertex shader displace the
   icosahedron without any CPU work or textures. */
const SNOISE = /* glsl */ `
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
`;

const ORB_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uFreq;
  uniform float uAmp;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying float vNoise;
  ${SNOISE}
  void main() {
    // Slow breathing displacement along the normal — organic, not jelly.
    float n = snoise(position * uFreq + uTime * 0.3);
    vNoise = n;
    vec3 displaced = position + normal * n * uAmp;
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const ORB_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3  uBaseColor;
  uniform vec3  uGlowColor;
  uniform float uGlow;      // overall glow gain (rises while "thinking")
  uniform float uOpacity;   // global fade (drops when recessed)
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying float vNoise;
  void main() {
    // Fresnel: bright at grazing angles (rim), dark facing the camera.
    float fres = pow(1.0 - clamp(dot(vViewDir, vNormalW), 0.0, 1.0), 3.0);
    // Core gets a faint noise shimmer so it never looks like dead plastic.
    vec3 core = uBaseColor * (0.35 + 0.25 * (vNoise * 0.5 + 0.5));
    vec3 col  = core + uGlowColor * fres * (1.6 * uGlow);
    // Additive-style emission: alpha tracks brightness so the rim "burns"
    // into the background instead of sitting as a solid ball.
    float a = (0.30 + 0.70 * fres) * uOpacity;
    gl_FragColor = vec4(col, a);
  }
`;

/**
 * Mount the orb onto a host element. Safe to call unconditionally — it
 * self-aborts (host stays empty) when 3D shouldn't run.
 *
 * @param {HTMLElement} host    Positioned container; canvas fills it.
 * @param {HTMLElement} [themeEl=host]  Element to read palette vars from.
 * @returns {{ pulse:Function, setThinking:Function, setRecessed:Function, dispose:Function } | null}
 */
export function mountBearOrb(host, themeEl = host) {
  if (!host) return null;
  const gate = shouldRun3D({ minWidth: 768, desktopOnly: true });
  if (!gate.ok) return null;

  const W = () => host.clientWidth || 420;
  const H = () => host.clientHeight || 420;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W(), H());
  Object.assign(renderer.domElement.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', // DOM bubbles/chat sit on top and stay clickable
  });
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 100);
  camera.position.set(0, 0, 5);

  // Palette — amber/gold glow over warm brown, read live from CSS so the
  // light/dark theme toggle flows through with zero JS branching.
  const baseColor = new THREE.Color().fromArray(readColor(themeEl, '--orb-base', '#3A3128'));
  const glowColor = new THREE.Color().fromArray(readColor(themeEl, '--orb-glow', '#C9A24B'));

  const uniforms = {
    uTime:      { value: 0 },
    uFreq:      { value: 1.3 },
    uAmp:       { value: 0.22 },
    uGlow:      { value: 1.0 },
    uOpacity:   { value: 1.0 },
    uBaseColor: { value: baseColor },
    uGlowColor: { value: glowColor },
  };

  // ---- Core orb ----------------------------------------------------------
  const orbGeo = new THREE.IcosahedronGeometry(1, 5);
  const orbMat = new THREE.ShaderMaterial({
    vertexShader: ORB_VERT,
    fragmentShader: ORB_FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const orb = new THREE.Mesh(orbGeo, orbMat);
  scene.add(orb);

  // ---- Neural particle field --------------------------------------------
  const COUNT = 260;
  const positions = new Float32Array(COUNT * 3);
  const shell = [];
  for (let i = 0; i < COUNT; i++) {
    // Fibonacci sphere → even shell distribution, radius jittered for depth.
    const t = i / COUNT;
    const inc = Math.acos(1 - 2 * t);
    const az = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 1.7 + (((i * 53) % 17) / 17) * 0.5;
    const x = Math.sin(inc) * Math.cos(az) * r;
    const y = Math.sin(inc) * Math.sin(az) * r;
    const z = Math.cos(inc) * r;
    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
    shell.push(new THREE.Vector3(x, y, z));
  }
  const ptsGeo = new THREE.BufferGeometry();
  ptsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const ptsMat = new THREE.PointsMaterial({
    color: glowColor, size: 0.045, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(ptsGeo, ptsMat);

  // Wire near neighbours into a static neural mesh (cheap: built once).
  const linePos = [];
  const MAX_DIST = 0.72;
  for (let i = 0; i < shell.length; i++) {
    for (let j = i + 1; j < shell.length; j++) {
      if (shell[i].distanceTo(shell[j]) < MAX_DIST) {
        linePos.push(shell[i].x, shell[i].y, shell[i].z, shell[j].x, shell[j].y, shell[j].z);
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePos), 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: glowColor, transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);

  // Group particles+lines so they spin as one neural cloud.
  const cloud = new THREE.Group();
  cloud.add(points); cloud.add(lines);
  scene.add(cloud);

  // ---- Interaction state -------------------------------------------------
  const pointer = new THREE.Vector2(0, 0);   // target, -1..1
  const pointerEased = new THREE.Vector2(0, 0);
  let pulseT = 0;        // >0 while a click pulse plays out
  let thinking = 0;      // eased 0..1
  let thinkingTarget = 0;
  let recess = 0;        // eased 0..1 (1 = sunk behind chat)
  let recessTarget = 0;

  // Cache the host rect; refresh only on scroll/resize. getBoundingClientRect()
  // per pointermove forces a synchronous layout on every event (up to ~120/s).
  let hostRect = host.getBoundingClientRect();
  const refreshRect = () => { hostRect = host.getBoundingClientRect(); };
  const onPointerMove = (e) => {
    if (!loop.running) return; // skip while paused/off-screen
    const r = hostRect;
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -(((e.clientY - r.top) / r.height) * 2 - 1)
    );
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', refreshRect, { passive: true });

  // Re-read palette on theme flip.
  const themeObserver = new MutationObserver(() => {
    baseColor.fromArray(readColor(themeEl, '--orb-base', '#3A3128'));
    glowColor.fromArray(readColor(themeEl, '--orb-glow', '#C9A24B'));
    ptsMat.color.copy(glowColor); lineMat.color.copy(glowColor);
  });
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  const onResize = () => {
    renderer.setSize(W(), H());
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    refreshRect();
  };
  window.addEventListener('resize', onResize, { passive: true });

  // ---- Frame -------------------------------------------------------------
  const loop = createRenderLoop(host, (dt, t) => {
    uniforms.uTime.value = t;

    // Ease interaction scalars toward their targets (frame-rate aware-ish).
    const k = Math.min(1, dt * 6);
    pointerEased.lerp(pointer, Math.min(1, dt * 3));
    thinking += (thinkingTarget - thinking) * k;
    recess += (recessTarget - recess) * k;

    // Pulse: a quick ease-out bump on amplitude + glow, decaying over ~0.4s.
    let pulseAmp = 0, pulseGlow = 0;
    if (pulseT > 0) {
      pulseT = Math.max(0, pulseT - dt / 0.4);
      const e = pulseT; // 1→0
      pulseAmp = e * e * 0.35;
      pulseGlow = e * 1.2;
    }

    // Compose uniforms from idle + thinking + pulse + recess.
    uniforms.uAmp.value = (0.18 + thinking * 0.22 + pulseAmp) * (1 - recess * 0.5);
    uniforms.uGlow.value = (0.85 + thinking * 0.9 + pulseGlow) * (1 - recess * 0.55);
    uniforms.uOpacity.value = 1 - recess * 0.7;

    // Orb leans toward the cursor; recess shrinks it and pushes it back.
    const scale = (1 - recess * 0.34);
    orb.scale.setScalar(scale);
    orb.rotation.y = pointerEased.x * 0.4;
    orb.rotation.x = -pointerEased.y * 0.3;
    orb.position.z = -recess * 1.2;

    // Neural cloud: slow base spin, faster while thinking; drifts after the
    // cursor a touch; fades with recess but never fully (it keeps flowing
    // behind the chat glass).
    const spin = 0.04 + thinking * 0.18;
    cloud.rotation.y += dt * spin;
    cloud.rotation.x = pointerEased.y * 0.12;
    cloud.position.z = -recess * 1.0;
    cloud.scale.setScalar(1 + recess * 0.12);
    const cloudFade = 1 - recess * 0.35;
    ptsMat.opacity = (0.55 + thinking * 0.35) * cloudFade;
    lineMat.opacity = (0.12 + thinking * 0.12) * cloudFade;

    renderer.render(scene, camera);
  }, {
    onDispose() {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', refreshRect);
      window.removeEventListener('resize', onResize);
      themeObserver.disconnect();
      orbGeo.dispose(); orbMat.dispose();
      ptsGeo.dispose(); ptsMat.dispose();
      lineGeo.dispose(); lineMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
  });
  loop.start();

  return {
    pulse() { pulseT = 1; },
    setThinking(on) { thinkingTarget = on ? 1 : 0; },
    setRecessed(on) { recessTarget = on ? 1 : 0; },
    dispose: loop.dispose,
  };
}
