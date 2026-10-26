import {test,expect} from '@playwright/test';
import {expectRoomAttributes,observePausedResident,waitForRoomObjectAdvance,withRoomObservationSession,readRoomObservation} from '../helpers/room-observation';
test.use({channel:'chromium'});

async function room(page:import('@playwright/test').Page){
  await page.setContent('<main data-bear-workspace data-cat-active="false" data-cat-pose="rest" data-world-frames="7" data-room-objects=\'{"platterAngle":0}\'></main>');
}
test('room observations see actual timer changes without requiring animation frames',async({page})=>{
  await room(page);await page.evaluate(()=>{
    window.requestAnimationFrame=()=>0;
    setTimeout(()=>{const root=document.querySelector<HTMLElement>('main')!;root.dataset.worldMode='workspace';root.dataset.roomObjects='{"platterAngle":0.25}';},100);
  });
  await expectRoomAttributes(page,{'data-world-mode':'workspace'});
  expect(await waitForRoomObjectAdvance(page,'platterAngle',0)).toBe(.25);
  await observePausedResident(page,true);
});
test('resident pause observes the full pose and quiet frame windows',async({page})=>{
  await room(page);await page.evaluate(()=>{setTimeout(()=>document.querySelector<HTMLElement>('main')!.dataset.catPose='moved',200);});
  await expect(observePausedResident(page)).rejects.toThrow('Resident moved during400ms');
  await room(page);await page.evaluate(()=>{setTimeout(()=>document.querySelector<HTMLElement>('main')!.dataset.worldFrames='8',500);});
  await expect(observePausedResident(page,true)).rejects.toThrow('Quiet room rendered during200ms');
});
test('resident pause refuses a replacement room even if its attributes match',async({page})=>{
  await room(page);await page.evaluate(()=>{setTimeout(()=>{const root=document.querySelector('main')!;root.replaceWith(root.cloneNode(true));},200);});
  await expect(observePausedResident(page)).rejects.toThrow('root replaced');
});
test('room observations reject unchanged state at the original5s gate',async({page})=>{
  test.setTimeout(30000);await room(page);
  await expect(expectRoomAttributes(page,{'data-world-mode':'workspace'})).rejects.toThrow('exceeded5000ms');
  await expect(waitForRoomObjectAdvance(page,'platterAngle',0)).rejects.toThrow('exceeded5000ms');
  await page.evaluate(()=>document.querySelector<HTMLElement>('main')!.dataset.catActive='true');
  await expect(observePausedResident(page)).rejects.toThrow('exceeded5000ms');
});
test('room observations reject ambiguous roots and invalid numeric state',async({page})=>{
  await room(page);await page.evaluate(()=>document.body.append(document.querySelector('main')!.cloneNode(true)));
  await expect(expectRoomAttributes(page,{})).rejects.toThrow('ambiguous');
  await expect(observePausedResident(page)).rejects.toThrow('ambiguous');
  await room(page);await page.evaluate(()=>document.querySelector<HTMLElement>('main')!.dataset.roomObjects='{"platterAngle":null}');
  await expect(waitForRoomObjectAdvance(page,'platterAngle',0)).rejects.toThrow('invalid');
});

test('a journey reuses only its own observation session and detaches on success and failure',async({page,context})=>{
  await room(page);const create=context.newCDPSession.bind(context);let attached=0,detached=0;
  context.newCDPSession=async target=>{const session=await create(target),detach=session.detach.bind(session);attached++;session.detach=async()=>{detached++;await detach();};return session;};
  try{
    await withRoomObservationSession(page,async()=>{});expect(attached).toBe(0);
    await withRoomObservationSession(page,async()=>{
      await expectRoomAttributes(page,{'data-cat-active':'false'});await observePausedResident(page,true);
      expect(attached).toBe(1);expect(detached).toBe(0);
      await expect(withRoomObservationSession(page,async()=>{})).rejects.toThrow('already active');
    });
    expect(detached).toBe(1);
    await expect(withRoomObservationSession(page,async()=>{
      await expectRoomAttributes(page,{'data-cat-active':'false'});
      await page.evaluate(()=>document.querySelector<HTMLElement>('main')!.dataset.roomObjects='{"platterAngle":null}');
      await expect(waitForRoomObjectAdvance(page,'platterAngle',0)).rejects.toThrow('invalid');
      // Catching the observation failure cannot revive this scope or reconnect.
      await expect(expectRoomAttributes(page,{'data-cat-active':'false'})).rejects.toThrow('invalid');
    })).rejects.toThrow('invalid');
    expect(attached).toBe(2);expect(detached).toBe(2);
    await withRoomObservationSession(page,async()=>expectRoomAttributes(page,{'data-cat-active':'false'}));
    expect(attached).toBe(3);expect(detached).toBe(3);
  }finally{context.newCDPSession=create;}
});

test('a scoped observation refuses late attach and send at the real5s deadline',async({page,context})=>{
  test.setTimeout(30000);await room(page);const create=context.newCDPSession.bind(context);
  try{for(const stage of ['attach','send']){
    let detached=0,late=false;
    context.newCDPSession=async target=>{
      const session=await create(target),detach=session.detach.bind(session);
      session.detach=async()=>{detached++;await detach();};
      if(stage==='attach'){await new Promise(resolve=>setTimeout(resolve,5150));late=true;}
      else session.send=(async()=>{await new Promise(resolve=>setTimeout(resolve,5150));late=true;return {result:{value:true}};}) as typeof session.send;
      return session;
    };
    await expect(withRoomObservationSession(page,async()=>expectRoomAttributes(page,{'data-cat-active':'false'}))).rejects.toThrow('exceeded5000ms');
    await expect.poll(()=>detached).toBe(1);await expect.poll(()=>late).toBe(true);
  }}finally{context.newCDPSession=create;}
});

test('scoped observation preserves its first failure during cleanup and rejects overlapping reads',async({page,context})=>{
  await room(page);const create=context.newCDPSession.bind(context);
  try{
    context.newCDPSession=async target=>{const session=await create(target),detach=session.detach.bind(session);session.detach=async()=>{await detach();throw new Error('controlled cleanup error');};return session;};
    await expect(withRoomObservationSession(page,async()=>expectRoomAttributes(page,{'data-cat-active':'false'}))).rejects.toThrow('controlled cleanup error');
    await expect(withRoomObservationSession(page,async()=>readRoomObservation(page,()=>{throw new Error('controlled first error');},undefined,{timeout:5000,label:'Fault',validate:(value):value is boolean=>value===true}))).rejects.toThrow('controlled first error');
    context.newCDPSession=create;
    await expect(withRoomObservationSession(page,async()=>{
      const first=readRoomObservation(page,async()=>{await new Promise(resolve=>setTimeout(resolve,100));return true;},undefined,{timeout:5000,label:'Overlap',validate:(value):value is boolean=>value===true});
      const second=expectRoomAttributes(page,{'data-cat-active':'false'});
      const results=await Promise.allSettled([first,second]);expect(results.every(result=>result.status==='rejected')).toBe(true);
    })).rejects.toThrow('Concurrent room observations');
  }finally{context.newCDPSession=create;}
});

test('an unawaited observation fails its journey and a late attach cannot retain an orphan session',async({page,context})=>{
  await room(page);const create=context.newCDPSession.bind(context);let detached=0,read!:Promise<unknown>;
  context.newCDPSession=async target=>{const session=await create(target),detach=session.detach.bind(session);session.detach=async()=>{detached++;await detach();};await new Promise(resolve=>setTimeout(resolve,150));return session;};
  try{
    await expect(withRoomObservationSession(page,async()=>{read=expectRoomAttributes(page,{'data-cat-active':'false'});void read.catch(()=>{});})).rejects.toThrow('pending observation');
    context.newCDPSession=create;
    await withRoomObservationSession(page,async()=>expectRoomAttributes(page,{'data-cat-active':'false'}));
    await expect(read).rejects.toThrow('pending observation');await expect.poll(()=>detached).toBe(1);
  }finally{context.newCDPSession=create;}
});

test('a journey holds its ownership lock until its delayed detach has finished',async({page,context})=>{
  await room(page);const create=context.newCDPSession.bind(context);let detaching=false,release!:()=>void;
  const blocked=new Promise<void>(resolve=>{release=resolve;});
  context.newCDPSession=async target=>{const session=await create(target),detach=session.detach.bind(session);session.detach=async()=>{detaching=true;await blocked;await detach();};return session;};
  const journey=withRoomObservationSession(page,async()=>expectRoomAttributes(page,{'data-cat-active':'false'}));
  try{
    await expect.poll(()=>detaching).toBe(true);
    await expect(withRoomObservationSession(page,async()=>{})).rejects.toThrow('already active');release();await journey;
  }finally{release();context.newCDPSession=create;await journey;}
});
