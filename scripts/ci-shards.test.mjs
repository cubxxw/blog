import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const api = await import('./ci-shards.mjs').catch(() => ({}));
const plan = {sourceSha:'a'.repeat(40),inputDigest:'b'.repeat(64),clock:'2026-10-23T00:00:00Z',runSite:true,requiredChecks:['source','output','browser','interactive']};
const changes = {sourceSha:plan.sourceSha,fullScan:true,files:[],sourceFiles:[]};
function fixture(t) {
  assert.equal(typeof api.createFrozenProof,'function','frozen verification must expose the shard contract');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'ci-shards-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'public'));fs.writeFileSync(path.join(root,'public/index.html'),'frozen');
  const proof=api.createFrozenProof({bundleRoot:root,plan,changeSet:changes,runId:'123',runAttempt:1});
  const specs=api.browserShardPlan({plan,changeSet:changes});
  const reports=specs.map(spec=>api.createShardReport({spec,proof,runAttempt:1,exitCode:0,result:{mode:'enforce',ok:true}}));
  return {root,proof,specs,reports};
}
test('all browser projects are partitioned without dropping legacy or any engine',t=>{
  const {specs}=fixture(t);
  assert.deepEqual(specs.map(s=>s.id),['quality','legacy-1','legacy-2','legacy-3','legacy-4','interactive-chromium','interactive-firefox','interactive-webkit']);
  assert.deepEqual(specs.filter(s=>s.suite==='legacy').map(s=>s.shard),['1/4','2/4','3/4','4/4']);
  assert.ok(specs.every(s=>s.workers===1));
  assert.deepEqual(api.browserShardPlan({plan:{...plan,runSite:false},changeSet:changes}),[]);
  assert.deepEqual(api.browserShardPlan({plan:{...plan,requiredChecks:['output','browser']},changeSet:{...changes,fullScan:false,files:[{path:'content/zh/engineering/posts/a.md'}]}}).map(s=>s.id),['quality']);
});
test('a complete set aggregates enforcing browser and three-engine reports',t=>{
  const {proof,reports}=fixture(t),result=api.aggregateShardReports({plan,changeSet:changes,proof,reports});
  assert.equal(result.browser.ok,true);assert.equal(result.interactive.ok,true);
  assert.equal(result.browser.shards.length,5);assert.equal(result.interactive.shards.length,3);
});
test('missing, duplicate, unknown, failed and mismatched shards cannot produce a manifest input',t=>{
  const {proof,reports}=fixture(t);
  const aggregate=rows=>api.aggregateShardReports({plan,changeSet:changes,proof,reports:rows});
  for(const rows of [reports.slice(1),[...reports,reports[0]],[...reports,{...reports[0],id:'unknown'}],reports.map((r,i)=>i? r:{...r,ok:false,exitCode:1}),reports.map((r,i)=>i? r:{...r,frozenDigest:'c'.repeat(64)}),reports.map((r,i)=>i? r:{...r,workers:2}),reports.map((r,i)=>i? r:{...r,result:{mode:'report-only',ok:true}})])assert.throws(()=>aggregate(rows));
});
test('failed-job reruns retain successful earlier shards but never revive an older pass over a newer failure',t=>{
  const {proof,reports}=fixture(t);
  const later={...reports[0],runAttempt:2};
  assert.equal(api.aggregateShardReports({plan,changeSet:changes,proof,reports:[...reports,later]}).browser.ok,true);
  assert.throws(()=>api.aggregateShardReports({plan,changeSet:changes,proof,reports:[...reports,{...later,ok:false,exitCode:1}]}));
});
test('any changed, added or missing frozen deployment byte is rejected on another runner',t=>{
  const {root,proof}=fixture(t),verify=()=>api.verifyFrozenProof({bundleRoot:root,plan,changeSet:changes,proof});
  verify();fs.writeFileSync(path.join(root,'public/index.html'),'tampered');assert.throws(verify,/frozen|identity/i);
  fs.writeFileSync(path.join(root,'public/index.html'),'frozen');fs.writeFileSync(path.join(root,'public/new.txt'),'extra');assert.throws(verify,/frozen|identity/i);
  fs.unlinkSync(path.join(root,'public/new.txt'));fs.unlinkSync(path.join(root,'public/index.html'));assert.throws(verify,/frozen|identity/i);
});
test('report identity binds the original frozen clock, scope and source, including no-site runs',t=>{
  const {root,proof}=fixture(t);
  for(const changedPlan of [{...plan,clock:'2026-10-24T00:00:00Z'},{...plan,sourceSha:'d'.repeat(40)},{...plan,requiredChecks:['browser']}])assert.throws(()=>api.verifyFrozenProof({bundleRoot:root,plan:changedPlan,changeSet:changes,proof}));
  assert.throws(()=>api.verifyFrozenProof({bundleRoot:root,plan,changeSet:{...changes,fullScan:false},proof}));
  assert.throws(()=>api.aggregateShardReports({plan:{...plan,runSite:false},changeSet:changes,proof,reports:[{}]}));
});
test('the final required job rejects failed, cancelled, missing and unexpectedly skipped browser jobs',()=>{
  assert.equal(typeof api.assertVerificationJobs,'function');
  api.assertVerificationJobs({prepare:'success',browser:'success',runSite:true});
  api.assertVerificationJobs({prepare:'success',browser:'skipped',runSite:false});
  for(const state of ['failure','cancelled','skipped',undefined])assert.throws(()=>api.assertVerificationJobs({prepare:state,browser:'success',runSite:true}));
  for(const state of ['failure','cancelled','skipped',undefined])assert.throws(()=>api.assertVerificationJobs({prepare:'success',browser:state,runSite:true}));
});
