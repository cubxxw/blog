// The work lamp owns the room's one shadow pass. The broad, unshadowed fill
// represents diffuse bounce; it must not compete with the visible practical.
export const JIANGNAN_TABLE_LIGHT = Object.freeze({ diffuse: 1.45, pool: 2.7 });

export function createJiangnanRoomLights({ THREE, scene }) {
  const diffuse = new THREE.HemisphereLight('#a8bbc7', '#60412b', .50);
  diffuse.name = 'room-diffuse-fill';
  const moon = new THREE.DirectionalLight('#a4c6dd', .75);
  moon.name = 'cool-window-direction'; moon.position.set(-8, 15, -18);
  const windowFill = new THREE.DirectionalLight('#93b6ca', .20);
  windowFill.name = 'window-return-fill'; windowFill.position.set(6, 9, 6);
  const bounce = new THREE.SpotLight('#ffcc8b', 6.5, 9, 1.12, .88, 2);
  bounce.name = 'weak-high-room-fill';
  bounce.position.set(-.5, 2.68, .35); bounce.target.position.set(.45, .65, -1.4);
  scene.add(diffuse, moon, windowFill, bounce, bounce.target);
  const dayFill=new THREE.Color('#d7e5de'),daySun=new THREE.Color('#fff0c9'),lowSun=new THREE.Color('#ffa85c');
  return { diffuse, moon, windowFill, bounce,update({daylight=0,golden=0,sunDirection}){
    diffuse.intensity=.50+daylight*.55;diffuse.color.set('#a8bbc7').lerp(dayFill,daylight);
    moon.intensity=.75+daylight*1.9;moon.color.set('#a4c6dd').lerp(daySun,daylight).lerp(lowSun,golden*daylight*.75);
    if(sunDirection&&daylight>.01)moon.position.fromArray(sunDirection).multiplyScalar(25);else moon.position.set(-8,15,-18);
    windowFill.intensity=.20+daylight*.18;
    bounce.intensity=6.5-daylight*2.2;
  }};
}

export function createTablePool({ THREE, lamp, resources, shadowSize = 1536 }) {
  const spot = new THREE.SpotLight('#ffd29a', JIANGNAN_TABLE_LIGHT.pool, 3.6, 1.27, 1, 2);
  spot.name = 'table-opal-downlight';
  // Below the open opal rim, just outside the solid central brass stem.
  spot.position.set(.034, .302, .026);
  spot.target.position.set(.41, -.002, .26);
  spot.castShadow = true; spot.shadow.mapSize.setScalar(shadowSize);
  spot.shadow.bias = -.00005; spot.shadow.normalBias = .003;
  spot.shadow.camera.near = .035; spot.shadow.camera.far = 3.6; spot.shadow.radius = 2;
  lamp.add(spot, spot.target);
  resources.add({ dispose() { spot.shadow.dispose(); } });
  return spot;
}
