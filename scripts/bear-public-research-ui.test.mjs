import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountAgent} from '../assets/js/space/agent-panel.js';
const tick=()=>new Promise(r=>setImmediate(r));
const catalog={language:'en',articles:[{title:'Public memory',url:'/en/posts/memory/',description:'memory',tags:[]}],products:[],photos:[],places:[],books:[]};
function setup(t,fetchArticle){
 const dom=new JSDOM('<main data-bear-workspace><section data-space-window><div id="host"></div></section></main>',{url:'https://blog.example.test/en/projects/',pretendToBeVisual:true});
 dom.window.HTMLElement.prototype.scrollIntoView=function(){};
 const globals=['window','document','location','localStorage','DOMParser','CustomEvent','AbortController','fetch'],saved={};
 for(const key of globals){saved[key]=globalThis[key];if(key!=='fetch')globalThis[key]=dom.window[key];}
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});assert.equal(url,'https://blog.example.test/en/posts/memory/','public mode cannot call a provider');const result=await(fetchArticle?fetchArticle(url,options):{ok:true,status:200,url,headers:new Headers({'content-type':'text/html'}),text:async()=>'<article class="post-content"><p>Original public passage.</p><script>doNotRun()</script></article>'});if(result.body===undefined&&typeof result.text==='function')result.body=new ReadableStream({async pull(controller){controller.enqueue(new TextEncoder().encode(await result.text()));controller.close();}});return result;};
 const host=document.querySelector('#host');let dispose=()=>{};
 const mount=()=>{dispose=mountAgent({host,catalog,execute:()=>assert.fail('read-only mode cannot mutate workspace'),getState:()=>assert.fail('private workspace state is not needed'),getContext:()=>({title:'Current private selection',reference:'PRIVATE_SELECTION_MUST_NOT_APPEAR'}),notify:()=>{}});};
 const unmount=()=>dispose();mount();
 t.after(()=>{unmount();dom.window.close();for(const key of globals)globalThis[key]=saved[key];});
 const choose=()=>{const select=host.querySelector('[data-agent-mode]');select.value='public-research';select.dispatchEvent(new dom.window.Event('change'));};
 const submit=()=>{host.querySelector('[data-agent-input]').value='memory';host.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));};
 const done=async()=>{for(let i=0;i<50;i++){if(host.querySelector('[data-agent-badge]')?.dataset.status!=='running')return;await tick();}assert.fail('task did not settle');};
 return {dom,host,calls,choose,submit,done,unmount,mount};
}
test('visible no-model mode submits read-only work, labels its source and restores without replay',async t=>{
 const f=setup(t);assert.equal(f.host.querySelector('[data-agent-mode]').value,'conversation');f.choose();assert.equal(f.host.querySelector('[data-agent-mode-hint]').hidden,false);assert.equal(f.host.querySelector('[data-agent-context-bar]').hidden,true);
 f.submit();await f.done();assert.equal(f.calls.length,1);assert.equal(f.host.querySelector('[data-agent-badge]').dataset.status,'completed');assert.match(f.host.querySelector('[data-agent-answer]').textContent,/Original public passage/);assert.doesNotMatch(f.host.querySelector('[data-agent-answer]').textContent,/doNotRun|PRIVATE_SELECTION/);assert.equal(f.host.querySelector('[data-agent-task]').dataset.agentTaskMode,'public-research');
 f.unmount();f.mount();await tick();assert.equal(f.calls.length,1,'history rendering never replays search/read');assert.equal(f.host.querySelector('[data-agent-task]').dataset.agentTaskMode,'public-research');assert.match(f.host.textContent,/Original public passage/);
});
test('stop fences an ignored late read, persists interruption and retries with the original explicit mode',async t=>{
 let release;const f=setup(t,()=>new Promise(r=>{release=r;}));f.choose();f.submit();while(!release)await tick();f.host.querySelector('[data-agent-stop]').click();await f.done();assert.equal(f.host.querySelector('[data-agent-badge]').dataset.status,'interrupted');
 release({ok:true,url:'https://blog.example.test/en/posts/memory/',headers:new Headers({'content-type':'text/html'}),text:async()=>'<div class="post-content">Late source must stay absent.</div>'});await tick();assert.doesNotMatch(f.host.textContent,/Late source/);
 f.unmount();f.mount();assert.equal(f.host.querySelector('[data-agent-badge]').dataset.status,'interrupted');assert.equal(f.calls.length,1);f.host.querySelector('[data-agent-retry]').click();await tick();assert.equal(f.host.querySelector('[data-agent-mode]').value,'public-research');assert.equal(f.calls.length,2);f.host.querySelector('[data-agent-stop]').click();await tick();
});
test('a non-article HTML response is a visible failed task rather than a source excerpt',async t=>{
 const f=setup(t,async url=>({ok:true,url,headers:new Headers({'content-type':'text/html'}),text:async()=>'<main>Unavailable page</main>'}));f.choose();f.submit();await f.done();assert.equal(f.host.querySelector('[data-agent-badge]').dataset.status,'failed');assert.doesNotMatch(f.host.querySelector('[data-agent-answer]').textContent,/Original text excerpt/);
});
test('unconfirmed history writes show the export warning without claiming durable storage',async t=>{
 const f=setup(t);Object.defineProperty(f.dom.window.Storage.prototype,'setItem',{configurable:true,value(){}});f.choose();f.submit();await f.done();
 assert.equal(f.host.querySelector('[data-agent-badge]').dataset.status,'completed','the read itself completed');assert.equal(f.host.querySelector('[data-agent-persistence]').hidden,false);assert.match(f.host.querySelector('[data-agent-persistence]').textContent,/could not save/);assert.equal(f.host.querySelector('[data-agent-session-save]').dataset.saved,'false');
});
