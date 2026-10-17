import * as THREE from 'three';
import {field,groundLevel,shoreZ,shoreGridZ,localRandom} from './world-landscape.mjs';

export function groundBlend(x,z,theme){
  if(theme==='rain')return .08;
  if(theme==='coast'||theme==='lake'){const inland=Math.max(0,Math.min(1,(z-shoreZ(x,theme)-2)/5));return inland*(.45+field(x*.18,z*.18,42)*.25);}
  const trail=Math.abs(x-Math.sin(z*.19)*.7),offPath=Math.max(0,Math.min(1,(trail-.7)/1.7));return Math.max(0,Math.min(1,(.65+field(x*.24,z*.24,91)*.7)*offPath));
}

export function createForestGround({theme,parent,pbr,owner}){
  const geometry=new THREE.PlaneGeometry(160,106,128,88);geometry.rotateX(-Math.PI/2);const p=geometry.attributes.position,blend=new Float32Array(p.count),colors=new Float32Array(p.count*3),tint=new THREE.Color();
  const coastal=theme==='lake'||theme==='coast';for(let i=0;i<p.count;i++){const x=p.getX(i),z=coastal?shoreGridZ(x,Math.floor(i/129),88,theme):p.getZ(i)-47;p.setXYZ(i,x,groundLevel(x,z,theme),z);blend[i]=groundBlend(x,z,theme);tint.setScalar(.90+field(x*.085,z*.085,8)*.08);tint.toArray(colors,i*3);}geometry.setAttribute('cafeBlend',new THREE.BufferAttribute(blend,1));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();owner.add(geometry);
  const shore=theme==='lake'||theme==='coast',material=pbr.ground(new THREE.MeshStandardMaterial({color:'#a5a18b',vertexColors:true,roughness:1,envMapIntensity:.3}),shore?'brown_mud_rocks_01':'forest_leaves_04','aerial_grass_rock',{metres:2.8,normal:.36,roughness:.88,tint:theme==='rain'?'#81908a':'#ffffff'});owner.add(material);const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.castShadow=false;parent.add(mesh);return mesh;
}

export function createCafeWaterGeometry({width,depth,x,z,theme}){
  const pond=width<10,geometry=new THREE.PlaneGeometry(width,depth,pond?48:128,pond?32:64);geometry.rotateX(-Math.PI/2);const p=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<p.count;i++){let xx=p.getX(i),zz=p.getZ(i);if(pond){const u=xx/(width/2),v=zz/(depth/2);xx=(width/2)*u*Math.sqrt(1-v*v*.5);zz=(depth/2)*v*Math.sqrt(1-u*u*.5);}else{const t=(zz+depth/2)/depth;zz=-depth/2+(1-Math.pow(1-t,1.4))*(shoreZ(xx+x,theme)-z+depth/2);}p.setXYZ(i,xx,0,zz);uv.setXY(i,(xx+x)/2.7,(zz+z)/2.7);}return geometry;
}

export function addGroundTufts({theme,parent,owner}){
  if(theme==='rain')return null;const random=localRandom(1259),positions=[];
  for(let i=0;i<1100;i++){const x=-17+random()*34,z=-11.5-random()*24;if(Math.abs(x+.4)<1.2||groundBlend(x,z,theme)<.42||field(x*.24,z*.24,77)<-.05)continue;if((theme==='zen'||theme==='garden')&&Math.hypot((x-3.6)/2.6,(z+13.5)/2.2)<1.15)continue;if((theme==='lake'||theme==='coast')&&z-shoreZ(x,theme)<4)continue;positions.push([x,groundLevel(x,z,theme)-.035,z,.65+random()*.6,random()*Math.PI*2]);}
  const vertices=[];for(let i=0;i<5;i++){const angle=i*2.399963,h=.14+(i%3)*.035,w=.009+(i%2)*.004,c=Math.cos(angle),s=Math.sin(angle),x=c*.025,z=s*.025;vertices.push(x-s*w,0,z+c*w,x+s*w,0,z-c*w,x+c*.05,h,z+s*.05);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();const material=new THREE.MeshLambertMaterial({color:'#ffffff',side:THREE.DoubleSide}),tufts=new THREE.InstancedMesh(geometry,material,positions.length),dummy=new THREE.Object3D(),color=new THREE.Color();owner.add(geometry);owner.add(material);
  positions.forEach(([x,y,z,scale,angle],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,angle,0);dummy.scale.setScalar(scale);dummy.updateMatrix();tufts.setMatrixAt(i,dummy.matrix);tufts.setColorAt(i,color.set(i%3?'#6d7850':'#92916a'));});tufts.receiveShadow=true;tufts.castShadow=false;parent.add(tufts);return tufts;
}

// Moss grows against a few shaded stone/wood bases, never uniformly scattered
// across the whole garden. Each thin mound is embedded in its lowest support.
export function groundMossPlans(bases,theme){
  const random=localRandom(718),result=[];
  for(const [index,base] of bases.slice(0,14).entries())for(let side=0;side<2;side++){
    const angle=1.7+random()*1.8,radius=base.size*(.25+random()*.35),x=base.x+Math.cos(angle)*radius,z=base.z+Math.sin(angle)*radius,width=.22+random()*.36,depth=.18+random()*.32,height=.023+random()*.012;
    let support=groundLevel(x,z,theme);for(let a=0;a<8;a++){const r=a*Math.PI/4;support=Math.min(support,groundLevel(x+Math.cos(r)*width*1.17,z+Math.sin(r)*depth*1.17,theme));}
    result.push({position:[x,support-height*.35,z],rotation:[0,index*2.399963+side,0],scale:[width,height,depth]});
  }return result;
}
