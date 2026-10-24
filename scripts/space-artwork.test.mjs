import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {JIANGNAN_ARTWORK,jiangnanArtworkView} from '../assets/js/space/jiangnan-artwork.mjs';
import {JIANGNAN_COLLIDERS} from '../assets/js/space/jiangnan-state.mjs';
import {mountRoomInspection} from '../assets/js/space/room-inspection.js';

test('the complete framed artwork fits desktop, phone and short landscape close views outside furniture',()=>{
  for(const aspect of [1440/900,390/844,320/900,844/390]){
    const view=jiangnanArtworkView(aspect),distance=JIANGNAN_ARTWORK.position[0]-view.position[0];
    const height=2*distance*Math.tan(view.fov*Math.PI/360);
    assert.ok(JIANGNAN_ARTWORK.width/(height*aspect)<=.76+1e-9);
    assert.ok((JIANGNAN_ARTWORK.height/2+.18)/height<.5,'the fitting stays below the top edge');
    assert.ok((view.position[1]-(JIANGNAN_ARTWORK.position[1]-JIANGNAN_ARTWORK.height/2))/height<.5,'the lower frame is visible');
    assert.ok(!JIANGNAN_COLLIDERS.some(b=>view.position[0]>b.minX-.18&&view.position[0]<b.maxX+.18&&view.position[2]>b.minZ-.18&&view.position[2]<b.maxZ+.18));
  }
  for(const aspect of [NaN,0,-1,Infinity])assert.deepEqual(jiangnanArtworkView(aspect),jiangnanArtworkView(1));
});

test('artwork captions are localized, link to the actual source, and release on retreat and disposal',()=>{
  const previous=new Map(['document','AbortController'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const zh of [true,false]){
    const dom=new JSDOM('<main></main>');
    Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
    Object.defineProperty(globalThis,'AbortController',{value:dom.window.AbortController,configurable:true});
    try{
      const root=document.querySelector('main'),inspection=mountRoomInspection({root,zh});
      inspection.show('painting');assert.equal(inspection.element.hidden,false);
      assert.equal(inspection.element.querySelector('h2').textContent,zh?JIANGNAN_ARTWORK.title:JIANGNAN_ARTWORK.englishTitle);
      assert.match(inspection.element.textContent,/Paul Klee · 1929/);
      assert.match(inspection.element.textContent,zh?/个人寄语/:/A personal reflection/);
      assert.equal(inspection.element.querySelector('a').href,JIANGNAN_ARTWORK.source);
      assert.equal(inspection.element.querySelector('a').rel,'noopener noreferrer');
      inspection.focus();assert.equal(document.activeElement,inspection.element.querySelector('h2'));
      inspection.show(null);assert.equal(inspection.element.hidden,true);assert.equal(inspection.element.children.length,0);
      inspection.dispose();assert.equal(root.children.length,0);
    }finally{dom.window.close();for(const [key,descriptor]of previous)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
  }
});
