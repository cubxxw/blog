import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {compileExecutionPlan} from './ci-run.mjs';
import {browserShardPlan,createFrozenProof,createShardReport} from './ci-shards.mjs';
import {writeReleaseMarker,verifyArtifact} from './lib/site-artifact.mjs';
function offline(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ci-offline-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const changes={schema:'blog-change-set/1',sourceSha:'a'.repeat(40),baseSha:null,fullScan:false,files:[],sourceFiles:[],suites:['workflow'],publish:false,reason:'maintenance'};
  const plan={...compileExecutionPlan({changeSet:changes,mode:'shadow'}),sourceSha:changes.sourceSha,clock:'2026-10-23T00:00:00Z',inputDigest:'b'.repeat(64)};
  for(const [name,data] of Object.entries({'changes.json':changes,'plan.json':plan,'workflow-report.json':{mode:'enforce',ok:true}}))fs.writeFileSync(path.join(dir,name),JSON.stringify(data));
  const execute=()=>spawnSync(process.execPath,['scripts/ci-run.mjs','finalize','--run-dir',dir],{encoding:'utf8',env:{...process.env,BLOG_RELEASE_MODE:'shadow'}});
  return {dir,execute};
}
test('offline final aggregation checks existing reports without building a site or needing browser artifacts',t=>{
  const {dir,execute}=offline(t),result=execute();
  assert.equal(result.status,0,result.stderr);assert.equal(fs.existsSync(path.join(dir,'site')),false);
  fs.unlinkSync(path.join(dir,'workflow-report.json'));assert.notEqual(execute().status,0);
});
test('offline aggregation rejects non-enforcing and failed prerequisite reports',t=>{
  const {dir,execute}=offline(t);
  for(const report of [{mode:'report-only',ok:true},{mode:'enforce',ok:false}]){
    fs.writeFileSync(path.join(dir,'workflow-report.json'),JSON.stringify(report));assert.notEqual(execute().status,0);
  }
});
test('final aggregation packages the original frozen bytes only after every partition succeeds',t=>{
  const {dir,execute}=offline(t),read=name=>JSON.parse(fs.readFileSync(path.join(dir,name))),write=(name,data)=>{const file=path.join(dir,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data));};
  const changes={...read('changes.json'),fullScan:true,suites:['workflow','output','browser','interactive'],publish:true};
  const plan={...read('plan.json'),...compileExecutionPlan({changeSet:changes,mode:'shadow'})};
  write('changes.json',changes);write('plan.json',plan);
  const bundle=path.join(dir,'site');fs.mkdirSync(path.join(bundle,'public'),{recursive:true});fs.writeFileSync(path.join(bundle,'public/index.html'),'original frozen bytes');
  fs.mkdirSync(path.join(bundle,'functions'));fs.writeFileSync(path.join(bundle,'functions/test.zip'),'compiled function fixture');
  fs.writeFileSync(path.join(bundle,'deploy-config.toml'),'[functions]\ndirectory="functions"');
  writeReleaseMarker({bundleRoot:bundle,sourceSha:plan.sourceSha,releaseId:'123-1',clock:plan.clock});
  write('site/page-map.json',{sourceSha:plan.sourceSha,clock:plan.clock,target:'production',baseUrl:'https://cubxxw.com',complete:true,pages:[]});
  write('site/output-report.json',{mode:'enforce',ok:true});
  const proof=createFrozenProof({bundleRoot:bundle,plan,changeSet:changes,runId:'123',runAttempt:1});write('frozen.json',proof);
  const specs=browserShardPlan({plan,changeSet:changes});
  for(const spec of specs)write(`shard-downloads/${spec.id}/shard-report.json`,createShardReport({spec,proof,runAttempt:1,exitCode:0,result:{mode:'enforce',ok:true}}));
  const result=execute();assert.equal(result.status,0,result.stderr);
  const manifest=read('site/manifest.json');
  assert.deepEqual(manifest.requiredChecks,['workflow','output','browser','interactive']);
  assert.equal(manifest.releaseId,'123-1');assert.equal(fs.readFileSync(path.join(bundle,'public/index.html'),'utf8'),'original frozen bytes');
  verifyArtifact({bundleRoot:bundle,manifest,expectedSha:plan.sourceSha,expectedTarget:'production',requiredChecks:plan.requiredChecks});
  assert.ok(fs.statSync(path.join(dir,'site.tar.gz')).size>0);
  fs.unlinkSync(path.join(bundle,'manifest.json'));fs.unlinkSync(path.join(dir,'site.tar.gz'));
  fs.unlinkSync(path.join(dir,'shard-downloads/legacy-4/shard-report.json'));
  assert.notEqual(execute().status,0);assert.equal(fs.existsSync(path.join(bundle,'manifest.json')),false);
  assert.equal(fs.existsSync(path.join(dir,'site.tar.gz')),false);
});
