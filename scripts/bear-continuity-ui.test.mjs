import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createWorkspace,serializeWorkspace,reduceWorkspace} from '../assets/js/space/state.mjs';
import {createWorkspaceStore} from '../assets/js/space/workspace-storage.mjs';
import {commitWorkspaceRestore} from '../assets/js/space/workspace-restore.mjs';
import {mountTransferPanel} from '../assets/js/space/transfer-panel.js';
import {mountReadingTools,mountExcerptShelf} from '../assets/js/space/reading-tools.js';
import {mountMedia} from '../assets/js/space/media.js';
import {mountVideoPlayer} from '../assets/js/space/video-player.js';
import {createExcerpt} from '../assets/js/space/excerpts.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const catalog={language:'en',articles:[{url:'/zh/a/',title:'Public source'}]};
function setup(t,html='<div data-host></div>'){
 const dom=new JSDOM(`<main data-bear-workspace>${html}</main>`,{url:'https://blog.example.test/zh/projects/',pretendToBeVisual:true});
 const saved={};for(const key of ['document','window','location','AbortController']){saved[key]=globalThis[key];globalThis[key]=dom.window[key];}
 const screen={width:1280,height:800};let raw=null,quota=false,state;
 const storage={getItem:()=>raw,setItem:(_k,v)=>{if(quota)throw Error('Quota');raw=v;}};const store=createWorkspaceStore({storage,viewport:screen});
 state={...store.load(),note:'Current private note',draft:'Current draft',windows:[{id:'settings',app:'settings',payload:'',rect:{x:0,y:0,width:640,height:480}}],active:'settings'};state=store.save(state).state;
 const root=document.querySelector('[data-bear-workspace]'),downloads=[],notices=[];let pause=null;
 const getState=()=>state;const restoreState=async(next,options)=>{if(pause)await pause;const result=commitWorkspaceRestore({getState,next,store,viewport:screen,...options});if(result.saved){state=result.state;root.dispatchEvent(new dom.window.CustomEvent('bear:workspace-change',{detail:{type:'restore'}}));}return result;};
 const download=(text,name)=>downloads.push({text,name});
 t.after(()=>{for(const key of Object.keys(saved))globalThis[key]=saved[key];dom.window.close();});
 return {dom,root,store,getState,storage,raw:()=>raw,setState:value=>{state=value;},quota:()=>{quota=true;},setPause:p=>{pause=p;},downloads,notices,download,restoreState};
}
function mountTransfer(t,f){const host=document.querySelector('[data-host]');const dispose=mountTransferPanel({host,catalog,getState:f.getState,restoreState:f.restoreState,download:f.download,notify:s=>f.notices.push(s),getStorageStatus:()=>f.store.getStatus()});t.after(dispose);return {host,file:host.querySelector('[data-transfer-file]'),confirm:host.querySelector('[data-transfer-confirm]'),cancel:host.querySelector('[data-transfer-cancel]'),preview:host.querySelector('[data-transfer-preview]')};}
async function selectFile(f,ui,textOrRead){Object.defineProperty(ui.file,'files',{configurable:true,value:[{size:120,text:typeof textOrRead==='function'?textOrRead:async()=>textOrRead}]});ui.file.dispatchEvent(new f.dom.window.Event('change'));await tick();}
const imported=()=>JSON.stringify({...createWorkspace(null,{width:1280,height:800}),note:'Imported <img src=x onerror=alert(1)>',draft:'Imported draft'});
test('preview is inert and confirmation backs up before one durable restore',async t=>{
 const f=setup(t),ui=mountTransfer(t,f),before=f.raw();await selectFile(f,ui,imported());assert.equal(ui.preview.hidden,false);assert.equal(ui.preview.querySelector('img'),null);assert.equal(f.raw(),before);assert.equal(f.getState().note,'Current private note');
 ui.confirm.click();await tick();assert.equal(f.downloads.length,1);assert.equal(JSON.parse(f.downloads[0].text).workspace.note,'Current private note');assert.equal(f.getState().note,'Imported <img src=x onerror=alert(1)>');assert.equal(JSON.parse(f.raw()).note,f.getState().note);assert.equal(f.getState().recoveries.at(-1).note,'Current private note');assert.equal(ui.preview.hidden,true);ui.confirm.click();await tick();assert.equal(f.downloads.length,1,'repeated stale confirmation cannot import again');
});
test('cancelled and late file reads do not publish a preview or mutate workspace',async t=>{
 const f=setup(t),ui=mountTransfer(t,f),before=f.raw();let resolve;await selectFile(f,ui,()=>new Promise(r=>{resolve=r;}));ui.cancel.click();resolve(imported());await tick();assert.equal(ui.preview.hidden,true);assert.equal(f.raw(),before);assert.equal(f.getState().note,'Current private note');
});
test('new input invalidates a preview, while cancellation invalidates a queued restore',async t=>{
 const f=setup(t),ui=mountTransfer(t,f);await selectFile(f,ui,imported());f.setState({...f.getState(),note:'New typing'});ui.confirm.click();await tick();assert.equal(f.getState().note,'New typing');assert.equal(f.downloads.length,0);assert.equal(ui.preview.hidden,true);
 await selectFile(f,ui,imported());let release;f.setPause(new Promise(r=>{release=r;}));const before=f.raw();ui.confirm.click();ui.cancel.click();release();await tick();assert.equal(f.raw(),before);assert.equal(f.getState().note,'New typing');
});
test('quota failure leaves the prior state, backup and explicit failure visible',async t=>{
 const f=setup(t),ui=mountTransfer(t,f);await selectFile(f,ui,imported());const before=f.raw();f.quota();ui.confirm.click();await tick();assert.equal(f.raw(),before);assert.equal(f.getState().note,'Current private note');assert.equal(f.downloads.length,1);assert.equal(ui.host.querySelector('[data-transfer-status]').dataset.error,'true');
});
function readerSetup(t){const f=setup(t,`<article data-reader-host><div class="space-toolbar"></div><div data-reader-body><div class="post-content"><p id="part">Chosen source words.</p><div data-video-widget><span>Generated playback status</span></div></div></div></article><section data-shelf></section>`),host=document.querySelector('[data-reader-host]');const execute=(name,args)=>{if(name==='excerpt'){const value=createExcerpt(args,f.getState().excerpts,catalog);if(!value.ok)return value;const next=reduceWorkspace(f.getState(),{type:'excerpts',items:value.excerpts});const result=f.store.save(next);f.setState(result.state);f.root.dispatchEvent(new f.dom.window.CustomEvent('bear:workspace-change',{detail:{type:'excerpts',saved:result.saved}}));return {...value,saved:result.saved};}if(name==='excerpt-remove'){const result=f.store.save({...f.getState(),excerpts:f.getState().excerpts.filter(e=>e.id!==args.id)});f.setState(result.state);return result;}};
 const dispose=mountReadingTools({host,article:catalog.articles[0],catalog,execute,getState:f.getState});const shelf=document.querySelector('[data-shelf]'),disposeShelf=mountExcerptShelf({host:shelf,catalog,getState:f.getState,execute});t.after(()=>{dispose();disposeShelf();});const select=(node,start=0,end=node.textContent.length)=>{const range=document.createRange();range.setStart(node,start);range.setEnd(node,end);const selection=document.getSelection();selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new f.dom.window.Event('selectionchange'));};return {...f,host,shelf,select,save:host.querySelector('[data-excerpt-save]')};}
test('a real source Range saves a source-bound excerpt without replacing the note',async t=>{
 const f=readerSetup(t);f.select(document.querySelector('#part').firstChild,0,6);assert.equal(f.save.disabled,false);f.save.click();await tick();assert.equal(f.getState().excerpts[0].text,'Chosen');assert.equal(f.getState().excerpts[0].anchor,'part');assert.equal(f.getState().excerpts[0].title,'Public source');assert.equal(f.getState().note,'Current private note');assert.equal(f.shelf.querySelector('blockquote').textContent,'Chosen');
});
test('generated widgets, source mutation and outside focus invalidate the source claim',async t=>{
 const f=readerSetup(t);f.select(document.querySelector('[data-video-widget] span').firstChild);assert.equal(f.save.disabled,true);assert.deepEqual(f.getState().excerpts,[]);
 const text=document.querySelector('#part').firstChild;f.select(text,0,6);text.textContent='Different source';await tick();f.save.click();await tick();assert.deepEqual(f.getState().excerpts,[]);
 f.select(text,0,6);const outside=document.createElement('input');document.body.append(outside);outside.focus();f.save.click();await tick();assert.deepEqual(f.getState().excerpts,[]);
});

test('photo to map to photo preserves the verified source and original region',t=>{
 const f=setup(t),host=document.querySelector('[data-host]'),calls=[];
 const catalog={language:'en',photos:[{id:'one',title:'Public one',place:'Place',region:'east',image:'/one.jpg',thumb:'/one.jpg'},{id:'two',title:'Public two',place:'Other',region:'west',image:'/two.jpg',thumb:'/two.jpg'}],places:[{id:'east',name:'East',lon:100,lat:30},{id:'west',name:'West',lon:0,lat:40}],articles:[]};
 const media=mountMedia({catalog,execute:(name,args)=>calls.push({name,...args})});t.after(()=>{media.dispose('photo');media.dispose('map');});
 media.renderPhotos(host,'region:all','photo');host.scrollTop=380;media.renderPhotos(host,'one','photo');assert.equal(host.scrollTop,0);
 host.querySelector('[data-media-open="map"]').click();const payload=calls.at(-1).payload;assert.match(payload,/^photo-context:/);
 media.renderMap(host,payload,'map');const back=host.querySelector('.sp-media-return');assert.ok(back);back.click();assert.equal(calls.at(-1).payload,payload);
 media.renderPhotos(host,calls.at(-1).payload,'photo');assert.equal(host.querySelector('.sp-media-header h2').textContent,'Public one');host.querySelector('[data-photo-back]').click();assert.equal(calls.at(-1).payload,'region:all');
 media.renderPhotos(host,'region:all','photo');assert.equal(host.scrollTop,380);
 media.renderMap(host,payload,'map');host.querySelector('[data-place-select="west"]').click();media.renderMap(host,calls.at(-1).payload,'map');assert.equal(host.querySelector('.sp-media-return'),null,'explicit region navigation clears the origin');
});
test('cached playback offers an explicit Continue action without loading or autoplaying',async t=>{
 const f=setup(t),host=document.querySelector('[data-host]'),id='abcdefghijk';
 window.localStorage.setItem('bear-video-positions:v1',JSON.stringify({version:1,entries:[{id,seconds:62}]}));
 let plays=0,pauses=0,options;window.YT={Player:class{constructor(_frame,input){options=input;queueMicrotask(()=>input.events.onReady());}playVideo(){plays++;}pauseVideo(){pauses++;}getCurrentTime(){return 88.9;}destroy(){}}};
 const widget=mountVideoPlayer({host,reference:`https://www.youtube.com/watch?v=${id}`,language:'en'});t.after(()=>widget.dispose());
 assert.equal(host.querySelector('iframe'),null);assert.equal(document.querySelector('script'),null);assert.match(host.querySelector('[data-video-resume]').textContent,/1:02/);assert.equal(plays,0);
 host.querySelector('[data-video-resume]').click();await tick();const frame=host.querySelector('iframe');assert.ok(frame);const url=new URL(frame.src);assert.equal(url.hostname,'www.youtube-nocookie.com');assert.equal(url.searchParams.get('start'),'62');assert.equal(url.searchParams.get('autoplay'),'0');assert.equal(plays,1);
 options.events.onStateChange({data:1});widget.setVisible(false);assert.ok(pauses>0);assert.equal(JSON.parse(window.localStorage.getItem('bear-video-positions:v1')).entries[0].seconds,88);widget.setVisible(true);assert.equal(plays,1,'visibility cannot resume playback');
});
