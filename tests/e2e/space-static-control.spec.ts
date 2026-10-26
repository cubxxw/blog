import {test,expect} from '@playwright/test';
import {clickStaticRoomControl} from '../helpers/static-room-control';

async function fixture(page:import('@playwright/test').Page,markup:string){
  await page.setContent(`<style>button{width:44px;height:44px;padding:0}</style>${markup}<script>window.received=[];document.addEventListener('click',event=>window.received.push({trusted:event.isTrusted,target:event.target.id}));</script>`);
}
const received=(page:import('@playwright/test').Page)=>page.evaluate(()=>(window as unknown as {received:{trusted:boolean,target:string}[]}).received);

test('stationary room control uses a trusted pointer after the real hit guards',async({page})=>{
  await fixture(page,'<button id="tool">Tool</button>');
  await clickStaticRoomControl(page,'#tool');
  expect(await received(page)).toEqual([{trusted:true,target:'tool'}]);
});

test('stationary room control does not click hidden or disabled targets',async({page})=>{
  await fixture(page,'<button id="hidden" hidden>Hidden</button><button id="disabled" disabled>Disabled</button>');
  await expect(clickStaticRoomControl(page,'#hidden')).rejects.toThrow();
  await expect(clickStaticRoomControl(page,'#disabled')).rejects.toThrow();
  expect(await received(page)).toEqual([]);
});

test('stationary room control respects inherited aria-disabled',async({page})=>{
  await fixture(page,'<div aria-disabled="true"><button id="tool">Tool</button></div>');
  await expect(clickStaticRoomControl(page,'#tool')).rejects.toThrow();
  expect(await received(page)).toEqual([]);
});

test('stationary room control rejects small and covered targets',async({page})=>{
  await fixture(page,'<button id="small" style="width:43px">Small</button>');
  await expect(clickStaticRoomControl(page,'#small')).rejects.toThrow();
  expect(await received(page)).toEqual([]);
  await fixture(page,'<button id="covered">Covered</button><div style="position:fixed;inset:0;z-index:2"></div>');
  await expect(clickStaticRoomControl(page,'#covered')).rejects.toThrow();
  expect(await received(page)).toEqual([]);
});

test('stationary room control rejects ambiguous selectors',async({page})=>{
  await fixture(page,'<button class="tool">One</button><button class="tool">Two</button>');
  await expect(clickStaticRoomControl(page,'.tool')).rejects.toThrow();
  expect(await received(page)).toEqual([]);
});
