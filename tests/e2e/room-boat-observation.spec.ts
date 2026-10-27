import {test,expect} from '@playwright/test';
import {waitForRoomBoatMove,withRoomObservationSession} from '../helpers/room-observation';

test('boat motion observation reads a real changed finite pose',async({page})=>{
 await page.setContent('<section data-bear-workspace data-room-boat-pose="[0,0,0]"></section>');
 await page.evaluate(()=>{setTimeout(()=>document.querySelector('[data-bear-workspace]')!.setAttribute('data-room-boat-pose','[1,0,0]'),75);});
 await withRoomObservationSession(page,async()=>{expect(await waitForRoomBoatMove(page,'[0,0,0]')).toBe('[1,0,0]');});
 await expect(page.locator('section')).toHaveAttribute('data-room-boat-pose','[1,0,0]');
});

test('boat motion observation cannot succeed on a static pose within its real5s gate',async({page})=>{
 await page.setContent('<section data-bear-workspace data-room-boat-pose="[0,0,0]"></section>');
 const began=performance.now();
 await expect(waitForRoomBoatMove(page,'[0,0,0]')).rejects.toThrow('5000ms');
 expect(performance.now()-began).toBeGreaterThanOrEqual(4900);
 await expect(page.locator('section')).toHaveAttribute('data-room-boat-pose','[0,0,0]');
});

test('boat observation rejects a replaced root and malformed pose instead of invented progress',async({page})=>{
 await page.setContent('<section data-bear-workspace data-room-boat-pose="[0,0,0]"></section>');
 await page.evaluate(()=>{
  const root=document.querySelector('[data-bear-workspace]')!,get=root.getAttribute.bind(root);let sampled=false;
  root.getAttribute=name=>{const value=get(name);if(name==='data-room-boat-pose'&&!sampled){sampled=true;queueMicrotask(()=>{const copy=root.cloneNode(true) as Element;copy.setAttribute('data-room-boat-pose','[1,0,0]');root.replaceWith(copy);});}return value;};
 });
 await expect(waitForRoomBoatMove(page,'[0,0,0]')).rejects.toThrow('root replaced');
 await page.setContent('<section data-bear-workspace data-room-boat-pose="[1]"></section>');
 await expect(waitForRoomBoatMove(page,'[0,0,0]')).rejects.toThrow('invalid boat pose');
 await expect(waitForRoomBoatMove(page,null)).rejects.toThrow('baseline invalid');
});
