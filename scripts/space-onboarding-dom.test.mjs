import test from 'node:test';
import assert from 'node:assert/strict';
import {mountOnboarding} from '../assets/js/space/onboarding.js';

// Deterministic DOM boundary: the real controller owns these timers. Advancing
// the clock catches both a hidden active modal and runaway failure repainting.
function fixture({reduced=false}={}) {
  const originals=new Map(),timers=new Map();let now=0,id=0;
  const replace=(key,value)=>{originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
  const skip=new EventTarget();skip.focus=()=>{};
  const status={textContent:''},steps=Array.from({length:3},()=>{
    const mark={textContent:''},time={textContent:''};
    return {dataset:{},mark,time,querySelector:s=>s==='[data-boot-mark]'?mark:time};
  });
  const panel={hidden:false,contains:element=>element===panel,focus(){document.activeElement=panel;},querySelector:s=>s==='[data-boot-status]'?status:skip,querySelectorAll:s=>s==='[data-boot-step]'?steps:steps.map(step=>step.time)};
  const target={focus(){document.activeElement=target;}};
  const root={dataset:{},querySelector:s=>s==='[data-space-boot]'?panel:target};
  const media=new EventTarget();media.matches=reduced;
  replace('document',{documentElement:{lang:'zh'},activeElement:null});replace('window',new EventTarget());
  replace('matchMedia',()=>media);replace('performance',{now:()=>now});replace('localStorage',{getItem:()=>null,setItem(){}});
  replace('setTimeout',(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;});replace('clearTimeout',key=>timers.delete(key));
  const reveals=[],boot=mountOnboarding({root,enabled:true,onReveal:result=>reveals.push(result)});
  return {boot,root,panel,skip,status,steps,reveals,target,
    at(value){now=value;},
    advance(value){let calls=0;while(true){const entry=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!entry||entry[1].at>value)break;if(++calls>50)throw new Error('Runaway onboarding timer');timers.delete(entry[0]);now=entry[1].at;entry[1].fn();}now=value;},
    get pending(){return timers.size;},
    restore(){boot.dispose();for(const [key,descriptor] of originals)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];},
  };
}

test('failure before the first frame reveals a usable recovery action',()=>{
  const f=fixture();try{
    f.at(200);f.boot.event('module');assert.equal(f.pending,0);
    f.at(400);f.boot.event('failure');f.advance(5000);
    assert.equal(f.pending,0);assert.equal(f.boot.active,true);assert.equal(f.skip.disabled,false);
    assert.equal(f.skip.hidden,false);assert.equal(f.steps[1].dataset.state,'failed');
    assert.match(f.status.textContent,/无法启动/);
    f.skip.dispatchEvent(new Event('click'));assert.equal(f.boot.active,false);
  }finally{f.restore();}
});

test('a slow connection keeps honest stages and hides the loading button',()=>{
  const f=fixture();try{
    f.advance(10000);
    assert.equal(f.root.dataset.bootState,'loading');assert.equal(f.pending,0);
    assert.equal(f.skip.hidden,true);assert.equal(f.skip.disabled,true);
    assert.deepEqual(f.steps.map(step=>step.dataset.state),['current','waiting','waiting']);
    f.boot.event('module');assert.equal(f.steps[0].time.textContent,'10.000s');
    f.at(12000);f.boot.event('room');
    assert.equal(f.steps[0].time.textContent,'10.000s');assert.equal(f.steps[1].time.textContent,'12.000s');
    assert.equal(f.steps[2].dataset.state,'current');assert.equal(f.boot.active,true);
  }finally{f.restore();}
});

test('a real frame reveals immediately with only a short fade and no extra click',()=>{
  const f=fixture();try{
    f.at(40);f.boot.event('frame');assert.equal(f.root.dataset.bootState,'revealing');
    assert.deepEqual(f.steps.map(step=>step.dataset.state),['done','done','done']);
    assert.equal(f.skip.hidden,true);f.advance(200);
    assert.equal(f.boot.active,false);assert.equal(f.root.dataset.bootState,'complete');
    assert.equal(f.reveals.length,1);assert.equal(f.pending,0);
  }finally{f.restore();}
});

test('reduced motion releases the first frame without even a fade timer',()=>{
  const f=fixture({reduced:true});try{
    f.at(40);f.boot.event('frame');assert.equal(f.boot.active,false);
    assert.equal(f.pending,0);assert.equal(f.reveals.length,1);
  }finally{f.restore();}
});

test('switching renderers reopens real preparation and waits for a new frame',()=>{
  const f=fixture();try{
    f.boot.event('frame');f.advance(500);assert.equal(f.boot.active,false);
    f.boot.begin();assert.equal(f.boot.active,true);assert.equal(f.skip.hidden,true);
    assert.deepEqual(f.steps.map(step=>step.dataset.state),['current','waiting','waiting']);
    assert.ok(f.steps.every(step=>step.time.textContent===''));
    f.advance(5000);assert.equal(f.boot.active,true);
    f.boot.event('module');f.boot.event('room');assert.equal(f.boot.active,true);
    f.boot.event('frame');f.advance(5160);assert.equal(f.boot.active,false);
  }finally{f.restore();}
});

test('scene switching returns keyboard focus from the terminal to the painted surface',()=>{
  const f=fixture();try{
    f.boot.begin();assert.equal(document.activeElement,f.panel);
    f.boot.event('frame');assert.equal(document.activeElement,f.target);
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
