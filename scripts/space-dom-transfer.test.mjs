import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const transfer=await import('../assets/js/dom-transfer.mjs').catch(()=>null);

test('a connected same-document transfer uses the state-preserving DOM primitive',()=>{
 assert.ok(transfer?.movePreservingState);
 const doc={},node={isConnected:true,ownerDocument:doc},calls=[];
 const parent={isConnected:true,ownerDocument:doc,moveBefore:(...args)=>calls.push(args),insertBefore:()=>assert.fail('must not detach a live iframe')};
 assert.equal(transfer.movePreservingState(parent,node),true);assert.deepEqual(calls,[[node,null]]);
});
test('initial attachment, older browsers and document adoption retain normal DOM behavior',()=>{
 assert.ok(transfer?.movePreservingState);
 for(const initial of [true,false])for(const supported of [true,false]){
  const dom=new JSDOM('<main><section></section><aside></aside></main>'),d=dom.window.document,parent=d.querySelector('aside'),node=d.createElement('div');
  if(!initial)d.querySelector('section').append(node);
  let moves=0;if(supported)parent.moveBefore=(child,before)=>{moves++;parent.insertBefore(child,before);};
  assert.equal(transfer.movePreservingState(parent,node),supported&&!initial);assert.equal(node.parentNode,parent);assert.equal(moves,supported&&!initial?1:0);dom.window.close();
 }
});
test('an already placed element does not reattach, and a reference anchor preserves its order',()=>{
 assert.ok(transfer?.movePreservingState);
 const dom=new JSDOM('<main><section><input></section><aside><i></i><b></b></aside></main>'),d=dom.window.document,parent=d.querySelector('aside'),node=d.querySelector('input'),anchor=d.querySelector('b');
 parent.moveBefore=(child,before)=>parent.insertBefore(child,before);
 transfer.movePreservingState(parent,node,anchor);assert.equal(node.nextSibling,anchor);
 parent.moveBefore=()=>assert.fail('an unchanged placement must not reset state');assert.equal(transfer.movePreservingState(parent,node,anchor),true);dom.window.close();
});
test('ordinary CSS3D disposal still removes its DOM while an explicitly preserved surface can move intact',async()=>{
 const dom=new JSDOM('<main><div></div><section></section></main>'),oldElement=globalThis.Element;globalThis.Element=dom.window.Element;
 try{
  const three=new URL('../assets/js/vendor/three.module.min.js',import.meta.url).href,helper=new URL('../assets/js/dom-transfer.mjs',import.meta.url).href;
  const source=fs.readFileSync(new URL('../assets/js/vendor/CSS3DRenderer.js',import.meta.url),'utf8').replace("from 'three'",`from '${three}'`).replace("from '../dom-transfer.mjs'",`from '${helper}'`);
  const {CSS3DObject}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')),T=await import(three),scene=new T.Scene(),d=dom.window.document;
  const ordinary=new CSS3DObject(d.querySelector('div'));scene.add(ordinary);ordinary.removeFromParent();assert.equal(ordinary.element.isConnected,false);
  const surface=new CSS3DObject(d.querySelector('section'));surface.userData.preserveElement=true;scene.add(surface);surface.removeFromParent();assert.equal(surface.element.isConnected,true,'retiring the camera adapter must not reload the browser');
 }finally{globalThis.Element=oldElement;dom.window.close();}
});
