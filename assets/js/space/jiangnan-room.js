import * as THREE from 'three';
import { JIANGNAN_TARGETS } from './jiangnan-state.mjs';
import { createJiangnanObjectState } from './jiangnan-furnishings-state.mjs';
import { buildJiangnanFloor } from './jiangnan-floor.mjs';
import { createCatSupport } from './jiangnan-cat-grounding.mjs';
import { createTimberFinish } from './jiangnan-timber-finish.mjs';
import { createTablePool, JIANGNAN_TABLE_LIGHT } from './jiangnan-lighting.mjs';
import { JIANGNAN_WINDOW, JIANGNAN_DESK, JIANGNAN_WORK_CHAIR, JIANGNAN_READING_CHAIR, JIANGNAN_CAT_BED, JIANGNAN_WORKSTATION, JIANGNAN_PHOTO_WALL } from './jiangnan-layout.mjs';

// Furniture is built in metres. The live desktop belongs to the world runtime;
// this module supplies its physical display, cabinetry and the surrounding room.
export function buildJiangnanRoom({ scene, pbr, resources, textures, wake, photos = [], books = [], records = [], zh = true, isDisposed, shadowSize = 1536, buildDoor = null, createLightRamp = null, isStill = () => true }) {
  const group = new THREE.Group();
  group.name = 'jiangnan-private-room';
  scene.add(group);
  const targets = { ...JIANGNAN_TARGETS };
  const albums = records.filter(record => record?.id && record?.title).slice(0, 5);
  const objects = createJiangnanObjectState({ recordIds: albums.map(record => record.id) });
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
  const ring = (x, y, z, radius, thickness, m, parent = group, arc = Math.PI * 2, segments = Math.max(24, Math.round(80 * arc / (Math.PI * 2)))) =>
    mesh(geometry(['ring', radius, thickness, arc, segments].join(':'), () => new THREE.TorusGeometry(radius, thickness, 6, segments, arc)), m, x, y, z, parent);
  const tube = (points, radius, m, parent = group, segments = 28, sides = 8) => {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(keep(new THREE.TubeGeometry(path, segments, radius, sides, false)), m, 0, 0, 0, parent);
  };
  const lathe = (points, m, x, y, z, parent = group, segments = 48) =>
    mesh(keep(new THREE.LatheGeometry(points.map(p => new THREE.Vector2(...p)), segments)), m, x, y, z, parent);
  // Static, same-material craft details share a draw call. Keep their original
  // geometry in the resource set so the world's normal disposal owns it all.
  const batch = objects => {
    if (objects.length < 2) return;
    const positions = [], normals = [], uvs = [], indices = [];
    let offset = 0;
    for (const o of objects) {
      o.updateMatrix();
      const g = o.geometry.clone().applyMatrix4(o.matrix);
      positions.push(...g.attributes.position.array); normals.push(...g.attributes.normal.array);
      uvs.push(...g.attributes.uv.array);
      if (g.index) for (const i of g.index.array) indices.push(i + offset);
      else for (let i = 0; i < g.attributes.position.count; i++) indices.push(i + offset);
      offset += g.attributes.position.count; g.dispose();
    }
    const merged = keep(new THREE.BufferGeometry());
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); merged.setIndex(indices);
    const combined = mesh(merged, objects[0].material, 0, 0, 0, objects[0].parent);
    combined.castShadow = objects.some(o => o.castShadow); combined.receiveShadow = objects.some(o => o.receiveShadow);
    for (const o of objects) o.removeFromParent();
    return combined;
  };
  const batchMaterials = objects => {
    const buckets = new Map();
    for (const object of objects) {
      const key = object.material.uuid;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(object);
    }
    buckets.forEach(batch);
  };
  const makeGroup = (name, x = 0, y = 0, z = 0, parent = group, action) => {
    const o = new THREE.Group(); o.name = name; o.position.set(x, y, z); if (action) o.userData.action = action; parent.add(o); return o;
  };
  const canvasTexture = (width, height, paint) => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    paint(canvas.getContext('2d'), width, height);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
    textures.add(map); return map;
  };
  // These few visible boards have their own non-tiling grain. Broad growth
  // bands and quiet pores follow the length; wear changes the oil's roughness
  // rather than covering the joinery with unrelated scratches.
  const nativeTimbers = [];
  const timber = (base, seed, worn = false) => {
    const width = 1024, height = 512, color = new THREE.Color(base);
    const channel = value => Math.round(THREE.MathUtils.clamp(value, 0, 255));
    const sample = (x, y) => {
      const u = x / width, v = y / height;
      const kx = u - (worn ? .78 : .73), ky = v - (worn ? .09 : .29);
      const knot = Math.exp(-(kx * kx * 58 + ky * ky * 115));
      const bend = Math.sin(u * 4.7 + seed) * (worn ? .027 : .009) + Math.sin(u * 13.3 + seed) * (worn ? .008 : .003);
      const grain = v + bend + knot * Math.sin(kx * 11) * .09;
      const broad = Math.sin(grain * 17 + Math.sin(u * 2.3 + seed) * .65) * (worn ? 4.8 : 10.5)
        + Math.sin(grain * 43 + Math.sin(u * 7.1 + seed) * .4) * (worn ? 1.5 : 3.2);
      const fibre = Math.sin(grain * 196 + Math.sin(u * 6.8 + v * 11) * .48) * 1.9
        + Math.sin(grain * 479 + Math.sin(u * 13 + seed) * .7) * 1.1;
      const pore = Math.pow(Math.max(0, Math.sin(grain * 750 + Math.sin(u * 8 + seed))), 22) * 4;
      const noise = (Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453 % 1) * 1.4;
      const heart = Math.exp(-(kx * kx * 680 + ky * ky * 2500)) * (worn ? 17 : 20);
      const joint = (Math.exp(-u * 38) + Math.exp(-(1 - u) * 38)) * 7;
      // A couple of broad, irregular oxidised areas belong to this old slab;
      // the remaining joinery keeps its existing quiet pigment and finish.
      const oxidation = worn ? (Math.exp(-((u - .16) ** 2 * 19 + (v - .61) ** 2 * 40))
        + Math.exp(-((u - .82) ** 2 * 32 + (v - .34) ** 2 * 24)) * .72)
        * (11 + Math.sin(u * 9 + v * 7) * 2.6 + Math.sin(u * 19 - v * 4) * .9) : 0;
      const edge = worn ? Math.pow(Math.max(0, 1 - v * 7), 2) * (10 + Math.sin(u * 11) * 2) : 0;
      const handPolish = worn ? Math.exp(-((u-.38)**2*12+(v-.08)**2*160))*.08 : 0;
      const rubbedTone=worn?Math.exp(-((u-.42)**2*7+(v-.085)**2*140))*7:0;
      const quietCloud=worn?(Math.sin(u*8.3+v*4.9+seed)+Math.sin(u*3.9-v*6.2))*1.2:0;
      return {tone:broad+fibre-pore+noise-heart-edge-joint-oxidation+rubbedTone+quietCloud,oil:(worn?.78:.73)+Math.sin(grain*17)*.025+pore*.004-handPolish+oxidation*.003};
    };
    // Color.getRGB is linear; the authored pigment values are stored in sRGB.
    const rgb = new THREE.Color(color).convertLinearToSRGB();
    const map = canvasTexture(width, height, (c, w, h) => {
      const pixels = c.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const {tone} = sample(x, y), p = (y * w + x) * 4;
        pixels.data[p] = channel(rgb.r * 255 + tone); pixels.data[p + 1] = channel(rgb.g * 255 + tone * .83); pixels.data[p + 2] = channel(rgb.b * 255 + tone * .62); pixels.data[p + 3] = 255;
      }
      c.putImageData(pixels, 0, 0);
      if (worn) {
        // A few shallow checks belong to this slab's end, rather than a
        // repeating distress pattern over the writing surface.
        c.strokeStyle='#514a3d55';c.lineWidth=.65;
        for(const [u,v,l] of [[.075,.77,.065]]) {
          c.beginPath();c.moveTo(u*w,v*h);c.bezierCurveTo((u+l*.31)*w,(v+.003)*h,(u+l*.67)*w,(v-.004)*h,(u+l)*w,(v+.002)*h);c.stroke();
        }
      }
    });
    const roughnessMap = canvasTexture(width, height, (c, w, h) => {
      const pixels = c.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const value = channel(sample(x, y).oil * 255), p = (y * w + x) * 4;
        pixels.data[p] = pixels.data[p + 1] = pixels.data[p + 2] = value; pixels.data[p + 3] = 255;
      }
      c.putImageData(pixels, 0, 0);
    });
    roughnessMap.colorSpace = THREE.NoColorSpace;
    const m = material('#ffffff', 1, { map, roughnessMap, bumpMap: map, bumpScale: .00035, envMapIntensity: .48 });
    nativeTimbers.push({m, seed, worn}); return m;
  };
  const grainAlong = (o, axis, length, across, offset = 0, wornFront = false) => {
    const g = keep(o.geometry.clone()), p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const u = (axis === 'y' ? p.getY(i) : axis === 'z' ? p.getZ(i) : p.getX(i)) / length + .5;
      let v = axis === 'y' ? (Math.abs(n.getX(i)) > .5 ? p.getZ(i) : p.getX(i)) / across + .5
        : axis === 'z' ? (Math.abs(n.getY(i)) > .5 ? p.getX(i) : p.getY(i)) / across + .5
          : (Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i)) / across + .5;
      if (wornFront) v = Math.abs(n.getY(i)) > .5 ? .5 - p.getZ(i) / across : n.getZ(i) > .5 ? .025 + p.getY(i) * .35 : v;
      uv.setXY(i, u * .91 + offset, v * .87 + .03);
    }
    o.geometry = g; return o;
  };
  const finish = createTimberFinish({THREE,textures,resources,wake,isDisposed});
  const deskTimber = finish.make('desk');
  const chairTimber = finish.make('support');
  const windowTimber = timber('#514737', 8.4, true);
  const joineryTimber = timber('#775438', 6.3);
  const frameTimber = timber('#4c3d2e', 9.4);
  const sashTimber = timber('#302a20', 4.7);
  // Keep the photograph's real fibres, without its red pigment or its former
  // small repeated world tile. Only this hidden donor uses PBR's map registry;
  // the visible boards retain their native, lengthwise, non-repeating UVs.
  const timberSource = material('#ffffff');
  pbr.bind(timberSource, 'wood_table_001', { onMap(channel, source) {
    if (channel !== 'color' || isDisposed?.()) return;
    finish.setPhotograph(source.image);
    for (const {m, worn} of nativeTimbers) {
      const canvas = m.map.image, c = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
      const pigment = c.getImageData(0, 0, w, h);
      c.save(); c.translate(0, h); c.rotate(-Math.PI / 2);
      c.drawImage(source.image, 0, 0, h, w); c.restore();
      const photo = c.getImageData(0, 0, w, h);
      for (let i = 0; i < photo.data.length; i += 4) {
        const luma = photo.data[i] * .2126 + photo.data[i + 1] * .7152 + photo.data[i + 2] * .0722;
        const fibre = (luma - 51) * (worn ? .24 : .82);
        pigment.data[i] += fibre; pigment.data[i + 1] += fibre * .88; pigment.data[i + 2] += fibre * .72;
      }
      c.putImageData(pigment, 0, 0); m.map.needsUpdate = true;
    }
    wake();
  } });
  const linenMap = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#c4b9a0'; c.fillRect(0, 0, w, h);
    for (let n = 0; n < 256; n++) {
      c.strokeStyle = n % 3 ? '#e0d6bd60' : '#857b6258'; c.lineWidth = n % 4 ? .55 : 1.2;
      c.beginPath(); c.moveTo(n + .5, 0); c.lineTo(n + .5, h); c.stroke();
      c.strokeStyle = n % 4 ? '#776b492b' : '#e9e1cc55'; c.beginPath(); c.moveTo(0, n + .5); c.lineTo(w, n + .5); c.stroke();
    }
  });
  linenMap.wrapS = linenMap.wrapT = THREE.RepeatWrapping; linenMap.repeat.set(3, 3);
  const walnut = mapped('#c8ad86', 'wood_table_001', { metres: .72, roughness: .63, normal: .12 });
  const darkWood = mapped('#a28a65', 'wood_table_001', { metres: .64, roughness: .66 });
  const ash = mapped('#decca7', 'wood_table_001', { metres: .57, roughness: .64 });
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
  const planks=buildJiangnanFloor({THREE,group,keep,pbr});
  const dummy = new THREE.Object3D();
  box(-3.28, 1.425, -.3, .18, 2.85, 4.78, plaster);
  box(3.28, 1.425, -.3, .18, 2.85, 4.78, plaster);
  // A rear-door architecture may replace the solid south wall and skirting;
  // it owns their split segments together with the real opening, leaf and
  // landing. Without it the plain wall keeps its uninterrupted surface.
  const door = buildDoor ? buildDoor({ group, resources, wake, isDisposed, still: isStill,
    materials: { plaster, darkWood, walnut, joineryTimber, frameTimber, sashTimber, agedBrass, stone, seam } }) : null;
  if (door?.target) targets.door = [...door.target];
  if (!buildDoor) box(0, 1.425, 2.09, 6.65, 2.85, .18, plaster);
  box(0, 2.94, -.3, 6.65, .18, 4.78, plaster);
  box(-2.69, 1.425, -2.69, 1.02, 2.85, .18, plaster);
  box(-1.72, 1.425, -2.69, .94, 2.85, .18, plaster).name='photo-wall-infill';
  box(3.055, 1.425, -2.69, .29, 2.85, .18, plaster);
  box(.80, .40, -2.69, 4.1, .80, .18, plaster);
  box(.80, 2.72, -2.69, 4.1, .26, .18, plaster);
  for (const x of [-3.15, 3.15]) {
    box(x, .085, -.3, .07, .17, 4.61, darkWood);
    box(x, 2.73, -.3, .13, .20, 4.65, darkWood);
  }
  for (const z of [-2.56, -.28, 1.9]) box(0, 2.74, z, 6.4, .19, .13, walnut);
  if (!buildDoor) box(0, .085, 1.96, 6.32, .17, .07, darkWood);
  for (const x of [-3.13, 3.13]) box(x, 1.43, -2.56, .095, 2.85, .14, darkWood);
  // The main glass bay keeps its own sill/header beside the solid photo wall.
  // Paired meeting stiles sit under the two bamboo rolls. Their lower tongues
  // run between low guide beads on the existing sill; glass stays in place.
  const windowJoinery = [], windowSash = [];
  for (const [x,width] of [[-1.28,.10],[2.875,.11]]) {
    windowJoinery.push(grainAlong(box(x,1.67,-2.505,width,1.72,.205,windowTimber,group,.003),'y',1.72,.205));
  }
  windowJoinery.push(grainAlong(box(.8,.810,-2.50,4.31,.090,.220,windowTimber,group,.006),'x',4.31,.22));
  windowJoinery.push(grainAlong(box(.8,2.535,-2.505,4.31,.105,.190,windowTimber,group,.004),'x',4.31,.19));
  for (const x of [-1.228,2.828]) windowSash.push(grainAlong(box(x,1.67,-2.583,.014,1.63,.024,sashTimber,group,.001),'y',1.63,.024));
  windowSash.push(grainAlong(box(.8,2.483,-2.589,4.04,.012,.024,sashTimber,group,.001),'x',4.04,.024));
  const guideTop=JIANGNAN_WINDOW.bottom+.004,sashHeight=JIANGNAN_WINDOW.top-guideTop,sashY=(JIANGNAN_WINDOW.top+guideTop)/2;
  for(const [x,z,depth]of [[JIANGNAN_WINDOW.centerX-.009,-2.568,.026],[JIANGNAN_WINDOW.centerX+.009,-2.586,.024]]){
    windowSash.push(grainAlong(box(x,sashY,z,.014,sashHeight,depth,sashTimber,group,.0008),'y',sashHeight,depth));
  }
  for(const [x,z]of [[JIANGNAN_WINDOW.centerX-.009,-2.569],[JIANGNAN_WINDOW.centerX+.009,-2.585]]){
    windowSash.push(grainAlong(box(x,JIANGNAN_WINDOW.bottom+.002,z,.014,.004,.008,sashTimber,group,.0003),'y',.004,.008));
  }
  // Replace the old continuous bottom stop, which would fill the rear slot.
  for(const z of [-2.593,-2.577,-2.561])windowSash.push(grainAlong(box(.8,JIANGNAN_WINDOW.bottom+.002,z,4.04,.004,.004,sashTimber,group,.0003),'x',4.04,.004));
  batch(windowJoinery);const sashes=batch(windowSash);sashes.name='paired-wood-window-sashes';sashes.userData.action='window';
  const glass = material('#c8d6ce', .06, { transparent: true, opacity: .018, metalness: .06, depthWrite: false });
  const windowGlass = mesh(geometry('window-glass', () => new THREE.PlaneGeometry(JIANGNAN_WINDOW.maxX-JIANGNAN_WINDOW.minX, JIANGNAN_WINDOW.top-JIANGNAN_WINDOW.bottom)), glass, JIANGNAN_WINDOW.centerX, (JIANGNAN_WINDOW.top+JIANGNAN_WINDOW.bottom)/2, JIANGNAN_WINDOW.glassZ);
  windowGlass.name = 'rain-window-glass'; windowGlass.userData.action = 'window';
  targets.window = [JIANGNAN_WINDOW.centerX, 2, JIANGNAN_WINDOW.glassZ];
  windowGlass.castShadow = windowGlass.receiveShadow = false;
  // Warm timber panelling gives the plaster wall an architectural base.
  box(3.176, .425, -.30, .025, .72, 4.43, walnut).castShadow = false;
  for (const y of [.10, .80]) box(3.155, y, -.30, .04, .034, 4.46, ash, group, .006).castShadow = false;
  for (let i = 0; i < 9; i++) box(3.153, .45, -2.33 + i * .52, .018, .67, .023, ash, group, .004).castShadow = false;
  // The raised blind remains a woven sheet when rolled: uneven reeds run
  // across the bay, and the fine dark warp continues around the whole bundle.
  const bamboo = [material('#9a8d70',.97),material('#ae9b77',.95),material('#8d8065',.99)];
  const blind=makeGroup('rolled-reed-window-blind'),warp=material('#6c6250',.99),cotton=material('#b9ad91',.98);
  for (const [index,left,right,baseY] of [[0,-1.21,.781,2.505],[1,.804,2.81,2.485]]) {
    const roll=makeGroup('independent-bamboo-roll-'+index,0,0,0,blind),reeds=[[],[],[]],ties=[];
    for(let i=0;i<26;i++){
      const a=i/26*Math.PI*2,r=.043+Math.sin(i*2.7+index)*.0025;
      reeds[i%3].push(tube(Array.from({length:13},(_,j)=>{
        const x=left+j/12*(right-left);
        return [x,baseY+Math.cos(a)*r+Math.sin(j*.81+i)*.002, -2.442+Math.sin(a)*r+Math.sin(j*.43+i)*.0017];
      }),.0044+(i%4)*.00035,bamboo[i%3],roll,24,5));
    }
    for(let i=0;i<4;i++)reeds[i%3].push(tube([[left,baseY-.04-i*.010,-2.479],[left+(right-left)*.34,baseY-.042-i*.010,-2.480],[left+(right-left)*.70,baseY-.038-i*.011,-2.478],[right,baseY-.041-i*.010,-2.480]],.0042+i%2*.0005,bamboo[i%3],roll,20,5));
    for(let i=0;i<15;i++){
      const x=left+.035+i*(right-left-.07)/14;
      const tie=ring(x,baseY,-2.442,.051,.0009,warp,roll,Math.PI*2,20);tie.rotation.y=Math.PI/2;ties.push(tie);
      ties.push(tube([[x,baseY-.035,-2.487],[x+.001,baseY-.068,-2.487],[x,baseY-.081,-2.485]],.0007,warp,roll,3,4));
    }
    reeds.forEach(batch);batch(ties);
    const pullX=index?2.60:-1.02,endY=index?2.12:2.18;
    tube([[pullX,2.555,-2.385],[pullX+.003,2.29,-2.382],[pullX-.004,endY,-2.394]],.0022,cotton,roll,12,5);
    cylinder(pullX-.004,endY-.019,-2.394,.005,.035,windowTimber,roll,.004,12);
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
  const rugBody=box(-.05, .014, .42, 4.55, .018, 2.50, rug, group, .006);rugBody.castShadow=false;
  // Fine cotton leaves the actual hem, bends down over its edge and settles
  // on the boards. Instances keep the dense, uneven ends to one draw call.
  const fringeCotton=material('#827b67',1);
  const fringeCurve=new THREE.CatmullRomCurve3([[0,.0152,-.006],[0,.0036,.002],[0,0,.025]].map(p=>new THREE.Vector3(...p)));
  const fringe=keep(new THREE.InstancedMesh(geometry('rug-cotton-thread',()=>new THREE.TubeGeometry(fringeCurve,2,.00045,4,false)),fringeCotton,1024));
  fringe.name='rug-cotton-fringe';fringe.castShadow=false;fringe.receiveShadow=true;group.add(fringe);
  for(let side=0;side<2;side++)for(let i=0;i<512;i++){
    const seed=Math.sin(i*12.9898+side*78.233)*43758.5453;
    const variation=seed-Math.floor(seed),splay=Math.sin(i*2.399+side*1.71);
    dummy.position.set(-2.304+i*(4.508/511)+splay*.0012,.0064,side?1.67:-.83);
    dummy.rotation.set(0,(side?0:Math.PI)+splay*.075,0);
    dummy.scale.set(1,1,.76+variation*.52);dummy.updateMatrix();fringe.setMatrixAt(side*512+i,dummy.matrix);
  }
  dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);

  // A low old-elm desk belongs beneath this window. The 45 mm top keeps
  // its rubbed edge, one flush repair and a wide, unobstructed knee opening.
  const desk = makeGroup('old-walnut-writing-desk');
  const deskX=JIANGNAN_DESK.centerX,deskZ=(JIANGNAN_DESK.backZ+JIANGNAN_DESK.frontZ)/2;
  const deskDepth=JIANGNAN_DESK.frontZ-JIANGNAN_DESK.backZ;
  const top = mesh(geometry('aged-elm-writing-top', () => {
    const hx=JIANGNAN_DESK.width/2-.0045,hz=deskDepth/2-.0045;
    const s = new THREE.Shape();
    s.moveTo(-hx+.016,-hz+.001);
    s.bezierCurveTo(-.72,-hz-.001,-.52,-hz+.003,-.23,-hz+.001);
    s.bezierCurveTo(.17,-hz+.004,.58,-hz-.001,hx-.016,-hz+.002);
    s.quadraticCurveTo(hx,-hz+.002,hx,-hz+.019);s.lineTo(hx,hz-.013);
    s.quadraticCurveTo(hx,hz,hx-.014,hz);s.lineTo(-hx+.014,hz);
    s.quadraticCurveTo(-hx,hz,-hx,hz-.013);s.lineTo(-hx,-hz+.018);
    s.quadraticCurveTo(-hx,-hz+.001,-hx+.016,-hz+.001);
    const g=new THREE.ExtrudeGeometry(s,{depth:.036,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.0045,bevelThickness:.0045,curveSegments:20});
    g.translate(0,0,-.018);g.rotateX(-Math.PI/2);return g;
  }),deskTimber,deskX,JIANGNAN_DESK.topY-.0225,deskZ,desk);
  top.name='aged-elm-desk-top';grainAlong(top,'x',JIANGNAN_DESK.width,deskDepth,0,true);
  const deskJoinery = [], deskHandles = [], drawerGaps = [];
  for(const z of [-2.22,-1.535])deskJoinery.push(grainAlong(box(deskX,.682,z,1.91,.064,.046,chairTimber,desk,.004),'x',1.91,.064));
  for(const z of [-2.20,-1.56]){
    const leg=grainAlong(cylinder(-.125,.365,z,.027,.72,chairTimber,desk,.043,4),'y',.72,.067);
    leg.rotation.y=Math.PI/4;leg.rotation.z=z<-1.8?-.012:.012;deskJoinery.push(leg);
  }
  deskJoinery.push(grainAlong(box(-.125,.25,deskZ,.038,.043,.68,chairTimber,desk,.003),'z',.68,.043));
  deskJoinery.push(grainAlong(box(-.125,.683,deskZ,.050,.066,.73,chairTimber,desk,.004),'z',.73,.066));
  // A dark recessed carcass makes the drawer reveals read as joinery.
  drawerGaps.push(box(1.54,.389,-1.89,.495,.61,.68,seam,desk,.004));
  for(const x of [1.29,1.79])deskJoinery.push(grainAlong(box(x,.394,-1.89,.031,.627,.70,chairTimber,desk,.004),'y',.627,.70));
  for (let i = 0; i < 3; i++) {
    deskJoinery.push(grainAlong(box(1.54,.193+i*.194,-1.54,.466,.171,.028,chairTimber,desk,.003),'x',.466,.171,i*.027));
    drawerGaps.push(box(1.54,.226+i*.194,-1.522,.118,.012,.008,seam,desk,.002));
    deskHandles.push(grainAlong(box(1.54,.218+i*.194,-1.513,.127,.009,.022,windowTimber,desk,.002),'x',.127,.022));
  }
  const endGrain = finish.endgrain();
  const endWood = material('#ffffff', .89, { map: endGrain, bumpMap: endGrain, bumpScale: .00018 });
  for (const x of [deskX-JIANGNAN_DESK.width/2-.0003,deskX+JIANGNAN_DESK.width/2+.0003]) {
    const end = mesh(geometry('elm-desk-endgrain', () => new THREE.PlaneGeometry(deskDepth-.017,.031)),endWood,x,JIANGNAN_DESK.topY-.0225,deskZ,desk);
    end.rotation.y = x < deskX ? -Math.PI / 2 : Math.PI / 2;
  }
  for(const x of [1.33,1.74])for(const z of [-2.20,-1.64])deskJoinery.push(grainAlong(cylinder(x,.045,z,.020,.08,chairTimber,desk,.023,4),'y',.08,.046));
  batch(deskJoinery); batch(deskHandles); batch(drawerGaps);
  const repairShape=new THREE.Shape();
  repairShape.moveTo(-.020,-.042);repairShape.lineTo(.020,-.042);repairShape.lineTo(.007,0);repairShape.lineTo(.020,.042);repairShape.lineTo(-.020,.042);repairShape.lineTo(-.007,0);repairShape.closePath();
  const repair=mesh(keep(new THREE.ShapeGeometry(repairShape)),material('#665e4f',.84),-.10,JIANGNAN_DESK.topY+.0003,-1.91,desk);
  repair.name='flush-elm-butterfly-repair';repair.rotation.x=-Math.PI/2;repair.rotation.z=.07;repair.castShadow=false;
  const basket = makeGroup('woven-paper-basket', .16, .190, -2.09, desk);
  const basketMat = material('#9d8c66', .98, { map: linenMap, bumpMap: linenMap, bumpScale: .001 });
  lathe([[.180, -.184], [.205, .180], [.205, .187], [.198, .187], [.174, -.174], [0, -.174]], basketMat, 0, 0, 0, basket, 32);
  ring(0, .185, 0, .203, .0055, basketMat, basket).rotation.x = Math.PI / 2;
  const basketWeave = [];
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2;
    basketWeave.push(tube([[Math.cos(a) * .181, -.17, Math.sin(a) * .181], [Math.cos(a) * .203, .18, Math.sin(a) * .203]], .0027, basketMat, basket, 3));
  }
  for (let i = 0; i < 11; i++) {const weave = ring(0, -.16 + i * .032, 0, .182 + i * .002, .0022, basketMat, basket); weave.rotation.x = Math.PI / 2; basketWeave.push(weave);}
  batch(basketWeave);
  for (let i = 0; i < 3; i++) { const page = box(-.07 + i * .054, .20 + i * .01, 0, .10, .10, .006, paper, basket, .001); page.rotation.set(.35, .15, -.2 + i * .25); }

  const closeChairFoot=(object,center,radius,supportY)=>{
    const g=object.geometry,p=g.attributes.position;
    // Extend just the terminal section, then cut its sole level. The seat
    // and all the upper joinery keep their original height and shape.
    for(let i=0;i<=8;i++)p.setY(i,supportY);
    const positions=Array.from(p.array),uvs=Array.from(g.attributes.uv.array),indices=Array.from(g.index.array),start=p.count;
    for(let i=0;i<8;i++){positions.push(p.getX(i),supportY,p.getZ(i));uvs.push(.5+(p.getX(i)-center[0])/(radius*2),.5+(p.getZ(i)-center[2])/(radius*2));}
    positions.push(center[0],supportY,center[2]);uvs.push(.5,.5);
    for(let i=0;i<8;i++){
      const next=(i+1)%8,ax=p.getX(i)-center[0],az=p.getZ(i)-center[2],bx=p.getX(next)-center[0],bz=p.getZ(next)-center[2];
      if(az*bx-ax*bz<0)indices.push(start+8,start+i,start+next);else indices.push(start+8,start+next,start+i);
    }
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    g.setIndex(indices);g.deleteAttribute('normal');g.computeVertexNormals();
    return object;
  };
  function chair({ name, x, z, wide = false, rotation = 0 }) {
    const c = makeGroup(name, x, 0, z); c.rotation.y = rotation;
    if (!wide) {
      // The continuous crest changes section as it turns: a broad, thin back
      // becomes a comfortable horizontal arm, rather than a round bent pipe.
      const curve = new THREE.CatmullRomCurve3([
        [-.305,.665,-.205],[-.311,.695,-.015],[-.282,.777,.172],
        [-.171,.856,.257],[0,.871,.281],[.171,.856,.257],
        [.282,.777,.172],[.311,.695,-.015],[.305,.665,-.205]
      ].map(p => new THREE.Vector3(...p)), false, 'centripetal');
      const points = [], indices = [], uvs = [], steps = 80, sides = 12;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, p = curve.getPointAt(t), tangent = curve.getTangentAt(t);
        const across = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3().crossVectors(across, tangent).normalize();
        const back = Math.pow(Math.sin(t * Math.PI), 5);
        const horizontal = .031 - back * .014, vertical = .017 + back * .044;
        for (let j = 0; j <= sides; j++) {
          const a = j / sides * Math.PI * 2;
          const v = p.clone().addScaledVector(across, Math.cos(a) * horizontal).addScaledVector(up, Math.sin(a) * vertical);
          points.push(v.x,v.y,v.z);uvs.push(t*.94+.03,j/sides*.84+.08);
          if (i < steps && j < sides) {
            const k = i * (sides + 1) + j;
            indices.push(k, k + sides + 1, k + 1, k + 1, k + sides + 1, k + sides + 2);
          }
        }
      }
      for (const i of [0, steps]) for (let j = 1; j < sides - 1; j++) {
        const base = i * (sides + 1);
        if (i === 0) indices.push(base, base + j + 1, base + j);
        else indices.push(base, base + j, base + j + 1);
      }
      const carved = keep(new THREE.BufferGeometry());
      carved.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      carved.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); carved.setIndex(indices); carved.computeVertexNormals();
      mesh(carved,finish.make('crest'),0,0,0,c).name='carved-elm-crest-rail';
      const leg=(path,radius,supportY)=>closeChairFoot(tube(path,radius,chairTimber,c,18),path[0],radius,supportY);
      for (const sx of [-1, 1]) {
        leg([[sx*.253,.027,-.232],[sx*.232,.409,-.200],[sx*.277,.665,-.159]],.020,-.017+.045/2);
        leg([[sx*.260,.028,.234],[sx*.224,.428,.196],[sx*.238,.780,.213]],.021,.014+.018/2);
        // Shallow dowel ends and a recessed seat rail expose how it is made.
        const peg = cylinder(sx * .258, .681, -.154, .004, .002, darkWood, c, .004, 12); peg.rotation.z = Math.PI / 2;
        tube([[sx*.23,.423,-.205],[sx*.24,.423,.06],[sx*.22,.433,.217]],.017,chairTimber,c,16);
      }
      for(const z of [-.204,.200])tube([[-.235,.426,z],[0,.417,z],[.235,.426,z]],.017,chairTimber,c,16);
      const spindleParts=[];
      for(let i=-2;i<=2;i++){
        const x=i*.063,topX=i*.100,topY=.845+(1-Math.abs(i)/2)*.018;
        spindleParts.push(tube([[x,.468,.143],[x*1.26,.644,.210],[topX,topY,.259-Math.abs(i)*.006]],.0072,chairTimber,c,18,7));
        const mortise=cylinder(x,.471,.143,.009,.002,windowTimber,c,.008,14);spindleParts.push(mortise);
      }
      batchMaterials(spindleParts);
      // A shallow dish is cut into the solid seat, with a softly rounded lip.
      const seatPoints=[],seatUvs=[],seatIndices=[],segments=64,rings=12;
      const seatOutline = (a, radius = 1) => {
        const cs = Math.cos(a), sn = Math.sin(a);
        return [Math.sign(cs) * Math.pow(Math.abs(cs), .53) * .252 * radius * (1 - .055 * sn), Math.sign(sn) * Math.pow(Math.abs(sn), .53) * .226 * radius];
      };
      for(let side=0;side<2;side++)for(let row=0;row<=rings;row++){
        const radial=row/rings;
        for (let j = 0; j <= segments; j++) {
          const [px, pz] = seatOutline(j / segments * Math.PI * 2, radial);
          const y=side?JIANGNAN_WORK_CHAIR.seatY-.028+radial*radial*.004:JIANGNAN_WORK_CHAIR.seatY+radial*radial*.015;
          seatPoints.push(px,y,pz);seatUvs.push(px*1.8+.5,pz*1.8+.5);
          if(row<rings&&j<segments){
            const k=side*(rings+1)*(segments+1)+row*(segments+1)+j,b=k+segments+1;
            if(side)seatIndices.push(k,b,k+1,k+1,b,b+1);else seatIndices.push(k,k+1,b,k+1,b+1,b);
          }
        }
      }
      for(let j=0;j<segments;j++){
        const a=rings*(segments+1)+j,b=(rings+1)*(segments+1)+a;
        seatIndices.push(a,a+1,b,a+1,b+1,b);
      }
      const seatGeometry=keep(new THREE.BufferGeometry());
      seatGeometry.setAttribute('position',new THREE.Float32BufferAttribute(seatPoints,3));
      seatGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(seatUvs,2));seatGeometry.setIndex(seatIndices);seatGeometry.computeVertexNormals();
      mesh(seatGeometry,finish.make('seat'),0,0,0,c).name='handscooped-elm-seat';
      return c;
    }
    const w = wide ? .69 : .55, d = wide ? .65 : .51, y = wide ? JIANGNAN_READING_CHAIR.seatY : .465;
    c.updateWorldMatrix(true,false);rugBody.updateWorldMatrix(true,false);planks.updateWorldMatrix(true,false);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const path=[[sx * w * .46, .045, sz * d * .43], [sx * w * .40, y - .08, sz * d * .36], [sx * w * .40, y + .04, sz * d * .36]];
      // Rotation can put neighbouring feet on different surfaces. Sample the
      // real supporting meshes at each world-space foot before cutting it.
      const origin=c.localToWorld(new THREE.Vector3(path[0][0],.065,path[0][2]));
      const support=new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0),0,.09).intersectObjects([rugBody,planks])[0];
      if(!support)throw new Error('Reading chair foot has no floor or rug support.');
      closeChairFoot(tube(path,.023,ash,c,10),path[0],.023,c.worldToLocal(support.point.clone()).y);
    }
    box(0, y - .055, 0, w + .055, .07, d + .055, ash, c, .025);
    box(0, y + .023, -.006, w, wide ? .14 : .093, d, wide ? darkLinen : linen, c, .033).name='linen-reading-seat-cushion';
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
  const deskChair=chair({name:'curved-wood-desk-chair',x:JIANGNAN_WORK_CHAIR.x,z:JIANGNAN_WORK_CHAIR.z});
  deskChair.userData.action='seat';targets.seat=[JIANGNAN_WORK_CHAIR.x,JIANGNAN_WORK_CHAIR.seatY+.004,JIANGNAN_WORK_CHAIR.z];
  const catBed=makeGroup('walnut-cat-nest',JIANGNAN_CAT_BED.x,0,JIANGNAN_CAT_BED.z,group,'cat-bed');
  const bedLinen=material('#eadbc0',.98,{map:linenMap,bumpMap:linenMap,bumpScale:.0012});
  const bedWool=material('#bba180',1,{map:linenMap,bumpMap:linenMap,bumpScale:.002});
  const trayGeometry=geometry('cat-nest-carved-tray',()=>{
    const g=new THREE.LatheGeometry([[0,.008],[.91,.008],[1,.035],[1,.15],[.96,.164],[.925,.14],[.915,.056],[0,.056]].map(([r,y])=>new THREE.Vector2(r,y)),72);
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++)if(p.getY(i)>.056)p.setY(i,.056+(p.getY(i)-.056)*(.66-.34*p.getZ(i)));
    g.computeVertexNormals();return g;
  });
  const tray=mesh(trayGeometry,joineryTimber,0,0,0,catBed);tray.scale.set(.44,1,.29);
  const catCushion=mesh(geometry('cat-linen-cushion',()=>{
    const g=new THREE.SphereGeometry(1,48,24),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i));p.setY(i,p.getY(i)*(1+Math.sin(a*7)*.018));}g.computeVertexNormals();return g;
  }),bedLinen,0,.087,0,catBed);
  catCushion.name='cat-nest-linen-cushion';catCushion.scale.set(.399,.038,.248);
  const seamPoints=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;seamPoints.push([Math.cos(a)*.394,.086+Math.sin(a*3)*.0015,Math.sin(a)*.244]);}
  tube(seamPoints,.0014,darkLinen,catBed,96,5);
  // A folded wool corner has weight and a shallow drape over the left rim.
  const blanket=box(-.30,.107,.06,.20,.022,.32,bedWool,catBed,.009);blanket.rotation.y=-.16;
  const fall=box(-.412,.069,.07,.026,.10,.245,bedWool,catBed,.007);fall.rotation.z=-.13;
  for(let i=0;i<10;i++)tube([[-.428,.035,-.04+i*.023],[-.431,.020,-.035+i*.023]],.0008,linen,catBed,2,4).castShadow=false;
  targets['cat-bed']=[JIANGNAN_CAT_BED.x,.16,JIANGNAN_CAT_BED.z];

  // Physical computer: its front is exactly aligned with the live DOM plane.
  const deviceShift=JIANGNAN_WORKSTATION.computer.map((value,i)=>value-[1.45,1.22,-1.815][i]);
  const computer=makeGroup('physical-computer',...deviceShift,group,'computer');
  // A softly aged painted shell stays diffuse under the warm lamp. Highly
  // metallic grey turned bronze here because the room is deliberately dim.
  const caseWear = canvasTexture(256, 128, (c, w, h) => {
    c.fillStyle = '#d7d7d7'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#c9c9c9'; c.lineWidth = .6;
    for (let i = 0; i < 13; i++) {
      const x = 14 + i * 17, y = 9 + (i * 29 % 107);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 4 + i % 5, y + .5); c.stroke();
    }
    c.fillStyle = '#dedede'; c.fillRect(1, 1, w - 2, 2);
  });
  caseWear.colorSpace = THREE.NoColorSpace;
  const caseShell = material('#e3e2d7', .82, { metalness: .055, envMapIntensity: .30, roughnessMap: caseWear, bumpMap: caseWear, bumpScale: .00015 });
  const caseBack = material('#c4c9bd', .74, { metalness: .06, envMapIntensity: .25 });
  const caseStand = material('#d8ddd2', .67, { metalness: .12, envMapIntensity: .28, roughnessMap: caseWear });
  const screenTrim = material('#68766e', .70, { metalness: .035 });
  // This shell has its own corner radius, independent of its thin depth.
  // A genuine aperture lets the display sit just inside the rounded rim.
  const softCaseGeometry = (key, w, h, d, corner, edge, aperture) => geometry(key, () => {
    const roundedPath = (Path, width, height, r, offsetY = 0) => {
      const p = new Path(), a = width / 2, b = height / 2;
      p.moveTo(-a + r, -b + offsetY); p.lineTo(a - r, -b + offsetY); p.quadraticCurveTo(a, -b + offsetY, a, -b + r + offsetY);
      p.lineTo(a, b - r + offsetY); p.quadraticCurveTo(a, b + offsetY, a - r, b + offsetY);
      p.lineTo(-a + r, b + offsetY); p.quadraticCurveTo(-a, b + offsetY, -a, b - r + offsetY);
      p.lineTo(-a, -b + r + offsetY); p.quadraticCurveTo(-a, -b + offsetY, -a + r, -b + offsetY);
      return p;
    };
    const shape = roundedPath(THREE.Shape, w - edge * 2, h - edge * 2, corner);
    if (aperture) shape.holes.push(roundedPath(THREE.Path, aperture[0], aperture[1], .005, aperture[2]));
    const g = new THREE.ExtrudeGeometry(shape, { depth: d - edge * 2, bevelEnabled: true, bevelSegments: w < .05 ? 1 : 3, bevelSize: edge, bevelThickness: edge, curveSegments: w < .05 ? 2 : 8 });
    g.translate(0, 0, -d / 2 + edge); return g;
  });
  const foot=mesh(softCaseGeometry('mac-rounded-foot',.40,.27,.025,.028,.003),caseStand,1.45,.8325,-1.91,computer);foot.rotation.x=-Math.PI/2;foot.name='mac-foot-support';
  const stem = box(1.45, .916, -1.92, .10, .145, .047, caseStand, computer, .012); stem.rotation.x = -.13;
  mesh(softCaseGeometry('mac-painted-shell-aperture', .91, .61, .066, .024, .003, [.815, .515, .01]), caseShell, 1.45, 1.21, -1.847, computer);
  box(1.45, 1.21, -1.875, .866, .565, .012, caseBack, computer, .012);
  for (const x of [1.045, 1.855]) box(x, 1.22, -1.816, .010, .516, .006, screenTrim, computer, .0015);
  box(1.45, 1.4755, -1.816, .82, .011, .006, screenTrim, computer, .0015);
  box(1.45, .9645, -1.816, .82, .011, .006, screenTrim, computer, .0015);
  box(1.45, .928, -1.812, .85, .044, .008, caseShell, computer, .0015);
  const display=mesh(geometry('computer-screen',()=>new THREE.PlaneGeometry(.80,.50)),material('#101d1b',.22,{metalness:.12}),1.45,1.22,-1.817,computer);
  display.userData.action = 'computer'; display.castShadow = false;
  const lens = sphere(1.45, 1.502, -1.811, .0025, basic('#39483f'), computer); lens.scale.z = .3;
  const status = sphere(1.813, .928, -1.806, .0013, material('#87a388', .65, { emissive: '#72916c', emissiveIntensity: .2 }), computer); status.scale.z = .35; status.castShadow = false;
  // Soft local contact, not a new light or a shadow-map pass.
  const contactMap = canvasTexture(128, 128, c => {
    const gradient = c.createRadialGradient(64, 64, 12, 64, 64, 63);
    gradient.addColorStop(0, 'rgba(32,34,28,.30)'); gradient.addColorStop(.58, 'rgba(32,34,28,.16)'); gradient.addColorStop(1, 'rgba(32,34,28,0)');
    c.fillStyle = gradient; c.fillRect(0, 0, 128, 128);
  });
  const contactMaterial = keep(new THREE.MeshBasicMaterial({ map: contactMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  const contact = (x, y, z, w, d, parent=computer) => {
    const shadow = mesh(geometry('mac-contact-plane', () => new THREE.PlaneGeometry(1, 1)), contactMaterial, x, y, z, parent);
    shadow.rotation.x = -Math.PI / 2; shadow.scale.set(w, d, 1); shadow.castShadow = shadow.receiveShadow = false;
  };
  contact(1.45,.8206,-1.91,.48,.33);
  const keyboardShift=JIANGNAN_WORKSTATION.keyboard.map((value,i)=>value-[1.45,.845,-1.19][i]);
  const inputs=makeGroup('physical-keyboard',...keyboardShift,group,'computer');
  box(1.45,.8305,-1.34,1.16,.003,.49,darkLinen,inputs,.018).castShadow=false;
  contact(1.45,.8322,-1.19,.59,.23,inputs);
  box(1.45,.845,-1.19,.55,.026,.19,caseShell,inputs,.009);
  const keyMat = material('#e3e3d6', .68), keyGeo = softCaseGeometry('keyboard-soft-key', .029, .009, .027, .0015, .0007);
  const keys = keep(new THREE.InstancedMesh(keyGeo, keyMat, 46));
  let keyIndex = 0;
  for (let row = 0; row < 4; row++) for (let col = 0; col < 14; col++) {
    if (row === 3 && col > 1 && col < 12) continue;
    dummy.position.set(1.219 + col * .035, .862, -1.254 + row * .039); dummy.updateMatrix(); keys.setMatrixAt(keyIndex++, dummy.matrix);
  }
  keys.castShadow=keys.receiveShadow=true;inputs.add(keys);
  box(1.45,.8635,-1.137,.24,.007,.027,keyMat,inputs,.002);
  const mouseShift=JIANGNAN_WORKSTATION.mouse.map((value,i)=>value-[1.87,.857,-1.18][i]);
  const mouseGroup=makeGroup('physical-mouse',...mouseShift,group,'computer');
  const mouse=sphere(1.87,.8625,-1.18,.055,caseShell,mouseGroup);mouse.scale.set(.85,.35,1.5);
  tube([[1.87,.8815,-1.24],[1.87,.8855,-1.21],[1.87,.8855,-1.19]],.0009,caseBack,mouseGroup,8).castShadow=false;
  box(1.87,.8425,-1.188,.18,.003,.24,darkLinen,mouseGroup,.025).castShadow=false;
  contact(1.87,.8442,-1.18,.092,.16,mouseGroup);

  // Opaline glass diffuses across its complete rounded surface. The practical
  // keeps the original single point light; its glow requires no extra pass.
  const lamp=makeGroup('opaline-brass-table-lamp',...JIANGNAN_WORKSTATION.lamp,group,'lamp');
  targets.lamp=[...JIANGNAN_WORKSTATION.lampTarget];
  lathe([[0,-.002],[.102,-.002],[.107,.006],[.103,.028],[.075,.040],[.026,.046],[.018,.074],[.018,.31],[.026,.329]],brass,0,0,0,lamp).name='lamp-foot-support';
  ring(0, .014, 0, .104, .002, agedBrass, lamp).rotation.x = Math.PI / 2;
  const shadeMat = material('#f0d6ac', .48, { emissive: '#ffc880', emissiveIntensity: .47, side: THREE.DoubleSide });
  const shade = lathe([[.029, .447], [.078, .445], [.125, .429], [.161, .401], [.184, .361], [.190, .328], [.185, .314], [.168, .310], [.165, .324], [.159, .350], [.137, .381], [.105, .401], [.056, .416], [.029, .416]], shadeMat, 0, 0, 0, lamp, 64);
  shade.castShadow = false;
  ring(0, .314, 0, .182, .003, ivory, lamp).rotation.x = Math.PI / 2;
  const bulbMat = basic('#ffe8bd');
  sphere(0, .329, 0, .028, bulbMat, lamp).castShadow = false;
  const taskLight = new THREE.PointLight('#ffd29a', JIANGNAN_TABLE_LIGHT.diffuse, 3.1, 2);
  taskLight.name = 'table-opal-diffuse'; taskLight.position.set(0, .313, 0); lamp.add(taskLight);
  const lampPool = createTablePool({ THREE, lamp, resources, shadowSize });
  tube([[0, .02, .08], [-.10, .02, .24], [-.15, .014, .44], [-.16, -.26, .47]], .003, black, lamp, 18);

  // A full-height, fine timber lattice turns the former paper-window bay
  // into a domestic memory board. The plaster stays solid behind it.
  const lattice=makeGroup('photo-lattice-north',-1.87,1.75,-2.573);
  const latticePaper=material('#d8cbb0',.98,{map:linenMap,bumpMap:linenMap,bumpScale:.0003}),latticeWood=material('#8c7757',.93);
  box(0,0,-.012,.82,1.82,.024,latticePaper,lattice,.003).name='photo-lattice-backing';
  const latticeParts=[];
  for(let i=0;i<=6;i++)latticeParts.push(box(-.41+i*.82/6,0,.003,i===0||i===6?.018:.005,1.82,.010,latticeWood,lattice,.001));
  for(let i=0;i<=12;i++)latticeParts.push(box(0,-.91+i*1.82/12,.004,.82,i===0||i===12?.018:.005,.010,latticeWood,lattice,.001));
  batch(latticeParts).name='photo-lattice-joinery';
  const printPaper=material('#e8dfce',.97),printFrames=[walnut,ash,material('#a89679',.94)],photoImages=new Map();
  function fitPrint(view,texture){
    const ratio=texture.image.width/texture.image.height,inset=view.small?.025:.095,maxW=view.width-inset,maxH=view.height-inset;
    view.mesh.scale.set(Math.min(maxW,maxH*ratio),Math.min(maxH,maxW/ratio),1);
    view.material.map=texture;view.material.color.set(view.small?'#fffdf6':'#d1c8b5');view.material.needsUpdate=true;view.mesh.visible=true;
  }
  function picture(parent, center, width, height, source, action, small=false,style=0) {
    const frame = makeGroup(action ? 'travel-photo-frame' : 'framed-travel-print', ...center, parent, action);
    if(small){
      box(0,0,-.004,width,height,.013,printFrames[style%3],frame,.002);
      box(0,0,.004,width-.009,height-.009,.004,printPaper,frame,.001);
      box(0,height/2-.006,-.007,.008,.025,.024,agedBrass,frame,.001).name='photo-hanging-clip';
    }else{
      box(0, 0, -.022, width, height, .041, walnut, frame, .009);
      box(0, 0, .002, width - .030, height - .030, .009, agedBrass, frame, .003);
      box(0, 0, .008, width - .052, height - .052, .005, paper, frame, .002);
    }
    const photoMat = material('#777d6b', .91);
    const photo = mesh(geometry('photo-plane', () => new THREE.PlaneGeometry(1, 1)), photoMat, 0, small?.003:0, small?.007:.013, frame);
    photo.scale.set(width - .095, height - .095, 1); photo.visible = false; photo.castShadow = false;
    if(source){
      if(!photoImages.has(source))photoImages.set(source,{texture:null,loading:false,views:[]});
      const image=photoImages.get(source),view={mesh:photo,material:photoMat,width,height,small};
      if(image.texture)fitPrint(view,image.texture);
      else{image.views.push(view);if(!image.loading){image.loading=true;new THREE.TextureLoader().load(source,texture=>{
        if(isDisposed?.()){texture.dispose();return;}
        texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;textures.add(texture);image.texture=texture;
        image.views.forEach(view=>fitPrint(view,texture));image.views.length=0;wake();
      },undefined,()=>{});}}
    }
    return frame;
  }
  const photoWall=makeGroup('travel-photo-wall');
  const wallPhotos=photos.filter(photo=>photo?.id&&(photo.thumb||photo.image)),placedPhotos=new Set();
  JIANGNAN_PHOTO_WALL.forEach((slot,index)=>{
    const photo=wallPhotos.find(photo=>photo.id===slot.photoId)||wallPhotos[index%wallPhotos.length];if(!photo)return;
    const action='photo:'+photo.id,first=!placedPhotos.has(photo.id);
    const frame=picture(photoWall,slot.position,slot.width,slot.height,photo.thumb||photo.image,action,slot.small,index);
    frame.name='wall-photo-'+photo.id+(first?'':'-'+index);frame.rotation.set(0,slot.yaw,slot.tilt||0);
    if(first)targets[action]=[...slot.position];placedPhotos.add(photo.id);
    if(index===0)targets.photo=[...slot.position];
  });
  // The coffee is open at the rim, with a real glazed inner wall and liquid.
  const coffee=makeGroup('hand-thrown-coffee-cup',...JIANGNAN_WORKSTATION.coffee,group,'coffee');
  const cupProfile = [[.032, -.074], [.050, -.070], [.057, -.053], [.064, .048], [.064, .062], [.061, .067], [.057, .062], [.056, .046], [.050, -.045], [.034, -.053]];
  lathe(cupProfile, ceramic, 0, 0, 0, coffee);
  const handle = ring(.067, .003, 0, .036, .009, ceramic, coffee, Math.PI * 1.64); handle.rotation.set(0, 0, -.82); handle.scale.x = .75;
  cylinder(0, .043, 0, .055, .003, material('#392b1d', .25), coffee, .055, 48);
  const crema = ring(-.009, .046, -.004, .030, .0017, material('#b69b69', .47), coffee, Math.PI * 1.7); crema.rotation.x = Math.PI / 2;
  cylinder(0,-.076,0,.094,.011,ceramic,coffee,.098).name='coffee-saucer';
  ring(0, -.069, 0, .075, .0025, ceramic, coffee).rotation.x = Math.PI / 2;
  tube([[.07, -.066, .058], [.12, -.065, .053], [.145, -.064, .05]], .003, brass, coffee, 10);
  const spoon = sphere(.15, -.063, .05, .012, brass, coffee); spoon.scale.set(.7, .16, 1.45);
  const steamMaterial = basic('#c3c4b2', { transparent: true, opacity: .13, depthWrite: false });
  const steam = makeGroup('coffee-steam', 0, .07, 0, coffee);
  for (let i = 0; i < 3; i++) tube([[i * .014 - .015, 0, 0], [i * .014 - .018, .04, .006], [i * .014 - .008, .09, -.003], [i * .014 - .012, .14, .004]], .0015, steamMaterial, steam, 18).castShadow = false;

  // A low sideboard keeps the whole counter within reach. The open library
  // bay has a recessed back, shelf pins and framed door joinery beside it.
  const cabinet = makeGroup('low-walnut-library-sideboard', 0, 0, 0, group, 'books');
  targets.books = [-2.48, .59, -.80];
  const carcass = [], doorTrim = [];
  carcass.push(grainAlong(box(-3.145, .49, -1.20, .055, .84, 2.48, joineryTimber, cabinet, .004), 'z', 2.48, .84));
  for (const z of [-2.43, .03]) carcass.push(grainAlong(box(-2.83, .49, z, .66, .84, .046, joineryTimber, cabinet, .005), 'y', .84, .66));
  for (const y of [.09, .48, .91]) carcass.push(grainAlong(box(-2.83, y, -1.20, .66, .042, 2.48, joineryTimber, cabinet, .004), 'z', 2.48, .66));
  carcass.push(grainAlong(box(-2.83, .49, -1.29, .63, .82, .034, joineryTimber, cabinet, .003), 'y', .82, .63));
  for (const z of [-2.34, -.06]) for (const x of [-3.05, -2.61]) carcass.push(grainAlong(box(x, .045, z, .057, .09, .062, frameTimber, cabinet, .004), 'y', .09, .062));
  // Framed fronts enclose the coffee supplies; the right half stays open.
  box(-2.493, .49, -1.86, .024, .792, 1.08, seam, cabinet, .002);
  for (const z of [-2.13, -1.59]) {
    carcass.push(grainAlong(box(-2.481, .49, z, .027, .756, .517, joineryTimber, cabinet, .003), 'y', .756, .517));
    for (const dz of [-.232, .232]) doorTrim.push(grainAlong(box(-2.461, .49, z + dz, .014, .712, .024, frameTimber, cabinet, .002), 'y', .712, .024));
    for (const y of [.145, .835]) doorTrim.push(grainAlong(box(-2.46, y, z, .015, .022, .475, frameTimber, cabinet, .002), 'z', .475, .022));
    const knob = cylinder(-2.444, .57, z + .18, .009, .018, agedBrass, cabinet, .008, 16); knob.rotation.z = Math.PI / 2;
  }
  batchMaterials(carcass); batch(doorTrim);
  // A thin honed stone counter sits on a timber lip, with a real edge reveal.
  box(-2.826, .944, -1.20, .697, .042, 2.53, stone, cabinet, .007);
  const shelf = makeGroup('bracketed-walnut-wall-shelf', 0, 0, 0, group, 'shelf-light');
  targets['shelf-light'] = [-2.66, 1.85, -1.30];
  const shelfWood = [], brackets = [];
  shelfWood.push(grainAlong(box(-2.94, 1.89, -1.22, .45, .065, 2.46, joineryTimber, shelf, .004), 'z', 2.46, .45));
  for (const z of [-2.20, -.30]) {
    brackets.push(box(-3.13, 1.73, z, .026, .29, .025, agedBrass, shelf, .003));
    brackets.push(tube([[-3.12, 1.61, z], [-2.85, 1.85, z], [-2.74, 1.85, z]], .008, agedBrass, shelf, 8));
  }
  batch(shelfWood); batch(brackets);
  const shelfLights = [], shelfBulbs = [];
  for (const z of [-2.10, -1.25, -.20]) {
    cylinder(-2.80, 1.850, z, .034, .015, agedBrass, shelf, .031, 24);
    const emitter = material('#e2c392', .35, { emissive: '#ffc57e', emissiveIntensity: .85 });
    shelfBulbs.push(emitter);
    cylinder(-2.80, 1.839, z, .025, .004, emitter, shelf, .025, 24).castShadow = false;
    const light = new THREE.SpotLight('#ffcf99', 2.55, 2.5, .91, .79, 2);
    light.userData.baseIntensity = 2.55;
    light.position.set(-2.80, 1.833, z); light.target.position.set(-2.72, .96, z);
    shelf.add(light, light.target); shelfLights.push(light);
  }
  // Two recessed brass fittings belong inside the book cubby, below the
  // opaque counter. Their light reaches the spines without a floor glow.
  for (const z of [-.99, -.38]) {
    cylinder(-2.514, .877, z, .021, .012, agedBrass, cabinet, .019, 24);
    const emitter = material('#dec396', .48, {emissive:'#ffd09a', emissiveIntensity:.65});
    cylinder(-2.514, .869, z, .015, .003, emitter, cabinet, .015, 24).castShadow = false;
    shelfBulbs.push(emitter);
    const light = new THREE.SpotLight('#ffd4a2', .065, .62, 1.15, 1, 2);
    light.name = 'book-cubby-light'; light.userData.practical = 'book'; light.userData.baseIntensity = .065;
    light.position.set(-2.514, .865, z); light.target.position.set(-2.584, .665, z);
    cabinet.add(light, light.target); shelfLights.push(light);
  }
  const palette = ['#77694e', '#52645b', '#a4946e', '#736f5e', '#5b6654', '#90795e', '#4d5957', '#a28765', '#7a765f', '#3e5652'];
  const bookAtlas = canvasTexture(1024, 1024, (c) => {
    for (let i = 0; i < 10; i++) {
      const x = i * 100; c.fillStyle = palette[i]; c.fillRect(x, 0, 100, 1024);
      c.fillStyle = '#c2b394'; c.fillRect(x + 10, 59, 80, 4); c.fillRect(x + 10, 946, 80, 3);
      const title = String(books[i]?.title || ''), chars = [...title].slice(0, 16);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ece3cb'; c.font = '34px Georgia, serif';
      chars.forEach((char, j) => c.fillText(char, x + 50, 135 + j * 43));
      c.font = '18px Georgia, serif'; c.fillStyle = '#d6cdb4'; c.fillText(String(i + 1).padStart(2, '0'), x + 50, 886);
    }
  });
  const spineMaterial = material('#e5dfcc', .93, { map: bookAtlas });
  for (let i = 0; i < 10; i++) {
    const h = .29 + (i * 7 % 5) * .018, t = .064 + i % 3 * .013, z = -1.16 + i * .105;
    const action = books[i]?.id ? 'book:' + books[i].id : 'books';
    const book = makeGroup('travel-book-' + (i + 1), -2.725, .506 + h / 2, z, cabinet, action);
    if (books[i]?.id) targets[action] = [-2.568, .506 + h / 2, z];
    book.rotation.x = i === 0 ? -.13 : i === 9 ? .11 : 0;
    const cover = material(palette[i], .92);
    box(0, 0, 0, .29, h, t, cover, book, .002);
    box(.003, 0, 0, .277, h - .012, t - .011, paper, book, .001);
    for (const dz of [-t / 2, t / 2]) box(0, 0, dz, .294, h + .006, .005, cover, book, .001);
    const g = keep(new THREE.PlaneGeometry(t, h)), uv = g.attributes.uv;
    for (let n = 0; n < uv.count; n++) uv.setX(n, (i * 100 + uv.getX(n) * 100) / 1024);
    const spine = mesh(g, spineMaterial, .151, 0, 0, book); spine.rotation.y = Math.PI / 2;
  }
  const aluminum = material('#a8a99e', .29, { metalness: .76, envMapIntensity: .65 });
  // A serviceable walnut plinth, machined silver deck and isolated feet sit on
  // the counter. Only the platter rotates; the arm and controls stay fixed.
  const record = makeGroup('walnut-silver-record-player', -2.82, 1.015, -.50, cabinet, 'vinyl');
  // Aim at the physical platter, not the air above its near edge. A shallow
  // ray through that old point continued into a different record sleeve.
  targets.vinyl = [-2.82, 1.086, -.45];
  box(0, 0, 0, .49, .078, .66, joineryTimber, record, .011);
  box(0, .043, 0, .475, .010, .643, aluminum, record, .005);
  const feet = [], isolationRings = [];
  for (const x of [-.18, .18]) for (const z of [-.265, .265]) {
    feet.push(cylinder(x, -.049, z, .027, .024, black, record, .024, 24));
    isolationRings.push(cylinder(x, -.043, z, .029, .008, aluminum, record, .029, 24));
  }
  batch(feet); batch(isolationRings);
  const platter = makeGroup('vinyl-platter', 0, .050, .05, record);
  cylinder(0, .004, 0, .211, .021, aluminum, platter, .211, 64);
  cylinder(0, .017, 0, .204, .005, black, platter, .204, 64);
  cylinder(0, .021, 0, .201, .002, black, platter, .201, 64);
  const vinyl = material('#242922', .36, { metalness: .09 });
  const grooves = [];
  for (let i = 0; i < 22; i++) {const groove = ring(0, .0226, 0, .084 + i * .0052, .00045, vinyl, platter); groove.rotation.x = Math.PI / 2; grooves.push(groove);}
  batch(grooves);
  const labelMaterial = material('#c8b693', .85);
  cylinder(0, .023, 0, .053, .0015, labelMaterial, platter, .053, 48);
  cylinder(0, .030, 0, .003, .012, aluminum, platter, .003, 12);
  cylinder(.145, .067, -.19, .028, .045, brass, record);
  const counterweight = cylinder(.154, .101, -.242, .021, .050, aluminum, record, .021, 32); counterweight.rotation.x = Math.PI / 2;
  ring(.145, .086, -.19, .026, .004, black, record).rotation.x = Math.PI / 2;
  tube([[.145, .09, -.19], [.16, .10, -.10], [.105, .09, .10], [.075, .082, .17]], .005, aluminum, record, 22);
  box(.073, .079, .18, .018, .018, .043, black, record, .004);
  tube([[.072, .070, .19], [.070, .064, .197]], .0013, brass, record, 2);
  tube([[.20, .06, -.14], [.20, .10, -.14], [.215, .105, -.15]], .0025, aluminum, record, 6);
  const speedKnob = cylinder(.251, .006, -.19, .016, .014, aluminum, record, .016, 24); speedKnob.rotation.z = Math.PI / 2;
  const startKnob = cylinder(.251, .006, .24, .010, .010, aluminum, record, .010, 20); startKnob.rotation.z = Math.PI / 2;
  tube([[.259, .006, -.19], [.259, .015, -.19]], .001, black, record, 2);
  // A real horn and walnut enclosure are the room's sound control. The mouth
  // has an invisible raycast disk, so its open centre is as clickable as its lip.
  const hornSpeaker = makeGroup('independent-walnut-horn-speaker', -2.82, 1.034, .31, group, 'speaker');
  box(0, -.531, 0, .31, .974, .32, joineryTimber, hornSpeaker, .007);
  box(.160, -.531, 0, .012, .876, .264, darkLinen, hornSpeaker, .005);
  for (const z of [-.127, .127]) box(.169, -.531, z, .009, .865, .009, agedBrass, hornSpeaker, .002);
  box(0, -.020, 0, .35, .032, .35, joineryTimber, hornSpeaker, .006);
  box(0, -.998, 0, .33, .035, .34, joineryTimber, hornSpeaker, .005);
  box(0, .082, 0, .34, .154, .33, joineryTimber, hornSpeaker, .010);
  box(.176, .082, 0, .008, .125, .295, darkLinen, hornSpeaker, .004);
  const hornMetal = material('#79523b', .48, { metalness: .67, side: THREE.DoubleSide, envMapIntensity: .45 });
  const horn = lathe([[.023, 0], [.026, .045], [.040, .095], [.075, .140], [.125, .182], [.171, .204], [.177, .213], [.171, .220], [.165, .208], [.119, .192], [.067, .151], [.034, .103], [.020, .045], [.018, .005]], hornMetal, .055, .276, 0, hornSpeaker, 64);
  horn.rotation.z = -Math.PI / 2;
  const hornLip = ring(.271, .276, 0, .173, .0033, brass, hornSpeaker); hornLip.rotation.y = Math.PI / 2;
  const throat = cylinder(.060, .276, 0, .019, .003, black, hornSpeaker, .019, 24); throat.rotation.z = Math.PI / 2;
  tube([[.045, .150, 0], [.040, .231, 0], [.061, .276, 0]], .011, agedBrass, hornSpeaker, 14);
  const speakerHit = mesh(geometry('speaker-mouth-hit', () => new THREE.CircleGeometry(.178, 32)), basic('#000000', { transparent: true, opacity: 0, depthWrite: false, colorWrite: false, side: THREE.DoubleSide }), .278, .276, 0, hornSpeaker);
  speakerHit.rotation.y = Math.PI / 2; speakerHit.userData.action = 'speaker'; speakerHit.castShadow = speakerHit.receiveShadow = false;
  const indicatorMat = material('#4e4635', .56, { emissive: '#9d5f28', emissiveIntensity: 0 });
  const indicator = sphere(.184, .080, -.115, .006, indicatorMat, hornSpeaker); indicator.scale.x = .35; indicator.castShadow = false;
  const control = cylinder(.190, .079, .105, .019, .018, agedBrass, hornSpeaker, .017, 24); control.rotation.z = Math.PI / 2;
  tube([[.202, .079, .105], [.202, .091, .105]], .0013, paper, hornSpeaker, 2).castShadow = false;
  const soundTarget = [-2.542, 1.310, .31];
  targets.speaker = [...soundTarget];
  // One compact lever espresso machine. An exposed stainless boiler and
  // separate grouphead leave the cup visible beneath the wooden portafilter.
  const espresso = makeGroup('vintage-espresso-corner', -2.84, .967, -2.095, cabinet, 'espresso');
  targets.espresso = [-2.48, 1.19, -2.095];
  const enamel = material('#617265', .40, { metalness: .28 });
  const stainless = material('#d0d5cf', .25, {metalness:.78, envMapIntensity:.75});
  box(.045, .029, 0, .57, .048, .365, enamel, espresso, .013);
  box(.045, .057, 0, .56, .010, .355, stainless, espresso, .006);
  for (const z of [-.13, .13]) for (const x of [-.17, .24]) cylinder(x, .008, z, .016, .016, black, espresso, .013, 16);
  box(-.135, .16, -.025, .15, .205, .25, enamel, espresso, .014);
  lathe([[.064,.060],[.094,.071],[.106,.101],[.106,.338],[.103,.377],[.086,.399],[.032,.407],[0,.407]], stainless, -.035, 0, -.025, espresso, 56);
  for (const y of [.102,.337]) ring(-.035, y, -.025, .107, .003, aluminum, espresso).rotation.x = Math.PI / 2;
  cylinder(-.035, .414, -.025, .025, .013, black, espresso, .023, 28);
  const grouphead = makeGroup('single-espresso-grouphead', .260, .224, 0, espresso);
  tube([[-.26,.04,-.025],[-.13,.041,-.025],[-.07,.021,0],[0,.021,0]], .018, stainless, grouphead, 12);
  cylinder(0, .014, 0, .050, .064, stainless, grouphead, .047, 40);
  cylinder(0, -.035, 0, .043, .030, stainless, grouphead, .039, 40);
  ring(0, -.048, 0, .040, .003, black, grouphead).rotation.x = Math.PI / 2;
  // One portafilter handle projects towards the visitor, with a metal tang.
  const tang = cylinder(.064, -.025, 0, .008, .062, stainless, grouphead, .008, 20); tang.rotation.z = Math.PI / 2;
  const portafilterHandle = lathe([[.009,-.051],[.014,-.045],[.015,.035],[.012,.047],[.006,.052]], joineryTimber, .107, -.025, 0, grouphead, 32); portafilterHandle.rotation.z = -Math.PI / 2;
  const leverPin = cylinder(.247, .277, -.032, .010, .068, stainless, espresso, .010, 20); leverPin.rotation.x = Math.PI / 2;
  tube([[.247,.277,-.032],[.199,.350,-.032],[.087,.463,-.032]], .0065, stainless, espresso, 14);
  const leverGrip = cylinder(.058, .490, -.032, .014, .083, joineryTimber, espresso, .013, 28); leverGrip.rotation.z = -.79;
  const gauge = makeGroup('espresso-pressure-gauge', .075, .323, .013, espresso);
  const gaugeFace = cylinder(0, 0, 0, .033, .010, paper, gauge, .033, 40); gaugeFace.rotation.z = Math.PI / 2;
  ring(.006, 0, 0, .034, .003, stainless, gauge).rotation.y = Math.PI / 2;
  const gaugeMarks = [];
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * .72 + i / 8 * Math.PI * 1.44;
    gaugeMarks.push(tube([[.008, Math.cos(a)*.023, Math.sin(a)*.023],[.008,Math.cos(a)*.028,Math.sin(a)*.028]], .00065, black, gauge, 2));
  }
  gaugeMarks.push(tube([[.009,0,0],[.009,.017,-.010]], .0011, black, gauge, 2));batch(gaugeMarks);
  const steamWand = makeGroup('espresso-steam-wand', 0, 0, 0, espresso);
  tube([[.019,.294,.075],[.110,.273,.122],[.168,.214,.149],[.169,.126,.149],[.183,.114,.149]], .0045, stainless, steamWand, 16);
  const steamValve = cylinder(.031,.300,.097,.019,.025,joineryTimber,steamWand,.017,24); steamValve.rotation.x = Math.PI / 2;
  cylinder(.184,.112,.149,.006,.012,aluminum,steamWand,.005,16);
  // The recessed drip tray has individual slots instead of a front panel.
  box(.239,.069,0,.171,.009,.292,black,espresso,.004);
  const dripGrid=[];
  for(let i=0;i<9;i++)dripGrid.push(box(.239,.075,-.128+i*.032,.168,.003,.009,stainless,espresso,.001));batch(dripGrid);
  const demitasse = lathe([[.017,0],[.024,.005],[.026,.038],[.023,.044],[.020,.039],[.017,.006]], ivory, .282, .080, 0, espresso, 28);
  demitasse.name = 'espresso-cup';
  const demitasseHandle = ring(.282,.102,.029,.013,.003,ivory,espresso,Math.PI*1.65);demitasseHandle.rotation.y = Math.PI / 2;
  cylinder(.282,.079,0,.036,.004,ivory,espresso,.036,28);
  cylinder(.282,.118,0,.0195,.0015,material('#4b2e1c',.37),espresso,.0195,28);
  tube([[.260,.174,0],[.260,.150,0],[.282,.140,0],[.282,.134,0]], .0035, stainless, espresso, 8);
  const brewStream = cylinder(.282,.126,0,.0015,.023,material('#533820',.44),espresso,.0013,8);brewStream.name = 'espresso-brew-stream';brewStream.visible = false;
  const brewSteam = makeGroup('espresso-cup-steam', .282, .126, 0, espresso);
  const brewSteamMaterial = basic('#d3cab6', {transparent:true, opacity:.15, depthWrite:false});
  for (let i = 0; i < 2; i++) tube([[i * .01, 0, 0], [-.009 + i * .013, .035, .002], [.006 + i * .006, .079, -.005]], .0015, brewSteamMaterial, brewSteam, 12).castShadow = false;
  brewSteam.visible = false;
  // The separate grinder has a clear hopper, beans and a short dosing chute.
  const grinder = makeGroup('ribbed-coffee-grinder', -2.84, .967, -1.66, cabinet, 'espresso');
  box(0, .020, 0, .27, .040, .25, black, grinder, .009);
  cylinder(0, .143, 0, .080, .21, enamel, grinder, .076, 32);
  const flutes = [];
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2;
    flutes.push(cylinder(Math.cos(a) * .078, .143, Math.sin(a) * .078, .004, .18, agedBrass, grinder, .004, 6));
  }
  batch(flutes);
  lathe([[.031,.246],[.073,.270],[.076,.366],[.069,.376],[.066,.370],[.066,.277],[.028,.253]], material('#bcc2b5',.14,{transparent:true,opacity:.20,metalness:.04,depthWrite:false,side:THREE.DoubleSide}), 0, 0, 0, grinder, 32);
  const beanGeometry=geometry('coffee-grinder-bean',()=>new THREE.SphereGeometry(1,10,6));
  const beanMaterial=material('#4e3020',.78);
  lathe([[0,.247],[.026,.247],[.060,.276],[.062,.309],[0,.309]],beanMaterial,0,0,0,grinder,32);
  const beans=keep(new THREE.InstancedMesh(beanGeometry,beanMaterial,64));beans.name='coffee-grinder-beans';
  for(let i=0;i<64;i++){
    const a=i*2.399963,r=Math.sqrt((i%23)/23)*.058;
    dummy.position.set(Math.cos(a)*r,.282+Math.floor(i/23)*.014+(i%3)*.002,Math.sin(a)*r);
    dummy.rotation.set(i*.43,i*.71,i*.17);dummy.scale.set(.0085,.0055,.006);dummy.updateMatrix();beans.setMatrixAt(i,dummy.matrix);
  }
  dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);beans.castShadow=true;beans.receiveShadow=true;grinder.add(beans);
  cylinder(0, .379, 0, .077, .010, darkWood, grinder, .074, 32);
  box(.096, .172, 0, .096, .032, .044, aluminum, grinder, .005);
  // A shallow sleeve rack presents real catalog choices independently of the
  // turntable. A generated cover remains legible when a local photo is absent.
  const sleeveRack = makeGroup('selectable-record-sleeve-rack', -3.075, .967, -1.12, cabinet, 'records');
  targets.records = [-2.99, 1.16, -1.12];
  box(.025, .012, 0, .16, .023, 1.03, joineryTimber, sleeveRack, .004);
  box(.101, .037, 0, .012, .052, 1.03, joineryTimber, sleeveRack, .003);
  const recordSelections = [];
  const coverColors = ['#253c42', '#75563c', '#52616b', '#68705a', '#684e4b'];
  const labelMaps = new Map();
  for (let i = 0; i < albums.length; i++) {
    const album = albums[i], dz = albums.length === 1 ? 0 : -.35 + i / (albums.length - 1) * .70;
    const action = 'record:' + album.id;
    const sleeve = makeGroup('record-sleeve-' + album.id, .010 + i * .008, .185, dz, sleeveRack, action);
    sleeve.rotation.z = -.10; sleeve.rotation.y = -.035 + i * .025;
    box(0, 0, 0, .008, .31, .31, paper, sleeve, .001);
    const coverMap = canvasTexture(512, 512, (c, w, h) => {
      c.fillStyle = coverColors[i % coverColors.length]; c.fillRect(0, 0, w, h);
      const gradient = c.createLinearGradient(0, h * .28, w, h);
      gradient.addColorStop(0, '#b2ad8830'); gradient.addColorStop(1, '#15282b80');
      c.fillStyle = gradient; c.fillRect(18, 18, w - 36, h - 36);
      c.strokeStyle = '#d7ccb165'; c.lineWidth = 2; c.strokeRect(17, 17, w - 34, h - 34);
      c.fillStyle = '#e3dac5'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '35px Georgia, serif';
      const chars = [...String(album.title)];
      const lines = chars.length > 14 ? [chars.slice(0, 14).join(''), chars.slice(14, 28).join('')] : [chars.join('')];
      lines.forEach((line, n) => c.fillText(line, w / 2, 108 + n * 48, w - 56));
      c.fillStyle = '#0e272880';
      c.beginPath(); c.moveTo(0, h * .68);
      for (let p = 0; p <= 20; p++) c.lineTo(p / 20 * w, h * (.70 + Math.sin(p * .39 + i) * .10));
      c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
      c.fillStyle = '#d7c9a0'; c.font = '18px Georgia, serif'; c.fillText('33⅓', w / 2, h - 48);
    });
    const coverMaterial = material('#ffffff', .88, { map: coverMap });
    const face = mesh(geometry('record-cover-square', () => new THREE.PlaneGeometry(.302, .302)), coverMaterial, .005, 0, 0, sleeve);
    face.rotation.y = Math.PI / 2; face.castShadow = false;
    const markerMaterial = material('#806c47', .56, {metalness:.3});
    const marker = box(.110, -.136, 0, .008, .009, .18, markerMaterial, sleeve, .001); marker.castShadow = false;
    recordSelections.push({ id: album.id, material: markerMaterial });
    targets[action] = [-3.055 + i * .008, 1.152, -1.12 + dz];
    labelMaps.set(album.id, canvasTexture(256, 256, (c, w, h) => {
      c.fillStyle = coverColors[i % coverColors.length]; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#d3c5a1'; c.lineWidth = 2; c.beginPath(); c.arc(w / 2, h / 2, 112, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#eee4cc'; c.textAlign = 'center'; c.font = '19px Georgia, serif';
      c.fillText(String(album.title), w / 2, 86, 188); c.font = '14px Georgia, serif'; c.fillText('33⅓', w / 2, 183);
    }));
    // Covers may come from the existing local photo catalog, never a new
    // third-party request. This callback participates in world disposal.
    if (typeof album.cover === 'string' && /^\/(?!\/)/.test(album.cover)) new THREE.TextureLoader().load(album.cover, texture => {
      if (isDisposed?.()) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; textures.add(texture);
      const canvas = coverMap.image, c = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
      const ratio = texture.image.width / texture.image.height;
      const side = ratio > 1 ? texture.image.height : texture.image.width;
      c.drawImage(texture.image, (texture.image.width - side) / 2, (texture.image.height - side) / 2, side, side, 0, 0, w, h);
      c.fillStyle = '#1020258c'; c.fillRect(0, 0, w, 124);
      c.fillStyle = '#eee4cc'; c.font = '33px Georgia, serif'; c.textAlign = 'center'; c.fillText(String(album.title), w / 2, 76, w - 36);
      coverMap.needsUpdate = true; wake();
    }, undefined, () => {});
  }
  // A short stack of well-thumbed paperbacks breaks the shelf's regularity.
  for (let i = 0; i < 3; i++) {
    const paperback = makeGroup('well-thumbed-paperback-' + i, -2.94, 1.94 + i * .034, -1.12, shelf, 'books');
    paperback.rotation.y = -.04 + i * .035;
    box(0, 0, 0, .32, .031, .43, material(palette[3 + i], .96), paperback, .002).castShadow = false;
    box(.012, .001, 0, .307, .023, .408, paper, paperback, .001).castShadow = false;
  }
  // Collected ceramics keep the upper shelves sparse, away from the book spines.
  lathe([[.04, 0], [.07, .015], [.12, .10], [.11, .19], [.055, .25], [.044, .29], [.05, .30], [.04, .30], [.036, .28]], material('#9b947b', .87), -2.94, 1.925, -.40, shelf).userData.action = 'vase';
  lathe([[.05, 0], [.10, .01], [.10, .07], [.08, .13], [.043, .15]], material('#746f57', .91), -2.94, 1.925, -1.83, shelf);
  tube([[-2.94, 2.21, -.40], [-2.90, 2.40, -.43], [-2.85, 2.49, -.48]], .003, darkWood, shelf, 12);
  for (let i = 0; i < 5; i++) {
    const leaf = sphere(-2.91 + (i % 2) * .08, 2.29 + i * .037, -.41 - i * .016, .035, green, shelf);
    leaf.scale.set(.42, 1, .14); leaf.rotation.z = i % 2 ? .85 : -.75;
  }
  // This short brass picture light is screwed to the wall and aims at the
  // upper stoneware. Its small pool belongs to a visible physical fitting.
  box(-3.158, 2.43, -.40, .020, .066, .053, agedBrass, shelf, .005);
  tube([[-3.14, 2.43, -.40], [-3.055, 2.46, -.40], [-3.005, 2.445, -.40]], .006, brass, shelf, 10);
  const vaseHood = cylinder(-3.0, 2.43, -.40, .029, .043, brass, shelf, .024, 32); vaseHood.rotation.z = .50;
  const vaseEmitter = material('#e0c393', .42, {emissive:'#ffd29a', emissiveIntensity:.75});
  const vaseBulb = cylinder(-2.989, 2.408, -.40, .022, .003, vaseEmitter, shelf, .022, 24); vaseBulb.rotation.z = .50; vaseBulb.castShadow = false;
  shelfBulbs.push(vaseEmitter);
  const vaseLight = new THREE.SpotLight('#ffd09a', .85, 1.05, .65, .67, 2);
  vaseLight.userData.baseIntensity = .85;
  vaseLight.position.set(-2.986, 2.404, -.40); vaseLight.target.position.set(-2.94, 2.10, -.40);
  shelf.add(vaseLight, vaseLight.target); shelfLights.push(vaseLight);

  // A small glazed European clock: the dial, hands and moving pendulum sit
  // behind the walnut door instead of being painted onto a flat rectangle.
  const clock = makeGroup('glazed-walnut-pendulum-clock', -2.78, 1.97, -2.48, group, 'clock');
  targets.clock = [-2.78, 2.00, -2.39];
  const clockWood = [], clockBrass = [];
  clockWood.push(box(0, -.015, -.018, .328, .738, .090, frameTimber, clock, .005));
  box(0, -.035, .031, .276, .642, .013, seam, clock, .001);
  for (const x of [-.157, .157]) clockWood.push(grainAlong(box(x, -.018, .054, .025, .709, .055, joineryTimber, clock, .003), 'y', .709, .055));
  for (const y of [-.366, .337]) {
    clockWood.push(box(0, y, .038, .376, .029, .144, joineryTimber, clock, .004));
    clockWood.push(box(0, y + (y > 0 ? .023 : -.023), .028, .351, .018, .123, frameTimber, clock, .003));
  }
  const crownShape = new THREE.Shape();
  crownShape.moveTo(-.174, .358); crownShape.bezierCurveTo(-.105, .360, -.090, .433, 0, .433);
  crownShape.bezierCurveTo(.090, .433, .105, .360, .174, .358); crownShape.closePath();
  const crownGeometry = keep(new THREE.ExtrudeGeometry(crownShape, {depth:.05, bevelEnabled:true, bevelSize:.003, bevelThickness:.003, bevelSegments:2, curveSegments:16}));
  clockWood.push(mesh(crownGeometry, joineryTimber, 0, 0, -.015, clock));
  clockWood.push(box(0, -.409, .016, .104, .038, .079, joineryTimber, clock, .009));
  batchMaterials(clockWood);
  const dialMap = canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = '#d8c9a5'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#8a7650'; c.lineWidth = 3;
    c.beginPath(); c.arc(w / 2, h / 2, 239, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#493e2b';
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2, inside = i % 5 ? 222 : 213;
      c.lineWidth = i % 5 ? 1.3 : 3;
      c.beginPath(); c.moveTo(w / 2 + Math.sin(a) * inside, h / 2 - Math.cos(a) * inside);
      c.lineTo(w / 2 + Math.sin(a) * 231, h / 2 - Math.cos(a) * 231); c.stroke();
    }
    c.fillStyle = '#423827'; c.font = '43px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; c.fillText(String(i), w / 2 + Math.sin(a) * 179, h / 2 - Math.cos(a) * 179); }
  });
  const clockDial = mesh(geometry('pendulum-clock-dial', () => new THREE.CircleGeometry(.133, 64)), material('#ffffff', .86, {map:dialMap}), 0, .172, .081, clock);
  clockDial.castShadow = false;
  clockBrass.push(ring(0, .172, .083, .137, .004, agedBrass, clock));
  const clockEpoch = Date.now(), clockAtLoad = new Date(clockEpoch);
  const clockInitialSeconds = clockAtLoad.getHours() * 3600 + clockAtLoad.getMinutes() * 60 + clockAtLoad.getSeconds();
  let roomClockSeconds=clockInitialSeconds;
  const hourHand = makeGroup('clock-hour-hand', 0, .172, .087, clock);
  const minuteHand = makeGroup('clock-minute-hand', 0, .172, .090, clock);
  tube([[0, -.012, 0], [0, .075, 0]], .003, black, hourHand, 2);
  tube([[0, -.016, 0], [0, .107, 0]], .0023, black, minuteHand, 2);
  const setClockHands = elapsed => {
    const seconds = roomClockSeconds + elapsed;
    hourHand.rotation.z = -(seconds / 43200) * Math.PI * 2;
    minuteHand.rotation.z = -(seconds / 3600) * Math.PI * 2;
  };
  setClockHands(0);
  sphere(0, .172, .092, .007, agedBrass, clock).scale.z = .5;
  const pendulum = makeGroup('clock-pendulum-mechanism', 0, .018, .061, clock);
  cylinder(0, -.126, 0, .0025, .254, brass, pendulum, .0025, 12);
  const pendulumBob = cylinder(0, -.236, 0, .053, .012, brass, pendulum, .053, 40); pendulumBob.rotation.x = Math.PI / 2;
  ring(0, -.236, .007, .046, .0016, agedBrass, pendulum);
  const clockGlass = material('#aabcb1', .10, { transparent:true, opacity:.065, metalness:.08, depthWrite:false, side:THREE.DoubleSide });
  box(0, -.165, .085, .264, .335, .003, clockGlass, clock, .002).castShadow = false;
  box(0, .172, .100, .267, .276, .003, clockGlass, clock, .002).castShadow = false;
  clockBrass.push(sphere(.141, -.112, .094, .006, brass, clock));
  for (const y of [-.24, .10]) clockBrass.push(box(-.163, y, .080, .013, .033, .014, agedBrass, clock, .002));
  // Brass and aged brass retain separate materials when batching.
  batch(clockBrass.filter(o => o.material === agedBrass));

  // An old standing fan: carved wood yoke, concentric wooden cage, leaf blades.
  const fan = makeGroup('battered-wood-standing-fan', 2.80, 0, -.55, group, 'fan');
  targets.fan = [2.80, 1.20, -.55];
  const fanWood = mapped('#c7b38c', 'wood_table_001', { metres: .32, roughness: .82, normal: .23 });
  const fanDark = material('#514534', .88);
  lathe([[0, .026], [.18, .026], [.205, .047], [.20, .075], [.15, .096], [.07, .115], [.042, .145], [.033, .19], [.027, .80], [.034, .84]], fanWood, 0, 0, 0, fan);
  ring(0, .09, 0, .14, .004, fanDark, fan).rotation.x = Math.PI / 2;
  cylinder(0, .89, 0, .025, .13, fanWood, fan, .028, 24);
  tube([[-.265, 1.20, .01], [-.265, 1.055, .01], [-.17, .98, .01], [0, .94, .01], [.17, .98, .01], [.265, 1.055, .01], [.265, 1.20, .01]], .015, fanWood, fan, 32);
  const head = makeGroup('oscillating-wood-fan-head', 0, 1.20, 0, fan); head.rotation.y = -.22;
  const fanWires = [];
  for (const z of [-.057, .066]) {
    ring(0, 0, z, .278, .013, fanWood, head);
    for (const r of [.091, .155, .214, .265]) ring(0, 0, z + (z > 0 ? .013 : -.013), r, .0027, fanWood, head);
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2;
      fanWires.push(tube([[Math.cos(a) * .037, Math.sin(a) * .037, z + .015], [Math.cos(a) * .16, Math.sin(a) * .16, z + .026], [Math.cos(a) * .272, Math.sin(a) * .272, z]], .0028, fanWood, head, 5));
    }
  }
  batch(fanWires);
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
  const fanHit = mesh(geometry('fan-control-hit', () => new THREE.CircleGeometry(.266, 32)), basic('#000000', {transparent:true, opacity:0, depthWrite:false, colorWrite:false, side:THREE.DoubleSide}), 0, 0, .090, head);
  fanHit.userData.action = 'fan'; fanHit.castShadow = fanHit.receiveShadow = false;
  const screw = cylinder(0, 0, .108, .007, .005, agedBrass, head, .007, 12); screw.rotation.x = Math.PI / 2;
  tube([[-.004, 0, .112], [.004, 0, .112]], .001, fanDark, head, 2);
  for (const [start, arc, radius] of [[.45, .21, .279], [2.2, .12, .280], [4.1, .30, .275]]) {
    const worn = ring(0, 0, .079, radius, .0022, ash, head, arc); worn.rotation.z = start; worn.castShadow = false;
  }

  // A little closed notebook keeps the workstation personal without a standing frame.
  const notebook=makeGroup('cloth-notebook',...JIANGNAN_WORKSTATION.notebook,group,'notebook');
  targets.notebook=[...JIANGNAN_WORKSTATION.notebook];
  notebook.rotation.y = -.17;
  box(0, 0, 0, .20, .024, .265, darkLinen, notebook, .004);
  box(0, .005, 0, .187, .013, .25, paper, notebook, .002);
  box(0, .014, 0, .20, .004, .265, darkLinen, notebook, .002);
  tube([[-.07, .023, -.09], [.07, .023, .09]], .003, darkWood, notebook, 3);
  tube([[.035, .022, -.03], [.052, .022, -.03], [.055, .022, -.07], [.038, .022, -.07], [.039, .022, -.039], [.049, .022, -.039]], .0014, agedBrass, notebook, 8).castShadow = false;
  const pencilPot=makeGroup('pencils-in-stoneware',...JIANGNAN_WORKSTATION.pencilPot);
  lathe([[.03, 0], [.046, .01], [.048, .13], [.045, .14], [.040, .135], [.037, .015]], ceramic, 0, 0, 0, pencilPot, 32).castShadow = false;
  for (let i = 0; i < 4; i++) {
    const pencil = cylinder(-.02 + i * .012, .153, (i % 2) * .014, .0027, .19, i % 2 ? ash : darkWood, pencilPot, .0027, 6);
    pencil.rotation.z = -.12 + i * .09; pencil.castShadow = false;
  }
  const postcards=makeGroup('travel-postcards',...JIANGNAN_WORKSTATION.postcards);postcards.rotation.y=.16;
  box(0,-.004,0,.20,.004,.145,paper,postcards,.001).castShadow=false;
  const postcard=box(.008,0,-.007,.20,.004,.145,ivory,postcards,.001);postcard.rotation.y=-.09;postcard.castShadow=false;

  // A single open branch arrangement balances the lamp. Leaves share one
  // small geometry and one draw call; the monitor and coffee remain clear.
  const glazeMap = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#a8a18b'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 720; i++) {
      const x = (i * 73.37) % w, y = (i * 29.73 + i * i * .011) % h;
      c.fillStyle = i % 5 ? '#4b493526' : '#e2d5b74a'; c.beginPath(); c.arc(x, y, i % 7 ? .48 : 1.15, 0, Math.PI * 2); c.fill();
    }
  });
  const stoneware = material('#c8bfa6', .74, { map: glazeMap, bumpMap: glazeMap, bumpScale: .00065 });
  const branches=makeGroup('wild-olive-in-stoneware',...JIANGNAN_WORKSTATION.vase,group,'vase');
  targets.vase=[...JIANGNAN_WORKSTATION.vaseTarget];
  lathe([[.055, 0], [.076, .014], [.105, .064], [.108, .120], [.086, .181], [.044, .211], [.042, .235], [.048, .241], [.040, .245], [.034, .237], [.035, .218], [.066, .188]], stoneware, 0, 0, 0, branches, 48);
  const branchWood = material('#65533a', .96);
  const branchPaths = [
    [[0, .18, 0], [-.040, .37, -.008], [-.115, .54, .005], [-.237, .658, .012]],
    [[0, .18, 0], [.045, .40, -.008], [.145, .57, -.030], [.185, .76, -.045]],
    [[.022, .28, -.005], [.17, .42, -.025], [.268, .47, -.052]],
    [[-.035, .35, 0], [-.19, .40, .015], [-.29, .46, .045]],
    [[.091, .48, -.020], [.018, .63, -.015], [-.022, .72, -.025]]
  ];
  const stems = branchPaths.map(path => tube(path, .0025, branchWood, branches, 18)); batch(stems);
  const leafGeometry = geometry('olive-leaf', () => {
    const shape = new THREE.Shape(); shape.moveTo(0, -.022); shape.quadraticCurveTo(.010, -.008, .006, .010); shape.quadraticCurveTo(.004, .023, 0, .029); shape.quadraticCurveTo(-.010, .009, -.006, -.006); shape.quadraticCurveTo(-.004, -.017, 0, -.022);
    const g = new THREE.ShapeGeometry(shape, 3); return g;
  });
  const leafMat = material('#737c50', .91, { side: THREE.DoubleSide });
  const leaves = keep(new THREE.InstancedMesh(leafGeometry, leafMat, 34));
  let leafIndex = 0;
  branchPaths.forEach((path, branchIndex) => {
    const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(...p)));
    const count = branchIndex < 2 ? 8 : 6;
    for (let i = 0; i < count; i++) {
      const p = curve.getPoint(.45 + i / count * .53), side = i % 2 ? 1 : -1;
      dummy.position.copy(p).add(new THREE.Vector3(side * .014, .002, 0));
      dummy.rotation.set(.25 + (i % 3) * .31, -.55 + branchIndex * .29, side * (.55 + i % 3 * .18));
      dummy.scale.setScalar(.80 + (i % 4) * .10); dummy.updateMatrix(); leaves.setMatrixAt(leafIndex++, dummy.matrix);
    }
  });
  leaves.count = leafIndex; leaves.castShadow = false; leaves.receiveShadow = true; branches.add(leaves);
  dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1);

  // Small static fittings share their parent's material draw call. Nested
  // action groups and moving assemblies stay separate for raycasts/animation.
  const staticParents = new Set();
  for (const object of [cabinet,shelf,hornSpeaker,clock,fan,deskChair,desk]) object.traverse(child=>{if(child.isGroup)staticParents.add(child);});
  for (const parent of staticParents) {
    const buckets = new Map();
    for (const object of parent.children) {
      if (!object.isMesh || object.isInstancedMesh || object.userData.action || object.name || object.material.transparent) continue;
      const key = [object.material.uuid, object.castShadow, object.receiveShadow].join(':');
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(object);
    }
    buckets.forEach(batch);
  }

  let labelId;
  const applyRecordLabel = id => {
    if (id === labelId || !labelMaps.has(id)) return;
    labelId = id; labelMaterial.map = labelMaps.get(id); labelMaterial.color.set('#ffffff'); labelMaterial.needsUpdate = true;
    for (const choice of recordSelections) choice.material.color.set(choice.id === id ? '#bba26d' : '#655d49');
  };
  applyRecordLabel(objects.snapshot().recordId);
  const shelfEmitterLevels = shelfBulbs.map(emitter => emitter.emissiveIntensity);
  // Toggles glide the practical intensities over a short moment on the single
  // room clock. Without an injected ramp (plain geometry use) switches snap.
  const lightRamp = createLightRamp ? createLightRamp({ duration: .24, still: isStill }) : null;
  if (lightRamp) {
    lightRamp.seed('table', taskLight.intensity);
    lightRamp.seed('pool', lampPool.intensity);
    lightRamp.seed('shade', shadeMat.emissiveIntensity);
    shelfLights.forEach((light, index) => lightRamp.seed('shelf:' + index, light.intensity));
    shelfBulbs.forEach((emitter, index) => lightRamp.seed('emitter:' + index, emitter.emissiveIntensity));
  }
  let shadowDirty = false;
  let lightClock;
  const catSupport=createCatSupport({THREE,floor:planks,rug:rugBody}),floorSample=catSupport.sample;
  catBed.updateWorldMatrix(true,true);
  const cushionRay=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0),0,.4);
  catSupport.sample=(x,z)=>{
    let y=floorSample(x,z);
    if(Math.abs(x-JIANGNAN_CAT_BED.x)<.40&&Math.abs(z-JIANGNAN_CAT_BED.z)<.25){
      cushionRay.ray.origin.set(x,.3,z);const hit=cushionRay.intersectObject(catCushion,false)[0];if(hit)y=Math.max(y,hit.point.y);
    }
    return y;
  };
  const writePracticals = ({ table, pool, shade, shelves, emitters }) => {
    if (taskLight.intensity !== table || lampPool.intensity !== pool ||
      shelfLights.some((light, index) => light.intensity !== shelves[index])) shadowDirty = true;
    taskLight.intensity = table;
    lampPool.intensity = pool;
    lampPool.visible = pool > 0;
    shadeMat.emissiveIntensity = shade;
    shelfLights.forEach((light, index) => { light.intensity = shelves[index]; });
    shelfBulbs.forEach((emitter, index) => { emitter.emissiveIntensity = emitters[index]; });
  };
  const applySwitches = () => {
    const state = objects.snapshot();
    const ramp = (key, target) => lightRamp ? lightRamp.set(key, target) : target;
    // Switch targets stay meaningful booleans; the visible values below glide.
    bulbMat.color.set(state.lamp ? '#ffe8bd' : '#a69b84');
    writePracticals({
      table: ramp('table', state.lamp ? JIANGNAN_TABLE_LIGHT.diffuse : 0),
      pool: ramp('pool', state.lamp ? JIANGNAN_TABLE_LIGHT.pool : 0),
      shade: ramp('shade', state.lamp ? .47 : 0),
      shelves: shelfLights.map((light, index) => ramp('shelf:' + index, state['shelf-light'] ? light.userData.baseIntensity : 0)),
      emitters: shelfBulbs.map((emitter, index) => ramp('emitter:' + index, state['shelf-light'] ? shelfEmitterLevels[index] : 0))
    });
    brewStream.visible = state.espresso; brewSteam.visible = state.espresso;
  };
  return {
    group,
    catSupport,
    targets,
    resources,
    soundTarget,
    door,
    screen: { position: [...JIANGNAN_TARGETS.computer], width: .80, height: .50 },
    // While a practical is gliding or the leaf is still swinging, the one
    // shadow pass keeps up; once settled it stays untouched.
    shadowRefresh() {
      const dirty = shadowDirty || Boolean(lightRamp?.pending);
      shadowDirty = false;
      // Consume the leaf's dirty latch even when another practical is dirty.
      const doorDirty = door?.shadowRefresh?.() ?? Boolean(door?.moving);
      return dirty || doorDirty;
    },
    toggleObject(kind) {
      const state = objects.toggle(kind);
      if (state) { applySwitches(); wake(); }
      return state;
    },
    snapshotObjects() {
      return { ...objects.snapshot(), tableLight: taskLight.intensity, tablePool: lampPool.intensity, tablePoolVisible: lampPool.visible, shadeEmissive: shadeMat.emissiveIntensity,
        shelfLight: shelfLights.reduce((sum, light) => sum + light.intensity, 0), shelfEmitters: shelfBulbs.map(emitter => emitter.emissiveIntensity),
        rotorAngle: rotor.rotation.z, platterRotation: platter.rotation.y, pendulumRotation: pendulum.rotation.z,
        hourHand: hourHand.rotation.z, minuteHand: minuteHand.rotation.z, clockEpoch,
        labelId: labelId || null, brewVisible: brewStream.visible };
    },
    setAudioState({playing = false, wanted = false, blocked = false, status, trackId} = {}) {
      objects.setAudioState({ playing, trackId }); applyRecordLabel(objects.snapshot().recordId);
      const unavailable = blocked || status === 'blocked' || status === 'error';
      indicatorMat.color.set(playing ? '#b1b885' : unavailable ? '#916046' : wanted ? '#aa8a50' : '#4e4635');
      indicatorMat.emissive.set(playing ? '#c1cd8f' : unavailable ? '#aa522a' : '#a57832');
      indicatorMat.emissiveIntensity = playing ? .65 : wanted ? .16 : 0;
      wake();
    },
    update(time,day) {
      objects.update(time);
      if (lightRamp) {
        const dt = lightClock === undefined ? 0 : Math.max(0, time - lightClock);
        lightClock = time;
        if (lightRamp.update(dt)) {
          writePracticals({
            table: lightRamp.value('table'), pool: lightRamp.value('pool'), shade: lightRamp.value('shade'),
            shelves: shelfLights.map((light, index) => lightRamp.value('shelf:' + index)),
            emitters: shelfBulbs.map((emitter, index) => lightRamp.value('emitter:' + index))
          });
        }
      }
      door?.update(time, day);
      const state = objects.snapshot();
      rotor.rotation.z = -state.fanPhase;
      head.rotation.y = -.22 + Math.sin(state.fanPhase * .017) * .11;
      steam.rotation.y = Math.sin(state.steamPhase * .32) * .12;
      steam.scale.y = .90 + Math.sin(state.steamPhase * .65) * .10;
      brewSteam.rotation.y = Math.sin(state.steamPhase * .67) * .23;
      brewSteam.scale.y = .9 + Math.sin(state.steamPhase * 2.6) * .12;
      brewStream.visible = state.espresso; brewSteam.visible = state.espresso;
      pendulum.rotation.z = state.pendulumAngle;
      if(day){roomClockSeconds=day.seconds;setClockHands(0);}else setClockHands(state.steamPhase);
      platter.rotation.y = state.platterAngle;
    }
  };
}
