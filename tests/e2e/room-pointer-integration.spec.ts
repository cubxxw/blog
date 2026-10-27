import {test,expect} from '@playwright/test';
import {withRoomPointerBatch} from '../helpers/room-pointer';
import {clickStaticRoomControl} from '../helpers/static-room-control';
import {hitRoomObject,projectRoomObject} from '../helpers/room-interaction';
import {withRoomObservationSession} from '../helpers/room-observation';
import {readFileSync} from 'node:fs';

test('batched stationary controls keep their actual native click and every hit guard',async({page})=>{
 await page.setContent('<button style="width:64px;height:64px" onclick="this.textContent=\'clicked\'">ready</button><script>window.nativeClicks=[];document.addEventListener("click",e=>window.nativeClicks.push(e.isTrusted));</script>');
 await withRoomObservationSession(page,async()=>withRoomPointerBatch(page,async pointer=>{
  await clickStaticRoomControl(page,'button',pointer);await expect(page.locator('button')).toHaveText('clicked');
 }));
 expect(await page.evaluate(()=>(window as unknown as {nativeClicks:boolean[]}).nativeClicks)).toEqual([true]);
 await page.locator('button').evaluate(el=>{el.style.width='43px';});
 await expect(withRoomObservationSession(page,async()=>withRoomPointerBatch(page,async pointer=>{await clickStaticRoomControl(page,'button',pointer);}))).rejects.toThrow();
 expect(await page.evaluate(()=>(window as unknown as {nativeClicks:boolean[]}).nativeClicks)).toEqual([true]);
});

test('batched real Three projection and offscreen canvas focus preserve target input',async({page})=>{
 const pose={x:0,y:1,z:3,yaw:0,pitch:0,fov:50};
 await page.route('http://room.test/**',route=>route.fulfill(new URL(route.request().url()).pathname==='/three.js'
  ?{contentType:'application/javascript',body:readFileSync('assets/js/vendor/three.module.min.js','utf8')}
  :{contentType:'text/html',body:`<!doctype html><script type="importmap">{"imports":{"three":"/three.js"}}</script><section data-bear-workspace style="position:fixed;left:0;top:0;width:320px;height:240px" data-world-pose='${JSON.stringify(pose)}' data-world-targets='{"center":[0,1,0],"behind":[0,1,6]}'><canvas class="space-world__canvas" tabindex="0" style="width:100%;height:100%"></canvas></section><script>window.presses=[];document.addEventListener('pointerdown',e=>window.presses.push({x:e.clientX,y:e.clientY,trusted:e.isTrusted,target:e.target.tagName}));</script>`}));
 await page.goto('http://room.test/');
 const original=await projectRoomObject(page,'center');await page.mouse.click(original.x,original.y);
 await withRoomObservationSession(page,async()=>withRoomPointerBatch(page,async pointer=>{
  await hitRoomObject(page,'center',{cdpDrag:true,pointer});
  const presses=await page.evaluate(()=>(window as unknown as {presses:{x:number;y:number;trusted:boolean;target:string}[]}).presses);
  expect(presses).toHaveLength(2);expect(presses[1]).toEqual(presses[0]);expect(presses[1].trusted).toBe(true);expect(presses[1].target).toBe('CANVAS');
 }));
 await page.locator('canvas').evaluate(el=>el.blur());
 await withRoomObservationSession(page,async()=>withRoomPointerBatch(page,async pointer=>{
  let focused=0;const owned={...pointer,focusCanvas:()=>{focused++;return pointer.focusCanvas();}};
  const behind=await projectRoomObject(page,'behind',true,{pointer:owned});expect(behind.inFront).toBe(false);expect(focused).toBe(1);
  await expect(page.locator('canvas')).toBeFocused();await expect(page.locator('section')).toHaveAttribute('data-world-pose',JSON.stringify(pose));
 }));
});
