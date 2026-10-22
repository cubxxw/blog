import * as THREE from 'three';
import { JIANGNAN_DOOR } from './jiangnan-door-state.mjs';

// The rear-door architecture: a real opening split out of the opaque south
// wall and its skirting, a walnut leaf with inset panels, brass furniture and
// hinges, a stone threshold and small outside landing, one slender warm gap
// light and quiet blue water beyond. Restrained geometry throughout; every
// material and mesh joins the world's existing resource sets.

const LEAF_SWING = 1.66;      // ~95°, hinged at the right jamb, swinging in
const DOOR_SECONDS = .62;     // one deliberate opening movement
const SPLASH_SECONDS = 1.5;   // subtle rings and bubbles after the small fall

export function buildJiangnanDoor({ group, resources = new Set(), wake = () => {}, isDisposed = () => false, materials = {}, still = () => true } = {}) {
  if (!group) throw new Error('buildJiangnanDoor needs the room group');
  const keep = value => { resources.add(value); return value; };
  const geometryCache = new Map();
  const geometry = (key, create) => {
    if (!geometryCache.has(key)) geometryCache.set(key, keep(create()));
    return geometryCache.get(key);
  };
  const material = (color, roughness = .72, extra = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness, ...extra }));
  const basic = (color, extra = {}) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const mesh = (g, m, x = 0, y = 0, z = 0, parent = group) => {
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  };
  const box = (x, y, z, w, h, d, m, parent = group, bevel = .012) => {
    const r = Math.min(bevel, w * .22, h * .22, d * .22);
    return mesh(geometry(['door-rounded', w, h, d, r].join(':'), () => {
      const a = w / 2 - r, b = h / 2 - r, c = Math.min(r, a * .48, b * .48);
      const s = new THREE.Shape();
      s.moveTo(-a + c, -b); s.lineTo(a - c, -b); s.quadraticCurveTo(a, -b, a, -b + c);
      s.lineTo(a, b - c); s.quadraticCurveTo(a, b, a - c, b);
      s.lineTo(-a + c, b); s.quadraticCurveTo(-a, b, -a, b - c);
      s.lineTo(-a, -b + c); s.quadraticCurveTo(-a, -b, -a + c, -b);
      const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: r, bevelThickness: r, curveSegments: 4 });
      g.translate(0, 0, -d / 2 + r); g.computeVertexNormals(); return g;
    }), m, x, y, z, parent);
  };
  const cylinder = (x, y, z, radius, height, m, parent = group, top = radius, segments = 28) =>
    mesh(geometry(['door-cylinder', radius, top, height, segments].join(':'), () => new THREE.CylinderGeometry(top, radius, height, segments)), m, x, y, z, parent);
  const sphere = (x, y, z, radius, m, parent = group) =>
    mesh(geometry('door-sphere:' + radius, () => new THREE.SphereGeometry(radius, 18, 12)), m, x, y, z, parent);
  const makeGroup = (name, x = 0, y = 0, z = 0, parent = group, action) => {
    const o = new THREE.Group(); o.name = name; o.position.set(x, y, z);
    if (action) o.userData.action = action; parent.add(o); return o;
  };

  const { wall, opening, skirting, landing } = JIANGNAN_DOOR;
  const plaster = materials.plaster || material('#d5cbb9', .95);
  const darkWood = materials.darkWood || material('#7d6b4c', .7);
  const joinery = materials.joineryTimber || material('#c8ad86', .63);
  const frameTimber = materials.frameTimber || material('#4c3d2e', .72);
  const sashTimber = materials.sashTimber || material('#302a20', .72);
  const agedBrass = materials.agedBrass || material('#71603f', .66, { metalness: .62 });
  const stone = materials.stone || material('#6d6b60', .82);
  const seam = materials.seam || material('#423e34', .96);

  // The opaque wall and its skirting split around the opening instead of
  // hiding a door in front of solid plaster.
  for (const [minX, maxX] of [[wall.minX, opening.minX], [opening.maxX, wall.maxX]])
    box((minX + maxX) / 2, wall.height / 2, wall.z, maxX - minX, wall.height, wall.depth, plaster, group, .009);
  box(opening.centerX, (opening.top + wall.height) / 2, wall.z, opening.maxX - opening.minX, wall.height - opening.top, wall.depth, plaster, group, .009);
  for (const [minX, maxX] of [[skirting.minX, opening.minX], [opening.maxX, skirting.maxX]])
    box((minX + maxX) / 2, skirting.height / 2, skirting.z, maxX - minX, skirting.height, skirting.depth, darkWood, group, .006);

  // Walnut lining, slender stops and one stone threshold.
  const jambWidth = .052, liningDepth = wall.depth + .05;
  box(opening.minX + jambWidth / 2, opening.top / 2, wall.z, jambWidth, opening.top, liningDepth, joinery, group, .004);
  box(opening.maxX - jambWidth / 2, opening.top / 2, wall.z, jambWidth, opening.top, liningDepth, joinery, group, .004);
  box(opening.centerX, opening.top + .035, wall.z, opening.maxX - opening.minX, .07, liningDepth, joinery, group, .004);
  const stopZ = wall.z - wall.depth / 2 - .013;
  for (const side of [opening.minX + jambWidth, opening.maxX - jambWidth])
    box(side, opening.top / 2, stopZ, .018, opening.top, .026, sashTimber, group, .002);
  box(opening.centerX, opening.top - .034, stopZ, opening.maxX - opening.minX, .018, .026, sashTimber, group, .002);
  box(opening.centerX, .028, wall.z + .02, opening.maxX - opening.minX + .12, .056, .30, stone, group, .006);

  // Small outside landing, then quiet blue water beyond.
  box((landing.minX + landing.maxX) / 2, landing.topY - .033, landing.z + landing.depth / 2,
    landing.maxX - landing.minX, .066, landing.depth, stone, group, .008);
  const waterMat = material('#2c4a63', .22, { metalness: .26, emissive: '#16324a', emissiveIntensity: .55 });
  const water = mesh(geometry('rear-door-quiet-water', () => new THREE.PlaneGeometry(26, 15)), waterMat,
    1.8, JIANGNAN_DOOR.waterY, landing.z + 7.4, group);
  water.rotation.x = -Math.PI / 2; water.name = 'quiet-blue-water'; water.castShadow = water.receiveShadow = false;

  // The leaf hangs from the right jamb and swings inward, clear of the water.
  const jambInner = opening.maxX - jambWidth - .012;
  const leafWidth = opening.maxX - opening.minX - jambWidth * 2 - .03, leafHeight = opening.top - .075;
  const leaf = makeGroup('rear-walnut-door-leaf', jambInner, 0, wall.z, group, 'door');
  const slab = box(-leafWidth / 2, leafHeight / 2 + .03, 0, leafWidth, leafHeight, .046, joinery, leaf, .006);
  slab.name = 'rear-door-slab';
  // Inset panels on the room-facing side: a quiet recessed field behind a
  // slim ogee frame, the same joinery language as the library doors.
  for (const [y, h] of [[.62, .80], [1.53, .84]]) {
    const w = leafWidth - .17, bar = .024;
    box(-leafWidth / 2, y, -.0245, w, h, .011, seam, leaf, .002);
    box(-leafWidth / 2, y + h / 2 + .011, -.0295, w + .05, bar, .012, frameTimber, leaf, .002);
    box(-leafWidth / 2, y - h / 2 - .011, -.0295, w + .05, bar, .012, frameTimber, leaf, .002);
    for (const dx of [-w / 2 - .013, w / 2 + .013]) box(-leafWidth / 2 + dx, y, -.0295, bar, h + .05, .012, frameTimber, leaf, .002);
  }
  // Aged brass: one lever handle on a backplate, three hinge knuckles.
  const handleX = -leafWidth + .088;
  box(handleX, 1.045, -.0325, .054, .175, .009, agedBrass, leaf, .005);
  const rose = cylinder(handleX, 1.045, -.042, .027, .018, agedBrass, leaf, .027, 24); rose.rotation.x = Math.PI / 2;
  const lever = cylinder(handleX - .078, 1.045, -.066, .0115, .118, agedBrass, leaf, .0115, 16); lever.rotation.z = Math.PI / 2;
  const gripEnd = sphere(handleX - .138, 1.045, -.066, .015, agedBrass, leaf); gripEnd.scale.set(1, 1, .86);
  for (const y of [.36, 1.06, 1.76]) {
    cylinder(.018, y, .031, .0125, .098, agedBrass, leaf, .0125, 16);
    box(-.058, y, .027, .13, .038, .012, agedBrass, leaf, .003);
  }

  // The slender warm door-gap light: one vertical slit at the meeting stile
  // and one under the leaf, with a restrained warm pool on the landing that
  // quietly argues with the blue water beyond.
  const gapGlow = basic('#ffd39c');
  box(opening.minX + .017, opening.top / 2 - .02, stopZ - .016, .013, opening.top - .10, .007, gapGlow, group, .002);
  box(opening.centerX, .014, stopZ - .016, opening.maxX - opening.minX - .16, .012, .007, gapGlow, group, .002);
  const spill = basic('#ffcf96', { transparent: true, opacity: .12, depthWrite: false });
  const pool = mesh(geometry('door-warm-spill', () => new THREE.PlaneGeometry(1.06, .52)), spill,
    opening.centerX - .03, landing.topY + .003, landing.z + .30, group);
  pool.rotation.x = -Math.PI / 2; pool.castShadow = pool.receiveShadow = false;

  // A small, honest splash where the step fell short of the landing.
  const splash = makeGroup('door-step-ripples', 1.82, JIANGNAN_DOOR.waterY + .004, 2.92, group);
  const rings = [0, 1, 2].map(() => {
    const ring = mesh(geometry('door-splash-ring', () => new THREE.RingGeometry(.84, 1, 56)),
      basic('#9cc4d6', { transparent: true, opacity: 0, depthWrite: false }), 0, 0, 0, splash);
    ring.rotation.x = -Math.PI / 2; ring.castShadow = ring.receiveShadow = false;
    return ring;
  });
  const bubbles = [0, 1, 2, 3].map(index => {
    const bubble = mesh(geometry('door-splash-bubble', () => new THREE.SphereGeometry(1, 12, 8)),
      basic('#b9d6e2', { transparent: true, opacity: 0, depthWrite: false }),
      (index % 2 ? 1 : -1) * (.05 + index * .035), 0, .04 + index * .05, splash);
    bubble.castShadow = bubble.receiveShadow = false;
    return bubble;
  });

  let doorTarget = 0, doorFrom = 0, doorAmount = 0, doorElapsed = 0, shadowDirty = false;
  let splashElapsed = SPLASH_SECONDS, lastTime;
  const applyDoor = () => {
    const angle = -doorAmount * LEAF_SWING;
    if (leaf.rotation.y !== angle) shadowDirty = true;
    leaf.rotation.y = angle;
  };
  const applySplash = () => {
    const t = Math.max(0, Math.min(SPLASH_SECONDS, splashElapsed));
    rings.forEach((ring, index) => {
      const p = (t - index * .16) / 1.05;
      const active = p > 0 && p < 1;
      ring.scale.setScalar(.16 + Math.max(0, Math.min(1, p)) * 1.18);
      ring.material.opacity = active ? .17 * Math.sin(Math.PI * p) : 0;
      ring.visible = active;
    });
    bubbles.forEach((bubble, index) => {
      const p = (t - .12 - index * .1) / 1.15;
      const active = p > 0 && p < 1;
      bubble.visible = active;
      if (!active) { bubble.material.opacity = 0; return; }
      bubble.position.y = p * .30;
      bubble.scale.setScalar(.010 + index * .003 + p * .006);
      bubble.material.opacity = .34 * Math.sin(Math.PI * p);
    });
    splash.visible = t < SPLASH_SECONDS;
  };
  applyDoor(); applySplash();

  return {
    group: leaf,
    target: [opening.centerX, 1.045, wall.z - .07],
    opening: { ...opening },
    get openAmount() { return doorAmount; },
    get moving() { return doorAmount !== doorTarget || splashElapsed < SPLASH_SECONDS; },
    shadowRefresh() { const dirty = shadowDirty || doorAmount !== doorTarget; shadowDirty = false; return dirty; },
    open() { doorFrom = doorAmount; doorTarget = 1; doorElapsed = 0; if (still()) doorAmount = doorTarget; applyDoor(); wake(); },
    close() { doorFrom = doorAmount; doorTarget = 0; doorElapsed = 0; if (still()) doorAmount = doorTarget; applyDoor(); wake(); },
    splash() { splashElapsed = still() ? SPLASH_SECONDS : 0; applySplash(); wake(); },
    update(time) {
      if (isDisposed?.()) return;
      const dt = lastTime === undefined ? 0 : Math.min(.1, Math.max(0, time - lastTime));
      lastTime = time;
      if (still()) {
        doorAmount = doorTarget;
        if (splashElapsed < SPLASH_SECONDS) splashElapsed = SPLASH_SECONDS;
      } else {
        if (doorAmount !== doorTarget) {
          doorElapsed = Math.min(DOOR_SECONDS, doorElapsed + dt);
          const progress = doorElapsed / DOOR_SECONDS, eased = progress * progress * (3 - 2 * progress);
          doorAmount = doorFrom + (doorTarget - doorFrom) * eased;
          if (progress >= 1) doorAmount = doorTarget;
        }
        if (splashElapsed < SPLASH_SECONDS) splashElapsed = Math.min(SPLASH_SECONDS, splashElapsed + dt);
      }
      applyDoor(); applySplash();
    }
  };
}
