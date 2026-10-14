import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from '../vendor/CSS3DRenderer.js';
import { stepWalk, travelPose, screenFit } from './world-state.mjs';

// Three r160 and its CSS3D renderer share one camera. The live workspace is a
// real DOM plane in the room; apps and their private state are never duplicated.
export function createCafeWorld({ root, theme, onComputer, onTravel, onFailure, isBlocked }) {
  const host=document.createElement('div');host.className='space-world';
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  root.prepend(host);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.domElement.className='space-world__canvas';renderer.domElement.tabIndex=0;
  renderer.domElement.setAttribute('aria-label',document.documentElement.lang.startsWith('zh')?'三维咖啡馆。WASD 或方向键行走，拖动看四周。':'3D café. Walk with WASD or arrow keys; drag to look around.');
  host.append(renderer.domElement);
  const css=new CSS3DRenderer();css.domElement.className='space-world__css';host.append(css.domElement);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(48,1,.08,220);
  camera.rotation.order='YXZ';
  const room=new THREE.Group(), outdoors=new THREE.Group();scene.add(room,outdoors);
  const resources=new Set(), textures=new Set();
  let disposed=false,mode='intro',moving=null,frame=0,last=0,elapsed=0,drag=null,themeId=theme;
  const keys=new Set(),touchKeys=new Set();const abort=new AbortController();
  const listen=(target,type,fn,opts={})=>target.addEventListener(type,fn,{...opts,signal:abort.signal});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let seed=79;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const mat=(color,roughness=.75,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness,...extra});resources.add(m);return m;};
  const geometry=g=>{resources.add(g);return g;};
  const boxGeometry=geometry(new THREE.BoxGeometry(1,1,1));
  const cylinderGeometry=geometry(new THREE.CylinderGeometry(1,1,1,20));
  const sphereGeometry=geometry(new THREE.SphereGeometry(1,20,14));
  const woodTexture=(base,streak)=>{
    const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d');
    ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
    for(let i=0;i<1800;i++){const y=random()*512;ctx.strokeStyle=streak;ctx.globalAlpha=.015+random()*.075;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(170,y+random()*12,340,y-random()*12,512,y+random()*5);ctx.stroke();}
    ctx.globalAlpha=1;const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;textures.add(texture);return texture;
  };
  const oak=mat('#b49b73',.78,{map:woodTexture('#c8ac82','#493421')});
  const walnut=mat('#ac957d',.7,{map:woodTexture('#96714f','#30241b')});
  const plaster=mat('#e5dfcf'),paper=mat('#eee8d8'),stone=mat('#b0afa0'),black=mat('#232825',.48),brass=mat('#b89a57',.4,{metalness:.6}),linen=mat('#c6c2a6');
  const mesh=(g,m,x,y,z,parent=room)=>{const v=new THREE.Mesh(g,m);v.position.set(x,y,z);v.castShadow=true;v.receiveShadow=true;parent.add(v);return v;};
  const box=(x,y,z,w,h,d,m,parent=room)=>{const v=mesh(boxGeometry,m,x,y,z,parent);v.scale.set(w,h,d);return v;};
  const cyl=(x,y,z,r,h,m,parent=room)=>{const v=mesh(cylinderGeometry,m,x,y,z,parent);v.scale.set(r,h,r);return v;};
  const sphere=(x,y,z,r,m,parent=room)=>{const v=mesh(sphereGeometry,m,x,y,z,parent);v.scale.setScalar(r);return v;};
  const segment=(a,b,r,m,parent=room)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),v=cyl(...start.clone().add(end).multiplyScalar(.5).toArray(),r,start.distanceTo(end),m,parent);v.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return v;};
  const torus=(x,y,z,r,tube,m,parent=room,arc=Math.PI*2)=>mesh(geometry(new THREE.TorusGeometry(r,tube,8,40,arc)),m,x,y,z,parent);
  const ceramic=mat('#e9dfc9',.32),coffee=mat('#362517',.2);
  function cup(x,y,z,parent=room) {
    cyl(x,y,z,.09,.12,ceramic,parent);cyl(x,y+.063,z,.078,.004,coffee,parent);
    const handle=torus(x+.096,y+.016,z,.042,.013,ceramic,parent);handle.rotation.y=Math.PI/2;
    cyl(x,y-.07,z,.15,.014,ceramic,parent);
  }
  const backShape=new THREE.Shape();backShape.moveTo(-.28,0);backShape.lineTo(.28,0);backShape.lineTo(.28,.12);backShape.quadraticCurveTo(.28,.24,.15,.24);backShape.lineTo(-.15,.24);backShape.quadraticCurveTo(-.28,.24,-.28,.12);backShape.closePath();
  const chairBack=geometry(new THREE.ExtrudeGeometry(backShape,{depth:.045,bevelEnabled:true,bevelSize:.015,bevelThickness:.012,bevelSegments:2,steps:1}));
  function chair(x,z,rotation=0,parent=room) {
    const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=rotation;parent.add(group);
    box(0,.48,0,.56,.1,.55,walnut,group);box(0,.545,0,.49,.05,.48,linen,group);
    for(const dx of [-.22,.22])for(const dz of [-.2,.2])box(dx,.25,dz,.042,.48,.042,walnut,group);
    for(const dx of [-.23,.23])box(dx,.83,-.21,.04,.64,.04,walnut,group);
    mesh(chairBack,walnut,0,.94,-.25,group);
  }
  function table(x,z,r=.58) {
    cyl(x,.75,z,r,.07,oak);cyl(x,.39,z,.055,.74,black);cyl(x,.035,z,.27,.045,black);
    cup(x+.15,.91,z-.1);box(x-.16,.806,z+.08,.22,.017,.3,paper).rotation.y=.2;
    chair(x,z+.95,0);chair(x,z-.9,Math.PI);
  }
  // Quiet timber architecture. The entire north façade is glazed, with an open
  // central door into the garden. The south façade is open to the entrance.
  box(0,-.12,.3,14,.22,10.4,oak);box(0,-.27,-8,13,.22,6,stone,outdoors);
  const floorMap=oak.map.clone();textures.add(floorMap);floorMap.repeat.set(5,4);
  const floor=mat('#d1b487',.82,{map:floorMap});box(0,.001,.3,13.8,.014,10.2,floor);
  for(let z=-4.5;z<5.6;z+=.38)box(0,.009,z,13.8,.002,.007,walnut).castShadow=false;
  box(-6.88,2,.2,.22,4.2,10.6,plaster);
  // Sheltered ceiling with a central skylight and exposed oak joists.
  box(-4.9,4.22,.3,4.2,.14,10.6,plaster);box(4.9,4.22,.3,4.2,.14,10.6,plaster);
  for(let z=-4.5;z<5.8;z+=1.35)box(0,4.11,z,14,.2,.12,walnut);
  for(const x of [-6.7,-3.4,-1.05,1.05,3.4,6.7])box(x,2.1,-4.5,.11,4.2,.16,walnut);
  for(const z of [-4.5,-1.2,2.2,5.4])box(6.7,2.1,z,.14,4.2,.14,walnut);
  box(0,4.08,-4.5,14,.22,.2,walnut);box(0,4.08,5.5,14,.22,.2,walnut);
  box(6.7,4.08,.4,.16,.22,10.2,walnut);
  const glass=mat('#c2d9c7',.12,{transparent:true,opacity:.055,metalness:.12,depthWrite:false});
  for(const x of [-5.05,-2.2,2.2,5.05])box(x,2.15,-4.51,x===-5.05||x===5.05?3.1:2.1,3.9,.018,glass).castShadow=false;
  box(6.7,2.1,.4,.018,4,10.1,glass).castShadow=false;
  // Window seats and low shelving.
  box(-5.9,.28,3.2,1.1,.5,2.5,oak);box(-5.88,.58,3.2,1.06,.16,2.45,linen);
  for(const z of [2.5,3.6])box(-6.35,.82,z,.17,.48,.65,linen).rotation.z=-.08;
  const bookColors=['#344a42','#b18b6b','#9a563e','#cec4ac','#60716e','#3b3942'];
  const bookMaterials=bookColors.map(color=>mat(color));
  for(let shelf=0;shelf<3;shelf++) {
    box(-6.61,.6+shelf*.62,-.6,.43,.07,3.5,oak);
    for(let i=0;i<19;i++){const m=bookMaterials[i%bookMaterials.length];box(-6.6,.81+shelf*.62,-2.13+i*.16,.23,.33+random()*.1,.09,m).rotation.x=(random()-.5)*.08;}
  }
  table(-3.1,1.25,.55);table(-.2,1.4,.5);
  // Soft contact shadows help furniture sit on the timber, even away from sun.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
  const sc=shadowCanvas.getContext('2d'),sg=sc.createRadialGradient(64,64,5,64,64,64);sg.addColorStop(0,'rgba(23,27,17,.32)');sg.addColorStop(.5,'rgba(23,27,17,.15)');sg.addColorStop(1,'rgba(23,27,17,0)');sc.fillStyle=sg;sc.fillRect(0,0,128,128);
  const contactTexture=new THREE.CanvasTexture(shadowCanvas);textures.add(contactTexture);const shadowMaterial=new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false});resources.add(shadowMaterial);
  for(const [x,z,w,d] of [[-3.1,1.25,2.4,2.4],[-.2,1.4,2.3,2.4],[-5,-2.45,3.6,3.6],[3.65,-2.5,4,2.1],[3.65,-1.17,1.5,1.6]]){const s=mesh(geometry(new THREE.PlaneGeometry(w,d)),shadowMaterial,x,.025,z);s.rotation.x=-Math.PI/2;s.castShadow=s.receiveShadow=false;}
  // Espresso bar: a stone counter, coffee machine, cups and supplies.
  box(-5, .53,-2.45,2.5,1.02,2.5,walnut);box(-5,1.07,-2.45,2.65,.13,2.65,stone);
  for(let x=-6.1;x<-3.8;x+=.12)box(x,.52,-1.18,.035,.85,.02,oak);
  box(-5.15,1.44,-2.85,1.02,.63,.6,black);box(-5.15,1.73,-2.85,1.08,.05,.65,brass);
  box(-5.15,1.29,-2.52,.98,.04,.21,brass);
  for(const x of [-5.4,-5.0]){cyl(x,1.49,-2.5,.07,.12,brass);box(x,1.48,-2.38,.04,.03,.21,black);cup(x,1.37,-2.36);}
  for(let i=0;i<5;i++)cyl(-5.7+i*.21,1.83,-2.85,.066,.13,ceramic);
  cyl(-4.15,1.48,-3.02,.13,.7,black);sphere(-4.15,1.95,-3.02,.17,mat('#a17e52',.3,{transparent:true,opacity:.65}));
  const jars=mat('#8c8064',.45);for(let i=0;i<3;i++){cyl(-5.8+i*.55,1.32,-3.36,.12,.4,jars);cyl(-5.8+i*.55,1.54,-3.36,.13,.06,walnut);}
  for(let i=0;i<3;i++)cup(-4.35,1.22,-2.35+i*.32);
  // Owner's desk. This computer is raycastable, not a flat image hotspot.
  box(3.65,1.02,-2.5,3.1,.12,1.2,oak);
  for(const x of [2.27,5.03])for(const z of [-3,-2])box(x,.51,z,.07,1,.07,walnut);
  chair(3.65,-1.17,Math.PI);cup(4.72,1.2,-2.12);
  box(2.58,1.13,-2.24,.4,.065,.55,mat('#45564b')).rotation.y=-.08;
  box(2.61,1.18,-2.29,.35,.028,.5,paper).rotation.y=.12;
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
  for(const [x,z] of [[-5,-2.4],[-3.1,1.25],[-.2,1.4],[3.65,-2.5]]){
    cyl(x,3.52,z,.007,1.2,black);const shade=mesh(geometry(new THREE.ConeGeometry(.32,.22,32,1,true)),lampMaterial,x,2.96,z);shade.material.side=THREE.DoubleSide;
    sphere(x,2.91,z,.045,mat('#fff1ce',.4,{emissive:'#ffce83',emissiveIntensity:2}));
    const light=new THREE.PointLight('#ffd6a0',5,6,2);light.position.set(x,2.84,z);room.add(light);
  }
  // A plant by the desk and a quietly curved earthen vase on the counter.
  const plantMat=mat('#475e3b');cyl(5.9,.27,-3.62,.3,.55,mat('#a88560'));
  for(let i=0;i<12;i++){const a=i*2.4;segment([5.9,.5,-3.62],[5.9+Math.sin(a)*.36,1.25+random()*.55,-3.62+Math.cos(a)*.36],.018,plantMat);const leaf=sphere(5.9+Math.sin(a)*.4,1.25+random()*.6,-3.62+Math.cos(a)*.4,.2,plantMat);leaf.scale.set(.15,.36,.08);leaf.rotation.z=Math.sin(a)*.7;}
  const ambient=new THREE.HemisphereLight('#e3ecdd','#746348',2.1);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff1d2',3.5);sun.position.set(-8,12,-11);sun.castShadow=true;
  sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:1,far:45});sun.shadow.bias=-.0005;sun.shadow.normalBias=.025;scene.add(sun);
  const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color('#a7c6c3')},bottom:{value:new THREE.Color('#e3e2cc')}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 top;uniform vec3 bottom;varying vec3 p;void main(){float t=smoothstep(-.08,.7,normalize(p).y);gl_FragColor=vec4(mix(bottom,top,t),1.);}' });resources.add(skyMaterial);
  mesh(geometry(new THREE.SphereGeometry(180,24,16)),skyMaterial,0,0,0,scene).castShadow=false;
  const leafCanvas=document.createElement('canvas');leafCanvas.width=leafCanvas.height=128;const lc=leafCanvas.getContext('2d');
  lc.fillStyle='#ffffff';lc.beginPath();lc.moveTo(64,119);lc.lineTo(53,80);lc.lineTo(14,76);lc.lineTo(28,61);lc.lineTo(10,40);lc.lineTo(42,48);lc.lineTo(38,12);lc.lineTo(57,32);lc.lineTo(64,3);lc.lineTo(74,32);lc.lineTo(93,12);lc.lineTo(86,48);lc.lineTo(118,40);lc.lineTo(100,61);lc.lineTo(114,76);lc.lineTo(77,80);lc.closePath();lc.fill();
  const leafTexture=new THREE.CanvasTexture(leafCanvas);textures.add(leafTexture);
  const environmentResources=new Set(),environmentMaterials=new Map();let water, rain, rainBase;
  const envMat=(color,extra={})=>{const key=color+JSON.stringify(Object.entries(extra).map(([k,v])=>[k,v?.uuid||v]));if(environmentMaterials.has(key))return environmentMaterials.get(key);const m=new THREE.MeshStandardMaterial({color,roughness:.9,...extra});environmentResources.add(m);environmentMaterials.set(key,m);return m;};
  const envGeo=g=>{environmentResources.add(g);return g;};
  const rockGeometry=geometry(new THREE.IcosahedronGeometry(1,1)),leafGeometry=geometry(new THREE.PlaneGeometry(1,1));
  function batchStatic(group,keep=[]) {
    group.updateMatrixWorld(true);const buckets=new Map();
    group.traverse(object=>{
      if(!object.isMesh||object.isInstancedMesh||keep.includes(object))return;
      let parent=object.parent;while(parent&&parent!==group){if(keep.includes(parent))return;parent=parent.parent;}
      const key=object.geometry.uuid+':'+object.material.uuid+':'+object.castShadow;
      if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(object);
    });
    for(const meshes of buckets.values()){
      if(meshes.length<2)continue;
      const first=meshes[0],instances=new THREE.InstancedMesh(first.geometry,first.material,meshes.length);
      meshes.forEach((object,index)=>{instances.setMatrixAt(index,object.matrixWorld);object.removeFromParent();});
      instances.castShadow=first.castShadow;instances.receiveShadow=first.receiveShadow;group.add(instances);
    }
  }
  batchStatic(room,[computer]);
  function rock(x,z,size,parent=outdoors) {
    const v=mesh(rockGeometry,envMat('#777d68'),x,size*.28,z,parent);v.scale.set(size,size*.65,size*.7);v.rotation.set(random()*.3,random()*6,random()*.3);return v;
  }
  function tree(x,z,height,color,kind='maple') {
    const bark=envMat('#77654d'),leaf=envMat(color,{side:THREE.DoubleSide,map:leafTexture,alphaTest:.45,emissive:color,emissiveIntensity:.065});
    segment([x,0,z],[x+.14,height*.65,z-.1],.035*height,bark,outdoors);
    const leafGeo=leafGeometry;
    const count=kind==='pine'?650:1200,leaves=new THREE.InstancedMesh(leafGeo,leaf,count);leaves.castShadow=true;leaves.receiveShadow=true;
    for(let i=0;i<count;i++){
      const angle=random()*Math.PI*2, level=random();
      const radius=kind==='pine'?(1-level)*height*.35:Math.sqrt(random())*height*.45;
      dummy.position.set(x+Math.cos(angle)*radius,height*(kind==='pine'?.18+level*.8:.62+random()*.28),z+Math.sin(angle)*radius);
      dummy.rotation.set(random()*3,random()*3,random()*3);
      const s=height*(kind==='pine'?.14:.13);dummy.scale.set(s*(.7+random()),s*(.6+random()),1);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
      leaves.setColorAt(i,new THREE.Color().setScalar(.72+random()*.5));
    }outdoors.add(leaves);
    if(kind!=='pine')for(let i=0;i<6;i++){const a=i*2.4;segment([x,height*.4,z],[x+Math.cos(a)*height*.32,height*.78,z+Math.sin(a)*height*.32],.013*height,bark,outdoors);}
  }
  function mountain(x,z,width,height,color) {
    const g=envGeo(new THREE.PlaneGeometry(width,height,16,8));const p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      const xx=p.getX(i),yy=p.getY(i),t=(yy+height/2)/height;
      const profile=Math.pow(Math.max(.04,1-Math.abs(xx)/(width/2)),.7)*(.68+.12*Math.cos(xx*.2)+.12*Math.sin(xx*.37));
      p.setXYZ(i,xx,(t*height*profile)-.6,Math.sin(xx*.3+yy)*1.1);
    }g.computeVertexNormals();const v=mesh(g,envMat(color,{side:THREE.DoubleSide}),x,0,z,outdoors);v.castShadow=false;
  }
  function makeWater(color,width,depth,x,z) {
    const g=envGeo(new THREE.PlaneGeometry(width,depth,48,48));g.rotateX(-Math.PI/2);
    const m=envMat(color,{metalness:.35,roughness:.2});water=mesh(g,m,x,-.04,z,outdoors);water.castShadow=false;
    water.userData.base=g.attributes.position.array.slice();
  }
  function disposeEnvironment() {
    outdoors.traverse(object=>{if(object.isInstancedMesh)object.dispose();});
    outdoors.clear();for(const r of environmentResources)r.dispose();environmentResources.clear();environmentMaterials.clear();water=rain=rainBase=null;
  }
  function setTheme(id) {
    themeId=id;seed=79;disposeEnvironment();
    scene.fog=new THREE.Fog(id==='rain'?'#465f66':'#d5dcca',18,id==='rain'?75:95);
    sun.intensity=id==='rain'?.45:3.5;ambient.intensity=id==='rain'?.85:2.1;
    skyMaterial.uniforms.top.value.set(id==='rain'?'#203f51':id==='coast'?'#8abfcb':'#9ebec1');
    skyMaterial.uniforms.bottom.value.set(id==='rain'?'#83958e':'#e6e5cf');
    box(0,-.18,-8,13,.16,6,oak,outdoors);
    for(let x=-6.3;x<6.5;x+=.3)box(x,-.088,-8,.014,.003,6,walnut,outdoors).castShadow=false;
    const ground=envMat(id==='coast'?'#d4c9a3':id==='rain'?'#59645c':'#7c8763');box(0,-.4,-45,160,.6,100,ground,outdoors);
    if(id==='coast'||id==='lake') {
      makeWater(id==='coast'?'#4c9d9f':'#748f81',160,100,0,-65);
      if(id==='lake')for(let i=0;i<9;i++)mountain(-65+i*17,-102,35,9+random()*12,'#728577');
      else {
        for(let i=0;i<12;i++){const r=rock(-22+random()*44,-13-random()*8,.4+random()*1.1);r.material.color.set('#c7bc9c');}
        for(const x of [-11,12]){segment([x,0,-14],[x+1,6,-14],.16,envMat('#8b8264'),outdoors);for(let i=0;i<9;i++){const a=i*.7;segment([x+1,6,-14],[x+1+Math.cos(a)*2,5.7,-14+Math.sin(a)*2],.065,envMat('#506d46'),outdoors);}}
      }
    } else if(id==='mountain') {
      for(let row=0;row<3;row++)for(let i=0;i<8;i++)mountain(-70+i*22,-40-row*25,35,16+random()*18,['#829581','#91a69b','#aec0b4'][row]);
      for(let i=0;i<15;i++)tree(-22+random()*44,-13-random()*18,3+random()*4,'#45664e','pine');
    } else if(id==='rain') {
      box(0,-.07,-15,70,.08,6,envMat('#4a5558',{metalness:.25,roughness:.25}),outdoors);
      for(let i=0;i<7;i++){
        const x=-23+i*7;box(x,3,-23,6,6,4,envMat(i%2?'#74827a':'#959181'),outdoors);
        for(let row=0;row<2;row++)for(let col=0;col<3;col++)box(x-1.7+col*1.65,1.6+row*2,-20.98,.82,1.22,.025,envMat('#cfc594',{emissive:'#d5a257',emissiveIntensity:.8}),outdoors);
      }
      const rainGeometry=envGeo(new THREE.BufferGeometry());const positions=new Float32Array(900*3);for(let i=0;i<900;i++){positions[i*3]=-14+random()*28;positions[i*3+1]=random()*12;positions[i*3+2]=-7-random()*30;}rainBase=positions.slice();rainGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
      const rainMat=new THREE.PointsMaterial({color:'#d4e3de',size:.028,transparent:true,opacity:.5});environmentResources.add(rainMat);rain=new THREE.Points(rainGeometry,rainMat);outdoors.add(rain);
      for(const x of [-9,9]){cyl(x,1.9,-12,.04,3.8,black,outdoors);sphere(x,3.9,-12,.15,envMat('#e5d2a0',{emissive:'#ffc779',emissiveIntensity:2}),outdoors);const l=new THREE.PointLight('#efcf92',9,12);l.position.set(x,3.8,-12);outdoors.add(l);}
    } else {
      const gravelCanvas=document.createElement('canvas');gravelCanvas.width=gravelCanvas.height=256;const gc=gravelCanvas.getContext('2d');gc.fillStyle='#c1bda7';gc.fillRect(0,0,256,256);
      for(let i=0;i<6000;i++){gc.fillStyle=i%2?'#dedac2':'#9c9c84';gc.globalAlpha=.3;gc.fillRect(random()*256,random()*256,1+random()*2,1+random()*2);}
      const gravelTexture=new THREE.CanvasTexture(gravelCanvas);gravelTexture.colorSpace=THREE.SRGBColorSpace;gravelTexture.wrapS=gravelTexture.wrapT=THREE.RepeatWrapping;gravelTexture.repeat.set(5,5);environmentResources.add(gravelTexture);
      box(0,-.065,-13.5,13,.06,5.8,envMat('#f2eed5',{map:gravelTexture}),outdoors);
      makeWater('#7b9275',4.5,3.6,3.6,-13.5);
      for(let i=0;i<22;i++)rock(-9+random()*18,-11-random()*12,.4+random()*.9);
      for(let i=0;i<17;i++)tree(-16+random()*32,-14-random()*15,2.7+random()*2.6,id==='zen'?(i%3?'#758849':'#a57049'):'#4d7758');
      const mossGeo=envGeo(new THREE.SphereGeometry(1,12,8)),mossMat=envMat('#627646');
      const moss=new THREE.InstancedMesh(mossGeo,mossMat,130);
      for(let i=0;i<130;i++){dummy.position.set(-10+random()*20,-.03,-11-random()*12);dummy.scale.set(.4+random()*.7,.13+random()*.15,.4+random()*.7);dummy.updateMatrix();moss.setMatrixAt(i,dummy.matrix);}moss.receiveShadow=true;outdoors.add(moss);
      for(let i=0;i<6;i++)cyl(-.4+Math.sin(i)*.2,-.02,-10.8-i*.65,.3,.07,stone,outdoors);
      if(id==='garden') {
        const wall=envMat('#e1e1cc');box(-6,1.35,-18,8,2.7,.3,wall,outdoors);box(6,1.35,-18,8,2.7,.3,wall,outdoors);
        // A real circular opening: an extruded wall shape with a round hole.
        const shape=new THREE.Shape();shape.moveTo(-2,0);shape.lineTo(2,0);shape.lineTo(2,3.3);shape.lineTo(-2,3.3);shape.closePath();const hole=new THREE.Path();hole.absarc(0,1.38,1.27,0,Math.PI*2,true);shape.holes.push(hole);
        const gate=mesh(envGeo(new THREE.ExtrudeGeometry(shape,{depth:.25,bevelEnabled:false})),wall,0,0,-18,outdoors);
        const rim=torus(0,1.38,-17.98,1.29,.065,stone,outdoors);environmentResources.add(rim.geometry);
        for(let i=0;i<28;i++){const x=7+random()*3,z=-13-random()*8;cyl(x,1.8,z,.025,3.6+random(),envMat('#5d7e46'),outdoors);}
        gate.receiveShadow=true;
      }
      for(let row=0;row<2;row++)for(let i=0;i<6;i++)mountain(-65+i*25,-65-row*25,38,10+random()*10,row?'#a1b3a2':'#8a9f89');
    }
    const objectCount=outdoors.children.length;batchStatic(outdoors,[water]);renderer.shadowMap.needsUpdate=true;
    root.dataset.worldTheme=id;root.dataset.worldObjects=String(objectCount);
  }
  setTheme(theme);
  const screen=document.createElement('div');screen.className='space-spatial-screen';screen.setAttribute('aria-label','CUBXXW OS');css.domElement.append(screen);
  const anchors=[];
  for(const node of [root.querySelector('[data-space-windows]'),root.querySelector('[data-space-snap]'),root.querySelector('.space-bottom'),root.querySelector('.space-menu')]){
    const anchor=document.createComment('spatial workspace return');node.before(anchor);anchors.push([node,anchor]);screen.append(node);
  }
  const cssObject=new CSS3DObject(screen);screen.style.userSelect='auto';cssObject.position.set(3.65,1.98,-1.5);scene.add(cssObject);
  let fit=screenFit({width:root.clientWidth||innerWidth,height:root.clientHeight||innerHeight});function resize() {
    const width=root.clientWidth||innerWidth,height=root.clientHeight||innerHeight;if(!width||!height)return;
    camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);css.setSize(width,height);
    screen.style.width=width+'px';screen.style.height=height+'px';fit=screenFit({width,height});cssObject.scale.setScalar(fit.scale);
    if(mode==='workspace')applyPose(workspacePose());
  }
  function lookPose(position,target,fov=48) {
    const direction=new THREE.Vector3(...target).sub(new THREE.Vector3(...position));
    return {x:position[0],y:position[1],z:position[2],yaw:Math.atan2(-direction.x,-direction.z),pitch:Math.atan2(direction.y,Math.hypot(direction.x,direction.z)),fov};
  }
  const introPose=()=>lookPose([8.2,3.5,11.8],[.7,1.8,-2.7],48);
  const walkingPose=()=>lookPose([1.35,1.68,4.5],[3.5,1.65,-2.5],54);
  const workspacePose=()=>({x:3.65,y:1.98,z:-1.5+fit.distance,yaw:0,pitch:0,fov:38});
  let pose=introPose(),returnPose=walkingPose();
  function applyPose(value) {pose=value;camera.position.set(value.x,value.y,value.z);camera.rotation.set(value.pitch,value.yaw,0,'YXZ');if(camera.fov!==value.fov){camera.fov=value.fov;camera.updateProjectionMatrix();}}
  function setMode(value) {mode=value;root.dataset.worldMode=value;screen.inert=value!=='workspace';screen.style.visibility=value==='workspace'?'visible':'hidden';root.dataset.worldTravel='false';}
  function travel(target,nextMode,duration=1700) {
    keys.clear();touchKeys.clear();moving?.resolve();moving=null;
    if(reduced.matches){applyPose(target);setMode(nextMode);onTravel?.(false);return Promise.resolve();}
    root.dataset.worldTravel='true';onTravel?.(true);
    return new Promise(resolve=>{moving={from:{...pose},to:target,start:performance.now(),duration,nextMode,resolve};});
  }
  function start() {setMode('roam');renderer.domElement.focus({preventScroll:true});return travel(walkingPose(),'roam',2200);}
  function focus(animate=true) {if(mode==='workspace'&&!moving)return Promise.resolve();if(mode==='roam')returnPose={...pose};screen.style.visibility='hidden';if(!animate){moving?.resolve();moving=null;onTravel?.(false);applyPose(workspacePose());setMode('workspace');css.render(scene,camera);return Promise.resolve();}return travel(workspacePose(),'workspace',1850);}
  function leave() {screen.inert=true;screen.style.visibility='hidden';setMode('roam');renderer.domElement.focus({preventScroll:true});return travel({...returnPose,fov:54},'roam',1200);}
  function outside() {setMode('roam');screen.style.visibility='hidden';renderer.domElement.focus({preventScroll:true});return travel(lookPose([0,1.68,-8.8],[0,1.6,-19],58),'roam',2000);}
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function hitComputer(event) {
    const bounds=renderer.domElement.getBoundingClientRect();pointer.set(((event.clientX-bounds.left)/bounds.width)*2-1,-((event.clientY-bounds.top)/bounds.height)*2+1);
    raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(room.children,true).find(hit=>!hit.object.material?.transparent);
    return hit?.object===monitor||hit?.object===display;
  }
  listen(renderer.domElement,'pointerdown',event=>{
    if(mode!=='roam'||isBlocked()||moving)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,distance:0};renderer.domElement.setPointerCapture(event.pointerId);
  });
  listen(renderer.domElement,'pointermove',event=>{
    if(mode!=='roam'||isBlocked())return;
    if(!drag){renderer.domElement.style.cursor=hitComputer(event)?'pointer':'grab';return;}
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag.distance+=Math.abs(dx)+Math.abs(dy);drag.x=event.clientX;drag.y=event.clientY;
    pose.yaw-=dx*.0035;pose.pitch=Math.max(-.75,Math.min(.65,pose.pitch-dy*.003));applyPose({...pose});
  });
  listen(renderer.domElement,'pointerup',event=>{if(drag?.id!==event.pointerId)return;const click=drag.distance<6;drag=null;if(mode==='roam'&&click&&hitComputer(event))onComputer();});
  listen(renderer.domElement,'pointercancel',()=>{drag=null;});
  listen(document,'keydown',event=>{
    if(mode!=='roam'||isBlocked()||event.metaKey||event.ctrlKey||event.altKey||event.target.closest('input,textarea,[contenteditable="true"]'))return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();keys.add(event.code);}
    if(event.code==='KeyE'){event.preventDefault();onComputer();}
  });
  listen(document,'keyup',event=>keys.delete(event.code));
  listen(window,'blur',()=>{keys.clear();touchKeys.clear();drag=null;});
  for(const button of root.querySelectorAll('[data-world-walk]')){
    listen(button,'pointerdown',event=>{event.preventDefault();touchKeys.add(button.dataset.worldWalk);button.setPointerCapture(event.pointerId);});
    const release=()=>touchKeys.delete(button.dataset.worldWalk);listen(button,'pointerup',release);listen(button,'pointercancel',release);listen(button,'lostpointercapture',release);
  }
  const observer=new ResizeObserver(resize);observer.observe(root);resize();setMode('intro');applyPose(pose);
  let active=!document.hidden&&!root.hidden;
  function tick(time) {
    if(disposed)return;frame=0;if(!active)return;
    const dt=last?Math.min((time-last)/1000,.04):0;last=time;elapsed+=dt;
    if(moving) {
      const t=Math.min(1,(time-moving.start)/moving.duration);applyPose(travelPose(moving.from,moving.to,t));
      if(t===1){const done=moving;moving=null;setMode(done.nextMode);onTravel?.(false);done.resolve();}
    } else if(mode==='roam'&&!isBlocked()) {
      const has=(...names)=>names.some(name=>keys.has(name)||touchKeys.has(name));
      const p=stepWalk(pose,pose.yaw,{forward:Number(has('KeyW','ArrowUp','forward'))-Number(has('KeyS','ArrowDown','back')),right:Number(has('KeyD','ArrowRight','right'))-Number(has('KeyA','ArrowLeft','left'))},dt);
      applyPose({...pose,...p});
    }
    if(water&&!reduced.matches){const p=water.geometry.attributes.position,b=water.userData.base;for(let i=0;i<p.count;i++)p.setY(i,b[i*3+1]+Math.sin(b[i*3]*1.8+elapsed*.55)*.018+Math.sin(b[i*3+2]*2.1+elapsed*.8)*.012);p.needsUpdate=true;}
    if(rain&&!reduced.matches){const p=rain.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,((rainBase[i*3+1]-elapsed*4)%12+12)%12);p.needsUpdate=true;}
    renderer.render(scene,camera);css.render(scene,camera);root.dataset.worldRenderedMode=mode;
    root.dataset.worldPose=JSON.stringify({x:+pose.x.toFixed(3),z:+pose.z.toFixed(3),yaw:+pose.yaw.toFixed(3)});
    root.dataset.worldFrames=String(renderer.info.render.frame);root.dataset.worldTriangles=String(renderer.info.render.triangles);root.dataset.worldDraws=String(renderer.info.render.calls);
    frame=requestAnimationFrame(tick);
  }
  function visibility() {active=!document.hidden&&!root.hidden;keys.clear();touchKeys.clear();last=0;if(active&&!frame){resize();frame=requestAnimationFrame(tick);}else if(!active&&frame){cancelAnimationFrame(frame);frame=0;}}
  listen(document,'visibilitychange',visibility);const hiddenObserver=new MutationObserver(visibility);hiddenObserver.observe(root,{attributes:true,attributeFilter:['hidden']});
  listen(renderer.domElement,'webglcontextlost',event=>{event.preventDefault();active=false;cancelAnimationFrame(frame);frame=0;moving?.resolve();moving=null;onTravel?.(false);onFailure?.();});
  listen(window,'pagehide',event=>{if(event.persisted){active=false;cancelAnimationFrame(frame);frame=0;}else dispose();});listen(window,'pageshow',visibility);
  function dispose() {
    if(disposed)return;disposed=true;cancelAnimationFrame(frame);moving?.resolve();moving=null;abort.abort();observer.disconnect();hiddenObserver.disconnect();
    for(const [node,anchor] of anchors){anchor.replaceWith(node);}cssObject.removeFromParent();disposeEnvironment();
    room.traverse(object=>{if(object.isInstancedMesh)object.dispose();});sun.shadow.map?.dispose();sun.shadow.mapPass?.dispose();
    for(const r of resources)r.dispose();for(const t of textures)t.dispose();renderer.dispose();renderer.forceContextLoss();host.remove();
  }
  root.dataset.worldReady='true';frame=requestAnimationFrame(tick);
  return {start,focus,leave,outside,setTheme,dispose,get mode(){return mode;}};
}
