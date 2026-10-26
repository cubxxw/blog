import {expect,type Page} from '@playwright/test';

type ControlPoint={count:number,x:number,y:number,width:number,height:number,visible:boolean,enabled:boolean,inside:boolean,hit:boolean};

// Only for the room's stationary DOM tools, never projected or moving 3D objects.
// One browser snapshot keeps the original guards without repeated element-handle
// resolution and trace snapshots while a software GPU is busy.
export async function clickStaticRoomControl(page:Page,selector:string){
  let point:ControlPoint={count:0,x:0,y:0,width:0,height:0,visible:false,enabled:false,inside:false,hit:false};
  await expect.poll(async()=>{
    point=await page.evaluate(selector=>{
      const matches=document.querySelectorAll<HTMLElement>(selector),el=matches[0];
      if(matches.length!==1||!el)return {count:matches.length,x:0,y:0,width:0,height:0,visible:false,enabled:false,inside:false,hit:false};
      el.scrollIntoView({block:'nearest',behavior:'instant'});
      const r=el.getBoundingClientRect(),style=getComputedStyle(el),x=r.x+r.width/2,y=r.y+r.height/2;
      return {count:1,x,y,width:r.width,height:r.height,
        visible:el.isConnected&&r.width>0&&r.height>0&&style.visibility!=='hidden'&&style.visibility!=='collapse'&&style.display!=='none',
        enabled:!el.matches(':disabled')&&!el.closest('[aria-disabled="true" i]'),
        inside:x>=0&&y>=0&&x<innerWidth&&y<innerHeight,hit:el.contains(document.elementFromPoint(x,y))};
    },selector);
    return {count:point.count,visible:point.visible,enabled:point.enabled};
  },{timeout:5000}).toEqual({count:1,visible:true,enabled:true});
  expect(point.width).toBeGreaterThanOrEqual(44);expect(point.height).toBeGreaterThanOrEqual(44);
  expect(point.inside).toBe(true);expect(point.hit).toBe(true);
  await page.mouse.click(point.x,point.y);
}
