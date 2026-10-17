import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { createCatState, stepCat, requestCat, settleCatInteraction } from './cat-state.mjs';
import { createCatClock } from './cat-clock.mjs';

// J-Toastie's rigged Cat (CC BY 3.0). Provenance and modifications are recorded
// alongside the local asset; the original idle clip is retained.
export function createCafeResident({scene,asset='/models/space/cat.glb',wake=()=>{},onChange=()=>{}}) {
  const anchor=new THREE.Group();anchor.name='cafe-resident';scene.add(anchor);
  let state=createCatState(),model,mixer,idle,disposed=false,loaded=false,blend=0,wasActive=false,bodyBounds;
  const clock=createCatClock();
  const owned=new Set(),bones=[],expressionBones=[],eyes=[];
  const legNames=['L_Leg_Upper','R_Leg_Upper','L_BLeg_Upper','R_BLeg_Upper'];
  const phases=[0,Math.PI,Math.PI,0];
  const axis=new THREE.Vector3(0,0,1),rotation=new THREE.Quaternion();let attention=false;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,2,32,32,31);
  gradient.addColorStop(0,'rgba(29,24,18,.24)');gradient.addColorStop(1,'rgba(29,24,18,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const texture=new THREE.CanvasTexture(canvas),material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.5,.85),material);
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.028;shadow.visible=false;anchor.add(shadow);
  owned.add(texture);owned.add(material);owned.add(shadow.geometry);
  function releaseTree(tree) {
    tree.traverse(o=>{
      if(o.geometry)owned.add(o.geometry);
      if(o.skeleton)owned.add(o.skeleton);
      for(const m of o.material ? (Array.isArray(o.material)?o.material:[o.material]) : []) {
        owned.add(m);for(const value of Object.values(m))if(value?.isTexture)owned.add(value);
      }
    });
  }
  function pose() {
    anchor.position.set(state.x,0,state.z);anchor.rotation.y=state.yaw;
  }
  function softenNormals(geometry){
    geometry.computeVertexNormals();const {position,normal,skinIndex,skinWeight}=geometry.attributes,source=normal.array.slice(),groups=new Map();
    for(let i=0;i<position.count;i++){let key=[position.getX(i),position.getY(i),position.getZ(i)].map(v=>Math.round(v*1e6)).join(':');if(skinIndex&&skinWeight)for(let j=0;j<4;j++)key+=':'+skinIndex.array[i*4+j]+':'+Math.round(skinWeight.array[i*4+j]*1e4);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);}
    for(const indices of groups.values())for(const i of indices){const original=new THREE.Vector3().fromArray(source,i*3),sum=new THREE.Vector3();for(const j of indices){const other=new THREE.Vector3().fromArray(source,j*3);if(original.dot(other)>.4)sum.add(other);}sum.normalize();normal.setXYZ(i,sum.x,sum.y,sum.z);}normal.needsUpdate=true;
  }
  pose();
  const ready=new GLTFLoader().loadAsync(asset).then(gltf=>{
    model=gltf.scene;releaseTree(model);
    if(disposed){for(const resource of owned)resource.dispose?.();return false;}
    if(gltf.animations.length){mixer=new THREE.AnimationMixer(model);idle=mixer.clipAction(gltf.animations[0]);idle.play();mixer.update(0);}
    model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
    model.scale.multiplyScalar(.68/Math.max(size.x,size.z));
    model.rotation.y=-Math.PI/2;
    bounds.setFromObject(model);const center=bounds.getCenter(new THREE.Vector3());
    model.position.set(-center.x,-bounds.min.y+.014,-center.z);
    model.traverse(o=>{
      if(o.isMesh){o.castShadow=false;o.receiveShadow=true;if(o.geometry)softenNormals(o.geometry);}
      for(const m of o.material ? (Array.isArray(o.material)?o.material:[o.material]) : []) {
        m.metalness=0;m.roughness=.82;m.flatShading=false;
      }
    });
    for(const [i,name] of legNames.entries()){
      const bone=model.getObjectByName(name);
      if(bone)bones.push({bone,base:bone.quaternion.clone(),phase:phases[i]});
    }
    for(const name of ['Head','Neck','tail2','tail3']){const bone=model.getObjectByName(name);if(bone)expressionBones.push({bone,base:bone.quaternion.clone(),name});}
    // The source model has an unpainted face. Amber eyes follow the head bone;
    // raycasting places them on the actual skinned surface.
    model.updateMatrixWorld(true);
    const head=model.getObjectByName('Head'),headPosition=head?.getWorldPosition(new THREE.Vector3());
    const restingBounds=new THREE.Box3().setFromObject(model);bodyBounds={minY:restingBounds.min.y,...restingBounds.getSize(new THREE.Vector3())};
    if(head){
      // In this rig the frontmost central head vertices form the pink nose.
      // Calibration against the actual albedo/skin puts the eye line 36 mm
      // above that surface, rather than below it using the ear-tip bounds.
      let nose;const face=model.getObjectByName('Cat');if(face?.isSkinnedMesh)for(let i=0;i<face.geometry.attributes.position.count;i++){const point=face.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(face.matrixWorld);if(Math.abs(point.x-headPosition.x)<.025&&point.y>headPosition.y&&point.y<headPosition.y+.15&&(!nose||point.z>nose.z))nose=point;}
      const eyeY=(nose?.y??headPosition.y+.083)+.036;
      const iris=new THREE.MeshStandardMaterial({color:'#8a9369',roughness:.48});
      const pupil=new THREE.MeshStandardMaterial({color:'#141d19',roughness:.35});
      const glint=new THREE.MeshBasicMaterial({color:'#fff6de'});
      const eyeGeometry=new THREE.SphereGeometry(1,24,16);[iris,pupil,glint,eyeGeometry].forEach(r=>owned.add(r));
      for(const side of [-1,1]){
        const ray=new THREE.Raycaster(new THREE.Vector3((nose?.x??headPosition.x)+side*.045,eyeY,2),new THREE.Vector3(0,0,-1));
        const hit=ray.intersectObject(model,true).find(h=>h.object.isSkinnedMesh);
        if(!hit)continue;
        const normal=hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();if(normal.z<0)normal.negate();
        const eye=new THREE.Group();eye.name=side<0?'cat-eye-left':'cat-eye-right';eye.position.copy(hit.point).addScaledVector(normal,.001);eye.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
        const white=new THREE.Mesh(eyeGeometry,iris);white.scale.set(.021,.014,.004);eye.add(white);
        const black=new THREE.Mesh(eyeGeometry,pupil);black.scale.set(.005,.011,.0025);black.position.z=.004;eye.add(black);
        const shine=new THREE.Mesh(eyeGeometry,glint);shine.scale.setScalar(.0025);shine.position.set(-.004,.005,.007);eye.add(shine);
        head.attach(eye);eyes.push({eye,baseScale:eye.scale.clone()});
      }
    }
    anchor.add(model);shadow.visible=true;
    loaded=true;clock.reset();wake();return true;
  }).catch(()=>false);
  function expression(){
    const action=state.interaction,pet=action?.kind==='pet',amount=pet?(action.instant ? .85 : .65+Math.sin((2.4-action.remaining)/2.4*Math.PI)*.25):(attention ? .35 : 0);
    for(const {bone,name} of expressionBones){const angle=name==='Head'?-.14*amount:name==='Neck'?-.05*amount:(pet ? .13 : 0)+(pet&&!action.instant?Math.sin(action.remaining*4)*.12:0);rotation.setFromAxisAngle(axis,angle);bone.quaternion.multiply(rotation);}
    for(const {eye,baseScale} of eyes){eye.scale.copy(baseScale);eye.scale.y*=1-amount*.65;}
  }
  function resetExpression(){for(const {bone,base} of expressionBones)bone.quaternion.copy(base);}
  function update(seconds,{active=false,interactive=false}={}) {
    if(disposed||!loaded){clock.reset();return;}
    if(!active&&!interactive){
      clock.reset();
      if(wasActive){blend=0;for(const {bone,base} of bones)bone.quaternion.copy(base);mixer?.update(0);}
      resetExpression();expression();
      wasActive=false;return;
    }
    wasActive=true;const dt=clock.advance(seconds,true,step=>{
      const before=state.interaction?.stage;state=stepCat(state,step);
      if(before==='approach'&&state.interaction?.stage==='near')onChange('arrived');
      if(before==='respond'&&!state.interaction)onChange('petted');
    });pose();
    const walking=state.phase==='walk'&&state.speed>.01;
    blend+=(Number(walking)-blend)*Math.min(1,dt*8);
    for(const {bone,base} of bones)bone.quaternion.copy(base);resetExpression();
    if(mixer){mixer.timeScale=state.phase==='rest'?.3:1;idle.setEffectiveWeight(1-blend*.85);mixer.update(dt);}
    for(const {bone,base,phase} of bones){
      if(blend>.001){
        rotation.setFromAxisAngle(axis,Math.sin(state.gait+phase)*.34*blend);
        bone.quaternion.copy(base).multiply(rotation);
      }
    }
    expression();
    // A very slight breathing movement belongs to the animal, never the camera.
    shadow.material.opacity=state.phase==='rest'?.9:1;
  }
  function interact(kind,visitor,options={}){
    clock.reset();
    if(disposed||!loaded){onChange('unavailable');return false;}
    const next=requestCat(state,kind,visitor,options);state=next.state;attention=true;pose();resetExpression();expression();onChange(next.result);wake();return next.result;
  }
  function settle(){clock.reset();if(!state.interaction)return;const pending=state.interaction.stage==='approach',pet=state.interaction.kind==='pet';state=settleCatInteraction(state);pose();resetExpression();expression();if(pet)onChange('petted-still');else if(pending)onChange('noticed');}
  function attend(visitor){clock.reset();if(!loaded||disposed)return;state={...state,yaw:Math.atan2(visitor.x-state.x,visitor.z-state.z),speed:0};attention=true;pose();resetExpression();expression();wake();}
  function view(aspect,yaw=state.yaw){
    const {x:width,y:height,z:depth,minY}=bodyBounds,tangent=Math.tan(42*Math.PI/360),distance=Math.max((height+.08)/(2*tangent*.54),(width+.08)/(2*tangent*Math.max(.25,aspect)*.64))+depth*.55;
    return {position:[state.x+Math.sin(yaw)*distance,minY+height*.68,state.z+Math.cos(yaw)*distance],target:[state.x,minY+height*.43,state.z],fov:42};
  }
  function dispose() {
    if(disposed)return;disposed=true;clock.reset();
    mixer?.stopAllAction();if(model)mixer?.uncacheRoot(model);
    anchor.removeFromParent();for(const resource of owned)resource.dispose?.();owned.clear();
  }
  return {ready,update,interact,attend,settle,view,dispose,resetClock:clock.reset,hit(raycaster){return loaded&&!disposed?raycaster.intersectObject(model,true)[0]:null;},get pending(){return Boolean(state.interaction&&!state.interaction.instant&&(state.interaction.stage==='approach'||state.interaction.remaining>0));},get loaded(){return loaded;},snapshot(){return {...state,loaded};}};
}
