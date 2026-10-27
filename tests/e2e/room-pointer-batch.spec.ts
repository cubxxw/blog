import {test,expect,type Page} from '@playwright/test';
import {withRoomPointerBatch} from '../helpers/room-pointer';

async function fixture(page:Page){
 await page.setContent('<canvas class="space-world__canvas" tabindex="0" style="position:fixed;inset:0;width:100%;height:100%;touch-action:none"></canvas><script>window.events=[];for(const type of ["pointerdown","pointermove","pointerup","click","focusin"])document.addEventListener(type,e=>{const r={type,trusted:e.isTrusted,x:e.clientX,y:e.clientY,target:e.target.tagName};window.events.push(r);console.debug("__pointer_batch__"+JSON.stringify(r));});</script>');
}
const events=(page:Page)=>page.evaluate(()=>(window as unknown as {events:{type:string;trusted:boolean;x:number;y:number;target:string}[]}).events);
test('a scoped native pointer preserves trusted clicks, focus, drag and the next PW down position',async({page,context})=>{
 await fixture(page);const move=page.mouse.move.bind(page.mouse);let syncs=0;
 const create=context.newCDPSession.bind(context),pressed:{x:number;y:number}[]=[];let sessions=0,detaches=0;
 context.newCDPSession=async target=>{
  const session=await create(target),send=session.send.bind(session),detach=session.detach.bind(session);sessions++;
  session.send=(async(method:string,params:any)=>{if(method==='Input.dispatchMouseEvent'&&params.type==='mousePressed')pressed.push({x:params.x,y:params.y});return send(method as any,params);}) as typeof session.send;
  session.detach=async()=>{detaches++;await detach();};return session;
 };
 page.mouse.move=(async(...args:Parameters<typeof move>)=>{syncs++;return move(...args);}) as typeof page.mouse.move;
 try{
  await withRoomPointerBatch(page,async pointer=>{
   await pointer.focusCanvas();await pointer.click({x:60,y:60});await pointer.drag({x:60,y:60},{x:120,y:100});await pointer.click({x:160,y:140});
   expect(syncs).toBe(0);await expect(page.locator('canvas')).toBeFocused();
  });
  expect(syncs).toBe(1);await page.mouse.down();await page.mouse.up();
  expect(sessions).toBe(1);expect(detaches).toBe(1);
  expect(pressed).toEqual([{x:60,y:60},{x:60,y:60},{x:160,y:140}]);
  const actual=await events(page),downs=actual.filter(e=>e.type==='pointerdown');expect(downs).toHaveLength(4);
  expect(downs.every(e=>e.trusted&&e.target==='CANVAS')).toBe(true);
  // Mobile native CSS coordinates can contain a float32 projection residual.
  // Compare real CDP and subsequent PW coordinates exactly, and sent values above.
  expect(downs[3]).toEqual(downs[2]);
  expect(actual.filter(e=>e.type==='click').length).toBeGreaterThanOrEqual(2);
  expect(actual.some(e=>e.type==='focusin'&&e.trusted&&e.target==='CANVAS')).toBe(true);
 }finally{page.mouse.move=move;context.newCDPSession=create;}
});

test('an owner error preserves its first failure and synchronizes acknowledged input',async({page})=>{
 await fixture(page);
 await expect(withRoomPointerBatch(page,async pointer=>{await pointer.click({x:80,y:90});throw new Error('controlled owner failure');})).rejects.toThrow('controlled owner failure');
 expect(page.isClosed()).toBe(false);await page.mouse.down();await page.mouse.up();
 const downs=(await events(page)).filter(e=>e.type==='pointerdown');expect(downs).toHaveLength(2);expect(downs[1]).toEqual(downs[0]);
});

for(const operation of ['click','focusCanvas'] as const)test(`an unawaited ${operation} rejects and a late attach never sends input`,async({page,context})=>{
 await fixture(page);const create=context.newCDPSession.bind(context),session=await create(page),send=session.send.bind(session),detach=session.detach.bind(session);
 let deliver!:(value:typeof session)=>void,started!:()=>void,detached=false;const attached=new Promise<typeof session>(resolve=>{deliver=resolve;}),seen=new Promise<void>(resolve=>{started=resolve;}),commands:string[]=[];
 session.send=(async(method:string,params:any)=>{commands.push(method);return send(method as any,params);}) as typeof session.send;
 session.detach=async()=>{await detach();detached=true;};context.newCDPSession=()=>{started();return attached;};
 try{
  const work=withRoomPointerBatch(page,async pointer=>{void(operation==='click'?pointer.click({x:60,y:60}):pointer.focusCanvas());await seen;});
  const rejected=expect(work).rejects.toThrow('pending input');await seen;await new Promise(resolve=>setTimeout(resolve,0));deliver(session);await rejected;
  expect(commands).toEqual([]);expect(detached).toBe(true);expect((await events(page)).filter(e=>e.type==='pointerdown')).toEqual([]);
 }finally{context.newCDPSession=create;deliver(session);if(!detached)await detach();}
});

test('a pending acknowledged move cannot send a down after its owner returns',async({page,context})=>{
 await fixture(page);const create=context.newCDPSession.bind(context);let release!:()=>void,started!:()=>void;
 const held=new Promise<void>(resolve=>{release=resolve;}),seen=new Promise<void>(resolve=>{started=resolve;}),commands:string[]=[];
 context.newCDPSession=async target=>{const session=await create(target),send=session.send.bind(session);session.send=(async(method:string,params:any)=>{
  if(method==='Input.dispatchMouseEvent'){commands.push(params.type);const value=await send(method as any,params);if(params.type==='mouseMoved'){started();await held;}return value;}
  return send(method as any,params);
 }) as typeof session.send;return session;};
 try{
  const work=withRoomPointerBatch(page,async pointer=>{void pointer.click({x:80,y:90});await seen;});
  const rejected=expect(work).rejects.toThrow('pending input');await seen;await new Promise(resolve=>setTimeout(resolve,0));release();await rejected;
  expect(commands).toEqual(['mouseMoved']);expect((await events(page)).some(e=>e.type==='pointerdown')).toBe(false);
  const moves=(await events(page)).filter(e=>e.type==='pointermove'),moved=moves[moves.length-1]!;
  await page.mouse.down();await page.mouse.up();const down=(await events(page)).find(e=>e.type==='pointerdown')!;expect(down.x).toBe(moved.x);expect(down.y).toBe(moved.y);
 }finally{context.newCDPSession=create;release();}
});

test('concurrent and caught nested operations still fail their original owner',async({page})=>{
 await fixture(page);
 await expect(withRoomPointerBatch(page,async pointer=>{await Promise.allSettled([pointer.click({x:60,y:60}),pointer.drag({x:60,y:60},{x:80,y:90})]);})).rejects.toThrow('Concurrent');
 await expect(withRoomPointerBatch(page,async()=>{try{await withRoomPointerBatch(page,async()=>{});}catch{}})).rejects.toThrow('already active');
 expect((await events(page)).filter(e=>e.type==='pointerdown')).toEqual([]);
});

test('closed capabilities cannot send into a subsequent pointer owner',async({page})=>{
 await fixture(page);let previous!:import('../helpers/room-pointer').RoomPointer;
 await withRoomPointerBatch(page,async pointer=>{previous=pointer;await pointer.click({x:60,y:60});});
 await withRoomPointerBatch(page,async pointer=>{await expect(previous.click({x:80,y:90})).rejects.toThrow('closed');await pointer.click({x:120,y:100});});
 await page.mouse.down();await page.mouse.up();const downs=(await events(page)).filter(e=>e.type==='pointerdown');expect(downs).toHaveLength(3);expect(downs[2]).toEqual(downs[1]);
});

test('a post-press send failure releases native input and quarantines the page',async({page,context})=>{
 await fixture(page);const captured:any[]=[];page.on('console',message=>{if(message.text().startsWith('__pointer_batch__'))captured.push(JSON.parse(message.text().slice('__pointer_batch__'.length)));});
 const create=context.newCDPSession.bind(context);let injected=false;
 context.newCDPSession=async target=>{const session=await create(target),send=session.send.bind(session);session.send=(async(method:string,params:any)=>{
  const value=await send(method as any,params);if(method==='Input.dispatchMouseEvent'&&params.type==='mousePressed'&&!injected){injected=true;throw new Error('controlled post-press failure');}return value;
 }) as typeof session.send;return session;};
 try{
  await expect(withRoomPointerBatch(page,async pointer=>{await pointer.click({x:60,y:60});})).rejects.toThrow('post-press failure');
  expect(page.isClosed()).toBe(true);expect(captured.some(e=>e.type==='pointerdown'&&e.trusted)).toBe(true);expect(captured.some(e=>e.type==='pointerup'&&e.trusted)).toBe(true);
 }finally{context.newCDPSession=create;}
});

test('a detach failure is not swallowed after successful native input',async({page,context})=>{
 await fixture(page);const create=context.newCDPSession.bind(context);
 context.newCDPSession=async target=>{const session=await create(target),detach=session.detach.bind(session);session.detach=async()=>{await detach();throw new Error('controlled detach failure');};return session;};
 try{await expect(withRoomPointerBatch(page,async pointer=>{await pointer.click({x:60,y:60});})).rejects.toThrow('detach failure');expect(page.isClosed()).toBe(true);}
 finally{context.newCDPSession=create;}
});

test('closing the owned page fails the scope rather than reporting success',async({page})=>{
 await fixture(page);await expect(withRoomPointerBatch(page,async pointer=>{await pointer.click({x:60,y:60});await page.close();})).rejects.toThrow('page closed');
});

test('invalid coordinates and an ambiguous canvas cannot produce a successful batch',async({page})=>{
 await fixture(page);await expect(withRoomPointerBatch(page,async pointer=>{await pointer.click({x:NaN,y:60});})).rejects.toThrow('coordinates invalid');
 await page.evaluate(()=>{const extra=document.createElement('canvas');extra.className='space-world__canvas';document.body.append(extra);});
 await expect(withRoomPointerBatch(page,async pointer=>{await pointer.focusCanvas();})).rejects.toThrow('canvas focus failed');expect((await events(page)).filter(e=>e.type==='pointerdown')).toEqual([]);
});

test('an input reply timeout quarantines the page before a late dispatch can resume',async({page,context})=>{
 test.setTimeout(90000);await fixture(page);const create=context.newCDPSession.bind(context);let release!:()=>void,late:Promise<unknown>|undefined;
 const held=new Promise<void>(resolve=>{release=resolve;});
 context.newCDPSession=async target=>{const session=await create(target),send=session.send.bind(session);session.send=(async(method:string,params:any)=>{
  if(method==='Input.dispatchMouseEvent'&&params.type==='mousePressed'){late=held.then(()=>send(method as any,params));void late.catch(()=>{});return late;}
  return send(method as any,params);
 }) as typeof session.send;return session;};
 try{
  await expect(withRoomPointerBatch(page,async pointer=>{await pointer.click({x:60,y:60});})).rejects.toThrow('mousePressed exceeded30000ms');
  expect(page.isClosed()).toBe(true);release();await Promise.allSettled([late!]);
 }finally{context.newCDPSession=create;release();}
});
