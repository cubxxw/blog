import * as THREE from 'three';
import {jiangnanBoat} from './jiangnan-state.mjs';
import {JIANGNAN_VISTA_WATER_GLSL} from './jiangnan-vista-coverage.mjs';

// Ridge heights measured on the neutral plate (bottom-left texture UVs). The
// sun can disappear behind the mountains instead of shining through blue mist.
const RIDGE=[[.30,.79431],[.32,.82277],[.34,.84347],[.36,.84088],[.38,.79043],[.40,.81113],[.42,.84864],[.44,.86158],[.46,.87193],[.48,.83829],[.50,.82018],[.52,.80078],[.54,.82794],[.56,.84088],[.58,.83829],[.60,.82924],[.62,.72574],[.64,.75809],[.66,.77878],[.68,.80207],[.70,.81501],[.72,.81759],[.74,.96119]];
const RIDGE_GLSL=`float mcRidge(float u){float h=${RIDGE[0][1]};${RIDGE.slice(1).map(([u,h],i)=>`h=mix(h,${h},clamp((u-${RIDGE[i][0]})/${(u-RIDGE[i][0]).toFixed(5)},0.,1.));`).join('')}return h;}`;
const SOLAR_GLSL=`
uniform vec3 sunDirection;
uniform float sunStrength,sunRadius,golden,sunset,dawn,effectTime,lightning,rainfall;
float mcHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float mcNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mcHash(i),mcHash(i+vec2(1.,0.)),f.x),mix(mcHash(i+vec2(0.,1.)),mcHash(i+vec2(1.)),f.x),f.y);}
float mcCloud(vec2 uv){vec2 p=uv*vec2(11.,5.8)+vec2(effectTime*.016,effectTime*.0022);float n=mcNoise(p)*.55+mcNoise(p*2.05+vec2(effectTime*.005,-effectTime*.001))*.28+mcNoise(p*4.1)*.17;return smoothstep(.39,.69,n);}
float mcSkyMask(vec3 photo,vec2 uv){return smoothstep(.64,.88,uv.y)*smoothstep(.24,.55,photo.b)*smoothstep(-.04,.04,photo.b-photo.g);}
${RIDGE_GLSL}
vec3 mcEnvironment(vec3 dayPhoto,vec3 nightPhoto,vec3 direction,vec2 uv,float daylight,float skyMask){
 float cloud=mcCloud(uv),horizon=exp(-pow((uv.y-.80)/.22,2.));
 vec3 blue=vec3(.20,.39,.65),amber=vec3(.78,.28,.095),rose=vec3(.60,.34,.39);
 vec3 sky=mix(blue,amber,horizon*sunset*.91);sky=mix(sky,rose,horizon*dawn*.58);
 vec3 cloudLight=mix(vec3(.72,.78,.82),vec3(1.0,.54,.28),sunset*.74);cloudLight=mix(cloudLight,vec3(.88,.64,.53),dawn*.38);
 sky=mix(sky,cloudLight,cloud*(.50+rainfall*.20));
 vec3 lit=dayPhoto*mix(vec3(1.),vec3(1.15,.74,.48),golden*.64);
 lit=mix(lit,sky,skyMask*.84);
 vec3 storm=mix(vec3(.014,.024,.047),vec3(.055,.071,.11),cloud);
 vec3 night=mix(nightPhoto,storm,skyMask*.72)+skyMask*lightning*vec3(.12,.17,.25);
 vec3 color=mix(night,lit,daylight);
 float alignment=dot(normalize(direction),sunDirection),disk=smoothstep(cos(sunRadius*1.12),cos(sunRadius*.86),alignment);
 float halo=exp(-(1.-alignment)/max(.000001,sunRadius*sunRadius*9.));
 vec3 sunColor=mix(vec3(1.65,1.35,.83),vec3(1.7,.49,.11),golden*.87);
 float ridge=mcRidge(uv.x),clear=smoothstep(ridge-.002,ridge+.002,uv.y);
 color+=skyMask*clear*sunStrength*(disk*sunColor*(1.-cloud*.45)+halo*sunColor*.12);
 return color;
}`;
// Only the measured, pure-water band moves. The bridge, trees and banks stay
// registered; small travelling waves refract their reflection instead of
// sliding the complete photograph like a flat wallpaper.
const WATER_PHOTO_GLSL=`
float mcLakeMask(vec2 uv){return 1.-smoothstep(.29,.35,uv.y);}
vec2 mcLakeUV(vec2 uv){float water=mcLakeMask(uv),near=1.-smoothstep(.04,.36,uv.y);vec2 wave=vec2(
 sin(uv.y*146.-effectTime*.83+sin(uv.x*24.+effectTime*.19))*.0011+sin(uv.y*79.+effectTime*.43)*.0008,
 sin(uv.x*56.+uv.y*108.-effectTime*.68)*.00065);
 return uv+wave*water*(.3+near*.7);}
float mcLakeGlint(vec2 uv){float crest=sin(uv.y*310.-effectTime*1.12+sin(uv.x*61.+effectTime*.24)*2.1);return pow(max(0.,crest),10.)*mcLakeMask(uv)*(.012+.018*(1.-smoothstep(.05,.36,uv.y)));}
`;

// The river, architecture, weather and boat all share the caller's environment
// clock. There is no independent animation or event lifetime outside the room.
export function buildJiangnanExterior({scene,pbr,resources,textures,software=false,vistaAsset,dayVistaAsset=null,continuationAsset=null,vistaMode='geometry',boatSeed=(Math.random()*4294967296)>>>0,wake=()=>{},isDisposed=()=>false}) {
  const group=new THREE.Group();group.name='Jiangnan river and far bank';scene.add(group);
  const photographic=Boolean(vistaAsset&&vistaMode==='image');
  let actualVista=photographic?'loading':'geometry',photographicMaterial=null,photographicDome=null;
  const own=value=>{resources.add(value);return value;};
  const geometry=value=>own(value),material=value=>own(value);
  const v3=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
  const solarUniforms={sunDirection:{value:v3(0,.5,-.8).normalize()},sunStrength:{value:0},sunRadius:{value:.012},golden:{value:0},sunset:{value:0},dawn:{value:0},effectTime:{value:0},lightning:{value:0},rainfall:{value:1}};
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
  const warm=standard('#b98a50',null,{emissive:'#e0a15b',emissiveIntensity:1.35,roughness:1});
  const dimWindow=standard('#3c4d54',null,{emissive:'#4b666d',emissiveIntensity:.12});
  const lanternPaper=standard('#a68a58',null,{emissive:'#e4a34e',emissiveIntensity:1.55,roughness:1});
  const boxGeometry=geometry(new THREE.BoxGeometry(1,1,1)),cylinderGeometry=geometry(new THREE.CylinderGeometry(1,1,1,8));
  const matrix=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
  const batches=new Map(),riverLights=[];let houseFrame=null;
  function batch(source,mat,position,size=[1,1,1],quaternion=null) {
    let record=batches.get(mat);if(!record){record={positions:[],normals:[],uvs:[],indices:[]};batches.set(mat,record);}
    let p=v3(...position),q=quaternion||rotation.identity();
    if(houseFrame){p.sub(houseFrame.center).applyQuaternion(houseFrame.rotation).add(houseFrame.center);q=houseFrame.rotation.clone().multiply(q);}
    matrix.compose(p,q,scale.set(...size));normalMatrix.getNormalMatrix(matrix);
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

  const skyMaterial=material(new THREE.ShaderMaterial({depthWrite:false,uniforms:{time:{value:0},daylight:{value:0},...solarUniforms},
    vertexShader:'varying vec2 skyUv;varying vec3 skyDirection;void main(){skyUv=uv;skyDirection=(modelMatrix*vec4(position,1.)).xyz-vec3(0.,1.3,0.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform float daylight;varying vec2 skyUv;varying vec3 skyDirection;${SOLAR_GLSL}
void main(){vec3 d=normalize(skyDirection);vec2 uv=vec2(.5+atan(d.x,-d.z)/1.95,.38+asin(d.y)/.82);gl_FragColor=vec4(mcEnvironment(vec3(.3,.5,.7),vec3(.02,.03,.05),d,uv,daylight,1.),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}` }));
  const cloudySky=mesh(geometry(new THREE.PlaneGeometry(220,60)),skyMaterial,0,17,-110);cloudySky.name='layered rain clouds';cloudySky.castShadow=cloudySky.receiveShadow=false;

  // The banks lead into depth. A straight wall across the window made the
  // earlier village read like a stage backdrop and hid the canal's direction.
  function quay(points){
    for(let i=0;i<points.length-1;i++){
      const a=v3(points[i][0],-.25,points[i][1]),b=v3(points[i+1][0],-.25,points[i+1][1]),length=a.distanceTo(b),mid=a.clone().add(b).multiplyScalar(.5),q=new THREE.Quaternion().setFromAxisAngle(v3(0,1,0),-Math.atan2(b.z-a.z,b.x-a.x));
      batch(boxGeometry,stone,mid.toArray(),[length+.07,.68,.44],q);
      batch(boxGeometry,coping,[mid.x,.12,mid.z],[length+.08,.10,.52],q);
      for(let n=0;n<Math.ceil(length/.62);n++){
        const p=a.clone().lerp(b,(n+.5)/Math.ceil(length/.62));
        batch(boxGeometry,coping,[p.x,.0,p.z],[.012,.29,.46],q);
      }
    }
  }
  quay([[5.4,-5.2],[5.6,-10],[6.2,-17],[5.9,-24],[4.3,-32],[1.5,-39]]);
  quay([[-10,-9],[-9.2,-16],[-9,-23],[-8.3,-30],[-5.9,-37],[-2.3,-41]]);

  const houses=[
    {x:8.4,z:-11.5,w:3.15,d:3.8,h:3.2,yaw:-.54},
    {x:9.1,z:-17.2,w:3.60,d:4.2,h:3.7,yaw:-.40},
    {x:9.0,z:-23.6,w:3.25,d:4.4,h:3.05,yaw:-.31},
    {x:7.8,z:-30.0,w:3.55,d:4.4,h:3.45,yaw:-.23},
    {x:-12,z:-18.5,w:4.1,d:4.2,h:2.8,yaw:.40},
    {x:-11.5,z:-25.2,w:4.5,d:4.6,h:3.3,yaw:.30},
    {x:-9.3,z:-32.4,w:4.0,d:4.6,h:3.1,yaw:.19},
    {x:.0,z:-40.2,w:4.6,d:4.4,h:3.5,yaw:.02}
  ];
  function roofHeight(t,rise) {return rise*Math.pow(1-t,1.55)+.17*Math.pow(t,8);}
  houses.forEach((house,index)=>{
    const {x,z,w,d,h}=house,front=z+d/2+.015,base=.45;
    houseFrame={center:v3(x,0,z),rotation:new THREE.Quaternion().setFromAxisAngle(v3(0,1,0),house.yaw)};
    box(plaster[index%3],x,base+h/2,z,w,h,d);box(stone,x,base+.18,z,w+.12,.36,d+.14);
    for(const side of [-1,1])box(timber,x+side*(w/2-.12),base+h/2,front,.13,h,.15);
    box(timber,x,base+1.76,front,w,.12,.16);box(timber,x,base+h-.04,front,w,.13,.17);
    const windows=Math.max(2,Math.floor(w/1.5));
    for(let j=0;j<windows;j++){
      const wx=x+(j-(windows-1)/2)*1.36,lit=hash(index*9+j+5)>.23;
      box(timber,wx,base+2.35,front+.025,.91,1.05,.13);box(lit?warm:dimWindow,wx,base+2.35,front+.1,.73,.87,.018);
      box(timber,wx,base+2.35,front+.12,.045,.9,.035);box(timber,wx,base+2.35,front+.12,.76,.048,.035);
      box(timber,wx,base+.94,front+.02,.94,1.3,.13);box(index%3===0&&j===0?warm:dimWindow,wx,base+.95,front+.1,.74,1.08,.016);
      for(let k=-1;k<=1;k++)box(timber,wx+k*.21,base+.95,front+.12,.035,1.1,.035);
      if((index+j)%3===1)for(const sx of [-1,1]){
        box(timber,wx+sx*.43,base+2.35,front+.18,.13,.91,.055);
        for(let n=0;n<6;n++)box(wood,wx+sx*.43,base+1.99+n*.13,front+.215,.12,.065,.022);
      }
    }
    // Ground-floor eaves, a shallow gallery and uneven stone steps give the
    // foreground houses a human scale before the roof silhouettes recede.
    box(roof,x,base+1.79,front+.29,w+.29,.085,.66);
    box(timber,x,base+1.70,front+.57,w+.30,.065,.05);
    if(index<4){
      box(wood,x,base+.04,front+.40,w+.15,.12,.85);
      for(const side of [-1,1])box(timber,x+side*(w/2-.17),base+.90,front+.54,.065,1.77,.065);
      for(let n=0;n<3;n++)box(coping,x+w*.25,base-.10-n*.12,front+.69+n*.15,.64,.14,.32);
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
    if(index<4||index===5){
      for(const sx of [-1,1]){
        const lx=x+sx*(w/2-.35),ly=base+1.45,lz=front+.46;
        branch(timber,v3(lx,base+2.15,front),v3(lx,base+2.15,lz),.035);branch(iron,v3(lx,base+2.15,lz),v3(lx,ly+.3,lz),.013);
        batch(cylinderGeometry,lanternPaper,[lx,ly,lz],[.13,.43,.13]);
        for(const y of [ly-.23,ly+.23])batch(cylinderGeometry,iron,[lx,y,lz],[.155,.035,.155]);
        const light=v3(lx,ly,lz).sub(houseFrame.center).applyQuaternion(houseFrame.rotation).add(houseFrame.center);riverLights.push(new THREE.Vector4(light.x,light.z,1.15,.22));
      }
    }
    houseFrame=null;
  });

  // A willow grows beyond the bay's right edge. Its irregular hanging sprays
  // frame the rain instead of repeating another row of architectural modules.
  const willow=standard('#263b31',null,{side:THREE.DoubleSide,roughness:1});
  const leafShape=new THREE.Shape();leafShape.moveTo(0,-.5);leafShape.quadraticCurveTo(.16,-.02,0,.5);leafShape.quadraticCurveTo(-.12,.04,0,-.5);
  const willowLeaf=geometry(new THREE.ShapeGeometry(leafShape,4));
  branch(timber,v3(4.7,.0,-5.4),v3(4.4,4.2,-5.2),.10);
  branch(timber,v3(4.4,3.4,-5.2),v3(.8,3.55,-5.0),.035);
  for(let i=0;i<11;i++){
    const x=.95+i*.36,top=3.45+Math.sin(i*.8)*.19,length=1.12+hash(i+401)*1.3;
    const mid=v3(x+.12,top-length*.52,-4.94),end=v3(x-.03,top-length,-4.88);
    branch(timber,v3(x,top,-5),mid,.006);branch(timber,mid,end,.004);
    for(let n=0;n<13;n++){
      const t=(n+.6)/13,y=top-t*length,side=n%2===0?1:-1;
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(.12*Math.sin(n),0,side*(.3+hash(i*19+n)*.5)));
      batch(willowLeaf,willow,[x+side*.045+Math.sin(t*Math.PI)*.08,y,-4.9],[.23,.20+hash(n+i*11)*.12,1],q);
    }
  }

  // A continuous extruded arch leaves a real opening under the bridge.
  const bridgeTop=t=>.08+1.82*Math.sin(Math.PI*t),bridgeBottom=t=>-.65+2.02*Math.sin(Math.PI*t),bridgeX=-3.2,bridgeZ=-17.8,span=9.0;
  const arch=new THREE.Shape();arch.moveTo(-span/2,bridgeTop(0));
  for(let i=1;i<=40;i++)arch.lineTo(-span/2+i/40*span,bridgeTop(i/40));
  for(let i=40;i>=0;i--)arch.lineTo(-span/2+i/40*span,bridgeBottom(i/40));arch.closePath();
  const archGeometry=geometry(new THREE.ExtrudeGeometry(arch,{depth:1.35,bevelEnabled:false,curveSegments:32,steps:1}));
  const archMesh=mesh(archGeometry,stone,bridgeX,0,bridgeZ-.675);archMesh.name='arched stone bridge';
  for(const side of [-1,1]){
    const z=bridgeZ+side*.63;
    for(let i=0;i<=14;i++){
      const t=i/14,x=bridgeX-span/2+t*span,y=bridgeTop(t);
      box(coping,x,y+.32,z,.13,.64,.14);
      if(i<14){const next=(i+1)/14;for(const height of [.23,.64])branch(coping,v3(x,y+height,z),v3(bridgeX-span/2+next*span,bridgeTop(next)+height,z),.048);}
    }
  }
  for(let i=0;i<=22;i++){
    const t=i/22,x=bridgeX-span/2+t*span,y=bridgeBottom(t),slope=Math.cos(Math.PI*t)*.17;
    for(const side of [-1,1])branch(coping,v3(x,y+.025,bridgeZ+side*.687),v3(x+slope,bridgeTop(t)-.015,bridgeZ+side*.687),.020);
  }
  for(const x of [bridgeX-span/2,bridgeX+span/2])box(stone,x,-.28,bridgeZ,1.1,.64,1.75);
  for(const x of [bridgeX-2.1,bridgeX+2.1]){
    branch(iron,v3(x,1.75,bridgeZ+.66),v3(x,2.25,bridgeZ+.66),.025);
    batch(cylinderGeometry,lanternPaper,[x,2.15,bridgeZ+.67],[.10,.25,.10]);
    for(const y of [2.01,2.29])batch(cylinderGeometry,iron,[x,y,bridgeZ+.67],[.12,.025,.12]);
    riverLights.push(new THREE.Vector4(x,bridgeZ+.67,.86,.20));
  }
  finishBatches(group);

  // Three distant terrain profiles overlap in depth. Their shapes are smooth,
  // irregular ridges; the dark silhouettes remain subordinate to the room.
  for(let layer=0;layer<3;layer++){
    const points=[],indices=[],segments=100,width=150,z=-55-layer*20;
    for(let row=0;row<2;row++)for(let i=0;i<=segments;i++){
      const x=-width/2+i/segments*width,h=8.0+layer*2.1+Math.sin(x*.115+layer*1.9)*2.7+Math.sin(x*.24+layer*.9)*1.25+Math.sin(x*.052+1.4)*2.9;
      points.push(x,row===0?h:-3,z-(row===1?10:0));
    }
    for(let i=0;i<segments;i++){const a=i,b=i+1,c=i+segments+1,d=c+1;indices.push(a,c,b,b,c,d);}
    const mat=material(new THREE.MeshBasicMaterial({color:['#223c4a','#2b4552','#3a515e'][layer],fog:true,side:THREE.DoubleSide}));
    const ridge=mesh(surface(points,indices),mat);ridge.name='distant mountain ridge '+(layer+1);
  }

  const architecture=[...group.children];
  const waterUniforms={time:{value:0},boat:{value:v3()},boatDirection:{value:new THREE.Vector2(-1,0)},boatSpeed:{value:0},warmLights:{value:riverLights},imageBlend:{value:0},daylight:{value:0},rainfall:solarUniforms.rainfall,sunDirection:solarUniforms.sunDirection,golden:solarUniforms.golden,reflectionStrength:{value:0}};
  const waterMaterial=material(new THREE.ShaderMaterial({uniforms:waterUniforms,side:THREE.DoubleSide,transparent:photographic,depthWrite:!photographic,
    vertexShader:`uniform float time;varying vec3 river;
void main(){vec4 p=modelMatrix*vec4(position,1.0);p.y+=sin(p.x*1.5+p.z*2.1+time*.7)*.018+sin(p.x*3.5-p.z*2.7+time*.9)*.009;river=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`uniform float time;uniform vec3 boat;uniform vec2 boatDirection;uniform float boatSpeed;uniform vec4 warmLights[12];uniform float imageBlend;uniform float daylight;uniform float rainfall;uniform vec3 sunDirection;uniform float golden;uniform float reflectionStrength;varying vec3 river;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec2 p=river.xz;float chop=sin(p.x*7.2+p.y*13.0+sin(p.y*3.0-time*.7))*sin(p.y*9.3-time*1.2);float soft=sin(p.x*.8+p.y*1.7+time*.32);vec3 col=mix(vec3(.019,.039,.052),vec3(.044,.081,.105),.45+soft*.15+chop*.08);
float moon=exp(-abs(p.x-5.0+soft*.75)*.32)*pow(max(0.0,chop),14.0);col+=vec3(.17,.25,.31)*moon*.65;
for(int i=0;i<12;i++){vec4 lamp=warmLights[i];float distance=max(0.0,p.y-lamp.y);float along=clamp((cameraPosition.z-p.y)/max(.1,cameraPosition.z-lamp.y),0.0,1.0);float center=mix(cameraPosition.x,lamp.x,along);float jitter=hash(floor(vec2(p.x*8.0,p.y*15.0)));float shimmer=sin(p.y*22.0+sin(p.x*9.0+time*.6)*2.8+jitter*2.3-time*.6);float strip=exp(-pow((p.x-center+soft*.12)/(lamp.w*.7+distance*.015),2.0)*1.7);col+=vec3(.74,.34,.085)*strip*exp(-distance*.105)*smoothstep(.20,.95,shimmer)*lamp.z;}
vec2 cell=floor(p*2.7),local=fract(p*2.7)-.5;float phase=fract(time*.8+hash(cell));float ring=exp(-abs(length(local)-phase*.46)*100.0)*(1.0-phase);col+=vec3(.045,.075,.09)*ring*.65*rainfall;
vec2 relative=p-boat.xz;float trail=-dot(relative,boatDirection),across=dot(relative,vec2(-boatDirection.y,boatDirection.x));float wake=exp(-abs(abs(across)-(.2+max(0.0,trail)*.16))*20.0)*exp(-max(0.0,trail)*.5)*step(0.0,trail);col+=vec3(.095,.13,.15)*wake*min(1.,boatSpeed*12.);
float horizon=1.0-smoothstep(-31.0,-5.0,p.y);col=mix(col,vec3(.045,.065,.08),horizon*.3);col=mix(col,vec3(.12,.28,.29)+chop*.024,daylight);
float distance=max(.1,cameraPosition.z-p.y),sunCenter=cameraPosition.x+sunDirection.x/max(.15,-sunDirection.z)*distance;
float width=(.35+distance*.025)*(1.+sunDirection.y*1.2),strip=exp(-pow((p.x-sunCenter+soft*.12)/width,2.)*1.6);
float jitter=hash(floor(p*vec2(19.,28.)));
float glitter=smoothstep(.16,.91,(sin(p.y*39.+sin(p.x*15.+time*.55)*2.5+jitter*3.-time*.9)*sin(p.x*43.+p.y*7.+jitter*2.-time*.31))*.5+.5);
float sparkle=strip*glitter*reflectionStrength;
col=mix(col,col*vec3(.96,.62,.38),strip*golden*.72);
col+=mix(vec3(.82,.83,.65),vec3(1.05,.29,.025),golden*.94)*sparkle*.7;
gl_FragColor=vec4(col,max(mix(1.0,.22,imageBlend),min(.82,sparkle*.44)));
#include <tonemapping_fragment>
#include <colorspace_fragment>
}` }));
  const water=mesh(geometry(new THREE.PlaneGeometry(70,44,software?36:70,software?24:48)),waterMaterial,0,-.55,-20);water.rotation.x=-Math.PI/2;water.name='moving canal water';

  if(photographic){
    const waterExtension=!software&&typeof continuationAsset==='string'&&Boolean(continuationAsset.trim());
    // A far spherical matte is an explicit alternative to the geometric town.
    // It has no rectangular edges when approaching the window. The actual room,
    // rain, glass, water motion and boat retain their original 3D depth.
    const vistaMaterial=material(new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,toneMapped:false,uniforms:{vista:{value:null},dayVista:{value:null},dayReady:{value:0},daylight:{value:0},continuation:{value:null},continuationReady:{value:0},...solarUniforms},
      vertexShader:'varying vec3 vistaDirection;void main(){vistaDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`uniform sampler2D vista;uniform sampler2D dayVista;uniform float dayReady;uniform float daylight;${waterExtension?'uniform sampler2D continuation;uniform float continuationReady;':''}varying vec3 vistaDirection;
${waterExtension?JIANGNAN_VISTA_WATER_GLSL:''}
${SOLAR_GLSL}
${WATER_PHOTO_GLSL}
void main(){vec3 d=normalize(vistaDirection);float u=.5+(atan(d.x,-d.z)-.03)/1.95;float v=.38+asin(clamp(d.y,-1.0,1.0))/.82;vec2 lakeUV=mcLakeUV(vec2(u,v));gl_FragColor=texture2D(vista,clamp(lakeUV,vec2(.001),vec2(.999)));${waterExtension?'if(continuationReady>.5){vec3 water=jiangnanVistaWaterContinuation(lakeUV);if(water.z>0.)gl_FragColor=mix(gl_FragColor,texture2D(continuation,water.xy),water.z);}':''}gl_FragColor.rgb*=.78;if(dayReady>.5){
 // Reflect the pure-water band across its matching edge. Compressing a tiny
 // bottom strip stretched every wave into vertical streaks when looking down.
 vec2 dayUV=clamp(vec2(lakeUV.x,abs(lakeUV.y)),vec2(.001),vec2(.999));vec3 base=texture2D(dayVista,dayUV).rgb;gl_FragColor.rgb=mcEnvironment(base*.90,gl_FragColor.rgb,d,vec2(u,v),daylight,mcSkyMask(base,vec2(u,v)));}gl_FragColor.rgb+=mcLakeGlint(vec2(u,v))*mix(vec3(.26,.38,.48),vec3(.48,.64,.65),daylight);
#include <colorspace_fragment>
}` }));
    const vista=mesh(geometry(new THREE.SphereGeometry(120,80,40)),vistaMaterial,0,1.3,0);vista.visible=false;vista.castShadow=vista.receiveShadow=false;vista.renderOrder=-10;vista.name='photographic environment study';
    photographicMaterial=vistaMaterial;photographicDome=vista;
    new THREE.TextureLoader().load(vistaAsset,texture=>{
      if(isDisposed()){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;textures.add(texture);vistaMaterial.uniforms.vista.value=texture;
      for(const item of architecture)item.visible=false;vista.visible=true;waterUniforms.imageBlend.value=1;actualVista='image';wake();
    },undefined,()=>{if(!isDisposed()){actualVista='geometry-fallback';wake();}});
    if(dayVistaAsset){
      const owner={texture:null,transferred:false,released:false,disposed:false};
      const release=()=>{if(owner.texture&&!owner.released){owner.texture.dispose();owner.released=true;}};
      const lease=own({dispose(){owner.disposed=true;if(!owner.transferred)release();}});
      const pending=new THREE.TextureLoader().load(dayVistaAsset,texture=>{
        owner.texture=texture;if(isDisposed()||owner.disposed){release();return;}
        owner.transferred=true;resources.delete(lease);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;textures.add(texture);
        vistaMaterial.uniforms.dayVista.value=texture;vistaMaterial.uniforms.dayReady.value=1;wake();
      },undefined,()=>{owner.disposed=true;release();if(!isDisposed()){resources.delete(lease);wake();}});
      owner.texture ||= pending;if(owner.disposed&&!owner.transferred)release();
    }
    // Optional water extension never owns first-paint or primary fallback.
    if(waterExtension){
      const owner={texture:null,transferred:false,disposed:false,released:false};
      const release=()=>{if(owner.texture&&!owner.released){owner.texture.dispose();owner.released=true;}};
      const lease=own({dispose(){owner.disposed=true;if(!owner.transferred)release();}});
      const pending=new THREE.TextureLoader().load(continuationAsset.trim(),texture=>{
        owner.texture=texture;if(isDisposed()||owner.disposed){release();return;}
        owner.transferred=true;resources.delete(lease);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;textures.add(texture);
        vistaMaterial.uniforms.continuation.value=texture;vistaMaterial.uniforms.continuationReady.value=1;wake();
      },undefined,()=>{owner.disposed=true;release();if(!isDisposed()){resources.delete(lease);vistaMaterial.uniforms.continuationReady.value=0;wake();}});
      owner.texture ||= pending;if(owner.disposed&&!owner.transferred)release();
    }
  }

  const mistMaterial=material(new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0}},
    vertexShader:'varying vec2 uvMist;void main(){uvMist=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform float time;varying vec2 uvMist;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}void main(){vec2 p=uvMist*vec2(8.0,2.1)+vec2(time*.009,0.0);float n=noise(p)*.58+noise(p*2.1)*.28+noise(p*4.3)*.14;float edge=smoothstep(0.0,.25,uvMist.y)*(1.0-smoothstep(.55,1.0,uvMist.y))*smoothstep(0.0,.12,uvMist.x)*(1.0-smoothstep(.85,1.0,uvMist.x));gl_FragColor=vec4(.34,.45,.53,edge*n*.34);}` }));
  const mistGeometry=geometry(new THREE.PlaneGeometry(1,1));
  for(const [z,width,height,y]of [[-21,38,2.5,.65],[-32,54,3.2,1.05],[-44,72,4.3,2],[-58,100,6.2,5.3],[-76,130,9,9.2]]){const layer=mesh(mistGeometry,mistMaterial,0,y,z);layer.scale.set(width,height,1);layer.renderOrder=2;layer.name='drifting river mist';}

  // Every rain segment is outside the room, with a deterministic seed and a
  // world-space descent. Nearby drops read longer and brighter at the window.
  const count=software?1800:5200,rainPositions=new Float32Array(count*6),rainColors=new Float32Array(count*6);
  const drops=Array.from({length:count},(_,i)=>{
    const near=i<count*.68,x=(hash(i+17)-.5)*(near?26:66),z=near?-3.6-hash(i+971)*16:-17-hash(i+971)*21;
    const brightness=.48+hash(i+141)*.38;for(let j=0;j<2;j++)rainColors.set([brightness*.68,brightness*.84,brightness],i*6+j*3);
    return {x,z,y:hash(i+193)*14,length:.075+hash(i+481)*.17,speed:7.4+hash(i+593)*1.4};
  });
  const rainGeometry=geometry(new THREE.BufferGeometry());rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3).setUsage(THREE.DynamicDrawUsage));rainGeometry.setAttribute('color',new THREE.BufferAttribute(rainColors,3));
  const rainMaterial=material(new THREE.LineBasicMaterial({color:'#99bacb',vertexColors:true,transparent:true,opacity:.34,depthWrite:false,fog:true}));
  const rain=new THREE.LineSegments(rainGeometry,rainMaterial);rain.frustumCulled=false;rain.name='outside heavy rainfall';group.add(rain);

  // Small beads cling to the actual bay glass. Thin runnels catch cool sky and
  // warm lamplight while leaving the river and its depth visible behind them.
  const glassRain=material(new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0},rainfall:{value:1},focus:{value:0}},
    vertexShader:'varying vec2 glassUv;void main(){glassUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform float time;uniform float rainfall;uniform float focus;varying vec2 glassUv;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec2 g=glassUv*vec2(57.0,22.0),cell=floor(g),p=fract(g)-.5;float seed=h(cell);
 p-=vec2((seed-.5)*.54,(h(cell+7.0)-.5)*.45);
 float size=.045+seed*.075;vec2 bead=p/vec2(size,size*(1.2+seed*.8));float d=length(bead);
 float softness=focus*.12;
 float rim=(smoothstep(.54-softness,.82,d)-smoothstep(.82,1.05+softness,d))*step(.30,seed);
 float glint=pow(max(0.0,1.0-length(bead-vec2(-.27,.35))*1.65),mix(4.,2.8,focus))*step(.30,seed);
 float shadow=pow(max(0.0,1.0-length(bead-vec2(.25,-.25))*1.3),3.0)*step(.30,seed);
 float column=floor(glassUv.x*71.0),random=h(vec2(column,3.0));
 float x=fract(glassUv.x*71.0)-(.25+random*.5);
 float run=exp(-abs(x)*165.0)*step(.90,random)*smoothstep(.6,1.0,sin(glassUv.y*14.0+time*.37+random*9.0));
 float edge=smoothstep(0.0,.025,glassUv.x)*(1.0-smoothstep(.975,1.0,glassUv.x));
 vec3 light=mix(vec3(.48,.65,.74),vec3(.86,.67,.39),(1.0-smoothstep(.1,.64,glassUv.x))*.35);
 float alpha=(rim*.06+glint*.30+shadow*.07+run*.15)*edge*mix(1.,.72,focus);
 gl_FragColor=vec4(light*(1.0-shadow*.55)+glint*.28,alpha*rainfall);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}` }));
  const beadedGlass=mesh(geometry(new THREE.PlaneGeometry(4.04,1.63)),glassRain,.80,1.67,-2.606);beadedGlass.name='rain beads and runnels on window';beadedGlass.renderOrder=5;beadedGlass.castShadow=beadedGlass.receiveShadow=false;

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
  // A small sky bounce lets the distant hull and rain cape keep material
  // detail in daylight. It never adds an unmotivated light inside the room.
  for(const mat of [wood,slats,cape,trousers,skin,straw])mat.emissive.copy(mat.color);
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

  function update(time,day) {
    const seconds=Number.isFinite(time)?Math.max(0,time):0,pose=jiangnanBoat(seconds,boatSeed);
    const light=day?.daylight||0,wet=day?.rain??1;
    const sun=day?.sunDirection||[0,.5,-.8];solarUniforms.sunDirection.value.fromArray(sun).normalize();
    for(const key of ['sunStrength','sunRadius','golden','sunset','dawn'])if(Number.isFinite(day?.[key]))solarUniforms[key].value=day[key];
    solarUniforms.effectTime.value=seconds;
    solarUniforms.lightning.value=day?.still?0:wet*(1-light)*Math.pow(Math.max(0,Math.sin(seconds*.083+1.2)),180);
    waterUniforms.reflectionStrength.value=day?.reflectionStrength||0;
    skyMaterial.uniforms.daylight.value=light;waterUniforms.daylight.value=light;waterUniforms.rainfall.value=wet;
    glassRain.uniforms.rainfall.value=wet;glassRain.uniforms.focus.value=day?.windowFocus?1:0;rain.visible=wet>.001;beadedGlass.visible=wet>.001;rainMaterial.opacity=.34*wet;
    warm.emissiveIntensity=1.35*(1-light*.95);lanternPaper.emissiveIntensity=1.55*(1-light*.95);
    for(const mat of [wood,slats,cape,trousers,skin,straw])mat.emissiveIntensity=.025+light*.20;
    if(photographicMaterial){
      photographicMaterial.uniforms.daylight.value=light;
      const fallback=light>.5&&!photographicMaterial.uniforms.dayReady.value&&dayVistaAsset;
      if(photographicMaterial.uniforms.vista.value){photographicDome.visible=!fallback;for(const item of architecture)item.visible=Boolean(fallback);}
    }
    boat.position.set(photographic?pose.x*.72:pose.x,pose.y,pose.z-(photographic?5.5:0));boat.rotation.z=pose.roll;
    waterUniforms.boatDirection.value.set(-Math.cos(pose.yaw)*(photographic?.72:1),Math.sin(pose.yaw)).normalize();
    boat.rotation.y=Math.atan2(waterUniforms.boatDirection.value.y,-waterUniforms.boatDirection.value.x);waterUniforms.boatSpeed.value=pose.speed;
    oar.rotation.y=pose.stroke*.95;oar.rotation.z=pose.stroke*.22;
    for(const arm of arms){
      const hand=v3(arm.side<0?-.73:-.49,.24,arm.side<0?.035:.0).applyEuler(oar.rotation).add(oar.position),shoulder=v3(.60,.77,arm.side*.14),elbow=shoulder.clone().lerp(hand,.55);elbow.y-=.075;elbow.z+=arm.side*.035;
      poseLimb(arm.upper,shoulder,elbow);poseLimb(arm.fore,elbow,hand);arm.hand.position.copy(hand);
    }
    waterUniforms.time.value=seconds;waterUniforms.boat.value.copy(boat.position);mistMaterial.uniforms.time.value=seconds;glassRain.uniforms.time.value=seconds;skyMaterial.uniforms.time.value=seconds;
    for(let i=0;i<count;i++){
      const drop=drops[i],y=frac((drop.y-seconds*drop.speed)/14)*14-.5,wind=Math.sin(seconds*.09)*.055,x=drop.x+Math.sin(seconds*.23+drop.z)*.08;
      rainPositions.set([x,y,drop.z,x+.065+wind,y+drop.length,drop.z+.025],i*6);
    }
    rainGeometry.attributes.position.needsUpdate=true;
  }
  update(0);
  return {group,boat,update,get vistaMode(){return actualVista;}};
}
