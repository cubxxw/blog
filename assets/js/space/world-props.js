import * as THREE from 'three';
import {localRandom} from './world-landscape.mjs';

export function addLivedDetails({room,resources,pbr,materials}){
  const own=g=>{resources.add(g);return g;},mat=m=>{resources.add(m);return m;},up=new THREE.Vector3(0,1,0),board=own(new THREE.BoxGeometry(1,1,1));
  function box(x,y,z,w,h,d,material){const mesh=new THREE.Mesh(board,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=mesh.receiveShadow=true;room.add(mesh);return mesh;}
  function lathe(profile,material,x,y,z){const g=own(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),48)),mesh=new THREE.Mesh(g,material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;room.add(mesh);return mesh;}
  function tube(points,radius,material){const g=own(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),18,radius,6,false)),mesh=new THREE.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;room.add(mesh);return mesh;}
  // The skirting and window sill meet actual wall and frame faces.
  box(-6.745,.075,.2,.035,.13,10.35,materials.wood);box(6.64,.065,.4,.035,.11,10.1,materials.wood);
  for(const [x,w] of [[-5.05,3.1],[-2.2,2.1],[2.2,2.1],[5.05,3.1]])box(x,.22,-4.415,w,.055,.13,materials.wood);
  // One reading bookmark, a pencil on the desk, and the bar's folded cloth.
  box(-.39,.810,1.59,.018,.0015,.085,mat(new THREE.MeshStandardMaterial({color:'#617d78',roughness:1})));
  const pencil=tube([[2.94,1.084,-2.14],[3.10,1.084,-2.12]],.003,materials.wood);pencil.name='desk pencil';
  box(-4.45,1.145,-1.69,.32,.020,.24,materials.cloth);box(-4.45,1.158,-1.69,.31,.005,.12,materials.cloth);
  lathe([[0,0],[.062,0],[.068,.006],[.073,.15],[.07,.17],[.065,.17],[.063,.018],[0,.018]],materials.steel,-4.83,1.135,-1.74);
  tube([[-4.765,1.27,-1.74],[-4.72,1.28,-1.74],[-4.70,1.21,-1.74],[-4.77,1.18,-1.74]],.006,materials.steel);
  // A cat's water bowl sits on its mat, off the existing walking network.
  box(2.6,.012,4.3,.58,.008,.46,materials.cloth);
  const ceramic=mat(new THREE.MeshPhysicalMaterial({color:'#cbcbbf',roughness:.35,clearcoat:.2}));lathe([[0,0],[.10,0],[.125,.012],[.13,.052],[.118,.052],[.108,.016],[0,.016]],ceramic,2.6,.0166,4.3);
  const water=new THREE.Mesh(own(new THREE.CircleGeometry(.112,40)),mat(new THREE.MeshPhysicalMaterial({color:'#a8b5aa',roughness:.17,transparent:true,opacity:.72,envMapIntensity:.7})));water.rotation.x=-Math.PI/2;water.position.set(2.6,.052,4.3);water.receiveShadow=true;room.add(water);
  // A real floor plant: hollow pot, soil, curved stems, petioles and thin leaves.
  const pot=mat(new THREE.MeshStandardMaterial({color:'#a88265',roughness:.86})),soil=pbr.bind(mat(new THREE.MeshStandardMaterial({color:'#494337',roughness:1})),'brown_mud_rocks_01',{metres:.6,normal:.2,roughness:.9});
  lathe([[.18,0],[.22,.04],[.29,.52],[.30,.55],[.265,.55],[.252,.49],[.19,.035]],pot,5.9,.008,-3.62);
  const soilMesh=new THREE.Mesh(own(new THREE.CircleGeometry(.253,40)),soil);soilMesh.rotation.x=-Math.PI/2;soilMesh.position.set(5.9,.49,-3.62);room.add(soilMesh);
  const leafGeo=own(new THREE.PlaneGeometry(1,1,6,14)),positions=leafGeo.attributes.position;for(let i=0;i<positions.count;i++){const t=positions.getY(i)+.5,s=positions.getX(i);positions.setXYZ(i,s*Math.sin(t*Math.PI)*.65,t,Math.sin(t*Math.PI)*(.10-Math.abs(s)*.14));}leafGeo.computeVertexNormals();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#527744';c.fillRect(0,0,128,128);c.strokeStyle='#839861';c.lineWidth=1.5;c.beginPath();c.moveTo(64,128);c.lineTo(64,0);for(let y=15;y<118;y+=14){c.moveTo(64,y);c.lineTo(12,y+24);c.moveTo(64,y);c.lineTo(116,y+24);}c.stroke();const texture=own(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;
  const leafMaterial=mat(new THREE.MeshStandardMaterial({map:texture,color:'#d1dcc2',roughness:.67,side:THREE.DoubleSide,envMapIntensity:.16})),stem=mat(new THREE.MeshStandardMaterial({color:'#4e6340',roughness:.9})),random=localRandom(438);
  for(let i=0;i<12;i++){
    const angle=i*2.4,height=.45+random()*.65,out=.22+random()*.25,base=[5.9,.49,-3.62],end=[5.9+Math.cos(angle)*out,.49+height,-3.62+Math.sin(angle)*out];tube([base,[5.9+Math.cos(angle)*out*.15,.49+height*.65,-3.62+Math.sin(angle)*out*.15],end],.008,stem);
    for(let side of [-1,1]){const origin=new THREE.Vector3(...end),tip=origin.clone().add(new THREE.Vector3(Math.cos(angle+side*.4)*.13,.07,Math.sin(angle+side*.4)*.13));tube([origin.toArray(),tip.toArray()],.004,stem);const leaf=new THREE.Mesh(leafGeo,leafMaterial);leaf.position.copy(tip);leaf.quaternion.setFromUnitVectors(up,new THREE.Vector3(Math.cos(angle+side*.4)*.8,.35,Math.sin(angle+side*.4)*.8).normalize());leaf.scale.setScalar(.36+random()*.18);leaf.castShadow=leaf.receiveShadow=true;room.add(leaf);}
  }
}
