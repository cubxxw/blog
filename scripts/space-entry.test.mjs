import test from 'node:test';
import assert from 'node:assert/strict';
import { languageDestination, canAnimateEntry } from '../assets/js/space/entry.mjs';

test('language changes keep the current profile route and query on this site', () => {
  const routes = { zh: '/zh/projects/', en: '/en/projects/' };
  assert.equal(languageDestination('en', routes, 'https://example.test/zh/projects/?profile=about#story'), 'https://example.test/en/projects/?profile=about#story');
  assert.equal(languageDestination('en', { en:'/projects/' }, 'https://example.test/zh/projects/#identity'), 'https://example.test/projects/#identity');
  for (const bad of ['https://other.test/en/projects/', '//other.test/en/projects/', '/en/articles/', '/en/projects/?inject=1']) {
    assert.equal(languageDestination('en', { en: bad }, 'https://example.test/zh/projects/'), null);
  }
  assert.equal(languageDestination('fr', routes, 'https://example.test/zh/projects/'), null);
});

test('language selection respects a backup deployment prefix without allowing a different root', () => {
  const routes = { zh:'/blog/zh/projects/', en:'/blog/projects/' };
  assert.equal(languageDestination('en', routes, 'https://example.test/blog/zh/projects/?profile=about#story'), 'https://example.test/blog/projects/?profile=about#story');
  assert.equal(languageDestination('zh', routes, 'https://example.test/blog/projects/'), 'https://example.test/blog/zh/projects/');
  assert.equal(languageDestination('en', { en:'/projects/' }, 'https://example.test/blog/zh/projects/'), null);
  assert.equal(languageDestination('en', { en:'/blog/../projects/' }, 'https://example.test/blog/zh/projects/'), null);
});

test('the optional 3D entrance costs nothing for motion, bandwidth and mobile opt-outs', () => {
  const eligible = { reducedMotion: false, coarsePointer: false, saveData: false, width: 1280, visible: true };
  assert.equal(canAnimateEntry(eligible), true);
  for (const change of [{ reducedMotion: true }, { coarsePointer: true }, { saveData: true }, { width: 640 }, { visible: false }]) {
    assert.equal(canAnimateEntry({ ...eligible, ...change }), false);
  }
});

function focusFixture(){
  class Surface extends EventTarget {listeners=new Map();addEventListener(type,fn,capture){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);super.addEventListener(type,fn,capture);}removeEventListener(type,fn,capture){this.listeners.get(type)?.delete(fn);super.removeEventListener(type,fn,capture);}}
  const document=new Surface(),window=new Surface(),body={},focusCalls=[],target={isConnected:true,contains(node){return node===this;},closest(){return null;},getClientRects(){return [{}];}};document.body=body;document.activeElement=body;
  let resolve,current=true;const ready=new Promise(done=>{resolve=done;});
  const args={ready,target,origin:target,document,window,isCurrent:()=>current,focus:()=>{focusCalls.push('entry');document.activeElement=target;}};
  const dispatch=(type,target,surface=document)=>{const event=new Event(type);Object.defineProperty(event,'target',{value:target});surface.dispatchEvent(event);};
  const focus=node=>{document.activeElement=node;dispatch('focusin',node);};
  const cleaned=()=>[document,window].every(surface=>[...surface.listeners.values()].every(set=>set.size===0));
  return {args,resolve,focus,dispatch,document,window,target,body,focusCalls,cleaned,changeRoute(){current=false;}};
}

test('the original entry regains focus only after its real ready boundary releases the inert workspace',async()=>{
  const {handoffEntryFocus}=await import('../assets/js/space/entry.mjs'),f=focusFixture(),pending=handoffEntryFocus(f.args);assert.deepEqual(f.focusCalls,[]);f.resolve({});assert.equal(await pending,true);assert.equal(f.document.activeElement,f.target);assert.equal(f.cleaned(),true);
});

test('late ready and failed fallback never reclaim a newer focus intent even if focus later returns to body',async()=>{
  const {handoffEntryFocus}=await import('../assets/js/space/entry.mjs');for(const value of [{},null])for(const bodyOrigin of [false,true]){const f=focusFixture();if(bodyOrigin)f.args.origin=f.body;const pending=handoffEntryFocus(f.args),other={};f.focus(other);f.focus(f.body);f.resolve(value);assert.equal(await pending,false);assert.deepEqual(f.focusCalls,[]);assert.equal(f.cleaned(),true);}
});

test('pointer, keyboard, route and page departure each cancel the pending initial entry handoff',async()=>{
  const {handoffEntryFocus}=await import('../assets/js/space/entry.mjs');for(const kind of ['pointerdown','keydown','hashchange','pagehide','changed-state']){const f=focusFixture(),pending=handoffEntryFocus(f.args);if(kind==='changed-state')f.changeRoute();else f.dispatch(kind,f.body,['hashchange','pagehide'].includes(kind)?f.window:f.document);f.resolve(null);assert.equal(await pending,false);assert.deepEqual(f.focusCalls,[]);assert.equal(f.cleaned(),true);}
});

test('a disconnected or still-hidden entry cannot acquire focus after ready',async()=>{
  const {handoffEntryFocus}=await import('../assets/js/space/entry.mjs');for(const state of ['removed','inert','no-rect']){const f=focusFixture(),pending=handoffEntryFocus(f.args);if(state==='removed')f.target.isConnected=false;if(state==='inert')f.target.closest=()=>({});if(state==='no-rect')f.target.getClientRects=()=>[];f.resolve({});assert.equal(await pending,false);assert.deepEqual(f.focusCalls,[]);assert.equal(f.cleaned(),true);}
});

test('failure preserves an existing ready handoff only when no terminal needs explicit recovery',async()=>{
  const {readFile}=await import('node:fs/promises'),vm=await import('node:vm'),source=await readFile(new URL('../assets/js/space/cafe.js',import.meta.url),'utf8');
  const failure=source.slice(source.indexOf('  function failWorld('),source.indexOf('  // Background tabs'));
  const photoSync=source.slice(source.indexOf('  function syncPhotoLight('),source.indexOf("  root.addEventListener('space:roomobjects'"));
  const reveal=source.match(/onReveal:result=>\{([\s\S]*?)\n  \}\}\);/)[1];
  for(const active of [false,true]){
    const other={},button={disabled:true},light={hidden:false,setAttribute(){}},toast={},focusCalls=[],document={activeElement:other},root={dataset:{worldLoading:'true'},contains:()=>false,querySelectorAll:selector=>selector==='[data-cafe-photo-light]'?[light]:[button],querySelector:()=>toast};
    const context={disposed:false,failed:false,initializing:true,entryFocusManaged:true,failureFocusManaged:false,revision:0,theme:'jiangnan',t:cn=>cn,world:{dispose(){}},root,document,boot:{active,event(){}},pickerStatus:{},syncCat(){},setMode(){},onEnter(){},focusDesktop:()=>({focus(){focusCalls.push('fallback');}}),getComputedStyle:()=>({visibility:'visible'})};
    vm.runInNewContext(photoSync+failure+`\nfailWorld('offline'); initializing=false; (result=>{${reveal}})({failed:true});`,context);
    assert.equal(context.failureFocusManaged,!active);assert.equal(root.dataset.worldFailed,'true');assert.equal(button.disabled,false);assert.equal(document.activeElement,other);assert.deepEqual(focusCalls,active?['fallback']:[]);
    assert.equal(light.hidden,true,'an unavailable scene must not offer a lighting switch');
  }
});

test('a valid initial deep link can acquire its first focus after ready when the early focus was already body',async()=>{
  const {handoffEntryFocus}=await import('../assets/js/space/entry.mjs');for(const value of [{},null]){const f=focusFixture();f.args.origin=f.body;const pending=handoffEntryFocus(f.args);assert.deepEqual(f.focusCalls,[]);f.resolve(value);assert.equal(await pending,true);assert.equal(f.document.activeElement,f.target);assert.equal(f.cleaned(),true);}
});

test('an entry with an existing external focus never acquires ownership on success or failure',async()=>{
  const {handoffEntryFocus}=await import('../assets/js/space/entry.mjs');for(const value of [{},null]){const f=focusFixture(),other={};f.args.origin=other;f.document.activeElement=other;const pending=handoffEntryFocus(f.args);f.resolve(value);assert.equal(await pending,false);assert.equal(f.document.activeElement,other);assert.deepEqual(f.focusCalls,[]);assert.equal(f.cleaned(),true);}
});
