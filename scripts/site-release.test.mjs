import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReceipt, assertCurrentProduction, verifyRelease, publishRelease, rollbackRelease } from './lib/site-release.mjs';
const sha='a'.repeat(40),digest='b'.repeat(64);
const checks=[{name:'source',status:'success',reportDigest:digest},{name:'output',status:'success',reportDigest:digest},{name:'browser',status:'success',reportDigest:digest}];
const receipt={schema:'blog-release/1',sourceSha:sha,inputDigest:digest,artifactDigest:digest,pageMapDigest:digest,runId:'123',runAttempt:'1',siteId:'site-id',deployId:'abc123',deployUrl:'https://abc123--blog.netlify.app',verifiedAt:'2026-09-28T00:00:00Z',checks,status:'verified'};
const manifest={sourceSha:sha,inputDigest:digest,fileSetDigest:digest,pageMapDigest:digest,releaseId:'123-1',requiredChecks:['source','output','browser'],checks};
const current={siteId:'site-id',id:'abc123',state:'ready',published:true,sourceSha:sha,deployUrl:receipt.deployUrl};
test('verified receipts need deployment identity and all evidence; preview/failed evidence is rejected',()=>{
  assert.doesNotThrow(()=>validateReceipt(receipt));
  for(const mutation of [{status:'verification-failed'},{checks:[]},{verifiedAt:null},{deployUrl:'https://evil.invalid/'},{deployUrl:'https://abc123--blog.netlify.app@evil.invalid/'},{deployUrl:'https://other--blog.netlify.app'}]) assert.throws(()=>validateReceipt({...receipt,...mutation}));
});
test('current production must match the receipt site, deploy, SHA and origin',()=>{
  assert.doesNotThrow(()=>assertCurrentProduction({receipt,currentDeploy:current}));
  for(const mutation of [{published:false},{id:'other'},{siteId:'elsewhere'},{state:'building'},{sourceSha:'c'.repeat(40)}]) assert.throws(()=>assertCurrentProduction({receipt,currentDeploy:{...current,...mutation}}));
});
function verification({markerSha=sha,liveId='abc123',apiState='ready',throwNetwork=false}={}) {
  let time=0;
  const fetch=async url=>{
    if(throwNetwork) throw new Error('network');
    const value=url.includes('/api/v1/sites/')?{id:'site-id',published_deploy:{id:liveId}}:url.includes('/api/v1/deploys/')?{id:'abc123',site_id:'site-id',state:apiState,deploy_ssl_url:receipt.deployUrl,commit_ref:sha}:url.endsWith('/__release.json')?{sourceSha:markerSha,releaseId:'123-1',clock:'2026-09-28T00:00:00Z'}:{};
    return new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});
  };
  return {manifest,deployId:'abc123',siteId:'site-id',runId:'123',runAttempt:'1',fetch,now:()=>new Date(Date.parse('2026-09-28T00:00:00Z')+time),sleep:async ms=>{time+=ms;},timeoutMs:20,pollMs:10,verifyPages:async()=>true};
}
test('Netlify ready is insufficient when primary domain still serves the previous source',async()=>{
  const result=await verifyRelease(verification({markerSha:'c'.repeat(40)}));
  assert.equal(result.status,'verification-failed');assert.equal(result.verifiedAt,null);
});
test('matching production deployment and domain marker produce a verified receipt',async()=>{
  const result=await verifyRelease(verification());
  assert.equal(result.status,'verified');assert.equal(result.deployId,'abc123');validateReceipt(result);
});
test('permalink success cannot override a newer primary deploy',async()=>{
  assert.equal((await verifyRelease(verification({liveId:'newer'}))).status,'superseded');
});
test('the previous production deploy during propagation is retried, not misreported as superseded',async()=>{
  const options=verification();const baseFetch=options.fetch;let siteReads=0;
  options.previousDeployId='previous';
  options.fetch=async(url,init)=>url.includes('/api/v1/sites/')&&siteReads++===0
    ? new Response(JSON.stringify({id:'site-id',published_deploy:{id:'previous'}}),{status:200})
    : baseFetch(url,init);
  assert.equal((await verifyRelease(options)).status,'verified');
});
test('network failure times out honestly without creating verified evidence',async()=>{
  const result=await verifyRelease(verification({throwNetwork:true}));
  assert.equal(result.status,'verification-failed');
});
test('failed page/function probes block release even if version marker is correct',async()=>{
  const result=await verifyRelease({...verification(),verifyPages:async()=>false});
  assert.equal(result.status,'verification-failed');
});
test('invalid final evidence cannot leave a verified status after validation throws',async()=>{
  const options=verification();options.manifest={...manifest,checks:[checks[0]]};
  const result=await verifyRelease(options);
  assert.equal(result.status,'verification-failed');assert.equal(result.verifiedAt,null);
});
test('publication rejects PR provenance and absent trusted policy before any side effect',async()=>{
  let calls=0;
  const exec=async()=>{calls++;};
  await assert.rejects(()=>publishRelease({manifest,bundleRoot:'.',sourceProof:{event:'pull_request'},siteId:'site-id',exec,fetch:()=>{throw new Error('unexpected');}}),/trusted main/);
  assert.equal(calls,0);
});
test('rollback requires a previously verified receipt for the same site',async()=>{
  let calls=0;
  await assert.rejects(()=>rollbackRelease({targetReceipt:{...receipt,status:'verification-failed'},siteId:'site-id',fetch:async()=>{calls++;}}));
  await assert.rejects(()=>rollbackRelease({targetReceipt:receipt,siteId:'other',fetch:async()=>{calls++;}}));
  assert.equal(calls,0);
});
