import * as THREE from 'three';
import {jiangnanBoat} from './jiangnan-state.mjs';

// The river, architecture, weather and boat all share the caller's environment
// clock. There is no independent animation or event lifetime outside the room.
export function buildJiangnanExterior({scene,pbr,resources,textures,software=false}) {
  const group=new THREE.Group();group.name='Jiangnan river and far bank';scene.add(group);
  const own=value=>{resources.add(value);return value;};
  const geometry=value=>own(value),material=value=>own(value);
  const v3=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
  const frac=n=>n-Math.floor(n),hash=n=>frac(Math.sin(n*127.1+311.7)*43758.5453123);
  function standard(color,key,options={}) {
    const result=material(new THREE.MeshStandardMaterial({color,roughness:.9,envMapIntensity:.22,...options}));
    if(key)pbr.bind(result,key,{metres:key==='wood_table_001'?.7:2.1,normal:.18,roughness:.8,tint:color,projection:'dominant'});
    return result;
  }
  const stone=standard('#53636b','rock_boulder_dry'),coping=standard('#6e7778','rock_boulder_dry');
  const plaster=[standard('#78848a','painted_plaster_wall'),standard('#68777f','painted_plaster_wall'),standard('#87908f','painted_plaster_wall')];
  const roof=standard('#17232b','rock_boulder_dry',{roughness:.74}),tileEdge=standard('#26343c',null,{roughness:.65});
  const timber=standard('#342e29','wood_table_001'),wood=standard('#493b2a','wood_table_001'),slats=standard('#62503a','wood_table_001');
  const iron=standard('#1d292d',null,{metalness:.25,roughness:.72});
  const warm=standard('#a17b45',null,{emissive:'#b28a4d',emissiveIntensity:.8,roughness:1});
  const dimWindow=standard('#3c4d54',null,{emissive:'#4b666d',emissiveIntensity:.12});
  const lanternPaper=standard('#a68a58',null,{emissive:'#e4a34e',emissiveIntensity:1.55,roughness:1});
  const boxGeometry=geometry(new THREE.BoxGeometry(1,1,1)),cylinderGeometry=geometry(new THREE.CylinderGeometry(1,1,1,8));
  const matrix=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
  const batches=new Map();
  function batch(source,mat,position,size=[1,1,1],quaternion=null) {
    let record=batches.get(mat);if(!record){record={positions:[],normals:[],uvs:[],indices:[]};batches.set(mat,record);}
    matrix.compose(v3(...position),quaternion||rotation.identity(),scale.set(...size));normalMatrix.getNormalMatrix(matrix);
    const positions=source.attributes.position,normals=source.attributes.normal,uvs=source.attributes.uv,offset=record.positions.length/3;
    const point=v3(),normal=v3();
    for(let i=0;i<positions.count;i++){
      point.fromBufferAttribute(positions,i).applyMatrix4(matrix);normal.fromBufferAttribute(normals,i).applyMatrix3(normalMatrix).normalize();
      record.positions.push(point.x,point.y,point.z);record.normals.push(normal.x,normal.y,normal.z);record.uvs.push(uvs?.getX(i)||0,uvs?.getY(i)||0);
    }
    if(source.index)for(let i=0;i<source.index.count;i++)record.indices.push(offset+source.index.getX(i));
    else for(let i=0;i<positions.count;i++)record.indices.push(offset+i);
  }
  const box=(mat,x,y,z,w,h,d)=>batch(boxGeometry,mat,[x,y,z],[w,h,d]);
  function branch(mat,a,b,radius=.025) {
    const delta=v3().subVectors(b,a),q=new THREE.Quaternion().setFromUnitVectors(v3(0,1,0),delta.clone().normalize());
    batch(cylinderGeometry,mat,a.clone().add(b).multiplyScalar(.5).toArray(),[radius,delta.length(),radius],q);
  }
  function finishBatches(parent) {
    for(const [mat,data]of batches){
      const geo=geometry(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(data.uvs,2));geo.setIndex(data.indices);geo.computeBoundingSphere();
      const mesh=new THREE.Mesh(geo,mat);mesh.receiveShadow=true;mesh.castShadow=false;parent.add(mesh);
    }
    batches.clear();
  }
  function mesh(geo,mat,x=0,y=0,z=0,parent=group) {
    const item=new THREE.Mesh(geo,mat);item.position.set(x,y,z);item.receiveShadow=true;parent.add(item);return item;
  }
  function surface(points,indices) {
    const geo=geometry(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(points.flatMap((_,i)=>i%3===0?[points[i]*.5,points[i+2]*.5]:[]),2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
  }

  // Low quays frame a canal rather than leaving an unbounded lake at the sill.
  box(stone,0,-.52,-3.7,23,.8,1.35);box(coping,0,-.09,-3.7,23,.10,1.5);
  box(stone,1,-.24,-24.6,66,1.3,7.6);box(coping,1,.43,-21,66,.12,.55);
  for(let x=-30;x<33;x+=1.35){box(stone,x,.04,-20.89,1.3,.68,.18);box(coping,x,.42,-20.75,1.3,.13,.36);}
  box(stone,-7,-.23,-7,3.3,.66,3.1);box(stone,-7,-.23,-19.5,3.2,.66,3.3);

  const houses=[
    {x:-20,z:-25,w:5.1,d:5.3,h:3.0},{x:-14,z:-25.6,w:5.7,d:5.4,h:3.5},
    {x:-7.6,z:-27,w:5.6,d:5.2,h:3.0},{x:-1,z:-24.7,w:5.1,d:5.2,h:3.45},
    {x:5.2,z:-25.8,w:5.6,d:5.1,h:3.0},{x:11.9,z:-26.5,w:5.7,d:6.1,h:3.7},
    {x:19,z:-26,w:6.4,d:5.1,h:3.25},{x:26.2,z:-27.5,w:6.0,d:5.8,h:3.8}
  ];
  function roofHeight(t,rise) {return rise*Math.pow(1-t,1.55)+.17*Math.pow(t,8);}
  houses.forEach((house,index)=>{
    const {x,z,w,d,h}=house,front=z+d/2+.015,base=.45;
    box(plaster[index%3],x,base+h/2,z,w,h,d);box(stone,x,base+.18,z,w+.12,.36,d+.14);
    for(const side of [-1,1])box(timber,x+side*(w/2-.12),base+h/2,front,.13,h,.15);
    box(timber,x,base+1.76,front,w,.12,.16);box(timber,x,base+h-.04,front,w,.13,.17);
    const windows=Math.max(2,Math.floor(w/1.5));
    for(let j=0;j<windows;j++){
      const wx=x+(j-(windows-1)/2)*1.36,lit=(index+j)%4!==1;
      box(timber,wx,base+2.35,front+.025,.91,1.05,.13);box(lit?warm:dimWindow,wx,base+2.35,front+.1,.73,.87,.018);
      box(timber,wx,base+2.35,front+.12,.045,.9,.035);box(timber,wx,base+2.35,front+.12,.76,.048,.035);
      box(timber,wx,base+.94,front+.02,.94,1.3,.13);box(dimWindow,wx,base+.95,front+.1,.74,1.08,.016);
      for(let k=-1;k<=1;k++)box(timber,wx+k*.21,base+.95,front+.12,.035,1.1,.035);
    }
    const half=w/2+.5,depth=d+.9,rise=1.35+(index%3)*.12,roofBase=base+h-.05;
    for(const side of [-1,1]){
      const points=[],indices=[],nx=software?10:18,nz=6;
      for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){
        const t=ix/nx,s=iz/nz,zz=(s-.5)*depth;
        points.push(side*t*half,roofHeight(t,rise)+.14*Math.pow(Math.abs(s-.5)*2,8),zz);
      }
      for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
        const a=iz*(nx+1)+ix,b=a+1,c=a+nx+1,e=c+1;
        if(side===1)indices.push(a,c,b,b,c,e);else indices.push(a,b,c,b,e,c);
      }
      const geo=surface(points,indices);batch(geo,roof,[x,roofBase,z]);
      // Fine cap tiles follow the curved pitch and turn up at both gable ends.
      const columns=Math.ceil(depth/(software?.43:.28));
      for(let iz=0;iz<=columns;iz++){
        const zz=-depth/2+iz/columns*depth,upturn=.14*Math.pow(Math.abs(zz/depth)*2,8);
        for(let ix=0;ix<6;ix++){
          const a=ix/6,b=(ix+1)/6;
          branch(tileEdge,v3(x+side*a*half,roofBase+roofHeight(a,rise)+upturn+.025,z+zz),v3(x+side*b*half,roofBase+roofHeight(b,rise)+upturn+.025,z+zz),.021);
        }
      }
      for(const end of [-1,1]){
        const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(side*half,0);
        for(let i=16;i>=0;i--){const t=i/16;shape.lineTo(side*t*half,roofHeight(t,rise)+.14);}
        shape.closePath();const gable=geometry(new THREE.ShapeGeometry(shape));batch(gable,plaster[index%3],[x,roofBase,z+end*(d/2+.01)],[1,1,1],end===-1?new THREE.Quaternion().setFromAxisAngle(v3(0,1,0),Math.PI):null);
      }
      branch(timber,v3(x+side*(w/2+.22),roofBase+.12,z-depth/2),v3(x+side*(w/2+.22),roofBase+.12,z+depth/2),.055);
    }
    branch(tileEdge,v3(x,roofBase+rise+.05,z-depth/2-.1),v3(x,roofBase+rise+.05,z+depth/2+.1),.09);
    if(index%2===1){
      for(const sx of [-1,1]){
        const lx=x+sx*(w/2-.35),ly=base+1.45,lz=front+.46;
        branch(timber,v3(lx,base+2.15,front),v3(lx,base+2.15,lz),.035);branch(iron,v3(lx,base+2.15,lz),v3(lx,ly+.3,lz),.013);
        batch(cylinderGeometry,lanternPaper,[lx,ly,lz],[.13,.43,.13]);
        for(const y of [ly-.23,ly+.23])batch(cylinderGeometry,iron,[lx,y,lz],[.155,.035,.155]);
      }
    }
  });

  // A continuous extruded arch leaves a real opening under the bridge.
  const bridgeTop=t=>.03+2.17*Math.sin(Math.PI*t),bridgeBottom=t=>-.64+2.25*Math.sin(Math.PI*t);
  const arch=new THREE.Shape();arch.moveTo(-6,bridgeTop(0));
  for(let i=1;i<=40;i++)arch.lineTo(-6+i/40*12,bridgeTop(i/40));
  for(let i=40;i>=0;i--)arch.lineTo(-6+i/40*12,bridgeBottom(i/40));arch.closePath();
  const archGeometry=geometry(new THREE.ExtrudeGeometry(arch,{depth:1.9,bevelEnabled:false,curveSegments:32,steps:1}));
  const archMesh=mesh(archGeometry,stone,-7-.95,0,-13);archMesh.rotation.y=Math.PI/2;archMesh.name='arched stone bridge';
  for(const side of [-1,1]){
    const x=-7+side*.88;
    for(let i=0;i<=14;i++){
      const t=i/14,z=-7-t*12,y=bridgeTop(t);
      box(coping,x,y+.43,z,.17,.86,.18);
      if(i<14){const next=(i+1)/14;for(const height of [.30,.85])branch(coping,v3(x,y+height,z),v3(x,bridgeTop(next)+height,-7-next*12),.07);}
    }
  }
  for(let i=0;i<=22;i++){
    const t=i/22,z=-7-t*12,y=bridgeBottom(t),slope=Math.cos(Math.PI*t)*.23;
    for(const side of [-1,1])branch(coping,v3(-7+side*.962,y+.025,z),v3(-7+side*.962,bridgeTop(t)-.015,z+slope),.025);
  }
  finishBatches(group);

  // Three distant terrain profiles overlap in depth. Their shapes are smooth,
  // irregular ridges; the dark silhouettes remain subordinate to the room.
  for(let layer=0;layer<3;layer++){
    const points=[],indices=[],segments=100,width=150,z=-44-layer*17;
    for(let row=0;row<2;row++)for(let i=0;i<=segments;i++){
      const x=-width/2+i/segments*width,h=10.4+layer*2.3+Math.sin(x*.115+layer*1.9)*3.1+Math.sin(x*.24+layer*.9)*1.65+Math.sin(x*.052+1.4)*3.4;
      points.push(x,row===0?h:-3,z-(row===1?10:0));
    }
    for(let i=0;i<segments;i++){const a=i,b=i+1,c=i+segments+1,d=c+1;indices.push(a,c,b,b,c,d);}
    const mat=material(new THREE.MeshBasicMaterial({color:['#182c38','#213744','#2c4250'][layer],fog:true,side:THREE.DoubleSide}));
    const ridge=mesh(surface(points,indices),mat);ridge.name='distant mountain ridge '+(layer+1);
  }

  const waterUniforms={time:{value:0},boat:{value:v3()},warmLights:{value:houses.filter((_,i)=>i%2===1).map(h=>new THREE.Vector4(h.x,h.z+h.d/2,.8,.52))}};
  const waterMaterial=material(new THREE.ShaderMaterial({uniforms:waterUniforms,side:THREE.DoubleSide,
    vertexShader:`uniform float time;varying vec3 river;
void main(){vec4 p=modelMatrix*vec4(position,1.0);p.y+=sin(p.x*1.5+p.z*2.1+time*.7)*.009+sin(p.x*3.5-p.z*2.7+time*.9)*.005;river=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`uniform float time;uniform vec3 boat;uniform vec4 warmLights[4];varying vec3 river;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec2 p=river.xz;float chop=sin(p.x*7.2+p.y*13.0+sin(p.y*3.0-time*.7))*sin(p.y*9.3-time*1.2);float soft=sin(p.x*.8+p.y*1.7+time*.32);vec3 col=mix(vec3(.012,.026,.035),vec3(.032,.053,.063),.45+soft*.15+chop*.08);
float moon=exp(-abs(p.x-5.0+soft*.75)*.32)*pow(max(0.0,chop),14.0);col+=vec3(.14,.21,.24)*moon*.52;
for(int i=0;i<4;i++){vec4 lamp=warmLights[i];float distance=max(0.0,p.y-lamp.y);float shimmer=sin(p.y*14.0+sin(p.x*8.0+time*.6)*2.0-time*.6);float strip=exp(-pow((p.x-lamp.x+soft*.22)/(lamp.w+distance*.025),2.0)*2.4);col+=vec3(.35,.21,.075)*strip*exp(-distance*.15)*smoothstep(.15,.95,shimmer)*lamp.z;}
vec2 cell=floor(p*2.7),local=fract(p*2.7)-.5;float phase=fract(time*.8+hash(cell));float ring=exp(-abs(length(local)-phase*.46)*100.0)*(1.0-phase);col+=vec3(.045,.075,.09)*ring*.3;
float trail=p.x-boat.x;float wake=exp(-abs(abs(p.y-boat.z)-(.2+max(0.0,trail)*.15))*24.0)*exp(-max(0.0,trail)*.6)*step(0.0,trail);col+=vec3(.095,.13,.15)*wake*.34;
float horizon=1.0-smoothstep(-31.0,-5.0,p.y);col=mix(col,vec3(.045,.065,.08),horizon*.3);gl_FragColor=vec4(col,1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}` }));
  const water=mesh(geometry(new THREE.PlaneGeometry(70,32,software?36:70,software?20:40)),waterMaterial,0,-.55,-14);water.rotation.x=-Math.PI/2;water.name='moving canal water';

  const mistMaterial=material(new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0}},
    vertexShader:'varying vec2 uvMist;void main(){uvMist=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform float time;varying vec2 uvMist;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}void main(){vec2 p=uvMist*vec2(8.0,2.1)+vec2(time*.009,0.0);float n=noise(p)*.65+noise(p*2.1)*.35;float edge=smoothstep(0.0,.25,uvMist.y)*(1.0-smoothstep(.55,1.0,uvMist.y))*smoothstep(0.0,.12,uvMist.x)*(1.0-smoothstep(.85,1.0,uvMist.x));gl_FragColor=vec4(.31,.40,.46,edge*n*.24);}` }));
  const mistGeometry=geometry(new THREE.PlaneGeometry(1,1));
  for(const [z,width,height,y]of [[-13,42,2.5,.5],[-24,60,4,1],[-39,82,5.5,2],[-48,100,8,9],[-66,130,11,14]]){const layer=mesh(mistGeometry,mistMaterial,0,y,z);layer.scale.set(width,height,1);layer.renderOrder=2;layer.name='drifting river mist';}

  // Every rain segment is outside the room, with a deterministic seed and a
  // world-space descent. Nearby drops read longer and brighter at the window.
  const count=software?1200:3200,rainPositions=new Float32Array(count*6),rainColors=new Float32Array(count*6);
  const drops=Array.from({length:count},(_,i)=>{
    const near=i<count*.68,x=(hash(i+17)-.5)*(near?26:66),z=near?-3.6-hash(i+971)*16:-17-hash(i+971)*21;
    const brightness=.48+hash(i+141)*.38;for(let j=0;j<2;j++)rainColors.set([brightness*.68,brightness*.84,brightness],i*6+j*3);
    return {x,z,y:hash(i+193)*14,length:.3+hash(i+481)*.4,speed:7.4+hash(i+593)*1.4};
  });
  const rainGeometry=geometry(new THREE.BufferGeometry());rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3).setUsage(THREE.DynamicDrawUsage));rainGeometry.setAttribute('color',new THREE.BufferAttribute(rainColors,3));
  const rainMaterial=material(new THREE.LineBasicMaterial({color:'#99bacb',vertexColors:true,transparent:true,opacity:.46,depthWrite:false,fog:true}));
  const rain=new THREE.LineSegments(rainGeometry,rainMaterial);rain.frustumCulled=false;rain.name='outside heavy rainfall';group.add(rain);

  const boat=new THREE.Group();boat.name='old boatman and open wooden sampan';group.add(boat);
  for(const side of [-1,1]){
    const positions=[],indices=[],stations=24;
    for(let i=0;i<=stations;i++){
      const t=i/stations,x=(t-.5)*2.85,beam=.025+.405*Math.pow(Math.sin(Math.PI*t),.62);
      for(const [width,y]of [[.12,-.165],[.78,-.075],[1,.165]])positions.push(x,y+.10*Math.pow(Math.abs(t-.5)*2,6),side*beam*width);
    }
    for(let i=0;i<stations;i++)for(let j=0;j<2;j++){const a=i*3+j,b=a+1,c=a+3,d=c+1;if(side>0)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);}
    const hullMat=standard(side>0?'#4b3b29':'#3b3327','wood_table_001',{side:THREE.DoubleSide});mesh(surface(positions,indices),hullMat,0,0,0,boat);
    const railPoints=Array.from({length:25},(_,i)=>{const t=i/24;return v3((t-.5)*2.85,.18+.10*Math.pow(Math.abs(t-.5)*2,6),side*(.025+.405*Math.pow(Math.sin(Math.PI*t),.62)));});
    mesh(geometry(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPoints),48,.026,6,false)),slats,0,0,0,boat);
  }
  for(let i=0;i<17;i++){const x=-1.16+i*.145,beam=.405*Math.pow(Math.sin(Math.PI*(x/2.85+.5)),.62);box(i%3===0?slats:wood,x,-.035,0,.137,.047,beam*1.55);}
  box(slats,-.52,.105,0,.2,.055,.68);box(slats,.7,.1,0,.17,.055,.68);finishBatches(boat);
  const cape=standard('#304448',null,{roughness:1}),trousers=standard('#263238',null),skin=standard('#71624f',null,{roughness:1}),straw=standard('#6c6248',null,{roughness:1});
  const capePoints=[new THREE.Vector2(.245,.24),new THREE.Vector2(.26,.30),new THREE.Vector2(.225,.47),new THREE.Vector2(.165,.69),new THREE.Vector2(.075,.79)];
  const capeGeometry=geometry(new THREE.LatheGeometry(capePoints,32));
  for(let i=0;i<capeGeometry.attributes.position.count;i++){
    const position=capeGeometry.attributes.position,x=position.getX(i),y=position.getY(i),z=position.getZ(i),fold=1+.025*Math.sin(Math.atan2(z,x)*11+y*8);position.setXYZ(i,x*fold*.78,y,z*fold);
  }capeGeometry.computeVertexNormals();
  const cloak=mesh(capeGeometry,cape,.62,.06,0,boat);cloak.rotation.z=-.12;
  const head=mesh(geometry(new THREE.SphereGeometry(.078,16,12)),skin,.53,.94,0,boat);head.scale.set(1,.96,.87);
  const hat=mesh(geometry(new THREE.ConeGeometry(.29,.115,40,1,false)),straw,.52,1.035,0,boat);hat.rotation.z=-.08;
  const hatRim=mesh(geometry(new THREE.TorusGeometry(.286,.010,6,40)),straw,.525,.979,0,boat);hatRim.rotation.x=Math.PI/2;hatRim.rotation.y=-.08;
  const hatLines=[];for(let i=0;i<32;i++){const angle=i/32*Math.PI*2;hatLines.push(.52,1.093,0,.525+Math.cos(angle)*.282,.98-Math.cos(angle)*.02,Math.sin(angle)*.282);}
  const hatLineGeometry=geometry(new THREE.BufferGeometry());hatLineGeometry.setAttribute('position',new THREE.Float32BufferAttribute(hatLines,3));
  const hatLineMaterial=material(new THREE.LineBasicMaterial({color:'#817354',transparent:true,opacity:.35}));const ribs=new THREE.LineSegments(hatLineGeometry,hatLineMaterial);boat.add(ribs);
  for(const side of [-1,1]){
    branch(trousers,v3(.60,.34,side*.12),v3(.34,.11,side*.14),.055);box(iron,.28,.03,side*.14,.21,.07,.09);
  }finishBatches(boat);
  const oar=new THREE.Group();oar.position.set(1.08,.29,.08);oar.name='sculling wooden oar';boat.add(oar);
  const oarStart=v3(-.95,.3,.04),oarEnd=v3(1.6,-.3,-.45);branch(slats,oarStart,oarEnd,.022);finishBatches(oar);
  const blade=mesh(geometry(new THREE.SphereGeometry(1,12,8)),wood,...oarEnd.toArray(),oar);blade.scale.set(.27,.037,.105);blade.quaternion.setFromUnitVectors(v3(1,0,0),oarEnd.clone().sub(oarStart).normalize());
  const armGeometry=geometry(new THREE.CylinderGeometry(.038,.043,1,10)),handGeometry=geometry(new THREE.SphereGeometry(.033,10,8));
  const arms=[-1,1].map(side=>({side,upper:mesh(armGeometry,cape,0,0,0,boat),fore:mesh(armGeometry,cape,0,0,0,boat),hand:mesh(handGeometry,skin,0,0,0,boat)}));
  function poseLimb(item,a,b){const d=b.clone().sub(a);item.position.copy(a).add(b).multiplyScalar(.5);item.scale.y=d.length();item.quaternion.setFromUnitVectors(v3(0,1,0),d.normalize());}
  // The single warm glow belongs to the boat's lantern, not a light rig.
  branch(wood,v3(-.91,.02,.03),v3(-.91,.61,.03),.019);branch(iron,v3(-.91,.61,.03),v3(-.78,.61,.03),.012);
  batch(cylinderGeometry,lanternPaper,[-.78,.42,.03],[.065,.19,.065]);
  for(const y of [.315,.525])batch(cylinderGeometry,iron,[-.78,y,.03],[.079,.025,.079]);finishBatches(boat);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;const context=glowCanvas.getContext('2d');
  if(context){
    const glow=context.createRadialGradient(32,32,1,32,32,32);glow.addColorStop(0,'rgba(229,170,77,.65)');glow.addColorStop(.2,'rgba(229,159,65,.2)');glow.addColorStop(1,'rgba(229,159,65,0)');context.fillStyle=glow;context.fillRect(0,0,64,64);
    const texture=new THREE.CanvasTexture(glowCanvas);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);
    const glowMaterial=material(new THREE.SpriteMaterial({map:texture,color:'#c9954d',transparent:true,opacity:.38,depthWrite:false,blending:THREE.AdditiveBlending}));
    const glowSprite=new THREE.Sprite(glowMaterial);glowSprite.position.set(-.78,.42,.03);glowSprite.scale.set(.75,.75,1);boat.add(glowSprite);
  }

  function update(time) {
    const seconds=Number.isFinite(time)?Math.max(0,time):0,pose=jiangnanBoat(seconds);
    boat.position.set(pose.x,pose.y,pose.z);boat.rotation.z=pose.roll;
    oar.rotation.y=pose.stroke*.95;oar.rotation.z=pose.stroke*.22;
    for(const arm of arms){
      const hand=v3(arm.side<0?-.73:-.49,.24,arm.side<0?.035:.0).applyEuler(oar.rotation).add(oar.position),shoulder=v3(.60,.77,arm.side*.14),elbow=shoulder.clone().lerp(hand,.55);elbow.y-=.075;elbow.z+=arm.side*.035;
      poseLimb(arm.upper,shoulder,elbow);poseLimb(arm.fore,elbow,hand);arm.hand.position.copy(hand);
    }
    waterUniforms.time.value=seconds;waterUniforms.boat.value.copy(boat.position);mistMaterial.uniforms.time.value=seconds;
    for(let i=0;i<count;i++){
      const drop=drops[i],y=frac((drop.y-seconds*drop.speed)/14)*14-.5,wind=Math.sin(seconds*.09)*.055,x=drop.x+Math.sin(seconds*.23+drop.z)*.08;
      rainPositions.set([x,y,drop.z,x+.065+wind,y+drop.length,drop.z+.025],i*6);
    }
    rainGeometry.attributes.position.needsUpdate=true;
  }
  update(0);
  return {group,boat,update};
}
