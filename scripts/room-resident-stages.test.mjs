import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

// Execute the actual test helper and its serialized browser callbacks. No
// browser, product changes, real sleeps or synthetic passing helper is used.
const source=fs.readFileSync(new URL('../tests/helpers/room-observation.ts',import.meta.url),'utf8');
const executable=stripTypeScriptTypes(source).replace(/^export\s+(?=(?:async\s+)?(?:function|const|class))/gm,'');
async function scenario(options={}){
  let now=options.startAt??0,serial=0,settled=false,outcome,attached=0,detached=0,sends=0;
  const timers=new Map(),commands=[];
  const later=(fn,ms)=>{const id=++serial;timers.set(id,{at:now+ms,fn});return id;};
  const at=(time,fn)=>{if(time!==null&&time!==undefined)later(fn,Math.max(0,time-now));};
  const root={dataset:{bootState:'loading',worldRenderedMode:'intro',catLoaded:'false',catActive:options.pauseAt===undefined?'false':'true',catPose:'rest',worldFrames:'7',cafeMode:'cafe'},getAttribute(name){return name==='data-cafe-mode'?this.dataset.cafeMode:null;}};
  let current=root,ambiguous=false,available=options.rootAt===undefined;
  const data={status:'startup',initialPose:null,initialTime:null,changedPose:null,changedTime:null,bootCompleteAt:null,renderedRoamAt:null,readinessError:null};
  const window={__catMotionObservation:options.missingObservation?undefined:data,__catMotionRoot:available?root:undefined,__catReadinessRoot:available?root:undefined};
  const context=vm.createContext({console:{warn(){}},performance:{now:()=>now},setTimeout:later,clearTimeout:id=>timers.delete(id),document:{querySelectorAll:()=>!available?[]:ambiguous?[current,root]:[current]},window});
  vm.runInContext(executable+'\nglobalThis.api={readRoomObservation,withRoomObservationSession,observeResidentStartup,observePausedResident,expectRoomAttributes};',context);
  const boot=options.bootAt??1000,roam=options.roamAt??2000,cat=options.catAt??3000,motion=options.motionAt??5000;
  at(options.rootAt,()=>{available=true;window.__catMotionRoot=window.__catReadinessRoot=root;});
  at(boot,()=>{root.dataset.bootState='complete';data.bootCompleteAt=now;});
  at(roam,()=>{root.dataset.worldRenderedMode='roam';data.renderedRoamAt=now;});
  at(cat,()=>{
    root.dataset.catLoaded=root.dataset.catActive='true';data.initialPose='rest';data.initialTime=now;data.status='watching';
    later(()=>{if(data.status==='watching')data.status='motion-timeout';},12000);
  });
  at(motion,()=>{if(data.status==='watching'){root.dataset.catPose='moved';data.changedPose='moved';data.changedTime=now;data.status='changed';}});
  at(options.desktopAt,()=>{root.dataset.cafeMode='desktop';if(options.pauseAfter)root.dataset.catActive='false';});
  at(options.replaceAt,()=>{current={dataset:{...root.dataset}};});
  at(options.ambiguousAt,()=>{ambiguous=true;});
  at(options.readinessErrorAt,()=>{data.readinessError='controlled readiness error';});
  at(options.pauseAt,()=>{root.dataset.catActive='false';});
  at(options.poseAt,()=>{root.dataset.catPose='unexpected motion';});
  at(options.frameAt,()=>{root.dataset.worldFrames='8';});
  const session={
    detach:async()=>{detached++;},
    send:async(_method,{expression})=>{
      sends++;const call=sends;commands.push({at:now,expression});
      if(options.executeDelay?.[call])await new Promise(resolve=>later(resolve,options.executeDelay[call]));
      let result;
      try{result={result:{value:await vm.runInContext(expression,context)}};}
      catch(error){result={result:{},exceptionDetails:{text:String(error.message)}};}
      const lag=options.sendDelay?.[call]??0;if(lag)await new Promise(resolve=>later(resolve,lag));
      if(options.invalidAt===call)return {result:{value:{status:'changed',initialTime:NaN}}};
      return result;
    }
  };
  const page={context:()=>({browser:()=>({browserType:()=>({name:()=> 'chromium'})}),newCDPSession:async()=>{attached++;if(options.attachDelay)await new Promise(resolve=>later(resolve,options.attachDelay));return session;}})};
  const journey=context.api.withRoomObservationSession(page,async()=>{
    if(options.invalidateFirst){try{await context.api.readRoomObservation(page,()=>{throw Error('controlled first error');},undefined,{timeout:5000,label:'First',validate:()=>true});}catch{}}
    if(options.attributeWait){await context.api.expectRoomAttributes(page,{'data-cafe-mode':'desktop'});if(options.pauseAfter)await context.api.observePausedResident(page,false);return true;}
    return options.pauseAt===undefined?context.api.observeResidentStartup(page):context.api.observePausedResident(page,options.checkFrames);
  });
  // This is the existing Playwright case deadline, starting before navigation.
  // It is independent of, and never replaces, the real helper's stage gates.
  const caseTimer=later(()=>{},90000-now);
  const overall=new Promise((_,reject)=>{timers.set(caseTimer,{at:90000,fn:()=>reject(Error('Test timeout90000ms'))});});
  Promise.race([journey,overall]).then(value=>{settled=true;outcome={ok:true,value};},error=>{settled=true;outcome={ok:false,error:error.message};}).finally(()=>timers.delete(caseTimer));
  async function advance(untilSettled=true,limit=100000){
    for(let step=0;step<10000;step++){
      for(let i=0;i<40;i++)await Promise.resolve();
      if(untilSettled&&settled)return;
      const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
      if(!next){if(untilSettled)throw Error('Virtual clock deadlock');return;}
      if(next[1].at>limit)return;
      now=next[1].at;timers.delete(next[0]);next[1].fn();
    }
    throw Error('Virtual clock did not settle');
  }
  await advance();assert.equal(settled,true);const elapsed=now;
  if(options.drainLate)await advance(false,100000);
  return {...outcome,elapsed,attached,detached,sends,commands};
}

test('individually legal startup stages may take more than one combined30s gate',async()=>{
  const result=await scenario({bootAt:20000,roamAt:21000,catAt:40000,motionAt:44000});
  assert.equal(result.ok,true,result.error);assert.equal(result.elapsed,44000);
  assert.equal(result.sends,4);assert.equal(result.attached,1);assert.equal(result.detached,1);
  assert.equal(result.value.changedTime-result.value.initialTime,4000);
});
test('the original root may appear during boot without being mistaken for a replacement',async()=>{
  const result=await scenario({rootAt:500});assert.equal(result.ok,true,result.error);assert.equal(result.sends,4);
});
test('passive timestamps reject a late rendered mode even when protocol delivery is delayed',async()=>{
  const result=await scenario({roamAt:7000,catAt:8000,motionAt:9000,sendDelay:{1:8000}});
  assert.equal(result.ok,false);assert.match(result.error,/Rendered roam arrived after5s/);
});
for(const [stage,input,pattern] of [
  ['boot',{bootAt:31000,roamAt:32000,catAt:33000,motionAt:34000},/boot.*30000/i],
  ['roam',{roamAt:7001,catAt:8000,motionAt:9000},/roam.*(?:5000|5s)/i],
  ['cat',{catAt:33001,motionAt:35000},/cat.*30000/i],
  ['motion',{motionAt:15500},/motion.*(?:12000|timeout)/i],
])test(stage+' retains its own original deadline',async()=>{const result=await scenario(input);assert.equal(result.ok,false);assert.match(result.error,pattern);assert.equal(result.detached,1);});

test('the original90s case deadline still rejects individually legal stages',async()=>{
  const result=await scenario({startAt:25000,bootAt:54000,roamAt:58000,catAt:79000,motionAt:90500});
  assert.equal(result.ok,false);assert.match(result.error,/Test timeout90000ms/);assert.equal(result.elapsed,90000);
});
for(const [name,input,pattern] of [
  ['ambiguous root',{ambiguousAt:500},/ambiguous/i],
  ['replaced root',{replaceAt:1500},/replaced/i],
  ['missing observer',{missingObservation:true},/missing/i],
  ['readiness failure',{readinessErrorAt:500},/controlled readiness error/],
  ['invalid result',{invalidAt:4},/invalid value/],
  ['invalidated scope',{invalidateFirst:true},/controlled first error/],
])test('startup rejects '+name,async()=>{const result=await scenario(input);assert.equal(result.ok,false);assert.match(result.error,pattern);assert.ok(result.sends<=4);assert.equal(result.detached,1);});

for(const [name,input]of [
  ['attach',{attachDelay:31000,drainLate:true}],
  ['send',{bootAt:0,roamAt:0,catAt:0,motionAt:1000,sendDelay:{1:31000},drainLate:true}],
])test('a late '+name+' cannot continue to a fresh stage',async()=>{
  const result=await scenario(input);assert.equal(result.ok,false);assert.match(result.error,/boot.*30000/i);
  assert.equal(result.elapsed,30000);assert.equal(result.detached,1);assert.ok(result.sends<=1);
});
for(const checkFrames of [false,true])test('late pause retains the full400ms pose and optional200ms frame window: '+checkFrames,async()=>{
  const input={bootAt:0,roamAt:0,catAt:0,motionAt:20000,pauseAt:4700,checkFrames};
  const result=await scenario(input);assert.equal(result.ok,true,result.error);assert.ok(result.elapsed>=5100+(checkFrames?200:0));
  const moving=await scenario({...input,...(checkFrames?{frameAt:5250}:{poseAt:5050})});
  assert.equal(moving.ok,false);assert.match(moving.error,checkFrames?/rendered during200ms/:/moved during400ms/);
});

// The final desktop assertion uses the existing single-evaluation DOM reader.
// Its one Node5s deadline includes setup, dispatch, polling and response time.
test('desktop attributes can change during one in-browser poll without locator layout snapshots',async()=>{
  const result=await scenario({attributeWait:true,desktopAt:1850,executeDelay:{1:1670}});
  assert.equal(result.ok,true,result.error);assert.equal(result.elapsed,1870);
  assert.equal(result.sends,1);assert.equal(result.attached,1);assert.equal(result.detached,1);
  assert.ok(result.commands[0].expression.includes('getAttribute'));
  assert.doesNotMatch(result.commands[0].expression,/getBoundingClientRect|getComputedStyle|ariaSnapshot|\.click\(/);
});
for(const [name,input,pattern]of [
  ['unchanged attribute',{},/Room attributes exceeded5000ms/],
  ['late actual conversion',{desktopAt:5001},/Room attributes exceeded5000ms/],
  ['setup consumes the5s budget',{desktopAt:1000,attachDelay:5100,drainLate:true},/Room attributes exceeded5000ms/],
  ['transport starts after5s',{desktopAt:1000,executeDelay:{1:5100},drainLate:true},/Room attributes exceeded5000ms/],
  ['late response even for an early true value',{desktopAt:1000,sendDelay:{1:5100},drainLate:true},/Room attributes exceeded5000ms/],
  ['root replaced',{desktopAt:1850,replaceAt:1000},/root replaced/],
  ['ambiguous root',{desktopAt:1850,ambiguousAt:1000},/ambiguous/],
  ['invalid protocol schema',{desktopAt:1850,invalidAt:1},/invalid value/],
  ['invalidated scope',{desktopAt:1850,invalidateFirst:true},/controlled first error/],
])test('desktop observation rejects '+name+' without fallback',async()=>{
  const result=await scenario({attributeWait:true,...input});
  assert.equal(result.ok,false);assert.match(result.error,pattern);
  assert.equal(result.detached,1);assert.ok(result.sends<=1);
  if(/5000ms/.test(pattern.source))assert.equal(result.elapsed,5000);
});
test('desktop gate retains the complete subsequent400ms resident pause',async()=>{
  const result=await scenario({attributeWait:true,desktopAt:4700,pauseAfter:true,motionAt:20000});
  assert.equal(result.ok,true,result.error);assert.equal(result.elapsed,5100);
  const moving=await scenario({attributeWait:true,desktopAt:4700,pauseAfter:true,motionAt:20000,poseAt:5050});
  assert.equal(moving.ok,false);assert.match(moving.error,/moved during400ms/);
});
test('desktop observation cannot escape the original90s journey budget',async()=>{
  const result=await scenario({attributeWait:true,startAt:88000,desktopAt:90500});
  assert.equal(result.ok,false);assert.match(result.error,/Test timeout90000ms/);assert.equal(result.elapsed,90000);
});
