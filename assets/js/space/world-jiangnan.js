import * as THREE from 'three';
import {CSS3DRenderer,CSS3DObject} from '../vendor/CSS3DRenderer.js';
import {createWorldMaterials} from './world-materials.js';
import {worldRenderBudget,worldPixelRatio} from './world-render-budget.mjs';
import {travelPose} from './world-state.mjs';
import {JIANGNAN_ENTRY,JIANGNAN_TARGETS,jiangnanLook,jiangnanWalk,canJiangnanNavigate} from './jiangnan-state.mjs';
import {buildJiangnanRoom} from './jiangnan-room.js';
import {buildJiangnanExterior} from './jiangnan-exterior.js';
import {mountRoomAudio} from './room-audio.js';

export function createCafeWorld({root,onComputer,onPhoto,onDetail,onInspect,onCat,onFailure,onTravel,isBlocked=()=>false,materialBase,photoAsset,books=[]}) {
  const abort=new AbortController(),resources=new Set(),textures=new Set(),anchors=[];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),zh=document.documentElement.lang.startsWith('zh'),t=(cn,en)=>zh?cn:en;
  let renderer,css,scene,camera,host,workspace,cssObject,pbr,room,exterior,audio,objectControls,observer,blockedObserver,hiddenObserver;
  let disposed=false,mode='roam',quiet=false,frame=0,last=0,environmentTime=0,frames=0,moving=null,drag=null,inspection=null,reflectionDone=false,firstPending=true,resolveFirst,firstTimer;
  let pose={...JIANGNAN_ENTRY},returnPose={...pose};const keys=new Set(),touchKeys=new Set();
  const firstFrame=new Promise(resolve=>{resolveFirst=resolve;});
  const settleFirst=value=>{if(firstPending){firstPending=false;clearTimeout(firstTimer);resolveFirst(value);}};
  const listen=(el,name,fn,options={})=>el.addEventListener(name,fn,{...options,signal:abort.signal});
  const outsideButton=root.querySelector('[data-cafe-outside]'),outsideLabel=outsideButton?.textContent;
  const startTime=performance.now();
  const targets={...JIANGNAN_TARGETS,bridge:[-7,1.2,-13]};
  const visible=()=>!document.hidden&&!root.hidden;
  const navigate=()=>canJiangnanNavigate({mode,visible:visible(),blocked:isBlocked()});
  function stop(){cancelAnimationFrame(frame);frame=0;last=0;}
  function wake(){if(!disposed&&renderer&&visible()&&!frame)frame=requestAnimationFrame(tick);}
  function applyPose(next){pose={...next};camera.position.set(pose.x,pose.y,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');if(camera.fov!==pose.fov){camera.fov=pose.fov;camera.updateProjectionMatrix();}root.dataset.worldPose=JSON.stringify(Object.fromEntries(Object.entries(pose).map(([key,value])=>[key,+value.toFixed(5)])));}
  function syncMode(next){mode=next;root.dataset.worldMode=next;if(objectControls)objectControls.inert=next!=='roam';keys.clear();touchKeys.clear();drag=null;}
  function attachMonitor(){
    const active=document.activeElement;
    if(workspace.dataset.surface==='desktop'&&(workspace.contains(active)||active===document.body))renderer.domElement.focus({preventScroll:true});
    cssObject?.removeFromParent();workspace.remove();
    Object.assign(workspace.style,{width:'1280px',height:'800px',left:'',top:'',visibility:'visible',display:'',transform:''});
    workspace.dataset.surface='monitor';workspace.inert=true;workspace.setAttribute('aria-hidden','true');
    cssObject=new CSS3DObject(workspace);cssObject.position.fromArray(room.screen.position);cssObject.scale.setScalar(room.screen.width/1280);scene.add(cssObject);
    // CSS3DRenderer reparents into its camera on the next frame. Keep the live
    // workspace connected now: desktop events can run before that frame.
    css.domElement.append(workspace);
  }
  function attachDesktop(){
    cssObject?.removeFromParent();cssObject=null;root.append(workspace);workspace.dataset.surface='desktop';workspace.inert=false;workspace.setAttribute('aria-hidden','false');
    Object.assign(workspace.style,{left:'0',top:'0',width:root.clientWidth+'px',height:root.clientHeight+'px',transform:'none',display:'',visibility:'visible'});
  }
  function cancelTravel(){if(!moving)return;const previous=moving;moving=null;root.dataset.worldTravel='false';onTravel?.(false);previous.resolve(false);}
  function finishTravel(){if(!moving)return;const previous=moving;moving=null;applyPose(previous.to);previous.finish?.();root.dataset.worldTravel='false';onTravel?.(false);previous.resolve(true);wake();}
  function travel(to,duration=850,finish){
    cancelTravel();root.dataset.worldTravel='true';onTravel?.(true);keys.clear();touchKeys.clear();
    if(quiet||reduced.matches||duration===0){applyPose(to);finish?.();root.dataset.worldTravel='false';onTravel?.(false);wake();return Promise.resolve(true);}
    return new Promise(resolve=>{moving={from:{...pose},to:{...to},elapsed:0,duration,finish,resolve};wake();});
  }
  const entry=()=>root.clientWidth<700?jiangnanLook([-1.3,1.5,.9],[1.8,1.15,-1.5],72):jiangnanLook([-1.3,1.5,.9],[1.15,1.23,-1.55],58);
  function resetInspection(){inspection=null;delete root.dataset.worldInspect;onInspect?.(null);}
  function start({animate=true,focus=false}={}){resetInspection();if(workspace.dataset.surface==='desktop')attachMonitor();syncMode('roam');const pending=travel(entry(),animate?850:0);if(focus)renderer.domElement.focus({preventScroll:true});return pending;}
  function focus(animate=true){
    if(mode==='workspace'&&!moving)return Promise.resolve(true);
    if(mode==='roam'||mode==='inspect')returnPose=inspection?.pose||{...pose};resetInspection();syncMode('workspace');
    return travel(jiangnanLook([1.45,1.43,-.65],JIANGNAN_TARGETS.computer,42),animate?850:0,attachDesktop);
  }
  function leave(){const previous=document.activeElement;resetInspection();attachMonitor();syncMode('roam');const pending=travel(returnPose,800);pending.then(()=>{if(!disposed&&[previous,document.body].includes(document.activeElement))renderer.domElement.focus({preventScroll:true});});return pending;}
  function outside(){resetInspection();if(workspace.dataset.surface==='desktop')attachMonitor();syncMode('roam');return travel(jiangnanLook([-.65,1.55,-2.08],[0,1.1,-20],62),1000);}
  function inspect(kind){
    if(!['coffee','books','spines'].includes(kind)||isBlocked()||!['roam','inspect'].includes(mode))return Promise.resolve(false);
    if(!inspection)inspection={pose:{...pose},kind};else inspection.kind=kind;
    syncMode('inspect');root.dataset.worldInspect=kind;onInspect?.(kind);
    const view=kind==='coffee'?jiangnanLook([.2,1.25,-.35],JIANGNAN_TARGETS.coffee,39):jiangnanLook([-1.45,1.43,-.9],JIANGNAN_TARGETS.books,kind==='spines'?29:44);
    return travel(view,700);
  }
  function restoreInspection(){if(!inspection)return Promise.resolve(false);const previous=inspection.pose;resetInspection();syncMode('roam');return travel(previous,650);}
  function setQuiet(value){quiet=value;audio?.setQuiet(value);if(value)finishTravel();last=0;wake();}
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),direction=new THREE.Vector3();
  function action(object){for(let node=object;node;node=node.parent)if(node.userData.action)return node.userData.action;return null;}
  function activate(kind,source=renderer.domElement){
    if(!navigate())return;
    if(kind==='computer')onComputer?.();
    else if(kind==='photo'){const data=JSON.parse(root.querySelector('[data-space-catalog]').textContent);onPhoto?.(data.photos?.[0]?.id);}
    else if(kind)onDetail?.(kind,source);
  }
  function hit(event){const b=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-b.left)/b.width*2-1,-(event.clientY-b.top)/b.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(room.group.children,true).find(h=>h.object.visible&&(!h.object.material?.transparent||h.object.material.opacity>.5));}
  function screenVisibility(){
    if(!cssObject)return;scene.updateMatrixWorld();
    const center=new THREE.Vector3().fromArray(room.screen.position),front=camera.position.z>center.z+.03;
    direction.copy(center).sub(camera.position);const distance=direction.length();ray.set(camera.position,direction.normalize());
    const obstructed=front&&ray.intersectObjects(room.group.children,true).some(h=>h.distance<distance-.025&&action(h.object)!=='computer'&&!h.object.material?.transparent);
    const v=center.clone().project(camera),shown=front&&!obstructed&&v.z<1&&v.z>-1;cssObject.visible=shown;root.dataset.worldScreenVisible=String(shown);
  }
  function resize(){
    if(disposed||!renderer)return;const width=root.clientWidth||innerWidth,height=root.clientHeight||innerHeight;
    camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setPixelRatio(worldPixelRatio(width,height,devicePixelRatio,worldRenderBudget(renderer.getContext())));renderer.setSize(width,height);css.setSize(width,height);
    if(workspace?.dataset.surface==='desktop')Object.assign(workspace.style,{width:width+'px',height:height+'px'});wake();
  }
  function reflectRoom(){
    reflectionDone=true;const cube=new THREE.WebGLCubeRenderTarget(128),capture=new THREE.CubeCamera(.05,30,cube),generator=new THREE.PMREMGenerator(renderer),shadows=renderer.shadowMap.enabled;
    try{renderer.shadowMap.enabled=false;exterior.group.visible=false;capture.position.set(.1,1.45,-.2);scene.add(capture);capture.update(renderer,scene);const env=generator.fromCubemap(cube.texture);resources.add(env);room.group.traverse(o=>{const list=Array.isArray(o.material)?o.material:[o.material];for(const material of list)if(material?.isMeshStandardMaterial){material.envMap=env.texture;material.envMapIntensity=.35;material.needsUpdate=true;}});}catch{/* Direct practical lights remain usable without reflections. */}
    finally{capture.removeFromParent();cube.dispose();generator.dispose();exterior.group.visible=true;renderer.shadowMap.enabled=shadows;renderer.shadowMap.needsUpdate=true;}
  }
  function tick(stamp){
    frame=0;if(disposed||!visible())return;const delta=last?Math.min((stamp-last)/1000,.12):0;last=stamp;
    const environmentActive=!quiet&&!reduced.matches&&!isBlocked()&&mode!=='workspace';
    if(environmentActive)environmentTime+=delta;
    if(moving){moving.elapsed+=delta*1000;const progress=Math.min(1,moving.elapsed/moving.duration);applyPose(travelPose(moving.from,moving.to,progress));if(progress===1)finishTravel();}
    else if(navigate()&&(keys.size||touchKeys.size)){
      const has=(...codes)=>codes.some(c=>keys.has(c)||touchKeys.has(c));const input={forward:Number(has('KeyW','ArrowUp','forward'))-Number(has('KeyS','ArrowDown','back')),right:Number(has('KeyD','ArrowRight','right'))-Number(has('KeyA','ArrowLeft','left'))};
      for(let left=delta;left>0;left-=.04)pose=jiangnanWalk(pose,input,Math.min(.04,left));applyPose(pose);
    }
    room.update(environmentTime);exterior.update(environmentTime);
    const readyMaps=Number(root.dataset.worldPbrMaps)>=5||performance.now()-startTime>2200;
    if(!reflectionDone&&readyMaps&&!Number.isFinite(worldRenderBudget(renderer.getContext()).maxPixels))reflectRoom();
    try{screenVisibility();renderer.render(scene,camera);css.render(scene,camera);}catch(error){settleFirst(false);onFailure?.();return;}
    root.dataset.worldFrames=String(++frames);root.dataset.worldTriangles=String(renderer.info.render.triangles);root.dataset.worldDraws=String(renderer.info.render.calls);root.dataset.worldRenderedMode=mode;
    root.dataset.roomBoatPose=JSON.stringify([+exterior.boat.position.x.toFixed(3),+exterior.boat.position.y.toFixed(3),+exterior.boat.position.z.toFixed(3)]);root.dataset.roomBoat='ready';root.dataset.worldEnvironmentTime=environmentTime.toFixed(3);
    if(readyMaps){root.dataset.worldReady='true';settleFirst(true);}
    if(!disposed&&(moving||environmentActive||navigate()&&(keys.size||touchKeys.size)))frame=requestAnimationFrame(tick);else last=0;
  }
  function visibility(){stop();keys.clear();touchKeys.clear();drag=null;if(visible())wake();}
  function dispose(){
    if(disposed)return;disposed=true;stop();cancelTravel();clearTimeout(firstTimer);abort.abort();observer?.disconnect();blockedObserver?.disconnect();hiddenObserver?.disconnect();audio?.dispose();
    cssObject?.removeFromParent();for(const [node,anchor] of anchors)if(anchor.isConnected)anchor.replaceWith(node);workspace?.remove();pbr?.dispose();for(const object of resources)object.dispose?.();for(const map of textures)map.dispose();renderer?.dispose();renderer?.forceContextLoss();host?.remove();settleFirst(false);
    if(outsideButton)outsideButton.textContent=outsideLabel;
    for(const key of ['worldRenderer','worldScreenVisible','worldTargets','worldEnvironmentTime','roomBoat','roomBoatPose'])delete root.dataset[key];
  }
  try {
    renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    const budget=worldRenderBudget(renderer.getContext()),software=Number.isFinite(budget.maxPixels);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
    scene=new THREE.Scene();scene.background=new THREE.Color('#192a3c');scene.fog=new THREE.FogExp2('#273d50',.019);camera=new THREE.PerspectiveCamera(63,1,.04,160);camera.rotation.order='YXZ';
    host=document.createElement('div');host.className='space-world space-world--jiangnan';root.prepend(host);renderer.domElement.className='space-world__canvas';renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label',t('三维咖啡馆。拖动环视，方向键或 WASD 行走，点击电脑和相框。','3D café. Drag to look, arrows or WASD to walk. Click the Mac or photograph.'));renderer.domElement.setAttribute('aria-describedby','jiangnan-controls');host.append(renderer.domElement);
    const guidance=document.createElement('p');guidance.id='jiangnan-controls';guidance.className='jiangnan-guidance';guidance.textContent=t('拖动环视，方向键或 WASD 移动。','Drag to look. Arrows or WASD to walk.');host.append(guidance);
    objectControls=document.createElement('nav');objectControls.className='jiangnan-object-controls';objectControls.setAttribute('aria-label',t('房间里的物件','Objects in the room'));host.append(objectControls);
    for(const [kind,label]of [['computer',t('使用桌上的电脑','Use the Mac')],['photo',t('查看相框里的照片','View the framed photograph')],['coffee',t('看看桌上的咖啡','Look at the coffee')],['books',t('走近书架','Browse the bookshelf')]]){const button=document.createElement('button');button.type='button';button.dataset.roomObject=kind;button.textContent=label;listen(button,'click',()=>activate(kind,button));objectControls.append(button);}
    css=new CSS3DRenderer();css.domElement.className='space-world__css';css.domElement.style.pointerEvents='none';host.append(css.domElement);
    root.dataset.worldRenderer='jiangnan';root.dataset.worldTheme='jiangnan';root.dataset.worldTargets=JSON.stringify(targets);root.dataset.worldPbrMaps='0';root.dataset.worldTravel='false';
    pbr=createWorldMaterials({base:materialBase,renderer,resources,textures,isDisposed:()=>disposed,wake,root});
    scene.add(new THREE.HemisphereLight('#9eb9d2','#4d3525',1.15));const moon=new THREE.DirectionalLight('#b2cce8',1.25);moon.position.set(-8,15,-18);scene.add(moon);
    const windowFill=new THREE.DirectionalLight('#88aaca',.7);windowFill.position.set(6,9,6);scene.add(windowFill);
    const key=new THREE.SpotLight('#ffd3a0',25,9,1.15,.8,2);key.position.set(-.5,2.68,.35);key.target.position.set(1,.3,-1.4);key.castShadow=true;key.shadow.mapSize.setScalar(budget.shadowSize);key.shadow.bias=-.00008;key.shadow.normalBias=.025;scene.add(key,key.target);
    room=buildJiangnanRoom({scene,pbr,resources,textures,wake,photoAsset,books,zh,isDisposed:()=>disposed});exterior=buildJiangnanExterior({scene,pbr,resources,textures,software});
    if(software)room.group.traverse(o=>{if(o.isPointLight)o.castShadow=false;});
    workspace=document.createElement('div');workspace.className='space-spatial-screen jiangnan-workspace';workspace.setAttribute('aria-label','CUBXXW OS');
    for(const node of [root.querySelector('[data-space-windows]'),root.querySelector('[data-space-snap]'),root.querySelector('.space-bottom'),root.querySelector('.space-menu')]){const anchor=document.createComment('jiangnan workspace return');node.before(anchor);anchors.push([node,anchor]);workspace.append(node);}
    attachMonitor();const catalog=JSON.parse(root.querySelector('[data-cafe-catalog]').textContent);audio=mountRoomAudio({root,assets:catalog.night,zh});
    if(outsideButton)outsideButton.textContent=t('去窗边看看 ↗','Look out the window ↗');onCat?.('unavailable');
    listen(renderer.domElement,'pointerdown',event=>{if(!navigate()||event.button!==0)return;cancelTravel();drag={id:event.pointerId,x:event.clientX,y:event.clientY,distance:0};renderer.domElement.setPointerCapture(event.pointerId);});
    listen(renderer.domElement,'pointermove',event=>{if(!drag){if(navigate())renderer.domElement.style.cursor=action(hit(event)?.object)?'pointer':'grab';return;}const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag.distance+=Math.abs(dx)+Math.abs(dy);drag.x=event.clientX;drag.y=event.clientY;if(!navigate())return;applyPose({...pose,yaw:pose.yaw-dx*.0035,pitch:Math.max(-.9,Math.min(.85,pose.pitch-dy*.003))});wake();});
    listen(renderer.domElement,'pointerup',event=>{if(drag?.id!==event.pointerId)return;const click=drag.distance<6;drag=null;if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);if(click&&navigate())activate(action(hit(event)?.object));});
    listen(renderer.domElement,'pointercancel',()=>{drag=null;});
    listen(document,'keydown',event=>{if(!navigate()||event.metaKey||event.ctrlKey||event.altKey||event.target.closest('input,textarea,[contenteditable="true"]'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();cancelTravel();keys.add(event.code);wake();}});
    listen(document,'keyup',event=>keys.delete(event.code));listen(window,'blur',()=>{keys.clear();touchKeys.clear();drag=null;});
    for(const button of root.querySelectorAll('[data-world-walk]')){listen(button,'pointerdown',event=>{if(!navigate())return;event.preventDefault();cancelTravel();touchKeys.add(button.dataset.worldWalk);button.setPointerCapture(event.pointerId);wake();});for(const name of ['pointerup','pointercancel','lostpointercapture'])listen(button,name,()=>touchKeys.delete(button.dataset.worldWalk));}
    listen(document,'visibilitychange',visibility);listen(reduced,'change',()=>{if(reduced.matches)finishTravel();last=0;wake();});listen(renderer.domElement,'webglcontextlost',event=>{event.preventDefault();stop();settleFirst(false);onFailure?.();});
    hiddenObserver=new MutationObserver(visibility);hiddenObserver.observe(root,{attributes:true,attributeFilter:['hidden']});
    blockedObserver=new MutationObserver(()=>{if(isBlocked()){keys.clear();touchKeys.clear();drag=null;}wake();});blockedObserver.observe(root,{attributes:true,subtree:true,attributeFilter:['open','hidden']});
    observer=new ResizeObserver(resize);observer.observe(root);pose=entry();returnPose={...pose};applyPose(pose);syncMode('roam');resize();renderer.shadowMap.needsUpdate=true;
    firstTimer=setTimeout(wake,2300);wake();
  } catch(error){dispose();throw error;}
  return {firstFrame,start,focus,leave,outside,inspect,restoreInspection,setQuiet,wake,setTheme(){return true;},interactCat(){return false;},get mode(){return mode;},dispose};
}
