import * as THREE from 'three';
import { createCatGrounder } from './jiangnan-cat-grounding.mjs';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { createCatState, stepCat, requestCat, settleCatInteraction } from './cat-state.mjs';
import { createCatClock } from './cat-clock.mjs';
import { createCatSleepPose } from './cat-sleep-pose.mjs';

// J-Toastie's rigged Cat (CC BY 3.0). Provenance and modifications are recorded
// alongside the local asset; the original idle clip is retained.
export function createCafeResident({scene,asset='/models/space/cat.glb',wake=()=>{},onChange=()=>{},routeAdapter,appearance={},grounding}) {
  const adapter=routeAdapter||{create:createCatState,step:stepCat,request:requestCat,settle:settleCatInteraction};
  const natural=appearance.natural===true,cozy=appearance.cozy===true;
  const anchor=new THREE.Group();anchor.name='cafe-resident';scene.add(anchor);
  let state=adapter.create(),model,mixer,idle,disposed=false,loaded=false,blend=0,wasActive=false,bodyBounds,modelBaseY=0,grounder=null,sleepPose=null,breathTime=0;
  const clock=createCatClock();
  const loadAbort=new AbortController();
  const owned=new Set(),bones=[],expressionBones=[],eyes=[],breathBones=[];
  const legNames=['L_Leg_Upper','R_Leg_Upper','L_BLeg_Upper','R_BLeg_Upper'];
  const phases=natural?[Math.PI/2,Math.PI*1.5,0,Math.PI]:[0,Math.PI,Math.PI,0];
  const axis=new THREE.Vector3(0,0,1),rotation=new THREE.Quaternion(),closedEyeColor=new THREE.Color('#625348');let attention=false;
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
  function releaseOwned(){const images=new Set();for(const resource of owned){if(resource.isTexture&&resource.source?.data?.close)images.add(resource.source.data);resource.dispose?.();}for(const value of images)value.close();owned.clear();}
  function pose() {
    anchor.position.set(state.x,0,state.z);anchor.rotation.y=state.yaw;
  }
  function softenNormals(geometry){
    geometry.computeVertexNormals();const {position,normal,skinIndex,skinWeight}=geometry.attributes,source=normal.array.slice(),groups=new Map();
    for(let i=0;i<position.count;i++){let key=[position.getX(i),position.getY(i),position.getZ(i)].map(v=>Math.round(v*1e6)).join(':');if(!natural&&skinIndex&&skinWeight)for(let j=0;j<4;j++)key+=':'+skinIndex.array[i*4+j]+':'+Math.round(skinWeight.array[i*4+j]*1e4);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);}
    for(const indices of groups.values())for(const i of indices){const original=new THREE.Vector3().fromArray(source,i*3),sum=new THREE.Vector3();for(const j of indices){const other=new THREE.Vector3().fromArray(source,j*3);if(original.dot(other)>.4)sum.add(other);}sum.normalize();normal.setXYZ(i,sum.x,sum.y,sum.z);}normal.needsUpdate=true;
  }
  pose();
  const ready=fetch(asset,{signal:loadAbort.signal}).then(response=>{if(!response.ok)throw new Error('Resident asset unavailable');return response.arrayBuffer();}).then(bytes=>{
    if(disposed)return null;
    const base=/^(data|blob):/.test(asset)?'':new URL('.',new URL(asset,globalThis.location?.href||'http://localhost/')).href;return new GLTFLoader().parseAsync(bytes,base);
  }).then(gltf=>{
    if(!gltf)return false;
    model=gltf.scene;releaseTree(model);
    if(disposed){releaseOwned();return false;}
    if(gltf.animations.length){mixer=new THREE.AnimationMixer(model);idle=mixer.clipAction(gltf.animations[0]);idle.play();mixer.update(0);}
    if(natural)model.traverse(o=>{
      if(!o.isSkinnedMesh)return;
      const position=o.geometry.attributes.position;
      // Source coordinates use Z for height. Reduce its very long lower legs
      // and neck, preserving the round head instead of squashing the whole face.
      for(let i=0;i<position.count;i++){
        const z=position.getZ(i),x=position.getX(i);let height=z;
        if(z<-.01)height=-.01+(z+.01)*.62;
        if(z>.008)height=z<.02?.008+(z-.008)*.60:z-.0048;
        if(x>.012&&z>.034)height-=(z-.034)*.28;
        position.setZ(i,height);
        if(cozy){const round=Math.exp(-Math.pow(x/.045,2)-Math.pow((z-.008)/.03,2));position.setY(i,position.getY(i)*(1+round*.32));}
      }
      position.needsUpdate=true;o.geometry.computeBoundingBox();o.boundingBox=null;
    });
    model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
    model.scale.multiplyScalar((appearance.length||.68)/Math.max(size.x,size.z));
    if(natural)model.scale.y*=.86;
    model.rotation.y=-Math.PI/2;
    bounds.setFromObject(model);const center=bounds.getCenter(new THREE.Vector3());
    model.position.set(-center.x,-bounds.min.y+.014,-center.z);
    modelBaseY=model.position.y;
    let fur;
    if(natural){
      const surface=document.createElement('canvas');surface.width=surface.height=128;const context=surface.getContext('2d'),pixels=context.createImageData(128,128);let seed=1337;
      for(let y=0;y<128;y++)for(let x=0;x<128;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const value=119+(seed>>>27)+Math.sin(y*.42+x*.045)*10,i=(y*128+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;}
      context.putImageData(pixels,0,0);fur=new THREE.CanvasTexture(surface);fur.wrapS=fur.wrapT=THREE.RepeatWrapping;fur.repeat.set(7,7);owned.add(fur);
    }
    model.traverse(o=>{
      if(o.isMesh){o.castShadow=false;o.receiveShadow=true;if(o.geometry)softenNormals(o.geometry);}
      for(const m of o.material ? (Array.isArray(o.material)?o.material:[o.material]) : []) {
        m.metalness=0;m.roughness=natural?.94:.82;m.flatShading=false;
        if(natural){m.bumpMap=fur;m.bumpScale=.0008;m.color.set('#bfc3bb');if(m.map)m.map.anisotropy=4;
          // Keep the supplied albedo. Muting only its saturated magenta makes
          // the inner ears and nose less plastic without repainting the cat.
          m.onBeforeCompile=shader=>{
            shader.vertexShader='varying vec3 vCatSurface;\n'+shader.vertexShader;
            shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCatSurface=position;');
            shader.fragmentShader='varying vec3 vCatSurface;\n'+shader.fragmentShader;
            shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat pink=step(diffuseColor.g*1.7,diffuseColor.r)*step(diffuseColor.g*1.45,diffuseColor.b);\nfloat bands=smoothstep(.45,.82,sin(vCatSurface.x*1200.+sin(vCatSurface.z*600.)*1.4+sin(vCatSurface.y*1200.)*.4));\nfloat mottle=sin(vCatSurface.x*380.)*sin(vCatSurface.z*620.)*.018;\ndiffuseColor.rgb*=mix(1.,.9,bands*(1.-pink))+mottle;\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.075,.065),pink*.78);');
          };
          if(appearance.coat==='ivory'){
            const original=m.onBeforeCompile;m.onBeforeCompile=shader=>{original(shader);shader.fragmentShader=shader.fragmentShader.replace('diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.075,.065),pink*.78);','diffuseColor.rgb=mix(vec3(.84,.81,.74)*(1.0+mottle),vec3(.63,.34,.31),pink*.85);');};
          }
          m.customProgramCacheKey=()=> appearance.coat==='ivory'?'cafe-cat-ivory-v1':'cafe-cat-muted-fur-v2';}
      }
    });
    for(const [i,name] of legNames.entries()){
      const bone=model.getObjectByName(name);
      if(bone){const lower=natural?model.getObjectByName(name.replace('Upper','Lower')):null;const foot=natural?model.getObjectByName(name.replace('Leg_Upper','Foot')):null;bones.push({bone,base:bone.quaternion.clone(),phase:phases[i],lower,lowerBase:lower?.quaternion.clone(),foot,footBase:foot?.quaternion.clone()});}
    }
    for(const name of ['Head','Neck',...(cozy?['tail1']:[]),'tail2','tail3']){const bone=model.getObjectByName(name);if(bone)expressionBones.push({bone,base:bone.quaternion.clone(),name});}
    if(natural)for(const name of ['belly','chest']){const bone=model.getObjectByName(name);if(bone)breathBones.push({bone,base:bone.scale.clone()});}
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
      if(natural&&face?.isSkinnedMesh)nose=face.getVertexPosition(3673,new THREE.Vector3()).applyMatrix4(face.matrixWorld);
      const eyeY=(nose?.y??headPosition.y+.083)+(natural?.020:.036);
      const iris=new THREE.MeshStandardMaterial({color:natural?'#a49355':'#8a9369',roughness:.48});
      const pupil=new THREE.MeshStandardMaterial({color:'#141d19',roughness:.35});
      const glint=new THREE.MeshBasicMaterial({color:'#fff6de'});
      const eyeGeometry=new THREE.SphereGeometry(1,24,16);[iris,pupil,glint,eyeGeometry].forEach(r=>owned.add(r));
      for(const side of [-1,1]){
        const ray=new THREE.Raycaster(new THREE.Vector3((nose?.x??headPosition.x)+side*(natural?.030:.045),eyeY,2),new THREE.Vector3(0,0,-1));
        const hit=ray.intersectObject(model,true).find(h=>h.object.isSkinnedMesh);
        if(!hit)continue;
        const normal=hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();if(normal.z<0)normal.negate();
        const eye=new THREE.Group();eye.name=side<0?'cat-eye-left':'cat-eye-right';eye.position.copy(hit.point).addScaledVector(normal,.001);eye.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
        const white=new THREE.Mesh(eyeGeometry,iris);white.scale.set(natural?.014:.021,natural?.010:.014,.004);eye.add(white);
        const black=new THREE.Mesh(eyeGeometry,pupil);black.scale.set(natural?.0035:.005,natural?.008:.011,.0025);black.position.z=.004;eye.add(black);
        const shine=new THREE.Mesh(eyeGeometry,glint);shine.scale.setScalar(natural?.0016:.0025);shine.position.set(-.004,.005,.007);eye.add(shine);
        head.attach(eye);eyes.push({eye,iris:white,glint:shine,baseScale:eye.scale.clone()});
      }
      if(natural&&nose){
        const points=[];
        for(const side of [-1,1])for(let i=0;i<3;i++){
          const start=new THREE.Vector3(nose.x+side*.018,nose.y+.005+i*.003,nose.z-.006);
          const end=start.clone().add(new THREE.Vector3(side*(.065+i*.009),-.009+i*.012,.012-i*.008));points.push(start,end);
        }
        const geometry=new THREE.BufferGeometry().setFromPoints(points),material=new THREE.LineBasicMaterial({color:'#c4bda7',transparent:true,opacity:.52,depthWrite:false});owned.add(geometry);owned.add(material);
        const whiskers=new THREE.LineSegments(geometry,material);whiskers.name='cat-whiskers';head.attach(whiskers);
      }
    }
    if(natural&&cozy)sleepPose=createCatSleepPose({THREE,model});
    anchor.add(model);shadow.visible=true;
    if(grounding){grounder=createCatGrounder({THREE,model,anchor,shadow,owned,support:grounding});grounder?.apply(0,0);}
    loaded=true;clock.reset();if(cozy){grounder?.reset();expression();}wake();return true;
  }).catch(()=>false);
  function expression(groundDt=0){
    const action=state.interaction,pet=action?.kind==='pet',amount=pet?(action.instant ? .85 : .65+Math.sin((2.4-action.remaining)/2.4*Math.PI)*.25):(attention ? .35 : 0);
    for(const {bone,name} of expressionBones){const angle=name==='Head'?-.14*amount:name==='Neck'?-.05*amount:(pet ? .13 : 0)+(pet&&!action.instant?Math.sin(action.remaining*4)*.12:0);rotation.setFromAxisAngle(axis,angle);bone.quaternion.multiply(rotation);}
    const nap=cozy?(state.phase==='sleep'?1:state.phase==='wake'?Math.max(0,(state.interaction?.remaining||0)/2.6):state.phase==='settle'?1-state.remaining/2.6:0):0;
    const time=state.elapsed||0,blink=nap>.1?nap:natural?Math.max(0,1-Math.abs((time%5.7)-4.8)/.10):0;
    for(const {eye,iris,glint,baseScale} of eyes){eye.scale.copy(baseScale);eye.scale.y*=Math.max(.05,(1-amount*.65)*(1-blink*.94));iris.material.color.set(natural?'#a49355':'#8a9369').lerp(closedEyeColor,blink);glint.visible=blink<.8;}
    if(natural){
      for(const {bone,name}of expressionBones){const sway=name.startsWith('tail')?Math.sin(time*.72+(name==='tail3'?.65:0))*.045:name==='Head'?Math.sin(time*.57)*.018:Math.sin(time*.8)*.008;rotation.setFromAxisAngle(axis,sway);bone.quaternion.multiply(rotation);}
      if(model)model.position.y=modelBaseY+Math.sin(state.gait*2)*.0025*blend;
      sleepPose?.apply(nap);
      // A short inhale and longer exhale lift the chest first, then the belly.
      // This clock belongs to visible respiration, independently of roaming:
      // inspecting a sleeping cat must not freeze it or advance its routine.
      const breath=offset=>{const phase=((breathTime-offset)/(nap>.5?4.6:3.9)%1+1)%1;return phase<.38?(1-Math.cos(phase/.38*Math.PI))/2:(1+Math.cos((phase-.38)/.62*Math.PI))/2;};
      for(const [i,{bone,base}]of breathBones.entries()){const rise=breath(i===0?.18:0)*(1-blend*.65);bone.scale.copy(base);bone.scale.x*=1+rise*(i===0?.014:.018);bone.scale.z*=1+rise*(i===0?.028:.038);}
    }
    grounder?.apply(groundDt,(model?.position.y||0)-modelBaseY,nap>.1);
  }
  function resetExpression(){sleepPose?.reset();for(const {bone,base} of expressionBones)bone.quaternion.copy(base);}
  function update(seconds,{active=false,interactive=false,ambient=false,interactionSeconds=seconds}={}) {
    if(disposed||!loaded){clock.reset();return;}
    if((active||interactive||ambient)&&Number.isFinite(seconds))breathTime+=Math.min(.12,Math.max(0,seconds));
    grounder?.reset();
    if(!active&&!interactive){
      clock.reset();
      if(wasActive){blend=0;for(const {bone,base,lower,lowerBase,foot,footBase} of bones){bone.quaternion.copy(base);if(lower)lower.quaternion.copy(lowerBase);if(foot)foot.quaternion.copy(footBase);}mixer?.update(0);}
      resetExpression();expression();
      wasActive=false;return;
    }
    // A deliberate call must keep its visible pace on a slow renderer. The
    // room's .12s visual-delta cap should not stretch a 2.6s wake into minutes.
    // The resident clock still bounds catch-up to 2s in <=40ms safe steps;
    // ordinary routines and ambient breathing retain their original clock.
    const interacting=state.interaction&&!state.interaction.instant;
    const elapsed=interacting&&Number.isFinite(interactionSeconds)?Math.max(seconds,interactionSeconds):seconds;
    wasActive=true;const dt=clock.advance(elapsed,true,step=>{
      const before=state.interaction?.stage;state=adapter.step(state,step);
      if(before==='approach'&&state.interaction?.stage==='near')onChange('arrived');
      if(before==='respond'&&!state.interaction)onChange('petted');
    });pose();
    const walking=state.phase==='walk'&&state.speed>.01;
    blend+=(Number(walking)-blend)*Math.min(1,dt*8);
    for(const {bone,base,lower,lowerBase,foot,footBase} of bones){bone.quaternion.copy(base);if(lower)lower.quaternion.copy(lowerBase);if(foot)foot.quaternion.copy(footBase);}resetExpression();
    if(mixer){mixer.timeScale=state.phase==='sleep'?.08:state.phase==='rest'?.3:1;idle.setEffectiveWeight(state.phase==='sleep'?0:1-blend*.85);mixer.update(dt);}
    for(const {bone,base,phase,lower,lowerBase,foot,footBase} of bones){
      if(blend>.001){
        const cycle=Math.sin(state.gait+phase);rotation.setFromAxisAngle(axis,cycle*(natural?.26:.34)*blend);
        bone.quaternion.copy(base).multiply(rotation);
        if(lower){rotation.setFromAxisAngle(axis,Math.max(0,-cycle)*.34*blend);lower.quaternion.copy(lowerBase).multiply(rotation);}
        if(foot){rotation.setFromAxisAngle(axis,-cycle*.12*blend);foot.quaternion.copy(footBase).multiply(rotation);}
      }
    }
    expression(dt);
    // A very slight breathing movement belongs to the animal, never the camera.
    shadow.material.opacity=state.phase==='rest'?.9:1;
  }
  function interact(kind,visitor,options={}){
    clock.reset();
    if(disposed||!loaded){onChange('unavailable');return false;}
    grounder?.reset();const next=adapter.request(state,kind,visitor,options);state=next.state;attention=true;pose();resetExpression();expression();onChange(next.result);wake();return next.result;
  }
  function settle(){clock.reset();if(!state.interaction)return;grounder?.reset();const pending=['wake','approach'].includes(state.interaction.stage),pet=state.interaction.kind==='pet';state=adapter.settle(state);pose();resetExpression();expression();if(pet)onChange('petted-still');else if(pending)onChange('noticed');}
  function attend(visitor){clock.reset();if(!loaded||disposed||!Number.isFinite(visitor?.x)||!Number.isFinite(visitor?.z))return;grounder?.reset();state=adapter.attend?adapter.attend(state,visitor):{...state,yaw:Math.atan2(visitor.x-state.x,visitor.z-state.z),speed:0};attention=true;pose();resetExpression();expression();wake();}
  function view(aspect,yaw=state.yaw){
    const {x:width,y:height,z:depth,minY}=bodyBounds||{x:.3,y:.45,z:.62,minY:.014},tangent=Math.tan(42*Math.PI/360),distance=Math.max((height+.08)/(2*tangent*.54),(width+.08)/(2*tangent*Math.max(.25,aspect)*.64))+depth*.55;
    return {position:[state.x+Math.sin(yaw)*distance,minY+(grounder?anchor.position.y:0)+height*.68,state.z+Math.cos(yaw)*distance],target:[state.x,minY+(grounder?anchor.position.y:0)+height*.43,state.z],fov:42};
  }
  function dispose() {
    if(disposed)return;disposed=true;loadAbort.abort();clock.reset();
    grounder?.dispose();mixer?.stopAllAction();if(model)mixer?.uncacheRoot(model);
    anchor.removeFromParent();releaseOwned();
  }
  // Thin decorative whiskers use LineSegments. Three's default line raycast
  // tolerance is one metre, so only actual mesh surfaces may select the cat.
  return {ready,update,interact,attend,settle,view,dispose,setRoutine(routine){if(['nap','explore'].includes(routine))state={...state,routine};},resetClock:clock.reset,hit(raycaster){return loaded&&!disposed?(raycaster.intersectObject(model,true).find(hit=>hit.object.isMesh)||null):null;},get breathing(){return {time:breathTime,chest:breathBones[1]?.bone.scale.z||1,belly:breathBones[0]?.bone.scale.z||1};},get pending(){return !disposed&&Boolean(state.interaction&&!state.interaction.instant&&(state.interaction.stage==='approach'||state.interaction.remaining>0));},get loaded(){return loaded&&!disposed;},snapshot(){return {...state,loaded:loaded&&!disposed};}};
}
