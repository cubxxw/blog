import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {EventEmitter} from 'node:events';
import {stripTypeScriptTypes} from 'node:module';

const file=new URL('../tests/helpers/room-browser-frame-observation.ts',import.meta.url);
const source=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
const executable=stripTypeScriptTypes(source).replace(/^export\s+(?=(?:async\s+)?(?:function|const|class))/gm,'');

function fixture(options={}){
  let now=0,serial=0;
  const timers=new Map(),commands=[],sessions=[];
  const later=(fn,ms)=>{const id=++serial;timers.set(id,{at:now+ms,fn});return id;};
  class Element {isConnected=true;constructor(ownerDocument){this.ownerDocument=ownerDocument;}}
  class HTMLIFrameElement extends Element {}
  class HTMLTextAreaElement extends Element {value='The same page, when I come back.';}
  class HTMLButtonElement extends Element {textContent='Kept open';}
  const parentDocument={querySelectorAll:()=>parentDocument.frames};
  const childDocument={querySelectorAll:selector=>selector.startsWith('textarea')?childDocument.notes:childDocument.buttons};
  const iframe=new HTMLIFrameElement(parentDocument),note=new HTMLTextAreaElement(childDocument),button=new HTMLButtonElement(childDocument);
  parentDocument.frames=[iframe];childDocument.notes=[note];childDocument.buttons=[button];
  const page=new EventEmitter(),main={isDetached:()=>false,childFrames:()=>page.children},child={isDetached:()=>child.detached,parentFrame:()=>main,detached:false};
  page.children=[child];page.mainFrame=()=>main;page.isClosed=()=>false;
  const handle={frame:child,acquired:0,contentCalls:0,disposals:0,
    contentFrame:async()=>{handle.contentCalls++;if(options.contentFrameDelay)await new Promise(resolve=>later(resolve,options.contentFrameDelay));return handle.frame;},
    dispose:async()=>{handle.disposals++;if(options.disposeDelay)await new Promise(resolve=>later(resolve,options.disposeDelay));if(options.disposeError)throw Error('Controlled handle dispose failure');},
  };
  page.locator=selector=>{assert.equal(selector,'.space-browser__page');return {elementHandle:async({timeout})=>{
    assert.equal(timeout,5000);handle.acquired++;
    if(options.handleDelay)await new Promise(resolve=>later(resolve,options.handleDelay));
    if(options.missingHandle)return null;
    if(parentDocument.frames.length!==1)throw Error('Controlled strict target selection failed');
    return handle;
  }};};
  const delay={};
  function session(name,document){
    const objects=new Map(),context=vm.createContext({document,HTMLIFrameElement,HTMLTextAreaElement,HTMLButtonElement});
    const result=Object.assign(new EventEmitter(),{name,objects,releases:0,detaches:0,targetId:'child-id',delay,closed:false});sessions.push(result);
    result.replaceDocument=value=>{context.document=value;};
    result.send=async(method,params={})=>{
      if(result.closed)throw Error('Controlled target closed');
      commands.push({name,method,params});
      let reply;
      if(method==='Runtime.evaluate'||method==='Runtime.callFunctionOn'){
        try{
          let value;
          if(method==='Runtime.evaluate')value=vm.runInContext(params.expression,context);
          else {if(!objects.has(params.objectId))throw Error('Cannot find object in the replaced execution context');context.receiver=objects.get(params.objectId);value=vm.runInContext('('+params.functionDeclaration+').call(receiver)',context);}
          const type=typeof value;
          if(params.returnByValue)reply={result:{type,value}};
          else {const objectId=name+'-'+objects.size;objects.set(objectId,value);reply={result:{type,objectId,...(value instanceof Element?{subtype:'node'}:{})}};}
        }catch(error){reply={result:{type:'undefined'},exceptionDetails:{text:error.message}};}
      }else if(method==='DOM.describeNode')reply={node:{nodeType:1,nodeName:'IFRAME',backendNodeId:1,frameId:'child-id'}};
      else if(method==='Page.getFrameTree')reply={frameTree:{frame:{id:result.targetId}}};
      else if(method==='Runtime.releaseObjectGroup'){result.releases++;objects.clear();reply={};}
      else throw Error('Unexpected protocol command '+method);
      if(options.protocolFault)reply=options.protocolFault({name,method,params,reply})??reply;
      const wait=delay[name+':'+method]??0;
      if(wait)await new Promise(resolve=>later(resolve,wait));
      if(options.inlineLag?.(name,method))now+=5001;
      return reply;
    };
    result.detach=async()=>{if(result.closed)throw Error('Controlled target closed');result.detaches++;if(options.detachDelay)await new Promise(resolve=>later(resolve,options.detachDelay));if(options.detachError)throw Error('Controlled detach failure');result.closed=true;result.emit('close',result);};
    return result;
  }
  const parentSession=session('parent',parentDocument),childSession=session('child',childDocument);
  page.context=()=>({browser:()=>({browserType:()=>({name:()=>options.browser??'chromium'})}),newCDPSession:async target=>{
    assert.ok(target===page||target===child,'only the public captured Page or Frame may be attached');
    if(options.attachError)throw Error('This frame does not have a separate CDP session');
    if(options.attachDelay)await new Promise(resolve=>later(resolve,options.attachDelay));
    return target===page?parentSession:childSession;
  }});
  const context=vm.createContext({performance:{now:()=>now},setTimeout:later,clearTimeout:id=>timers.delete(id),WeakMap,Set,Map,console});
  vm.runInContext(executable+'\nglobalThis.create=typeof createRoomBrowserFrameObservation==="function"?createRoomBrowserFrameObservation:undefined;',context);
  assert.equal(typeof context.create,'function','the real helper must expose the bounded frame observer');
  const observer=context.create(page);
  async function settle(promise){
    let done=false,rejected=false,value,error;
    promise.then(result=>{done=true;value=result;},cause=>{done=true;rejected=true;error=cause;});
    for(let step=0;step<500;step++){
      for(let i=0;i<80;i++)await Promise.resolve();
      if(done){if(rejected)throw error;return value;}
      const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
      if(!next)throw Error('Protocol fixture deadlock');
      timers.delete(next[0]);now=Math.max(now,next[1].at);next[1].fn();
    }
    throw Error('Protocol fixture exceeded bounded steps');
  }
  return {observer,page,main,child,handle,iframe,note,button,parentDocument,childDocument,parentSession,childSession,commands,sessions,delay,settle,schedule:later,now:()=>now,
    advance:async ms=>{const target=now+ms;for(;;){for(let i=0;i<80;i++)await Promise.resolve();const next=[...timers.entries()].filter(([,timer])=>timer.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;timers.delete(next[0]);now=Math.max(now,next[1].at);next[1].fn();}now=Math.max(now,target);for(let i=0;i<80;i++)await Promise.resolve();}};
}

test('binds the public Frame to the original iframe target and reads live fields at both checkpoints',async()=>{
  const f=fixture();await f.settle(f.observer.bind());
  assert.deepEqual(JSON.parse(JSON.stringify(await f.settle(f.observer.observe()))),{textareaValue:'The same page, when I come back.',buttonText:'Kept open'});
  f.note.value='A changed live draft';f.button.textContent='Changed live text';
  assert.deepEqual(JSON.parse(JSON.stringify(await f.settle(f.observer.observe()))),{textareaValue:'A changed live draft',buttonText:'Changed live text'});
  // Reparenting preserves the same connected node; the helper must not pin its parent.
  f.iframe.parentElement={differentContainer:true};await f.settle(f.observer.observe());
  await f.settle(f.observer.close());await f.settle(f.observer.close());
  assert.equal(f.handle.acquired,1);assert.equal(f.handle.contentCalls,1);assert.equal(f.handle.disposals,1);
  for(const session of f.sessions){assert.equal(session.releases,1);assert.equal(session.detaches,1);assert.equal(session.objects.size,0);}
  assert.equal(f.page.listenerCount('framenavigated'),0);assert.equal(f.page.listenerCount('framedetached'),0);assert.equal(f.page.listenerCount('close'),0);
  assert.ok(f.commands.filter(call=>call.method.startsWith('Runtime.')&&!call.method.includes('release')).every(call=>call.params.throwOnSideEffect===true&&call.params.userGesture!==true));
});

test('a non-matching about:blank sibling does not change unique target binding or get inspected',async()=>{
  const f=fixture(),sibling={url:()=>{throw Error('Do not inspect the independent sibling');},isDetached:()=>{throw Error('Do not inspect the independent sibling');}};
  f.page.children=[sibling,f.child];
  await f.settle(f.observer.bind());f.page.emit('framenavigated',sibling);
  assert.equal((await f.settle(f.observer.observe())).buttonText,'Kept open');
  f.page.children=[f.child,sibling];await f.settle(f.observer.observe());await f.settle(f.observer.close());
  assert.equal(f.handle.contentCalls,1);assert.equal(f.handle.disposals,1);
});

test('a missing handle or null/wrong contentFrame cannot fall back to the first or URL-matching Frame',async()=>{
  const missing=fixture({missingHandle:true});await assert.rejects(missing.settle(missing.observer.bind()));await missing.settle(missing.observer.close());
  for(const target of [null,{isDetached:()=>false,parentFrame:()=>null}]){
    const f=fixture();f.handle.frame=target;await assert.rejects(f.settle(f.observer.bind()));await f.settle(f.observer.close());assert.equal(f.handle.disposals,1);
  }
});

test('handle acquisition and contentFrame share the original total bind deadline',async()=>{
  const f=fixture({handleDelay:3000,contentFrameDelay:3000});
  await assert.rejects(f.settle(f.observer.bind()),/5000ms/);assert.equal(f.now(),5000);
  await f.settle(f.observer.close());assert.equal(f.handle.disposals,1);
});

test('a late ElementHandle is disposed once after failed bind and close without being adopted',async()=>{
  const f=fixture({handleDelay:15001});
  await assert.rejects(f.settle(f.observer.bind()),/5000ms/);assert.equal(f.now(),5000);
  await assert.rejects(f.settle(f.observer.close()),/5000ms/);assert.equal(f.now(),10000);
  await f.advance(10000);assert.equal(f.handle.contentCalls,0);assert.equal(f.handle.disposals,1);
  await assert.rejects(f.settle(f.observer.observe()));
});

test('handle disposal shares close deadline and cannot become a late successful cleanup',async()=>{
  const f=fixture({disposeDelay:5001});await f.settle(f.observer.bind());
  const start=f.now();await assert.rejects(f.settle(f.observer.close()),/5000ms/);assert.equal(f.now()-start,5000);
  await f.advance(10);await assert.rejects(f.settle(f.observer.close()),/5000ms/);assert.equal(f.handle.disposals,1);
});

test('target detach during contentFrame binding fails while independent sibling navigation stays legal',async()=>{
  for(const targetChanged of [true,false]){
    const f=fixture({contentFrameDelay:1000}),sibling={};f.page.children=[sibling,f.child];
    f.schedule(()=>f.page.emit(targetChanged?'framedetached':'framenavigated',targetChanged?f.child:sibling),100);
    if(targetChanged)await assert.rejects(f.settle(f.observer.bind()));else {await f.settle(f.observer.bind());await f.settle(f.observer.observe());}
    await f.settle(f.observer.close());assert.equal(f.handle.disposals,1);
  }
});

for(const target of ['main','child'])test('same-document '+target+' history navigation keeps the bound live page readable',async()=>{
  const f=fixture();await f.settle(f.observer.bind());f.page.emit('framenavigated',f[target]);
  f.note.value='Still the original document';f.button.textContent='Current live button';
  assert.deepEqual(JSON.parse(JSON.stringify(await f.settle(f.observer.observe()))),{textareaValue:'Still the original document',buttonText:'Current live button'});
  await f.settle(f.observer.close());assert.equal(f.handle.contentCalls,1);assert.equal(f.handle.disposals,1);
});

for(const target of ['main','child'])test('same-document '+target+' history navigation during binding is not an extra failure condition',async()=>{
  const f=fixture({contentFrameDelay:1000});f.schedule(()=>f.page.emit('framenavigated',f[target]),100);
  await f.settle(f.observer.bind());assert.equal((await f.settle(f.observer.observe())).buttonText,'Kept open');await f.settle(f.observer.close());
});

for(const target of ['parent','child'])test('a new '+target+' Document fails even if old remote objects and exact field values remain',async()=>{
  const f=fixture();await f.settle(f.observer.bind());
  const oldDocument=target==='parent'?f.parentDocument:f.childDocument;
  f[target+'Session'].replaceDocument({querySelectorAll:selector=>oldDocument.querySelectorAll(selector)});
  await assert.rejects(f.settle(f.observer.observe()));await f.settle(f.observer.close());
});

for(const [name,breakIdentity] of [
  ['missing iframe',f=>{f.parentDocument.frames=[];}],
  ['duplicate iframe',f=>{f.parentDocument.frames=[f.iframe,f.iframe];}],
  ['replaced iframe',f=>{f.parentDocument.frames=[{isConnected:true,ownerDocument:f.parentDocument}];}],
  ['disconnected iframe',f=>{f.iframe.isConnected=false;}],
  ['missing Frame',f=>{f.page.children=[];}],
  ['duplicate Frame',f=>{f.page.children=[f.child,f.child];}],
  ['replaced Frame',f=>{f.page.children=[{isDetached:()=>false}];}],
  ['detached Frame',f=>{f.child.detached=true;}],
  ['different target',f=>{f.childSession.targetId='another-target';}],
  ['replaced textarea',f=>{f.childDocument.notes=[{value:f.note.value,isConnected:true}];}],
  ['duplicate textarea',f=>{f.childDocument.notes=[f.note,f.note];}],
  ['missing button',f=>{f.childDocument.buttons=[];}],
  ['duplicate button',f=>{f.childDocument.buttons=[f.button,f.button];}],
  ['new parent document revokes its remote objects',f=>{f.parentSession.objects.clear();f.page.emit('framenavigated',f.main);}],
  ['new child document revokes its remote objects',f=>{f.childSession.objects.clear();f.page.emit('framenavigated',f.child);}],
  ['Frame detach event',f=>f.page.emit('framedetached',f.child)],
  ['main Frame detach event',f=>f.page.emit('framedetached',f.main)],
  ['parent close',f=>f.page.emit('close')],
])test(name+' permanently rejects a checkpoint instead of rebinding',async()=>{
  const f=fixture();await f.settle(f.observer.bind());breakIdentity(f);
  await assert.rejects(f.settle(f.observer.observe()));
  await assert.rejects(f.settle(f.observer.observe()));
  await f.settle(f.observer.close());
});

test('capture rejects missing/ambiguous iframe or Frame and unsupported Chromium targets',async()=>{
  for(const mutate of [f=>{f.parentDocument.frames=[];},f=>{f.parentDocument.frames=[f.iframe,f.iframe];},f=>{f.page.children=[];},f=>{f.page.children=[f.child,f.child];}]){
    const f=fixture();mutate(f);await assert.rejects(f.settle(f.observer.bind()));await f.settle(f.observer.close());
  }
  for(const options of [{browser:'firefox'},{attachError:true}]){const f=fixture(options);await assert.rejects(f.settle(f.observer.bind()));await f.settle(f.observer.close());}
});

test('schema faults, protocol exceptions and owner/target mismatch cannot certify values',async()=>{
  for(const protocolFault of [
    ({method,reply})=>method==='DOM.describeNode'?{node:{...reply.node,frameId:'wrong-owner'}}:reply,
    ({name,method,reply})=>name==='child'&&method==='Runtime.callFunctionOn'?{result:{type:'object',value:{textareaValue:3,buttonText:'Kept open'}}}:reply,
    ({name,method,reply})=>name==='child'&&method==='Runtime.callFunctionOn'?{result:{type:'object',value:{textareaValue:'The same page, when I come back.'}}}:reply,
    ({name,method,reply})=>name==='child'&&method==='Runtime.callFunctionOn'?{result:{type:'object',value:{textareaValue:'x',buttonText:'y'}},exceptionDetails:{text:'Controlled runtime exception'}}:reply,
  ]){
    const f=fixture({protocolFault});await assert.rejects(f.settle((async()=>{await f.observer.bind();await f.observer.observe();})()));await f.settle(f.observer.close());
  }
});

test('an empty protocol rejection still permanently invalidates the observer',async()=>{
  let armed=false;
  const f=fixture({protocolFault:({name,method,reply})=>{if(armed&&name==='child'&&method==='Runtime.callFunctionOn')throw undefined;return reply;}});
  await f.settle(f.observer.bind());armed=true;await assert.rejects(f.settle(f.observer.observe()));armed=false;
  await assert.rejects(f.settle(f.observer.observe()));await f.settle(f.observer.close());
});

test('invalid backend node identities cannot bind even when a fabricated frameId matches',async()=>{
  for(const backendNodeId of [0,-1,NaN]){
    const f=fixture({protocolFault:({method,reply})=>method==='DOM.describeNode'?{node:{...reply.node,backendNodeId}}:reply});
    await assert.rejects(f.settle(f.observer.bind()));await f.settle(f.observer.close());
  }
});

test('bind uses one total deadline for both attaches and setup',async()=>{
  const f=fixture({attachDelay:3000});
  await assert.rejects(f.settle(f.observer.bind()),/5000ms/);assert.equal(f.now(),5000);
  await f.settle(f.observer.close());assert.equal(f.now(),6000);
  for(const session of f.sessions)assert.equal(session.detaches,1);
});

test('Node deadline rejects timely browser reads whose reply arrives after 5000ms and never accepts it later',async()=>{
  const f=fixture();await f.settle(f.observer.bind());f.delay['child:Runtime.callFunctionOn']=5001;
  const start=f.now();await assert.rejects(f.settle(f.observer.observe()),/5000ms/);assert.equal(f.now()-start,5000);
  await f.advance(10);delete f.delay['child:Runtime.callFunctionOn'];
  await assert.rejects(f.settle(f.observer.observe()));await f.settle(f.observer.close());
});

test('post-response deadline checks reject synchronous lag even before Node timers fire',async()=>{
  let armed=false;
  const f=fixture({inlineLag:(name,method)=>armed&&name==='child'&&method==='Runtime.callFunctionOn'});await f.settle(f.observer.bind());armed=true;
  await assert.rejects(f.settle(f.observer.observe()),/5000ms/);await f.settle(f.observer.close());
});

test('late attach is quarantined and detached once after bind and close have timed out',async()=>{
  const f=fixture({attachDelay:15001});
  await assert.rejects(f.settle(f.observer.bind()),/5000ms/);assert.equal(f.now(),5000);
  await assert.rejects(f.settle(f.observer.close()),/5000ms/);assert.equal(f.now(),10000);
  await f.advance(10000);assert.equal(f.parentSession.detaches,1);
  await assert.rejects(f.settle(f.observer.observe()));
});

test('close bounds all owned cleanup to one 5000ms budget and never reports late cleanup as success',async()=>{
  const f=fixture({detachDelay:5001});await f.settle(f.observer.bind());
  const start=f.now();await assert.rejects(f.settle(f.observer.close()),/5000ms/);assert.equal(f.now()-start,5000);
  await f.advance(10);await assert.rejects(f.settle(f.observer.close()),/5000ms/);
  for(const session of f.sessions)assert.equal(session.detaches,1);
});

test('release and detach share the same close deadline rather than separate 5000ms allowances',async()=>{
  const f=fixture({detachDelay:3000});await f.settle(f.observer.bind());f.delay['parent:Runtime.releaseObjectGroup']=2500;
  const start=f.now();await assert.rejects(f.settle(f.observer.close()),/5000ms/);assert.equal(f.now()-start,5000);
  await f.advance(1000);await assert.rejects(f.settle(f.observer.close()),/5000ms/);
});

test('a public CDP close event invalidates observations and cleanup never reuses the closed target',async()=>{
  const f=fixture();await f.settle(f.observer.bind());f.childSession.closed=true;f.childSession.objects.clear();f.childSession.emit('close',f.childSession);
  await assert.rejects(f.settle(f.observer.observe()));await f.settle(f.observer.close());
  assert.equal(f.childSession.detaches,0);assert.equal(f.parentSession.detaches,1);
  for(const session of f.sessions)assert.equal(session.listenerCount('close'),0);
});

test('closing or concurrent reads poison pending results before any later caller can accept them',async()=>{
  for(const mode of ['close','concurrent']){
    const f=fixture();await f.settle(f.observer.bind());f.delay['child:Runtime.callFunctionOn']=200;
    const first=f.observer.observe();const firstFailure=assert.rejects(f.settle(first));
    if(mode==='close')await f.settle(f.observer.close());else await assert.rejects(f.settle(f.observer.observe()));
    await firstFailure;if(mode!=='close')await f.settle(f.observer.close());
    await assert.rejects(f.settle(f.observer.observe()));
  }
});
