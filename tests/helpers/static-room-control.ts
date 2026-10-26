import {expect,type Page} from '@playwright/test';
import {readRoomObservation} from './room-observation';

type ControlPoint={count:number,x:number,y:number,width:number,height:number,visible:boolean,enabled:boolean,inside:boolean,hit:boolean};
// Stationary DOM tools only. Keep the common hard5s and all original hit guards.
async function staticPoint(page:Page,selector:string):Promise<ControlPoint>{
  async function observe(selector:string){
    const deadline=performance.now()+5000;
    for(;;){
      if(performance.now()>deadline)throw new Error('Static control visibility/enablement exceeded5000ms');
      const matches=document.querySelectorAll<HTMLElement>(selector),el=matches[0];
      if(matches.length>1)return {count:matches.length,x:0,y:0,width:0,height:0,visible:false,enabled:false,inside:false,hit:false};
      if(el){
        el.scrollIntoView({block:'nearest',behavior:'instant'});
        const r=el.getBoundingClientRect(),style=getComputedStyle(el),x=r.x+r.width/2,y=r.y+r.height/2;
        const visible=el.isConnected&&r.width>0&&r.height>0&&style.visibility!=='hidden'&&style.visibility!=='collapse'&&style.display!=='none',enabled=!el.matches(':disabled')&&!el.closest('[aria-disabled="true" i]');
        if(visible&&enabled){
          const point={count:1,x,y,width:r.width,height:r.height,visible,enabled,inside:x>=0&&y>=0&&x<innerWidth&&y<innerHeight,hit:el.contains(document.elementFromPoint(x,y))};
          if(performance.now()>deadline)throw new Error('Static control geometry exceeded5000ms');
          return point;
        }
      }
      const remaining=deadline-performance.now();if(remaining<=0)throw new Error('Static control visibility/enablement exceeded5000ms');
      await new Promise(resolve=>setTimeout(resolve,Math.min(50,remaining)));
    }
  }
  return readRoomObservation(page,observe,selector,{timeout:5000,label:'Static control observation',validate:(value):value is ControlPoint=>{
    if(!value||typeof value!=='object')return false;const point=value as Record<string,unknown>;
    return ['count','x','y','width','height'].every(key=>typeof point[key]==='number'&&Number.isFinite(point[key]))&&['visible','enabled','inside','hit'].every(key=>typeof point[key]==='boolean');
  }});
}
export async function clickStaticRoomControl(page:Page,selector:string){
  const point=await staticPoint(page,selector);
  expect({count:point.count,visible:point.visible,enabled:point.enabled}).toEqual({count:1,visible:true,enabled:true});
  expect(point.width).toBeGreaterThanOrEqual(44);expect(point.height).toBeGreaterThanOrEqual(44);
  expect(point.inside).toBe(true);expect(point.hit).toBe(true);
  await page.mouse.click(point.x,point.y);
}
