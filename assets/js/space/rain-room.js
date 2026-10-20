import {roomViewport,projectQuad,RAIN_ROOM_SIZE} from './rain-room-state.mjs';

export function createRainRoom({root,onComputer,onPhoto,onInspect,onCat,onFailure,isBlocked=()=>false}) {
  const catalog=JSON.parse(root.querySelector('[data-space-catalog]').textContent);
  const assets=JSON.parse(root.querySelector('[data-cafe-catalog]').textContent).night;
  const zh=catalog.language==='zh',t=(cn,en)=>zh?cn:en;
  const abort=new AbortController(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const host=document.createElement('div');host.className='space-world rain-room';
  host.innerHTML=`<div class="rain-room__viewport" data-rain-viewport><div class="rain-room__stage"><div class="rain-room__scale"><div class="rain-room__camera"><img class="rain-room__image" alt="${t('一间临水的小咖啡馆，木窗、旧书桌、台式电脑和照片平板，窗外江南夜雨。','A small riverside café: timber windows, an old desk, a Mac and a photo frame, with a rainy Jiangnan night outside.')}" fetchpriority="high" decoding="async"><canvas class="space-world__canvas rain-room__canvas" width="1933" height="814" aria-hidden="true"></canvas><button type="button" class="rain-room__screen" data-room-computer><span>CUBXXW OS</span><small>${t('打开电脑','Open the Mac')}</small></button><button type="button" class="rain-room__photo" data-room-photo><img decoding="async" alt=""><span>${t('打开这张照片','Open this photograph')}</span></button></div></div></div></div><div class="rain-room__hint" data-rain-pan-hint hidden>${t('左右滑动，看看这间小屋。','Swipe to look around the room.')}</div>`;
  root.prepend(host);root.dataset.worldRenderer='cinematic';root.dataset.worldTheme='jiangnan';
  const workspace=document.createElement('div');workspace.className='space-spatial-screen rain-room__workspace';workspace.inert=true;root.append(workspace);
  const anchors=[];
  for(const node of [root.querySelector('[data-space-windows]'),root.querySelector('[data-space-snap]'),root.querySelector('.space-bottom'),root.querySelector('.space-menu')]){
    const anchor=document.createComment('night room workspace return');node.before(anchor);anchors.push([node,anchor]);workspace.append(node);
  }
  const viewport=host.querySelector('[data-rain-viewport]'),stage=host.querySelector('.rain-room__stage'),scaled=host.querySelector('.rain-room__scale'),camera=host.querySelector('.rain-room__camera');
  const image=host.querySelector('.rain-room__image'),canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d');
  const computer=host.querySelector('[data-room-computer]'),photoButton=host.querySelector('[data-room-photo]'),photoImage=photoButton.querySelector('img');
  const setProjection=(element,width,height,points)=>{element.style.width=width+'px';element.style.height=height+'px';element.style.transform=`matrix3d(${projectQuad(width,height,points).matrix.join(',')})`;};
  setProjection(computer,300,180,[[1097,322],[1314,326],[1301,454],[1081,439]]);
  setProjection(photoButton,180,120,[[1468,472],[1574,483],[1556,549],[1448,535]]);
  computer.setAttribute('aria-label',t('打开电脑，进入 CUBXXW OS 工作区','Open the Mac and enter the CUBXXW OS workspace'));
  const photos=(catalog.photos||[]).filter(p=>p.thumb&&p.id);let photoIndex=0;
  function showPhoto(){
    const photo=photos[photoIndex];
    if(!photo){photoButton.hidden=true;return;}
    photoButton.dataset.photoId=photo.id;photoImage.src=new URL(photo.thumb,location.href).href;
    photoImage.alt=photo.title||photo.place||t('旅行照片','Travel photograph');
    photoButton.setAttribute('aria-label',t('打开照片：','Open photograph: ')+photoImage.alt);
  }
  showPhoto();
  photoImage.addEventListener('error',()=>{photoImage.hidden=true;photoButton.classList.add('rain-room__photo--unavailable');photoButton.querySelector('span').textContent=t('打开旅途相册','Open travel photographs');},{signal:abort.signal});
  const listen=(target,type,fn,extra={})=>target.addEventListener(type,fn,{...extra,signal:abort.signal});
  listen(computer,'click',()=>{if(!isBlocked()&&mode==='roam')onComputer?.();});
  listen(photoButton,'click',()=>{if(!isBlocked()&&mode==='roam')onPhoto?.(photos[photoIndex]?.id);});

  const utilities=root.querySelector('.space-cafe__utilities'),soundButton=document.createElement('button');
  soundButton.type='button';soundButton.dataset.roomSound='';soundButton.textContent=t('声音','Sound');soundButton.setAttribute('aria-pressed','false');soundButton.setAttribute('aria-label',t('播放爵士、雨声和风扇声','Play jazz, rain and the fan'));utilities.prepend(soundButton);
  const quietButton=root.querySelector('[data-cafe-quiet]'),quietLabel=quietButton.textContent;quietButton.textContent=t('安静','Still');
  const credits=document.createElement('details');credits.className='rain-room__credits';
  credits.innerHTML=`<summary>${t('配乐','Music')}</summary><div><a href="https://incompetech.com/music/royalty-free/index.html?Search=Search&amp;isrc=USUAN1100137" target="_blank" rel="noopener">Night on the Docks - Sax · Kevin MacLeod</a><p><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> · ${t('音量调整，循环播放','Level adjusted and looped')}</p><p><a href="https://commons.wikimedia.org/wiki/File:Rain.ogg" target="_blank" rel="noopener">${t('雨声：ジダネ · 公有领域','Rain: ジダネ · public domain')}</a></p></div>`;
  root.querySelector('.space-cafe__footer').append(credits);
  const music=new Audio(),ambience=new Audio();
  for(const audio of [music,ambience]){audio.preload='none';audio.loop=true;host.append(audio);}
  music.src=assets.music;music.volume=.3;ambience.src=assets.ambience;ambience.volume=.8;
  let soundWanted=false;
  function syncSound(){soundButton.setAttribute('aria-pressed',String(soundWanted));soundButton.textContent=soundWanted?t('静音','Mute'):t('声音','Sound');}
  function pauseSound(){for(const audio of [music,ambience])audio.pause();}
  function playSound(){
    if(!soundWanted||document.hidden||root.hidden)return;
    const promises=[music.play(),ambience.play()];
    Promise.all(promises).catch(()=>{if(disposed)return;soundWanted=false;pauseSound();syncSound();soundButton.title=t('声音未能播放，请再点一次。','Sound could not start. Click to try again.');});
  }
  listen(soundButton,'click',()=>{soundWanted=!soundWanted;syncSound();if(soundWanted)playSound();else pauseSound();});

  let disposed=false,quiet=false,mode='roam',frame=0,last=0,lastPaint=0,elapsed=0,frames=0,geometry,hasFrame=false,resolveFirst,firstTimer;
  const firstFrame=new Promise(resolve=>{resolveFirst=resolve;});
  const first=value=>{if(hasFrame)return;hasFrame=true;clearTimeout(firstTimer);resolveFirst(value);};
  const frac=x=>x-Math.floor(x),hash=n=>frac(Math.sin(n*127.1+91.7)*43758.5453);
  const glass=new Path2D();glass.moveTo(984,128);glass.lineTo(1751,62);glass.lineTo(1751,465);glass.lineTo(984,429);glass.closePath();
  const foreground=new Path2D();foreground.rect(0,0,1933,814);
  foreground.moveTo(1090,310);foreground.lineTo(1328,313);foreground.lineTo(1311,490);foreground.lineTo(1070,473);foreground.closePath();foreground.rect(964,325,109,147);foreground.rect(1273,85,11,229);
  const drops=Array.from({length:630},(_,i)=>{const layer=i<230?0:i<560?1:2;return {x:979+hash(i+1)*790,y:hash(i+900)*810,layer,speed:[150,240,355][layer]+hash(i+1200)*50,length:[10,22,39][layer]+hash(i+1000)*7,alpha:[.07,.13,.21][layer],width:[.45,.7,1][layer]};});
  function paint(time){
    if(!ctx||disposed||!image.complete||!image.naturalWidth)return;
    ctx.clearRect(0,0,1933,814);ctx.save();ctx.clip(glass);ctx.clip(foreground,'evenodd');
    // Low fog layers remain behind the nearer, faster rainfall.
    for(let k=0;k<5;k++){
      const x=1250+Math.sin(time*.048+k)*105,y=169+k*27;
      const fog=ctx.createRadialGradient(x,y,8,x,y,330);fog.addColorStop(0,`rgba(155,181,204,${.038+k*.004})`);fog.addColorStop(1,'rgba(155,181,204,0)');ctx.fillStyle=fog;ctx.fillRect(989,125,760,225);
    }
    for(const drop of drops){
      const y=frac((drop.y+time*drop.speed)/790)*790;ctx.strokeStyle=`rgba(209,229,239,${drop.alpha})`;ctx.lineWidth=drop.width;
      ctx.beginPath();ctx.moveTo(drop.x,y);ctx.lineTo(drop.x-4-drop.layer*3,y+drop.length);ctx.stroke();
    }
    for(let i=0;i<30;i++){
      const p=frac(time*.46+hash(i+2000)),x=1030+hash(i+2100)*690,y=350+hash(i+2200)*91;
      ctx.strokeStyle=`rgba(213,231,237,${(1-p)*.16})`;ctx.lineWidth=.6;ctx.beginPath();ctx.ellipse(x,y,p*9,p*2.4,0,0,Math.PI*2);ctx.stroke();
    }
    for(let i=0;i<22;i++){
      const x=995+hash(i+3000)*748,y=frac(hash(i+3100)+time*.014)*600;
      ctx.fillStyle='rgba(220,237,241,.28)';ctx.beginPath();ctx.ellipse(x,y,.8,1.7,0,0,7);ctx.fill();ctx.strokeStyle='rgba(217,234,239,.09)';ctx.beginPath();ctx.moveTo(x,y-16);ctx.lineTo(x,y);ctx.stroke();
    }
    ctx.restore();
    // The old wooden case and guard stay still; only its wooden rotor turns.
    ctx.save();ctx.translate(1778,465);ctx.scale(.8,1);ctx.beginPath();ctx.arc(0,0,91,0,7);ctx.clip();
    const background=ctx.createRadialGradient(-15,-18,8,0,0,94);background.addColorStop(0,'rgba(65,41,23,.94)');background.addColorStop(1,'rgba(29,23,17,.94)');ctx.fillStyle=background;ctx.fillRect(-100,-100,200,200);
    const wood=ctx.createLinearGradient(-65,-70,75,65);wood.addColorStop(0,'#54331c');wood.addColorStop(.4,'#94633b');wood.addColorStop(.72,'#754d2d');wood.addColorStop(1,'#3e291b');
    const phase=time*Math.PI*2*5.73+.13*Math.sin(time*.43);
    for(let s=0;s<4;s++){
      ctx.save();ctx.rotate(phase-s*.105);ctx.globalAlpha=.25;
      for(let k=0;k<4;k++){
        ctx.save();ctx.rotate(k*Math.PI/2);ctx.fillStyle=wood;ctx.beginPath();ctx.moveTo(14,-9);ctx.bezierCurveTo(33,-31,61,-63,78,-44);ctx.bezierCurveTo(96,-22,72,20,18,14);ctx.closePath();ctx.fill();
        ctx.strokeStyle='rgba(36,19,9,.28)';ctx.lineWidth=.7;for(let line=0;line<4;line++){ctx.beginPath();ctx.moveTo(24+line*5,-12);ctx.quadraticCurveTo(43+line*6,-37,70+line*2,-31+line*5);ctx.stroke();}ctx.restore();
      }ctx.restore();
    }
    ctx.strokeStyle='rgba(32,25,18,.67)';ctx.lineWidth=.8;
    for(let k=0;k<40;k++){const a=k/40*Math.PI*2;ctx.beginPath();ctx.moveTo(Math.cos(a)*18,Math.sin(a)*18);ctx.lineTo(Math.cos(a)*92,Math.sin(a)*92);ctx.stroke();}
    for(const radius of [33,52,73,91]){ctx.beginPath();ctx.arc(0,0,radius,0,7);ctx.stroke();}ctx.restore();
    ctx.save();ctx.beginPath();ctx.ellipse(1778,465,15,18,0,0,7);ctx.clip();ctx.drawImage(image,0,0,1933,814);ctx.restore();
    ctx.save();ctx.filter='blur(1px)';ctx.lineCap='round';for(let i=0;i<7;i++){
      const p=frac(time*.16+i/7),x=1379+Math.sin(p*8+i)*3.4,y=477-p*58;
      ctx.strokeStyle=`rgba(241,224,193,${Math.sin(p*Math.PI)*.075})`;ctx.lineWidth=1.6+p*1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x-5,y-8,x+6,y-17,x+Math.sin(time*.6+i)*6,y-24);ctx.stroke();
    }ctx.restore();
    root.dataset.worldFrames=String(++frames);root.dataset.rainTime=time.toFixed(2);root.dataset.worldRenderedMode=mode;root.dataset.worldReady='true';first(true);
  }
  function canMove(){return !disposed&&!quiet&&!reduced.matches&&!document.hidden&&!root.hidden&&mode!=='workspace'&&!isBlocked();}
  function stop(){cancelAnimationFrame(frame);frame=0;last=0;}
  function tick(stamp){frame=0;if(!canMove()){last=0;return;}if(last)elapsed+=Math.min((stamp-last)/1000,.07);last=stamp;
    if(stamp-lastPaint>(root.clientWidth<700?45:32)){lastPaint=stamp;paint(elapsed);}frame=requestAnimationFrame(tick);
  }
  function wake(){if(disposed)return;stage.inert=mode==='workspace'||isBlocked();if(canMove()&&!frame){last=0;frame=requestAnimationFrame(tick);}}
  function resize(){
    const old=geometry;geometry=roomViewport({width:root.clientWidth||innerWidth,height:root.clientHeight||innerHeight});
    Object.assign(viewport.style,{left:geometry.left+'px',top:geometry.top+'px',width:(geometry.pan?root.clientWidth:geometry.width)+'px',height:geometry.height+'px'});
    Object.assign(stage.style,{width:geometry.width+'px',height:geometry.height+'px'});scaled.style.transform=`scale(${geometry.scale})`;
    if(!old||old.pan!==geometry.pan||Math.abs(old.width-geometry.width)>1)viewport.scrollLeft=geometry.scrollLeft;
    host.querySelector('[data-rain-pan-hint]').hidden=!geometry.pan;paint(elapsed);wake();
  }
  function setMode(value){mode=value;root.dataset.worldMode=value;root.dataset.worldRenderedMode=value;root.dataset.worldTravel='false';host.dataset.mode=value;workspace.inert=value!=='workspace';workspace.hidden=value!=='workspace';stage.inert=value==='workspace';if(value==='workspace')stop();else wake();}
  function resetView(){camera.style.transform='';camera.style.transformOrigin='';onInspect?.(null);delete root.dataset.worldInspect;}
  async function start({focus=false}={}){resetView();setMode('roam');resize();if(focus)computer.focus({preventScroll:true});return true;}
  async function focus(){resetView();setMode('workspace');return true;}
  async function leave(){await start();computer.focus({preventScroll:true});return true;}
  async function outside(){resetView();setMode('roam');camera.style.transformOrigin='76% 25%';camera.style.transform='scale(1.18)';return true;}
  async function inspect(kind){if(!['coffee','books','spines'].includes(kind))return false;setMode('inspect');root.dataset.worldInspect=kind;
    camera.style.transformOrigin=kind==='coffee'?'71% 62%':'24% 68%';camera.style.transform=`scale(${kind==='coffee'?1.6:1.35})`;onInspect?.(kind);return true;
  }
  async function restoreInspection(){resetView();setMode('roam');return true;}
  function setQuiet(value){quiet=value;if(value){stop();soundWanted=false;pauseSound();syncSound();}else wake();}
  function visibility(){stop();if(document.hidden||root.hidden)pauseSound();else{wake();playSound();}}
  listen(document,'visibilitychange',visibility);listen(reduced,'change',()=>{stop();paint(elapsed);wake();});
  const observer=new ResizeObserver(resize);observer.observe(root);
  const hiddenObserver=new MutationObserver(visibility);hiddenObserver.observe(root,{attributes:true,attributeFilter:['hidden']});
  onCat?.('unavailable');setMode('roam');resize();
  firstTimer=setTimeout(()=>{if(!hasFrame){first(false);onFailure?.();}},20000);
  if(ctx){
    image.src=assets.image;image.srcset=assets.srcset||'';image.sizes='100vw';
    image.decode().then(()=>{if(disposed)return;paint(elapsed);wake();}).catch(()=>{if(!disposed){first(false);onFailure?.();}});
  }else queueMicrotask(()=>{if(!disposed){first(false);onFailure?.();}});
  return {firstFrame,start,focus,leave,outside,inspect,restoreInspection,interactCat(){return false;},setTheme(){},setQuiet,wake,get mode(){return mode;},dispose(){
    if(disposed)return;disposed=true;clearTimeout(firstTimer);stop();pauseSound();abort.abort();observer.disconnect();hiddenObserver.disconnect();
    for(const audio of [music,ambience]){audio.removeAttribute('src');audio.load();}
    for(const [node,anchor] of anchors)anchor.replaceWith(node);workspace.remove();
    soundButton.remove();credits.remove();quietButton.textContent=quietLabel;host.remove();first(false);delete root.dataset.worldRenderer;delete root.dataset.rainTime;
  }};
}
