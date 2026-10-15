import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { createCatState, stepCat } from './cat-state.mjs';

// J-Toastie's rigged Cat (CC BY 3.0). Provenance and modifications are recorded
// alongside the local asset; the original idle clip is retained.
export function createCafeResident({scene,asset='/models/space/cat.glb',wake=()=>{}}) {
  const anchor=new THREE.Group();anchor.name='cafe-resident';scene.add(anchor);
  let state=createCatState(),model,mixer,idle,disposed=false,loaded=false,blend=0,wasActive=false;
  const owned=new Set(),bones=[];
  const legNames=['L_Leg_Upper','R_Leg_Upper','L_BLeg_Upper','R_BLeg_Upper'];
  const phases=[0,Math.PI,Math.PI,0];
  const axis=new THREE.Vector3(0,0,1),rotation=new THREE.Quaternion();
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
      if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}
      for(const m of o.material ? (Array.isArray(o.material)?o.material:[o.material]) : []) {
        m.metalness=0;m.roughness=.88;
      }
    });
    for(const [i,name] of legNames.entries()){
      const bone=model.getObjectByName(name);
      if(bone)bones.push({bone,base:bone.quaternion.clone(),phase:phases[i]});
    }
    // The source model has an unpainted face. Amber eyes follow the head bone;
    // raycasting places them on the actual skinned surface.
    model.updateMatrixWorld(true);
    const head=model.getObjectByName('Head'),headPosition=head?.getWorldPosition(new THREE.Vector3());
    const restingBounds=new THREE.Box3().setFromObject(model);
    if(head){
      const iris=new THREE.MeshStandardMaterial({color:'#c4b97a',roughness:.38});
      const pupil=new THREE.MeshStandardMaterial({color:'#141d19',roughness:.35});
      const glint=new THREE.MeshBasicMaterial({color:'#fff6de'});
      const eyeGeometry=new THREE.SphereGeometry(1,12,8);[iris,pupil,glint,eyeGeometry].forEach(r=>owned.add(r));
      for(const side of [-1,1]){
        const ray=new THREE.Raycaster(new THREE.Vector3(headPosition.x+side*.068,restingBounds.max.y-.13,2),new THREE.Vector3(0,0,-1));
        const hit=ray.intersectObject(model,true).find(h=>h.object.isSkinnedMesh);
        if(!hit)continue;
        const eye=new THREE.Group();eye.position.copy(hit.point);eye.position.z+=.008;
        const white=new THREE.Mesh(eyeGeometry,iris);white.scale.set(.027,.022,.014);eye.add(white);
        const black=new THREE.Mesh(eyeGeometry,pupil);black.scale.set(.008,.017,.007);black.position.z=.012;eye.add(black);
        const shine=new THREE.Mesh(eyeGeometry,glint);shine.scale.setScalar(.004);shine.position.set(-.006,.007,.018);eye.add(shine);
        head.attach(eye);
      }
    }
    anchor.add(model);shadow.visible=true;
    loaded=true;wake();return true;
  }).catch(()=>false);
  function update(seconds,{active=false}={}) {
    if(disposed||!loaded)return;
    if(!active){
      if(wasActive){blend=0;for(const {bone,base} of bones)bone.quaternion.copy(base);mixer?.update(0);}
      wasActive=false;return;
    }
    wasActive=true;const dt=Math.min(Math.max(seconds,0),.04);
    state=stepCat(state,dt);pose();
    const walking=state.phase==='walk'&&state.speed>.01;
    blend+=(Number(walking)-blend)*Math.min(1,dt*8);
    for(const {bone,base} of bones)bone.quaternion.copy(base);
    if(mixer){mixer.timeScale=state.phase==='rest'?.3:1;idle.setEffectiveWeight(1-blend*.85);mixer.update(dt);}
    for(const {bone,base,phase} of bones){
      if(blend>.001){
        rotation.setFromAxisAngle(axis,Math.sin(state.gait+phase)*.34*blend);
        bone.quaternion.copy(base).multiply(rotation);
      }
    }
    // A very slight breathing movement belongs to the animal, never the camera.
    shadow.material.opacity=state.phase==='rest'?.9:1;
  }
  function dispose() {
    if(disposed)return;disposed=true;
    mixer?.stopAllAction();if(model)mixer?.uncacheRoot(model);
    anchor.removeFromParent();for(const resource of owned)resource.dispose?.();owned.clear();
  }
  return {ready,update,dispose,get loaded(){return loaded;},snapshot(){return {...state,loaded};}};
}
