import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const executable=file=>{const url=new URL('../tests/helpers/'+file,import.meta.url);return fs.existsSync(url)?stripTypeScriptTypes(fs.readFileSync(url,'utf8')).replace(/^import [^\n]+\n/gm,'').replace(/^export\s+(?=(?:async\s+)?(?:function|const|class))/gm,''):'';};
function fixture(options={}){
 let now=0,serial=0,commands=0,detaches=0,ranges=0,collapses=0;
 const timers=new Map(),later=(fn,ms)=>{const id=++serial;timers.set(id,{at:now+ms,fn});return id;};
 class ShadowRoot{constructor(host){this.host=host;this.map=new Map();this.activeElement=null;}querySelectorAll(selector){return selector==='*'?[...this.map.values()].flat():this.map.get(selector)??[];}}
 const document={map:new Map(),activeElement:null,focused:true,hasFocus(){return this.focused;},querySelectorAll(selector){return selector==='*'?[...new Set([...this.map.values()].flat())]:this.map.get(selector)??[];},defaultView:{getComputedStyle:element=>element.style},createRange(){ranges++;let selected;return {selectNode(node){selected=node;},getBoundingClientRect(){return selected.rect;},setStart(){},collapse(){collapses++;}};}};
 class Element{
  nodeType=1;isConnected=true;style={display:'block',visibility:'visible'};rect={x:0,y:0,width:20,height:10};childNodes=[];attributes=new Map();tree=document;nativeVisible=true;
  constructor(){this.ownerDocument=document;}
  getRootNode(){return this.tree;}checkVisibility(){return this.nativeVisible&&this.style?.display!=='none';}getBoundingClientRect(){return this.rect;}getAttribute(name){return this.attributes.get(name)??null;}contains(element){return element===this||element.workspace===this;}
 }
 const root=new Element();root.workspace=root;document.map.set('[data-bear-workspace]',[root]);
 const create=(selector,props={})=>{const element=Object.assign(new Element(),{workspace:root},props);document.map.set(selector,[element]);return element;};
 const browser=vm.createContext({document,ShadowRoot,performance:{now:()=>now},setTimeout:later,clearTimeout:id=>timers.delete(id)});
 const session={detach:async()=>{detaches++;},send:async(method,{expression})=>{
  assert.equal(method,'Runtime.evaluate');commands++;let reply;
  try{reply={result:{value:await vm.runInContext(expression,browser)}};}catch(error){reply={result:{},exceptionDetails:{text:error.message}};}
  if(options.replyLag)await new Promise(resolve=>later(resolve,options.replyLag));if(options.rejectTransport)throw Error('Controlled transport failure');
  if(options.inlineLag)now+=5001;return reply;
 }};
 const page={context:()=>({browser:()=>({browserType:()=>({name:()=> 'chromium'})}),newCDPSession:async()=>session})},info={annotations:[]};
 const context=vm.createContext({performance:{now:()=>now},setTimeout:later,clearTimeout:id=>timers.delete(id),console});
 vm.runInContext(executable('room-observation.ts')+'\n'+executable('room-dom-observation.ts')+'\nglobalThis.api={observe:typeof observeRoomDom==="function"?observeRoomDom:undefined,scope:withRoomObservationSession};',context);
 assert.equal(typeof context.api.observe,'function','the real DOM helper must exist');
 async function settle(promise){let done=false,rejected=false,value,error;promise.then(v=>{done=true;value=v;},e=>{done=true;rejected=true;error=e;});for(let i=0;i<1000;i++){for(let j=0;j<50;j++)await Promise.resolve();if(done){if(rejected)throw error;return value;}const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next)throw Error('Virtual clock deadlock');timers.delete(next[0]);now=Math.max(now,next[1].at);next[1].fn();}throw Error('Virtual clock step limit');}
 return {document,root,create,Element,ShadowRoot,info,page,now:()=>now,later,settle,commands:()=>commands,detaches:()=>detaches,ranges:()=>ranges,collapses:()=>collapses,observe:check=>context.api.observe(page,info,check),scope:journey=>context.api.scope(page,journey)};
}
const check=(state='visible',selector='[data-room-inspection]')=>({selector,state});
for(const [name,props,want] of [
 ['ordinary box',{},true],['opacity zero',{style:{display:'block',visibility:'visible',opacity:'0'}},true],['offscreen',{rect:{x:-9999,y:-9999,width:20,height:10}},true],['display none',{style:{display:'none',visibility:'visible'}},false],['visibility hidden',{style:{display:'block',visibility:'hidden'}},false],['zero height',{rect:{x:0,y:0,width:20,height:0}},false],
])test(name+' retains pinned visibility meaning',async()=>{const f=fixture();f.create('[data-room-inspection]',props);const result=await f.settle(f.observe(check(want?'visible':'hidden')));assert.equal(result.visible,want);assert.equal(result.count,1);assert.equal(f.detaches(),1);});
test('absence can satisfy Hidden, but cannot satisfy Visible or Focused',async()=>{
 const hidden=fixture();assert.equal((await hidden.settle(hidden.observe(check('hidden')))).visible,false);
 for(const value of [check(),check('focused','.space-world__canvas')]){const f=fixture();await assert.rejects(f.settle(f.observe(value)),/5000ms/);assert.equal(f.now(),5000);}
});
test('strict ambiguity fails even when every matching element is hidden',async()=>{const f=fixture(),element=f.create('[data-space-dock]',{style:{display:'none',visibility:'visible'}});f.document.map.set('[data-space-dock]',[element,element]);await assert.rejects(f.settle(f.observe(check('hidden','[data-space-dock]'))),/multiple|strict/i);});
test('display contents checks child Elements and Range text before its zero parent box',async()=>{
 for(const text of [false,true]){const f=fixture(),parent=f.create('[data-room-inspection]',{style:{display:'contents',visibility:'visible'},rect:{x:0,y:0,width:0,height:0},nativeVisible:false});parent.childNodes=text?[{nodeType:3,ownerDocument:f.document,rect:{width:8,height:6}}]:[new f.Element()];assert.equal((await f.settle(f.observe(check()))).visible,true);if(text){assert.equal(f.ranges(),1);assert.equal(f.collapses(),1);}}
});
test('focus is root-relative and requires ownerDocument focus without deepest-leaf lookup',async()=>{
 const f=fixture(),host=f.create('.space-world__canvas'),shadow=new f.ShadowRoot(host);host.shadowRoot=shadow;shadow.activeElement=new f.Element();f.document.activeElement=host;assert.equal((await f.settle(f.observe(check('focused','.space-world__canvas')))).focused,true);
 const noFocus=fixture(),canvas=noFocus.create('.space-world__canvas');noFocus.document.activeElement=canvas;noFocus.document.focused=false;await assert.rejects(noFocus.settle(noFocus.observe(check('focused','.space-world__canvas'))),/5000ms/);
});
test('open-shadow target matches and duplicates cannot silently disappear',async()=>{
 const f=fixture(),host=f.create('host'),shadow=new f.ShadowRoot(host),target=Object.assign(new f.Element(),{workspace:f.root,tree:shadow});host.shadowRoot=shadow;shadow.map.set('[data-room-inspection]',[target]);assert.equal((await f.settle(f.observe(check()))).visible,true);
 const duplicate=f.create('[data-room-inspection]');await assert.rejects(f.settle(f.observe(check())),/strict|multiple/i);assert.ok(duplicate);
});
test('a CSS transition without mutation is sampled within the original Node5s',async()=>{const f=fixture(),element=f.create('[data-room-inspection]',{style:{display:'none',visibility:'visible'}});f.later(()=>{element.style.display='block';},200);const result=await f.settle(f.observe(check()));assert.equal(result.visible,true);assert.ok(result.samples>1);assert.equal(f.now(),200);});
test('workspace missing, ambiguous, disconnected or replaced while polling fails closed',async()=>{
 for(const mode of ['missing','ambiguous','disconnected','replaced']){const f=fixture();f.create('[data-room-inspection]',{style:{display:'none',visibility:'visible'}});if(mode==='missing')f.document.map.set('[data-bear-workspace]',[]);if(mode==='ambiguous')f.document.map.set('[data-bear-workspace]',[f.root,f.root]);if(mode==='disconnected')f.root.isConnected=false;if(mode==='replaced')f.later(()=>f.document.map.set('[data-bear-workspace]',[new f.Element()]),100);await assert.rejects(f.settle(f.observe(check())),/root|workspace/i);}
});
test('unknown selectors, absent native style/visibility and nonfinite geometry never become a Hidden pass',async()=>{
 const unknown=fixture();await assert.rejects(unknown.settle(unknown.observe({selector:'unknown',state:'hidden'})),/Unsupported/);
 for(const props of [{style:undefined},{checkVisibility:undefined},{rect:{x:0,y:0,width:NaN,height:10}},{rect:{x:Infinity,y:0,width:20,height:10}}]){const f=fixture();f.create('[data-room-inspection]',props);await assert.rejects(f.settle(f.observe(check('hidden'))));}
});
test('attribute returns the exact raw value but annotations retain only allowed boolean fields',async()=>{
 const f=fixture(),raw='{"lamp":true,"fan":false,"private":"never annotate me"}';f.root.attributes.set('data-room-objects',raw);f.root.getBoundingClientRect=()=>{throw Error('Attribute read must not add layout work');};const result=await f.settle(f.observe({selector:'[data-bear-workspace]',state:'attribute',attribute:'data-room-objects'}));assert.equal(result.value,raw);const diagnostic=JSON.stringify(f.info.annotations);assert.ok(!diagnostic.includes('never annotate me'));assert.match(diagnostic,/lamp/);assert.match(diagnostic,/fan/);
});
test('transport rejection, late reply and post-response clock lag fail with no late success',async()=>{
 for(const options of [{rejectTransport:true},{replyLag:5001},{inlineLag:true}]){const f=fixture(options);f.create('[data-room-inspection]');await assert.rejects(f.settle(f.scope(async()=>{try{await f.observe(check());}catch{}await f.observe(check());})));assert.equal(f.commands(),1);assert.ok(f.info.annotations.some(a=>a.type==='room-dom-observation-error'));}
});
