import * as THREE from 'three';

// One brief entrance, with no idle render loop or retained GPU context.
export function playEntrance(host) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
  catch { return; }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1.4, .1, 20);
  camera.position.z = 5;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(224, 160);
  const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const material = new THREE.MeshStandardMaterial({ color: 0x90d3c8, metalness: .28, roughness: .3 });
  const cube = new THREE.Mesh(geometry, material);
  const edges = new THREE.EdgesGeometry(geometry);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x245d59 });
  cube.add(new THREE.LineSegments(edges, edgeMaterial));
  scene.add(cube, new THREE.HemisphereLight(0xffffff, 0x256560, 3));
  const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(2, 3, 4); scene.add(light);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  let frame, finished = false;
  const started = performance.now();
  const stop = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', stop);
    observer.disconnect();
    geometry.dispose(); edges.dispose(); material.dispose(); edgeMaterial.dispose();
    renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    host.removeAttribute('data-rendering');
    host.style.removeProperty('--entry-fallback');
    host.dataset.entryComplete = 'true';
  };
  const onVisibility = () => { if (document.hidden) stop(); };
  const observer = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(); });
  observer.observe(host);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', stop, { once: true });
  const render = now => {
    if (!host.isConnected || matchMedia('(prefers-reduced-motion: reduce)').matches) { stop(); return; }
    const progress = Math.min(1, (now - started) / 1150);
    const ease = 1 - Math.pow(1 - progress, 3);
    host.style.setProperty('--entry-fallback', String(Math.max(0, (progress - .84) / .16)));
    cube.rotation.set(.42 + (1 - ease) * .6, -.62 + (1 - ease) * Math.PI, -.08);
    cube.scale.setScalar(.5 + ease * .5);
    renderer.render(scene, camera);
    host.dataset.rendering = 'true';
    if (progress === 1) { stop(); return; }
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);
}
