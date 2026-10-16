import * as THREE from 'three';
import {localRandom,groundLevel,CAFE_LIGHT} from './world-landscape.mjs';

export function syncCafeThemeLights({sun,ambient,pendants,room,dayReflections},theme){
  const night=theme==='rain';sun.intensity=night?CAFE_LIGHT.rainSun:CAFE_LIGHT.sun;sun.castShadow=!night;ambient.intensity=night?CAFE_LIGHT.rainAmbient:CAFE_LIGHT.ambient;ambient.color.set(night?'#91a9bd':'#d7e3e1');ambient.groundColor.set(night?'#373c3c':'#70695b');for(const light of pendants)light.intensity=night?9.5:7;
  room.traverse(object=>{for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[])if(material.isMeshStandardMaterial){if(!dayReflections.has(material))dayReflections.set(material,material.envMapIntensity);material.envMapIntensity=dayReflections.get(material)*(night?.38:1);}});
}

function placeKit(parent,owner,pbr){
  const geometry=g=>{owner.add(g);return g;},board=geometry(new THREE.BoxGeometry(1,1,1)),cylinder=geometry(new THREE.CylinderGeometry(.86,1,1,6)),materials=new Map(),up=new THREE.Vector3(0,1,0);
  function material(color,key,options={}){const id=color+':'+key+JSON.stringify(options);if(materials.has(id))return materials.get(id);const m=new THREE.MeshStandardMaterial({color,roughness:.9,envMapIntensity:.2,...options});owner.add(m);if(key)pbr.bind(m,key,{metres:key==='wood_table_001'?1.2:2,normal:.16,roughness:.82,tint:color,projection:key==='rock_boulder_dry'?'triplanar':'dominant'});materials.set(id,m);return m;}
  function mesh(g,m,x,y,z,name){const object=new THREE.Mesh(g,m);object.position.set(x,y,z);object.castShadow=object.receiveShadow=true;if(name)object.name=name;parent.add(object);return object;}
  function box(x,y,z,w,h,d,m,name){const object=mesh(board,m,x,y,z,name);object.scale.set(w,h,d);return object;}
  function branch(a,b,r,m,name){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),object=mesh(cylinder,m,...start.clone().add(end).multiplyScalar(.5).toArray(),name);object.scale.set(r,start.distanceTo(end),r);object.quaternion.setFromUnitVectors(up,end.sub(start).normalize());return object;}
  return {geometry,material,mesh,box,branch,cylinder};
}

// Clip the actual terrain triangles to a rectangular foundation footprint. The
// minimum may lie on a triangle/footprint-edge intersection, not at its centre
// or even at one of the four corners.
function footingBottom(ground,x,z,width,depth){
  if(!ground)throw new Error('Architecture needs its actual ground mesh');const p=ground.geometry.attributes.position,indices=ground.geometry.index,{widthSegments:columns,heightSegments:rows}=ground.geometry.parameters,x0=p.getX(0),z0=p.getZ(0),dx=p.getX(1)-x0,dz=p.getZ(columns+1)-z0,lowX=x-width/2,highX=x+width/2,lowZ=z-depth/2,highZ=z+depth/2;
  const firstCol=Math.max(0,Math.floor((lowX-x0)/dx)),lastCol=Math.min(columns-1,Math.floor((highX-x0)/dx)),firstRow=Math.max(0,Math.floor((lowZ-z0)/dz)),lastRow=Math.min(rows-1,Math.floor((highZ-z0)/dz));let minimum=Infinity;
  function clip(polygon,axis,bound,sign){const result=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],insideA=(a[axis]-bound)*sign>=-1e-10,insideB=(b[axis]-bound)*sign>=-1e-10;if(insideA)result.push(a);if(insideA!==insideB){const t=(bound-a[axis])/(b[axis]-a[axis]);result.push(a.map((value,j)=>value+(b[j]-value)*t));}}return result;}
  for(let row=firstRow;row<=lastRow;row++)for(let col=firstCol;col<=lastCol;col++)for(let triangle=0;triangle<2;triangle++){const start=(row*columns+col)*6+triangle*3;let polygon=Array.from({length:3},(_,i)=>{const v=indices.getX(start+i);return [p.getX(v),p.getY(v),p.getZ(v)];});for(const [axis,bound,sign] of [[0,lowX,1],[0,highX,-1],[2,lowZ,1],[2,highZ,-1]])polygon=clip(polygon,axis,bound,sign);for(const vertex of polygon)minimum=Math.min(minimum,vertex[1]);}
  if(!Number.isFinite(minimum))throw new Error('Foundation has no terrain footprint');return minimum-.02;
}
function seatFooting(object,ground){const top=object.position.y+object.scale.y/2,bottom=footingBottom(ground,object.position.x,object.position.z,object.scale.x,object.scale.z);object.position.y=(top+bottom)/2;object.scale.y=top-bottom;return object;}

export function buildGardenPlace({parent,owner,pbr,bamboo,ground}){
  const group=new THREE.Group();group.name='garden architecture';parent.add(group);const {geometry,material,mesh,box,branch,cylinder}=placeKit(group,owner,pbr),plaster=material('#c1bfb2','painted_plaster_wall'),plinth=material('#777c70','rock_boulder_dry'),coping=material('#555c57','rock_boulder_dry'),timber=material('#625445','wood_table_001');
  box(-6,1.425,-18,8,3.45,.4,plaster,'garden wall');box(6,1.425,-18,8,3.45,.4,plaster,'garden wall');
  const shape=new THREE.Shape();shape.moveTo(-2,-.3);shape.lineTo(2,-.3);shape.lineTo(2,3.15);shape.lineTo(-2,3.15);shape.closePath();const hole=new THREE.Path();hole.absarc(0,1.38,1.27,0,Math.PI*2,true);shape.holes.push(hole);mesh(geometry(new THREE.ExtrudeGeometry(shape,{depth:.4,bevelEnabled:false,curveSegments:48})),plaster,0,0,-18.2,'garden moon wall');
  const arch=new THREE.Shape();arch.absarc(0,1.38,1.38,0,Math.PI*2,false);const opening=new THREE.Path();opening.absarc(0,1.38,1.27,0,Math.PI*2,true);arch.holes.push(opening);mesh(geometry(new THREE.ExtrudeGeometry(arch,{depth:.46,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,curveSegments:48})),plinth,0,0,-18.23,'moon gate lining');
  for(const [x,w] of [[-6,8],[6,8]]){seatFooting(box(x,-.12,-18,w,.36,.48,plinth,'garden foundation'),ground);box(x,.11,-17.77,w,.055,.07,plinth);}
  seatFooting(box(0,-.12,-18,4,.36,.48,plinth,'moon gate foundation'),ground);
  box(0,3.075,-18,20.15,.12,.47,timber);box(0,3.20,-18,20.3,.15,.66,coping,'garden wall cap');box(0,3.295,-18,20.18,.045,.52,coping);
  // Internodes, node collars, paired branchlets and lanceolate leaf sprays.
  const stem=material('#65774d',null),node=material('#8a9065',null),leafMaterial=material('#72905a',null,{side:THREE.DoubleSide,roughness:.8,envMapIntensity:.4}),collar=geometry(new THREE.CylinderGeometry(1.12,1.12,.018,6)),leaf=geometry(new THREE.PlaneGeometry(1,1,1,3)),p=leaf.attributes.position;
  for(let i=0;i<p.count;i++){const t=p.getY(i)+.5;p.setXYZ(i,p.getX(i)*Math.sin(t*Math.PI)*.26,t,Math.sin(t*Math.PI)*.055);}leaf.computeVertexNormals();const random=localRandom(519),leaves=[],up=new THREE.Vector3(0,1,0);
  for(const [index,plant] of bamboo.entries()){
    const base=groundLevel(plant.x,plant.z,'garden')-.025,leanX=(random()-.5)*.28,leanZ=(random()-.5)*.28,at=t=>[plant.x+leanX*t*t,base+plant.height*t,plant.z+leanZ*t*t],radius=.026+random()*.011;
    for(let joint=0;joint<9;joint++){const t=joint/9,end=(joint+1)/9,a=at(t),b=at(end);branch(a,b,radius*(1-t*.35),stem,'bamboo culm');if(joint){const ring=mesh(collar,node,...a,'bamboo node');ring.scale.set(radius*(1-t*.35),1,radius*(1-t*.35));}
      if(joint<5||joint>7)continue;for(const side of [-1,1]){const angle=index*2.4+joint*1.1+side*.9,origin=at(t),length=.40+random()*.32,tip=[origin[0]+Math.cos(angle)*length,origin[1]+.12+random()*.12,origin[2]+Math.sin(angle)*length];branch(origin,tip,.006,stem,'bamboo branch');
        for(let n=0;n<7;n++){const f=.25+n*.10,turn=angle+(n%2?-.65:.65),position=origin.map((v,i)=>v+(tip[i]-v)*f);leaves.push({position,direction:[Math.cos(turn)*.85,-.12+random()*.4,Math.sin(turn)*.85],scale:.28+random()*.13,roll:(random()-.5)*.4});}
      }
    }
  }
  const canopy=new THREE.InstancedMesh(leaf,leafMaterial,leaves.length),dummy=new THREE.Object3D();canopy.name='bamboo leaf sprays';leaves.forEach((spec,i)=>{dummy.position.fromArray(spec.position);dummy.quaternion.setFromUnitVectors(up,new THREE.Vector3(...spec.direction).normalize());dummy.rotateY(spec.roll);dummy.scale.setScalar(spec.scale);dummy.updateMatrix();canopy.setMatrixAt(i,dummy.matrix);});canopy.castShadow=canopy.receiveShadow=true;group.add(canopy);return group;
}

function rectangle(shape,x,y,w,h){const path=new THREE.Path();path.moveTo(x-w/2,y-h/2);path.lineTo(x-w/2,y+h/2);path.lineTo(x+w/2,y+h/2);path.lineTo(x+w/2,y-h/2);path.closePath();shape.holes.push(path);}

export function buildRainStreet({parent,owner,pbr,ground}){
  const group=new THREE.Group();group.name='rain street architecture';parent.add(group);const {geometry,material,mesh,box,branch}=placeKit(group,owner,pbr),walls=['#c4bcae','#a8b2ad','#bbb9af'].map(c=>material(c,'painted_plaster_wall')),stone=material('#70756f','rock_boulder_dry'),wood=material('#625143','wood_table_001'),roof=material('#434c49','rock_boulder_dry'),jamb=material('#686b60',null),glass=material('#a9b6b0',null,{transparent:true,opacity:.11,roughness:.2,depthWrite:false}),curtain=material('#b5af94',null,{emissive:'#b9a278',emissiveIntensity:.06}),roomOff=material('#28322f',null),rooms=[.28,.44,.60].map(emissiveIntensity=>material('#bba87f',null,{emissive:'#d4ac73',emissiveIntensity,roughness:1}));
  seatFooting(box(0,-.025,-19.4,55,.12,2.5,stone,'rain pavement'),ground);seatFooting(box(0,-.02,-18.1,55,.18,.25,stone,'rain curb'),ground);
  for(let i=0;i<7;i++){
    const x=-23+i*7,width=5.5+(i%3)*.24,height=5.8+(i%3)*.60,front=-20.9-(i%3)*.32,depth=3.8+(i%2)*.5,wall=walls[i%3],shape=new THREE.Shape();shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(width/2,height);shape.lineTo(-width/2,height);shape.closePath();const openings=[];
    for(let row=0;row<2;row++)for(let col=0;col<3;col++){const door=row===0&&col===1,cx=(col-1)*1.66,cy=door?1.16:row===0?1.78:4.12,w=door?.94:.98,h=door?2.20:1.46;rectangle(shape,cx,cy,w,h);openings.push({cx,cy,w,h,door,lit:(i*7+row*3+col)%4!==0});}
    mesh(geometry(new THREE.ExtrudeGeometry(shape,{depth:.28,bevelEnabled:false})),wall,x,0,front-.28,'rain facade');box(x-width/2+.12,height/2,front-depth/2,.24,height,depth,wall);box(x+width/2-.12,height/2,front-depth/2,.24,height,depth,wall);box(x,height/2,front-depth,width,height,.24,wall);
    seatFooting(box(x,-.05,front-depth/2-.06,width,.10,depth+.12,stone,'rain building foundation'),ground);seatFooting(box(x,.13,front+.03,width,.26,.42,stone,'rain front foundation'),ground);
    const baseFront=front+.24,apronFront=-20.63,apronBack=baseFront-.02;seatFooting(box(x,-.025,(apronFront+apronBack)/2,width,.12,apronFront-apronBack,stone,'rain entry apron'),ground);seatFooting(box(x,.09,baseFront+.14,1.30,.11,.32,stone,'rain entry step'),ground);
    box(x,2.91,front+.045,width+.12,.10,.37,stone);box(x,height-.03,front+.08,width+.3,.16,.46,stone);box(x,height+.09,front-depth/2,width+.42,.16,depth+.5,roof,'rain eaves');box(x,height+.22,front-depth/2,width+.18,.11,depth+.24,roof);branch([x+width/2-.15,.2,front+.20],[x+width/2-.15,height+.03,front+.20],.027,roof,'rain downpipe');
    for(const [j,o] of openings.entries()){
      const xx=x+o.cx,back=front-.78,inner=o.lit?rooms[(i+j)%3]:roomOff;
      box(xx,o.cy,back,o.w,o.h,.04,inner,'rain room back');box(xx-o.w/2+.025,o.cy,front-.46,.05,o.h,.62,jamb);box(xx+o.w/2-.025,o.cy,front-.46,.05,o.h,.62,jamb);box(xx,o.cy-o.h/2+.025,front-.46,o.w,.05,.62,jamb);box(xx,o.cy+o.h/2-.025,front-.46,o.w,.05,.62,jamb);
      for(const side of [-1,1])box(xx+side*(o.w/2-.045),o.cy,front-.035,.09,o.h,.13,wood);box(xx,o.cy+o.h/2-.045,front-.035,o.w,.09,.13,wood);box(xx,o.cy-o.h/2+.045,front-.035,o.w,.09,.13,wood);
      if(!o.door){box(xx,o.cy,front-.035,.035,o.h,.10,wood);box(xx,o.cy+.18,front-.035,o.w,.035,.10,wood);box(xx,o.cy-o.h/2-.035,front+.08,o.w+.24,.09,.32,stone,'rain window sill');if(o.lit){box(xx-o.w*.32,o.cy,front-.57,o.w*.17,o.h*.95,.018,curtain);box(xx+o.w*.32,o.cy,front-.57,o.w*.17,o.h*.95,.018,curtain);}}
      const pane=box(xx,o.cy,front-.11,o.w-.10,o.h-.10,.012,glass,'rain glass');pane.castShadow=false;
    }
  }return group;
}
