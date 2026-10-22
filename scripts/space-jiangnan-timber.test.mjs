import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import * as THREE from '../assets/js/vendor/three.module.min.js';

// Use the real room, PBR registry, meshes, raycasts, shader hook and disposable
// Three objects. This data canvas replaces browser image transport, not wood
// geometry or contact math. Native rendering verifies the complete GLSL shader.
function canvas() {
  const surface={width:0,height:0};let pixels=new Uint8ClampedArray(),matrix=[1,0,0,1,0,0],stack=[];
  const ensure=()=>{if(pixels.length!==surface.width*surface.height*4)pixels=new Uint8ClampedArray(surface.width*surface.height*4);};
  const context=new Proxy({
    fillStyle:'#000000',
    createImageData(w,h){return{data:new Uint8ClampedArray(w*h*4),width:w,height:h};},
    getImageData(x,y,w,h){ensure();const out=this.createImageData(w,h);for(let row=0;row<h;row++)out.data.set(pixels.subarray(((y+row)*surface.width+x)*4,((y+row)*surface.width+x+w)*4),row*w*4);return out;},
    putImageData(value){ensure();pixels.set(value.data);},
    fillRect(x,y,w,h){ensure();const hex=typeof this.fillStyle==='string'?this.fillStyle.match(/^#([\da-f]{6})/i)?.[1]:null;if(!hex)return;const rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));for(let row=y;row<Math.min(y+h,surface.height);row++)for(let col=x;col<Math.min(x+w,surface.width);col++){const i=(row*surface.width+col)*4;pixels[i]=rgb[0];pixels[i+1]=rgb[1];pixels[i+2]=rgb[2];pixels[i+3]=255;}},
    save(){stack.push([...matrix]);},restore(){matrix=stack.pop()||[1,0,0,1,0,0];},
    translate(x,y){matrix[4]+=matrix[0]*x+matrix[2]*y;matrix[5]+=matrix[1]*x+matrix[3]*y;},
    rotate(angle){const [a,b,c,d,e,f]=matrix,cs=Math.cos(angle),sn=Math.sin(angle);matrix=[a*cs+c*sn,b*cs+d*sn,-a*sn+c*cs,-b*sn+d*cs,e,f];},
    setTransform(...next){matrix=next;},
    drawImage(source,dx,dy,dw,dh){
      ensure();const sourcePixels=source.data||source.getContext('2d').getImageData(0,0,source.width,source.height).data;
      const [a,b,c,d,e,f]=matrix,det=a*d-b*c;
      for(let y=0;y<surface.height;y++)for(let x=0;x<surface.width;x++){
        const u=((d*(x+.5-e)-c*(y+.5-f))/det-dx)/dw,v=((-b*(x+.5-e)+a*(y+.5-f))/det-dy)/dh;
        if(u<0||u>=1||v<0||v>=1)continue;
        const from=(Math.min(source.height-1,Math.floor(v*source.height))*source.width+Math.min(source.width-1,Math.floor(u*source.width)))*4;
        pixels.set(sourcePixels.subarray(from,from+4),(y*surface.width+x)*4);
      }
    },
    createLinearGradient(){return{addColorStop(){}};},createRadialGradient(){return{addColorStop(){}};}
  },{get:(target,key)=>key in target?target[key]:()=>{}});
  surface.getContext=()=>context;return surface;
}

async function loadModule(file) {
  const {build}=createRequire(import.meta.url)('esbuild');
  const out=await build({entryPoints:[new URL('../assets/js/space/'+file,import.meta.url).pathname],bundle:true,write:false,format:'cjs',platform:'node',external:['three']});
  const module={exports:{}};
  new Function('require','module','exports',out.outputFiles[0].text)(name=>{assert.equal(name,'three');return THREE;},module,module.exports);
  return module.exports;
}
const [{buildJiangnanRoom},{createWorldMaterials}]=await Promise.all([loadModule('jiangnan-room.js'),loadModule('world-materials.js')]);
const previousDocument=globalThis.document;globalThis.document={createElement:canvas};

function createFixture() {
  const requests=[],originalLoad=THREE.TextureLoader.prototype.load,resources=new Set(),textures=new Set(),root={dataset:{}},state={disposed:false,wakes:0},callbacks=[];
  THREE.TextureLoader.prototype.load=function(url,onLoad){requests.push({url,onLoad});return new THREE.Texture();};
  try {
    const pbr=createWorldMaterials({base:'/images/space/cafe/materials-v1/',renderer:{capabilities:{getMaxAnisotropy:()=>8},shadowMap:{}},resources,textures,root,isDisposed:()=>state.disposed,wake(){state.wakes++;}});
    const bind=pbr.bind;pbr.bind=(m,key,options={})=>{if(options.onMap)callbacks.push({m,key,onMap:options.onMap});return bind(m,key,options);};
    const room=buildJiangnanRoom({scene:new THREE.Scene(),pbr,resources,textures,wake(){state.wakes++;},isDisposed:()=>state.disposed});room.group.updateWorldMatrix(true,true);
    let closed=false;
    return {room,pbr,resources,textures,root,state,requests,callbacks,dispose(){if(closed)return;closed=true;state.disposed=true;pbr.dispose();for(const v of resources)v.dispose();for(const v of textures)v.dispose();}};
  } finally {THREE.TextureLoader.prototype.load=originalLoad;}
}
const fixture=createFixture();
const object=name=>{const o=fixture.room.group.getObjectByName(name);assert.ok(o,name);return o;};
function materials(room=fixture.room){return [room.group.getObjectByName('aged-elm-desk-top').material,room.group.getObjectByName('carved-elm-crest-rail').material,room.group.getObjectByName('handscooped-elm-seat').material,room.group.getObjectByName('photo-stand-support').material];}
function channelMaps(room=fixture.room){return [...new Set(materials(room).flatMap(m=>[m.map,m.roughnessMap,m.bumpMap]))];}
function geometryDigest(room=fixture.room){
  const hash=createHash('sha256');room.group.updateWorldMatrix(true,true);
  room.group.traverse(o=>{if(!o.isMesh)return;hash.update(o.name);hash.update(JSON.stringify(o.matrixWorld.toArray()));for(const [name,v] of Object.entries(o.geometry.attributes)){hash.update(name);hash.update(Buffer.from(v.array.buffer,v.array.byteOffset,v.array.byteLength));}if(o.geometry.index)hash.update(Buffer.from(o.geometry.index.array.buffer,o.geometry.index.array.byteOffset,o.geometry.index.array.byteLength));if(o.isInstancedMesh)hash.update(Buffer.from(o.instanceMatrix.array.buffer));});
  hash.update(JSON.stringify(room.targets));hash.update(JSON.stringify(room.screen));return hash.digest('hex');
}
const geometryBefore=geometryDigest(),initialMapVersions=channelMaps().map(v=>v.version),requestsBefore=fixture.requests.length;
function shaderContact(material) {
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
  const match=shader.fragmentShader.match(/float timberContactAt\(vec3 p,vec3 n\)\{([^}]+)\}/);
  assert.ok(match,'the rendered material must contain a physical contact function');
  // Execute the scalar function actually emitted to GLSL, not a second JS
  // implementation. The inputs below come from real Three hit triangles.
  const scalar=new Function('p','n','smoothstep','pow','exp','abs','clamp',match[1].replace(/\bfloat\b/g,'let'));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
  return (p,n)=>scalar(p,n,smooth,Math.pow,Math.exp,Math.abs,clamp);
}
function hit(name,origin,direction) {
  const o=object(name),ray=new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...direction)),intersection=ray.intersectObject(o)[0];
  assert.ok(intersection,'ray must hit physical '+name);
  return{object:o,point:o.worldToLocal(intersection.point.clone()),normal:intersection.face.normal};
}
const contact=h=>shaderContact(h.object.material)(h.point,h.normal);

test('desk, crest, seat and supports own finite role materials with shared independent data channels',()=>{
  const roles=materials();assert.equal(new Set(roles).size,4,'contact must not be copied onto supports through one shared material');
  for(const m of roles){
    assert.ok(fixture.resources.has(m));assert.ok([m.roughness,m.bumpScale,m.envMapIntensity,...m.color.toArray()].every(Number.isFinite));
    assert.notEqual(m.map,m.bumpMap,'pigment cannot serve as an independent height channel');assert.notEqual(m.map,m.roughnessMap);assert.notEqual(m.bumpMap,m.roughnessMap);
    assert.equal(m.map.colorSpace,THREE.SRGBColorSpace);assert.equal(m.roughnessMap.colorSpace,THREE.NoColorSpace);assert.equal(m.bumpMap.colorSpace,THREE.NoColorSpace);assert.equal(m.normalMap,null);
    for(const map of [m.map,m.roughnessMap,m.bumpMap]){assert.ok(fixture.textures.has(map));assert.equal(map.anisotropy,4);assert.equal(map.image.width,1024);assert.equal(map.image.height,512);}
  }
  assert.equal(channelMaps().length,3,'four roles reuse one colour / roughness / height set');
});

test('actual desk-front and back rays receive different physical contact in the emitted shader',()=>{
  const front=hit('aged-elm-desk-top',[.68,.9,-1.435],[0,-1,0]),back=hit('aged-elm-desk-top',[.68,.9,-2.25],[0,-1,0]);
  assert.ok(contact(front)>.45,'the real wrist edge must be handled');assert.ok(contact(back)<.01,'under the monitor stays unpolished');
});

test('actual arm and seat use is suppressed on the seat underside and supporting joinery',()=>{
  const arm=hit('carved-elm-crest-rail',[.50,.85,-.975],[0,-1,0]),seat=hit('handscooped-elm-seat',[.8,.6,-.975],[0,-1,0]),under=hit('handscooped-elm-seat',[.8,.35,-.975],[0,1,0]);
  assert.ok(contact(arm)>.5);assert.ok(contact(seat)>.6);assert.equal(contact(under),0,'overlapping seat UVs cannot polish the underside');
  const support=object('photo-stand-support'),sample=shaderContact(support.material);let vertices=0;
  fixture.room.group.traverse(o=>{if(!o.isMesh||o.material!==support.material)return;const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;for(let i=0;i<p.count;i++){assert.equal(sample(new THREE.Vector3().fromBufferAttribute(p,i),new THREE.Vector3().fromBufferAttribute(n,i)),0,'supporting timber receives no hand polish');vertices++;}});
  assert.ok(vertices>support.geometry.attributes.position.count,'check actual desk and chair joinery as well as the photo support');
});

test('the emitted contact function stays finite and bounded at every actual timber vertex',()=>{
  for(const m of new Set(materials())){
    const sample=shaderContact(m);let checked=0;
    fixture.room.group.traverse(o=>{if(!o.isMesh||o.material!==m)return;const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;for(let i=0;i<p.count;i++){const value=sample(new THREE.Vector3().fromBufferAttribute(p,i),new THREE.Vector3().fromBufferAttribute(n,i));assert.ok(Number.isFinite(value)&&value>=0&&value<=1);checked++;}});
    assert.ok(checked>0);
  }
});

function donorImage(){
  const image={width:64,height:64,data:new Uint8ClampedArray(64*64*4)};
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){const p=(y*64+x)*4,value=70+Math.round(Math.sin(x*1.8)*18+Math.cos(x*.17)*10+Math.sin(y*.12)*5);image.data.set([value+12,value,value-8,255],p);}
  return image;
}
const mapRequest=channel=>{const r=fixture.requests.find(r=>r.url.endsWith('/wood_table_001-'+channel+'.jpg'));assert.ok(r);return r;};
const deliver=async(channel,map)=>{await Promise.resolve();mapRequest(channel).onLoad(map);};

test('real delayed normal, colour and roughness deliveries update only the intended derived channels',async()=>{
  const original=channelMaps(),before=original.map(v=>v.version),normal=new THREE.Texture(donorImage());await deliver('normal',normal);
  assert.deepEqual(channelMaps(),original);assert.deepEqual(original.map(v=>v.version),before);for(const m of materials())assert.equal(m.normalMap,null);
  const colour=new THREE.Texture(donorImage());await deliver('color',colour);
  assert.deepEqual(channelMaps(),original);for(const [i,map] of original.entries())assert.equal(map.version,before[i]+1,'each derived channel uploads once after colour arrives');
  for(const map of original){const {data}=map.image.getContext('2d').getImageData(0,0,1024,512);let min=255,max=0;for(let i=0;i<data.length;i+=4){min=Math.min(min,data[i]);max=Math.max(max,data[i]);assert.equal(data[i+3],255);}assert.ok(max>min,'photographic fibre must reach every derived channel');}
  const versions=original.map(v=>v.version);await deliver('roughness',new THREE.Texture(donorImage()));
  assert.deepEqual(original.map(v=>v.version),versions);for(const m of materials()){assert.equal(m.normalMap,null);assert.equal(m.map.colorSpace,THREE.SRGBColorSpace);assert.equal(m.roughnessMap.colorSpace,THREE.NoColorSpace);assert.equal(m.bumpMap.colorSpace,THREE.NoColorSpace);}
  assert.ok(fixture.textures.has(normal)&&fixture.textures.has(colour),'the shared registry retains donor GPU ownership');
});

test('donor arrival leaves actual geometry, UVs, matrices, targets and screen byte-identical',()=>{
  assert.deepEqual(channelMaps().map(v=>v.version),initialMapVersions.map(v=>v+1),'this check follows a real pixel update');
  assert.equal(geometryDigest(),geometryBefore);
});

test('derived timber maps reuse the twelve real PBR requests instead of requesting new assets',()=>{
  const maps=fixture.requests.filter(r=>r.url.includes('/materials-v1/'));
  assert.equal(maps.length,12);assert.equal(fixture.requests.length,requestsBefore);
  assert.deepEqual(maps.filter(r=>r.url.includes('/wood_table_001-')).map(r=>r.url.split('/').pop()).sort(),['wood_table_001-color.jpg','wood_table_001-normal.jpg','wood_table_001-roughness.jpg']);
});

test('shared timber GPU resources and the existing lamp-shadow owner dispose exactly once',()=>{
  const owned=[...new Set([...materials(),...channelMaps()])],counts=new Map(owned.map(v=>[v,0]));for(const v of owned)v.addEventListener('dispose',()=>counts.set(v,counts.get(v)+1));
  const lamp=fixture.room.group.getObjectByName('table-opal-downlight');assert.ok(lamp?.shadow);const target=new THREE.WebGLRenderTarget(8,8);let shadowDisposed=0;target.addEventListener('dispose',()=>shadowDisposed++);lamp.shadow.map=target;
  fixture.dispose();fixture.dispose();for(const n of counts.values())assert.equal(n,1);assert.equal(shadowDisposed,1,'the plain owner wrapper releases its shadow even though it emits no own event');
});

test('late registry loads and direct donor callbacks cannot update released maps or wake the room',async()=>{
  const late=createFixture(),maps=channelMaps(late.room),versions=maps.map(v=>v.version);late.dispose();const wakes=late.state.wakes;
  for(const request of late.requests.filter(r=>r.url.includes('/materials-v1/wood_table_001-'))){const map=new THREE.Texture();let disposed=0;map.addEventListener('dispose',()=>disposed++);await Promise.resolve();request.onLoad(map);assert.equal(disposed,1,'a donor delivered after disposal is released immediately');assert.ok(!late.textures.has(map));}
  const callback=late.callbacks.find(v=>v.key==='wood_table_001');assert.ok(callback);
  callback.onMap('color',{get image(){throw new Error('released room must not access the late donor image');}});
  assert.deepEqual(maps.map(v=>v.version),versions);assert.equal(late.state.wakes,wakes);
});

after(()=>{fixture.dispose();globalThis.document=previousDocument;});
