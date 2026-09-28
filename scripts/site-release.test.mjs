import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReceipt, assertCurrentProduction, verifyRelease, verifyDraftRelease, publishRelease, rollbackRelease, recordPublication } from './lib/site-release.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createManifest,verifyArtifact,writeReleaseMarker } from './lib/site-artifact.mjs';
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
test('publishing reuses verified ZIPs and cannot replace a later build of the same source',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'release-success-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'public'));fs.mkdirSync(path.join(root,'functions'));
  fs.writeFileSync(path.join(root,'public/index.html'),'<h1>Verified</h1>');
  fs.writeFileSync(path.join(root,'functions/blog-ai.zip'),'compiled-zip');fs.writeFileSync(path.join(root,'deploy-config.toml'),'[functions]\ndirectory="functions"\n');
  const clock='2026-09-28T00:00:00Z';
  writeReleaseMarker({bundleRoot:root,sourceSha:sha,releaseId:'1-1',clock});
  const pageMap={schema:'blog-page-map/1',sourceSha:sha,clock,target:'production',baseUrl:'https://cubxxw.com/',complete:true,pages:[]};
  fs.writeFileSync(path.join(root,'page-map.json'),JSON.stringify(pageMap));
  const report={mode:'enforce',ok:true},reportDigest=createHash('sha256').update(JSON.stringify(report)).digest('hex');
  for(const name of ['source','output','browser'])fs.writeFileSync(path.join(root,`${name}-report.json`),JSON.stringify(report));
  const m=createManifest({bundleRoot:root,sourceSha:sha,inputDigest:digest,releaseId:'1-1',target:'production',clock,toolchain:{node:'22.23.1'},pageMap,requiredChecks:['source','output','browser'],checks:['source','output','browser'].map(name=>({name,status:'success',reportDigest}))});
  const proof={repository:'cubxxw/blog',event:'push',ref:'refs/heads/main',sha,runId:'1',runAttempt:'1',artifactId:'10',manifestDigest:createHash('sha256').update(JSON.stringify(m)).digest('hex')};
  let markerClock='2026-09-29T00:00:00Z',calls=0;
  const fetch=async url=>new Response(JSON.stringify(url.includes('/attempts/')?{head_sha:sha,head_branch:'main',event:'push',run_attempt:1,path:'.github/workflows/main.yaml',repository:{full_name:'cubxxw/blog'}}:url.includes('/artifacts/')?{expired:false,workflow_run:{id:1,head_sha:sha},name:`blog-site-${sha}-1`}:url.endsWith('__release.json')?{clock:markerClock,sourceSha:sha,releaseId:'previous'}:{id:'site-id',custom_domain:'cubxxw.com',build_settings:{stop_builds:true},published_deploy:{id:'previous',deploy_ssl_url:'https://previous--blog.netlify.app'}}));
  const options={manifest:m,bundleRoot:root,sourceProof:proof,siteId:'site-id',deployKind:'production',fetch,derivePolicy:async()=>['source','output','browser'],getCurrentInputDigest:async()=>digest,verifyBundle:verifyArtifact,exec:async(command,args,opts)=>{
    calls++;assert.equal(command,'netlify');assert.ok(args.includes('--no-build'));assert.notEqual(opts.cwd,root);assert.equal(fs.readFileSync(path.join(opts.cwd,'functions/blog-ai.zip'),'utf8'),'compiled-zip');assert.ok(fs.existsSync(path.join(opts.cwd,'netlify.toml')));return JSON.stringify({deploy_id:'new',deploy_url:'https://new--blog.netlify.app'});
  }};
  assert.equal((await publishRelease(options)).status,'superseded');assert.equal(calls,0);
  markerClock='2026-09-27T00:00:00Z';assert.equal((await publishRelease(options)).deployId,'new');assert.equal(calls,1);
});
test('rollback publication records retain original artifact proof and a new operation identity',async()=>{
  const sourceProof={repository:'cubxxw/blog',event:'push',ref:'refs/heads/main',sha,runId:'123',runAttempt:'1',artifactId:'10'};
  const saved=[];
  const fetch=async(url,options={})=>{
    let result;
    if(options.method==='POST'){saved.push({url,body:JSON.parse(options.body)});result=url.endsWith('/statuses')?{state:'success'}:{id:42,sha,creator:{login:'github-actions[bot]'}};}
    else result=url.includes('/attempts/')?{head_sha:sha,head_branch:'main',event:'push',run_attempt:1,path:'.github/workflows/main.yaml',repository:{full_name:'cubxxw/blog'}}:{expired:false,workflow_run:{id:123,head_sha:sha},name:`blog-site-${sha}-1`};
    return new Response(JSON.stringify(result));
  };
  assert.equal(await recordPublication({receipt:{...receipt,status:'rollback-verified'},sourceProof,fetch,operationRunId:'456',operationAttempt:'1'}),'42');
  assert.equal(saved[0].body.payload.operation.kind,'rollback');assert.equal(saved[0].body.payload.operation.runId,'456');assert.equal(saved[0].body.payload.sourceProof.runId,'123');
  await assert.rejects(recordPublication({receipt,sourceProof,fetch,operationRunId:'missing',operationAttempt:'1'}),/operation/);
});
test('draft qualification probes the immutable URL and never mints a production receipt',async()=>{
  const requested=[];
  const fetch=async url=>{requested.push(url);return new Response(JSON.stringify(url.includes('/api/v1/')?{id:'draft',site_id:'site-id',state:'ready',deploy_ssl_url:'https://draft--blog.netlify.app'}:{sourceSha:sha,releaseId:'123-1'}));};
  const result=await verifyDraftRelease({manifest,siteId:'site-id',deployId:'draft',fetch,verifyPages:async({fetch})=>{await fetch('https://cubxxw.com/new/');return true;}});
  assert.equal(result.status,'draft-verified');assert.equal(result.schema,'blog-draft/1');
  assert.ok(requested.includes('https://draft--blog.netlify.app/new/'));
  assert.ok(!requested.some(url=>url.startsWith('https://cubxxw.com')));
});
