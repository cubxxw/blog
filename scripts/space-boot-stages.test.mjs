import test from 'node:test';
import assert from 'node:assert/strict';
import {createCafeWorld} from '../assets/js/space/cafe-scene.js';

test('scene boot checkpoints come from the loaded factory and built room before its frame',async()=>{
  const original=globalThis.document,stages=[];
  let paint;
  const token='__spaceBootFixture';
  globalThis[token]={firstFrame:new Promise(resolve=>paint=resolve),start(){},setQuiet(){},dispose(){}};
  const module='data:text/javascript,'+encodeURIComponent(`export function createCafeWorld(){return globalThis.${token};}`);
  globalThis.document={querySelector:()=>({textContent:JSON.stringify({jiangnan:module})})};
  let world;
  try{
    world=createCafeWorld({theme:'jiangnan',onBootStage:stage=>stages.push(stage)});
    let ready=false;const completed=world.firstFrame.then(value=>{ready=value;});
    // Import and build actually run, while the scene's firstFrame stays pending.
    for(let attempt=0;attempt<10&&stages.length<2;attempt++)await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(stages,['module','room']);assert.equal(ready,false);
    paint(true);await completed;assert.equal(ready,true);
  }finally{world?.dispose();globalThis.document=original;delete globalThis[token];}
});

test('a renderer import failure never reports a built room or ready frame',async()=>{
  const original=globalThis.document,stages=[];
  globalThis.document={querySelector:()=>({textContent:JSON.stringify({jiangnan:'data:text/javascript,throw new Error("offline")'})})};
  let world;
  try{
    world=createCafeWorld({theme:'jiangnan',onBootStage:stage=>stages.push(stage)});
    await assert.rejects(world.firstFrame,/offline/);assert.deepEqual(stages,[]);
  }finally{world?.dispose();globalThis.document=original;}
});
