import test from 'node:test';
import assert from 'node:assert/strict';
import { controlNativeBuilds } from './netlify-build-control.mjs';
test('cutover pauses native builds and refuses readiness while one is still running',async()=>{
  let stopped=false,patches=0;
  const fetch=async(url,opts={})=>{
    if(url.includes('/builds?'))return new Response(JSON.stringify([{id:'busy-build',done:false,error:null}]));
    if(opts.method==='PATCH'){patches++;assert.deepEqual(JSON.parse(opts.body),{build_settings:{stop_builds:true}});stopped=true;}
    return new Response(JSON.stringify({id:'site',custom_domain:'cubxxw.com',published_deploy:{id:'old'},build_settings:{stop_builds:stopped}}));
  };
  const result=await controlNativeBuilds({siteId:'site',operation:'pause',mode:'shadow',fetch});
  assert.equal(patches,1);assert.equal(result.stopBuilds,true);assert.equal(result.ready,false);assert.equal(result.checkpointDeployId,'old');
});
test('resume is rejected before mutation while Actions is active or the site identity is wrong',async()=>{
  let requests=0;
  await assert.rejects(controlNativeBuilds({siteId:'site',operation:'resume',mode:'active',fetch:async()=>{requests++;}}),/active/);
  assert.equal(requests,0);
  await assert.rejects(controlNativeBuilds({siteId:'site',operation:'pause',mode:'shadow',fetch:async()=>new Response(JSON.stringify({id:'other',custom_domain:'elsewhere.test'}))}),/site/);
});
test('the rollback checkpoint must be recorded before mutating native build settings',async()=>{
  let patches=0;
  await assert.rejects(controlNativeBuilds({siteId:'site',operation:'pause',mode:'shadow',recordCheckpoint:async()=>{throw new Error('cannot save checkpoint');},fetch:async(url,options={})=>{
    if(options.method==='PATCH')patches++;
    return new Response(JSON.stringify(url.includes('/builds?')?[]:{id:'site',custom_domain:'cubxxw.com',published_deploy:{id:'old'},build_settings:{stop_builds:true}}));
  }}),/checkpoint/);
  assert.equal(patches,0);
});
