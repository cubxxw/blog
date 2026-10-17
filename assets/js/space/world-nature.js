import * as THREE from 'three';
import {localRandom,rockPoint,mossPoint,ridgeGrid,pineCrownPlan,field} from './world-landscape.mjs';

export function createCafeRockGeometry(variant){
  const source=new THREE.IcosahedronGeometry(1,6),p=source.attributes.position,vertices=[],indices=[],shared=new Map();
  for(let i=0;i<p.count;i++){const point=rockPoint(p.getX(i),p.getY(i),p.getZ(i),variant),key=point.map(v=>Math.round(v*1e6)).join(':');if(!shared.has(key)){shared.set(key,vertices.length/3);vertices.push(...point);}indices.push(shared.get(key));}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();source.dispose();return geometry;
}

export function createWorldNature({resources,textures,pbr}){
  const geo=g=>{resources.add(g);return g;},mat=m=>{resources.add(m);return m;};
  const rockMaterial=pbr.bind(mat(new THREE.MeshStandardMaterial({color:'#91917f',roughness:1,envMapIntensity:.2})),'rock_boulder_dry',{metres:1.4,normal:.5,roughness:.72,projection:'triplanar'});
  const rocks=Array.from({length:4},(_,variant)=>geo(createCafeRockGeometry(variant)));
  const moss=Array.from({length:4},(_,variant)=>{const g=geo(new THREE.SphereGeometry(1,16,10)),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,...mossPoint(p.getX(i),p.getY(i),p.getZ(i),variant));g.computeVertexNormals();return g;});
  const branchGeo=geo(new THREE.CylinderGeometry(.5,1,1,8)),shape=new THREE.Shape(),outline=[[45,222],[22,200],[7,135],[4,8],[105,8],[121,65],[114,164],[88,222]];
  outline.forEach(([x,y],i)=>shape[i?'lineTo':'moveTo']((x-75)/214*.8,(222-y)/214*.8));shape.closePath();const twigGeo=geo(new THREE.ShapeGeometry(shape)),frondGeo=geo(new THREE.PlaneGeometry(1,1,3,12));
  // Stay inside the atlas's black-backed upper-left twig island. The unused
  // atlas areas have WHITE alpha, so a rectangular crop would create white fans.
  const uv=twigGeo.attributes.uv,position=twigGeo.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(position.getX(i)/.8*214+75)/512,1-(222-position.getY(i)/.8*214)/512);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const context=canvas.getContext('2d');context.fillStyle='#000000';context.fillRect(0,0,512,512);context.strokeStyle='#ffffff';context.lineWidth=2;context.beginPath();context.moveTo(75,225);context.lineTo(75,16);context.stroke();for(let i=0;i<34;i++){const y=28+i*5.4,spread=18+Math.sin(i/34*Math.PI)*35;context.beginPath();context.moveTo(75,y+21);context.lineTo(75-spread,y-7);context.moveTo(75,y+21);context.lineTo(75+spread,y-7);context.stroke();}const fallback=new THREE.CanvasTexture(canvas);textures.add(fallback);
  const fp=frondGeo.attributes.position;for(let i=0;i<fp.count;i++){const t=fp.getY(i)+.5;fp.setXYZ(i,fp.getX(i)*Math.sin(t*Math.PI),t,-.32*t*t);}frondGeo.computeVertexNormals();
  const bark=mat(new THREE.MeshStandardMaterial({color:'#423429',roughness:1,envMapIntensity:.1})),needle=mat(new THREE.MeshStandardMaterial({color:'#657750',alphaMap:fallback,alphaTest:.32,alphaToCoverage:true,roughness:.86,side:THREE.DoubleSide,envMapIntensity:.85})),depth=mat(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,alphaMap:fallback,alphaTest:.32,side:THREE.DoubleSide})),distance=mat(new THREE.MeshDistanceMaterial({alphaMap:fallback,alphaTest:.32,side:THREE.DoubleSide})),palm=mat(new THREE.MeshStandardMaterial({color:'#49644a',roughness:.74,side:THREE.DoubleSide,envMapIntensity:.18})),dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
  needle.userData.photoTint=new THREE.Color().setRGB(1.8,2.15,1.55);
  needle.onBeforeCompile=shader=>{const chunk=THREE.ShaderChunk.lights_physical_pars_fragment.replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );','vec3 twigTransmission = directLight.color * (0.28 * saturate(-dot(geometryNormal,directLight.direction)) + 0.08);\nreflectedLight.directDiffuse += (irradiance + twigTransmission) * BRDF_Lambert(material.diffuseColor);');shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_pars_fragment>',chunk);};needle.customProgramCacheKey=()=> 'cafe-thin-twig-transmission-r160-v1';
  pbr.foliage(needle,'pine-twig',[depth,distance]);
  function branch(a,b,radius,parent){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),mesh=new THREE.Mesh(branchGeo,bark);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.scale.set(radius,start.distanceTo(end),radius);mesh.quaternion.setFromUnitVectors(up,end.sub(start).normalize());mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function rock(x,z,size,parent,rotation=[0,0,0]){const variant=Math.abs(Math.round(x*31+z*17))%4,mesh=new THREE.Mesh(rocks[variant],rockMaterial);mesh.position.set(x,-.10+size*.28,z);mesh.scale.setScalar(size);mesh.rotation.set(...rotation);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function pine(x,z,height,parent,support=0){
    const root=new THREE.Group();root.position.y=support;parent.add(root);parent=root;const plan=pineCrownPlan(x,z,height),needles=new THREE.InstancedMesh(twigGeo,needle,plan.cards.length);branch([x,0,z],[x+.08,height,z],height*.02,parent);
    for(const limb of plan.branches){branch(limb.start,limb.elbow,limb.radius,parent);branch(limb.elbow,limb.end,limb.radius*.52,parent);}
    for(const [index,card] of plan.cards.entries()){dummy.position.fromArray(card.position);dummy.quaternion.setFromUnitVectors(up,new THREE.Vector3(...card.direction).normalize());dummy.rotateY(card.roll);dummy.scale.setScalar(card.scale);dummy.updateMatrix();needles.setMatrixAt(index,dummy.matrix);}
    needles.customDepthMaterial=depth;needles.customDistanceMaterial=distance;needles.castShadow=needles.receiveShadow=true;parent.add(needles);
  }
  function coastTree(x,z,parent,support=0){
    const root=new THREE.Group();root.position.y=support;parent.add(root);parent=root;const random=localRandom(x<0?318:127);branch([x,0,z],[x+.45,2.8,z+.14],.14,parent);branch([x+.45,2.8,z+.14],[x+1,5.9,z],.10,parent);
    for(let i=0;i<9;i++){
      const angle=i*Math.PI*2/9,origin=new THREE.Vector3(x+1,5.9,z),direction=new THREE.Vector3(Math.cos(angle)*2.2,-.55-random()*.35,Math.sin(angle)*2.2),end=origin.clone().add(direction);branch(origin.toArray(),end.toArray(),.025,parent);
      for(let side of [-1,1])for(let j=0;j<9;j++){const t=.12+j*.095,base=origin.clone().addScaledVector(direction,t),leaf=new THREE.Mesh(frondGeo,palm),out=new THREE.Vector3(-Math.sin(angle)*side,-.35,Math.cos(angle)*side);leaf.position.copy(base);leaf.quaternion.setFromUnitVectors(up,out.normalize());leaf.scale.set(.20,.85*(1-t*.65),.85);leaf.castShadow=false;leaf.receiveShadow=true;parent.add(leaf);}
    }
  }
  function ridge(plan,color,parent,owner){
    const data=ridgeGrid(plan),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(data.positions,3));g.setAttribute('uv',new THREE.BufferAttribute(data.uv,2));g.setIndex(new THREE.BufferAttribute(data.indices,1));g.computeVertexNormals();owner.add(g);
    const colors=new Float32Array(data.positions.length),p=g.attributes.position,n=g.attributes.normal,shade=new THREE.Color(),forest=new THREE.Color('#536046'),rock=new THREE.Color('#a09a84'),high=new THREE.Color('#b3b0a0');for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),slope=1-Math.abs(n.getY(i)),exposed=Math.min(1,Math.max(0,(slope-.10)*2.5+field(x*.12,z*.12,12)*.24));shade.copy(forest).lerp(rock,exposed).lerp(high,Math.max(0,(p.getY(i)-19)/30)*.35);shade.multiplyScalar(.91+field(x*.41,z*.33,4)*.09);shade.toArray(colors,i*3);}g.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const material=pbr.bind(new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:1,envMapIntensity:.22}),'rock_boulder_dry',{metres:6,normal:.20,roughness:.92,projection:'xz'}),metric=material.onBeforeCompile;
    material.onBeforeCompile=shader=>{metric(shader);shader.uniforms.cafeRidgeHaze={value:new THREE.Color('#aebec8')};shader.fragmentShader='uniform vec3 cafeRidgeHaze;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','#ifdef USE_FOG\nfloat ridgeHaze=1.0-exp(-max(0.0,vFogDepth-30.0)*0.012);\ngl_FragColor.rgb=mix(gl_FragColor.rgb,cafeRidgeHaze,ridgeHaze);\n#endif');};material.customProgramCacheKey=()=> 'cafe-distance-ridge-xz-r160-v1';const mesh=new THREE.Mesh(g,material);owner.add(material);mesh.receiveShadow=true;mesh.castShadow=false;parent.add(mesh);return mesh;
  }
  return {rock,pine,coastTree,ridge,mossGeometry:index=>moss[index%4]};
}
