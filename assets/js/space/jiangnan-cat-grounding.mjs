// Only the room's load-bearing wood and rug participate. A paw spans the board
// joints; the narrow rounded rug edge still uses its real triangle surface.
export function createCatSupport({THREE,floor,rug}){
  floor.updateWorldMatrix(true,true);rug.updateWorldMatrix(true,true);
  const floorBounds=new THREE.Box3().setFromObject(floor),rugBounds=new THREE.Box3().setFromObject(rug);
  const inset=(rug.geometry.parameters.options?.bevelSize||0)*2;
  const rugTop={minX:rugBounds.min.x+inset,maxX:rugBounds.max.x-inset,minZ:rugBounds.min.z+inset,maxZ:rugBounds.max.z-inset};
  const floorY=floorBounds.max.y,rugY=rugBounds.max.y;
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0),0,1);
  return {floorY,rugY,rugTop,sample(x,z){
    if(x<rugBounds.min.x||x>rugBounds.max.x||z<rugBounds.min.z||z>rugBounds.max.z)return floorY;
    if(x>=rugTop.minX&&x<=rugTop.maxX&&z>=rugTop.minZ&&z<=rugTop.maxZ)return rugY;
    ray.ray.origin.set(x,rugY+.1,z);return Math.max(floorY,ray.intersectObject(rug,false)[0]?.point.y??-Infinity);
  }};
}

// A single body offset deliberately retains the supplied rig's small front/rear
// sole mismatch. It does not move foot bones or claim an inverse-kinematics gait.
export function createCatGrounder({THREE,model,anchor,shadow,owned,support}){
  const levels=[support?.floorY,support?.rugY,...Object.values(support?.rugTop||{})];
  if(typeof support?.sample!=='function'||levels.length!==6||!levels.every(Number.isFinite))return null;
  let mesh;model.traverse(o=>{if(o.isSkinnedMesh&&!mesh)mesh=o;});if(!mesh)return null;
  anchor.updateMatrixWorld(true);mesh.skeleton.update();
  const point=new THREE.Vector3(),attributes=mesh.geometry.attributes,groups=[];
  const skin=(index,out)=>mesh.getVertexPosition(index,out).applyMatrix4(mesh.matrixWorld);
  for(const name of ['L_Foot','R_Foot','L_BFoot','R_BFoot']){
    const foot=model.getObjectByName(name);if(!foot)continue;
    const bones=new Set();foot.traverse(o=>{const i=mesh.skeleton.bones.indexOf(o);if(i>=0)bones.add(i);});
    const unique=new Map();
    for(let i=0;i<attributes.position.count;i++){
      let weight=0;for(let k=0;k<4;k++)if(bones.has(attributes.skinIndex.array[i*4+k]))weight+=attributes.skinWeight.array[i*4+k];
      if(weight<=.25)continue;
      const key=[...attributes.position.array.subarray(i*3,i*3+3),...attributes.skinIndex.array.subarray(i*4,i*4+4),...attributes.skinWeight.array.subarray(i*4,i*4+4)].join(':');
      if(!unique.has(key))unique.set(key,{index:i,position:new THREE.Vector3()});
    }
    const points=[...unique.values()];if(points.length)groups.push({points,baseline:Math.min(...points.map(p=>skin(p.index,point).y))});
  }
  if(!groups.length)return null;
  const rugMaterial=shadow.material.clone(),rugShadow=new THREE.Mesh(shadow.geometry,rugMaterial),bounds={...support.rugTop};
  rugShadow.name='cat-soft-shadow-rug';rugShadow.rotation.copy(shadow.rotation);anchor.add(rugShadow);owned.add(rugMaterial);
  rugMaterial.onBeforeCompile=shader=>{
    shader.uniforms.rugClip={value:new THREE.Vector4(bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ)};
    shader.vertexShader='varying vec2 vCatSupportXZ;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCatSupportXZ=(modelMatrix*vec4(transformed,1.)).xz;');
    shader.fragmentShader='varying vec2 vCatSupportXZ;\nuniform vec4 rugClip;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(vCatSupportXZ.x<rugClip.x||vCatSupportXZ.x>rugClip.y||vCatSupportXZ.y<rugClip.z||vCatSupportXZ.y>rugClip.w)discard;');
  };
  rugMaterial.customProgramCacheKey=()=> 'cat-support-rug-clip-v1';
  rugShadow.onBeforeRender=()=>{rugMaterial.opacity=shadow.material.opacity;};
  shadow.geometry.computeBoundingBox();const size=shadow.geometry.boundingBox.getSize(new THREE.Vector3()),radius=Math.hypot(size.x,size.y)/2;
  let height=null,disposed=false;
  function reset(){if(!disposed)anchor.position.y=0;}
  function apply(dt=0,bob=0,resting=false){
    if(disposed)return;
    anchor.updateMatrixWorld(true);mesh.skeleton.update();let target=-Infinity;
    for(const g of groups){
      let minimum=Infinity;for(const p of g.points){skin(p.index,p.position);minimum=Math.min(minimum,p.position.y);}
      const lift=resting?0:Math.max(0,minimum-g.baseline-bob);
      for(const p of g.points){let surface;try{surface=support.sample(p.position.x,p.position.z);}catch{continue;}
        if(Number.isFinite(surface))target=Math.max(target,lift-p.position.y+surface);
      }
    }
    if(Number.isFinite(target))height=height===null||!(dt>0)?target:Math.max(THREE.MathUtils.lerp(height,target,1-Math.exp(-dt*10)),target);
    anchor.position.y=height??0;
    shadow.position.y=support.floorY+.0002-anchor.position.y;rugShadow.position.y=support.rugY+.0002-anchor.position.y;
    rugShadow.visible=anchor.position.x+radius>bounds.minX&&anchor.position.x-radius<bounds.maxX&&anchor.position.z+radius>bounds.minZ&&anchor.position.z-radius<bounds.maxZ;
  }
  return {reset,apply,dispose(){reset();disposed=true;rugShadow.removeFromParent();rugShadow.onBeforeRender=null;support=null;groups.length=0;}};
}
