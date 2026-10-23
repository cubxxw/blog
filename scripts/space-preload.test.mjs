import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../assets/js/space/preload.js',import.meta.url),'utf8');
const config={workspace:'/desktop.js',module:'/controller.js',vendor:'/three.js',jiangnan:'/jiangnan.js',spatial:'/world.js'};
function preload({saved=null,denied=false,nested=false}={}){
  const links=[],window={};window.parent=nested?{}:window;
  runInNewContext(source,{window,localStorage:{getItem(){if(denied)throw Error('Storage denied');return saved;}},document:{querySelector:()=>({textContent:JSON.stringify(config)}),createElement:()=>({}),head:{append:link=>links.push(link)}}});
  return links;
}
test('a first visit preloads the default room, workspace and shared engine together',()=>{
  const links=preload();assert.deepEqual(links.map(link=>link.href),['/desktop.js','/controller.js','/three.js','/jiangnan.js']);
  assert.ok(links.every(link=>link.rel==='modulepreload'));
});
test('a saved outdoor room preloads only its renderer',()=>{
  for(const saved of ['zen','garden','coast','mountain','lake','rain']){
    assert.deepEqual(preload({saved}).map(link=>link.href),['/desktop.js','/controller.js','/three.js','/world.js']);
  }
});
test('unavailable or invalid storage cannot prevent the default preload',()=>{
  for(const options of [{denied:true},{saved:'https://untrusted.test/module.js'},{saved:'__proto__'}]){
    assert.equal(preload(options).at(-1).href,'/jiangnan.js');
  }
});
test('an embedded project page does not preload another GPU engine',()=>{
  assert.deepEqual(preload({nested:true}),[]);
});
