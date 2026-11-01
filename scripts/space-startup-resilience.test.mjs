import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createRoomDiagnostics,roomStartupError,waitForRoomWork} from '../assets/js/space/room-startup.mjs';

test('a cancelled pending import settles without waiting for its eventual result',async()=>{
  const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main'),controller=new AbortController();
  const pending=waitForRoomWork(new Promise(()=>{}),{root,signal:controller.signal,timeout:100});
  controller.abort();await assert.rejects(pending,error=>error.name==='AbortError');dom.window.close();
});

test('the deadline rejects a never-settling startup with its fixed diagnostic code',async()=>{
  const dom=new JSDOM('<main></main>',{pretendToBeVisual:true}),root=dom.window.document.querySelector('main');
  await assert.rejects(waitForRoomWork(new Promise(()=>{}),{root,timeout:10}),error=>error.code==='first-frame-timeout');dom.window.close();
});

test('a background document does not consume the startup deadline',async()=>{
  const dom=new JSDOM('<main></main>',{pretendToBeVisual:true}),doc=dom.window.document,root=doc.querySelector('main');let hidden=true;
  Object.defineProperty(doc,'hidden',{get:()=>hidden});let finish;
  const pending=waitForRoomWork(new Promise(resolve=>{finish=resolve;}),{root,timeout:10});
  await new Promise(resolve=>setTimeout(resolve,25));hidden=false;doc.dispatchEvent(new dom.window.Event('visibilitychange'));finish(true);
  assert.equal(await pending,true);dom.window.close();
});

test('diagnostics preserve closed classifications and counters without retaining error text or user content',()=>{
  const root={dataset:{bootStage:'2',worldFrames:'3',worldPbrMaps:'0'}},d=createRoomDiagnostics(root);
  for(let i=0;i<20;i++)d.record(roomStartupError('context-lost',new Error('private text and https://example.test/?token=secret')));
  d.record({code:'https://example.test/?token=secret',message:'private note'});
  const records=JSON.parse(root.dataset.roomDiagnostics);
  assert.equal(records.length,12);assert.equal(records.at(-2).code,'context-lost');assert.equal(records.at(-2).frames,3);
  assert.equal(records.at(-1).code,'unknown');assert.doesNotMatch(root.dataset.roomDiagnostics,/private|example|token|secret|message|stack/);
});
