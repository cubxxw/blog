import * as THREE from 'three';
import {CUP,CUP_PROFILE,SAUCER_PROFILE,SHELVES,SHELF_THICKNESS,bookLayout,wrapBookText} from './world-details.mjs';

export function createCafeDetails({resources,textures,isDisposed,wake,latteAsset,books=[]}){
  const geometry=g=>{resources.add(g);return g;},material=m=>{resources.add(m);return m;};
  const texture=canvas=>{const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;textures.add(map);return map;};
  const makeCanvas=(w,h)=>{const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;return [canvas,canvas.getContext('2d')];};
  const porcelain=material(new THREE.MeshPhysicalMaterial({color:'#eee6d7',roughness:.24,metalness:0,ior:1.5,envMapIntensity:.85,clearcoat:.45,clearcoatRoughness:.19}));
  const [latteCanvas,lc]=makeCanvas(512,512),crema=lc.createRadialGradient(237,225,60,256,256,260);crema.addColorStop(0,'#bb7a42');crema.addColorStop(.82,'#a76332');crema.addColorStop(1,'#754320');lc.fillStyle=crema;lc.fillRect(0,0,512,512);
  // A continuous pour: paired milk lobes taper to a cut-through stem. This is
  // the immediate fallback surface, not an icon floating over a brown disc.
  for(let i=0;i<17;i++){const y=366-i*12,span=18+Math.sin(i/17*Math.PI)*112,alpha=.90-i*.009;lc.fillStyle=`rgba(247,232,199,${alpha})`;lc.beginPath();lc.moveTo(256,y+12);lc.bezierCurveTo(256-span*1.3,y-3,256-span,y-30,256,y-8);lc.bezierCurveTo(256+span,y-30,256+span*1.3,y-3,256,y+12);lc.fill();}
  lc.strokeStyle='#f5e6c5';lc.lineWidth=6;lc.lineCap='round';lc.beginPath();lc.moveTo(255,157);lc.quadraticCurveTo(261,280,254,394);lc.stroke();
  const fallback=texture(latteCanvas),liquid=material(new THREE.MeshPhysicalMaterial({map:fallback,color:'#ffffff',roughness:.29,metalness:0,ior:1.333,envMapIntensity:.65,clearcoat:.28,clearcoatRoughness:.21}));
  if(latteAsset)new THREE.TextureLoader().load(latteAsset,map=>{if(isDisposed()){map.dispose();return;}map.colorSpace=THREE.SRGBColorSpace;textures.add(map);liquid.map=map;liquid.needsUpdate=true;wake();},undefined,()=>{});
  const saucerGeo=geometry(new THREE.LatheGeometry(SAUCER_PROFILE.map(p=>new THREE.Vector2(...p)),64)),cupGeo=geometry(new THREE.LatheGeometry(CUP_PROFILE.map(p=>new THREE.Vector2(...p)),64));
  const liquidGeo=geometry(new THREE.CircleGeometry(CUP.liquidRadius,64));liquidGeo.rotateX(-Math.PI/2);
  const handlePath=new THREE.CatmullRomCurve3([[.064,.066,0],[.088,.067,0],[.108,.053,0],[.105,.032,0],[.088,.020,0],[.055,.025,0]].map(p=>new THREE.Vector3(...p)));
  const handleGeo=geometry(new THREE.TubeGeometry(handlePath,40,.0075,10,false));
  const [contactCanvas,cc]=makeCanvas(128,128),contactGradient=cc.createRadialGradient(64,64,13,64,64,63);contactGradient.addColorStop(0,'rgba(40,28,17,.30)');contactGradient.addColorStop(.6,'rgba(40,28,17,.12)');contactGradient.addColorStop(1,'rgba(40,28,17,0)');cc.fillStyle=contactGradient;cc.fillRect(0,0,128,128);
  const contactMat=material(new THREE.MeshBasicMaterial({map:texture(contactCanvas),transparent:true,depthWrite:false})),contactGeo=geometry(new THREE.PlaneGeometry(.23,.23));contactGeo.rotateX(-Math.PI/2);
  const add=(group,g,m,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
  function cup(x,supportSurfaceY,z,parent,variant='latte'){
    const group=new THREE.Group();group.name='porcelain coffee';group.userData.inspect='coffee';group.position.set(x,supportSurfaceY+CUP.epsilon,z);parent.add(group);
    const shadow=add(group,contactGeo,contactMat,0,-CUP.epsilon+.0002,0);shadow.castShadow=shadow.receiveShadow=false;
    add(group,saucerGeo,porcelain);add(group,cupGeo,porcelain,0,CUP.bodyBase,0);add(group,handleGeo,porcelain,0,CUP.bodyBase,0);if(variant!=='empty'){const surface=add(group,liquidGeo,liquid,0,CUP.bodyBase+CUP.liquidY,0);surface.castShadow=false;}
    return group;
  }
  const [atlasCanvas,ac]=makeCanvas(1024,2048),palette=['#345c50','#8a472c','#4b5b79','#534464','#6a4a36','#385d63','#535b37','#7d4d42','#394f62','#625535'];
  function textBlock(text,x,y,width,font,maxLines,color,maxHeight=Infinity){
    let size=font,lines;do{ac.font=`500 ${size}px system-ui, sans-serif`;lines=wrapBookText(text,s=>ac.measureText(s).width,width);const wholeWords=String(text).match(/[A-Za-z][A-Za-z’-]+/g)||[];if(lines.length<=maxLines&&lines.length*size*1.25<=maxHeight&&wholeWords.every(word=>ac.measureText(word).width<=width))break;size--;}while(size>12);
    ac.fillStyle=color;ac.textAlign='left';ac.textBaseline='top';lines.forEach((line,i)=>ac.fillText(line,x,y+i*size*1.25));
  }
  const shelfLayout=bookLayout(books);
  books.forEach((book,index)=>{const x=(index%4)*256,y=Math.floor(index/4)*512,color=palette[index%palette.length];ac.fillStyle=color;ac.fillRect(x,y,256,512);ac.fillStyle='#e9ddbf';ac.fillRect(x+22,y+26,25,2);textBlock(book.title,x+22,y+52,164,book.own?72:48,4,'#fff7e6',190);textBlock(book.author,x+22,y+258,164,24,3,'#f1e5ce',44);ac.save();const spineHeight=44*shelfLayout[index].height/shelfLayout[index].thickness;ac.translate(x+233,y+spineHeight-16);ac.rotate(-Math.PI/2);textBlock(book.title,0,-12,spineHeight-32,24,1,'#fff7e6');ac.restore();});
  const atlas=texture(atlasCanvas);atlas.anisotropy=4;const coverMat=material(new THREE.MeshStandardMaterial({map:atlas,color:'#ffffff',roughness:.84,envMapIntensity:.18}));
  const [pageCanvas,pc]=makeCanvas(128,128);pc.fillStyle='#e4ddc9';pc.fillRect(0,0,128,128);pc.fillStyle='#bdb69f';for(let y=3;y<128;y+=4)pc.fillRect(0,y,128,1);const pageMap=texture(pageCanvas),pages=material(new THREE.MeshStandardMaterial({map:pageMap,roughness:1,color:'#f0eadb',envMapIntensity:.12}));
  const board=geometry(new THREE.BoxGeometry(1,1,1));
  function atlasPlane(index,width,height,spine=false){
    const geo=geometry(new THREE.PlaneGeometry(width,height)),uv=geo.attributes.uv,x=index%4*256,y=Math.floor(index/4)*512,left=spine?212:0,right=spine?256:208;
    for(let i=0;i<uv.count;i++)uv.setXY(i,(x+left+uv.getX(i)*(right-left))/1024,1-(y+(1-uv.getY(i))*(spine?44*height/width:312))/2048);return geo;
  }
  function book(spec,parent){
    const {index,height,thickness,width,book:content}=spec,group=new THREE.Group();group.name=content.title;group.userData.inspect='books';parent.add(group);
    const pagesMesh=add(group,board,pages);pagesMesh.scale.set(thickness-.005,height-.009,width-.008);pagesMesh.position.y=height/2;
    for(const sign of [-1,1]){const cover=add(group,atlasPlane(index,width,height),coverMat,sign*thickness/2,height/2,0);cover.rotation.y=sign*Math.PI/2;}
    const spine=add(group,atlasPlane(index,thickness,height,true),coverMat,0,height/2,-width/2);spine.rotation.y=Math.PI;
    return group;
  }
  function bookshelf(parent,wood,standMaterial){
    const group=new THREE.Group();group.name='traveller books';group.userData.inspect='books';parent.add(group);
    for(const y of SHELVES){const shelf=add(group,board,wood,-6.61,y,-.6);shelf.scale.set(.43,SHELF_THICKNESS,3.5);}
    for(const spec of shelfLayout){const volume=book(spec,group);volume.position.set(spec.x,spec.baseY,spec.z);if(!spec.face)volume.rotation.y=-Math.PI/2;for(const plate of spec.stand||[]){const support=add(group,board,standMaterial,...plate.position);support.scale.set(...plate.size);}}
    // Narrow bookends support the standing reading copies, within the old shelf.
    const bookend=material(new THREE.MeshStandardMaterial({color:'#514e40',roughness:.55,metalness:.3}));
    for(const z of [-1.07,-.70]){const end=add(group,board,bookend,-6.54,.69,z);end.scale.set(.18,.15,.009);}
    return group;
  }
  function tableBook(x,supportSurfaceY,z,parent,variant=0){
    const own=books.map((b,i)=>b.own?i:-1).filter(i=>i>=0),index=own[variant%own.length];if(index===undefined)return;
    const spec={book:books[index],index,height:.26,thickness:.023,width:.18},volume=book(spec,parent);volume.children.forEach(child=>{child.position.y-=spec.height/2;});volume.rotation.set(0,variant?-.12:.15,-Math.PI/2);volume.position.set(x,supportSurfaceY+CUP.epsilon+spec.thickness/2,z);return volume;
  }
  return {cup,bookshelf,tableBook};
}
