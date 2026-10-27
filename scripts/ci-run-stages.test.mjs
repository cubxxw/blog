import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {compileExecutionPlan} from './ci-run.mjs';
import {browserShardPlan,createFrozenProof,createShardReport} from './ci-shards.mjs';
import {writeReleaseMarker,verifyArtifact} from './lib/site-artifact.mjs';
import {summarizePlaywright} from './ci-test-inventory.mjs';
import {createPreflightReceipt} from './ci-preflight-receipt.mjs';
function offline(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ci-offline-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const changes={schema:'blog-change-set/1',sourceSha:'a'.repeat(40),baseSha:null,fullScan:false,files:[],sourceFiles:[],suites:['workflow'],publish:false,reason:'maintenance'};
  const plan={...compileExecutionPlan({changeSet:changes,mode:'shadow'}),sourceSha:changes.sourceSha,clock:'2026-10-23T00:00:00Z',inputDigest:'b'.repeat(64)};
  for(const [name,data] of Object.entries({'changes.json':changes,'plan.json':plan,'workflow-report.json':{mode:'enforce',ok:true}}))fs.writeFileSync(path.join(dir,name),JSON.stringify(data));
  const execute=()=>spawnSync(process.execPath,['scripts/ci-run.mjs','finalize','--run-dir',dir],{encoding:'utf8',env:{...process.env,BLOG_RELEASE_MODE:'shadow',BLOG_PRODUCER_ARTIFACT_ID:'789',BLOG_ROOM_REGRESSIONS:'false'}});
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
for(const contentOnly of [false,true])test(`final aggregation packages ${contentOnly?'quality-only article':'full-site'} frozen bytes only after every partition succeeds`,t=>{
  const {dir,execute}=offline(t),read=name=>JSON.parse(fs.readFileSync(path.join(dir,name))),write=(name,data)=>{const file=path.join(dir,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data));};
  const changes={...read('changes.json'),fullScan:!contentOnly,suites:contentOnly?['source','output','browser']:['workflow','output','browser','interactive'],publish:true,
    ...(contentOnly?{files:[{path:'content/zh/engineering/posts/example.md',status:'M',oldPath:null}],sourceFiles:['content/zh/engineering/posts/example.md']}: {})};
  const plan={...read('plan.json'),...compileExecutionPlan({changeSet:changes,mode:'shadow'})};
  write('changes.json',changes);write('plan.json',plan);
  if(contentOnly)write('source-report.json',{mode:'enforce',ok:true});
  const bundle=path.join(dir,'site');fs.mkdirSync(path.join(bundle,'public'),{recursive:true});fs.writeFileSync(path.join(bundle,'public/index.html'),'original frozen bytes');
  fs.mkdirSync(path.join(bundle,'functions'));fs.writeFileSync(path.join(bundle,'functions/test.zip'),'compiled function fixture');
  fs.writeFileSync(path.join(bundle,'deploy-config.toml'),'[functions]\ndirectory="functions"');
  writeReleaseMarker({bundleRoot:bundle,sourceSha:plan.sourceSha,releaseId:'123-1',clock:plan.clock});
  write('site/page-map.json',{sourceSha:plan.sourceSha,clock:plan.clock,target:'production',baseUrl:'https://cubxxw.com',complete:true,pages:[]});
  write('site/output-report.json',{mode:'enforce',ok:true});
  const specs=browserShardPlan({plan,changeSet:changes});
  const raw=Object.fromEntries(specs.map(spec=>[spec.id,{errors:[],suites:[{specs:[{id:spec.id,file:'fixture.spec.ts',line:1,column:1,title:spec.id,tests:[{projectName:spec.project||'desktop',status:'expected',expectedStatus:'passed',results:[{status:'passed',retry:0}]}]}]}]}]));
  const doorTitle='the real rear door, deliberate step, splash and safe return form one repeatable journey';
  const rawDoor={errors:[],suites:[{title:'space-door-excursion.spec.ts',suites:[{title:'1440px / no-preference',specs:[0,1,2].map(i=>({id:'listed-repeat-'+i,file:'space-door-excursion.spec.ts',line:145,column:9,title:doorTitle,tests:[{projectName:'desktop',status:'expected',expectedStatus:'passed',results:[{status:'passed',retry:0}]}]}))}]}]};
  const singleDoor=structuredClone(rawDoor);singleDoor.suites[0].suites[0].specs.length=1;
  if(!contentOnly)raw['legacy-1']=singleDoor;
  const evidence=Object.fromEntries(specs.map(spec=>[spec.id,summarizePlaywright(raw[spec.id])])),testInventory={schema:'blog-test-inventory/1',suites:{},shards:{}};
  for(const spec of specs){testInventory.shards[spec.id]=evidence[spec.id].inventory;(testInventory.suites[spec.suite]??=[]).push(...evidence[spec.id].inventory);}
  testInventory.preflight={door:summarizePlaywright(singleDoor).inventory};
  if(contentOnly){assert.deepEqual(specs.map(s=>s.id),['quality']);assert.equal(testInventory.suites.legacy,undefined);}
  const proof=createFrozenProof({bundleRoot:bundle,plan,changeSet:changes,runId:'123',runAttempt:1,testInventory});write('frozen.json',proof);
  for(const spec of specs){write(`shard-downloads/${spec.id}/shard-report.json`,createShardReport({spec,proof,runAttempt:1,exitCode:0,result:{mode:'enforce',ok:true},evidence:evidence[spec.id]}));write(`shard-downloads/${spec.id}/playwright-results.json`,raw[spec.id]);}
  const preflight=createPreflightReceipt({proof,producerArtifactId:'789',sourceSha:proof.sourceSha,runId:proof.runId,roomRegressions:false,rawDoor,doorList:rawDoor});
  write('preflight-download/ci/preflight-report.json',preflight);write('preflight-download/ci/preflight-door-list.json',rawDoor);write('preflight-download/door-preflight/playwright-results.json',rawDoor);
  const result=execute();assert.equal(result.status,0,result.stderr);
  const manifest=read('site/manifest.json');
  assert.deepEqual(manifest.requiredChecks,changes.suites);
  assert.equal(manifest.releaseId,'123-1');assert.equal(fs.readFileSync(path.join(bundle,'public/index.html'),'utf8'),'original frozen bytes');
  verifyArtifact({bundleRoot:bundle,manifest,expectedSha:plan.sourceSha,expectedTarget:'production',requiredChecks:plan.requiredChecks});
  assert.ok(fs.statSync(path.join(dir,'site.tar.gz')).size>0);
  fs.unlinkSync(path.join(bundle,'manifest.json'));fs.unlinkSync(path.join(dir,'site.tar.gz'));
  write('preflight-download/ci/preflight-report.json',{...preflight,producerArtifactId:'790'});
  assert.notEqual(execute().status,0);assert.equal(fs.existsSync(path.join(bundle,'manifest.json')),false);
  write('preflight-download/ci/preflight-report.json',preflight);
  write('shard-downloads/quality/playwright-results.json',{errors:[],suites:[]});
  assert.notEqual(execute().status,0);assert.equal(fs.existsSync(path.join(bundle,'manifest.json')),false);
  write('shard-downloads/quality/playwright-results.json',raw.quality);
  fs.unlinkSync(path.join(dir,`shard-downloads/${contentOnly?'quality':'legacy-4'}/shard-report.json`));
  assert.notEqual(execute().status,0);assert.equal(fs.existsSync(path.join(bundle,'manifest.json')),false);
  assert.equal(fs.existsSync(path.join(dir,'site.tar.gz')),false);
});
