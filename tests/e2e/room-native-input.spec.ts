import {test,expect} from '@playwright/test';
import {dragRoomMouse} from '../helpers/room-interaction';
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
