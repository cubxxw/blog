// An authored curl for the supplied J-Toastie skeleton. The spine controls in
// this rig are siblings, so each is bent in their common source coordinate
// frame instead of stacking local rotations down a nonexistent spine chain.
export function createCatSleepPose({THREE,model,radius=.03,neck=-1.15,head=.05,headTurn=1.2,side=-1}){
  const rig=model.getObjectByName('Cat001'),mesh=model.getObjectByName('Cat');
  if(!rig||!mesh?.isSkinnedMesh)return null;
  softenTorso(THREE,mesh,model);
  const managed=new Map(),point=new THREE.Vector3(),q=new THREE.Quaternion(),live=new THREE.Quaternion(),z=new THREE.Vector3(0,0,1);
  model.traverse(bone=>{if(bone.isBone)managed.set(bone,{position:bone.position.clone(),quaternion:bone.quaternion.clone(),inverse:bone.quaternion.clone().invert()});});
  const reset=()=>{for(const[bone,base]of managed){bone.position.copy(base.position);bone.quaternion.copy(base.quaternion);}if(mesh.morphTargetInfluences)mesh.morphTargetInfluences[0]=0;};
  model.updateMatrixWorld(true);const inverse=rig.matrixWorld.clone().invert(),source=new Map();
  for(const bone of managed.keys())source.set(bone,bone.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse));
  const rotate=(name,angle)=>{const bone=model.getObjectByName(name);bone?.quaternion.multiply(q.setFromAxisAngle(z,angle));};
  for(const name of ['L_Leg_Upper','R_Leg_Upper','L_BLeg_Upper','R_BLeg_Upper']){rotate(name,-1.4);rotate(name.replace('Upper','Lower'),2.1);}
  rotate('Neck',neck);rotate('Head',head);
  model.updateMatrixWorld(true);mesh.skeleton.update();
  const uncurled=[];
  for(let i=0;i<mesh.geometry.attributes.position.count;i++)uncurled.push(mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse));
  function curve(p){const angle=side*(p.x+.004)/radius;return new THREE.Vector3(side*radius*Math.sin(angle)-.004-p.y*Math.sin(angle),side*radius*(1-Math.cos(angle))+p.y*Math.cos(angle),-.025+(p.z+.025)*.8);}
  const rigQ=rig.getWorldQuaternion(new THREE.Quaternion()),vertical=z.clone().applyQuaternion(rigQ);
  for(const name of ['belly','chest','butt','L_Leg_Upper','R_Leg_Upper','L_BLeg_Upper','R_BLeg_Upper','Neck','tail1']){
    const bone=model.getObjectByName(name),base=source.get(bone);if(!bone)continue;
    const target=curve(base);if(name==='Neck'){target.x-=.008;target.y+=side*.004;target.z-=.016;}if(name==='tail1')target.z-=.01;
    bone.position.copy(bone.parent.worldToLocal(target.applyMatrix4(rig.matrixWorld)));
    const world=bone.getWorldQuaternion(new THREE.Quaternion());
    world.premultiply(q.setFromAxisAngle(vertical,side*((base.x+.004)/radius+(name==='Neck'?headTurn:0))));
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));model.updateMatrixWorld(true);
  }
  const directions=[[-.2,.98,-.1],[.45,.89,0],[.85,.53,0],[.98,.2,0]];
  for(let i=0;i<directions.length;i++){
    const bone=model.getObjectByName('tail'+(i+1));if(!bone)continue;
    const direction=new THREE.Vector3(...directions[i]);direction.y*=side;direction.normalize().applyQuaternion(rigQ);const world=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));model.updateMatrixWorld(true);
  }
  const targets=new Map();for(const[bone,base]of managed)if(!bone.position.equals(base.position)||1-Math.abs(bone.quaternion.dot(base.quaternion))>1e-8)targets.set(bone,{position:bone.position.clone(),quaternion:bone.quaternion.clone()});
  // The three torso bones are sparse controls. A small, one-time corrective
  // morph removes their pinched seams, using the actual weighted skin matrix.
  // It is still the original skinned mesh, including ray hits and grounding.
  mesh.skeleton.update();const geometry=mesh.geometry,{position,skinIndex,skinWeight}=geometry.attributes;
  const torso=new Set(['belly','chest','butt'].map(name=>mesh.skeleton.bones.indexOf(model.getObjectByName(name)))),delta=new Float32Array(position.count*3),skin=new THREE.Matrix4(),boneMatrix=new THREE.Matrix4(),effective=new THREE.Matrix4(),meshInverse=mesh.matrixWorld.clone().invert();
  for(let i=0;i<position.count;i++){
    let torsoWeight=0;skin.elements.fill(0);
    for(let j=0;j<4;j++){const index=skinIndex.array[i*4+j],weight=skinWeight.array[i*4+j];if(torso.has(index))torsoWeight+=weight;boneMatrix.fromArray(mesh.skeleton.boneMatrices,index*16);for(let k=0;k<16;k++)skin.elements[k]+=boneMatrix.elements[k]*weight;}
    if(torsoWeight<.001)continue;
    const actual=mesh.getVertexPosition(i,new THREE.Vector3()),desired=curve(uncurled[i]).applyMatrix4(rig.matrixWorld).applyMatrix4(meshInverse);actual.lerp(desired,torsoWeight);
    effective.multiplyMatrices(mesh.bindMatrixInverse,skin).multiply(mesh.bindMatrix).invert();actual.applyMatrix4(effective);point.fromBufferAttribute(position,i);actual.sub(point).toArray(delta,i*3);
  }
  geometry.morphTargetsRelative=true;geometry.morphAttributes.position=[new THREE.Float32BufferAttribute(delta,3)];mesh.updateMorphTargets();mesh.morphTargetInfluences[0]=1;
  const posedGeometry=new THREE.BufferGeometry(),posedPositions=new Float32Array(position.count*3),normalDelta=new Float32Array(position.count*3),normalGroups=new Map();
  for(let i=0;i<position.count;i++){mesh.getVertexPosition(i,point).toArray(posedPositions,i*3);const key=point.toArray().map(v=>Math.round(v*1e6)).join(':');if(!normalGroups.has(key))normalGroups.set(key,[]);normalGroups.get(key).push(i);}
  posedGeometry.setIndex(geometry.index);posedGeometry.setAttribute('position',new THREE.Float32BufferAttribute(posedPositions,3));posedGeometry.computeVertexNormals();
  const normals=posedGeometry.attributes.normal,normalInverse=new THREE.Matrix3();
  for(const indices of normalGroups.values()){
    const sum=new THREE.Vector3();for(const i of indices)sum.add(new THREE.Vector3().fromBufferAttribute(normals,i));sum.normalize();
    for(const i of indices){let torsoWeight=0;skin.elements.fill(0);for(let j=0;j<4;j++){const index=skinIndex.array[i*4+j],weight=skinWeight.array[i*4+j];if(torso.has(index))torsoWeight+=weight;boneMatrix.fromArray(mesh.skeleton.boneMatrices,index*16);for(let k=0;k<16;k++)skin.elements[k]+=boneMatrix.elements[k]*weight;}
      if(torsoWeight<.001)continue;effective.multiplyMatrices(mesh.bindMatrixInverse,skin).multiply(mesh.bindMatrix);normalInverse.setFromMatrix4(effective).invert();const original=new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal,i),corrected=sum.clone().applyMatrix3(normalInverse).normalize();corrected.sub(original).multiplyScalar(torsoWeight).toArray(normalDelta,i*3);
    }
  }
  geometry.morphAttributes.normal=[new THREE.Float32BufferAttribute(normalDelta,3)];posedGeometry.dispose();
  const sleepLift=.014-new THREE.Box3().setFromObject(mesh,true).min.y;
  reset();
  return {reset,apply(amount){const blend=THREE.MathUtils.smoothstep(amount,0,1);for(const[bone,target]of targets){const base=managed.get(bone);live.copy(base.inverse).multiply(bone.quaternion);q.identity().slerp(live,(1-blend)**3);bone.position.lerp(target.position,blend);bone.quaternion.slerpQuaternions(base.quaternion,target.quaternion,blend).multiply(q);}mesh.morphTargetInfluences[0]=blend;model.position.y+=sleepLift*blend;}};
}

// One subdivision pass gives the three sparse torso controls enough surface to
// bend without a six-sided elbow. Original vertex numbers remain stable (the
// face calibration uses them); the head, ears and feet keep their shape while
// the torso and tail gain rounded edges.
function softenTorso(THREE,mesh,model){
  const geometry=mesh.geometry;if(geometry.userData.catTorsoSoftened)return;
  const {position,uv,skinIndex,skinWeight}=geometry.attributes,index=geometry.index.array,torso=new Set(['belly','chest','butt','tail1','tail2','tail3','tail4'].map(name=>mesh.skeleton.bones.indexOf(model.getObjectByName(name)))),groups=new Map(),ids=[],vertices=[];
  for(let i=0;i<position.count;i++){
    const p=new THREE.Vector3().fromBufferAttribute(position,i),key=p.toArray().map(v=>Math.round(v*1e7)).join(':');
    if(!groups.has(key)){groups.set(key,vertices.length);vertices.push({p,neighbors:new Set(),weight:0});}
    const id=groups.get(key);ids.push(id);let weight=0;for(let j=0;j<4;j++)if(torso.has(skinIndex.array[i*4+j]))weight+=skinWeight.array[i*4+j];vertices[id].weight=Math.max(vertices[id].weight,weight);
  }
  const edges=new Map();
  for(let i=0;i<index.length;i+=3)for(let j=0;j<3;j++){
    const a=ids[index[i+j]],b=ids[index[i+(j+1)%3]],opposite=ids[index[i+(j+2)%3]],key=a<b?`${a}:${b}`:`${b}:${a}`;
    vertices[a].neighbors.add(b);vertices[b].neighbors.add(a);if(!edges.has(key))edges.set(key,{a,b,opposites:[]});edges.get(key).opposites.push(opposite);
  }
  const attributes={position:[],normal:[],uv:[],skinIndex:[],skinWeight:[]},midpoints=new Map(),indices=[];
  function append(p,u,weights){const sorted=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=sorted.reduce((n,v)=>n+v[1],0);attributes.position.push(...p.toArray());attributes.normal.push(0,1,0);attributes.uv.push(...u);for(let k=0;k<4;k++){attributes.skinIndex.push(sorted[k]?.[0]||0);attributes.skinWeight.push((sorted[k]?.[1]||0)/sum);}return attributes.position.length/3-1;}
  const weights=i=>{const map=new Map();for(let j=0;j<4;j++){const b=skinIndex.array[i*4+j];map.set(b,(map.get(b)||0)+skinWeight.array[i*4+j]);}return map;};
  for(let i=0;i<position.count;i++){
    const v=vertices[ids[i]],n=v.neighbors.size,beta=n===3?3/16:3/(8*n),smooth=v.p.clone().multiplyScalar(1-n*beta);for(const neighbor of v.neighbors)smooth.addScaledVector(vertices[neighbor].p,beta);const p=v.p.clone().lerp(smooth,v.weight*.85);append(p,[uv.getX(i),uv.getY(i)],weights(i));
  }
  function midpoint(a,b){const key=a<b?`${a}:${b}`:`${b}:${a}`;if(midpoints.has(key))return midpoints.get(key);
    const ga=ids[a],gb=ids[b],edge=edges.get(ga<gb?`${ga}:${gb}`:`${gb}:${ga}`),va=vertices[ga],vb=vertices[gb],p=va.p.clone().add(vb.p).multiplyScalar(.5);
    if(edge.opposites.length===2){const smooth=va.p.clone().add(vb.p).multiplyScalar(3/8);for(const o of edge.opposites)smooth.addScaledVector(vertices[o].p,1/8);p.lerp(smooth,(va.weight+vb.weight)/2*.85);}
    const w=weights(a);for(const[bone,value]of weights(b))w.set(bone,(w.get(bone)||0)+value);const id=append(p,[(uv.getX(a)+uv.getX(b))/2,(uv.getY(a)+uv.getY(b))/2],w);midpoints.set(key,id);return id;}
  for(let i=0;i<index.length;i+=3){const a=index[i],b=index[i+1],c=index[i+2],ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);indices.push(a,ab,ca,b,bc,ab,c,ca,bc,ab,bc,ca);}
  geometry.setIndex(indices);for(const[name,array]of Object.entries(attributes))geometry.setAttribute(name,name==='skinIndex'?new THREE.Uint16BufferAttribute(array,4):new THREE.Float32BufferAttribute(array,name==='uv'?2:name==='skinWeight'?4:3));geometry.computeVertexNormals();
  const normals=new Map();for(let i=0;i<geometry.attributes.position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i),key=p.toArray().map(v=>Math.round(v*1e7)).join(':');if(!normals.has(key))normals.set(key,[]);normals.get(key).push(i);}
  for(const group of normals.values()){const normal=new THREE.Vector3();for(const i of group)normal.add(new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal,i));normal.normalize();for(const i of group)geometry.attributes.normal.setXYZ(i,normal.x,normal.y,normal.z);}
  geometry.computeBoundingBox();mesh.boundingBox=null;geometry.userData.catTorsoSoftened=true;
}
