import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { initializeSearchState, pendingSearchUrls, recordSearchAcceptance, submitSearch } from './lib/search-delivery.mjs';
const h1='1'.repeat(64),h2='2'.repeat(64),h3='3'.repeat(64);
const map=(entries)=>({schema:'blog-page-map/1',sourceSha:'a'.repeat(40),clock:'2026-09-28T00:00:00Z',target:'production',baseUrl:'https://cubxxw.com/',complete:true,pages:entries.map(([name,hash])=>({source:null,url:`https://cubxxw.com/${name}/`,outputPath:`${name}/index.html`,lang:'en',kind:'page',contentHash:hash}))});
test('failed B changes remain pending after C, independently for each provider',()=>{
  let state=initializeSearchState({state:null,provider:'indexnow',baseline:map([['a',h1]])});
  state=initializeSearchState({state,provider:'baidu',baseline:map([['a',h1]])});
  const current=map([['a',h1],['b',h2],['c',h3]]);
  state=recordSearchAcceptance({state,provider:'indexnow',pageMap:current,urls:['https://cubxxw.com/b/']});
  assert.deepEqual(pendingSearchUrls({state,provider:'indexnow',pageMap:current}),['https://cubxxw.com/c/']);
  assert.deepEqual(pendingSearchUrls({state,provider:'baidu',pageMap:current}),['https://cubxxw.com/b/','https://cubxxw.com/c/']);
});
test('reverting a previously accepted page is a new pending update; deleted URLs are omitted',()=>{
  let state=initializeSearchState({state:null,provider:'indexnow',baseline:map([['a',h1]])});
  state=recordSearchAcceptance({state,provider:'indexnow',pageMap:map([['a',h2],['gone',h2]]),urls:['https://cubxxw.com/a/','https://cubxxw.com/gone/']});
  assert.deepEqual(pendingSearchUrls({state,provider:'indexnow',pageMap:map([['a',h1]])}),['https://cubxxw.com/a/']);
});
const receipt={schema:'blog-release/1',sourceSha:'a'.repeat(40),releaseId:'r1',inputDigest:h1,artifactDigest:h1,pageMapDigest:h1,runId:'1',runAttempt:'1',siteId:'site',deployId:'deploy',deployUrl:'https://deploy--blog.netlify.app',verifiedAt:'2026-09-28T00:00:00Z',status:'verified',checks:['source','output','browser'].map(name=>({name,status:'success',reportDigest:h1}))};
test('quota failure persists accepted URLs, and retries do not resend those URLs',async()=>{
  let state=null,calls=0;const store={load:async()=>state,persist:async s=>{state=structuredClone(s);}};
  const fetch=async url=>{
    if(url.startsWith('https://cubxxw.com/'))return new Response(JSON.stringify({sourceSha:receipt.sourceSha,releaseId:'r1'}));
    calls++;return new Response(JSON.stringify(calls===1?{success:1,remain:0}:{error:400,message:'over quota'}),{status:200});
  };
  const options={provider:'baidu',receipt,previousPageMap:map([]),currentPageMap:map([['b',h2],['c',h3]]),store,fetch,token:'test'};
  options.receipt={...receipt,pageMapDigest:createHash('sha256').update(JSON.stringify(options.currentPageMap)).digest('hex')};
  await assert.rejects(submitSearch(options),/quota|incomplete/i);
  assert.equal(calls,1);
  assert.deepEqual(pendingSearchUrls({state,provider:'baidu',pageMap:options.currentPageMap}),['https://cubxxw.com/c/']);
});
test('dry-run does not submit or persist even when a provider token exists',async()=>{
  let writes=0,providerCalls=0;
  const currentPageMap=map([['new',h1]]),boundReceipt={...receipt,pageMapDigest:createHash('sha256').update(JSON.stringify(currentPageMap)).digest('hex')};
  const result=await submitSearch({provider:'indexnow',receipt:boundReceipt,previousPageMap:map([]),currentPageMap,token:'test',dryRun:true,store:{load:async()=>null,persist:async()=>{writes++;}},fetch:async url=>{if(!url.startsWith('https://cubxxw.com/'))providerCalls++;return new Response(JSON.stringify({sourceSha:receipt.sourceSha,releaseId:'r1'}));}});
  assert.equal(result.pending,1);assert.equal(writes,0);assert.equal(providerCalls,0);
});
