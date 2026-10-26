import {test,expect} from '@playwright/test';
import {dragRoomMouse,clickAfterRoomDrags,projectRoomObject} from '../helpers/room-interaction';
import {withRoomObservationSession} from '../helpers/room-observation';
import {observeRoomAudio,roomAudioSources,readRoomAudioSources} from '../helpers/room-audio';
import {readFileSync} from 'node:fs';
test.use({channel:'chromium'});
async function fixture(page:import('@playwright/test').Page){
  await page.setContent('<div id="surface" style="position:fixed;inset:0;touch-action:none"></div><script>window.events=[];for(const type of ["pointerdown","pointermove","pointerup"])document.addEventListener(type,e=>{window.events.push({type,trusted:e.isTrusted,x:e.clientX,y:e.clientY,buttons:e.buttons});if(type==="pointerdown")e.target.setPointerCapture(e.pointerId);});</script>');
}
const events=(page:import('@playwright/test').Page)=>page.evaluate(()=>(window as unknown as {events:unknown[]}).events);
test('room protocol drag emits native trusted input and keeps the next Playwright pointer position',async({page})=>{
  await fixture(page);await dragRoomMouse(page,{x:60,y:60},{x:120,y:100});
  await page.mouse.down();await page.mouse.up();
  const actual=await events(page);
  expect(actual).toContainEqual({type:'pointerdown',trusted:true,x:60,y:60,buttons:1});
  expect(actual).toContainEqual({type:'pointermove',trusted:true,x:120,y:100,buttons:1});
  expect(actual).toContainEqual({type:'pointerup',trusted:true,x:120,y:100,buttons:0});
  expect(actual).toContainEqual({type:'pointerdown',trusted:true,x:120,y:100,buttons:1});
});
test('room protocol failure releases its pressed button and detaches its own session',async({page,context})=>{
  await fixture(page);const create=context.newCDPSession.bind(context);let injected=false,detached=false;
  context.newCDPSession=async target=>{
    const session=await create(target),send=session.send.bind(session),detach=session.detach.bind(session);
    session.send=(async(method:string,params:any)=>{if(method==='Input.dispatchMouseEvent'&&params?.type==='mouseMoved'&&params?.buttons===1&&!injected){injected=true;throw new Error('injected room pointer failure');}return send(method as any,params);}) as typeof session.send;
    session.detach=async()=>{detached=true;await detach();};return session;
  };
  try{await expect(dragRoomMouse(page,{x:60,y:60},{x:120,y:100})).rejects.toThrow('injected room pointer failure');}
  finally{context.newCDPSession=create;}
  expect(injected).toBe(true);expect(detached).toBe(true);
  expect(await events(page)).toContainEqual({type:'pointerup',trusted:true,x:120,y:100,buttons:0});
  await page.mouse.down();await page.mouse.up();
  expect(await events(page)).toContainEqual({type:'pointerdown',trusted:true,x:120,y:100,buttons:1});
});

test('room protocol attach timeout detaches a late session without sending input',async({page,context})=>{
  test.setTimeout(90000); // Exercise the real 30s operation deadline, without fake timers.
  await fixture(page);const create=context.newCDPSession.bind(context);
  const session=await create(page),detach=session.detach.bind(session);
  let detached=false,deliver!:()=>void;
  session.detach=async()=>{try{await detach();}finally{detached=true;}};
  const delayed=new Promise<typeof session>(resolve=>{deliver=()=>resolve(session);});
  context.newCDPSession=()=>delayed;
  try{
    await expect(dragRoomMouse(page,{x:60,y:60},{x:120,y:100})).rejects.toThrow('Room mouse attach exceeded 30000ms');
    expect(detached).toBe(false);deliver();
    await expect.poll(()=>detached,{timeout:5000}).toBe(true);
    expect((await events(page)).filter((event:any)=>event.type==='pointerdown')).toEqual([]);
  }finally{context.newCDPSession=create;deliver();if(!detached)await detach();}
});

test('camera drag scope ends in a real click and synchronizes the next Playwright down',async({page})=>{
  await fixture(page);await clickAfterRoomDrags(page,async drag=>{await drag({x:60,y:60},{x:120,y:100});return {x:160,y:140};});
  await page.mouse.down();await page.mouse.up();const actual=await events(page);
  expect(actual).toContainEqual({type:'pointerdown',trusted:true,x:60,y:60,buttons:1});
  expect(actual).toContainEqual({type:'pointermove',trusted:true,x:120,y:100,buttons:1});
  expect(actual.filter((event:any)=>event.type==='pointerdown'&&event.x===160&&event.y===140)).toHaveLength(2);
});
test('camera target failure restores pointer position without a final click',async({page})=>{
  await fixture(page);await expect(clickAfterRoomDrags(page,async drag=>{await drag({x:60,y:60},{x:120,y:100});throw new Error('target resolution failed');})).rejects.toThrow('target resolution failed');
  expect((await events(page)).filter((event:any)=>event.type==='pointerdown')).toHaveLength(1);
  await page.mouse.down();await page.mouse.up();expect(await events(page)).toContainEqual({type:'pointerdown',trusted:true,x:120,y:100,buttons:1});
});

test('a later attach failure restores the last successful camera drag position',async({page,context})=>{
  await fixture(page);const create=context.newCDPSession.bind(context);let calls=0;
  context.newCDPSession=async target=>{if(++calls===2)throw new Error('injected second attach failure');return create(target);};
  try{await expect(clickAfterRoomDrags(page,async drag=>{await drag({x:60,y:60},{x:120,y:100});await drag({x:120,y:100},{x:180,y:140});return {x:200,y:180};})).rejects.toThrow('injected second attach failure');}
  finally{context.newCDPSession=create;}
  expect(calls).toBe(2);expect((await events(page)).filter((event:any)=>event.type==='pointerdown')).toHaveLength(1);
  await page.mouse.down();await page.mouse.up();expect(await events(page)).toContainEqual({type:'pointerdown',trusted:true,x:120,y:100,buttons:1});
});

test('protocol camera projection matches actual Three geometry and preserves the original offscreen focus',async({page})=>{
  const pose={x:0,y:1,z:3,yaw:0,pitch:0,fov:50};
  await page.route('http://room.test/**',route=>route.fulfill(new URL(route.request().url()).pathname==='/three.js'
    ?{contentType:'application/javascript',body:readFileSync('assets/js/vendor/three.module.min.js','utf8')}
    :{contentType:'text/html',body:`<!doctype html><script type="importmap">{"imports":{"three":"/three.js"}}</script><section data-bear-workspace style="position:fixed;left:0;top:0;width:320px;height:240px" data-world-pose='${JSON.stringify(pose)}' data-world-targets='{"center":[0,1,0],"diagonal":[0.5,1.5,0],"behind":[0,1,6]}'><canvas class="space-world__canvas" tabindex="0"></canvas></section>`}));
  await page.goto('http://room.test/');
  await withRoomObservationSession(page,async()=>{
    const original=await projectRoomObject(page,'center'),native=await projectRoomObject(page,'center',false,{cdpDrag:true});
    // CDP JSON normalizes -0 to0; both produce the same mouse coordinate and
    // zero camera delta. Every nonzero coefficient must still match exactly.
    const zero=(point:typeof native)=>Object.fromEntries(Object.entries(point).map(([key,value])=>[key,Object.is(value,-0)?0:value]));
    expect(zero(native)).toEqual(zero(original));expect(native.x).toBe(160);expect(native.y).toBe(120);expect(native.inFront).toBe(true);
    expect(await projectRoomObject(page,'diagonal',false,{cdpDrag:true})).toEqual(await projectRoomObject(page,'diagonal'));
    const behind=await projectRoomObject(page,'behind',true,{cdpDrag:true});expect(behind.inFront).toBe(false);
    await expect(page.locator('canvas')).toBeFocused();
    await expect(page.locator('section')).toHaveAttribute('data-world-pose',JSON.stringify(pose));
  });
  await page.evaluate(()=>document.querySelector<HTMLElement>('section')!.dataset.worldTargets='{"center":[0,"invalid",0]}');
  await expect(projectRoomObject(page,'center',false,{cdpDrag:true})).rejects.toThrow('invalid value');
});

test('protocol audio snapshots observe native sample-clock sources without changing playback',async({page})=>{
  await observeRoomAudio(page);await page.route('http://audio.test/**',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><button id="play">Play</button><button id="stop">Stop</button><script>
  document.getElementById('play').onclick=()=>{window.audio=new AudioContext();for(const duration of [100,2]){const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=audio.createBuffer(1,audio.sampleRate*duration,audio.sampleRate);source.loop=true;gain.gain.value=.3;source.connect(gain);gain.connect(audio.destination);source.start(0,.2);}};
  document.getElementById('stop').onclick=async()=>{for(const source of window.__roomLoopSources)source.node.stop();await audio.close();window.audioClosed=true;};</script>`}));
  await page.goto('http://audio.test/');await page.getByRole('button',{name:'Play',exact:true}).click();
  await withRoomObservationSession(page,async()=>{
    const original=await roomAudioSources(page),native=await readRoomAudioSources(page);expect(native).toHaveLength(2);
    for(let i=0;i<2;i++){
      const {time:before,...a}=original[i],{time:after,...b}=native[i];expect(b).toEqual(a);expect(after).toBeGreaterThanOrEqual(before);expect(native[i].stopped).toBe(false);
    }
    await page.getByRole('button',{name:'Stop',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).audioClosed)).toBe(true);
    expect((await readRoomAudioSources(page)).every(source=>source.stopped&&source.context==='closed')).toBe(true);
  });
  await page.evaluate(()=>(window as any).__roomLoopSources[0].duration=NaN);
  await expect(readRoomAudioSources(page)).rejects.toThrow('invalid value');
});
