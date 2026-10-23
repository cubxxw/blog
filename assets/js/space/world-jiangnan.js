import * as THREE from 'three';
import {movePreservingState} from '../dom-transfer.mjs';
import {createWorkspaceScrollState} from './workspace-scroll-state.mjs';
import {createJiangnanRoomLights} from './jiangnan-lighting.mjs';
import {CSS3DRenderer,CSS3DObject} from '../vendor/CSS3DRenderer.js';
import {createWorldMaterials} from './world-materials.js';
import {worldRenderBudget,worldPixelRatio} from './world-render-budget.mjs';
import {createJiangnanCameraMove} from './jiangnan-camera-motion.mjs';
import {JIANGNAN_ENTRY,JIANGNAN_TARGETS,jiangnanLook,jiangnanWalk,jiangnanDestination,canJiangnanNavigate} from './jiangnan-state.mjs';
import {createJiangnanTime,watchJiangnanWeather} from './jiangnan-time.mjs';
import {jiangnanWindowView,clampJiangnanWindowLook,jiangnanWindowRoute} from './jiangnan-window-view.mjs';
import {mountMagicClock} from './magic-clock.js';
import {buildJiangnanRoom} from './jiangnan-room.js';
import {buildJiangnanExterior} from './jiangnan-exterior.js';
import {mountRoomAudio} from './room-audio.js';
import {createRecordCatalog} from './record-catalog.js';
import {createJiangnanResident} from './jiangnan-cat.js';
import {buildJiangnanDoor} from './jiangnan-door.js';
import {createJiangnanDoorExcursion,jiangnanDoorPoses} from './jiangnan-door-state.mjs';
import {createJiangnanDoorFade} from './jiangnan-door-fade.mjs';
import {createPracticalLightRamp} from './jiangnan-practical-light.mjs';

export function createCafeWorld({root,onComputer,onPhoto,onDetail,onInspect,onCat,onFailure,onTravel,onReturn,onNotebook,isBlocked=()=>false,materialBase,photoAsset,books=[]}) {
  const abort=new AbortController(),resources=new Set(),textures=new Set(),anchors=[];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),zh=document.documentElement.lang.startsWith('zh'),t=(cn,en)=>zh?cn:en;
  let renderer,css,scene,camera,host,workspace,cssObject,pbr,room,exterior,audio,resident,objectControls,computerExpand,observer,blockedObserver,hiddenObserver,depthBlur,roomLights,stopWeather,magicClock;
  let clockReturn=null,standbyClock=null,lastHover=0;
  let clockStorage;try{clockStorage=localStorage;}catch{}
  const parameters=new URLSearchParams(location.search),previewHour=/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&parameters.has('room-hour')?Number(parameters.get('room-hour')):undefined;
  const roomTime=createJiangnanTime({storage:clockStorage,startHour:previewHour});
  let disposed=false,mode='roam',quiet=false,frame=0,last=0,environmentTime=0,frames=0,moving=null,drag=null,inspection=null,reflectionDone=false,firstPending=true,resolveFirst,firstTimer;
  let pose={...JIANGNAN_ENTRY},returnPose={...pose},returnInspection=null;const keys=new Set(),touchKeys=new Set();
  const firstFrame=new Promise(resolve=>{resolveFirst=resolve;});
  const settleFirst=value=>{if(firstPending){firstPending=false;if(!value||reflectionDone)clearTimeout(firstTimer);resolveFirst(value);}};
  const listen=(el,name,fn,options={})=>el.addEventListener(name,fn,{...options,signal:abort.signal});
  const outsideButton=root.querySelector('[data-cafe-outside]'),outsideLabel=outsideButton?.textContent;
  const startTime=performance.now();
  const targets={...JIANGNAN_TARGETS,bridge:[-3.2,1.2,-17.8]};
  let readingPage=false,lastSwitchState='',ignoreOpeningClick=false;const touchPoints=new Map();let pinchStart=0,pinchUsed=false;
  let doorReturn=null,doorPanel=null,doorWater=null,doorExit=null;
  const doorFade=createJiangnanDoorFade({still:()=>quiet||reduced.matches,onChange:opacity=>{if(doorWater)doorWater.style.opacity=String(opacity);}});
  const excursion=createJiangnanDoorExcursion({onPhase:phase=>{root.dataset.roomDoorState=phase;doorFade.setPhase(phase,{at:performance.now()/1000});wake();},still:()=>quiet||reduced.matches});
  const records=createRecordCatalog();
  const workspaceScroll=createWorkspaceScrollState();
  const visible=()=>!document.hidden&&!root.hidden&&!readingPage;
  const navigate=()=>canJiangnanNavigate({mode,visible:visible(),blocked:isBlocked()});
  const roomView=()=>inspection?.kind==='window';
  const canLook=()=>navigate()||mode==='inspect'&&['window','clock'].includes(inspection?.kind)&&visible()&&!isBlocked();
  function stop(){cancelAnimationFrame(frame);frame=0;last=0;if(moving)moving.started=null;}
  function wake(){if(!disposed&&renderer&&visible()&&!frame)frame=requestAnimationFrame(tick);}
  function applyPose(next){pose={...next};camera.position.set(pose.x,pose.y,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');if(camera.fov!==pose.fov){camera.fov=pose.fov;camera.updateProjectionMatrix();}root.dataset.worldPose=JSON.stringify(Object.fromEntries(Object.entries(pose).map(([key,value])=>[key,+value.toFixed(5)])));}
  function syncMode(next){mode=next;root.dataset.worldMode=next;if(objectControls)objectControls.inert=next!=='roam';keys.clear();touchKeys.clear();drag=null;}
  const computerView=()=>['framed','expanded'].includes(root.dataset.computerView)?root.dataset.computerView:root.dataset.computerDefault==='framed'?'framed':'expanded';
  function surfaceChanged(){root.dispatchEvent(new CustomEvent('space:surfacechange'));}
  function rememberFocus(){
    const active=document.activeElement;if(!workspace.contains(active))return()=>{};
    const selection=typeof active.selectionStart==='number'?[active.selectionStart,active.selectionEnd,active.selectionDirection]:null;
    const selected=window.getSelection(),ranges=!selection&&selected?.anchorNode&&workspace.contains(selected.anchorNode)?Array.from({length:selected.rangeCount},(_,i)=>selected.getRangeAt(i).cloneRange()):[];
    return()=>{if(!active.isConnected||active.closest('[inert],[hidden]')||!active.getClientRects().length)return;active.focus({preventScroll:true});if(selection)active.setSelectionRange(...selection);if(ranges.length){selected.removeAllRanges();for(const range of ranges)selected.addRange(range);}};
  }
  function clearScreenBounds(){
    delete root.dataset.computerScreenBounds;
    for(const name of ['left','top','width','height'])root.style.removeProperty('--computer-'+name);
  }
  function screenBounds(){
    if(workspace.dataset.surface!=='computer'){clearScreenBounds();return;}
    camera.updateMatrixWorld();
    const [x,y,z]=room.screen.position,halfWidth=room.screen.width/2,halfHeight=room.screen.height/2;
    const points=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([dx,dy])=>new THREE.Vector3(x+dx*halfWidth,y+dy*halfHeight,z).project(camera));
    const xs=points.map(p=>(p.x+1)*root.clientWidth/2),ys=points.map(p=>(1-p.y)*root.clientHeight/2);
    const bounds={x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
    root.dataset.computerScreenBounds=JSON.stringify(Object.fromEntries(Object.entries(bounds).map(([key,value])=>[key,+value.toFixed(3)])));
    for(const [name,value]of Object.entries({left:bounds.x,top:bounds.y,width:bounds.width,height:bounds.height}))root.style.setProperty('--computer-'+name,value+'px');
    if(!cssObject)Object.assign(workspace.style,{left:bounds.x+'px',top:bounds.y+'px',width:'1280px',height:'800px',transformOrigin:'0 0',transform:`scale(${bounds.width/1280},${bounds.height/800})`});
  }
  function attachScreen(surface){
    cssObject?.removeFromParent();
    workspace.dataset.surface=surface;workspace.inert=surface==='monitor';workspace.setAttribute('aria-hidden',String(surface==='monitor'));
    let element=workspace;
    if(surface==='monitor'&&typeof root.moveBefore!=='function'&&workspace.querySelector('iframe')){
      // Older engines reload a live iframe even when only its ancestor moves.
      // Park the real desktop in place and show a quiet standby screen outside.
      if(workspace.parentNode!==root)movePreservingState(root,workspace);
      workspace.style.visibility='hidden';
      element=document.createElement('div');element.className='jiangnan-monitor-standby';element.setAttribute('aria-hidden','true');element.inert=true;
      standbyClock=document.createElement('time');standbyClock.textContent=roomTime.at().label;element.append(standbyClock);root.dataset.worldScreenPreview='standby';
    }else{
      Object.assign(workspace.style,{width:'1280px',height:'800px',left:'',top:'',visibility:'visible',display:'',transform:'',transformOrigin:'',userSelect:'auto'});
      root.dataset.worldScreenPreview='live';
    }
    Object.assign(element.style,{width:'1280px',height:'800px'});
    cssObject=new CSS3DObject(element);cssObject.userData.preserveElement=element===workspace;element.style.userSelect='auto';if(element!==workspace)element.style.pointerEvents='none';cssObject.position.fromArray(room.screen.position);cssObject.scale.setScalar(room.screen.width/1280);scene.add(cssObject);
    // Keep the original app nodes connected before the renderer's next frame.
    movePreservingState(css.domElement,element);
  }
  function attachMonitor(){
    if(['desktop','computer'].includes(workspace.dataset.surface))workspaceScroll.capture(workspace);
    const active=document.activeElement;
    if(['desktop','computer'].includes(workspace.dataset.surface)&&(workspace.contains(active)||active===document.body))renderer.domElement.focus({preventScroll:true});
    attachScreen('monitor');clearScreenBounds();surfaceChanged();
  }
  function attachDesktop(){
    if(['desktop','computer'].includes(workspace.dataset.surface))workspaceScroll.capture(workspace);
    const restoreFocus=rememberFocus();
    cssObject?.removeFromParent();cssObject=null;if(workspace.parentNode!==root)movePreservingState(root,workspace);workspace.dataset.surface='desktop';workspace.inert=false;workspace.setAttribute('aria-hidden','false');
    Object.assign(workspace.style,{left:'0',top:'0',width:root.clientWidth+'px',height:root.clientHeight+'px',transform:'none',display:'',visibility:'visible'});
    root.dataset.worldScreenPreview='live';
    clearScreenBounds();surfaceChanged();restoreFocus();workspaceScroll.restore(workspace);
  }
  function framedPose(){
    // A level, seated view keeps pointer movement identical to the DOM axes.
    // Fit the complete monitor and its foot, including the nearest bezel edge.
    const [x,screenY,z]=room.screen.position,distance=.36/Math.tan(THREE.MathUtils.degToRad(20));
    // Widen the lens on narrow screens instead of moving behind the chair.
    const tangent=Math.max(.36,.515/camera.aspect)/distance,fov=THREE.MathUtils.radToDeg(2*Math.atan(tangent));
    return {x,y:screenY-.05,z:z+distance+.04,yaw:0,pitch:0,fov};
  }
  function attachComputer(){
    if(['desktop','computer'].includes(workspace.dataset.surface))workspaceScroll.capture(workspace);
    const restoreFocus=rememberFocus();
    // The seated camera faces the glass squarely. A flat DOM surface can use
    // its exact projected rectangle; Chromium's cross-origin frame hit tests
    // otherwise miss their targets beneath a CSS3D perspective ancestor.
    cssObject?.removeFromParent();cssObject=null;if(workspace.parentNode!==root)movePreservingState(root,workspace);workspace.dataset.surface='computer';workspace.inert=false;workspace.setAttribute('aria-hidden','false');
    Object.assign(workspace.style,{visibility:'visible',display:'',userSelect:'auto'});root.dataset.worldScreenVisible='true';
    root.dataset.worldScreenPreview='live';
    screenBounds();surfaceChanged();restoreFocus();workspaceScroll.restore(workspace);
  }
  function showComputer(view=computerView()){
    root.dataset.computerView=view;
    if(view==='framed'){applyPose(framedPose());attachComputer();}
    else attachDesktop();
    wake();
  }
  function changeComputerView(view){
    if(!['framed','expanded'].includes(view))return;
    root.dataset.computerView=view;
    if(mode==='workspace'){cancelTravel();showComputer(view);}
  }
  function cancelTravel(){if(!moving)return;const previous=moving;moving=null;root.dataset.worldTravel='false';onTravel?.(false);previous.resolve(false);}
  function finishTravel(){if(!moving)return;const previous=moving;moving=null;applyPose(previous.to);previous.finish?.();root.dataset.worldTravel='false';onTravel?.(false);previous.resolve(true);wake();}
  function travel(to,duration=850,finish,route=null){
    const velocity=moving?.motion.velocityAt(moving.elapsed)||{};
    cancelTravel();root.dataset.worldTravel='true';onTravel?.(true);keys.clear();touchKeys.clear();
    const unchanged=Object.keys(to).every(key=>Math.abs(to[key]-pose[key])<.00001);
    if(quiet||reduced.matches||duration===0||unchanged){applyPose(to);finish?.();root.dataset.worldTravel='false';onTravel?.(false);wake();return Promise.resolve(true);}
    const motion=createJiangnanCameraMove(pose,to,{route:route||jiangnanWindowRoute(pose,to),duration,velocity});
    return new Promise(resolve=>{moving={from:{...pose},to:{...to},motion,elapsed:0,started:visible()?performance.now():null,duration:motion.duration,finish,resolve};wake();});
  }
  const entry=()=>root.clientWidth<700?jiangnanLook([-.90,1.18,-.05],[.40,1.16,-1.94],root.clientWidth<350?58:56):Number.isFinite(worldRenderBudget(renderer.getContext()).maxPixels)?jiangnanLook([2.25,1.14,1.25],[.20,1.15,-1.65],THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(34))/camera.aspect))):jiangnanLook([1.20,1.34,1.65],[-.30,1.18,-1.40],Math.min(48,THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(42.5))/camera.aspect))));
  function resetInspection(){magicClock?.hide();inspection=null;delete root.dataset.worldInspect;onInspect?.(null);}
  function syncDoorStill(){const still=excursion.setStill(quiet||reduced.matches);doorFade.update(0);root.dataset.roomDoorStill=String(still);doorPanel?.classList.toggle('space-cafe-door--still',still);}
  function start({animate=true,focus=false}={}){abandonDoorExcursion();returnInspection=null;resetInspection();if(workspace.dataset.surface!=='monitor')attachMonitor();syncMode('roam');const pending=travel(entry(),animate?850:0);if(focus)renderer.domElement.focus({preventScroll:true});return pending;}
  function focus(animate=true){
    // A workspace shortcut may interrupt any door beat. Keep the place we
    // left indoors before abort clears it; the transient doorway/water camera
    // must never replace that workspace return destination.
    const beforeDoor=doorReturn;
    abandonDoorExcursion();
    if(mode==='workspace'&&!moving)return Promise.resolve(true);
    if(beforeDoor){
      returnPose={...beforeDoor.pose};
      returnInspection=beforeDoor.inspection?{...beforeDoor.inspection}:null;
    }else if(mode==='roam'||mode==='inspect'){
      returnInspection=roomView()?{...inspection}:null;
      returnPose=returnInspection?{...pose}:inspection?.pose||{...pose};
    }
    resetInspection();syncMode('workspace');
    const view=computerView();root.dataset.computerView=view;
    const [screenX,screenY,screenZ]=room.screen.position;
    return travel(view==='framed'?framedPose():jiangnanLook([screenX,screenY+.21,screenZ+1.165],room.screen.position,42),animate?850:0,()=>showComputer(view));
  }
  function leave(){abandonDoorExcursion();const previous=document.activeElement,rest=returnInspection;returnInspection=null;resetInspection();attachMonitor();syncMode(rest?'inspect':'roam');if(rest){inspection=rest;root.dataset.worldInspect=rest.kind;onInspect?.(rest.kind);if(rest.kind==='clock')magicClock?.show();}const pending=travel(returnPose,800);pending.then(()=>{if(!disposed&&[previous,document.body].includes(document.activeElement))renderer.domElement.focus({preventScroll:true});});return pending;}
  function outside(){abandonDoorExcursion();resetInspection();if(workspace.dataset.surface!=='monitor')attachMonitor();syncMode('roam');return travel(jiangnanLook([-.65,1.55,-2.08],[0,1.1,-20],62),1000);}
  const detailFamily=kind=>kind.startsWith('book:')?'books':kind.startsWith('record:')||kind==='vinyl'?'records':kind==='spines'?'books':kind;
  function inspect(kind){
    const family=detailFamily(kind);
    if(!['coffee','books','records','clock','vase','espresso','cat','window'].includes(family)||isBlocked()||!['roam','inspect'].includes(mode))return Promise.resolve(false);
    if(family==='cat'&&!resident?.loaded)return Promise.resolve(false);
    if(family!=='clock')magicClock?.hide();
    if(!inspection)inspection={pose:{...pose},kind};else inspection.kind=kind;
    syncMode('inspect');root.dataset.worldInspect=kind;onInspect?.(kind);
    let view;
    if(family==='window')view=jiangnanWindowView(camera.aspect);
    else if(family==='cat'){resident.attend(pose);const close=resident.view(camera.aspect);view=jiangnanLook(close.position,close.target,close.fov);}
    else if(family==='coffee')view=jiangnanLook([targets.coffee[0]-.35,targets.coffee[1]+.34,targets.coffee[2]+.93],targets.coffee,39);
    else if(family==='books')view=jiangnanLook([camera.aspect<.8?-1.05:-1.48,1.15,-.6],targets[kind]||targets.books,kind==='books'?49:38);
    else if(family==='records')view=jiangnanLook([camera.aspect<.8?-.8:-1.35,1.46,-.4],targets.vinyl, camera.aspect<.8?61:48);
    else if(family==='espresso')view=jiangnanLook([-1.4,1.48,-1.55],targets.espresso,camera.aspect<.8?59:45);
    else if(family==='clock'){view=jiangnanLook([-.60,1.35,-1.65],[.2,3,-20],camera.aspect<.8?65:52);magicClock.show();}
    else view=jiangnanLook([targets.vase[0]-.23,targets.vase[1]+.35,targets.vase[2]+1.38],targets.vase,camera.aspect<.8?54:39);
    return travel(view,family==='window'?1150:700,undefined,family==='window'?jiangnanWindowRoute(pose,view):null);
  }
  function restoreInspection(){if(!inspection)return Promise.resolve(false);const previous=inspection.pose,wasClock=inspection.kind==='clock',wasWindow=roomView(),route=wasWindow?jiangnanWindowRoute(pose,previous):null;resetInspection();syncMode('roam');const pending=travel(previous,wasWindow?1000:650,undefined,route);if(wasClock)pending.then(()=>{if(!disposed&&mode==='roam')renderer.domElement.focus({preventScroll:true});});return pending;}
  function syncRoomTime(){const day=roomTime.at();root.dataset.roomTime=JSON.stringify({...day,rate:10});audio?.setRainLevel(day.rain);magicClock?.update(day);wake();}
  function travelRoomTime(seconds){clockReturn=null;roomTime.travelTo(seconds,{persist:false});syncRoomTime();}
  function returnPresent(){
    if(quiet||reduced.matches){clockReturn=null;roomTime.returnNow();syncRoomTime();return;}
    const from=roomTime.at().unwrapped,target=roomTime.presentAt().unwrapped,span=((target-from+43200)%86400+86400)%86400-43200;
    clockReturn={from,span,at:performance.now()};wake();
  }
  function setQuiet(value){quiet=value;syncDoorStill();audio?.setQuiet(value);if(value){finishTravel();resident?.settle();}resident?.resetClock();last=0;wake();}
  function publishObjects(force=false){
    if(!room)return;const state=room.snapshotObjects?.();if(!state)return;
    root.dataset.roomObjects=JSON.stringify(state);
    const switches=JSON.stringify([state.lamp,state.fan,state['shelf-light'],state.espresso]);
    if(force||switches!==lastSwitchState){lastSwitchState=switches;root.dispatchEvent(new CustomEvent('space:roomobjects',{detail:state}));}
  }
  function toggleObject(kind){const state=room?.toggleObject?.(kind);if(state){renderer.shadowMap.needsUpdate=true;publishObjects(true);wake();}return state;}
  function selectRecord(id){return audio?.selectTrack(id);}
  function toggleMusic(){return audio?.toggle();}
  function interactCat(kind='pet'){if(!resident?.loaded)return false;const result=resident.interact(kind,pose,{instant:quiet||reduced.matches,nearby:mode==='inspect',now:performance.now()/1000});wake();return result;}
  function retreat(){if(mode==='inspect')return restoreInspection();if(mode==='workspace'&&computerView()==='framed'){onReturn?.();return true;}return false;}
  // The rear-door excursion is one localized, repeatable story. Every awaited
  // beat holds the machine's run token, so escape, scene switches and disposal
  // can interrupt anywhere — including mid-transition — and land safely back
  // in the warm room with the exact pre-door pose, mode, focus and music.
  function hideDoorPanel(){doorPanel?.remove();doorPanel=null;}
  function showDoorPanel(kind){
    hideDoorPanel();
    const panel=document.createElement('div');panel.className='space-cafe-door';panel.dataset.doorPanel=kind;
    panel.setAttribute('role','region');panel.setAttribute('aria-label',t(kind==='threshold'?'后门外':'落水小插曲',kind==='threshold'?'Outside the back door':'A little splash'));
    const note=document.createElement('p');note.className='space-cafe-door__note';
    const actions=document.createElement('div');actions.className='space-cafe-door__actions';
    const button=(label,action)=>{const node=document.createElement('button');node.type='button';node.textContent=label;listen(node,'click',action);return node;};
    if(kind==='threshold'){
      note.textContent=t('门外有夜风，还有一小片安静的蓝水。','Night air waits outside, over a quiet patch of blue water.');
      actions.append(button(t('到外面走一步','Take a step outside'),()=>stepOutOfDoor()),button(t('留在暖光里','Stay by the warm light'),()=>returnFromDoor()));
    }else{
      note.setAttribute('role','status');
      note.textContent=t('哎呀——水花小小的，鱼却都看见了。','A tidy little splash. The fish were impressed.');
      actions.append(button(t('回到咖啡馆','Back to the café'),()=>returnFromDoor()));
    }
    panel.append(note,actions);root.append(panel);doorPanel=panel;
    if(excursion.still)panel.classList.add('space-cafe-door--still');
    actions.querySelector('button')?.focus({preventScroll:true});
  }
  function restoreRoomFromDoor(){
    const back=doorReturn;doorReturn=null;
    hideDoorPanel();
    const rest=back?.inspection||null;
    if(rest){inspection={...rest};root.dataset.worldInspect=rest.kind;onInspect?.(rest.kind);if(rest.kind==='clock')magicClock?.show();}else resetInspection();
    syncMode(rest?'inspect':'roam');
    const trigger=back?.focus?.isConnected?back.focus:back?.trigger;
    if(trigger?.isConnected&&!trigger.closest('[inert]')&&trigger.getClientRects().length)trigger.focus({preventScroll:true});
    else renderer.domElement.focus({preventScroll:true});
  }
  async function travelOrRecover(run,to,duration){
    const arrived=await travel(to,duration);
    if(!arrived&&excursion.check(run))escapeDoorExcursion();
    // A resolved camera promise can resume after the tab was hidden. The
    // narrative's visibility gate prevents it revealing the next beat unseen.
    return arrived&&excursion.check(run)&&await excursion.wait(run,0);
  }
  async function resumeCafe(run){
    hideDoorPanel();
    audio?.setPerspective?.({music:1,rain:1});
    room?.door?.close?.();
    if(doorReturn&&!await travelOrRecover(run,doorReturn.pose,900))return;
    if(!excursion.check(run))return;
    restoreRoomFromDoor();
    excursion.advance(run,'indoor');
  }
  function returnFromDoor(){
    const run=excursion.token;
    if(!run||!excursion.advance(run,'returning'))return;
    void resumeCafe(run);
  }
  function escapeDoorExcursion(){
    const run=excursion.recover();
    if(!run)return false;
    void resumeCafe(run);
    return true;
  }
  function abandonDoorExcursion(){
    doorFade.setPhase('indoor',{instant:true});
    if(excursion.phase==='indoor')return false;
    excursion.abort();hideDoorPanel();doorReturn=null;
    audio?.setPerspective?.({music:1,rain:1});
    room?.door?.close?.({immediate:true});
    return true;
  }
  function beginDoorExcursion(source=renderer.domElement){
    if(isBlocked()||!visible()||!['roam','inspect'].includes(mode)||excursion.phase!=='indoor')return false;
    const run=excursion.begin();
    if(!run)return false;
    doorReturn={pose:{...pose},mode,inspection:inspection?{...inspection}:null,trigger:source instanceof Element?source:null,focus:document.activeElement instanceof Element&&document.activeElement!==document.body?document.activeElement:null};
    if(inspection)resetInspection();
    syncMode('excursion');
    audio?.setPerspective?.({music:.64,rain:1});
    void approachDoor(run);
    return true;
  }
  async function approachDoor(run){
    const poses=jiangnanDoorPoses(camera.aspect);
    if(!await travelOrRecover(run,poses.rear,950))return;
    if(!excursion.check(run)||!excursion.advance(run,'opening'))return;
    room?.door?.open?.();
    if(!await excursion.wait(run,680))return;
    if(!excursion.check(run)||!excursion.advance(run,'threshold'))return;
    if(!await travelOrRecover(run,jiangnanDoorPoses(camera.aspect).threshold,720))return;
    if(excursion.check(run))showDoorPanel('threshold');
  }
  function stepOutOfDoor(){
    const run=excursion.token;
    if(!run||!excursion.advance(run,'falling'))return;
    hideDoorPanel();
    audio?.setPerspective?.({music:.12,rain:.34});
    void (async()=>{
      const poses=jiangnanDoorPoses(camera.aspect);
      if(!await travelOrRecover(run,poses.water,560))return;
      if(!excursion.check(run))return;
      room?.door?.splash?.();
      if(!excursion.advance(run,'submerged'))return;
      showDoorPanel('submerged');
    })();
  }
  function clearGestureState(){touchPoints.clear();pinchStart=0;pinchUsed=false;}
  function onVisibilityChange(){clearGestureState();visibility();}
  // A window can remove the clicked button before this event reaches the room.
  // Its original event path still records that the input began in the screen.
  const fromScreen=event=>event.composedPath().includes(workspace);
  const fromClock=event=>Boolean(magicClock&&event.composedPath().includes(magicClock.element));
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),direction=new THREE.Vector3();
  function action(object){for(let node=object;node;node=node.parent)if(node.userData.action)return node.userData.action;return null;}
  function activate(kind,source=renderer.domElement){
    if(isBlocked()||!['roam','inspect'].includes(mode))return;
    // Pointerup can attach the live monitor before the browser emits click.
    // That same opening click must not immediately count as an outside click.
    if(source===renderer.domElement&&['computer','seat','photo','painting','notebook'].includes(kind))ignoreOpeningClick=true;
    if(kind==='computer'||kind==='seat')onComputer?.();
    else if(kind==='speaker')toggleMusic();
    else if(['lamp','fan','shelf-light'].includes(kind))toggleObject(kind);
    else if(kind==='notebook')onNotebook?.();
    else if(kind==='painting'){const data=JSON.parse(root.querySelector('[data-space-catalog]').textContent);onPhoto?.((data.photos?.find(photo=>photo.id==='fuji')||data.photos?.[0])?.id);}
    else if(kind==='photo'){const data=JSON.parse(root.querySelector('[data-space-catalog]').textContent);onPhoto?.(data.photos?.[0]?.id);}
    else if(kind==='window'&&inspection?.kind==='window')restoreInspection();
    else if(kind==='door')beginDoorExcursion(source);
    else if(kind==='clock'&&inspection?.kind==='clock')restoreInspection();
    else if(kind==='cat'||kind==='cat-bed'){
      const cat=resident?.snapshot(),near=cat&&cat.phase!=='sleep'&&cat.phase!=='wake'&&Math.hypot(cat.x-pose.x,cat.z-pose.z)<1.1;
      interactCat(mode==='inspect'&&inspection?.kind==='cat'||near?'pet':'call');
    }
    else if(kind?.startsWith('record:')){selectRecord(kind.slice(7));onDetail?.('records',source);}
    else if(kind==='espresso'){toggleObject(kind);onDetail?.(kind,source);}
    else if(kind)onDetail?.(kind,source);
  }
  function hit(event){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const b=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-b.left)/b.width*2-1,-(event.clientY-b.top)/b.height*2+1);ray.setFromCamera(pointer,camera);const physical=ray.intersectObjects(room.group.children,true).find(h=>h.object.visible&&(h.object.userData.action||!h.object.material?.transparent||h.object.material.opacity>.5)),cat=resident?.hit(ray);return cat&&(!physical||cat.distance<physical.distance)?{...cat,cat:true}:physical;}
  function retargetTravel(to){
    const previous=moving,motion=createJiangnanCameraMove(pose,to,{route:jiangnanWindowRoute(pose,to),duration:Math.max(250,previous.duration-previous.elapsed),velocity:previous.motion.velocityAt(previous.elapsed)});
    Object.assign(previous,{from:{...pose},to:{...to},motion,elapsed:0,started:performance.now(),duration:motion.duration});
  }
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
    if(workspace?.dataset.surface==='desktop')Object.assign(workspace.style,{width:width+'px',height:height+'px'});
    else if(workspace?.dataset.surface==='computer'){applyPose(framedPose());screenBounds();}
    else if(mode==='excursion'&&excursion.phase!=='returning'){
      const key=['falling','submerged'].includes(excursion.phase)?'water':excursion.phase==='threshold'?'threshold':'rear';
      const target=jiangnanDoorPoses(camera.aspect)[key];
      if(moving)retargetTravel(target);else applyPose(target);
    }
    else if(moving&&mode==='workspace'&&computerView()==='framed')retargetTravel(framedPose());
    else if(roomView()){
      if(moving)retargetTravel(clampJiangnanWindowLook(moving.to,camera.aspect));
      else applyPose(clampJiangnanWindowLook(pose,camera.aspect));
    }
    if(depthBlur)depthBlur.resize();surfaceChanged();wake();
  }
  function createDepthBlur(){
    const target=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,type:THREE.HalfFloatType});
    target.samples=renderer.capabilities.isWebGL2&&!Number.isFinite(worldRenderBudget(renderer.getContext()).maxPixels)?4:0;
    // Match WebGL2's 24-bit multisample depth buffer for a valid depth resolve.
    target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
    const uniforms={color:{value:target.texture},depth:{value:target.depthTexture},pixel:{value:new THREE.Vector2()},near:{value:camera.near},far:{value:camera.far},focusBack:{value:0}};
    const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:`
      #include <packing>
      varying vec2 vUv;
      uniform sampler2D color;
      uniform sampler2D depth;
      uniform vec2 pixel;
      uniform float near;
      uniform float far;
      uniform float focusBack;
      float distanceAt(vec2 uv){return -perspectiveDepthToViewZ(texture2D(depth,uv).x,near,far);}
      void main(){
        vec4 sharp=texture2D(color,vUv);
        float blur=smoothstep(focusBack,focusBack+.65,distanceAt(vUv));
        vec4 total=sharp;
        float weight=1.0;
        // Depth-gated disk samples never pull a sharp bezel into the scenery.
        for(int i=0;i<12;i++){
          float angle=float(i)*2.39996323;
          float radius=sqrt((float(i)+.5)/12.0)*11.0*blur;
          vec2 sampleUv=vUv+vec2(cos(angle),sin(angle))*pixel*radius;
          float sampleWeight=smoothstep(focusBack,focusBack+.12,distanceAt(sampleUv));
          total+=texture2D(color,sampleUv)*sampleWeight;weight+=sampleWeight;
        }
        gl_FragColor=mix(sharp,total/weight,blur);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    const geometry=new THREE.PlaneGeometry(2,2),postScene=new THREE.Scene(),postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    postScene.add(new THREE.Mesh(geometry,material));
    for(const resource of [target,target.depthTexture,material,geometry])resources.add(resource);
    function resize(){const size=renderer.getDrawingBufferSize(new THREE.Vector2());target.setSize(size.x,size.y);uniforms.pixel.value.set(renderer.getPixelRatio()/size.x,renderer.getPixelRatio()/size.y);}
    resize();
    return {resize,render(){
      uniforms.focusBack.value=camera.position.z-room.screen.position[2]+.13;
      renderer.setRenderTarget(target);renderer.render(scene,camera);
      const info={triangles:renderer.info.render.triangles,calls:renderer.info.render.calls};
      renderer.setRenderTarget(null);renderer.render(postScene,postCamera);return info;
    }};
  }
  function renderRoom(){
    const blurred=workspace.dataset.surface==='computer';root.dataset.computerDepthBlur=String(blurred);
    if(blurred){depthBlur??=createDepthBlur();return depthBlur.render();}
    renderer.render(scene,camera);return {triangles:renderer.info.render.triangles,calls:renderer.info.render.calls};
  }
  function reflectRoom(){
    clearTimeout(firstTimer);reflectionDone=true;const cube=new THREE.WebGLCubeRenderTarget(128),capture=new THREE.CubeCamera(.05,30,cube),generator=new THREE.PMREMGenerator(renderer),shadows=renderer.shadowMap.enabled;
    try{renderer.shadowMap.enabled=false;exterior.group.visible=false;capture.position.set(.1,1.45,-.2);scene.add(capture);capture.update(renderer,scene);const env=generator.fromCubemap(cube.texture);resources.add(env);room.group.traverse(o=>{const list=Array.isArray(o.material)?o.material:[o.material];for(const material of list)if(material?.isMeshStandardMaterial){material.envMap=env.texture;material.envMapIntensity=.35;material.needsUpdate=true;}});}catch{/* Direct practical lights remain usable without reflections. */}
    finally{capture.removeFromParent();cube.dispose();generator.dispose();exterior.group.visible=true;renderer.shadowMap.enabled=shadows;renderer.shadowMap.needsUpdate=true;}
  }
  function tick(stamp){
    frame=0;if(disposed||!visible())return;
    const framed=mode==='workspace'&&workspace.dataset.surface==='computer';
    const environmentActive=!quiet&&!reduced.matches&&!isBlocked()&&(mode!=='workspace'||framed);
    // While reading at the desk, scenery keeps moving at a quieter 30fps.
    // Navigation remains disabled by workspace mode, and intentional travel
    // still receives the ordinary frame cadence.
    if(environmentActive&&!moving&&!keys.size&&!touchKeys.size&&last&&stamp-last<1000/(framed?30:60)-.8){frame=requestAnimationFrame(tick);return;}
    const elapsed=last?Math.max(0,(stamp-last)/1000):0,delta=Math.min(elapsed,.12);last=stamp;
    // Scenery is analytical; the resident owns its own bounded substeps.
    // Preserve visible wall time here even when a software-rendered frame is slow.
    if(environmentActive)environmentTime+=elapsed;
    doorFade.update(elapsed,{at:stamp/1000,active:!isBlocked()});
    // Physics uses bounded steps; a deliberate camera flight uses visible wall
    // time. Otherwise a busy frame stretches a short approach into a long wait.
    if(moving){if(moving.started===null)moving.started=stamp-moving.elapsed;moving.elapsed=Math.max(0,stamp-moving.started);applyPose(moving.motion.at(moving.elapsed));if(moving.elapsed>=moving.duration)finishTravel();}
    else if(navigate()&&(keys.size||touchKeys.size)){
      const has=(...codes)=>codes.some(c=>keys.has(c)||touchKeys.has(c));const input={forward:Number(has('KeyW','ArrowUp','forward'))-Number(has('KeyS','ArrowDown','back')),right:Number(has('KeyD','ArrowRight','right'))-Number(has('KeyA','ArrowLeft','left'))};
      for(let left=delta;left>0;left-=.04)pose=jiangnanWalk(pose,input,Math.min(.04,left));applyPose(pose);
    }
    if(clockReturn){const progress=Math.min(1,(stamp-clockReturn.at)/1400),eased=progress*progress*(3-2*progress);roomTime.travelTo(clockReturn.from+clockReturn.span*eased+(stamp-clockReturn.at)/1000*10,{persist:false});if(progress===1){roomTime.returnNow();clockReturn=null;}}
    const day=roomTime.at();room.update(environmentTime,day);if(room.shadowRefresh?.())renderer.shadowMap.needsUpdate=true;exterior.update(environmentTime,{...day,still:quiet||reduced.matches,windowFocus:roomView()});roomLights.update(day);magicClock?.update(day);
    if(standbyClock?.isConnected&&standbyClock.textContent!==day.label)standbyClock.textContent=day.label;
    root.dataset.roomTime=JSON.stringify({...day,rate:10});resident?.setRoutine(day.catRoutine);
    const windowButton=objectControls.querySelector('[data-room-object="window"]'),windowText=day.rain>.1?t('看看窗外的雨','Watch the rain'):t('看看窗外的风景','Look out the window');
    if(windowButton.textContent!==windowText)windowButton.textContent=windowText;
    if(resident){resident.update(delta,{interactionSeconds:elapsed,breathingSeconds:elapsed,ambient:environmentActive,active:environmentActive&&(mode==='roam'||roomView()||inspection?.kind==='clock'),interactive:environmentActive&&mode==='inspect'&&resident.pending});const cat=resident.snapshot();root.dataset.catLoaded=String(cat.loaded);root.dataset.roomCat=JSON.stringify(cat);root.dataset.roomCatBreath=JSON.stringify(resident.breathing);if(cat.loaded){targets.cat=cat.target;root.dataset.worldTargets=JSON.stringify(targets);}}
    if(frames%3===0)publishObjects();
    const readyMaps=Number(root.dataset.worldPbrMaps)>=5||performance.now()-startTime>2200;
    // Entry may paint early; its one reflection waits for complete materials.
    const reflectionReady=Number(root.dataset.worldPbrMaps)>=12||performance.now()-startTime>2200;
    if(!reflectionDone&&reflectionReady)reflectRoom();
    let info;try{screenVisibility();info=renderRoom();css.render(scene,camera);}catch(error){renderer.setRenderTarget(null);settleFirst(false);onFailure?.();return;}
    root.dataset.worldFrames=String(++frames);root.dataset.worldTriangles=String(info.triangles);root.dataset.worldDraws=String(info.calls);root.dataset.worldRenderedMode=mode;root.dataset.worldVista=exterior.vistaMode||'geometry';
    root.dataset.roomBoatPose=JSON.stringify([+exterior.boat.position.x.toFixed(3),+exterior.boat.position.y.toFixed(3),+exterior.boat.position.z.toFixed(3)]);root.dataset.roomBoat='ready';root.dataset.worldEnvironmentTime=environmentTime.toFixed(3);
    root.dataset.roomBoatHeading=exterior.boat.rotation.y.toFixed(4);
    if(readyMaps){root.dataset.worldReady='true';settleFirst(true);}
    if(!disposed&&(moving||clockReturn||environmentActive||doorFade.pending&&!isBlocked()||navigate()&&(keys.size||touchKeys.size)))frame=requestAnimationFrame(tick);else last=0;
  }
  function visibility(){doorFade.setActive(visible()&&!isBlocked(),{at:performance.now()/1000});excursion.setPaused(!visible());stop();keys.clear();touchKeys.clear();drag=null;if(!visible()){magicClock?.settle();if(clockReturn){clockReturn=null;roomTime.returnNow();syncRoomTime();}}else wake();}
  function dispose(){
    if(disposed)return;disposed=true;stop();stopWeather?.();magicClock?.dispose();clockReturn=null;excursion.dispose();doorFade.dispose();workspaceScroll.dispose();hideDoorPanel();doorWater?.remove();doorWater=null;doorExit?.remove();doorExit=null;doorReturn=null;cancelTravel();clearTimeout(firstTimer);abort.abort();observer?.disconnect();blockedObserver?.disconnect();hiddenObserver?.disconnect();audio?.dispose();resident?.dispose();
    cssObject?.removeFromParent();for(const [node,anchor] of anchors)if(anchor.isConnected){movePreservingState(anchor.parentNode,node,anchor);anchor.remove();}workspace?.remove();computerExpand?.remove();pbr?.dispose();for(const object of resources)object.dispose?.();for(const map of textures)map.dispose();renderer?.dispose();renderer?.forceContextLoss();host?.remove();settleFirst(false);
    if(outsideButton)outsideButton.textContent=outsideLabel;
    clearScreenBounds();surfaceChanged();
    for(const key of ['worldRenderer','worldScreenVisible','worldScreenPreview','worldTargets','worldEnvironmentTime','roomBoat','roomBoatPose','roomBoatHeading','computerDepthBlur','worldVista','roomObjects','roomCat','roomCatBreath','catLoaded','roomTime','roomDoorState','roomDoorStill'])delete root.dataset[key];
  }
  try {
    renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    const budget=worldRenderBudget(renderer.getContext()),software=Number.isFinite(budget.maxPixels);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
    reflectionDone=software;
    scene=new THREE.Scene();scene.background=new THREE.Color('#192a3c');scene.fog=new THREE.FogExp2('#273d50',.019);camera=new THREE.PerspectiveCamera(63,1,.04,160);camera.rotation.order='YXZ';
    host=document.createElement('div');host.className='space-world space-world--jiangnan';root.prepend(host);renderer.domElement.className='space-world__canvas';renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label',t('三维咖啡馆。拖动环视，方向键或 WASD 行走，点击电脑和相框。','3D café. Drag to look, arrows or WASD to walk. Click the Mac or photograph.'));renderer.domElement.setAttribute('aria-describedby','jiangnan-controls');host.append(renderer.domElement);
    doorWater=document.createElement('div');doorWater.className='space-cafe-door-water';doorWater.style.opacity=String(doorFade.value);doorWater.setAttribute('aria-hidden','true');root.append(doorWater);root.dataset.roomDoorState='indoor';syncDoorStill();
    doorExit=document.createElement('button');doorExit.type='button';doorExit.className='space-cafe-door-exit';doorExit.textContent=t('回到暖光里','Back to the warm light');listen(doorExit,'click',escapeDoorExcursion);root.append(doorExit);
    const guidance=document.createElement('p');guidance.id='jiangnan-controls';guidance.className='jiangnan-guidance';guidance.textContent=t('拖动环视，方向键或 WASD 移动。','Drag to look. Arrows or WASD to walk.');host.append(guidance);
    objectControls=document.createElement('nav');objectControls.className='jiangnan-object-controls';objectControls.setAttribute('aria-label',t('房间里的物件','Objects in the room'));host.append(objectControls);
    for(const [kind,label]of [['computer',t('使用桌上的电脑','Use the Mac')],['photo',t('查看相框里的照片','View the framed photograph')],['speaker',t('播放或暂停音响','Play or pause the speaker')],['records',t('挑选一张唱片','Choose a record')],['lamp',t('开关桌灯','Switch the desk lamp')],['fan',t('开关风扇','Switch the fan')],['shelf-light',t('开关书架照明','Switch the shelf lights')],['coffee',t('看看桌上的咖啡','Look at the coffee')],['books',t('走近书架','Browse the bookshelf')],['clock',t('看看木摆钟','Look at the pendulum clock')],['espresso',t('使用咖啡机','Use the espresso machine')],['cat',t('走近小猫','Meet the cat')],['door',t('打开后门','Open the back door')]]){const button=document.createElement('button');button.type='button';button.dataset.roomObject=kind;button.textContent=label;listen(button,'click',()=>activate(kind,button));objectControls.append(button);}
    objectControls.querySelector('[data-room-object="cat"]').textContent=t('轻轻叫醒小猫','Gently call the cat');
    const windowControl=document.createElement('button');windowControl.type='button';windowControl.dataset.roomObject='window';windowControl.textContent=t('看看窗外的雨','Watch the rain');listen(windowControl,'click',()=>activate('window',windowControl));objectControls.append(windowControl);
    css=new CSS3DRenderer();css.domElement.className='space-world__css';css.domElement.style.pointerEvents='none';host.append(css.domElement);
    root.dataset.worldRenderer='jiangnan';root.dataset.worldTheme='jiangnan';root.dataset.worldTargets=JSON.stringify(targets);root.dataset.worldPbrMaps='0';root.dataset.worldTravel='false';
    pbr=createWorldMaterials({base:materialBase,renderer,resources,textures,isDisposed:()=>disposed,wake,root});
    roomLights=createJiangnanRoomLights({THREE,scene});
    room=buildJiangnanRoom({scene,pbr,resources,textures,wake,photoAsset,books,records,zh,shadowSize:budget.shadowSize,isDisposed:()=>disposed,buildDoor:buildJiangnanDoor,createLightRamp:createPracticalLightRamp,isStill:()=>quiet||reduced.matches});Object.assign(targets,room.targets);root.dataset.worldTargets=JSON.stringify(targets);publishObjects(true);
    magicClock=mountMagicClock({root,zh,getTime:()=>roomTime.at(),onGrab:()=>{clockReturn=null;roomTime.hold();},onTravel:travelRoomTime,onCommit:()=>roomTime.commit(),onPresent:returnPresent,onClose:restoreInspection});
    resident=createJiangnanResident({scene,wake,grounding:room.catSupport,onChange:code=>{root.dataset.catState=code;onCat?.(code);wake();}});resident.ready.then(loaded=>{if(disposed)return;root.dataset.catLoaded=String(loaded);onCat?.(loaded?'ready':'unavailable');wake();});
    const nightAssets=JSON.parse(root.querySelector('[data-cafe-catalog]').textContent).night,vistaMode=new URLSearchParams(location.search).get('vista')==='geometry'?'geometry':'image';
    exterior=buildJiangnanExterior({scene,pbr,resources,textures,software,vistaAsset:nightAssets.vista,dayVistaAsset:nightAssets.dayVista,continuationAsset:nightAssets.continuation,vistaMode,wake,isDisposed:()=>disposed});root.dataset.worldVista=exterior.vistaMode;
    if(room.soundTarget){targets.speaker=[...room.soundTarget];root.dataset.worldTargets=JSON.stringify(targets);}
    if(software)room.group.traverse(o=>{if(o.isPointLight)o.castShadow=false;});
    workspace=document.createElement('div');workspace.className='space-spatial-screen jiangnan-workspace';workspace.setAttribute('aria-label','CUBXXW OS');
    // Clipping a CSS3DObject itself breaks Chromium's transformed hit testing.
    // A flat inner viewport clips the exact same live nodes to the glass.
    const viewport=document.createElement('div');viewport.className='jiangnan-workspace__viewport';workspace.append(viewport);
    for(const node of [root.querySelector('[data-space-windows]'),root.querySelector('[data-space-snap]'),root.querySelector('.space-bottom'),root.querySelector('.space-menu')]){const anchor=document.createComment('jiangnan workspace return');node.before(anchor);anchors.push([node,anchor]);viewport.append(node);}
    computerExpand=document.createElement('button');computerExpand.type='button';computerExpand.className='jiangnan-computer-expand';computerExpand.dataset.computerDisplay='expanded';computerExpand.textContent=t('放大屏幕','Enlarge screen');root.append(computerExpand);
    attachMonitor();const catalog=JSON.parse(root.querySelector('[data-cafe-catalog]').textContent);
    firstFrame.then(painted=>{if(!painted||disposed)return;audio=mountRoomAudio({root,assets:{...catalog.night,ambience:catalog.night.rain||catalog.night.ambience},tracks:records,zh,defaultEnabled:false,independentAmbience:true,backgroundPlayback:true,initialQuiet:quiet,embedded:true,onStateChange:state=>{room.setAudioState?.(state);publishObjects();root.dispatchEvent(new CustomEvent('space:roomaudio',{detail:state}));wake();}});stopWeather=watchJiangnanWeather(roomTime,day=>{audio.setRainLevel(day.rain);root.dataset.roomTime=JSON.stringify({...day,rate:10});wake();});if(audio.credits)root.querySelector('[data-mac-panel="help"]')?.append(audio.credits);});
    listen(root,'click',event=>{const button=event.target.closest('[data-computer-display]');if(button)changeComputerView(button.dataset.computerDisplay);});
    if(outsideButton)outsideButton.textContent=t('去窗边看看 ↗','Look out the window ↗');onCat?.('loading');
    listen(renderer.domElement,'pointerdown',event=>{if(isBlocked()||!['roam','inspect'].includes(mode)||event.button!==0||touchPoints.size>1)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,distance:0};renderer.domElement.setPointerCapture(event.pointerId);});
    listen(renderer.domElement,'pointermove',event=>{if(!drag){if(canLook()){if(moving)renderer.domElement.style.cursor='grab';else if(performance.now()-lastHover>60){lastHover=performance.now();renderer.domElement.style.cursor=action(hit(event)?.object)?'pointer':'grab';}}return;}const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag.distance+=Math.abs(dx)+Math.abs(dy);drag.x=event.clientX;drag.y=event.clientY;if(!canLook()||drag.distance<6)return;cancelTravel();const looking={...pose,yaw:pose.yaw-dx*(roomView()? .0026 : .0035),pitch:Math.max(-.9,Math.min(.85,pose.pitch-dy*(roomView()? .0022 : .003)))};const eye=roomView()?jiangnanWindowView(camera.aspect):null,atWindow=eye&&Math.hypot(pose.x-eye.x,pose.z-eye.z)<.12;applyPose(atWindow?clampJiangnanWindowLook(looking,camera.aspect):looking);wake();});
    listen(renderer.domElement,'pointerup',event=>{
      if(drag?.id!==event.pointerId)return;const click=drag.distance<6&&!pinchUsed;drag=null;
      if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);
      if(!click||isBlocked())return;const target=hit(event),kind=target?.cat?'cat':action(target?.object);
      if(mode==='inspect'){
        // The large glass pane remains an outside-click while seated.
        if(kind==='window'&&inspection.kind!=='window')restoreInspection();
        else if(kind&&(roomView()||detailFamily(kind)===detailFamily(inspection.kind)))activate(kind);else restoreInspection();
      }else if(navigate()){
        if(kind)activate(kind);else if(event.pointerType==='touch'&&target?.point.y<.06&&target.point.y>-.06)travel(jiangnanDestination(pose,target.point),650);
      }
    });
    listen(root,'click',event=>{if(ignoreOpeningClick){ignoreOpeningClick=false;return;}if(mode==='workspace'&&computerView()==='framed'&&!fromScreen(event)&&!event.target.closest('dialog,[data-space-menu-trigger],.space-menu,.jiangnan-computer-expand,.jiangnan-object-controls'))retreat();});
    listen(root,'wheel',event=>{if(isBlocked()||fromClock(event)||event.deltaY<=0||event.target.closest('.space-object-detail'))return;const inScreen=fromScreen(event);if(mode==='inspect'||mode==='workspace'&&computerView()==='framed'&&!inScreen){event.preventDefault();retreat();}},{passive:false});
    listen(root,'pointerdown',event=>{if(event.pointerType!=='touch'||isBlocked()||fromClock(event))return;touchPoints.set(event.pointerId,{x:event.clientX,y:event.clientY,inScreen:fromScreen(event)});if(touchPoints.size===2){const [a,b]=[...touchPoints.values()];pinchStart=Math.hypot(a.x-b.x,a.y-b.y);pinchUsed=false;drag=null;}},{capture:true});
    listen(root,'pointermove',event=>{const point=touchPoints.get(event.pointerId);if(!point)return;point.x=event.clientX;point.y=event.clientY;if(touchPoints.size!==2||!pinchStart||pinchUsed)return;const [a,b]=[...touchPoints.values()];if(mode==='workspace'&&(a.inScreen||b.inScreen))return;if(Math.hypot(a.x-b.x,a.y-b.y)<pinchStart*.78&&(mode==='inspect'||mode==='workspace'&&computerView()==='framed')){pinchUsed=true;event.preventDefault();retreat();}},{capture:true,passive:false});
    for(const type of ['pointerup','pointercancel'])listen(root,type,event=>{if(type==='pointercancel')clearGestureState();else touchPoints.delete(event.pointerId);if(!touchPoints.size){pinchStart=0;queueMicrotask(()=>{pinchUsed=false;});}},{capture:true});
    listen(root,'space:readingpage',event=>{readingPage=Boolean(event.detail.active);clearGestureState();visibility();resident?.resetClock();});
    listen(renderer.domElement,'pointercancel',()=>{drag=null;clearGestureState();});
    listen(document,'keydown',event=>{if(event.key!=='Escape'||excursion.phase==='indoor')return;if(escapeDoorExcursion())event.preventDefault();});
    listen(document,'keydown',event=>{if(!navigate()||event.metaKey||event.ctrlKey||event.altKey||event.target.closest('input,textarea,[contenteditable="true"]'))return;if(event.code==='KeyF'){event.preventDefault();root.querySelector('[data-space-fullscreen]')?.click();}if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();cancelTravel();keys.add(event.code);wake();}});
    listen(document,'keyup',event=>keys.delete(event.code));listen(window,'blur',()=>{keys.clear();touchKeys.clear();drag=null;clearGestureState();});
    for(const button of root.querySelectorAll('[data-world-walk]')){listen(button,'pointerdown',event=>{if(!navigate())return;event.preventDefault();cancelTravel();touchKeys.add(button.dataset.worldWalk);button.setPointerCapture(event.pointerId);wake();});for(const name of ['pointerup','pointercancel','lostpointercapture'])listen(button,name,()=>touchKeys.delete(button.dataset.worldWalk));}
    listen(document,'visibilitychange',onVisibilityChange);listen(reduced,'change',()=>{syncDoorStill();if(reduced.matches){finishTravel();resident?.settle();}resident?.resetClock();last=0;wake();});listen(renderer.domElement,'webglcontextlost',event=>{event.preventDefault();stop();settleFirst(false);onFailure?.();});
    hiddenObserver=new MutationObserver(onVisibilityChange);hiddenObserver.observe(root,{attributes:true,attributeFilter:['hidden']});
    blockedObserver=new MutationObserver(()=>{doorFade.setActive(visible()&&!isBlocked(),{at:performance.now()/1000});if(isBlocked()){keys.clear();touchKeys.clear();drag=null;clearGestureState();escapeDoorExcursion();}wake();});blockedObserver.observe(root,{attributes:true,subtree:true,attributeFilter:['open','hidden']});
    observer=new ResizeObserver(resize);observer.observe(root);pose=entry();returnPose={...pose};applyPose(pose);syncMode('roam');resize();renderer.shadowMap.needsUpdate=true;
    firstTimer=setTimeout(wake,2300);wake();
  } catch(error){dispose();throw error;}
  return {firstFrame,start,focus,leave,outside,inspect,restoreInspection,setQuiet,wake,toggleObject,selectRecord,toggleMusic,setTheme(){return true;},interactCat,get mode(){return mode;},dispose};
}
