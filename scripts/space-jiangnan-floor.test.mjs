import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import * as THREE from '../assets/js/vendor/three.module.min.js';

// Use the real room, PBR registry, meshes, UVs, raycaster and disposal. Only the
// browser's canvas/image transport is replaced by an in-memory data surface.
function canvas(){
  const surface={width:0,height:0};let pixels;
  const context=new Proxy({
    createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4),width:w,height:h};},
    getImageData(x,y,w,h){return pixels||this.createImageData(w,h);},
    putImageData(value){pixels=value;},
    createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}
  },{get:(target,key)=>key in target?target[key]:()=>{}});
  surface.getContext=()=>context;return surface;
}
async function loadModule(file){
  const {build}=createRequire(import.meta.url)('esbuild');
  const result=await build({entryPoints:[new URL('../assets/js/space/'+file,import.meta.url).pathname],bundle:true,write:false,format:'cjs',platform:'node',external:['three']});
  const module={exports:{}};
  new Function('require','module','exports',result.outputFiles[0].text)(name=>{assert.equal(name,'three');return THREE;},module,module.exports);
  return module.exports;
}
const [{buildJiangnanRoom},{createWorldMaterials}]=await Promise.all([loadModule('jiangnan-room.js'),loadModule('world-materials.js')]);
globalThis.document={createElement:canvas};
const pending=[],originalLoad=THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load=function(url,onLoad){pending.push({url,onLoad});return new THREE.Texture();};
const resources=new Set(),textures=new Set(),root={dataset:{}};let disposed=false;
const pbr=createWorldMaterials({base:'/images/space/cafe/materials-v1/',renderer:{capabilities:{getMaxAnisotropy:()=>8},shadowMap:{}},resources,textures,root,isDisposed:()=>disposed,wake(){}});
const room=buildJiangnanRoom({scene:new THREE.Scene(),pbr,resources,textures,wake(){},isDisposed:()=>disposed});
room.group.updateMatrixWorld(true);
const floorMeshes=[];
room.group.traverse(object=>{
  if(!object.isMesh)return;
  const bounds=new THREE.Box3().setFromObject(object);
  if(bounds.min.y<-.03&&bounds.max.y>.005&&bounds.max.y<.01&&bounds.max.x-bounds.min.x>6.3&&bounds.max.z-bounds.min.z>4.5)floorMeshes.push(object);
});
const floor=floorMeshes[0];
const down=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,.02,z),new THREE.Vector3(0,-1,0),0,.08).intersectObject(floor)[0];

test('the long-board field owns its real 2 mm seams and keeps uninterrupted board tops',()=>{
  assert.equal(floorMeshes.length,1,'only one visible structural floor');
  for(let boundary=1;boundary<26;boundary++){
    const x=-3.2+boundary*(6.4/26);
    for(const z of [-2.15,-1.1,.11,1.5])assert.ok(!down(x,z),`floor seam at ${x},${z} must be a real empty gap`);
  }
  for(let row=0;row<26;row++)for(const z of [-2.5,-1.72,-.3,.85,1.9]){
    const hit=down(-3.2+(row+.5)*(6.4/26),z);
    assert.ok(hit&&Math.abs(hit.point.y-.0055)<.0000001,'long board has a cross seam or lost its support height');
  }
  const overlays=[];
  room.group.traverse(object=>{
    if(!object.isMesh||object===floor)return;
    const b=new THREE.Box3().setFromObject(object);
    if(b.min.y>=0&&b.max.y<.01&&b.max.x-b.min.x>6)overlays.push(object);
  });
  assert.equal(overlays.length,0,'no applied dark line or second joint layer may own a floor seam');
});

test('board faces share finite explicit UVs within individual grain strips at a consistent physical scale',()=>{
  const g=floor.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,index=g.index;
  let minUvArea=Infinity;
  for(let i=0;i<index.count;i+=3){
    const [a,b,c]=[index.getX(i),index.getX(i+1),index.getX(i+2)];
    const area=Math.abs((uv.getX(b)-uv.getX(a))*(uv.getY(c)-uv.getY(a))-(uv.getX(c)-uv.getX(a))*(uv.getY(b)-uv.getY(a)));
    minUvArea=Math.min(minUvArea,area);
  }
  assert.ok(minUvArea>1e-7,'normal-map derivatives need non-degenerate UVs on top and sides');
  const tops=new Map();
  for(let i=0;i<p.count;i++)if(n.getY(i)>.9){
    const row=Math.floor((p.getX(i)+3.2)/(6.4/26));
    if(!tops.has(row))tops.set(row,[]);tops.get(row).push(i);
  }
  assert.equal(tops.size,26,'every physical board needs its own explicit top UVs');
  for(const indices of tops.values()){
    const us=indices.map(i=>uv.getX(i)),vs=indices.map(i=>uv.getY(i)),xs=indices.map(i=>p.getX(i)),zs=indices.map(i=>p.getZ(i));
    const minU=Math.min(...us),maxU=Math.max(...us),patch=Math.floor(minU*8);
    assert.equal(Math.floor(maxU*8),patch,'one board cannot cross an atlas strip edge');
    assert.ok(Math.abs(minU*8-patch-.02)<1e-6&&Math.abs(maxU*8-patch-.98)<1e-6,'keep a sample gutter on both atlas edges');
    assert.ok(Math.abs(Math.max(...xs)-Math.min(...xs)-.24415384615384617)<1e-6);
    const period=(Math.max(...zs)-Math.min(...zs))/(Math.max(...vs)-Math.min(...vs));
    assert.ok(period>1.50&&period<2.36,'wood fibres must retain their crop aspect ratio rather than stretch over the full 4.6 m board');
  }
});

test('the room replaces all three old floor channels without increasing its twelve PBR requests',()=>{
  const mapRequests=pending.filter(request=>/materials-v1\//.test(request.url));
  assert.equal(mapRequests.length,12);
  const floorRequests=mapRequests.filter(request=>/\/wood_floor/.test(request.url));
  assert.deepEqual(floorRequests.map(request=>request.url.split('/').pop()).sort(),[
    'wood_floor_grain-color.jpg','wood_floor_grain-normal.jpg','wood_floor_grain-roughness.jpg'
  ]);
  for(const channel of ['color','normal'])floorRequests.find(request=>request.url.endsWith('-'+channel+'.jpg')).onLoad(new THREE.Texture());
  assert.ok(floor.material.map?.isTexture&&floor.material.normalMap?.isTexture);
  assert.equal(floor.material.map.colorSpace,THREE.SRGBColorSpace);
  assert.equal(floor.material.normalMap.colorSpace,THREE.NoColorSpace);
  assert.deepEqual(floor.material.normalScale.toArray(),[.16,.16]);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  floor.material.onBeforeCompile(shader);
  assert.equal(shader.vertexShader,THREE.ShaderLib.standard.vertexShader,'world projection must not override the board UV used by any PBR channel');
  assert.ok(shader.fragmentShader.includes('roughnessFactor=max(roughnessFactor,0.72);'),'retain the effective roughness floor');
  assert.equal(floor.material.color.getHexString(),'c1b398');
});

test('floor construction retains one material and geometry, bounded triangles and no prototype audit graph',()=>{
  assert.ok(resources.has(floor.geometry)&&resources.has(floor.material));
  assert.equal(floor.geometry.index.count/3*(floor.isInstancedMesh?floor.count:1),312);
  assert.equal(floor.geometry.attributes.position.count,624);
  assert.equal(floor.geometry.groups.length,0,'one material draw for all board faces');
  assert.equal(floor.castShadow,false);assert.equal(floor.receiveShadow,true);
  assert.equal(room.group.userData.floorAudit,undefined);
  const bounds=new THREE.Box3().setFromObject(floor);
  assert.ok(Math.abs(bounds.max.y-.0055)<1e-7&&Math.abs(bounds.min.y+.0395)<1e-7);
  assert.equal(bounds.max.y,Math.fround(.0055),'the merged support plane must retain the exact previous float height used by closed feet');
});

test('the derived JPEG channels retain source hashes, aligned crop provenance and their original CC0 source',async()=>{
  const base=new URL('../static/images/space/cafe/materials-v1/',import.meta.url),path=new URL('wood_floor_grain-provenance.json',base);
  assert.ok(existsSync(path),'derived maps need portable source and alignment provenance');
  const provenance=JSON.parse(await readFile(path,'utf8'));
  assert.equal(provenance.sourcePage,'https://polyhaven.com/a/wood_floor');
  assert.equal(provenance.license,'CC0');
  assert.equal(provenance.recipe.overlap,.125);assert.equal(provenance.recipe.crops1024.length,8);
  const historical=JSON.parse(await readFile(new URL('../docs/design/cafe-lived-world-2026-10-16/material-assets.json',import.meta.url),'utf8'));
  for(const entry of provenance.channels){
    const original=historical.assets.find(record=>record.asset.endsWith('/wood_floor-'+entry.channel+'.jpg'));
    const source=await readFile(new URL(entry.sourceFile,base)),derived=await readFile(new URL(entry.file,base));
    assert.equal(createHash('sha256').update(source).digest('hex'),original.sha256,'do not overwrite the original source map');
    assert.equal(entry.sourceSha256,original.sha256);
    assert.equal(createHash('sha256').update(derived).digest('hex'),entry.sha256);
    assert.equal(derived.readUInt16BE(0),0xffd8,'ship the JPEG used in native captures');
    assert.equal(entry.width,entry.channel==='color'?1024:512);assert.equal(entry.height,entry.width);
    assert.deepEqual(entry.normalizedCrops,provenance.recipe.crops1024.map(([x,y,w,h])=>[x/1024,y/1024,w/1024,h/1024]),'all channel crops must address the same photographed fibres');
  }
});

test('floor geometry, material and loaded maps dispose, and a late roughness channel never revives the room',()=>{
  let geometryReleased=0,materialReleased=0,textureReleased=0;
  floor.geometry.addEventListener('dispose',()=>geometryReleased++);floor.material.addEventListener('dispose',()=>materialReleased++);
  for(const texture of textures)texture.addEventListener('dispose',()=>textureReleased++);
  const loaded=textures.size;disposed=true;pbr.dispose();
  for(const resource of resources)resource.dispose?.();for(const texture of textures)texture.dispose();
  assert.equal(geometryReleased,1);assert.equal(materialReleased,1);assert.equal(textureReleased,loaded);
  const late=new THREE.Texture();let lateReleased=0;late.addEventListener('dispose',()=>lateReleased++);
  pending.find(request=>/wood_floor.*-roughness.jpg$/.test(request.url)).onLoad(late);
  assert.equal(lateReleased,1);assert.equal(textures.has(late),false);assert.equal(floor.material.roughnessMap,null);
  THREE.TextureLoader.prototype.load=originalLoad;
});
