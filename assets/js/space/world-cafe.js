import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from '../vendor/CSS3DRenderer.js';
import { worldRenderBudget, worldPixelRatio } from './world-render-budget.mjs';
import { stepWalk, travelPose, screenFit } from './world-state.mjs';
import { createCafeResident } from './world-cat.js';
import { createCafeDetails } from './world-details.js';
import { inspectView, tabletopProfile } from './world-details.mjs';
import { consumeLegacyMapleRandom, mapleCounts, maplePlan } from './world-garden.mjs';
import { createWorldMaterials } from './world-materials.js';
import { createWorldNature } from './world-nature.js';
import { addLivedDetails } from './world-props.js';
import { buildGardenPlace, buildRainStreet, syncCafeThemeLights } from './world-places.js';
import { CAFE_LIGHT, sampleWater, waterDetail, groundLevel, distantRidgePlan } from './world-landscape.mjs';
import { createForestGround, createCafeWaterGeometry, addGroundTufts, groundMossPlans } from './world-ground.js';

// Read the actual tessellated surface rather than the analytic height field:
// metre-sized ground triangles can sit slightly above/below that function.
export function createCafeSteppingStones(ground,parent,geometry,material){
  const p=ground.geometry.attributes.position,index=ground.geometry.index,{widthSegments:columns,heightSegments:rows}=ground.geometry.parameters,firstX=p.getX(0),firstZ=p.getZ(0),dx=p.getX(1)-firstX,dz=p.getZ(columns+1)-firstZ;
  const ray=new THREE.Ray(new THREE.Vector3(),new THREE.Vector3(0,-1,0)),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),hit=new THREE.Vector3();
  const support=(x,z)=>{const col=Math.max(0,Math.min(columns-1,Math.floor((x-firstX)/dx))),row=Math.max(0,Math.min(rows-1,Math.floor((z-firstZ)/dz))),start=(row*columns+col)*6;ray.origin.set(x,1,z);for(let t=0;t<2;t++){a.fromBufferAttribute(p,index.getX(start+t*3));b.fromBufferAttribute(p,index.getX(start+t*3+1));c.fromBufferAttribute(p,index.getX(start+t*3+2));if(ray.intersectTriangle(a,b,c,false,hit))return hit.y;}throw new Error('Stepping stone has no ground support');};
  const stones=[];for(let i=0;i<6;i++){const x=-.4+Math.sin(i)*.2,z=-10.8-i*.65;let lowest=support(x,z);for(let j=0;j<40;j++){const angle=j*Math.PI/20;lowest=Math.min(lowest,support(x+Math.cos(angle)*.3,z+Math.sin(angle)*.3));}const stone=new THREE.Mesh(geometry,material);stone.position.set(x,lowest-.004+.07/2,z);stone.scale.set(.3,.07,.3);stone.castShadow=stone.receiveShadow=true;parent.add(stone);stones.push(stone);}return stones;
}

// Three r160 and its CSS3D renderer share one camera. The live workspace is a
// real DOM plane in the room; apps and their private state are never duplicated.
export function createCafeWorld({ root, theme, onComputer, onTravel, onFailure, isBlocked, catAsset, photoAsset, latteAsset, mapleAsset, materialBase, books=[], onDetail, onInspect, onCat, composition='human' }) {
  const host=document.createElement('div');host.className='space-world';
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  root.prepend(host);
  const renderBudget=worldRenderBudget(renderer.getContext());
  renderer.setPixelRatio(worldPixelRatio(root.clientWidth||innerWidth,root.clientHeight||innerHeight,devicePixelRatio,renderBudget));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.domElement.className='space-world__canvas';renderer.domElement.tabIndex=0;
  renderer.domElement.setAttribute('aria-label',document.documentElement.lang.startsWith('zh')?'三维咖啡馆。WASD 或方向键行走，拖动看四周。':'3D café. Walk with WASD or arrow keys; drag to look around.');
  host.append(renderer.domElement);
  const css=new CSS3DRenderer();css.domElement.className='space-world__css';host.append(css.domElement);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(48,1,.08,220);
  camera.rotation.order='YXZ';
  const room=new THREE.Group(), outdoors=new THREE.Group();scene.add(room,outdoors);
  const resources=new Set(), textures=new Set();
  let disposed=false,mode='intro',moving=null,frame=0,last=0,elapsed=0,drag=null,themeId=theme,initialized=false,drawing=false;
  let quiet=false,resident,lastPaint=0,catStamp=0,firstPending=true,resolveFirst;
  const firstFrame=new Promise(resolve=>{resolveFirst=resolve;});
  const settleFirst=value=>{if(firstPending){firstPending=false;resolveFirst(value);}};
  function wake(){if(initialized&&!disposed&&!frame&&!drawing){last=0;frame=requestAnimationFrame(tick);}}
  const keys=new Set(),touchKeys=new Set();const abort=new AbortController();
  const listen=(target,type,fn,opts={})=>target.addEventListener(type,fn,{...opts,signal:abort.signal});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const pbr=createWorldMaterials({base:materialBase,renderer,resources,textures,isDisposed:()=>disposed,wake,root});
  let seed=79;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const mat=(color,roughness=.75,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness,envMapIntensity:.24,...extra});resources.add(m);return m;};
  const geometry=g=>{resources.add(g);return g;};
  const boxGeometry=geometry(new THREE.BoxGeometry(1,1,1));
  const cylinderGeometry=geometry(new THREE.CylinderGeometry(1,1,1,20));
  const sphereGeometry=geometry(new THREE.SphereGeometry(1,20,14));
  const woodTexture=(base,streak)=>{
    const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d');
    ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
    for(let i=0;i<320;i++){const y=random()*512;ctx.strokeStyle=streak;ctx.globalAlpha=.012+random()*.04;ctx.lineWidth=.4+random()*1.4;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(170,y+random()*12,340,y-random()*12,512,y+random()*5);ctx.stroke();}
    ctx.globalAlpha=1;const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;textures.add(texture);return texture;
  };
  const oakMap=woodTexture('#c8ac82','#6c5236'),walnutMap=woodTexture('#96714f','#30241b');
  const oak=mat('#f0e7d7',.66,{map:oakMap,bumpMap:oakMap,bumpScale:.004});
  const walnut=mat('#d5c3ad',.68,{map:walnutMap,bumpMap:walnutMap,bumpScale:.003});
  const grain=document.createElement('canvas');grain.width=grain.height=128;const gc=grain.getContext('2d');gc.fillStyle='#808080';gc.fillRect(0,0,128,128);for(let i=0;i<3600;i++){const shade=120+Math.floor(random()*16);gc.fillStyle=`rgb(${shade},${shade},${shade})`;gc.fillRect(random()*128,random()*128,1,1);}const grainMap=new THREE.CanvasTexture(grain);grainMap.wrapS=grainMap.wrapT=THREE.RepeatWrapping;grainMap.repeat.set(8,8);textures.add(grainMap);
  const plaster=mat('#d9d3c7',.96,{bumpMap:grainMap,bumpScale:.003}),paper=mat('#eee8d8',.95),stone=mat('#aaa99e',.7,{bumpMap:grainMap,bumpScale:.003}),black=mat('#282c29',.48),brass=mat('#b89a57',.28,{metalness:.78,envMapIntensity:.65}),linen=mat('#b7b6a7');
  pbr.bind(oak,'wood_table_001',{metres:1.2,normal:.20,roughness:.58});pbr.bind(walnut,'wood_table_001',{metres:1.2,normal:.20,roughness:.58});pbr.bind(plaster,'painted_plaster_wall',{metres:2,normal:.12,roughness:.85});pbr.bind(stone,'rock_boulder_dry',{metres:.8,normal:.12,roughness:.65});
  const mesh=(g,m,x,y,z,parent=room)=>{const v=new THREE.Mesh(g,m);v.position.set(x,y,z);v.castShadow=true;v.receiveShadow=true;parent.add(v);return v;};
  const box=(x,y,z,w,h,d,m,parent=room)=>{const v=mesh(boxGeometry,m,x,y,z,parent);v.scale.set(w,h,d);return v;};
  const cyl=(x,y,z,r,h,m,parent=room)=>{const v=mesh(cylinderGeometry,m,x,y,z,parent);v.scale.set(r,h,r);return v;};
  const sphere=(x,y,z,r,m,parent=room)=>{const v=mesh(sphereGeometry,m,x,y,z,parent);v.scale.setScalar(r);return v;};
  const segment=(a,b,r,m,parent=room)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),v=cyl(...start.clone().add(end).multiplyScalar(.5).toArray(),r,start.distanceTo(end),m,parent);v.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return v;};
  const torus=(x,y,z,r,tube,m,parent=room,arc=Math.PI*2)=>mesh(geometry(new THREE.TorusGeometry(r,tube,8,40,arc)),m,x,y,z,parent);
  const details=createCafeDetails({resources,textures,isDisposed:()=>disposed,wake,latteAsset,books});
  const detailGroups=[],cup=(x,supportSurfaceY,z,parent=room,variant='latte')=>{const group=details.cup(x,supportSurfaceY,z,parent,variant);if(Math.abs(x+.05)<.001&&Math.abs(z-1.3)<.001)detailGroups.push(group);return group;};
  const backShape=new THREE.Shape();backShape.moveTo(-.28,0);backShape.lineTo(.28,0);backShape.lineTo(.28,.12);backShape.quadraticCurveTo(.28,.24,.15,.24);backShape.lineTo(-.15,.24);backShape.quadraticCurveTo(-.28,.24,-.28,.12);backShape.closePath();
  const chairBack=geometry(new THREE.ExtrudeGeometry(backShape,{depth:.045,bevelEnabled:true,bevelSize:.015,bevelThickness:.012,bevelSegments:2,steps:1}));
  function chair(x,z,rotation=0,parent=room) {
    const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=rotation;parent.add(group);
    box(0,.48,0,.56,.1,.55,walnut,group);box(0,.545,0,.49,.05,.48,linen,group);
    for(const dx of [-.22,.22])for(const dz of [-.2,.2])box(dx,.25,dz,.042,.48,.042,walnut,group);
    for(const dx of [-.23,.23])box(dx,.83,-.21,.04,.64,.04,walnut,group);
    mesh(chairBack,walnut,0,.94,-.25,group);
  }
  const tabletopGeometry=geometry(new THREE.LatheGeometry(tabletopProfile().map(p=>new THREE.Vector2(...p)),64));
  const tablePositions=tabletopGeometry.attributes.position,tableUV=tabletopGeometry.attributes.uv;
  for(let i=0;i<tableUV.count;i++)tableUV.setXY(i,tablePositions.getX(i)*.5+.5,tablePositions.getZ(i)*.5+.5);
  function table(x,z,r=.58,bookVariant=0) {
    mesh(tabletopGeometry,oak,x,.75,z).scale.set(r,1,r);cyl(x,.39,z,.055,.74,black);cyl(x,.035,z,.27,.045,black);
    cup(x+.15,.785,z-.1);const volume=details.tableBook(x-.17,.785,z+.10,room,bookVariant);if(volume)detailGroups.push(volume);
    chair(x,z+.95,Math.PI);chair(x,z-.9,0);
  }
  // Quiet timber architecture. The entire north façade is glazed, with an open
  // central door into the garden. The south façade is open to the entrance.
  box(0,-.12,.3,14,.22,10.4,oak);box(0,-.27,-8,13,.22,6,stone,outdoors);
  const floorMap=oak.map.clone();textures.add(floorMap);floorMap.repeat.set(4,4);
  floorMap.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const floor=mat('#f7f1e6',.86,{map:floorMap});box(0,.001,.3,13.8,.014,10.2,floor);
  pbr.bind(floor,'wood_floor',{metres:2.4,normal:.22,roughness:.56});
  // Sparse low-contrast seams avoid the old screen-space moiré of black strips.
  // A woven runner gives the open aisle a human scale without blocking paths.
  const weave=document.createElement('canvas');weave.width=weave.height=128;const wc=weave.getContext('2d');
  wc.fillStyle='#b4b6a0';wc.fillRect(0,0,128,128);wc.strokeStyle='#7c887036';wc.lineWidth=1;
  for(let i=0;i<128;i+=4){wc.beginPath();wc.moveTo(i,0);wc.lineTo(i,128);wc.moveTo(0,i);wc.lineTo(128,i);wc.stroke();}
  const weaveMap=new THREE.CanvasTexture(weave);weaveMap.colorSpace=THREE.SRGBColorSpace;weaveMap.wrapS=weaveMap.wrapT=THREE.RepeatWrapping;weaveMap.repeat.set(5,8);weaveMap.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.add(weaveMap);
  const rug=mat('#f3f0dd',1,{map:weaveMap});box(2,.018,1.5,1.8,.015,3.6,rug).castShadow=false;
  box(-6.88,2,.2,.22,4.2,10.6,plaster);
  // Sheltered ceiling with a central skylight and exposed oak joists.
  box(-4.9,4.22,.3,4.2,.14,10.6,plaster);box(4.9,4.22,.3,4.2,.14,10.6,plaster);
  for(let z=-4.5;z<5.8;z+=1.35)box(0,4.11,z,14,.2,.12,walnut);
  for(const x of [-6.7,-3.4,-1.05,1.05,3.4,6.7])box(x,2.1,-4.5,.11,4.2,.16,walnut);
  for(const z of [-4.5,-1.2,2.2,5.4])box(6.7,2.1,z,.14,4.2,.14,walnut);
  box(0,4.08,-4.5,14,.22,.2,walnut);box(0,4.08,5.5,14,.22,.2,walnut);
  box(6.7,4.08,.4,.16,.22,10.2,walnut);
  const glass=mat('#dbe5e4',.12,{transparent:true,opacity:.035,metalness:.05,depthWrite:false});
  for(const x of [-5.05,-2.2,2.2,5.05])box(x,2.15,-4.51,x===-5.05||x===5.05?3.1:2.1,3.9,.018,glass).castShadow=false;
  box(6.7,2.1,.4,.018,4,10.1,glass).castShadow=false;
  // Window seats and low shelving.
  box(-5.9,.28,3.2,1.1,.5,2.5,oak);box(-5.88,.58,3.2,1.06,.16,2.45,linen);
  for(const z of [2.5,3.6])box(-6.35,.82,z,.17,.48,.65,linen).rotation.z=-.08;
  detailGroups.push(details.bookshelf(room,oak,brass));
  table(-3.1,1.25,.55,1);table(-.2,1.4,.5);
  // Soft contact shadows help furniture sit on the timber, even away from sun.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
  const sc=shadowCanvas.getContext('2d'),sg=sc.createRadialGradient(64,64,5,64,64,64);sg.addColorStop(0,'rgba(23,27,17,.14)');sg.addColorStop(.5,'rgba(23,27,17,.05)');sg.addColorStop(1,'rgba(23,27,17,0)');sc.fillStyle=sg;sc.fillRect(0,0,128,128);
  const contactTexture=new THREE.CanvasTexture(shadowCanvas);textures.add(contactTexture);const shadowMaterial=new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false});resources.add(shadowMaterial);
  for(const [x,z,w,d] of [[-3.1,1.25,.8,.8],[-.2,1.4,.8,.8],[-5,-2.45,2.7,2.7],[3.65,-2.5,3.2,1.3]]){const s=mesh(geometry(new THREE.PlaneGeometry(w,d)),shadowMaterial,x,.025,z);s.rotation.x=-Math.PI/2;s.castShadow=s.receiveShadow=false;}
  // Espresso bar: a stone counter, coffee machine, cups and supplies.
  box(-5, .53,-2.45,2.5,1.02,2.5,walnut);box(-5,1.07,-2.45,2.65,.13,2.65,stone);
  for(let x=-6.1;x<-3.8;x+=.12)box(x,.52,-1.18,.035,.85,.02,oak);
  box(-5.15,1.44,-2.85,1.02,.63,.6,black);box(-5.15,1.73,-2.85,1.08,.05,.65,brass);
  box(-5.15,1.29,-2.52,.98,.04,.21,brass);
  const steel=mat('#a5aaa4',.24,{metalness:.86,envMapIntensity:.85});
  for(let i=0;i<15;i++)box(-5.59+i*.063,1.312,-2.52,.007,.004,.18,steel).castShadow=false;
  box(-5.15,1.48,-2.542,.82,.19,.012,steel);
  for(const x of [-5.54,-4.76]){const dial=torus(x,1.63,-2.538,.028,.006,brass);cyl(x,1.63,-2.53,.017,.025,black).rotation.x=Math.PI/2;dial.castShadow=false;}
  for(const x of [-5.4,-5.0]){cyl(x,1.49,-2.5,.07,.12,brass);box(x,1.48,-2.38,.04,.03,.21,black);cup(x,1.31,-2.51,room,'empty');}
  for(let i=0;i<3;i++)cup(-5.48+i*.33,1.755,-2.85,room,'empty');
  cyl(-4.15,1.485,-3.02,.13,.7,black);sphere(-4.15,1.95,-3.02,.17,mat('#a17e52',.3,{transparent:true,opacity:.65}));
  const jars=mat('#8c8064',.45);for(let i=0;i<3;i++){cyl(-5.8+i*.55,1.305,-3.36,.12,.34,jars);cyl(-5.8+i*.55,1.49,-3.36,.13,.03,walnut);}
  for(let i=0;i<3;i++)cup(-4.35,1.135,-2.35+i*.32,room,'empty');
  // Owner's desk. This computer is raycastable, not a flat image hotspot.
  box(3.65,1.02,-2.5,3.1,.12,1.2,oak);
  for(const x of [2.27,5.03])for(const z of [-3,-2])box(x,.51,z,.07,1,.07,walnut);
  chair(3.65,-1.17,Math.PI);cup(4.72,1.08,-2.12);
  box(2.58,1.13,-2.24,.4,.065,.55,mat('#45564b')).rotation.y=-.08;
  box(2.61,1.18,-2.29,.35,.028,.5,paper).rotation.y=.12;
  // A real travel photograph, mounted with a matte rather than stretched.
  box(2.52,1.5,-2.78,.7,.49,.045,walnut);
  box(2.52,1.5,-2.75,.64,.43,.01,paper);
  if(photoAsset){
    const photoMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.85});resources.add(photoMaterial);
    const picture=mesh(geometry(new THREE.PlaneGeometry(1,1)),photoMaterial,2.52,1.5,-2.739);picture.visible=false;
    new THREE.TextureLoader().load(photoAsset,texture=>{
      if(disposed){texture.dispose();return;}textures.add(texture);texture.colorSpace=THREE.SRGBColorSpace;
      const ratio=texture.image.width/texture.image.height;picture.scale.set(Math.min(.57,.36*ratio),Math.min(.36,.57/ratio),1);
      photoMaterial.map=texture;photoMaterial.needsUpdate=true;picture.visible=true;wake();
    },undefined,()=>{});
  }
  const computer=new THREE.Group();computer.position.set(3.65,0,-2.68);room.add(computer);
  box(0,1.105,.05,.66,.05,.3,stone,computer);cyl(0,1.29,0,.045,.36,stone,computer);
  const monitor=box(0,1.86,0,1.62,1.03,.09,paper,computer);
  const c=document.createElement('canvas');c.width=1024;c.height=640;const ctx=c.getContext('2d');
  ctx.fillStyle='#162d29';ctx.fillRect(0,0,1024,640);
  const glow=ctx.createRadialGradient(560,260,20,520,320,530);glow.addColorStop(0,'#467468');glow.addColorStop(1,'#122521');ctx.fillStyle=glow;ctx.fillRect(0,0,1024,640);
  ctx.textAlign='center';ctx.fillStyle='#e8e7cd';ctx.font='500 70px sans-serif';ctx.fillText('CUBXXW OS',512,325);ctx.font='20px monospace';ctx.fillStyle='#a0bbad';ctx.fillText('YOUR WORLD, WITHIN.',512,374);
  const screenTexture=new THREE.CanvasTexture(c);screenTexture.colorSpace=THREE.SRGBColorSpace;textures.add(screenTexture);
  const display=mesh(geometry(new THREE.PlaneGeometry(1.5,.9)),new THREE.MeshBasicMaterial({map:screenTexture}),0,1.89,.051,computer);resources.add(display.material);
  box(0,1.11,.55,.83,.035,.3,paper,computer);
  const keyGeometry=geometry(new THREE.BoxGeometry(.043,.012,.043)),keyMaterial=mat('#c8c9bb'),keyMesh=new THREE.InstancedMesh(keyGeometry,keyMaterial,60),dummy=new THREE.Object3D();
  let ki=0;for(let row=0;row<4;row++)for(let col=0;col<15;col++){dummy.position.set(-.36+col*.05,1.135,.45+row*.055);dummy.updateMatrix();keyMesh.setMatrixAt(ki++,dummy.matrix);}computer.add(keyMesh);
  box(.59,1.11,.57,.15,.035,.24,stone,computer);
  // Pendants are small warm islands, rather than overexposed global lighting.
  const lampMaterial=mat('#e9dbc0',.6,{emissive:'#ffe0a0',emissiveIntensity:.3});
  const pendantLights=[],dayReflections=new WeakMap();
  for(const [x,z] of [[-5,-2.4],[-3.1,1.25],[-.2,1.4],[3.65,-2.5]]){
    cyl(x,3.52,z,.007,1.2,black);const shade=mesh(geometry(new THREE.ConeGeometry(.32,.22,32,1,true)),lampMaterial,x,2.96,z);shade.material.side=THREE.DoubleSide;
    sphere(x,2.91,z,.045,mat('#fff1ce',.4,{emissive:'#ffce83',emissiveIntensity:2}));
    const light=new THREE.PointLight('#ffe0b2',7,5,2);light.position.set(x,2.84,z);room.add(light);pendantLights.push(light);
  }
  // A plant by the desk and a quietly curved earthen vase on the counter.
  for(let i=0;i<24;i++)random(); // Preserve the old plant's outer RNG boundary.
  addLivedDetails({room,resources,pbr,materials:{wood:walnut,cloth:linen,steel}});
  const ambient=new THREE.HemisphereLight('#d7e3e1','#70695b',CAFE_LIGHT.ambient);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff8e9',CAFE_LIGHT.sun);sun.position.set(-8,11,-9);sun.castShadow=true;sun.target.position.set(0,.5,0);scene.add(sun.target);
  sun.shadow.mapSize.set(renderBudget.shadowSize,renderBudget.shadowSize);Object.assign(sun.shadow.camera,CAFE_LIGHT.shadow);sun.shadow.radius=3;sun.shadow.bias=-.0003;sun.shadow.normalBias=.006;scene.add(sun);
  const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color('#a7c6c3')},bottom:{value:new THREE.Color('#e3e2cc')}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 top;uniform vec3 bottom;varying vec3 p;void main(){float t=smoothstep(-.08,.7,normalize(p).y);gl_FragColor=vec4(mix(bottom,top,t),1.);}' });resources.add(skyMaterial);
  const skyDome=mesh(geometry(new THREE.SphereGeometry(180,24,16)),skyMaterial,0,0,0,scene);skyDome.castShadow=false;pbr.sky(scene,skyDome,theme);
  const leafCanvas=document.createElement('canvas');leafCanvas.width=leafCanvas.height=128;const lc=leafCanvas.getContext('2d');
  lc.fillStyle='#ffffff';lc.beginPath();lc.moveTo(64,119);lc.lineTo(53,80);lc.lineTo(14,76);lc.lineTo(28,61);lc.lineTo(10,40);lc.lineTo(42,48);lc.lineTo(38,12);lc.lineTo(57,32);lc.lineTo(64,3);lc.lineTo(74,32);lc.lineTo(93,12);lc.lineTo(86,48);lc.lineTo(118,40);lc.lineTo(100,61);lc.lineTo(114,76);lc.lineTo(77,80);lc.closePath();lc.fill();
  const leafTexture=new THREE.CanvasTexture(leafCanvas);textures.add(leafTexture);
  const environmentResources=new Set(),environmentMaterials=new Map(),mapleMaterials=new Set(),pendingMaples=[],pendingRidges=[],rockBases=[],waterSampleValue=[0,0,1,0];let water, rain, rainBase,mapleTexture=leafTexture,warmMapleTexture=leafTexture;
  const envMat=(color,extra={})=>{const key=color+JSON.stringify(Object.entries(extra).map(([k,v])=>[k,v?.uuid||v]));if(environmentMaterials.has(key))return environmentMaterials.get(key);const m=new THREE.MeshStandardMaterial({color,roughness:.9,...extra});environmentResources.add(m);environmentMaterials.set(key,m);return m;};
  const envGeo=g=>{environmentResources.add(g);return g;};
  const nature=createWorldNature({resources,textures,pbr});
  const leafGeometry=geometry(new THREE.PlaneGeometry(1,1));
  const twigGeometry=geometry(new THREE.CylinderGeometry(.55,1,1,6)),branchGeometry=geometry(new THREE.CylinderGeometry(.62,1,1,8)),planeNormal=new THREE.Vector3(0,0,1),mapleNormal=new THREE.Vector3(),mapleShade=new THREE.Color();
  let mossTexture;
  function mossMaterial(){
    if(!mossTexture){
      const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const context=canvas.getContext('2d'),pixels=context.createImageData(128,128);
      for(let y=0;y<128;y++)for(let x=0;x<128;x++){let hash=(Math.imul(x,374761393)^Math.imul(y,668265263))>>>0;hash=Math.imul(hash^(hash>>>13),1274126177)>>>0;const shade=190+(hash>>>24)/255*65,i=(y*128+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=shade;pixels.data[i+3]=255;}
      context.putImageData(pixels,0,0);mossTexture=new THREE.CanvasTexture(canvas);mossTexture.colorSpace=THREE.SRGBColorSpace;mossTexture.wrapS=mossTexture.wrapT=THREE.RepeatWrapping;mossTexture.repeat.set(4,4);textures.add(mossTexture);
    }
    return envMat('#71834e',{map:mossTexture,bumpMap:mossTexture,bumpScale:.003,roughness:.99,envMapIntensity:.08});
  }
  root.dataset.worldMapleTexture='fallback';
  if(mapleAsset)new THREE.TextureLoader().load(mapleAsset,texture=>{
    if(disposed){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());textures.add(texture);mapleTexture=texture;
    // Preserve the original zen green/amber rhythm without multiplying the
    // scanned green albedo by a second dark green paint colour.
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const context=canvas.getContext('2d');context.filter='hue-rotate(-48deg) saturate(.8)';context.drawImage(texture.image,0,0,256,256);
    warmMapleTexture=new THREE.CanvasTexture(canvas);warmMapleTexture.colorSpace=THREE.SRGBColorSpace;warmMapleTexture.anisotropy=texture.anisotropy;textures.add(warmMapleTexture);
    for(const material of mapleMaterials){material.map=material.userData.mapleWarm?warmMapleTexture:mapleTexture;material.color.set('#ffffff');material.needsUpdate=true;}
    root.dataset.worldMapleTexture='scan';renderer.shadowMap.needsUpdate=true;wake();
  },undefined,()=>{});
  function mapleLeafMaterial(color){
    const warm=color==='#a57049',map=warm?warmMapleTexture:mapleTexture,ready=map!==leafTexture;
    const material=envMat(ready?'#ffffff':color,{side:THREE.DoubleSide,map,alphaTest:.42,alphaToCoverage:true,roughness:.68,envMapIntensity:.08});material.userData.mapleWarm=warm;mapleMaterials.add(material);return material;
  }
  function buildMaples(){
    const counts=mapleCounts(pendingMaples);let leavesTotal=0;
    pendingMaples.forEach((tree,index)=>{
      const treeRoot=new THREE.Group();treeRoot.position.y=groundLevel(tree.x,tree.z,themeId);outdoors.add(treeRoot);const plan=maplePlan(tree,counts[index]),bark=envMat('#77654d',{roughness:.94,bumpMap:grainMap,bumpScale:.008,envMapIntensity:.08}),leaf=mapleLeafMaterial(tree.color);
      const addBranch=(spec,geo=branchGeometry)=>{const start=new THREE.Vector3(...spec.start),end=new THREE.Vector3(...spec.end),branch=mesh(geo,bark,...start.clone().add(end).multiplyScalar(.5).toArray(),treeRoot);branch.scale.set(spec.radius,start.distanceTo(end),spec.radius);branch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());};
      for(const trunk of plan.trunk)addBranch(trunk);
      for(const branch of plan.branches)for(const section of branch.segments)addBranch(section);
      for(const twig of plan.twigs)addBranch(twig,twigGeometry);
      const leaves=new THREE.InstancedMesh(leafGeometry,leaf,plan.count);leaves.castShadow=true;leaves.receiveShadow=true;
      for(let i=0;i<plan.count;i++){dummy.position.fromArray(plan.positions,i*3);mapleNormal.fromArray(plan.normals,i*3);dummy.quaternion.setFromUnitVectors(planeNormal,mapleNormal);dummy.rotateZ(plan.rolls[i]);dummy.scale.set(plan.sizes[i],plan.sizes[i],1);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,mapleShade.setScalar(plan.shades[i]));}
      treeRoot.add(leaves);leavesTotal+=plan.count;
    });root.dataset.worldMapleTrees=String(pendingMaples.length);root.dataset.worldMapleLeaves=String(leavesTotal);root.dataset.worldMapleLeafTriangles=String(leavesTotal*2);pendingMaples.length=0;
  }

  function batchStatic(group,keep=[]) {
    group.updateMatrixWorld(true);const buckets=new Map();
    group.traverse(object=>{
      if(!object.isMesh||object.isInstancedMesh||keep.includes(object))return;
      let parent=object.parent,detail=object.userData.inspect;while(parent&&parent!==group){if(keep.includes(parent))return;detail ||= parent.userData.inspect;parent=parent.parent;}
      const key=object.geometry.uuid+':'+object.material.uuid+':'+object.castShadow+':'+(detail||'');
      if(detail)object.userData.inspect=detail;
      if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(object);
    });
    for(const meshes of buckets.values()){
      if(meshes.length<2)continue;
      const first=meshes[0],instances=new THREE.InstancedMesh(first.geometry,first.material,meshes.length);
      meshes.forEach((object,index)=>{instances.setMatrixAt(index,object.matrixWorld);object.removeFromParent();});
      instances.castShadow=first.castShadow;instances.receiveShadow=first.receiveShadow;if(first.userData.inspect)instances.userData.inspect=first.userData.inspect;group.add(instances);
    }
  }
  batchStatic(room,[computer,...detailGroups]);
  function rock(x,z,size,parent=outdoors) {
    const rotation=[random()*.3,random()*6,random()*.3],v=nature.rock(x,z,size,parent,rotation);v.position.y+=groundLevel(x,z,themeId)+.1;rockBases.push({x,z,size});return v;
  }
  function tree(x,z,height,color,kind='maple') {
    if(kind==='maple'){pendingMaples.push({x,z,height,color});dummy.rotation.set(...consumeLegacyMapleRandom(random));return;}
    for(let i=0;i<650*8;i++)random(); // Original pine draws; new needles use a local fork.
    nature.pine(x,z,height,outdoors,groundLevel(x,z,themeId));
  }
  function mountain(x,z,width,height,color) {pendingRidges.push({x,z,width,height,color});}
  function buildRidges(){
    const rows=new Map();for(const ridge of pendingRidges){if(!rows.has(ridge.z))rows.set(ridge.z,[]);rows.get(ridge.z).push(ridge);}
    let index=0;for(const row of rows.values())nature.ridge(distantRidgePlan(themeId,row,index++),row[0].color,outdoors,environmentResources);pendingRidges.length=0;
  }
  let waterNormals,waterRoughness;
  function waterTextures(){
    if(waterNormals)return;const size=256,normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),e=.001;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/size*Math.PI*2,v=y/size*Math.PI*2,i=(y*size+x)*4,dx=(waterDetail(u+e,v)-waterDetail(u-e,v))/(2*e)*.023,dz=(waterDetail(u,v+e)-waterDetail(u,v-e))/(2*e)*.023,l=Math.hypot(dx,dz,1);normal.set([Math.round((-dx/l*.5+.5)*255),Math.round((-dz/l*.5+.5)*255),Math.round((1/l*.5+.5)*255),255],i);const r=183+Math.round(waterDetail(u,v)*28);rough.set([r,r,r,255],i);}
    waterNormals=new THREE.DataTexture(normal,size,size);waterRoughness=new THREE.DataTexture(rough,size,size);for(const texture of [waterNormals,waterRoughness]){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;textures.add(texture);}
  }
  function makeWater(color,width,depth,x,z) {
    waterTextures();const pond=width<10,g=envGeo(createCafeWaterGeometry({width,depth,x,z,theme:themeId})),p=g.attributes.position;
    const m=new THREE.MeshPhysicalMaterial({color:pond?'#3b5143':themeId==='coast'?'#35646a':'#365b53',metalness:0,roughness:.52,roughnessMap:waterRoughness,normalMap:waterNormals,normalScale:new THREE.Vector2(.22,.22),ior:1.333,clearcoat:0,specularIntensity:.55,envMapIntensity:.65});environmentResources.add(m);water=mesh(g,m,x,pond?-.14:-.18,z,outdoors);water.castShadow=false;
    water.userData.base=p.array.slice();const normals=g.attributes.normal;for(let i=0;i<p.count;i++){const xx=p.getX(i)+x,zz=p.getZ(i)+z;const sample=sampleWater(xx,zz,0,themeId,waterSampleValue);p.setY(i,water.userData.base[i*3+1]+sample[0]);normals.setXYZ(i,sample[1],sample[2],sample[3]);}p.needsUpdate=normals.needsUpdate=true;
    if(pond){for(let i=0;i<17;i++){const angle=i*Math.PI*2/17,xx=x+Math.cos(angle)*(width/2+.05),zz=z+Math.sin(angle)*(depth/2+.05),stone=nature.rock(xx,zz,.13+(i%3)*.035,outdoors,[0,angle,0]);stone.position.y=groundLevel(xx,zz,themeId)+.035;}}
  }
  function disposeEnvironment() {
    outdoors.traverse(object=>{if(object.isInstancedMesh)object.dispose();});
    outdoors.clear();pendingMaples.length=0;pendingRidges.length=0;rockBases.length=0;mapleMaterials.clear();for(const key of ['worldMapleTrees','worldMapleLeaves','worldMapleLeafTriangles'])delete root.dataset[key];for(const r of environmentResources){if(r.isMaterial)pbr.detach(r);r.dispose();}environmentResources.clear();environmentMaterials.clear();water=rain=rainBase=null;
  }
  function setTheme(id) {
    themeId=id;seed=79;disposeEnvironment();
    scene.fog=new THREE.Fog(id==='rain'?'#465f66':id==='coast'?'#c3d0cc':'#adb8aa',id==='rain'?20:65,id==='rain'?90:210);pbr.setTheme(id);
    syncCafeThemeLights({sun,ambient,pendants:pendantLights,room,dayReflections},id);
    skyMaterial.uniforms.top.value.set(id==='rain'?'#203f51':id==='coast'?'#8abfcb':'#9ebec1');
    skyMaterial.uniforms.bottom.value.set(id==='rain'?'#83958e':'#e6e5cf');
    box(0,-.18,-8,13,.16,6,oak,outdoors);
    for(let x=-6.3;x<6.5;x+=.3)box(x,-.088,-8,.014,.003,6,walnut,outdoors).castShadow=false;
    const groundSurface=createForestGround({theme:id,parent:outdoors,pbr,owner:environmentResources});
    if(id==='coast'||id==='lake') {
      makeWater(id==='coast'?'#4c9d9f':'#748f81',160,100,0,-65);
      if(id==='lake')for(let i=0;i<9;i++)mountain(-65+i*17,-102,35,9+random()*12,'#728577');
      else {
        for(let i=0;i<12;i++)rock(-22+random()*44,-13-random()*8,.4+random()*1.1);
        for(const x of [-11,12])nature.coastTree(x,-14,outdoors,groundLevel(x,-14,id));
      }
    } else if(id==='mountain') {
      for(let row=0;row<3;row++)for(let i=0;i<8;i++)mountain(-70+i*22,-65-row*25,35,16+random()*18,['#829581','#91a69b','#aec0b4'][row]);
      for(let i=0;i<15;i++)tree(-22+random()*44,-13-random()*18,3+random()*4,'#45664e','pine');
    } else if(id==='rain') {
      box(0,-.07,-15,70,.08,6,envMat('#4a5558',{metalness:.25,roughness:.25}),outdoors);
      buildRainStreet({parent:outdoors,owner:environmentResources,pbr,ground:groundSurface});
      const rainGeometry=envGeo(new THREE.BufferGeometry());const positions=new Float32Array(900*3);for(let i=0;i<900;i++){positions[i*3]=-14+random()*28;positions[i*3+1]=random()*12;positions[i*3+2]=-7-random()*30;}rainBase=positions.slice();rainGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
      const rainMat=new THREE.PointsMaterial({color:'#d4e3de',size:.028,transparent:true,opacity:.5});environmentResources.add(rainMat);rain=new THREE.Points(rainGeometry,rainMat);outdoors.add(rain);
      for(const x of [-9,9]){cyl(x,1.9,-12,.04,3.8,black,outdoors);sphere(x,3.9,-12,.15,envMat('#e5d2a0',{emissive:'#ffc779',emissiveIntensity:2}),outdoors);const l=new THREE.PointLight('#efcf92',24,18);l.position.set(x,3.8,-12);outdoors.add(l);}
    } else {
      // The former white rectangular bed is now the forest's continuous soil.
      for(let i=0;i<24000;i++)random(); // Retain the established tree/stone seed boundary.
      makeWater('#7b9275',4.5,3.6,3.6,-13.5);
      for(let i=0;i<22;i++)rock(-9+random()*18,-11-random()*12,.4+random()*.9);
      for(let i=0;i<17;i++)tree(-16+random()*32,-14-random()*15,2.7+random()*2.6,id==='zen'?(i%3?'#758849':'#a57049'):'#4d7758');
      for(let i=0;i<130*5;i++)random(); // Old scatter's random boundary; new moss is rooted in stone groups.
      const mossMat=mossMaterial(),mounds=groundMossPlans(rockBases,id),mosses=Array.from({length:4},(_,i)=>new THREE.InstancedMesh(nature.mossGeometry(i),mossMat,Math.ceil((mounds.length-i)/4))),mossCounts=[0,0,0,0];
      for(const [i,mound] of mounds.entries()){dummy.position.fromArray(mound.position);dummy.rotation.fromArray(mound.rotation);dummy.scale.fromArray(mound.scale);dummy.updateMatrix();mosses[i%4].setMatrixAt(mossCounts[i%4]++,dummy.matrix);}for(const moss of mosses){moss.receiveShadow=true;outdoors.add(moss);}
      createCafeSteppingStones(groundSurface,outdoors,cylinderGeometry,stone);
      if(id==='garden') {
        const bamboo=[];for(let i=0;i<28;i++){const x=7+random()*3,z=-13-random()*8;bamboo.push({x,z,height:3.6+random()});}
        buildGardenPlace({parent:outdoors,owner:environmentResources,pbr,bamboo,ground:groundSurface});
      }
      for(let row=0;row<2;row++)for(let i=0;i<6;i++)mountain(-65+i*25,-65-row*25,38,10+random()*10,row?'#a1b3a2':'#8a9f89');
    }
    if(pendingRidges.length)buildRidges();
    if(pendingMaples.length)buildMaples();
    addGroundTufts({theme:id,parent:outdoors,owner:environmentResources});
    const objectCount=outdoors.children.length;batchStatic(outdoors,[water]);renderer.shadowMap.needsUpdate=true;
    root.dataset.worldTheme=id;root.dataset.worldObjects=String(objectCount);
    wake();
  }
  setTheme(theme);
  // One small local reflection capture, before the live DOM plane or resident
  // exists. Reflections describe this room; no HDR/network or idle render loop.
  let reflectionCube,reflectionGenerator,reflectionCamera;
  try {
    reflectionCube=new THREE.WebGLCubeRenderTarget(64,{type:THREE.HalfFloatType,generateMipmaps:false});
    reflectionGenerator=new THREE.PMREMGenerator(renderer);
    reflectionCamera=new THREE.CubeCamera(.06,220,reflectionCube);reflectionCamera.position.set(0,1.6,.4);scene.add(reflectionCamera);
    outdoors.visible=false;reflectionCamera.update(renderer,scene);
    const reflection=reflectionGenerator.fromCubemap(reflectionCube.texture);resources.add(reflection);room.traverse(object=>{for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[])if(material.isMeshStandardMaterial){material.envMap=reflection.texture;material.needsUpdate=true;}});root.dataset.worldReflection='room';
  } catch { root.dataset.worldReflection='direct'; }
  finally {outdoors.visible=true;reflectionCamera?.removeFromParent();reflectionGenerator?.dispose();reflectionCube?.dispose();renderer.shadowMap.needsUpdate=true;}
  const screen=document.createElement('div');screen.className='space-spatial-screen';screen.setAttribute('aria-label','CUBXXW OS');css.domElement.append(screen);
  const anchors=[];
  for(const node of [root.querySelector('[data-space-windows]'),root.querySelector('[data-space-snap]'),root.querySelector('.space-bottom'),root.querySelector('.space-menu')]){
    const anchor=document.createComment('spatial workspace return');node.before(anchor);anchors.push([node,anchor]);screen.append(node);
  }
  const cssObject=new CSS3DObject(screen);screen.style.userSelect='auto';cssObject.position.set(3.65,1.98,-1.5);scene.add(cssObject);
  let fit=screenFit({width:root.clientWidth||innerWidth,height:root.clientHeight||innerHeight});function resize() {
    const width=root.clientWidth||innerWidth,height=root.clientHeight||innerHeight;if(!width||!height)return;
    camera.aspect=width/height;camera.updateProjectionMatrix();const ratio=worldPixelRatio(width,height,devicePixelRatio,renderBudget);if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);renderer.setSize(width,height);css.setSize(width,height);
    screen.style.width=width+'px';screen.style.height=height+'px';fit=screenFit({width,height});cssObject.scale.setScalar(fit.scale);
    if(mode==='workspace')applyPose(workspacePose());
    else if(inspection){finishMoving();applyPose(detailPose(inspection.kind));setMode('inspect');}
    wake();
  }
  function lookPose(position,target,fov=48) {
    const direction=new THREE.Vector3(...target).sub(new THREE.Vector3(...position));
    return {x:position[0],y:position[1],z:position[2],yaw:Math.atan2(-direction.x,-direction.z),pitch:Math.atan2(direction.y,Math.hypot(direction.x,direction.z)),fov};
  }
  const introPose=()=>lookPose([8.2,3.5,11.8],[.7,1.8,-2.7],48);
  const walkingPose=()=>composition==='miniature'?lookPose([8.2,3.5,11.8],[.7,1.1,-1],48):lookPose([.85,1.52,2.45],[-.2,1.0,1.4],54);
  const detailPose=kind=>{const view=kind==='cat'?resident.view(camera.aspect,inspection?.catYaw):inspectView(kind,camera.aspect);return lookPose(view.position,view.target,view.fov);};
  const workspacePose=()=>({x:3.65,y:1.98,z:-1.5+fit.distance,yaw:0,pitch:0,fov:38});
  let pose=introPose(),returnPose=walkingPose(),inspection=null;
  function applyPose(value) {pose=value;camera.position.set(value.x,value.y,value.z);camera.rotation.set(value.pitch,value.yaw,0,'YXZ');if(camera.fov!==value.fov){camera.fov=value.fov;camera.updateProjectionMatrix();}wake();}
  function setMode(value) {mode=value;root.dataset.worldMode=value;screen.inert=value!=='workspace';screen.style.visibility=value==='workspace'?'visible':'hidden';root.dataset.worldTravel='false';if(value==='workspace'||value==='inspect'&&inspection?.kind!=='cat')resident?.settle();wake();}
  function travel(target,nextMode,duration=1700) {
    keys.clear();touchKeys.clear();moving?.resolve();moving=null;
    if(reduced.matches||quiet){applyPose(target);setMode(nextMode);onTravel?.(false);return Promise.resolve();}
    root.dataset.worldTravel='true';onTravel?.(true);
    return new Promise(resolve=>{moving={from:{...pose},to:target,start:performance.now(),duration,nextMode,resolve};wake();});
  }
  function finishMoving(){if(!moving)return;const previous=moving;moving=null;applyPose(previous.to);setMode(previous.nextMode);onTravel?.(false);previous.resolve();}
  function clearInspection(){if(!inspection)return;inspection=null;delete root.dataset.worldInspect;onInspect?.(null);}
  function inspect(kind){
    if(disposed||!(kind==='cat'?resident?.loaded:inspectView(kind))||isBlocked()||!['roam','inspect'].includes(mode))return Promise.resolve(false);
    if(!inspection)inspection={kind,pose:{...pose}};else inspection.kind=kind;
    if(kind==='cat')inspection.catYaw=resident.snapshot().yaw;
    root.dataset.worldInspect=kind;onInspect?.(kind);setMode('inspect');
    if(kind==='cat'){const view=detailPose(kind);resident.attend(view);catEvent('watching');}
    return travel(detailPose(kind),'inspect',650).then(()=>!disposed&&inspection?.kind===kind);
  }
  function restoreInspection(){
    if(!inspection)return Promise.resolve(false);const previous={...inspection.pose};clearInspection();setMode('roam');
    return travel(previous,'roam',650).then(()=>!disposed&&mode==='roam');
  }
  function start({animate=true,focus=true}={}) {
    clearInspection();
    setMode('roam');if(focus)renderer.domElement.focus({preventScroll:true});
    if(!animate){applyPose(walkingPose());return Promise.resolve();}
    return travel(walkingPose(),'roam',1100);
  }
  function focus(animate=true) {if(inspection){returnPose={...inspection.pose};clearInspection();}if(mode==='workspace'&&!moving)return Promise.resolve();if(mode==='roam')returnPose={...pose};screen.style.visibility='hidden';if(!animate){moving?.resolve();moving=null;onTravel?.(false);applyPose(workspacePose());setMode('workspace');css.render(scene,camera);return Promise.resolve();}return travel(workspacePose(),'workspace',1850);}
  function leave() {clearInspection();screen.inert=true;screen.style.visibility='hidden';setMode('roam');renderer.domElement.focus({preventScroll:true});return travel({...returnPose,fov:54},'roam',1200);}
  function outside() {clearInspection();setMode('roam');screen.style.visibility='hidden';renderer.domElement.focus({preventScroll:true});return travel(lookPose([0,1.68,-8.8],[0,1.6,-19],58),'roam',2000);}
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function catEvent(code){root.dataset.catInteraction=code;onCat?.(code);}
  function interactCat(kind){
    if(disposed||isBlocked()||moving||!(mode==='roam'||mode==='inspect'&&inspection?.kind==='cat'))return false;
    const visitor=kind==='call'&&inspection?inspection.pose:pose;
    return resident?.interact(kind,visitor,{instant:quiet||reduced.matches,nearby:inspection?.kind==='cat',now:performance.now()/1000});
  }
  function hitDetail(event) {
    const bounds=renderer.domElement.getBoundingClientRect();pointer.set(((event.clientX-bounds.left)/bounds.width)*2-1,-((event.clientY-bounds.top)/bounds.height)*2+1);
    raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(room.children,true).find(hit=>!hit.object.material?.transparent);
    const cat=resident?.hit(raycaster);if(cat&&(!hit||cat.distance<hit.distance))return 'cat';
    if(hit?.object===monitor||hit?.object===display)return 'computer';
    for(let object=hit?.object;object&&object!==room;object=object.parent)if(object.userData.inspect)return object.userData.inspect;
    return null;
  }
  listen(renderer.domElement,'pointerdown',event=>{
    if(!(mode==='roam'||mode==='inspect'&&inspection?.kind==='cat')||isBlocked()||moving)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,distance:0};renderer.domElement.setPointerCapture(event.pointerId);
  });
  listen(renderer.domElement,'pointermove',event=>{
    if(!(mode==='roam'||mode==='inspect'&&inspection?.kind==='cat')||isBlocked())return;
    if(!drag){renderer.domElement.style.cursor=hitDetail(event)?'pointer':mode==='roam'?'grab':'default';return;}
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag.distance+=Math.abs(dx)+Math.abs(dy);drag.x=event.clientX;drag.y=event.clientY;
    if(mode==='inspect')return;
    pose.yaw-=dx*.0035;pose.pitch=Math.max(-.75,Math.min(.65,pose.pitch-dy*.003));applyPose({...pose});
  });
  listen(renderer.domElement,'pointerup',event=>{if(drag?.id!==event.pointerId)return;const click=drag.distance<6;drag=null;if(!click||isBlocked())return;const hit=hitDetail(event);if(mode==='roam'){if(hit==='computer')onComputer();else if(hit)onDetail?.(hit,renderer.domElement);}else if(mode==='inspect'&&inspection?.kind==='cat'&&hit==='cat')interactCat('pet');});
  listen(renderer.domElement,'pointercancel',()=>{drag=null;});
  listen(document,'keydown',event=>{
    if(mode!=='roam'||isBlocked()||event.metaKey||event.ctrlKey||event.altKey||event.target.closest('input,textarea,[contenteditable="true"]'))return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();keys.add(event.code);wake();}
    if(event.code==='KeyE'){event.preventDefault();onComputer();}
  });
  listen(document,'keyup',event=>keys.delete(event.code));
  listen(window,'blur',()=>{keys.clear();touchKeys.clear();drag=null;});
  for(const button of root.querySelectorAll('[data-world-walk]')){
    listen(button,'pointerdown',event=>{event.preventDefault();touchKeys.add(button.dataset.worldWalk);button.setPointerCapture(event.pointerId);wake();});
    const release=()=>touchKeys.delete(button.dataset.worldWalk);listen(button,'pointerup',release);listen(button,'pointercancel',release);listen(button,'lostpointercapture',release);
  }
  const observer=new ResizeObserver(resize);observer.observe(root);resize();setMode('intro');applyPose(pose);
  let active=!document.hidden&&!root.hidden;
  resident=createCafeResident({scene,asset:catAsset,wake,onChange:catEvent});catEvent('loading');
  resident.ready.then(loaded=>{if(!disposed){root.dataset.catLoaded=String(loaded);catEvent(loaded?'ready':'unavailable');wake();}});
  function tick(time) {
    if(disposed)return;frame=0;if(!active)return;
    const lifeActive=mode==='roam'&&!quiet&&!reduced.matches&&!isBlocked();
    const catInteractive=!quiet&&!reduced.matches&&!isBlocked()&&(mode==='roam'||mode==='inspect'&&inspection?.kind==='cat')&&resident.pending;
    // rAF timestamps fluctuate around the display interval. A 1 ms tolerance
    // avoids accidentally waiting a third refresh on a nominal 60 Hz display.
    if(lifeActive&&!moving&&!keys.size&&!touchKeys.size&&!drag&&time-lastPaint<1000/30-1){frame=requestAnimationFrame(tick);return;}
    lastPaint=time;
    drawing=true;
    const dt=last?Math.min((time-last)/1000,.04):0;last=time;elapsed+=dt;
    if(moving) {
      const t=Math.min(1,(time-moving.start)/moving.duration);applyPose(travelPose(moving.from,moving.to,t));
      if(t===1){const done=moving;moving=null;setMode(done.nextMode);onTravel?.(false);done.resolve();}
    } else if(mode==='roam'&&!isBlocked()) {
      const has=(...names)=>names.some(name=>keys.has(name)||touchKeys.has(name));
      const p=stepWalk(pose,pose.yaw,{forward:Number(has('KeyW','ArrowUp','forward'))-Number(has('KeyS','ArrowDown','back')),right:Number(has('KeyD','ArrowRight','right'))-Number(has('KeyA','ArrowLeft','left'))},dt);
      applyPose({...pose,...p});
    }
    if(water&&lifeActive){const p=water.geometry.attributes.position,n=water.geometry.attributes.normal,b=water.userData.base;for(let i=0;i<p.count;i++){const x=b[i*3]+water.position.x,z=b[i*3+2]+water.position.z;const sample=sampleWater(x,z,elapsed,themeId,waterSampleValue);p.setY(i,b[i*3+1]+sample[0]);n.setXYZ(i,sample[1],sample[2],sample[3]);}p.needsUpdate=n.needsUpdate=true;}
    if(rain&&lifeActive){const p=rain.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,((rainBase[i*3+1]-elapsed*4)%12+12)%12);p.needsUpdate=true;}
    resident.update(dt,{active:lifeActive,interactive:catInteractive});
    if(inspection?.kind==='cat'&&!moving)applyPose(detailPose('cat'));
    try{renderer.render(scene,camera);css.render(scene,camera);}catch{drawing=false;settleFirst(false);onFailure?.();return;}
    root.dataset.worldRenderedMode=mode;
    if(firstPending){root.dataset.worldReady='true';settleFirst(true);}
    if(time-catStamp>250||root.dataset.catActive!==String((lifeActive||catInteractive)&&resident.loaded)){
      const cat=resident.snapshot();root.dataset.catState=cat.phase;root.dataset.catPose=JSON.stringify({x:cat.x,z:cat.z,yaw:cat.yaw});root.dataset.catActive=String((lifeActive||catInteractive)&&cat.loaded);catStamp=time;
    }
    root.dataset.worldPose=JSON.stringify(Object.fromEntries(Object.entries(pose).map(([key,value])=>[key,+value.toFixed(3)])));
    root.dataset.worldFrames=String(renderer.info.render.frame);root.dataset.worldTriangles=String(renderer.info.render.triangles);root.dataset.worldDraws=String(renderer.info.render.calls);
    drawing=false;
    // The DOM workspace paints itself. Keep the GPU quiet while its camera is
    // still; a new pose, theme, viewport or input wakes the real scene again.
    if(!disposed&&(moving||(mode==='roam'&&!isBlocked()&&(keys.size||touchKeys.size))||(lifeActive&&(water||rain||resident.loaded))||(catInteractive&&resident.pending)))frame=requestAnimationFrame(tick);
    else last=0;
  }
  function visibility() {active=!document.hidden&&!root.hidden;keys.clear();touchKeys.clear();last=0;if(active&&!frame){resize();wake();}else if(!active&&frame){cancelAnimationFrame(frame);frame=0;}}
  listen(document,'visibilitychange',visibility);const hiddenObserver=new MutationObserver(visibility);hiddenObserver.observe(root,{attributes:true,attributeFilter:['hidden']});
  listen(reduced,'change',()=>{if(reduced.matches){finishMoving();resident?.settle();}wake();});
  listen(renderer.domElement,'webglcontextlost',event=>{event.preventDefault();active=false;cancelAnimationFrame(frame);frame=0;moving?.resolve();moving=null;onTravel?.(false);onFailure?.();});
  listen(window,'pagehide',event=>{if(event.persisted){active=false;cancelAnimationFrame(frame);frame=0;}else dispose();});listen(window,'pageshow',visibility);
  function dispose() {
    if(disposed)return;disposed=true;clearInspection();cancelAnimationFrame(frame);moving?.resolve();moving=null;abort.abort();observer.disconnect();hiddenObserver.disconnect();
    settleFirst(false);resident?.dispose();pbr.dispose();
    for(const [node,anchor] of anchors){anchor.replaceWith(node);}cssObject.removeFromParent();disposeEnvironment();
    room.traverse(object=>{if(object.isInstancedMesh)object.dispose();});sun.shadow.map?.dispose();sun.shadow.mapPass?.dispose();
    for(const r of resources)r.dispose();for(const t of textures)t.dispose();renderer.dispose();renderer.forceContextLoss();host.remove();
  }
  initialized=true;wake();
  return {start,focus,leave,outside,inspect,restoreInspection,interactCat,setTheme,dispose,firstFrame,wake,setQuiet(value){quiet=value;if(value){finishMoving();resident?.settle();}wake();},get mode(){return mode;}};
}
