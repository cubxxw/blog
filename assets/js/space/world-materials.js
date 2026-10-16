import * as THREE from 'three';
import { RGBELoader } from '../vendor/RGBELoader.js';

// The same photographic maps serve the whole room. World-metre UVs include
// instance transforms, so a thin chair leg does not stretch a table-sized tile.
export function metricProjection(material,{metres=1,normal=.25,roughness=.55,projection='dominant'}={}){
  material.normalScale.setScalar(normal);
  material.onBeforeCompile=shader=>{
    shader.uniforms.cafeTile={value:metres};shader.uniforms.cafeRoughnessFloor={value:roughness};
    shader.vertexShader='uniform float cafeTile;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
      vec4 cafePosition=vec4(position,1.0); vec3 cafeNormal=normal;
      #ifdef USE_INSTANCING
        cafePosition=instanceMatrix*cafePosition; cafeNormal=mat3(instanceMatrix)*cafeNormal;
      #endif
      cafePosition=modelMatrix*cafePosition; cafeNormal=abs(normalize(mat3(modelMatrix)*cafeNormal));
      vec2 cafeUv=${projection==='xz'?'cafePosition.xz':'(cafeNormal.y>=cafeNormal.x&&cafeNormal.y>=cafeNormal.z)?cafePosition.xz:((cafeNormal.x>=cafeNormal.z)?cafePosition.zy:cafePosition.xy)'};
      cafeUv/=cafeTile;
      #ifdef USE_MAP
        vMapUv=(mapTransform*vec3(cafeUv,1.0)).xy;
      #endif
      #ifdef USE_NORMALMAP
        vNormalMapUv=(normalMapTransform*vec3(cafeUv,1.0)).xy;
      #endif
      #ifdef USE_ROUGHNESSMAP
        vRoughnessMapUv=(roughnessMapTransform*vec3(cafeUv,1.0)).xy;
      #endif`);
    shader.fragmentShader='uniform float cafeRoughnessFloor;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=max(roughnessFactor,cafeRoughnessFloor);');
  };
  material.customProgramCacheKey=()=> 'cafe-metric-pbr-r160-v2-'+projection;
}

// A rock crosses projection axes within a single smooth face. Blend samples in
// fragment space, never interpolate a vertex's discrete choice of UV axis.
export function rockProjection(material,options={}){
  metricProjection(material,{...options,projection:'xz'});const metric=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{
    metric(shader);shader.vertexShader='varying vec3 vCafeRockPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCafeRockPosition=cafePosition.xyz;');
    shader.fragmentShader=`varying vec3 vCafeRockPosition;
uniform float cafeTile;
#ifdef USE_MAP
uniform mat3 mapTransform;
#endif
#ifdef USE_ROUGHNESSMAP
uniform mat3 roughnessMapTransform;
#endif
#ifdef USE_NORMALMAP
uniform mat3 normalMapTransform;
#endif
vec4 cafeTriSample(sampler2D source,mat3 transform,vec2 x,vec2 y,vec2 z,vec3 weights){return texture2D(source,(transform*vec3(x,1.0)).xy)*weights.x+texture2D(source,(transform*vec3(y,1.0)).xy)*weights.y+texture2D(source,(transform*vec3(z,1.0)).xy)*weights.z;}
`+shader.fragmentShader;
    const coordinates=`vec3 cafeRockN=normalize(inverseTransformDirection(normalize(vNormal),viewMatrix));
vec3 cafeRockSigns=step(vec3(0.0),cafeRockN)*2.0-1.0;
vec3 cafeRockWeights=pow(abs(cafeRockN),vec3(4.0));cafeRockWeights/=max(dot(cafeRockWeights,vec3(1.0)),0.00001);
vec2 cafeRockX=vec2(-vCafeRockPosition.z*cafeRockSigns.x,vCafeRockPosition.y)/cafeTile;
vec2 cafeRockY=vec2(vCafeRockPosition.x,-vCafeRockPosition.z*cafeRockSigns.y)/cafeTile;
vec2 cafeRockZ=vec2(vCafeRockPosition.x*cafeRockSigns.z,vCafeRockPosition.y)/cafeTile;
`;
    const color=THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','cafeTriSample(map,mapTransform,cafeRockX,cafeRockY,cafeRockZ,cafeRockWeights)'),roughness=THREE.ShaderChunk.roughnessmap_fragment.replace('texture2D( roughnessMap, vRoughnessMapUv )','cafeTriSample(roughnessMap,roughnessMapTransform,cafeRockX,cafeRockY,cafeRockZ,cafeRockWeights)');
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',coordinates+color).replace('#include <roughnessmap_fragment>',roughness);
    // Each tangent frame is right-handed on its positive AND negative side.
    // Blend tangent perturbations, then remove their geometric-normal component.
    // A flat (0,0,1) map produces zero perturbation and retains the smooth normal.
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#ifdef USE_NORMALMAP
vec3 cafeNX=texture2D(normalMap,(normalMapTransform*vec3(cafeRockX,1.0)).xy).xyz*2.0-1.0;
vec3 cafeNY=texture2D(normalMap,(normalMapTransform*vec3(cafeRockY,1.0)).xy).xyz*2.0-1.0;
vec3 cafeNZ=texture2D(normalMap,(normalMapTransform*vec3(cafeRockZ,1.0)).xy).xyz*2.0-1.0;
vec2 cafeSX=cafeNX.xy*normalScale/max(cafeNX.z,0.2),cafeSY=cafeNY.xy*normalScale/max(cafeNY.z,0.2),cafeSZ=cafeNZ.xy*normalScale/max(cafeNZ.z,0.2);
vec3 cafeRockGradient=vec3(0.0,cafeSX.y,-cafeRockSigns.x*cafeSX.x)*cafeRockWeights.x+vec3(cafeSY.x,0.0,-cafeRockSigns.y*cafeSY.y)*cafeRockWeights.y+vec3(cafeRockSigns.z*cafeSZ.x,cafeSZ.y,0.0)*cafeRockWeights.z;
cafeRockGradient-=cafeRockN*dot(cafeRockN,cafeRockGradient);
normal=normalize(mat3(viewMatrix)*normalize(cafeRockN+cafeRockGradient));
#endif`);
  };material.customProgramCacheKey=()=> 'cafe-rock-triplanar-r160-v1';
}

export function createWorldMaterials({base,renderer,resources,textures,isDisposed,wake,root}){
  const targets=new Map(),maps=new Map(),loading=new Set();let loaded=0,dead=false,skyTheme='zen',skyMesh;
  const gone=()=>dead||isDisposed();
  function apply(record,channel,map){
    if(record.material.userData.cafeDisposed)return;
    const material=record.material;material[channel==='color'?'map':channel==='normal'?'normalMap':'roughnessMap']=map;
    if(channel==='color')material.color.set(record.tint);if(channel==='normal')material.bumpMap=null;material.needsUpdate=true;record.onMap?.(channel,map);
  }
  function bind(material,key,options={}){
    if(!base)return material;(options.projection==='triplanar'?rockProjection:metricProjection)(material,options);const record={material,key,tint:options.tint||'#ffffff',onMap:options.onMap};if(!targets.has(key))targets.set(key,new Set());targets.get(key).add(record);
    for(const channel of ['color','normal','roughness']){
      const id=key+':'+channel;if(maps.has(id)){apply(record,channel,maps.get(id));continue;}if(loading.has(id))continue;loading.add(id);
      new THREE.TextureLoader().load(base+key+'-'+channel+'.jpg',map=>{
        if(gone()){map.dispose();return;}map.colorSpace=channel==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.add(map);maps.set(id,map);
        for(const target of targets.get(key)||[])apply(target,channel,map);root.dataset.worldPbrMaps=String(++loaded);renderer.shadowMap.needsUpdate=true;wake();
      },undefined,()=>{});
    }return material;
  }
  function detach(material){const second=material.userData.cafeGroundSecond;if(second){detach(second);second.dispose();resources.delete(second);delete material.userData.cafeGroundSecond;}material.userData.cafeDisposed=true;for(const records of targets.values())for(const record of records)if(record.material===material)records.delete(record);}
  function ground(material,soilKey,grassKey,options={}){
    options={...options,projection:'xz'};
    const uniforms={cafeGroundColor:{value:null},cafeGroundNormal:{value:null},cafeGroundRoughness:{value:null},cafeGroundReady:{value:0}};
    const second=new THREE.MeshStandardMaterial();resources.add(second);material.userData.cafeGroundSecond=second;
    bind(second,grassKey,{...options,onMap(channel,map){uniforms[channel==='color'?'cafeGroundColor':channel==='normal'?'cafeGroundNormal':'cafeGroundRoughness'].value=map;uniforms.cafeGroundReady.value=Number(Boolean(second.map&&second.normalMap&&second.roughnessMap));}});
    bind(material,soilKey,options);const metric=material.onBeforeCompile;
    material.onBeforeCompile=shader=>{
      metric(shader);Object.assign(shader.uniforms,uniforms);
      shader.vertexShader='attribute float cafeBlend; varying float vCafeBlend;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCafeBlend=cafeBlend;');
      shader.fragmentShader='varying float vCafeBlend; uniform sampler2D cafeGroundColor; uniform sampler2D cafeGroundNormal; uniform sampler2D cafeGroundRoughness; uniform float cafeGroundReady;\n'+shader.fragmentShader;
      const mapChunk=THREE.ShaderChunk.map_fragment.replace('vec4 sampledDiffuseColor = texture2D( map, vMapUv );','vec4 sampledDiffuseColor = mix(texture2D(map,vMapUv), texture2D(cafeGroundColor,vMapUv*.71),vCafeBlend*cafeGroundReady);');
      const roughnessChunk=THREE.ShaderChunk.roughnessmap_fragment.replace('vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );','vec4 texelRoughness = mix(texture2D(roughnessMap,vRoughnessMapUv),texture2D(cafeGroundRoughness,vRoughnessMapUv*.71),vCafeBlend*cafeGroundReady);');
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',mapChunk).replace('#include <roughnessmap_fragment>',roughnessChunk);
      // Keep the built-in derivative-based tangent frame, blending the two
      // photographed tangent normals before r160 transforms them into view space.
      const normalChunk=THREE.ShaderChunk.normal_fragment_maps.replaceAll('texture2D( normalMap, vNormalMapUv ).xyz','mix(texture2D(normalMap,vNormalMapUv).xyz,texture2D(cafeGroundNormal,vNormalMapUv*.71).xyz,vCafeBlend*cafeGroundReady)');
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',normalChunk);
    };material.customProgramCacheKey=()=> 'cafe-metric-ground-blend-r160-xz-v2';return material;
  }
  // One shared atlas pair. Alpha is data; the photographic colour is sRGB.
  // Commit the pair together so partially loaded atlas channels cannot show a rectangle.
  const foliageTargets=new Map(),foliageMaps=new Map();
  function foliage(material,key,shadowMaterials=[]){
    if(!base)return material;
    const record={material,shadowMaterials};if(!foliageTargets.has(key)){
      foliageTargets.set(key,new Set());const pair={};foliageMaps.set(key,pair);
      for(const channel of ['color','alpha'])new THREE.TextureLoader().load(base+key+'-'+channel+'.jpg',map=>{
        if(gone()){map.dispose();return;}map.colorSpace=channel==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.add(map);pair[channel]=map;
        if(pair.color&&pair.alpha){for(const target of foliageTargets.get(key)||[])applyFoliage(target,pair);renderer.shadowMap.needsUpdate=true;wake();}
      },undefined,()=>{});
    }foliageTargets.get(key).add(record);const pair=foliageMaps.get(key);if(pair?.color&&pair.alpha)applyFoliage(record,pair);return material;
  }
  function applyFoliage(record,pair){if(record.material.userData.cafeDisposed)return;record.material.map=pair.color;record.material.alphaMap=pair.alpha;record.material.userData.photoTint?record.material.color.copy(record.material.userData.photoTint):record.material.color.set('#ffffff');record.material.needsUpdate=true;for(const shadow of record.shadowMaterials){shadow.alphaMap=pair.alpha;shadow.needsUpdate=true;}}
  const skies=new Map(),skyNames={zen:'forest_grove',garden:'forest_grove',mountain:'drakensberg_solitary_mountain',lake:'shudu_lake',coast:'secluded_beach'};let sceneSky,background,backgroundLoading=false;
  function syncSky(){
    if(gone()||!skyMesh)return;const record=skies.get(skyNames[skyTheme]),daylight=skyTheme!=='rain';sceneSky.background=daylight?background||null:null;sceneSky.environment=daylight?record?.environment||null:null;skyMesh.visible=!sceneSky.background;sceneSky.backgroundIntensity=.8;sceneSky.backgroundBlurriness=.025;root.dataset.worldSky=sceneSky.background?'pure-sky-hdr':'gradient';
  }
  function loadBackground(){
    if(!base||backgroundLoading||skyTheme==='rain')return;backgroundLoading=true;
    new RGBELoader().load(base+'overcast-sky-1k.hdr',map=>{if(gone()){map.dispose();return;}map.mapping=THREE.EquirectangularReflectionMapping;textures.add(map);background=map;syncSky();wake();},undefined,()=>{if(!gone())syncSky();});
  }
  function loadSky(){
    loadBackground();const name=skyNames[skyTheme];if(!base||!name||skies.has(name))return;const record={};skies.set(name,record);
    // These panoramas contain nearby land and trees. They are light/reflection
    // sources only, never a giant photographed wall behind navigable 3D terrain.
    new RGBELoader().load(base+name+'-1k.hdr',map=>{
      if(gone()){map.dispose();return;}map.mapping=THREE.EquirectangularReflectionMapping;textures.add(map);
      let generator;try{generator=new THREE.PMREMGenerator(renderer);const target=generator.fromEquirectangular(map);if(gone()){target.dispose();return;}resources.add(target);record.environment=target.texture;}catch{/* Keep the independent sky/gradient if reflection generation fails. */}finally{generator?.dispose();}syncSky();wake();
    },undefined,()=>{if(!gone())syncSky();});
  }
  function sky(scene,mesh,theme=skyTheme){skyTheme=theme;sceneSky=scene;skyMesh=mesh;loadSky();syncSky();}
  return {bind,ground,detach,foliage,sky,setTheme(id){skyTheme=id;if(sceneSky){loadSky();syncSky();}},get outdoorEnvironment(){return skies.get(skyNames[skyTheme])?.environment||null;},dispose(){dead=true;targets.clear();maps.clear();loading.clear();foliageTargets.clear();foliageMaps.clear();skies.clear();}};
}
