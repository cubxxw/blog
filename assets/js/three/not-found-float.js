/* ============================================================
   not-found-float.js — a draggable low-poly object on the 404 page
   ------------------------------------------------------------
   The 404 is a low-traffic page with a generous performance budget,
   so it's the right place for an easter-egg-grade 3D touch: a slowly
   self-rotating, wireframe icosahedron floating behind the big "404",
   which the visitor can grab and spin (OrbitControls). It reads as a
   lost little object drifting in space — a small reward for landing
   somewhere unexpected.

   Reuses the shared baseline: webgl-guard handles the WebGL probe,
   reduced-motion, off-screen/tab pause and DPR clamp. three.js and
   OrbitControls are the same locally-hosted, fingerprinted modules
   the knowledge-galaxy already ships, resolved via an importmap.

   Colour is the page's teal accent so it sits in the 404's existing
   palette. Fully decorative + pointer-gated: when 3D shouldn't run the
   host stays empty and the 404 looks exactly as it did before.
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { shouldRun3D, clampDPR, createRenderLoop } from './webgl-guard.js';

const TEAL = 0x0e7490;
const TEAL_LIGHT = 0x00b4ad;

/**
 * Mount the floating object into a host element.
 * @param {HTMLElement} host  Positioned container; canvas fills it.
 * @returns {{ dispose: Function } | null}
 */
export function mountNotFoundFloat(host) {
  if (!host) return null;
  // Allow it a bit lower than the hero field — the 404 is forgiving — but
  // still skip tiny screens where it would just crowd the message.
  const gate = shouldRun3D({ minWidth: 600 });
  if (!gate.ok) return null;

  const size = () => ({ w: host.clientWidth, h: host.clientHeight });
  let { w, h } = size();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w / Math.max(h, 1), 0.1, 100);
  camera.position.set(0, 0, 6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(clampDPR(2));
  renderer.setSize(w, h);
  Object.assign(renderer.domElement.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
  });
  host.appendChild(renderer.domElement);

  // The lost object: an icosahedron, shown as a soft wireframe with a faint
  // translucent solid inside so it has body without ever obscuring the text.
  const geo = new THREE.IcosahedronGeometry(1.7, 0);

  const solid = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.06 })
  );
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(geo),
    new THREE.LineBasicMaterial({ color: TEAL_LIGHT, transparent: true, opacity: 0.5 })
  );
  const group = new THREE.Group();
  group.add(solid, wire);
  scene.add(group);

  // Drag to spin; no zoom/pan — keep it a toy, not a viewer. Damping makes
  // the spin coast after release, so it feels physical.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.6;

  const onResize = () => {
    ({ w, h } = size());
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize, { passive: true });

  const loop = createRenderLoop(host, (dt) => {
    // Gentle idle drift on top of any user rotation, plus a slow bob.
    group.rotation.y += dt * 0.18;
    group.rotation.x += dt * 0.05;
    group.position.y = Math.sin(performance.now() / 1400) * 0.12;
    controls.update();
    renderer.render(scene, camera);
  }, {
    onDispose() {
      window.removeEventListener('resize', onResize);
      controls.dispose();
      geo.dispose();
      solid.material.dispose();
      wire.geometry.dispose();
      wire.material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
  });
  loop.start();

  return { dispose: loop.dispose };
}
