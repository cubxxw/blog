import * as THREE from 'three';
import { JIANGNAN_TARGETS } from './jiangnan-state.mjs';

// Furniture is built in metres. The live desktop belongs to the world runtime;
// this module supplies its physical display, cabinetry and the surrounding room.
export function buildJiangnanRoom({ scene, pbr, resources, textures, wake, photoAsset, books = [], zh = true, isDisposed }) {
  const group = new THREE.Group();
  group.name = 'jiangnan-private-room';
  scene.add(group);
  const keep = value => { resources.add(value); return value; };
  const geometryCache = new Map();
  const geometry = (key, create) => {
    if (!geometryCache.has(key)) geometryCache.set(key, keep(create()));
    return geometryCache.get(key);
  };
  const material = (color, roughness = .72, extra = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness, ...extra }));
  const basic = (color, extra = {}) => keep(new THREE.MeshBasicMaterial({ color, ...extra }));
  const mapped = (color, key, options = {}) => {
    const m = material(color, options.roughness ?? .72);
    pbr.bind(m, key, { metres: options.metres ?? .65, normal: options.normal ?? .18, roughness: options.roughness ?? .58, tint: color });
    return m;
  };
  const mesh = (g, m, x = 0, y = 0, z = 0, parent = group) => {
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  };
  const box = (x, y, z, w, h, d, m, parent = group, bevel = .012) => {
    const r = Math.min(bevel, w * .22, h * .22, d * .22);
    const key = ['rounded', w, h, d, r].join(':');
    return mesh(geometry(key, () => {
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
  const cylinder = (x, y, z, radius, height, m, parent = group, top = radius, segments = 40) =>
    mesh(geometry(['cylinder', radius, top, height, segments].join(':'), () => new THREE.CylinderGeometry(top, radius, height, segments)), m, x, y, z, parent);
  const sphere = (x, y, z, radius, m, parent = group) => mesh(geometry('sphere:' + radius, () => new THREE.SphereGeometry(radius, 28, 18)), m, x, y, z, parent);
  const ring = (x, y, z, radius, thickness, m, parent = group, arc = Math.PI * 2) =>
    mesh(geometry(['ring', radius, thickness, arc].join(':'), () => new THREE.TorusGeometry(radius, thickness, 6, Math.max(24, Math.round(80 * arc / (Math.PI * 2))), arc)), m, x, y, z, parent);
  const tube = (points, radius, m, parent = group, segments = 28) => {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(keep(new THREE.TubeGeometry(path, segments, radius, 8, false)), m, 0, 0, 0, parent);
  };
  const lathe = (points, m, x, y, z, parent = group, segments = 48) =>
    mesh(keep(new THREE.LatheGeometry(points.map(p => new THREE.Vector2(...p)), segments)), m, x, y, z, parent);
  const makeGroup = (name, x = 0, y = 0, z = 0, parent = group, action) => {
    const o = new THREE.Group(); o.name = name; o.position.set(x, y, z); if (action) o.userData.action = action; parent.add(o); return o;
  };
  const canvasTexture = (width, height, paint) => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    paint(canvas.getContext('2d'), width, height);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
    textures.add(map); return map;
  };
  const linenMap = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#c4b9a0'; c.fillRect(0, 0, w, h);
    for (let n = 0; n < 256; n++) {
      c.strokeStyle = n % 3 ? '#e0d6bd60' : '#857b6258'; c.lineWidth = n % 4 ? .55 : 1.2;
      c.beginPath(); c.moveTo(n + .5, 0); c.lineTo(n + .5, h); c.stroke();
      c.strokeStyle = n % 4 ? '#776b492b' : '#e9e1cc55'; c.beginPath(); c.moveTo(0, n + .5); c.lineTo(w, n + .5); c.stroke();
    }
  });
  linenMap.wrapS = linenMap.wrapT = THREE.RepeatWrapping; linenMap.repeat.set(3, 3);
  const walnut = mapped('#c8ad86', 'wood_table_001', { metres: .72, roughness: .48, normal: .16 });
  const darkWood = mapped('#a28a65', 'wood_table_001', { metres: .64, roughness: .66 });
  const ash = mapped('#decca7', 'wood_table_001', { metres: .57, roughness: .64 });
  const floorWood = mapped('#c1b398', 'wood_floor', { metres: 1.65, roughness: .72, normal: .16 });
  const plaster = mapped('#d5cbb9', 'painted_plaster_wall', { metres: 1.75, roughness: .95, normal: .12 });
  const stone = mapped('#6d6b60', 'rock_boulder_dry', { metres: .68, roughness: .82, normal: .11 });
  const linen = material('#d5cbb3', .96, { map: linenMap, bumpMap: linenMap, bumpScale: .0015 });
  const darkLinen = material('#898777', .99, { map: linenMap, bumpMap: linenMap, bumpScale: .0015 });
  const brass = material('#9c8051', .37, { metalness: .78, envMapIntensity: .75 });
  const agedBrass = material('#71603f', .66, { metalness: .62 });
  const black = material('#222621', .6, { metalness: .12 });
  const ivory = material('#d7d2c2', .48);
  const paper = material('#d0c4a8', .94);
  const ceramic = material('#b6b7a2', .29, { metalness: .03 });
  const green = material('#4c604b', .91);
  const seam = material('#423e34', .96);

  // Solid architecture, with an uninterrupted river view through the north bay.
  box(0, -.105, -.3, 6.6, .20, 4.85, darkWood, group, .009);
  const plankGeometry = geometry('floor-plank', () => new THREE.BoxGeometry(.194, .045, 4.6));
  const planks = keep(new THREE.InstancedMesh(plankGeometry, floorWood, 32));
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 32; i++) {
    dummy.position.set(-3.1 + i * .2, -.017, -.3); dummy.updateMatrix(); planks.setMatrixAt(i, dummy.matrix);
  }
  planks.castShadow = false; planks.receiveShadow = true; group.add(planks);
  for (let i = 0; i < 32; i++) for (const z of [-1.6 + i % 3 * .39, .3 + i % 4 * .27])
    box(-3.1 + i * .2, .006, z, .19, .0015, .0016, seam, group, .0002).castShadow = false;
  box(-3.28, 1.425, -.3, .18, 2.85, 4.78, plaster);
  box(3.28, 1.425, -.3, .18, 2.85, 4.78, plaster);
  box(0, 1.425, 2.09, 6.65, 2.85, .18, plaster);
  box(0, 2.94, -.3, 6.65, .18, 4.78, plaster);
  box(-2.245, 1.425, -2.69, 1.91, 2.85, .18, plaster);
  box(3.055, 1.425, -2.69, .29, 2.85, .18, plaster);
  box(.80, .375, -2.69, 4.1, .75, .18, plaster);
  box(.80, 2.72, -2.69, 4.1, .26, .18, plaster);
  for (const x of [-3.15, 3.15]) {
    box(x, .085, -.3, .07, .17, 4.61, darkWood);
    box(x, 2.73, -.3, .13, .20, 4.65, darkWood);
  }
  for (const z of [-2.56, -.28, 1.9]) box(0, 2.74, z, 6.4, .19, .13, walnut);
  box(0, .085, 1.96, 6.32, .17, .07, darkWood);
  for (const x of [-3.13, -1.27, 2.87, 3.13]) box(x, 1.43, -2.56, .095, 2.85, .14, darkWood);
  box(.8, .80, -2.55, 4.24, .10, .24, walnut);
  box(.8, 2.54, -2.55, 4.24, .10, .14, walnut);
  box(1.87, 1.67, -2.59, .036, 1.64, .07, darkWood);
  const glass = material('#c8d6ce', .06, { transparent: true, opacity: .018, metalness: .06, depthWrite: false });
  const windowGlass = mesh(geometry('window-glass', () => new THREE.PlaneGeometry(4.04, 1.63)), glass, .80, 1.67, -2.61);
  windowGlass.castShadow = windowGlass.receiveShadow = false;
  // Warm timber panelling gives the plaster wall an architectural base.
  box(3.176, .425, -.30, .025, .72, 4.43, walnut).castShadow = false;
  for (const y of [.10, .80]) box(3.155, y, -.30, .04, .034, 4.46, ash, group, .006).castShadow = false;
  for (let i = 0; i < 9; i++) box(3.153, .45, -2.33 + i * .52, .018, .67, .023, ash, group, .004).castShadow = false;
  // Shoji stays beside the bay, rather than washing the whole view in white.
  const shojiPaper = material('#d3cdb7', .97, { map: linenMap, emissive: '#b5aa89', emissiveIntensity: .035, side: THREE.DoubleSide });
  box(-1.9, 1.59, -2.535, 1.05, 2.0, .025, shojiPaper);
  for (const x of [-2.43, -2.17, -1.90, -1.64, -1.37]) box(x, 1.59, -2.50, .022, 2.06, .027, ash, group, .004);
  for (const y of [.58, .97, 1.37, 1.77, 2.17, 2.60]) box(-1.9, y, -2.495, 1.08, .022, .032, ash, group, .004);
  // A partially raised reed blind: individual bamboo ribs and a rolled crown.
  const bamboo = material('#948365', .86);
  for (let i = 0; i < 11; i++) cylinder(.80, 2.48 - i * .015, -2.475, .007, 4.10, bamboo, group, .007, 8).rotation.z = Math.PI / 2;
  const blindRoll = cylinder(.80, 2.53, -2.44, .061, 4.17, ash); blindRoll.rotation.z = Math.PI / 2;
  for (const x of [-.85, 2.45]) {
    tube([[x, 2.57, -2.40], [x, 2.30, -2.40], [x, 2.17, -2.43]], .003, paper);
    cylinder(x, 2.15, -2.43, .008, .045, darkWood, group, .006, 12);
  }

  // A low, restrained woven rug makes the reading corner feel inhabited.
  const rugMap = canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = '#8c8570'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < h; i += 3) { c.fillStyle = i % 9 ? '#c1b39835' : '#514d3b35'; c.fillRect(0, i, w, 1); }
    c.strokeStyle = '#ded1ad60'; c.lineWidth = 5; c.strokeRect(21, 21, w - 42, h - 42);
    c.strokeStyle = '#555e5166'; c.lineWidth = 2; c.strokeRect(31, 31, w - 62, h - 62);
    for (let i = 40; i < w - 40; i += 18) { c.strokeStyle = '#e0d3b335'; c.beginPath(); c.moveTo(i, 38); c.lineTo(i, h - 38); c.stroke(); }
  });
  const rug = material('#c1b89d', 1, { map: rugMap, bumpMap: rugMap, bumpScale: .001 });
  box(-.05, .014, .42, 4.55, .018, 2.50, rug, group, .006).castShadow = false;
  for (let i = 0; i < 32; i++) for (const z of [-.864, 1.704])
    tube([[-2.245 + i * .1415, .025, z], [-2.235 + i * .1415, .023, z + (z > 0 ? .04 : -.04)]], .0028, paper, group, 2).castShadow = false;

  // The desk is a thick, softened slab with joinery, storage and a woven basket.
  const desk = makeGroup('old-walnut-writing-desk');
  const top = box(1.465, .78, -1.58, 2.43, .095, 1.32, walnut, desk, .024);
  top.rotation.z = -.0018;
  box(1.465, .708, -2.08, 2.20, .095, .09, darkWood, desk);
  box(.41, .377, -1.57, .105, .70, 1.09, darkWood, desk, .02);
  box(.41, .08, -1.57, .29, .09, 1.16, walnut, desk);
  box(2.30, .405, -1.69, .58, .66, .96, darkWood, desk, .018);
  for (let i = 0; i < 3; i++) {
    box(2.30, .207 + i * .202, -1.198, .53, .182, .036, walnut, desk, .008);
    tube([[2.23, .228 + i * .202, -1.168], [2.23, .25 + i * .202, -1.15], [2.37, .25 + i * .202, -1.15], [2.37, .228 + i * .202, -1.168]], .007, agedBrass, desk, 12);
  }
  for (const x of [2.06, 2.53]) for (const z of [-2.08, -1.30]) cylinder(x, .061, z, .022, .11, darkWood, desk, .026, 16);
  const basket = makeGroup('woven-paper-basket', .79, .22, -1.90, desk);
  const basketMat = material('#9d8c66', .98);
  const basketShell = cylinder(0, 0, 0, .18, .37, basketMat, basket, .205, 32);
  basketShell.material.side = THREE.DoubleSide;
  const basketTop = cylinder(0, .187, 0, .18, .006, darkWood, basket); basketTop.scale.set(1, 1, 1);
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2;
    tube([[Math.cos(a) * .181, -.17, Math.sin(a) * .181], [Math.cos(a) * .203, .18, Math.sin(a) * .203]], .004, ash, basket, 3);
  }
  for (let i = 0; i < 11; i++) ring(0, -.16 + i * .032, 0, .182 + i * .002, .0035, basketMat, basket).rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) { const page = box(-.07 + i * .054, .20 + i * .01, 0, .10, .10, .006, paper, basket, .001); page.rotation.set(.35, .15, -.2 + i * .25); }

  function chair({ name, x, z, wide = false, rotation = 0 }) {
    const c = makeGroup(name, x, 0, z); c.rotation.y = rotation;
    const w = wide ? .69 : .55, d = wide ? .65 : .51, y = wide ? .39 : .465;
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      tube([[sx * w * .46, .045, sz * d * .43], [sx * w * .40, y - .08, sz * d * .36], [sx * w * .40, y + .04, sz * d * .36]], .023, ash, c, 10);
    box(0, y - .055, 0, w + .055, .07, d + .055, ash, c, .025);
    box(0, y + .023, -.006, w, wide ? .14 : .093, d, wide ? darkLinen : linen, c, .033);
    const backY = wide ? .75 : .79;
    const back = box(0, backY, d * .41, w - .025, wide ? .43 : .255, .11, wide ? linen : darkLinen, c, .033); back.rotation.x = .12;
    tube([[-w * .54, y + .15, -.20], [-w * .54, y + .28, -.07], [-w * .54, backY + .06, d * .40], [0, backY + (wide ? .245 : .17), d * .49], [w * .54, backY + .06, d * .40], [w * .54, y + .28, -.07], [w * .54, y + .15, -.20]], .024, ash, c, 48);
    for (const sx of [-1, 1]) {
      tube([[sx * w * .52, y - .01, -.19], [sx * w * .53, y + .20, -.16], [sx * w * .54, y + .24, .04], [sx * w * .51, y + .25, d * .38]], .018, walnut, c, 24);
      tube([[sx * w * .39, y + .02, d * .36], [sx * w * .43, backY, d * .45], [sx * w * .38, backY + .13, d * .45]], .016, ash, c, 12);
    }
    // Upholstery piping and a few shallow folds catch the lamplight.
    tube([[-w * .43, y + .075, -d * .42], [w * .43, y + .075, -d * .42], [w * .46, y + .075, d * .37], [-w * .46, y + .075, d * .37], [-w * .43, y + .075, -d * .42]], .003, paper, c, 36);
    if (wide) {
      const pillow = box(.14, .62, .17, .32, .27, .12, darkLinen, c, .035); pillow.rotation.set(.18, -.12, -.18);
      for (let i = 0; i < 3; i++) tube([[-.20 + i * .16, .968, .34], [-.19 + i * .16, .87, .353], [-.20 + i * .16, .78, .36]], .0013, paper, c, 10).castShadow = false;
    }
    return c;
  }
  chair({ name: 'curved-wood-desk-chair', x: 1.14, z: .015 });
  chair({ name: 'linen-reading-armchair', x: -2.04, z: .67, wide: true, rotation: .08 });

  // Physical computer: its front is exactly aligned with the live DOM plane.
  const computer = makeGroup('physical-computer', 0, 0, 0, group, 'computer');
  const aluminum = material('#a8a99e', .29, { metalness: .76, envMapIntensity: .65 });
  box(1.45, .844, -1.91, .40, .025, .27, aluminum, computer, .01);
  const stem = box(1.45, .916, -1.92, .10, .145, .047, aluminum, computer, .012); stem.rotation.x = -.13;
  box(1.45, 1.21, -1.855, .91, .61, .052, aluminum, computer, .019);
  for (const x of [1.039, 1.861]) box(x, 1.22, -1.819, .026, .535, .008, black, computer, .004);
  box(1.45, 1.483, -1.819, .85, .027, .008, black, computer, .004);
  box(1.45, .957, -1.819, .85, .027, .008, black, computer, .004);
  box(1.45, .928, -1.814, .85, .044, .011, aluminum, computer, .008);
  const [screenX, screenY, screenZ] = JIANGNAN_TARGETS.computer;
  const display = mesh(geometry('computer-screen', () => new THREE.PlaneGeometry(.80, .50)), material('#101d1b', .22, { metalness: .12 }), screenX, screenY, screenZ - .002, computer);
  display.userData.action = 'computer'; display.castShadow = false;
  const lens = sphere(1.45, 1.502, -1.817, .003, basic('#111b19'), computer); lens.scale.z = .3;
  box(1.45, .831, -1.34, 1.16, .005, .49, darkLinen, computer, .018).castShadow = false;
  box(1.45, .842, -1.19, .55, .026, .19, aluminum, computer, .009);
  const keyMat = material('#c6c7bb', .61), keyGeo = geometry('keyboard-key', () => new THREE.BoxGeometry(.029, .009, .027));
  const keys = keep(new THREE.InstancedMesh(keyGeo, keyMat, 56));
  let keyIndex = 0;
  for (let row = 0; row < 4; row++) for (let col = 0; col < 14; col++) {
    dummy.position.set(1.219 + col * .035, .859, -1.254 + row * .039); dummy.updateMatrix(); keys.setMatrixAt(keyIndex++, dummy.matrix);
  }
  keys.castShadow = keys.receiveShadow = true; computer.add(keys);
  box(1.45, .864, -1.126, .20, .007, .024, ivory, computer, .002);
  const mouse = sphere(1.87, .857, -1.18, .055, ivory, computer); mouse.scale.set(.85, .35, 1.5);
  tube([[1.87, .876, -1.24], [1.87, .88, -1.21], [1.87, .88, -1.19]], .0009, aluminum, computer, 8).castShadow = false;
  box(1.87, .835, -1.188, .18, .005, .24, darkLinen, computer, .025).castShadow = false;

  // Paper and brass task lamp, an amber island in the cool rainy room.
  const lamp = makeGroup('paper-brass-task-lamp', .34, .829, -1.75);
  cylinder(0, .022, 0, .106, .04, agedBrass, lamp, .095);
  cylinder(0, .047, 0, .072, .017, brass, lamp);
  tube([[0, .055, 0], [0, .24, -.018], [.06, .34, -.035], [.065, .39, -.035]], .013, brass, lamp, 24);
  const shadeMat = material('#d6bd8e', .88, { map: linenMap, emissive: '#ffc36c', emissiveIntensity: .30, side: THREE.DoubleSide });
  const shade = mesh(geometry('desk-lamp-shade', () => new THREE.CylinderGeometry(.084, .178, .188, 48, 1, true)), shadeMat, .065, .431, -.035, lamp);
  shade.castShadow = false;
  ring(.065, .337, -.035, .177, .005, agedBrass, lamp).rotation.x = Math.PI / 2;
  ring(.065, .525, -.035, .084, .003, brass, lamp).rotation.x = Math.PI / 2;
  sphere(.065, .365, -.035, .029, basic('#ffe1a4'), lamp).castShadow = false;
  const taskLight = new THREE.PointLight('#ffd29a', 2.35, 3.1, 2); taskLight.position.set(.065, .338, -.035); lamp.add(taskLight);
  tube([[0, .02, .08], [-.10, .02, .24], [-.15, .014, .44], [-.16, -.26, .47]], .003, black, lamp, 18);

  function picture(parent, center, width, height, source, action) {
    const frame = makeGroup(action ? 'travel-photo-frame' : 'framed-travel-print', ...center, parent, action);
    box(0, 0, -.022, width, height, .041, walnut, frame, .009);
    box(0, 0, .002, width - .030, height - .030, .009, agedBrass, frame, .003);
    box(0, 0, .008, width - .052, height - .052, .005, paper, frame, .002);
    const photoMat = material('#777d6b', .91);
    const photo = mesh(geometry('photo-plane', () => new THREE.PlaneGeometry(1, 1)), photoMat, 0, 0, .013, frame);
    photo.scale.set(width - .095, height - .095, 1); photo.visible = false; photo.castShadow = false;
    if (source) new THREE.TextureLoader().load(source, texture => {
      if (isDisposed?.()) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; textures.add(texture);
      const ratio = texture.image.width / texture.image.height, maxW = width - .095, maxH = height - .095;
      photo.scale.set(Math.min(maxW, maxH * ratio), Math.min(maxH, maxW / ratio), 1);
      photoMat.map = texture; photoMat.color.set('#d1c8b5'); photoMat.needsUpdate = true; photo.visible = true; wake();
    }, undefined, () => {});
    return frame;
  }
  const photoFrame = picture(group, JIANGNAN_TARGETS.photo, .33, .39, photoAsset, 'photo');
  box(0, -.17, -.105, .21, .026, .21, walnut, photoFrame, .005);
  const prop = box(0, -.08, -.14, .028, .28, .02, walnut, photoFrame, .003); prop.rotation.x = -.35;
  // The coffee is open at the rim, with a real glazed inner wall and liquid.
  const coffee = makeGroup('hand-thrown-coffee-cup', ...JIANGNAN_TARGETS.coffee, group, 'coffee');
  const cupProfile = [[.032, -.074], [.050, -.070], [.057, -.053], [.064, .048], [.064, .062], [.061, .067], [.057, .062], [.056, .046], [.050, -.045], [.034, -.053]];
  lathe(cupProfile, ceramic, 0, 0, 0, coffee);
  const handle = ring(.067, .003, 0, .036, .009, ceramic, coffee, Math.PI * 1.64); handle.rotation.set(0, 0, -.82); handle.scale.x = .75;
  cylinder(0, .043, 0, .055, .003, material('#392b1d', .25), coffee, .055, 48);
  const crema = ring(-.009, .046, -.004, .030, .0017, material('#b69b69', .47), coffee, Math.PI * 1.7); crema.rotation.x = Math.PI / 2;
  cylinder(0, -.076, 0, .094, .011, ceramic, coffee, .098);
  ring(0, -.069, 0, .075, .0025, ceramic, coffee).rotation.x = Math.PI / 2;
  tube([[.07, -.066, .058], [.12, -.065, .053], [.145, -.064, .05]], .003, brass, coffee, 10);
  const spoon = sphere(.15, -.063, .05, .012, brass, coffee); spoon.scale.set(.7, .16, 1.45);
  const steamMaterial = basic('#c3c4b2', { transparent: true, opacity: .13, depthWrite: false });
  const steam = makeGroup('coffee-steam', 0, .07, 0, coffee);
  for (let i = 0; i < 3; i++) tube([[i * .014 - .015, 0, 0], [i * .014 - .018, .04, .006], [i * .014 - .008, .09, -.003], [i * .014 - .012, .14, .004]], .0015, steamMaterial, steam, 18).castShadow = false;

  // Open, built-in cabinetry: books face the room and remain reachable.
  const cabinet = makeGroup('open-walnut-library', 0, 0, 0, group, 'books');
  box(-3.155, 1.155, -1.30, .07, 2.31, 2.20, walnut, cabinet);
  for (const z of [-2.39, -.21]) box(-2.87, 1.155, z, .62, 2.31, .055, walnut, cabinet);
  for (const y of [.075, .63, 1.01, 1.53, 2.16]) box(-2.87, y, -1.30, .62, .045, 2.20, walnut, cabinet);
  box(-2.87, .304, -2.09, .60, .42, .52, walnut, cabinet);
  box(-2.547, .32, -2.09, .02, .40, .49, darkWood, cabinet);
  cylinder(-2.53, .35, -2.09, .014, .03, brass, cabinet).rotation.z = Math.PI / 2;
  const shelfGlow = basic('#d6a76c', { transparent: true, opacity: .50 });
  box(-2.76, 1.505, -1.30, .24, .005, 1.95, shelfGlow, cabinet, .001).castShadow = false;
  const shelfLight = new THREE.PointLight('#e9ba80', .65, 2.25, 2); shelfLight.position.set(-2.62, 1.47, -1.1); group.add(shelfLight);
  const titles = ['在路上', '孤独星球', '禅与摩托车维修艺术', '看不见的城市', '旅行的艺术', '瓦尔登湖', '远方的鼓声', '撒哈拉的故事', '雨季不再来', '最好的时光在路上'];
  const palette = ['#77694e', '#52645b', '#a4946e', '#736f5e', '#5b6654', '#90795e', '#4d5957', '#a28765', '#7a765f', '#3e5652'];
  const bookAtlas = canvasTexture(1024, 1024, (c) => {
    for (let i = 0; i < 10; i++) {
      const x = i * 100; c.fillStyle = palette[i]; c.fillRect(x, 0, 100, 1024);
      c.fillStyle = '#c2b394'; c.fillRect(x + 10, 59, 80, 4); c.fillRect(x + 10, 946, 80, 3);
      const title = String(books[i]?.title || titles[i]), chars = [...title].slice(0, 16);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ece3cb'; c.font = '34px Georgia, serif';
      chars.forEach((char, j) => c.fillText(char, x + 50, 135 + j * 43));
      c.font = '18px Georgia, serif'; c.fillStyle = '#d6cdb4'; c.fillText(String(i + 1).padStart(2, '0'), x + 50, 886);
    }
  });
  const spineMaterial = material('#e5dfcc', .93, { map: bookAtlas });
  for (let i = 0; i < 10; i++) {
    const h = .31 + (i * 7 % 5) * .018, t = .064 + i % 3 * .013, z = -1.66 + i * .143;
    const book = makeGroup('travel-book-' + (i + 1), -2.725, 1.034 + h / 2, z, cabinet, 'books');
    book.rotation.x = i === 0 ? -.13 : i === 9 ? .11 : 0;
    const cover = material(palette[i], .92);
    box(0, 0, 0, .29, h, t, cover, book, .002);
    box(.003, 0, 0, .277, h - .012, t - .011, paper, book, .001);
    for (const dz of [-t / 2, t / 2]) box(0, 0, dz, .294, h + .006, .005, cover, book, .001);
    const g = keep(new THREE.PlaneGeometry(t, h)), uv = g.attributes.uv;
    for (let n = 0; n < uv.count; n++) uv.setX(n, (i * 100 + uv.getX(n) * 100) / 1024);
    const spine = mesh(g, spineMaterial, .151, 0, 0, book); spine.rotation.y = Math.PI / 2;
  }
  // A vintage turntable occupies the lower open bay, with a real grooved disc.
  const record = makeGroup('walnut-record-player', -2.82, .68, -.76, cabinet);
  box(0, 0, 0, .47, .078, .62, walnut, record, .018);
  cylinder(0, .050, .05, .203, .018, black, record, .203, 64);
  const vinyl = material('#242922', .36, { metalness: .09 });
  for (let i = 0; i < 9; i++) ring(0, .061, .05, .096 + i * .011, .0008, vinyl, record).rotation.x = Math.PI / 2;
  cylinder(0, .062, .05, .053, .0015, material('#9b8a60', .92), record, .053, 32);
  cylinder(0, .066, .05, .003, .008, brass, record, .003, 12);
  cylinder(.145, .067, -.19, .028, .045, brass, record);
  tube([[.145, .09, -.19], [.16, .10, -.10], [.105, .09, .10], [.075, .082, .17]], .005, aluminum, record, 22);
  box(.073, .079, .18, .018, .018, .043, black, record, .004);
  for (const z of [-1.60, -.26]) {
    box(-2.84, .33, z, .43, .43, .17, darkWood, cabinet, .014);
    const speaker = cylinder(-2.615, .33, z, .126, .012, darkLinen, cabinet, .126, 40); speaker.rotation.z = Math.PI / 2;
    const cone = cylinder(-2.605, .33, z, .064, .014, black, cabinet, .064, 40); cone.rotation.z = Math.PI / 2;
  }
  // Brass espresso machine, aged enamel and a small ribbed grinder.
  const espresso = makeGroup('vintage-espresso-corner', -2.84, 1.035, -2.06, cabinet);
  const enamel = material('#617265', .40, { metalness: .28 });
  box(0, .19, 0, .44, .37, .47, enamel, espresso, .027);
  box(.229, .19, 0, .018, .21, .39, agedBrass, espresso, .008);
  box(.279, .041, 0, .16, .025, .48, aluminum, espresso, .005);
  for (let i = 0; i < 7; i++) box(.282, .057, -.18 + i * .06, .14, .003, .006, black, espresso, .001);
  for (const z of [-.13, .13]) {
    const port = cylinder(.26, .196, z, .044, .067, brass, espresso); port.rotation.z = Math.PI / 2;
    box(.35, .189, z, .12, .023, .027, darkWood, espresso, .008);
  }
  const dial = cylinder(.245, .299, -.08, .039, .012, paper, espresso, .039, 40); dial.rotation.z = Math.PI / 2;
  const dialRing = ring(.253, .299, -.08, .039, .003, brass, espresso); dialRing.rotation.y = Math.PI / 2;
  tube([[.259, .299, -.08], [.259, .319, -.095]], .0018, black, espresso, 3);
  tube([[.24, .28, .176], [.29, .24, .176], [.30, .13, .19]], .006, aluminum, espresso, 12);
  box(0, .39, 0, .46, .023, .49, brass, espresso, .008);
  for (const z of [-.13, .12]) {
    const tiny = lathe([[.022, 0], [.032, .008], [.036, .055], [.032, .06], [.028, .054], [.024, .009]], ivory, 0, .41, z, espresso, 28);
    tiny.castShadow = true;
  }
  // A short stack of well-thumbed paperbacks breaks the shelf's regularity.
  for (let i = 0; i < 3; i++) {
    const paperback = makeGroup('well-thumbed-paperback-' + i, -2.82, 1.57 + i * .034, -1.12, cabinet);
    paperback.rotation.y = -.04 + i * .035;
    box(0, 0, 0, .32, .031, .43, material(palette[3 + i], .96), paperback, .002).castShadow = false;
    box(.012, .001, 0, .307, .023, .408, paper, paperback, .001).castShadow = false;
  }
  // Collected ceramics keep the upper shelves sparse, away from the book spines.
  lathe([[.04, 0], [.07, .015], [.12, .10], [.11, .19], [.055, .25], [.044, .29], [.05, .30], [.04, .30], [.036, .28]], material('#9b947b', .87), -2.82, 1.56, -.48, cabinet);
  lathe([[.05, 0], [.10, .01], [.10, .07], [.08, .13], [.043, .15]], material('#746f57', .91), -2.85, 1.56, -1.83, cabinet);
  tube([[-2.82, 1.85, -.48], [-2.78, 2.04, -.51], [-2.73, 2.13, -.56]], .003, darkWood, cabinet, 12);
  for (let i = 0; i < 5; i++) {
    const leaf = sphere(-2.79 + (i % 2) * .08, 1.93 + i * .037, -.49 - i * .016, .035, green, cabinet);
    leaf.scale.set(.42, 1, .14); leaf.rotation.z = i % 2 ? .85 : -.75;
  }

  // An old standing fan: carved wood yoke, concentric wooden cage, leaf blades.
  const fan = makeGroup('battered-wood-standing-fan', 2.80, 0, -.55);
  const fanWood = mapped('#c7b38c', 'wood_table_001', { metres: .32, roughness: .82, normal: .23 });
  const fanDark = material('#514534', .88);
  lathe([[0, .026], [.18, .026], [.205, .047], [.20, .075], [.15, .096], [.07, .115], [.042, .145], [.033, .19], [.027, .80], [.034, .84]], fanWood, 0, 0, 0, fan);
  ring(0, .09, 0, .14, .004, fanDark, fan).rotation.x = Math.PI / 2;
  cylinder(0, .89, 0, .025, .13, fanWood, fan, .028, 24);
  tube([[-.265, 1.20, .01], [-.265, 1.055, .01], [-.17, .98, .01], [0, .94, .01], [.17, .98, .01], [.265, 1.055, .01], [.265, 1.20, .01]], .015, fanWood, fan, 32);
  const head = makeGroup('oscillating-wood-fan-head', 0, 1.20, 0, fan); head.rotation.y = -.22;
  for (const z of [-.057, .066]) {
    ring(0, 0, z, .278, .013, fanWood, head);
    for (const r of [.091, .155, .214, .265]) ring(0, 0, z + (z > 0 ? .013 : -.013), r, .0027, fanWood, head);
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2;
      tube([[Math.cos(a) * .037, Math.sin(a) * .037, z + .015], [Math.cos(a) * .16, Math.sin(a) * .16, z + .026], [Math.cos(a) * .272, Math.sin(a) * .272, z]], .0028, fanWood, head, 5);
    }
  }
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    tube([[Math.cos(a) * .276, Math.sin(a) * .276, -.057], [Math.cos(a) * .286, Math.sin(a) * .286, 0], [Math.cos(a) * .276, Math.sin(a) * .276, .066]], .006, fanDark, head, 7);
  }
  const motor = cylinder(0, 0, -.055, .064, .15, fanWood, head, .070, 40); motor.rotation.x = Math.PI / 2;
  const rotor = makeGroup('four-carved-wooden-blades', 0, 0, .008, head);
  const bladeShape = new THREE.Shape(); bladeShape.moveTo(.018, .016);
  bladeShape.bezierCurveTo(.045, .055, .055, .18, .17, .205);
  bladeShape.bezierCurveTo(.23, .22, .25, .16, .205, .115);
  bladeShape.bezierCurveTo(.145, .055, .07, .018, .018, .016);
  const bladeGeometry = keep(new THREE.ExtrudeGeometry(bladeShape, { depth: .009, bevelEnabled: true, bevelSize: .004, bevelThickness: .003, bevelSegments: 2, curveSegments: 18 }));
  for (let i = 0; i < 4; i++) { const blade = mesh(bladeGeometry, fanWood, 0, 0, -.005, rotor); blade.rotation.z = i * Math.PI / 2; }
  const cap = sphere(0, 0, .084, .043, fanWood, head); cap.scale.z = .55;
  const screw = cylinder(0, 0, .108, .007, .005, agedBrass, head, .007, 12); screw.rotation.x = Math.PI / 2;
  tube([[-.004, 0, .112], [.004, 0, .112]], .001, fanDark, head, 2);
  for (const [start, arc, radius] of [[.45, .21, .279], [2.2, .12, .280], [4.1, .30, .275]]) {
    const worn = ring(0, 0, .079, radius, .0022, ash, head, arc); worn.rotation.z = start; worn.castShadow = false;
  }

  // A single muted print and a little closed notebook add personal scale.
  const print = picture(group, [3.175, 1.85, -1.10], .62, .81, '/images/about/journey/05-fuji-480.webp');
  print.rotation.y = -Math.PI / 2;
  const notebook = makeGroup('cloth-notebook', .83, .840, -1.17);
  notebook.rotation.y = -.17;
  box(0, 0, 0, .20, .024, .265, darkLinen, notebook, .004);
  box(0, .005, 0, .187, .013, .25, paper, notebook, .002);
  box(0, .014, 0, .20, .004, .265, darkLinen, notebook, .002);
  tube([[-.07, .023, -.09], [.07, .023, .09]], .003, darkWood, notebook, 3);
  tube([[.035, .022, -.03], [.052, .022, -.03], [.055, .022, -.07], [.038, .022, -.07], [.039, .022, -.039], [.049, .022, -.039]], .0014, agedBrass, notebook, 8).castShadow = false;
  const pencilPot = makeGroup('pencils-in-stoneware', 2.48, .828, -1.97);
  lathe([[.03, 0], [.046, .01], [.048, .13], [.045, .14], [.040, .135], [.037, .015]], ceramic, 0, 0, 0, pencilPot, 32).castShadow = false;
  for (let i = 0; i < 4; i++) {
    const pencil = cylinder(-.02 + i * .012, .153, (i % 2) * .014, .0027, .19, i % 2 ? ash : darkWood, pencilPot, .0027, 6);
    pencil.rotation.z = -.12 + i * .09; pencil.castShadow = false;
  }
  const postcards = makeGroup('travel-postcards', .80, .833, -1.64); postcards.rotation.y = .16;
  box(0, 0, 0, .20, .004, .145, paper, postcards, .001).castShadow = false;
  const postcard = box(.008, .004, -.007, .20, .004, .145, ivory, postcards, .001); postcard.rotation.y = -.09; postcard.castShadow = false;

  return {
    group,
    screen: { position: [...JIANGNAN_TARGETS.computer], width: .80, height: .50 },
    update(time) {
      rotor.rotation.z = -time * 1.12;
      head.rotation.y = -.22 + Math.sin(time * .14) * .11;
      steam.rotation.y = Math.sin(time * .32) * .12;
      steam.scale.y = .90 + Math.sin(time * .65) * .10;
    }
  };
}
