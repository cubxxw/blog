import test from 'node:test';
import assert from 'node:assert/strict';
import {mountOnboarding} from '../assets/js/space/onboarding.js';

// Deterministic DOM boundary: the real controller owns these timers. Advancing
// the clock catches both a hidden active modal and runaway failure repainting.
function fixture() {
  const originals=new Map(),timers=new Map();let now=0,id=0;
  const replace=(key,value)=>{originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
  const skip=new EventTarget();skip.focus=()=>{};
  const status={textContent:''},steps=Array.from({length:3},()=>({dataset:{}}));
  const panel={hidden:false,contains:()=>false,querySelector:s=>s==='[data-boot-status]'?status:skip,querySelectorAll:()=>steps};
  const root={dataset:{},querySelector:s=>s==='[data-space-boot]'?panel:{focus(){}}};
  const media=new EventTarget();media.matches=false;
  replace('document',{documentElement:{lang:'zh'},activeElement:null});replace('window',new EventTarget());
  replace('matchMedia',()=>media);replace('performance',{now:()=>now});replace('localStorage',{getItem:()=>null,setItem(){}});
  replace('setTimeout',(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;});replace('clearTimeout',key=>timers.delete(key));
  const boot=mountOnboarding({root,enabled:true});
  return {boot,root,panel,skip,status,
    at(value){now=value;},
    advance(value){let calls=0;while(true){const entry=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!entry||entry[1].at>value)break;if(++calls>50)throw new Error('Runaway onboarding timer');timers.delete(entry[0]);now=entry[1].at;entry[1].fn();}now=value;},
    get pending(){return timers.size;},
    restore(){boot.dispose();for(const [key,descriptor] of originals)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];},
  };
}

test('failure after the first frame stops presentation timers and retains a usable escape',()=>{
  const f=fixture();try{
    f.at(200);f.boot.event('frame');assert.equal(f.pending,1);
    f.at(400);f.boot.event('failure');f.advance(5000);
    assert.equal(f.pending,0);assert.equal(f.boot.active,true);assert.equal(f.skip.disabled,false);
    assert.match(f.status.textContent,/无法启动/);
    f.skip.dispatchEvent(new Event('click'));assert.equal(f.boot.active,false);
  }finally{f.restore();}
});

test('failure during the reveal releases the modal even when its fade timer is cancelled',()=>{
  const f=fixture();try{
    f.at(1500);f.boot.event('frame');assert.equal(f.root.dataset.bootState,'revealing');
    f.at(1600);f.boot.event('failure');f.advance(5000);
    assert.equal(f.boot.active,false);assert.equal(f.panel.hidden,true);assert.equal(f.pending,0);
    f.boot.event('frame');assert.equal(f.boot.active,false);
  }finally{f.restore();}
});

test('leaving during preparation removes pending work and cannot reopen the panel',()=>{
  const f=fixture();try{
    f.at(200);f.boot.event('frame');f.boot.dismiss();f.advance(5000);
    assert.equal(f.pending,0);assert.equal(f.boot.active,false);
    f.boot.dispose();f.boot.event('frame');assert.equal(f.boot.active,false);
  }finally{f.restore();}
});
