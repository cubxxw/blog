import {expect,type Page} from '@playwright/test';

type ControlPoint={count:number,x:number,y:number,width:number,height:number,visible:boolean,enabled:boolean,inside:boolean,hit:boolean};

// Only for the room's stationary DOM tools, never projected or moving 3D objects.
// One native 5s wait requires visibility and enablement together (stricter
// than two sequential5s waits). Timer polling works with a stopped rAF.
// jsonValue/dispose avoid additional trace snapshots; all hit guards remain.
// https://playwright.dev/docs/test-assertions#auto-retrying-assertions
export async function clickStaticRoomControl(page:Page,selector:string){
  const handle=await page.waitForFunction(selector=>{
      const matches=document.querySelectorAll<HTMLElement>(selector),el=matches[0];
      if(matches.length>1)return {count:matches.length,x:0,y:0,width:0,height:0,visible:false,enabled:false,inside:false,hit:false};
      if(!el)return false;
      el.scrollIntoView({block:'nearest',behavior:'instant'});
      const r=el.getBoundingClientRect(),style=getComputedStyle(el),x=r.x+r.width/2,y=r.y+r.height/2;
      const visible=el.isConnected&&r.width>0&&r.height>0&&style.visibility!=='hidden'&&style.visibility!=='collapse'&&style.display!=='none',enabled=!el.matches(':disabled')&&!el.closest('[aria-disabled="true" i]');
      if(!visible||!enabled)return false;
      return {count:1,x,y,width:r.width,height:r.height,visible,enabled,
        inside:x>=0&&y>=0&&x<innerWidth&&y<innerHeight,hit:el.contains(document.elementFromPoint(x,y))};
  },selector,{timeout:5000,polling:50});
  let point:ControlPoint;try{point=await handle.jsonValue();}finally{await handle.dispose();}
  expect({count:point.count,visible:point.visible,enabled:point.enabled}).toEqual({count:1,visible:true,enabled:true});
  expect(point.width).toBeGreaterThanOrEqual(44);expect(point.height).toBeGreaterThanOrEqual(44);
  expect(point.inside).toBe(true);expect(point.hit).toBe(true);
  await page.mouse.click(point.x,point.y);
}
