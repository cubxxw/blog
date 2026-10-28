import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountApps} from '../assets/js/space/apps.js';

test('Notes only offers a live selection, never sends it automatically, and clears stale selections',()=>{
  const dom=new JSDOM('<main><section data-host></section></main>',{url:'https://blog.test/zh/projects/'});
  const previous=new Map();
  for(const key of ['window','document','location','localStorage','AbortController']){
    previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:dom.window[key]});
  }
  const calls=[],host=document.querySelector('[data-host]');
  const apps=mountApps({root:document.querySelector('main'),catalog:{language:'zh',products:[]},execute:(name,args)=>calls.push({name,args}),getState:()=>({note:'SECRET_BEFORE selected passage SECRET_AFTER'}),updateNote:()=>true,notify:()=>{},icon:()=>''});
  try{
    apps.render({app:'notes',id:'notes'},host);
    const editor=host.querySelector('textarea'),ask=host.querySelector('[data-note-ask]');
    assert.equal(ask.disabled,true);assert.equal(calls.length,0);
    editor.setSelectionRange(14,30);editor.dispatchEvent(new dom.window.Event('select'));
    assert.equal(ask.disabled,false);ask.click();
    assert.equal(calls.length,1);assert.equal(calls[0].name,'ask');
    assert.equal(calls[0].args.source,'note');assert.equal(calls[0].args.selection,'selected passage');
    assert.doesNotMatch(JSON.stringify(calls),/SECRET/);
    editor.setSelectionRange(0,0);editor.dispatchEvent(new dom.window.Event('select'));
    assert.equal(ask.disabled,true);ask.click();assert.equal(calls.length,1);
    apps.dispose('notes');editor.setSelectionRange(0,10);ask.click();assert.equal(calls.length,1);
  }finally{
    apps.dispose('notes');dom.window.close();
    for(const [key,descriptor] of previous)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];
  }
});
